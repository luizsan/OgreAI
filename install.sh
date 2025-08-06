#!/bin/bash

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

echo
echo ===== Installing client dependencies =====
pushd "$SCRIPT_DIR/client" || exit 1
echo bun install
bun install || exit 1
popd

echo
echo ===== Installing server dependencies =====
pushd "$SCRIPT_DIR/server" || exit 1
echo bun install
bun install || exit 1
popd

echo
echo ===== All installations succeeded! =====
exit 0