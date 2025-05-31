@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM ─ Determine where this script lives ─
set "SCRIPT_DIR=%~dp0"

REM ── Install dependencies for the Svelte client ──
echo.
echo ===== Installing client dependencies =====
pushd "%SCRIPT_DIR%.\client" || goto :error
echo bun install
call bun install || goto :error
popd

REM ── Install dependencies for the Bun server ──
echo.
echo ===== Installing server dependencies =====
pushd "%SCRIPT_DIR%.\server" || goto :error
echo bun install
call bun install || goto :error
popd

echo.
echo ===== All installations succeeded! =====
pause
exit /b 0

:error
echo.
echo [✗] Installation failed. Check the logs above.
pause
exit /b 1

