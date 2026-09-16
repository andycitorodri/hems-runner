// Funde todos los materiales de un GLB en uno (color plano), une las mallas
// (join) y decima (simplify) — para landmarks lejanos de muchas piezas.
//   node tools/node/flatten-glb.mjs entrada.glb salida.glb [ratio=0.2] [hex=b0b0b0]
// Env: SIMPLIFY_ERROR (0.05) · DROP_OUTSIDE=x0,x1,z0,z1 (m, mundo) quita todo triángulo con algún
//      vértice fuera de ese rectángulo (la placa de suelo que traen algunos modelos de Sketchfab).
//      BUCKETS="regex=hex,regex=hex" agrupa por nombre de material original en varios materiales
//      planos (p.ej. "Green=3f8f3a,DarkGray|Color_008=6e6a63"); el resto va al hex por defecto.
//      UPFACING="y0:y1=hex,y0:y1=hex" (m, mundo) pinta de otro color los triángulos que miran
//      hacia arriba (normal y > 0.35) con centroide en esa franja de altura — p.ej. gradas
//      de un estadio por niveles — sin tocar el material del resto de la malla.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { join, simplify, weld, prune, dedup, flatten } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';

const [,, input, output, ratioArg = '0.2', hex = 'b0b0b0'] = process.argv;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(input);
const root = doc.getRoot();
const flat = (name, hex) => doc.createMaterial(name).setBaseColorFactor([...[0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16) / 255), 1]).setMetallicFactor(0).setRoughnessFactor(1);
const buckets = (process.env.BUCKETS || '').split(',').filter(Boolean).map(b => { const [re, h] = b.split('='); return { re: new RegExp(re), mat: flat('flat_' + h, h) }; });
const mat = flat('flat', hex);
for (const mesh of root.listMeshes()) for (const prim of mesh.listPrimitives()) {
  const name = prim.getMaterial()?.getName() || '';
  prim.setMaterial((buckets.find(b => b.re.test(name)) || { mat }).mat);
}
await doc.transform(prune(), dedup(), flatten(), join({ keepNamed: false, keepMeshes: false }));
if (process.env.DROP_OUTSIDE) dropTrianglesOutside(process.env.DROP_OUTSIDE.split(',').map(Number));
if (process.env.UPFACING) splitUpFacing(process.env.UPFACING.split(',').map(b => { const [r, h] = b.split('='); const [y0, y1] = r.split(':').map(Number); return { y0, y1, mat: flat('up_' + h, h) }; }));
await doc.transform(weld(), simplify({ simplifier: MeshoptSimplifier, ratio: parseFloat(ratioArg), error: parseFloat(process.env.SIMPLIFY_ERROR || '0.05') }), prune());
let tris = 0; for (const m of root.listMeshes()) for (const p of m.listPrimitives()) tris += (p.getIndices()?.getCount() || 0) / 3;
console.log(`${output}: meshes ${root.listMeshes().length}, prims ${root.listMeshes().flatMap(m => m.listPrimitives()).length}, tris ${tris}`);
await io.write(output, doc);

// Quita los triángulos con algún vértice fuera del rectángulo [x0,x1]×[z0,z1] (m, en mundo).
function dropTrianglesOutside([x0, x1, z0, z1]) {
  for (const node of root.listNodes()) {
    const mesh = node.getMesh(); if (!mesh) continue;
    const m = node.getWorldMatrix();
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute('POSITION'), idx = prim.getIndices(); if (!idx) continue;
      const src = idx.getArray(), keep = [];
      const v = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], w = [0, 0, 0];
      const xf = (p, o) => { o[0] = m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12]; o[1] = m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13]; o[2] = m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]; };
      let dropped = 0;
      for (let i = 0; i < src.length; i += 3) {
        for (let k = 0; k < 3; k++) { pos.getElement(src[i + k], w); xf(w, v[k]); }
        if (v.some(([x, , z]) => x < x0 || x > x1 || z < z0 || z > z1)) { dropped++; continue; }
        keep.push(src[i], src[i + 1], src[i + 2]);
      }
      // Compacta los vértices que quedan sin usar (si no, seguirían en la caja envolvente).
      const remap = new Map(), newIdx = keep.map(i => { if (!remap.has(i)) remap.set(i, remap.size); return remap.get(i); });
      for (const sem of prim.listSemantics()) {
        const a = prim.getAttribute(sem), n = a.getElementSize(), old = a.getArray(), out = new old.constructor(remap.size * n);
        for (const [from, to] of remap) for (let k = 0; k < n; k++) out[to * n + k] = old[from * n + k];
        a.setArray(out);
      }
      idx.setArray(remap.size > 65535 ? new Uint32Array(newIdx) : new Uint16Array(newIdx));
      console.log(`dropTrianglesOutside(${[x0, x1, z0, z1]}): ${dropped} triángulos quitados, ${remap.size} vértices quedan`);
    }
  }
}

// Separa en primitivas nuevas (con otro material) los triángulos que miran hacia arriba
// cuyo centroide (en mundo) cae en cada franja [y0,y1].
function splitUpFacing(bands) {
  for (const node of root.listNodes()) {
    const mesh = node.getMesh(); if (!mesh) continue;
    const m = node.getWorldMatrix();
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute('POSITION'), idx = prim.getIndices(); if (!idx) continue;
      const src = idx.getArray(), keep = [], out = bands.map(() => []);
      const v = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], w = [0, 0, 0];
      const xf = (p, o) => { o[0] = m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12]; o[1] = m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13]; o[2] = m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]; };
      for (let i = 0; i < src.length; i += 3) {
        for (let k = 0; k < 3; k++) { pos.getElement(src[i + k], w); xf(w, v[k]); }
        const ax = v[1][0] - v[0][0], ay = v[1][1] - v[0][1], az = v[1][2] - v[0][2];
        const bx = v[2][0] - v[0][0], by = v[2][1] - v[0][1], bz = v[2][2] - v[0][2];
        const nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
        const len = Math.hypot(nx, ny, nz) || 1, cy = (v[0][1] + v[1][1] + v[2][1]) / 3;
        const b = ny / len > 0.35 ? bands.findIndex(B => cy >= B.y0 && cy < B.y1) : -1;
        (b >= 0 ? out[b] : keep).push(src[i], src[i + 1], src[i + 2]);
      }
      const mk = arr => doc.createAccessor().setType('SCALAR').setArray(arr.length > 65535 || src instanceof Uint32Array ? new Uint32Array(arr) : new Uint16Array(arr));
      idx.setArray(mk(keep).getArray());
      out.forEach((arr, k) => {
        if (!arr.length) return;
        const p2 = prim.clone().setIndices(mk(arr)).setMaterial(bands[k].mat);
        mesh.addPrimitive(p2);
        console.log(`splitUpFacing ${bands[k].y0}-${bands[k].y1}: ${arr.length / 3} triángulos`);
      });
    }
  }
}
