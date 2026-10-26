# ==============================================================================
# Project Kiru v2.0 — Lanzador Rápido Principal para PowerShell (.ps1)
# ==============================================================================
$Dir = Split-Path -Parent $MyInvocation.MyCommand.Path
& (Join-Path $Dir "launchers\kiru-quick.ps1") @args
