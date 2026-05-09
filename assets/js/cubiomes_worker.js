/**
 * cubiomes_worker.js
 * Web Worker — charge cubiomes.wasm et traite les requêtes de tuiles/structures.
 *
 * Tout le calcul biome/structure se fait ici.
 * Le thread principal (seedmap.html) reste toujours fluide.
 */
"use strict";

/* ═══════════════════════════════════════════════════════════════════════════
   PALETTE BIOMES (couleurs Minecraft officielles)
   IDs issus du vrai enum BiomeID de cubiomes/biomes.h
═══════════════════════════════════════════════════════════════════════════ */
var BIOME_COLORS = new Int32Array(512).fill(-1); // -1 = inconnu

function bc(id, r, g, b) {
    if (id < 0 || id >= 512) return;
    BIOME_COLORS[id] = (r << 16) | (g << 8) | b;
}

/* Overworld classiques (0-53) */
bc(0,  0,0,112);        /* ocean */
bc(1,  141,179,96);     /* plains */
bc(2,  250,148,24);     /* desert */
bc(3,  96,96,96);       /* mountains / windswept_hills */
bc(4,  5,102,33);       /* forest */
bc(5,  11,102,89);      /* taiga */
bc(6,  7,249,178);      /* swamp */
bc(7,  0,0,255);        /* river */
bc(8,  191,59,59);      /* nether_wastes */
bc(9,  128,128,255);    /* the_end */
bc(10, 144,144,160);    /* frozen_ocean */
bc(11, 160,160,255);    /* frozen_river */
bc(12, 255,255,255);    /* snowy_tundra / snowy_plains */
bc(13, 160,160,160);    /* snowy_mountains */
bc(14, 255,0,255);      /* mushroom_fields */
bc(15, 160,0,255);      /* mushroom_field_shore */
bc(16, 250,222,85);     /* beach */
bc(17, 210,95,18);      /* desert_hills */
bc(18, 34,85,28);       /* wooded_hills */
bc(19, 22,57,51);       /* taiga_hills */
bc(20, 114,120,154);    /* mountain_edge */
bc(21, 83,123,9);       /* jungle */
bc(22, 44,66,5);        /* jungle_hills */
bc(23, 99,166,47);      /* jungle_edge / sparse_jungle */
bc(24, 0,0,48);         /* deep_ocean */
bc(25, 162,162,132);    /* stone_shore / stony_shore */
bc(26, 250,240,192);    /* snowy_beach */
bc(27, 48,116,68);      /* birch_forest */
bc(28, 31,95,50);       /* birch_forest_hills */
bc(29, 64,81,26);       /* dark_forest */
bc(30, 49,85,74);       /* snowy_taiga */
bc(31, 36,63,54);       /* snowy_taiga_hills */
bc(32, 89,102,81);      /* giant_tree_taiga / old_growth_pine_taiga */
bc(33, 69,79,62);       /* giant_tree_taiga_hills */
bc(34, 80,112,80);      /* wooded_mountains / windswept_forest */
bc(35, 189,178,95);     /* savanna */
bc(36, 167,157,100);    /* savanna_plateau */
bc(37, 217,69,21);      /* badlands */
bc(38, 176,151,101);    /* wooded_badlands_plateau / wooded_badlands */
bc(39, 195,155,111);    /* badlands_plateau */
bc(44, 0,191,255);      /* warm_ocean */
bc(45, 0,140,200);      /* lukewarm_ocean */
bc(46, 32,100,160);     /* cold_ocean */
bc(47, 0,100,180);      /* deep_warm_ocean */
bc(48, 0,80,140);       /* deep_lukewarm_ocean */
bc(49, 24,70,120);      /* deep_cold_ocean */
bc(50, 10,50,90);       /* deep_frozen_ocean */

/* Mutated / +128 */
bc(129, 178,227,120);   /* sunflower_plains */
bc(130, 255,185,90);    /* desert_lakes */
bc(131, 130,130,130);   /* gravelly_mountains / windswept_gravelly_hills */
bc(132, 79,145,72);     /* flower_forest */
bc(133, 49,130,106);    /* taiga_mountains */
bc(134, 50,190,140);    /* swamp_hills */
bc(140, 178,230,220);   /* ice_spikes */
bc(149, 120,160,40);    /* modified_jungle */
bc(151, 132,195,80);    /* modified_jungle_edge */
bc(155, 100,165,118);   /* tall_birch_forest / old_growth_birch_forest */
bc(156, 68,130,98);     /* tall_birch_hills */
bc(157, 90,110,50);     /* dark_forest_hills */
bc(158, 64,105,90);     /* snowy_taiga_mountains */
bc(160, 120,135,105);   /* giant_spruce_taiga / old_growth_spruce_taiga */
bc(161, 95,115,85);     /* giant_spruce_taiga_hills */
bc(162, 105,140,105);   /* modified_gravelly_mountains */
bc(163, 220,210,100);   /* shattered_savanna / windswept_savanna */
bc(164, 195,185,120);   /* shattered_savanna_plateau */
bc(165, 255,109,61);    /* eroded_badlands */
bc(166, 205,175,120);   /* modified_wooded_badlands_plateau */
bc(167, 215,175,130);   /* modified_badlands_plateau */

/* 1.14 */
bc(168, 50,110,10);     /* bamboo_jungle */
bc(169, 30,75,5);       /* bamboo_jungle_hills */

/* 1.16 Nether */
bc(170, 93,68,32);      /* soul_sand_valley */
bc(171, 221,8,8);       /* crimson_forest */
bc(172, 73,144,123);    /* warped_forest */
bc(173, 84,84,94);      /* basalt_deltas */

/* 1.17 Caves */
bc(174, 130,100,60);    /* dripstone_caves */
bc(175, 80,160,80);     /* lush_caves */

/* 1.18 */
bc(177, 83,179,96);     /* meadow */
bc(178, 200,220,255);   /* grove */
bc(179, 205,210,220);   /* snowy_slopes */
bc(180, 160,180,200);   /* jagged_peaks */
bc(181, 150,170,190);   /* frozen_peaks */
bc(182, 210,200,170);   /* stony_peaks */

/* 1.19 */
bc(183, 15,15,25);      /* deep_dark */
bc(184, 45,120,60);     /* mangrove_swamp */

/* 1.20 */
bc(185, 255,183,197);   /* cherry_grove */

/* 1.21 */
bc(186, 220,230,215);   /* pale_garden */

function getBiomeRGB(id) {
    if (id < 0 || id >= 512) return 0x646464;
    var c = BIOME_COLORS[id];
    return c < 0 ? 0x646464 : c;
}

/* ═══════════════════════════════════════════════════════════════════════════
   CORRESPONDANCE version string → entier pour le wrapper C
   Le wrapper C attend des entiers style 1210, 1200, 1182, 1165…
═══════════════════════════════════════════════════════════════════════════ */
function versionToInt(v) {
    var parts = String(v).split('.').map(Number);
    var minor = parts[1] || 16;
    var patch = parts[2] || 0;
    /* On encode : 1000 + minor*10 + min(patch,9)
       Exemples : 1.21.4→1214  1.20.6→1206  1.18.2→1182  1.16.5→1165 */
    return 1000 + minor * 10 + Math.min(patch, 9);
}

/* ═══════════════════════════════════════════════════════════════════════════
   STRUCTURES — types supportés
   Les valeurs numériques correspondent à l'enum StructureType dans finders.h
═══════════════════════════════════════════════════════════════════════════ */
var STRUCT_CFGS = [
    { type: 5,  name: 'Village',         icon: '🏘', color: '#F5A623' },
    { type: 19, name: 'Forteresse',      icon: '🔥', color: '#CC3333' },
    { type: 20, name: 'Bastion',         icon: '🏰', color: '#AA2222' },
    { type: 8,  name: 'Monument',        icon: '🔷', color: '#4A90D9' },
    { type: 9,  name: 'Manoir',          icon: '🏚', color: '#7B4F3A' },
    { type: 1,  name: 'Temple Désert',   icon: '🔺', color: '#E8A020' },
    { type: 2,  name: 'Temple Jungle',   icon: '🌿', color: '#5E9B3B' },
    { type: 3,  name: 'Cabane Marais',   icon: '🪄', color: '#6B8E23' },
    { type: 10, name: 'Avant-Poste',     icon: '🗼', color: '#999977' },
    { type: 12, name: 'Cité Antique',    icon: '💀', color: '#4444AA' },
    { type: 14, name: 'Château Fort',    icon: '💎', color: '#AA8833' },
];

var MAX_STRUCTS = 512;

/* ═══════════════════════════════════════════════════════════════════════════
   ÉTAT DU WORKER
═══════════════════════════════════════════════════════════════════════════ */
var Module  = null;
var ctx     = 0;      /* pointeur CWCtx* dans le heap WASM */
var isReady = false;

/* Buffer WASM persistant pour genBiomes */
var biomeBufPtr = 0;
var biomeBufLen = 0;

/* ═══════════════════════════════════════════════════════════════════════════
   CHARGEMENT WASM
═══════════════════════════════════════════════════════════════════════════ */
importScripts('cubiomes.js');

CubiomesModule().then(function(m) {
    Module   = m;
    isReady  = true;
    postMessage({ type: 'ready' });
}).catch(function(err) {
    postMessage({ type: 'error', msg: 'Chargement WASM échoué : ' + err.message });
});

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS SEED
═══════════════════════════════════════════════════════════════════════════ */
function seedParts(seed) {
    seed = Math.trunc(seed);
    var lo = seed | 0;
    var hi = Math.floor(seed / 0x100000000) | 0;
    return [lo, hi];
}

/* ═══════════════════════════════════════════════════════════════════════════
   GÉNÉRATION D'UNE TUILE
   tileX, tileZ : coin nord-ouest en blocs
   tileSz       : largeur en blocs de la tuile
   px           : taille de sortie en pixels (ex: 64)
═══════════════════════════════════════════════════════════════════════════ */
function generateTile(tileX, tileZ, tileSz, px) {
    if (!Module || !ctx) return null;

    /* scale = blocs par pixel, doit être puissance de 2 et >= 1 */
    var scale = Math.max(1, Math.round(tileSz / px));
    /* cubiomes accepte scale 1, 4, 16, 64, 256 — arrondir à la puissance de 2 la plus proche */
    var validScales = [1, 4, 16, 64, 256];
    var best = 4;
    for (var i = 0; i < validScales.length; i++) {
        if (Math.abs(validScales[i] - scale) < Math.abs(best - scale)) best = validScales[i];
    }
    scale = best;

    var needed = px * px;

    /* (Ré)alloue le buffer WASM si nécessaire */
    if (!biomeBufPtr || biomeBufLen < needed) {
        if (biomeBufPtr) Module._free(biomeBufPtr);
        biomeBufPtr = Module._malloc(needed * 4);
        biomeBufLen = needed;
    }

    Module._cw_get_biome_bulk(ctx, biomeBufPtr, tileX, tileZ, px, px, scale);

    /* Lit les biome IDs depuis le heap WASM */
    var heap = new Int32Array(Module.HEAP32.buffer, biomeBufPtr, needed);

    /* Construit le buffer RGBA */
    var rgba = new Uint8ClampedArray(needed * 4);
    for (var i = 0; i < needed; i++) {
        var rgb = getBiomeRGB(heap[i]);
        rgba[i*4]   = (rgb >> 16) & 0xFF;
        rgba[i*4+1] = (rgb >>  8) & 0xFF;
        rgba[i*4+2] =  rgb        & 0xFF;
        rgba[i*4+3] = 255;
    }
    return rgba;
}

/* ═══════════════════════════════════════════════════════════════════════════
   RÉCUPÉRATION DES STRUCTURES
═══════════════════════════════════════════════════════════════════════════ */
function getStructures(seed, radiusChunks) {
    if (!Module || !ctx) return {};

    var [lo, hi] = seedParts(seed);
    var result   = {};

    /* Alloue 2 buffers x/z une seule fois */
    var bx = Module._malloc(MAX_STRUCTS * 4);
    var bz = Module._malloc(MAX_STRUCTS * 4);

    for (var si = 0; si < STRUCT_CFGS.length; si++) {
        var cfg   = STRUCT_CFGS[si];
        var count = Module._cw_get_structures(
            ctx, bx, bz,
            cfg.type,
            0, 0,           /* chunk central : spawn */
            radiusChunks,
            MAX_STRUCTS,
            lo, hi
        );

        var positions = [];
        if (count > 0) {
            var hx = new Int32Array(Module.HEAP32.buffer, bx, count);
            var hz = new Int32Array(Module.HEAP32.buffer, bz, count);
            for (var i = 0; i < count; i++) {
                positions.push({ x: hx[i], z: hz[i] });
            }
        }

        result[cfg.type] = { cfg: cfg, positions: positions };
    }

    Module._free(bx);
    Module._free(bz);
    return result;
}

/* ═══════════════════════════════════════════════════════════════════════════
   GESTIONNAIRE DE MESSAGES
═══════════════════════════════════════════════════════════════════════════ */
self.onmessage = function(e) {
    var msg = e.data;

    switch (msg.type) {

        /* ── Initialiser seed + version ────────────────────────────────── */
        case 'init': {
            if (!isReady) {
                postMessage({ type: 'error', msg: 'WASM pas encore prêt.' });
                return;
            }

            /* Libère l'ancien contexte */
            if (ctx) { Module._cw_free(ctx); ctx = 0; }

            var vint = versionToInt(msg.version);
            ctx = Module._cw_init(vint, msg.largeBiomes ? 1 : 0);
            if (!ctx) {
                postMessage({ type: 'error', msg: 'cw_init a échoué.' });
                return;
            }

            var parts = seedParts(msg.seed);
            Module._cw_set_seed(ctx, parts[0], parts[1]);

            postMessage({ type: 'init_ok' });
            break;
        }

        /* ── Générer une tuile biome ────────────────────────────────────── */
        case 'tile': {
            var rgba = ctx ? generateTile(msg.tileX, msg.tileZ, msg.tileSz, msg.px) : null;
            postMessage(
                { type: 'tile', id: msg.id, rgba: rgba, px: msg.px },
                rgba ? [rgba.buffer] : []
            );
            break;
        }

        /* ── Structures ─────────────────────────────────────────────────── */
        case 'structures': {
            var data = ctx ? getStructures(msg.seed, msg.radiusChunks || 1600) : {};
            postMessage({ type: 'structures', data: data });
            break;
        }
    }
};
