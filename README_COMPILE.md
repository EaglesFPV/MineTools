# README — Utiliser MineGuide Carte Seed (WASM cubiomes)

## Ce dont tu as besoin

- **Git** (probablement déjà installé)
- **Python 3** (pour le serveur local)
- **Emscripten** (outil de compilation, ~2 Go, à installer une fois)

---

## Étape 1 — Installer Emscripten (une seule fois)

```bash
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
./emsdk install latest
./emsdk activate latest
```

---

## Étape 2 — Compiler cubiomes → WASM

**Dans chaque nouveau terminal**, active d'abord Emscripten :

```bash
source /chemin/vers/emsdk/emsdk_env.sh
```

Puis va dans le dossier `build/` du projet et lance la compilation :

```bash
cd /chemin/vers/mineguide/build
bash build.sh
```

Durée : ~30 secondes. Tu verras apparaître :
```
✅  Compilation réussie !
   ../mineguide-v5/assets/js/cubiomes.js
   ../mineguide-v5/assets/js/cubiomes.wasm
```

---

## Étape 3 — Lancer un serveur local

⚠️ Le WASM ne fonctionne pas en ouvrant le fichier directement (`file://`).
Il faut un serveur HTTP, même local.

```bash
cd /chemin/vers/mineguide/mineguide-v5
python3 -m http.server 8080
```

Puis ouvre dans le navigateur :
**http://localhost:8080/seedmap.html**

---

## C'est tout.

Entre une seed, sélectionne une version, clique "Générer".

---

## Problèmes courants

| Symptôme | Solution |
|---|---|
| `emcc: command not found` | Relance `source /chemin/emsdk/emsdk_env.sh` |
| Bannière rouge dans le site | Vérifie que `assets/js/cubiomes.wasm` existe |
| CORS error dans la console | Utilise `python3 -m http.server` |
| La carte affiche des erreurs | Ouvre la console du navigateur (F12) |

---

## Pourquoi cette approche ?

cubiomes est une bibliothèque C qui réimplémente **exactement** les algorithmes officiels de Minecraft Java Edition, incluant le système multi-noise de la 1.18+. En la compilant en WebAssembly, elle tourne directement dans le navigateur sans backend, avec une précision identique à Chunkbase.
