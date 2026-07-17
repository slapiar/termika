#!/usr/bin/env bash
set -euo pipefail

PORT="${1:-${TERMIKA_BIND_PORT:-8000}}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCROOT="$ROOT_DIR/CC/app"
LOG_FILE="/tmp/termikaxc-cc-php.log"
LOCAL_URL="http://127.0.0.1:${PORT}/"
HEALTH_PATH="${TERMIKA_HEALTH_PATH:-app/index.php}"
START_PATH="${TERMIKA_START_PATH:-app/index.php}"
MODULE_PATH="ux/skewt-instrument/skewt-panel/source/XC__js__skewt-render.js"

if [[ -z "${TERMIKA_LOCAL_CONFIG_PATH:-}" ]]; then
  if [[ -f "$APP_ROOT/asset/local-config.php" ]]; then
    export TERMIKA_LOCAL_CONFIG_PATH="$APP_ROOT/asset/local-config.php"
  elif [[ -f "$ROOT_DIR/XC/asset/local-config.php" ]]; then
    mkdir -p "$APP_ROOT/asset"
    cp "$ROOT_DIR/XC/asset/local-config.php" "$APP_ROOT/asset/local-config.php"
    export TERMIKA_LOCAL_CONFIG_PATH="$APP_ROOT/asset/local-config.php"
  fi
fi

set_codespace_ports_private() {
  if [[ -z "${CODESPACE_NAME:-}" ]] || ! command -v gh >/dev/null 2>&1; then
    return 0
  fi

  local ports_raw ports port
  ports_raw="${TERMIKA_PRIVATE_PORTS:-${PORT} 8001}"
  ports="${ports_raw//,/ }"

  for port in $ports; do
    [[ "$port" =~ ^[0-9]+$ ]] || continue
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

pkill -f "php -S.*:${PORT}" >/dev/null 2>&1 || true
PID_ON_PORT="$(ss -ltnp 2>/dev/null | awk -v p=":${PORT}" '$4 ~ p { if (match($0, /pid=[0-9]+/)) { print substr($0, RSTART+4, RLENGTH-4); exit } }')"
if [[ -n "${PID_ON_PORT}" ]]; then
  kill "$PID_ON_PORT" >/dev/null 2>&1 || true
fi

cd "$ROOT_DIR"
nohup php -S "0.0.0.0:${PORT}" -t "$DOCROOT" >"$LOG_FILE" 2>&1 &

STATUS="000"
HEALTH_URL="${LOCAL_URL}${HEALTH_PATH}"
for _ in {1..20}; do
  STATUS="$(curl -s -o /dev/null -w '%{http_code}' "$HEALTH_URL" || true)"
  [[ "$STATUS" == "200" ]] && break
  sleep 0.2
done

echo "Local health: $HEALTH_URL -> HTTP $STATUS"
if [[ "$STATUS" != "200" ]]; then
  echo "--- Diagnostic dump ---"
  cat "$LOG_FILE" || true
  exit 1
fi

MODULE_URL="${LOCAL_URL}${MODULE_PATH}"
MODULE_STATUS="$(curl -s -o /dev/null -w '%{http_code}' "$MODULE_URL" || true)"
MODULE_TYPE="$(curl -sI "$MODULE_URL" | awk -F': ' 'tolower($1)=="content-type" {print $2}' | tr -d '\r' | head -n1)"
echo "Module health: $MODULE_URL -> HTTP $MODULE_STATUS | ${MODULE_TYPE:-unknown}"
if [[ "$MODULE_STATUS" != "200" ]] || [[ "$MODULE_TYPE" == text/html* ]]; then
  echo "ERROR: CC modules are not served from /ux. Document root must be /CC."
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
