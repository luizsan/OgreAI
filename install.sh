#!/usr/bin/env bash
set -e

# Determine where this script lives
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Add common bun installation paths to PATH
export PATH="$HOME/.bun/bin:$PATH"

# Error handler
error_exit() {
    echo ""
    echo "[✗] Installation failed. Check the logs above."
    read -n 1 -s -r -p "Press any key to exit..."
    echo ""
}

trap error_exit ERR

# ── Install dependencies for the Svelte client ──
echo ""
echo "===== Installing client dependencies ====="
cd "$SCRIPT_DIR/client" || error_exit
echo "bun install"
bun install || error_exit
cd "$SCRIPT_DIR"

# ── Install dependencies for the Bun server ──
echo ""
echo "===== Installing server dependencies ====="
cd "$SCRIPT_DIR/server" || error_exit
echo "bun install"
bun install || error_exit
cd "$SCRIPT_DIR"

echo ""
echo "===== All installations succeeded! ====="
read -n 1 -s -r -p "Press any key to exit..."
echo ""