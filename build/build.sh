#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# build.sh — Compile cubiomes → WASM pour MineGuide
# ═══════════════════════════════════════════════════════════════════════════
#
# PRÉREQUIS : Emscripten installé et activé
#
#   git clone https://github.com/emscripten-core/emsdk.git
#   cd emsdk
#   ./emsdk install latest
#   ./emsdk activate latest
#   source ./emsdk_env.sh          ← à faire dans chaque nouveau terminal
#
# UTILISATION (depuis le dossier build/) :
#   bash build.sh
#
# RÉSULTAT :
#   ../mineguide-v5/assets/js/cubiomes.js    ← loader Emscripten
#   ../mineguide-v5/assets/js/cubiomes.wasm  ← binaire WASM (~500 Ko)
# ═══════════════════════════════════════════════════════════════════════════

set -e

echo ""
echo "═══════════════════════════════════════════"
echo "  MineGuide — Compilation cubiomes → WASM"
echo "═══════════════════════════════════════════"

# ── Vérifications ───────────────────────────────────────────────────────────
if ! command -v emcc &>/dev/null; then
    echo ""
    echo "ERREUR : emcc introuvable."
    echo "Active Emscripten avec :"
    echo "  source /chemin/vers/emsdk/emsdk_env.sh"
    exit 1
fi

echo "emcc version : $(emcc --version | head -1)"
echo ""

OUT_DIR="../mineguide-v5/assets/js"
mkdir -p "$OUT_DIR"

# ── Compilation ─────────────────────────────────────────────────────────────
echo "Compilation en cours..."

emcc \
    cubiomes_wrapper.c \
    cubiomes/biomenoise.c \
    cubiomes/biomes.c \
    cubiomes/finders.c \
    cubiomes/generator.c \
    cubiomes/layers.c \
    cubiomes/noise.c \
    cubiomes/quadbase.c \
    cubiomes/util.c \
    -I cubiomes \
    -o "$OUT_DIR/cubiomes.js" \
    -s WASM=1 \
    -s EXPORTED_FUNCTIONS='["_malloc","_free","_cw_init","_cw_free","_cw_set_seed","_cw_get_biome_bulk","_cw_get_structures"]' \
    -s EXPORTED_RUNTIME_METHODS='["HEAP32"]' \
    -s ALLOW_MEMORY_GROWTH=1 \
    -s INITIAL_MEMORY=33554432 \
    -s MAXIMUM_MEMORY=536870912 \
    -s MODULARIZE=1 \
    -s EXPORT_NAME="CubiomesModule" \
    -s ENVIRONMENT=worker \
    -s NO_EXIT_RUNTIME=1 \
    -O2 \
    --no-entry

echo ""
echo "✅  Compilation réussie !"
echo ""
echo "Fichiers générés :"
ls -lh "$OUT_DIR/cubiomes.js" "$OUT_DIR/cubiomes.wasm"
echo ""
echo "Ouvre maintenant mineguide-v5/seedmap.html via un serveur local :"
echo "  cd ../mineguide-v5 && python3 -m http.server 8080"
echo "  → http://localhost:8080/seedmap.html"
