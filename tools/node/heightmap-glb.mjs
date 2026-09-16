// Malla de terreno a partir de un JSON de alturas (tools/terrain/fetch_heightmap.py)
// con textura de color por altura/pendiente embebida (PNG generado aquí).
//   node tools/node/heightmap-glb.mjs assets/terrain/montserrat.json salida.glb [rockFrom_m=600]
// Unidades: metros reales (x = este, z = sur→ +z, y = altura). Origen en el centro, y=0 en la altura mínima.
import { Document, NodeIO } from '@gltf-transform/core';
import { readFileSync } from 'node:fs';
import zlib from 'node:zlib';

const [,, input, output, rockArg = '600', edgeArg = '0.15'] = process.argv;  // edge: fracción del borde en la que la altura cae a 0 (isla, sin paredes)
const H = JSON.parse(readFileSync(input, 'utf8'));
const { nx, ny, wx_m: wx, wy_m: wy, z } = H;
const zmin = Math.min(...z), zmax = Math.max(...z), rockFrom = parseFloat(rockArg);

// Posiciones (fila j = latitud sur→norte → z va de +wy/2 a −wy/2), UVs
const pos = new Float32Array(nx * ny * 3), uv = new Float32Array(nx * ny * 2);
for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
  const k = j * nx + i;
  const edge = parseFloat(edgeArg), u = i / (nx - 1), v = j / (ny - 1);
  const d = Math.min(u, 1 - u, v, 1 - v) / edge, w = d >= 1 ? 1 : d * d * (3 - 2 * d);
  pos[k * 3] = -wx / 2 + wx * i / (nx - 1); pos[k * 3 + 1] = (z[k] - zmin) * w; pos[k * 3 + 2] = wy / 2 - wy * j / (ny - 1);
  uv[k * 2] = i / (nx - 1); uv[k * 2 + 1] = 1 - j / (ny - 1);
}
const idx = [];
for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) { const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1; idx.push(a, b, c, b, d, c); }
// Normales por vértice (suma de normales de triángulo)
const nrm = new Float32Array(nx * ny * 3);
for (let t = 0; t < idx.length; t += 3) {
  const [a, b, c] = [idx[t], idx[t + 1], idx[t + 2]];
  const ax = pos[b*3]-pos[a*3], ay = pos[b*3+1]-pos[a*3+1], az = pos[b*3+2]-pos[a*3+2];
  const bx = pos[c*3]-pos[a*3], by = pos[c*3+1]-pos[a*3+1], bz = pos[c*3+2]-pos[a*3+2];
  const n = [ay*bz-az*by, az*bx-ax*bz, ax*by-ay*bx];
  for (const v of [a, b, c]) { nrm[v*3] += n[0]; nrm[v*3+1] += n[1]; nrm[v*3+2] += n[2]; }
}
for (let k = 0; k < nx * ny; k++) { const l = Math.hypot(nrm[k*3], nrm[k*3+1], nrm[k*3+2]) || 1; nrm[k*3] /= l; nrm[k*3+1] /= l; nrm[k*3+2] /= l; }

// Textura de color: bosque abajo, roca (gris rosado) por encima de rockFrom o en pendientes fuertes
const px = new Uint8Array(nx * ny * 3);
for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
  const k = j * nx + i, tex = (ny - 1 - j) * nx + i;  // fila 0 de la imagen = norte (uv v=0 arriba)
  const h = z[k], slope = 1 - nrm[k*3+1];
  const t = Math.min(1, Math.max(0, (h - rockFrom) / 250 + slope * 2.5));
  const g = [0x4a, 0x66, 0x38], r = [0x8e, 0x88, 0x84];
  const v = Math.random() * 12 - 6;
  for (let c = 0; c < 3; c++) px[tex * 3 + c] = Math.max(0, Math.min(255, g[c] + (r[c] - g[c]) * t + v));
}
const png = encodePNG(nx, ny, px);

const doc = new Document(); const buf = doc.createBuffer();
const acc = (arr, type) => doc.createAccessor().setType(type).setArray(arr).setBuffer(buf);
const tex = doc.createTexture('terrain').setImage(png).setMimeType('image/png');
const mat = doc.createMaterial('terrain').setBaseColorTexture(tex).setMetallicFactor(0).setRoughnessFactor(1);
const prim = doc.createPrimitive().setAttribute('POSITION', acc(pos, 'VEC3')).setAttribute('NORMAL', acc(nrm, 'VEC3')).setAttribute('TEXCOORD_0', acc(uv, 'VEC2')).setIndices(acc(new Uint32Array(idx), 'SCALAR')).setMaterial(mat);
const mesh = doc.createMesh('terrain').addPrimitive(prim);
const node = doc.createNode('terrain').setMesh(mesh);
doc.createScene('scene').addChild(node);
await new NodeIO().write(output, doc);
console.log(`${output}: ${nx}×${ny}, ${idx.length / 3} tris, ${wx.toFixed(0)}×${wy.toFixed(0)} m, altura ${zmin}-${zmax} m`);

function encodePNG(w, h, rgb) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; Buffer.from(rgb.buffer, y * w * 3, w * 3).copy(raw, y * (w * 3 + 1) + 1); }
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, crc]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
function crc32(b) { let c = ~0; for (const x of b) { c ^= x; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xEDB88320 & -(c & 1)); } return ~c >>> 0; }
