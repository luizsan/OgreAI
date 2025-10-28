@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM ─ Determine where this script lives ─
set "SCRIPT_DIR=%~dp0"

REM ── 1) Build the Svelte client ──
echo.
echo ===== Building client =====
pushd "%SCRIPT_DIR%.\client" || goto :error
echo [1/4] npm install
call bun install || goto :error

echo [2/4] npm run build
call bun run build || goto :error

echo [✓] Client built successfully@
popd

REM ── 2) Build the Bun server ──
echo.
echo ===== Building server =====
pushd "%SCRIPT_DIR%.\server" || goto :error

echo [3/4] bun install
call bun install || goto :error

echo [4/4] bun build
call bun run build || goto :error

echo [✓] Server built successfully!
start "" "%SCRIPT_DIR%.\output"
popd

echo.
echo ===== All builds succeeded! =====
pause
exit /b 0

:error
echo.
echo [✗] Build failed. Check the logs above.
pause
exit /b 1
