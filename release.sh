#!/usr/bin/env bash
set -euo pipefail

# Vytvorí nasaditeľný release výhradne z autoritatívneho runtime CC/.
# Obsah CC/ sa uloží priamo do koreňa ZIP-u:
#   index.php, app/, ux/, infrastructure/, services/, kernels/, ...
# Adresáre CC/ ani XC/ sa v archíve nesmú objaviť.
#
# Použitie:
#   ./release.sh
#   ./release.sh 3.1.5
#   ./release.sh patch|minor|major|mini
#   ./release.sh patch --auto-commit
#   ./release.sh patch --auto-commit --auto-push

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

VERSION_FILE="$ROOT_DIR/RELEASE_VERSION"
CC_ROOT="$ROOT_DIR/CC"
CC_VERSION_FILE="$CC_ROOT/app/asset/RELEASE_VERSION.txt"
DEFAULT_VERSION="3.1.0"
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
      cat <<'EOF'
Usage: ./release.sh [--auto-commit] [--auto-push] [--commit-message=...] [version|patch|minor|major|mini]

Vytvorí ZIP z obsahu CC/ bez nadradeného priečinka CC/ a bez akéhokoľvek súboru z XC/.
ZIP je pripravený na priame rozbalenie do koreňa aplikácie na hostingu.

Voľby:
  --auto-commit           Commitne RELEASE_VERSION, CC marker a vytvorený ZIP
  --auto-push             Po commite pushne aktuálnu pracovnú vetvu
  --commit-message=MSG    Vlastná správa auto-commitu

Verzia:
  version                 Explicitná verzia, napr. 3.1.5
  patch                   x.y.z -> x.y.(z+1)
  minor|mini              x.y.z -> x.(y+1).0
  major                   x.y.z -> (x+1).0.0
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
  if ! [[ "$CURRENT_VERSION" =~ ^([0-9]+)\.([0-9]+)\.([0-9]+)$ ]]; then
    echo "Error: current version '$CURRENT_VERSION' is not x.y.z and cannot be bumped automatically." >&2
    echo "Use an explicit version, for example: ./release.sh 3.1.5" >&2
    exit 1
  fi

  major="${BASH_REMATCH[1]}"
  minor="${BASH_REMATCH[2]}"
  patch="${BASH_REMATCH[3]}"

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

if ! [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+(?:[-+][0-9A-Za-z.-]+)?$ ]]; then
  echo "Error: invalid version '$VERSION'. Expected x.y.z, for example 3.1.5 or 3.1.5-rc1." >&2
  exit 1
fi

# Kontrolujú sa iba skutočné, nasadzované vstupy CC. Release nikdy nesmie
# dopĺňať chýbajúci súbor z historického stromu XC/.
REQUIRED_CC_PATHS=(
  "CC/index.php"
  "CC/app/index.php"
  "CC/app/terrain-analysis-test.php"
  "CC/app/release-version.php"
  "CC/app/asset/RELEASE_VERSION.txt"
  "CC/registry/modules.json"
  "CC/ux"
  "CC/infrastructure"
  "CC/services"
  "CC/kernels"
)
for required_path in "${REQUIRED_CC_PATHS[@]}"; do
  if [[ ! -e "$ROOT_DIR/$required_path" ]]; then
    echo "Error: missing required CC runtime path: $required_path" >&2
    exit 1
  fi
done

# Pred zmenou markerov musí byť pracovný strom čistý. Samotné release markery
# sú povolené, pretože ich skript zjednotí na požadovanú verziu.
DIRTY_STATUS="$(git status --porcelain | grep -vE '^[ MARC?DU]{1,2} (RELEASE_VERSION|CC/app/asset/RELEASE_VERSION\.txt)$' || true)"
if [[ -n "$DIRTY_STATUS" ]]; then
  echo "Error: git working tree is not clean. Commit or stash your changes before releasing." >&2
  echo "$DIRTY_STATUS" >&2
  exit 1
fi

# Repozitárový marker riadi verziu. Nasadzovaný marker patrí do CC aplikácie.
printf '%s\n' "$VERSION" > "$VERSION_FILE"
printf '%s\n' "$VERSION" > "$CC_VERSION_FILE"

OUT_DIR="$ROOT_DIR/releases"
OUT_FILE="$OUT_DIR/termika-xc-${VERSION}.zip"
TMP_DIR="$(mktemp -d)"
SOURCE_LIST="$TMP_DIR/cc-source-files.txt"
STAGE_DIR="$TMP_DIR/release-root"
ARCHIVE_LIST="$TMP_DIR/archive-files.txt"
trap 'rm -rf "$TMP_DIR"' EXIT

mkdir -p "$OUT_DIR" "$STAGE_DIR"

# Zdrojom je výhradne Gitom sledovaný obsah CC/. Prefix CC/ sa pri kopírovaní
# odstráni, takže výsledný ZIP možno rozbaliť priamo do document rootu aplikácie.
git -C "$ROOT_DIR" ls-files "CC/" > "$SOURCE_LIST"

if [[ ! -s "$SOURCE_LIST" ]]; then
  echo "Error: no tracked files found in CC/." >&2
  exit 1
fi

while IFS= read -r source_path; do
  [[ -n "$source_path" ]] || continue

  if [[ "$source_path" != CC/* ]]; then
    echo "Error: release source escaped CC/: $source_path" >&2
    exit 1
  fi

  relative_path="${source_path#CC/}"
  if [[ -z "$relative_path" ]]; then
    continue
  fi

  case "$relative_path" in
    .local-config.php|*/.local-config.php|app/asset/local-config.php)
      echo "Error: local secret configuration must not be packaged: $source_path" >&2
      exit 1
      ;;
  esac

  if [[ ! -f "$ROOT_DIR/$source_path" ]]; then
    echo "Error: tracked CC file is missing from working tree: $source_path" >&2
    exit 1
  fi

  if [[ "$source_path" == *.php ]]; then
    if ! php -l "$ROOT_DIR/$source_path" >/dev/null 2>&1; then
      echo "Error: PHP syntax error in $source_path" >&2
      exit 1
    fi
  fi

  mkdir -p "$STAGE_DIR/$(dirname "$relative_path")"
  cp -p "$ROOT_DIR/$source_path" "$STAGE_DIR/$relative_path"
done < "$SOURCE_LIST"

# Marker sa musí dostať do ZIP-u aj v prípade, že bol v pracovnom strome práve
# zmenený a ešte nebol commitnutý.
mkdir -p "$STAGE_DIR/app/asset"
cp -p "$CC_VERSION_FILE" "$STAGE_DIR/app/asset/RELEASE_VERSION.txt"

rm -f "$OUT_FILE"
(
  cd "$STAGE_DIR"
  find . -type f -print \
    | sed 's#^\./##' \
    | LC_ALL=C sort \
    | zip -q -9 "$OUT_FILE" -@
)

# Výpis archívu sa uloží raz. Tým sa vyhneme chybným výsledkom pipeline
# unzip|grep pri zapnutom pipefail.
unzip -Z1 "$OUT_FILE" > "$ARCHIVE_LIST"

if [[ ! -s "$ARCHIVE_LIST" ]]; then
  rm -f "$OUT_FILE"
  echo "Error: created archive is empty." >&2
  exit 1
fi

if grep -Eq '^(CC|XC)/' "$ARCHIVE_LIST"; then
  rm -f "$OUT_FILE"
  echo "Error: archive contains forbidden top-level CC/ or XC/ directory." >&2
  exit 1
fi

if grep -Eq '(^|/)(\.local-config\.php|local-config\.php)$' "$ARCHIVE_LIST"; then
  rm -f "$OUT_FILE"
  echo "Error: archive contains a local secret configuration file." >&2
  exit 1
fi

REQUIRED_ARCHIVE_FILES=(
  "index.php"
  "app/index.php"
  "app/terrain-analysis-test.php"
  "app/release-version.php"
  "app/asset/RELEASE_VERSION.txt"
  "registry/modules.json"
)
for required_file in "${REQUIRED_ARCHIVE_FILES[@]}"; do
  if ! grep -Fxq "$required_file" "$ARCHIVE_LIST"; then
    rm -f "$OUT_FILE"
    echo "Error: created archive does not contain $required_file." >&2
    exit 1
  fi
done

for required_prefix in "ux/" "infrastructure/" "services/" "kernels/"; do
  if ! grep -Fq "$required_prefix" "$ARCHIVE_LIST"; then
    rm -f "$OUT_FILE"
    echo "Error: created archive does not contain runtime tree $required_prefix" >&2
    exit 1
  fi
done

ARCHIVED_VERSION="$(unzip -p "$OUT_FILE" app/asset/RELEASE_VERSION.txt | tr -d '[:space:]')"
if [[ "$ARCHIVED_VERSION" != "$VERSION" ]]; then
  rm -f "$OUT_FILE"
  echo "Error: archived release marker '$ARCHIVED_VERSION' does not match requested version '$VERSION'." >&2
  exit 1
fi

echo "Release created: $OUT_FILE"
echo "Contents: $(wc -l < "$ARCHIVE_LIST") files from CC/"
echo "Deployment: extract ZIP directly into the application document root"
echo "Verified: ZIP root contains index.php, app/, ux/, infrastructure/, services/ and kernels/"
echo "Verified: ZIP contains neither CC/ nor XC/ and no local secret configuration"
echo "Verified release marker: $ARCHIVED_VERSION"

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
