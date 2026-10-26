@echo off
REM ============================================================================
REM Project Kiru v2.0 — Lanzador Rápido para Windows CMD (.cmd)
REM Permite probar Kiru en el navegador al instante antes de compilar Rust/C++.
REM ============================================================================
setlocal
set "SCRIPT_DIR=%~dp0"
if exist "%SCRIPT_DIR%launchers\quick_backend.mjs" (
    set "ROOT_DIR=%SCRIPT_DIR%"
) else (
    set "ROOT_DIR=%SCRIPT_DIR%.."
)

if "%KIRU_PORT%"=="" set "KIRU_PORT=5000"
set "URL=http://127.0.0.1:%KIRU_PORT%"

echo ====================================================================
echo         * KIRU AI v2.0 - Quick Browser Launcher (.cmd) *
echo ====================================================================

if exist "%ROOT_DIR%\target\release\kiru.exe" (
    echo [OK] Binario nativo Rust detectado. Abriendo %URL% ...
    start "" "%URL%"
    cd /d "%ROOT_DIR%"
    "%ROOT_DIR%\target\release\kiru.exe" --port %KIRU_PORT%
    goto :eof
)

where node >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] Iniciando Backend Ligero de Prueba Rapida (Sin Compilar) en %URL% ...
    start "" "%URL%"
    node "%ROOT_DIR%\launchers\quick_backend.mjs"
    goto :eof
)

echo [ERROR] No se encontro Node.js ni el binario compilado de Kiru.
echo Instala Node.js para probar sin compilar o ejecuta: cargo build --release
pause
