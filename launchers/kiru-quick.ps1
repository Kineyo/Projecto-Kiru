# ==============================================================================
# Project Kiru v2.0 — Lanzador Rápido para Windows PowerShell (.ps1)
# Permite probar Kiru desde el navegador de forma inmediata antes de compilar.
# ==============================================================================
param(
    [int]$Port = 5000,
    [switch]$QuickOnly
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if ((Split-Path -Leaf $ScriptDir) -eq "launchers") {
    $RootDir = Split-Path -Parent $ScriptDir
} else {
    $RootDir = $ScriptDir
}

$Url = "http://127.0.0.1:$Port"
$env:KIRU_PORT = "$Port"

Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "       ✦ KIRU AI v2.0 — Quick Browser Launcher (.ps1) ✦          " -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan

$RustBin = Join-Path $RootDir "target\release\kiru.exe"
$CppBin  = Join-Path $RootDir "build-cpp\Release\kiru-cpp.exe"
$QuickJs = Join-Path $RootDir "launchers\quick_backend.mjs"

if ((-not $QuickOnly) -and (Test-Path $RustBin)) {
    Write-Host "⚡ Ejecutando núcleo nativo compilado en Rust ($RustBin)..." -ForegroundColor Green
    Start-Process $Url
    Set-Location $RootDir
    & $RustBin --port $Port
    exit 0
}

if ((-not $QuickOnly) -and (Test-Path $CppBin)) {
    Write-Host "⚡ Ejecutando núcleo nativo compilado en C++20 ($CppBin)..." -ForegroundColor Green
    Start-Process $Url
    Set-Location $RootDir
    & $CppBin --port $Port
    exit 0
}

if (Get-Command node -ErrorAction SilentlyContinue) {
    Write-Host "🚀 Iniciando Backend Ligero de Prueba Rápida (Sin Compilar) en $Url ..." -ForegroundColor Yellow
    Start-Job -ScriptBlock { param($u) Start-Sleep -Milliseconds 1200; Start-Process $u } -ArgumentList $Url | Out-Null
    & node $QuickJs
} else {
    Write-Host "❌ No se encontró Node.js ni el binario compilado." -ForegroundColor Red
    Write-Host "   Instala Node.js (https://nodejs.org) para probar sin compilar o ejecuta 'cargo build --release'."
    exit 1
}
