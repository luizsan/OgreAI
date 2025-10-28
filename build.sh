#!/usr/bin/env bash
set -e

# Determine where this script lives
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Add common bun installation paths to PATH
export PATH="$HOME/.bun/bin:$PATH"

# Error handler
error_exit() {
    echo ""
    echo "[✗] Build failed. Check the logs above."
    read -n 1 -s -r -p "Press any key to exit..."
    echo ""
}

trap error_exit ERR

# ── 1) Build the Svelte client ──
echo ""
echo "===== Building client ====="
cd "$SCRIPT_DIR/client" || error_exit
echo "[1/4] bun install"
bun install || error_exit

echo "[2/4] bun run build"
bun run build || error_exit

echo "[✓] Client built successfully!"
cd "$SCRIPT_DIR"

# ── 2) Build the Bun server ──
echo ""
echo "===== Building server ====="
cd "$SCRIPT_DIR/server" || error_exit

echo "[3/4] bun install"
bun install || error_exit

echo "[4/4] bun build"
bun run build || error_exit

echo "[✓] Server built successfully!"
xdg-open "$SCRIPT_DIR/output" 2>/dev/null || open "$SCRIPT_DIR/output" 2>/dev/null || nautilus "$SCRIPT_DIR/output" 2>/dev/null || echo "Output directory: $SCRIPT_DIR/output"
cd "$SCRIPT_DIR"

echo ""
echo "===== All builds succeeded! ====="
read -n 1 -s -r -p "Press any key to exit..."
echo ""