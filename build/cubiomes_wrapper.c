/**
 * cubiomes_wrapper.c
 *
 * Wrapper minimaliste exposant cubiomes à JavaScript via Emscripten WASM.
 * Écrit d'après les vrais headers cubiomes (generator.h, finders.h, biomes.h).
 *
 * ──────────────────────────────────────────────────────────────────────────
 * COMPILATION :
 *   Depuis le dossier build/ :
 *
 *   emcc cubiomes_wrapper.c \
 *        ../cubiomes/biomenoise.c \
 *        ../cubiomes/biomes.c \
 *        ../cubiomes/finders.c \
 *        ../cubiomes/generator.c \
 *        ../cubiomes/layers.c \
 *        ../cubiomes/noise.c \
 *        ../cubiomes/quadbase.c \
 *        ../cubiomes/util.c \
 *        -I ../cubiomes \
 *        -o ../mineguide-v5/assets/js/cubiomes.js \
 *        -s WASM=1 \
 *        -s EXPORTED_FUNCTIONS='["_malloc","_free","_cw_init","_cw_free","_cw_set_seed","_cw_get_biome_bulk","_cw_get_structures"]' \
 *        -s EXPORTED_RUNTIME_METHODS='["HEAP32","HEAPU8"]' \
 *        -s ALLOW_MEMORY_GROWTH=1 \
 *        -s INITIAL_MEMORY=33554432 \
 *        -s MODULARIZE=1 \
 *        -s EXPORT_NAME="CubiomesModule" \
 *        -s ENVIRONMENT=worker \
 *        -O2
 * ──────────────────────────────────────────────────────────────────────────
 */

#include <stdlib.h>
#include <string.h>

#include "generator.h"   /* setupGenerator, applySeed, genBiomes, getBiomeAt */
#include "finders.h"     /* getStructureConfig, getStructurePos, StructureType */
#include "biomes.h"      /* MCVersion, BiomeID, DIM_OVERWORLD */

/* ── Correspondance version string entier → MCVersion enum ─────────────── */
/* L'interface JS passe un entier (ex: 1214, 1210, 1200, 1190, 1182, 1171…) */
static int to_mc_version(int v) {
    if      (v >= 1213) return MC_1_21;      /* MC_1_21_WD = MC_NEWEST     */
    else if (v >= 1211) return MC_1_21_3;
    else if (v >= 1210) return MC_1_21_1;
    else if (v >= 1200) return MC_1_20;
    else if (v >= 1194) return MC_1_19;
    else if (v >= 1192) return MC_1_19_2;
    else if (v >= 1190) return MC_1_19_2;
    else if (v >= 1182) return MC_1_18;      /* MC_1_18 = MC_1_18_2        */
    else if (v >= 1180) return MC_1_18;
    else if (v >= 1170) return MC_1_17;
    else if (v >= 1165) return MC_1_16;      /* MC_1_16 = MC_1_16_5        */
    else if (v >= 1161) return MC_1_16_1;
    else                return MC_1_16;
}

/* ── Handle opaque retourné à JS ───────────────────────────────────────── */
typedef struct {
    Generator g;
    int       mc;
    uint64_t  seed;
} CWCtx;

/**
 * cw_init(version_int, large_biomes)
 *   version_int : entier ex. 1214, 1210, 1200, 1190, 1182, 1170, 1165
 *   large_biomes: 0 ou 1
 *   Retourne : pointeur CWCtx* (ou NULL si échec)
 */
CWCtx *cw_init(int version_int, int large_biomes) {
    CWCtx *ctx = (CWCtx*)calloc(1, sizeof(CWCtx));
    if (!ctx) return NULL;
    ctx->mc = to_mc_version(version_int);
    uint32_t flags = large_biomes ? LARGE_BIOMES : 0;
    setupGenerator(&ctx->g, ctx->mc, flags);
    return ctx;
}

/**
 * cw_free(ctx)
 */
void cw_free(CWCtx *ctx) {
    if (ctx) free(ctx);
}

/**
 * cw_set_seed(ctx, seed_lo, seed_hi)
 *   seed_lo : bits 0-31  (int32)
 *   seed_hi : bits 32-63 (int32)
 *   JS :  seed_lo = seed | 0
 *         seed_hi = Math.floor(seed / 0x100000000)
 */
void cw_set_seed(CWCtx *ctx, int seed_lo, int seed_hi) {
    if (!ctx) return;
    uint64_t seed = ((uint64_t)(unsigned int)seed_hi << 32)
                  | (unsigned int)seed_lo;
    ctx->seed = seed;
    applySeed(&ctx->g, DIM_OVERWORLD, seed);
}

/**
 * cw_get_biome_bulk(ctx, out, ox, oz, w, h, scale)
 *
 *   Génère une grille de biomes WxH.
 *   out   : buffer int32 alloué par JS (taille w*h ints)
 *   ox,oz : coin nord-ouest en coordonnées BLOCS
 *   w,h   : dimensions en pixels de sortie
 *   scale : résolution en blocs/pixel (1, 4, 16, 64…)
 *
 *   Range r = {scale, ox/scale, oz/scale, w, h, 63/scale_y, 1}
 *   (y=63 = niveau de la mer pour la surface en 1.18+)
 *
 *   Indexation : out[iz*w + ix] = biome_id
 */
void cw_get_biome_bulk(CWCtx *ctx, int *out, int ox, int oz,
                        int w, int h, int scale) {
    if (!ctx || !out || w <= 0 || h <= 0) return;

    Range r;
    r.scale = scale;
    /* Les coordonnées x,z de Range sont en unités "scalées",
       pas en blocs : il faut diviser par scale. */
    r.x  = ox / scale;
    r.z  = oz / scale;
    r.sx = w;
    r.sz = h;
    /* y en unités scalées. Pour scale==1 → y=63 (surface).
       Pour scale==4 → y=15 (équivalent ~Y=60). */
    r.y  = (scale == 1) ? 63 : (63 / 4);
    r.sy = 1;  /* coupe 2D */

    genBiomes(&ctx->g, out, r);
}

/**
 * cw_get_structures(ctx, out_x, out_z, struct_type,
 *                   cx, cz, radius_chunks, max,
 *                   seed_lo, seed_hi)
 *
 *   Cherche les positions de structures dans un carré de côté radius_chunks
 *   centré sur (cx,cz) (coordonnées chunks).
 *
 *   out_x, out_z : buffers int32 de taille >= max
 *   Retourne     : nombre de structures trouvées
 *
 *   struct_type : voir enum ci-dessous dans le worker JS
 */
int cw_get_structures(CWCtx *ctx,
                       int *out_x, int *out_z,
                       int struct_type,
                       int cx, int cz,
                       int radius_chunks, int max,
                       int seed_lo, int seed_hi) {
    if (!ctx || !out_x || !out_z || max <= 0) return 0;

    uint64_t seed = ((uint64_t)(unsigned int)seed_hi << 32)
                  | (unsigned int)seed_lo;

    StructureConfig sc;
    /* getStructureConfig retourne 1 si la structure existe dans cette version */
    if (getStructureConfig(struct_type, ctx->mc, &sc) == 0) return 0;

    int rs = sc.regionSize;
    if (rs <= 0) rs = 1;

    /* Bornes en régions */
    int rmin = (cx - radius_chunks) / rs - 1;
    int rmax = (cx + radius_chunks) / rs + 1;

    int count = 0;
    for (int rx = rmin; rx <= rmax && count < max; rx++) {
        for (int rz = rmin; rz <= rmax && count < max; rz++) {
            Pos p;
            /* getStructurePos retourne 1 si une structure est dans cette région */
            if (!getStructurePos(struct_type, ctx->mc, seed, rx, rz, &p))
                continue;

            /* Filtre par rayon en chunks */
            int pcx = p.x >> 4;  /* p.x est en blocs → /16 pour chunks */
            int pcz = p.z >> 4;
            int dcx = pcx - cx;
            int dcz = pcz - cz;
            if ((long long)dcx*dcx + (long long)dcz*dcz
                > (long long)radius_chunks * radius_chunks)
                continue;

            out_x[count] = p.x;
            out_z[count] = p.z;
            count++;
        }
    }
    return count;
}
