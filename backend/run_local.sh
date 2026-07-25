#!/bin/bash
# Runs the Sonically backend locally: starts mongod (if needed) then uvicorn.
set -e
BACKEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$BACKEND_DIR")"

"$ROOT_DIR/.localdev/start-mongo.sh"

source "$BACKEND_DIR/.venv/bin/activate"
export PATH="$ROOT_DIR/.localdev/bin:$PATH"
export SSL_CERT_FILE="$(python3 -m certifi)"

cd "$BACKEND_DIR"
exec uvicorn server:app --host 0.0.0.0 --port 8001 --reload
