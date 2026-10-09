import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readStl, readObj, readGltf, readMesh, toVehicleFrame, MeshFileError } from '../src/core/mesh/mesh.js';
import { Bvh, rayTriangle } from '../src/core/mesh/bvh.js';
import { checkInstallation, visibilityMap } from '../src/core/installation.js';
import { defaultVehicle, parseVehicle, serializeVehicle } from '../src/core/vehicle.js';

/** Triangles of an axis-aligned box. @param {number[]} lo @param {number[]} hi @returns {number[]} */
function box(lo, hi) {
  const [x0, y0, z0] = lo, [x1, y1, z1] = hi;
  const v = [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]];
  const faces = [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]];
  return faces.flatMap(([a, b, c, d]) => [...v[a], ...v[b], ...v[c], ...v[a], ...v[c], ...v[d]]);
}

/** A binary STL of some triangles. @param {number[]} positions */
function stl(positions) {
  const n = positions.length / 9, buf = new ArrayBuffer(84 + 50 * n), view = new DataView(buf);
  view.setUint32(80, n, true);
  for (let t = 0; t < n; t++) for (let k = 0; k < 9; k++) view.setFloat32(84 + t * 50 + 12 + k * 4, positions[t * 9 + k], true);
  return buf;
}

test('STL, OBJ and glTF read the same triangle, and CAD files are turned away with advice', () => {
  const tri = [0, 0, 0, 1, 0, 0, 0, 1, 0];
  assert.deepEqual([...readStl(stl(tri)).positions], tri);
  assert.deepEqual([...readStl(new TextEncoder().encode('solid t\nfacet normal 0 0 1\nouter loop\nvertex 0 0 0\nvertex 1 0 0\nvertex 0 1 0\nendloop\nendfacet\nendsolid').buffer).positions], tri);
  // A quad becomes two triangles; negative indices count back from the last vertex.
  assert.equal(readObj('v 0 0 0\nv 1 0 0\nv 1 1 0\nv 0 1 0\nf 1 2 3 4\nf -4 -3 -2').triangles, 3);
  // A glTF node moves its mesh: translation (10, 0, 0).
  const pos = new Float32Array(tri);
  const json = { asset: { version: '2.0' }, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0, translation: [10, 0, 0] }], meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
    accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: 'VEC3' }], bufferViews: [{ buffer: 0, byteLength: 36 }],
    buffers: [{ byteLength: 36, uri: `data:application/octet-stream;base64,${Buffer.from(pos.buffer).toString('base64')}` }] };
  assert.deepEqual([...readGltf(new TextEncoder().encode(JSON.stringify(json)).buffer).positions], [10, 0, 0, 11, 0, 0, 10, 1, 0]);
  assert.throws(() => readMesh(new ArrayBuffer(10), 'car.stp'), (/** @type {Error} */ e) => e instanceof MeshFileError && /export the vehicle/.test(e.message));
});

test('the vehicle frame puts the front at x = 0, the median plane at y = 0 and the ground at z = 0', () => {
  // A model drawn in metres with x rearwards and z up, its lowest point 0.1 m above the ground.
  const mesh = { positions: new Float32Array(box([-1, -0.9, 0.3], [3, 0.9, 1.5])), triangles: 12 };
  const { bounds } = toVehicleFrame(mesh, { units: 'm', forward: '-x', up: '+z', groundBelow: 100 });
  assert.deepEqual(bounds.max[0], 0);
  assert.deepEqual([bounds.min[0], bounds.min[1], bounds.max[1], bounds.min[2], bounds.max[2]].map(Math.round), [-4000, -900, 900, 100, 1300]);
});

test('the ray index finds the nearest triangle, as a search of every triangle does', () => {
  const positions = [];
  for (let i = 0; i < 40; i++) positions.push(...box([i * 30, 0, 0], [i * 30 + 10, 10 + (i % 7), 10 + (i % 5)]));
  const mesh = { positions: new Float32Array(positions), triangles: positions.length / 9 };
  const bvh = new Bvh(mesh);
  for (let k = 0; k < 200; k++) {
    const o = /** @type {[number, number, number]} */ ([Math.sin(k) * 600 + 600, -50, 3 + (k % 6)]);
    const d = /** @type {[number, number, number]} */ ([Math.cos(k * 0.7) * 0.3, 1, 0]);
    const len = Math.hypot(...d); d[0] /= len; d[1] /= len;
    let best = Infinity;
    for (let t = 0; t < mesh.triangles; t++) { const p = mesh.positions.subarray(t * 9, t * 9 + 9); const x = rayTriangle(o, d, ...p); if (x > 0 && x < best) best = x; }
    const hit = bvh.intersect(o, d);
    assert.equal(hit ? +hit.t.toFixed(6) : Infinity, Number.isFinite(best) ? +best.toFixed(6) : Infinity, `ray ${k}`);
  }
});

/** A box car 4 m long, 1.8 m wide and 1.4 m tall, with front lamps, and a fin beside the left lamp. */
function car() {
  const body = box([-4000, -900, 300], [0, 900, 1400]);
  const fin = box([-200, 700, 650], [300, 760, 760]);
  const mesh = { positions: new Float32Array([...body, ...fin]), triangles: (body.length + fin.length) / 9 };
  const v = defaultVehicle();
  v.vehicle.overallWidth = 1800;
  v.lamps = [
    { name: 'Left indicator', role: 'turn-front', facing: 'front', x: 0, y: 650, z: 700, width: 100, height: 40 },
    { name: 'Right indicator', role: 'turn-front', facing: 'front', x: 0, y: -650, z: 700, width: 100, height: 40 },
  ];
  return { v, bvh: new Bvh(mesh), bounds: { min: /** @type {[number, number, number]} */ ([-4000, -900, 0]), max: /** @type {[number, number, number]} */ ([0, 900, 1400]) } };
}

test('R48 judges height to the apparent surface\'s edges, the outer edge, the pair\'s separation and obstruction', () => {
  const { v, bvh, bounds } = car();
  const r = checkInstallation(v, bounds, bvh, 'r48');
  const item = (/** @type {string} */ id) => r.items.find(i => i.id === id);
  assert.equal(item('turn-front:0:height-min')?.value, 680, 'lowest edge 700 − 20');
  assert.equal(item('turn-front:0:height-max')?.value, 720, 'highest edge 700 + 20');
  assert.equal(item('turn-front:0:outer-edge')?.value, 900 - 700, 'outer edge at 650 + 50 from the median plane');
  assert.equal(item('turn-front:separation')?.value, 1200, 'inner edges at ±600');
  // The fin stands outboard of the left lamp and hides it from far outwards; the right lamp is clear.
  assert.equal(item('turn-front:0:visibility')?.status, 'fail');
  assert.equal(item('turn-front:1:visibility')?.status, 'pass');
  // Mandatory lamps that are not placed are reported missing.
  assert.equal(item('passing:presence')?.status, 'fail');
});

test('a lamp is not hidden by its own lens, and FMVSS measures height to the lamp\'s centre', () => {
  const { v, bounds } = car();
  // A lens bulging 15 mm in front of the lamp's plane, over exactly the apparent surface.
  const lens = box([0, 600, 680], [15, 700, 720]);
  const bvh = new Bvh({ positions: new Float32Array([...box([-4000, -900, 300], [0, 900, 1400]), ...lens]), triangles: 24 });
  const map = visibilityMap(v.lamps[0], bvh, { up: 15, down: 15, out: 80, in: 45 });
  assert.ok(map.sights.every(s => s.visible === 1), 'every direction sees the whole lens');
  const f = checkInstallation(v, bounds, bvh, 'fmvss108');
  assert.equal(f.items.find(i => i.id === 'turn-front:0:height-min')?.value, 700);
});

test('a vehicle survives its file format', () => {
  const { v } = car();
  assert.deepEqual(parseVehicle(serializeVehicle(v)), v);
  assert.throws(() => parseVehicle(JSON.stringify({ ...v, model: { ...v.model, up: '-x' } })), /different axis/);
});
