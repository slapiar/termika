#!/usr/bin/env bash
set -euo pipefail

# Build a versioned release ZIP of TermikaXC from tracked repository files.
# Packages files from XC/ directory and RELEASE_VERSION for deployment.
# Usage:
#   ./release.sh                          # uses version from RELEASE_VERSION
#   ./release.sh 1.2.0                    # uses provided version
#   ./release.sh patch|minor|major|mini   # increments current RELEASE_VERSION
#   ./release.sh patch --auto-commit
#   ./release.sh patch --auto-commit --auto-push

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

VERSION_FILE="RELEASE_VERSION"
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
  Creates a release ZIP archive containing files from XC/ and RELEASE_VERSION.

Options:
  --auto-commit           Automatically commit RELEASE_VERSION and release ZIP
  --auto-push             Push current branch to origin after release
  --commit-message=MSG    Custom commit message for --auto-commit

Version argument:
  version                 Explicit version, e.g. 2.6.1
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
    echo "Use explicit version, e.g. ./release.sh 2.6.1" >&2
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
  echo "Error: invalid version '$VERSION'. Expected e.g. 2.6, 2.6.0 or 2.6-rc1." >&2
  exit 1
fi

# Ensure git working tree is clean.
# Release marker files are allowed to be dirty because they are updated by this script.
XC_VERSION_FILE="$ROOT_DIR/XC/asset/RELEASE_VERSION.txt"
DIRTY_STATUS="$(git status --porcelain | grep -vE '^[ MARC?DU]{1,2} (RELEASE_VERSION|XC/asset/RELEASE_VERSION\.txt)$' || true)"
if [[ -n "$DIRTY_STATUS" ]]; then
  echo "Error: git working tree is not clean. Commit or stash your changes before releasing." >&2
  echo "$DIRTY_STATUS" >&2
  exit 1
fi

# Persist requested/default version after validation.
echo "$VERSION" > "$VERSION_FILE"

# Mirror the version inside XC/ so it always deploys together with the app
# (RELEASE_VERSION at repo root is a sibling of XC/ and is not guaranteed to
# reach the hosting document root during deployment).
mkdir -p "$(dirname "$XC_VERSION_FILE")"
echo "$VERSION" > "$XC_VERSION_FILE"

OUT_DIR="$ROOT_DIR/releases"
OUT_FILE="$OUT_DIR/termika-xc-${VERSION}.zip"
TMP_LIST="$(mktemp)"
trap 'rm -f "$TMP_LIST"' EXIT

mkdir -p "$OUT_DIR"

# Package tracked files from XC/ directory (includes XC/asset/RELEASE_VERSION.txt)
# plus the root RELEASE_VERSION marker for local/dev convenience.
# Exclude local node_modules or build artifacts if present.
git -C "$ROOT_DIR" ls-files "XC/" \
  | grep -Ev '(^XC_backup/|\.zip$|\.tar|\.tgz)' \
  > "$TMP_LIST"

if ! grep -qx 'XC/asset/RELEASE_VERSION.txt' "$TMP_LIST"; then
  echo 'XC/asset/RELEASE_VERSION.txt' >> "$TMP_LIST"
fi

if git -C "$ROOT_DIR" ls-files --error-unmatch "$VERSION_FILE" >/dev/null 2>&1; then
  echo "$VERSION_FILE" >> "$TMP_LIST"
fi

if [[ ! -s "$TMP_LIST" ]]; then
  echo "Error: no tracked files found in XC/ or RELEASE_VERSION to package." >&2
  exit 1
fi

# PHP lint all PHP files before packaging
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

echo "Release created: $OUT_FILE"
echo "Contents: $(wc -l < "$TMP_LIST") files from XC/ + RELEASE_VERSION"

if [[ "$AUTO_COMMIT" == true ]]; then
  if [[ -z "$COMMIT_MESSAGE" ]]; then
    COMMIT_MESSAGE="Release ${VERSION}"
  fi

  git add "$VERSION_FILE"
  git add "$XC_VERSION_FILE"
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
