#!/bin/bash
set -e

# ─ Determine where this script lives ─
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

# ── Install dependencies for the Svelte client ──
echo
echo ===== Installing client dependencies =====
pushd "$SCRIPT_DIR/client" || { echo; echo "[✗] Installation failed. Check the logs above."; exit 1; }
echo bun install
bun install || { echo; echo "[✗] Installation failed. Check the logs above."; exit 1; }
popd

# ── Install dependencies for the Bun server ──
echo
echo ===== Installing server dependencies =====
pushd "$SCRIPT_DIR/server" || { echo; echo "[✗] Installation failed. Check the logs above."; exit 1; }
echo bun install
bun install || { echo; echo "[✗] Installation failed. Check the logs above."; exit 1; }
popd

echo
echo ===== All installations succeeded! =====