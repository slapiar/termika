#!/usr/bin/env bash
set -euo pipefail

# Build a versioned release ZIP of TermikaXC from the authoritative CC runtime.
# XC/ is a historical reference tree and is never included in a release.
# Usage:
#   ./release.sh                          # uses version from RELEASE_VERSION
#   ./release.sh 1.2.0                    # uses provided version
#   ./release.sh patch|minor|major|mini   # increments current RELEASE_VERSION
#   ./release.sh patch --auto-commit
#   ./release.sh patch --auto-commit --auto-push

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

VERSION_FILE="RELEASE_VERSION"
CC_VERSION_FILE="$ROOT_DIR/CC/app/asset/RELEASE_VERSION.txt"
DEFAULT_VERSION="2.6"
AUTO_COMMIT=false
AUTO_PUSH=false
COMMIT_MESSAGE=""

VERSION=""
BUMP_MODE=""
for arg in "$@"; do
  case "$arg" in
    --auto-commit)
      AUTO_COMMIT=true
      ;;
    --auto-push)
      AUTO_PUSH=true
      ;;
    --commit-message=*)
      COMMIT_MESSAGE="${arg#*=}"
      ;;
    patch|minor|major|mini)
      if [[ -n "$VERSION" || -n "$BUMP_MODE" ]]; then
        echo "Usage: $0 [--auto-commit] [--auto-push] [--commit-message=...] [version|patch|minor|major|mini]" >&2
        exit 1
      fi
      BUMP_MODE="$arg"
      ;;
    -h|--help)
      cat <<EOF
Usage: $0 [--auto-commit] [--auto-push] [--commit-message=...] [version|patch|minor|major|mini]

Description:
  Creates a release ZIP archive containing the authoritative CC/ runtime.
  XC/ remains only a repository reference and is never packaged.

Options:
  --auto-commit           Automatically commit RELEASE_VERSION, the CC marker and release ZIP
  --auto-push             Push current branch to origin after release
  --commit-message=MSG    Custom message for --auto-commit

Version argument:
  version                 Explicit version, e.g. 3.1.4
  patch                   Increment patch segment (x.y.z -> x.y.(z+1))
  minor|mini              Increment minor segment (x.y.z -> x.(y+1).0)
  major                   Increment major segment (x.y.z -> (x+1).0.0)
EOF
      exit 0
      ;;
    *)
      if [[ -n "$VERSION" ]]; then
        echo "Usage: $0 [--auto-commit] [--auto-push] [--commit-message=...] [version|patch|minor|major|mini]" >&2
        exit 1
      fi
      VERSION="$arg"
      ;;
  esac
done

if [[ "$AUTO_PUSH" == true && "$AUTO_COMMIT" == false ]]; then
  AUTO_COMMIT=true
fi

if [[ -f "$VERSION_FILE" ]]; then
  CURRENT_VERSION="$(tr -d '[:space:]' < "$VERSION_FILE")"
else
  CURRENT_VERSION="$DEFAULT_VERSION"
fi

if [[ -z "$CURRENT_VERSION" ]]; then
  CURRENT_VERSION="$DEFAULT_VERSION"
fi

if [[ -n "$BUMP_MODE" ]]; then
  if ! [[ "$CURRENT_VERSION" =~ ^([0-9]+)\.([0-9]+)(\.([0-9]+))?$ ]]; then
    echo "Error: current version '$CURRENT_VERSION' is not numeric and cannot be bumped automatically." >&2
    echo "Use explicit version, e.g. ./release.sh 3.1.4" >&2
    exit 1
  fi

  major="${BASH_REMATCH[1]}"
  minor="${BASH_REMATCH[2]}"
  patch="${BASH_REMATCH[4]:-0}"

  case "$BUMP_MODE" in
    patch)
      patch=$((patch + 1))
      ;;
    minor|mini)
      minor=$((minor + 1))
      patch=0
      ;;
    major)
      major=$((major + 1))
      minor=0
      patch=0
      ;;
  esac

  VERSION="${major}.${minor}.${patch}"
elif [[ -z "$VERSION" ]]; then
  VERSION="$CURRENT_VERSION"
fi

if [[ -z "$VERSION" ]]; then
  echo "Error: release version is empty." >&2
  exit 1
fi

if ! [[ "$VERSION" =~ ^[0-9]+(\.[0-9]+){1,2}([.-][A-Za-z0-9]+)?$ ]]; then
  echo "Error: invalid version '$VERSION'. Expected e.g. 3.1.4 or 3.1.4-rc1." >&2
  exit 1
fi

# The CC tree is the only deployable application. Fail early if its real
# entrypoints or module roots are missing instead of silently falling back to XC.
REQUIRED_CC_PATHS=(
  "CC/index.php"
  "CC/app/index.php"
  "CC/app/terrain-analysis-test.php"
  "CC/app/release-version.php"
  "CC/app/asset"
  "CC/ux"
  "CC/infrastructure"
  "CC/services"
)
for required_path in "${REQUIRED_CC_PATHS[@]}"; do
  if [[ ! -e "$ROOT_DIR/$required_path" ]]; then
    echo "Error: missing required CC runtime path: $required_path" >&2
    exit 1
  fi
done

# Ensure git working tree is clean. Release marker files are allowed to be dirty
# because this script updates them before packaging.
DIRTY_STATUS="$(git status --porcelain | grep -vE '^[ MARC?DU]{1,2} (RELEASE_VERSION|CC/app/asset/RELEASE_VERSION\.txt)$' || true)"
if [[ -n "$DIRTY_STATUS" ]]; then
  echo "Error: git working tree is not clean. Commit or stash your changes before releasing." >&2
  echo "$DIRTY_STATUS" >&2
  exit 1
fi

# Persist the requested version both at repository level and inside the deployed
# CC application. XC/asset/RELEASE_VERSION.txt is intentionally untouched.
echo "$VERSION" > "$VERSION_FILE"
mkdir -p "$(dirname "$CC_VERSION_FILE")"
echo "$VERSION" > "$CC_VERSION_FILE"

OUT_DIR="$ROOT_DIR/releases"
OUT_FILE="$OUT_DIR/termika-xc-${VERSION}.zip"
TMP_LIST="$(mktemp)"
trap 'rm -f "$TMP_LIST"' EXIT

mkdir -p "$OUT_DIR"

# Package every tracked file from CC/. This preserves app/, ux/,
# infrastructure/, services/ and other runtime dependencies as one coherent
# deployable tree. Local secrets remain excluded because they are not tracked.
git -C "$ROOT_DIR" ls-files "CC/" \
  | grep -Ev '(^CC_backup/|\.zip$|\.tar|\.tgz)' \
  > "$TMP_LIST"

if ! grep -qx 'CC/app/asset/RELEASE_VERSION.txt' "$TMP_LIST"; then
  echo 'CC/app/asset/RELEASE_VERSION.txt' >> "$TMP_LIST"
fi

if git -C "$ROOT_DIR" ls-files --error-unmatch "$VERSION_FILE" >/dev/null 2>&1; then
  echo "$VERSION_FILE" >> "$TMP_LIST"
fi

if [[ ! -s "$TMP_LIST" ]]; then
  echo "Error: no tracked files found in CC/." >&2
  exit 1
fi

if grep -q '^XC/' "$TMP_LIST"; then
  echo "Error: release file list unexpectedly contains XC/." >&2
  exit 1
fi

# PHP lint all packaged PHP files before creating the archive.
while IFS= read -r file; do
  if [[ "$file" == *.php ]]; then
    if ! php -l "$ROOT_DIR/$file" >/dev/null 2>&1; then
      echo "Error: PHP syntax error in $file" >&2
      exit 1
    fi
  fi
done < "$TMP_LIST"

rm -f "$OUT_FILE"
zip -q -9 "$OUT_FILE" -@ < "$TMP_LIST"

if unzip -Z1 "$OUT_FILE" | grep -q '^XC/'; then
  rm -f "$OUT_FILE"
  echo "Error: created archive contains forbidden XC/ entries." >&2
  exit 1
fi

if ! unzip -Z1 "$OUT_FILE" | grep -qx 'CC/app/index.php'; then
  rm -f "$OUT_FILE"
  echo "Error: created archive does not contain CC/app/index.php." >&2
  exit 1
fi

if ! unzip -Z1 "$OUT_FILE" | grep -qx 'CC/app/release-version.php'; then
  rm -f "$OUT_FILE"
  echo "Error: created archive does not contain CC/app/release-version.php." >&2
  exit 1
fi

echo "Release created: $OUT_FILE"
echo "Contents: $(wc -l < "$TMP_LIST") tracked files from CC/ + RELEASE_VERSION"
echo "Deployment root: CC/ (CC/index.php redirects to CC/app/index.php)"
echo "Verified: archive contains no XC/ files"

if [[ "$AUTO_COMMIT" == true ]]; then
  if [[ -z "$COMMIT_MESSAGE" ]]; then
    COMMIT_MESSAGE="Release ${VERSION}"
  fi

  git add "$VERSION_FILE"
  git add "$CC_VERSION_FILE"
  git add -f "$OUT_FILE"

  if git diff --cached --quiet; then
    echo "Auto-commit skipped: no staged changes."
  else
    git commit -m "$COMMIT_MESSAGE"
    echo "Auto-commit created: $COMMIT_MESSAGE"
  fi
fi

if [[ "$AUTO_PUSH" == true ]]; then
  CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
  if [[ "$CURRENT_BRANCH" == "HEAD" || -z "$CURRENT_BRANCH" ]]; then
    echo "Error: cannot auto-push from detached HEAD." >&2
    exit 1
  fi

  git push origin "$CURRENT_BRANCH"
  echo "Auto-push completed: origin/$CURRENT_BRANCH"
fi
