#!/usr/bin/env bash
set -euo pipefail

PORT="${1:-8000}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCROOT="$ROOT_DIR/XC"
LOG_FILE="/tmp/termikaxc-php.log"
LOCAL_URL="http://127.0.0.1:${PORT}/"
START_PATH="${TERMIKA_START_PATH:-terrain-analysis-test.php}"

cache_bust_url() {
  local base_url="$1"
  local token
  token="$(date +%s)"
  if [[ "$base_url" == *"?"* ]]; then
    printf '%s&v=%s' "$base_url" "$token"
  else
    printf '%s?v=%s' "$base_url" "$token"
  fi
}

if [[ ! -f "$DOCROOT/index.php" ]]; then
  echo "ERROR: Missing entrypoint: $DOCROOT/index.php"
  exit 1
fi

# Stop stale PHP development servers for this port.
pkill -f "php -S.*:${PORT}" >/dev/null 2>&1 || true

# If anything still holds the target port, terminate that process too.
PID_ON_PORT="$(ss -ltnp 2>/dev/null | awk -v p=":${PORT}" '$4 ~ p { if (match($0, /pid=[0-9]+/)) { print substr($0, RSTART+4, RLENGTH-4); exit } }')"
if [[ -n "${PID_ON_PORT}" ]]; then
  kill "$PID_ON_PORT" >/dev/null 2>&1 || true
fi

cd "$ROOT_DIR"
nohup php -S "0.0.0.0:${PORT}" -t "$DOCROOT" >"$LOG_FILE" 2>&1 &

# Wait until HTTP responds; require 200 from root.
STATUS="000"
for _ in {1..20}; do
  STATUS="$(curl -s -o /dev/null -w '%{http_code}' "$LOCAL_URL" || true)"
  if [[ "$STATUS" == "200" ]]; then
    break
  fi
  sleep 0.2
done

echo "Local health: $LOCAL_URL -> HTTP $STATUS"

if [[ "$STATUS" != "200" ]]; then
  echo "--- Diagnostic dump (non-200 on local URL) ---"
  pwd
  ls -la
  ls -la "$DOCROOT"
  cat "$LOG_FILE" || true
  ls -l "$DOCROOT/index.php"
  exit 1
fi

OPEN_URL="$(cache_bust_url "${LOCAL_URL}${START_PATH}")"

# In Codespaces prefer forwarded URL. Make it public when possible.
if [[ -n "${CODESPACE_NAME:-}" && -n "${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-}" ]]; then
  OPEN_URL="https://${CODESPACE_NAME}-${PORT}.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}/"
  if command -v gh >/dev/null 2>&1; then
    gh codespace ports visibility "${PORT}:public" -c "$CODESPACE_NAME" >/dev/null 2>&1 || true
    GH_URL="$(gh codespace ports -c "$CODESPACE_NAME" --json sourcePort,browseUrl --jq ".[] | select(.sourcePort==${PORT}) | .browseUrl" 2>/dev/null | head -n 1 || true)"
    if [[ -n "$GH_URL" ]]; then
      OPEN_URL="$(cache_bust_url "${GH_URL%/}/${START_PATH}")"
    fi
  fi
fi

echo "Opening: $OPEN_URL"
if [[ -n "${BROWSER:-}" ]]; then
  "$BROWSER" "$OPEN_URL" >/dev/null 2>&1 || true
else
  echo "BROWSER is not set. Open this URL manually: $OPEN_URL"
fi

echo "Server log: $LOG_FILE"
