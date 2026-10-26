#!/usr/bin/env bash
# ==============================================================================
# Project Kiru v2.0 — Lanzador Rápido Principal (.sh)
# Ejecuta el backend ligero para probar Kiru en el navegador sin compilar,
# o utiliza el binario compilado Rust/C++ si ya está construido.
# ==============================================================================
set -e
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "$DIR/launchers/kiru-quick.sh" "$@"
