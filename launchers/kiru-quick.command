#!/usr/bin/env bash
# ==============================================================================
# Project Kiru v2.0 — Lanzador Doble-Clic para macOS (.command)
# ==============================================================================
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
exec "$DIR/kiru-quick.sh" "$@"
