#!/usr/bin/env bash
# Usage: ./run.sh [args passed to main.py]
#   ./run.sh                        # both counties, $100k ceiling
#   ./run.sh --delinquent-only      # fast: only delinquent lists
#   ./run.sh --county pinal
#   ./run.sh --county maricopa
#   ./run.sh --max-value 75000
#   ./run.sh --verbose
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_PYTHON="$SCRIPT_DIR/venv/bin/python"

if [[ ! -x "$VENV_PYTHON" ]]; then
    echo "ERROR: virtualenv not found. Run setup first:"
    echo "  python3 -m venv $SCRIPT_DIR/venv"
    echo "  $SCRIPT_DIR/venv/bin/pip install -r $SCRIPT_DIR/requirements.txt"
    exit 1
fi

cd "$SCRIPT_DIR"
exec "$VENV_PYTHON" main.py "$@"
