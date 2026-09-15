#!/bin/bash
# HEMS Runner — optimiza un GLB para el juego (Fase 2 · A2).
#
#   tools/optimize-glb.sh entrada.glb salida.glb
#
# Pasos (todos sin pérdida visual, sin decoders extra en el cliente):
#   1. prune --keep-attributes false  → quita atributos sin uso (TANGENT si no hay normal map)
#   2. dedup                           → une accessors/meshes idénticos (p.ej. las 4 ruedas)
#   3. quantize                        → KHR_mesh_quantization (soportado por GLTFLoader r128)
# Las texturas externas quedan embebidas en el GLB resultante.
# Referencia: Kenney ambulance.glb 246 KB → 82 KB.
set -euo pipefail
IN="$1"; OUT="$2"
G="npx --yes @gltf-transform/cli@4"
TMP=$(mktemp -d)
$G prune "$IN" "$TMP/1.glb" --keep-attributes false
$G dedup "$TMP/1.glb" "$TMP/2.glb"
$G quantize "$TMP/2.glb" "$OUT"
rm -rf "$TMP"
echo "→ $OUT ($(du -h "$OUT" | cut -f1))"
