#!/usr/bin/env bash
set -euo pipefail

PORT="${1:-${TERMIKA_BIND_PORT:-8000}}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCROOT="$ROOT_DIR/XC"

LOG_FILE="/tmp/termikaxc-php.log"
LOCAL_URL="http://127.0.0.1:${PORT}/"
HEALTH_PATH="${TERMIKA_HEALTH_PATH:-app/index.php}"
START_PATH="${TERMIKA_START_PATH:-app/terrain-analysis-test.php}"
MODULE_HEALTH_PATH="ux/skewt-instrument/skewt-panel/source/XC__js__skewt-render.js"

if [[ ! -f "$APP_ROOT/asset/local-config.php" ]]; then
  if [[ -f "$ROOT_DIR/XC/asset/local-config.php" ]]; then
    cp "$ROOT_DIR/XC/asset/local-config.php" "$APP_ROOT/asset/local-config.php"
    chmod 600 "$APP_ROOT/asset/local-config.php" 2>/dev/null || true
    echo "CC config: copied XC/asset/local-config.php -> CC/app/asset/local-config.php"
  elif [[ -f "$ROOT_DIR/.local-config.php" ]]; then
    cp "$ROOT_DIR/.local-config.php" "$APP_ROOT/asset/local-config.php"
    chmod 600 "$APP_ROOT/asset/local-config.php" 2>/dev/null || true
    echo "CC config: copied .local-config.php -> CC/app/asset/local-config.php"
  fi
fi

export TERMIKA_LOCAL_CONFIG_PATH="$APP_ROOT/asset/local-config.php"

set_codespace_ports_private() {
  if [[ -z "${CODESPACE_NAME:-}" ]]; then
    return 0
  fi

  if ! command -v gh >/dev/null 2>&1; then
    return 0
  fi

  local ports_raw ports port
  ports_raw="${TERMIKA_PRIVATE_PORTS:-${PORT} 8001}"

  # Normalize commas to spaces to support both "8000 8001" and "8000,8001".
  ports="${ports_raw//,/ }"

  for port in $ports; do
    if [[ ! "$port" =~ ^[0-9]+$ ]]; then
      continue
    fi

    if gh codespace ports visibility "${port}:private" -c "$CODESPACE_NAME" >/dev/null 2>&1; then
      echo "Codespaces: port ${port} visibility set to private"
    else
      echo "Codespaces: could not set port ${port} to private (continuing)"
    fi
  done
}

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

if [[ ! -f "$APP_ROOT/index.php" ]]; then
  echo "ERROR: Missing entrypoint: $APP_ROOT/index.php"
  exit 1
fi

if [[ ! -f "$DOCROOT/$MODULE_HEALTH_PATH" ]]; then
  echo "ERROR: Missing CC module asset: $DOCROOT/$MODULE_HEALTH_PATH"
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

# Wait until the CC application entrypoint responds.
STATUS="000"
HEALTH_URL="${LOCAL_URL}${HEALTH_PATH}"
for _ in {1..20}; do
  STATUS="$(curl -s -o /dev/null -w '%{http_code}' "$HEALTH_URL" || true)"
  if [[ "$STATUS" == "200" ]]; then
    break
  fi
  sleep 0.2
done

echo "Local health: $HEALTH_URL -> HTTP $STATUS"

if [[ "$STATUS" != "200" ]]; then
  echo "--- Diagnostic dump (non-200 on CC application entrypoint) ---"
  pwd
  ls -la "$DOCROOT"
  ls -la "$APP_ROOT"
  cat "$LOG_FILE" || true
  ls -l "$APP_ROOT/index.php"
  exit 1
fi

# A 200 HTML response here means the server still points at CC/app instead of CC.
MODULE_URL="${LOCAL_URL}${MODULE_HEALTH_PATH}"
MODULE_HEADERS="$(curl -sS -D - -o /dev/null "$MODULE_URL" || true)"
MODULE_STATUS="$(printf '%s\n' "$MODULE_HEADERS" | awk 'toupper($1) ~ /^HTTP\// { code=$2 } END { print code }')"
MODULE_TYPE="$(printf '%s\n' "$MODULE_HEADERS" | awk 'BEGIN{IGNORECASE=1} /^Content-Type:/ { sub(/^[^:]+:[[:space:]]*/, ""); gsub(/\r/, ""); print; exit }')"

echo "Module health: $MODULE_URL -> HTTP ${MODULE_STATUS:-000} | ${MODULE_TYPE:-unknown}"

if [[ "$MODULE_STATUS" != "200" || "$MODULE_TYPE" == text/html* ]]; then
  echo "ERROR: CC modules are not being served as JavaScript. The server document root must be $DOCROOT, not $APP_ROOT."
  cat "$LOG_FILE" || true
  exit 1
fi

set_codespace_ports_private

OPEN_URL="$(cache_bust_url "${LOCAL_URL}${START_PATH}")"

echo "Opening: $OPEN_URL"
if [[ -n "${BROWSER:-}" ]]; then
  "$BROWSER" "$OPEN_URL" >/dev/null 2>&1 || true
else
  echo "BROWSER is not set. Open this URL manually: $OPEN_URL"
fi

echo "Server log: $LOG_FILE"
