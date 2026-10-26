#!/usr/bin/env bash
# ==============================================================================
# Project Kiru v2.0 — Lanzador Doble-Clic para macOS (.command) y Empaquetador .dmg
# En macOS:
#   - Hacer doble clic en este archivo inicia el backend rápido y abre Safari/Chrome.
#   - Ejecutar con `--build-dmg` genera `Kiru-Quick-Launcher.dmg` listo para montar.
# ==============================================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
if [[ "$(basename "$SCRIPT_DIR")" == "launchers" ]]; then
    ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
else
    ROOT_DIR="$SCRIPT_DIR"
fi

if [[ "$1" == "--build-dmg" ]]; then
    if ! command -v hdiutil >/dev/null 2>&1; then
        echo "ℹ️  'hdiutil' solo está disponible en macOS para empaquetar volúmenes .dmg nativos."
        echo "   En Linux/macOS puedes lanzar Kiru directamente con: ./launchers/kiru-quick.sh"
        exit 0
    fi
    DMG_STAGE="$(mktemp -d)"
    APP_DIR="$DMG_STAGE/Kiru Quick Test.app/Contents/MacOS"
    mkdir -p "$APP_DIR"
    cp -R "$ROOT_DIR/frontend" "$ROOT_DIR/assets" "$ROOT_DIR/launchers" "$DMG_STAGE/"
    cat > "$APP_DIR/KiruQuick" <<'EOF'
#!/usr/bin/env bash
DIR="$(cd "$(dirname "$0")/../../.." && pwd)"
exec "$DIR/launchers/kiru-quick.sh" --quick
EOF
    chmod +x "$APP_DIR/KiruQuick"
    hdiutil create -volname "Kiru AI Quick Test" -srcfolder "$DMG_STAGE" -ov -format UDZO "$ROOT_DIR/Kiru-Quick-Test.dmg"
    rm -rf "$DMG_STAGE"
    echo "✅ Imagen de disco creada en: $ROOT_DIR/Kiru-Quick-Test.dmg"
    exit 0
fi

exec "$ROOT_DIR/launchers/kiru-quick.sh" "$@"
