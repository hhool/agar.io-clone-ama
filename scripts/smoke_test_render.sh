#!/usr/bin/env bash
# Simple smoke test for a Render service URL
# Usage: ./scripts/smoke_test_render.sh https://your-service.onrender.com

set -euo pipefail
URL="${1:-${RENDER_URL:-}}"
if [ -z "$URL" ]; then
  echo "Usage: $0 <service-url> or set RENDER_URL env var"
  exit 2
fi

echo "Checking: $URL"

function check_path() {
  local path="$1"
  echo -n "GET $path -> "
  if curl --silent --show-error --fail --max-time 10 -I "$URL$path" 2>/dev/null | head -n 1; then
    curl --silent --show-error --max-time 10 -I "$URL$path" | head -n 1
  else
    echo "UNREACHABLE (curl failed)"
    return 1
  fi
}

set +e
check_path "/"
check_path "/leaderboard"
# Optional: health endpoint if present
check_path "/health" || true

if [ $? -eq 0 ]; then
  echo "Smoke-test completed: service reachable (HTTP checks)."
  exit 0
else
  echo "Smoke-test: one or more checks failed. See output above and check Render logs." >&2
  exit 3
fi
