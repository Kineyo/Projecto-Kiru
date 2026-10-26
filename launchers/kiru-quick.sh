#!/usr/bin/env bash
# ==============================================================================
# Project Kiru v2.0 — Lanzador Rápido para Linux / macOS (.sh)
# Permite probar Kiru en el navegador al instante sin necesidad de compilar.
# Si ya existe el binario nativo en Rust/C++, ofrece usarlo automáticamente.
# ==============================================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ "$(basename "$SCRIPT_DIR")" == "launchers" ]]; then
    ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
else
    ROOT_DIR="$SCRIPT_DIR"
fi

PORT="${KIRU_PORT:-5000}"
URL="http://127.0.0.1:${PORT}"

echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║        ✦ KIRU AI v2.0 — Quick Browser Launcher (.sh) ✦          ║"
echo "╚══════════════════════════════════════════════════════════════════╝"

open_browser() {
    sleep 1.2
    if command -v xdg-open >/dev/null 2>&1; then
        xdg-open "$URL" >/dev/null 2>&1 || true
    elif command -v open >/dev/null 2>&1; then
        open "$URL" >/dev/null 2>&1 || true
    fi
}

# 1. Si el binario Rust compilado existe y no se forzó --quick, podemos usarlo o usar quick_backend.mjs
if [[ "$1" != "--quick" ]] && [[ -x "$ROOT_DIR/target/release/kiru" ]]; then
    echo "⚡ Binario nativo Rust detectado en target/release/kiru"
    open_browser &
    cd "$ROOT_DIR"
    exec "$ROOT_DIR/target/release/kiru" --port "$PORT"
fi

if [[ "$1" != "--quick" ]] && [[ -x "$ROOT_DIR/build-cpp/kiru-cpp" ]]; then
    echo "⚡ Binario nativo C++20 detectado en build-cpp/kiru-cpp"
    open_browser &
    cd "$ROOT_DIR"
    exec "$ROOT_DIR/build-cpp/kiru-cpp" --port "$PORT"
fi

# 2. Modo Prueba Rápida Instantánea (Sin Compilar) usando Node.js
export PATH="$HOME/.local/bin:/usr/local/bin:$PATH"
if command -v node >/dev/null 2>&1; then
    echo "🚀 Iniciando Backend Ligero de Prueba Rápida (Sin Compilar) en $URL ..."
    open_browser &
    exec node "$ROOT_DIR/launchers/quick_backend.mjs"
else
    echo "❌ No se encontró 'node' ni un binario compilado."
    echo "   Instala Node.js (v18+) para el modo rápido sin compilar, o compila con: cargo build --release"
    exit 1
fi
