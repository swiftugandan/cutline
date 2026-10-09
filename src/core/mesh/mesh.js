/** Triangle meshes of a vehicle: reading STL, OBJ and glTF files, and placing the model in the vehicle frame. A mesh
 * is a flat list of triangle corners; the readers keep only geometry. See docs/PHYSICS.md, "The vehicle". */

/**
 * @typedef {{ positions: Float32Array, triangles: number }} Mesh
 *   positions holds three corners per triangle, x y z each: 9 numbers per triangle.
 * @typedef {{ min: [number, number, number], max: [number, number, number] }} Bounds
 * @typedef {'+x' | '-x' | '+y' | '-y' | '+z' | '-z'} AxisName
 */

/** A model file Cutline cannot read, with a message the user can act on. */
export class MeshFileError extends Error {
  /** @param {string} message */
  constructor(message) { super(message); this.name = 'MeshFileError'; }
}

/** The most triangles Cutline reads, to keep the browser responsive. */
export const MAX_TRIANGLES = 6_000_000;

/**
 * Reads a model from its bytes, choosing the reader by the file name.
 * @param {ArrayBuffer} buffer @param {string} name
 * @returns {Mesh}
 */
export function readMesh(buffer, name) {
  const ext = (name.match(/\.([a-z0-9]+)$/i)?.[1] ?? '').toLowerCase();
  if (ext === 'stl') return readStl(buffer, name);
  if (ext === 'obj') return readObj(new TextDecoder().decode(buffer), name);
  if (ext === 'glb' || ext === 'gltf') return readGltf(buffer, name);
  if (ext === 'stp' || ext === 'step' || ext === 'igs' || ext === 'iges') {
    throw new MeshFileError(`${name} is a CAD file (${ext.toUpperCase()}). Cutline reads triangle meshes: export the vehicle from your CAD system as STL, OBJ or glTF (.glb) and open that.`);
  }
  throw new MeshFileError(`${name} is not a model Cutline reads. Open an STL, OBJ or glTF (.glb) file.`);
}

/** @param {number} n @param {string} name */
function checkSize(n, name) {
  if (n > MAX_TRIANGLES) throw new MeshFileError(`${name} has ${n.toLocaleString('en-GB')} triangles, more than Cutline reads (${MAX_TRIANGLES.toLocaleString('en-GB')}). Export it with a coarser tessellation.`);
  if (n === 0) throw new MeshFileError(`${name} holds no triangles.`);
}

/**
 * STL, binary or text.
 * @param {ArrayBuffer} buffer @param {string} name
 * @returns {Mesh}
 */
export function readStl(buffer, name = 'The file') {
  const view = new DataView(buffer);
  if (buffer.byteLength >= 84) {
    const n = view.getUint32(80, true);
    if (84 + n * 50 === buffer.byteLength) {
      checkSize(n, name);
      const positions = new Float32Array(n * 9);
      for (let t = 0; t < n; t++) {
        const base = 84 + t * 50 + 12;
        for (let k = 0; k < 9; k++) positions[t * 9 + k] = view.getFloat32(base + k * 4, true);
      }
      return { positions, triangles: n };
    }
  }
  const text = new TextDecoder().decode(buffer);
  if (!/^\s*solid/i.test(text)) throw new MeshFileError(`${name} is neither a binary nor a text STL file.`);
  const values = [];
  const re = /vertex\s+(\S+)\s+(\S+)\s+(\S+)/gi;
  for (let m = re.exec(text); m; m = re.exec(text)) values.push(Number(m[1]), Number(m[2]), Number(m[3]));
  if (values.length % 9 !== 0 || values.some(v => !Number.isFinite(v))) throw new MeshFileError(`${name} has a facet without three numeric corners.`);
  checkSize(values.length / 9, name);
  return { positions: Float32Array.from(values), triangles: values.length / 9 };
}

/**
 * Wavefront OBJ: vertices and faces, polygons split into fans. Groups, materials and normals are ignored.
 * @param {string} text @param {string} name
 * @returns {Mesh}
 */
export function readObj(text, name = 'The file') {
  /** @type {number[]} */
  const vertices = [];
  /** @type {number[]} */
  const out = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line.startsWith('v ')) {
      const [, x, y, z] = line.split(/\s+/);
      vertices.push(Number(x), Number(y), Number(z));
    } else if (line.startsWith('f ')) {
      const count = vertices.length / 3;
      const ids = line.split(/\s+/).slice(1).map(token => {
        const i = parseInt(token, 10);
        return i < 0 ? count + i : i - 1;
      });
      if (ids.some(i => !Number.isInteger(i) || i < 0 || i >= count)) throw new MeshFileError(`${name} has a face that refers to a vertex it does not define.`);
      for (let k = 1; k + 1 < ids.length; k++) for (const i of [ids[0], ids[k], ids[k + 1]]) out.push(vertices[3 * i], vertices[3 * i + 1], vertices[3 * i + 2]);
    }
  }
  checkSize(out.length / 9, name);
  return { positions: Float32Array.from(out), triangles: out.length / 9 };
}

/**
 * glTF 2.0, binary (.glb) or text (.gltf) with its buffers embedded as data URIs. Every triangle primitive of every
 * node in the default scene is read with its node's transform.
 * @param {ArrayBuffer} buffer @param {string} name
 * @returns {Mesh}
 */
export function readGltf(buffer, name = 'The file') {
  const view = new DataView(buffer);
  /** @type {any} */
  let json;
  /** @type {ArrayBuffer | null} */
  let bin = null;
  if (buffer.byteLength >= 12 && view.getUint32(0, true) === 0x46546c67) {
    let offset = 12;
    while (offset + 8 <= buffer.byteLength) {
      const length = view.getUint32(offset, true), type = view.getUint32(offset + 4, true);
      const chunk = buffer.slice(offset + 8, offset + 8 + length);
      if (type === 0x4e4f534a) json = JSON.parse(new TextDecoder().decode(chunk));
      else if (type === 0x004e4942) bin = chunk;
      offset += 8 + length;
    }
  } else {
    try { json = JSON.parse(new TextDecoder().decode(buffer)); } catch { throw new MeshFileError(`${name} is not a glTF file.`); }
  }
  if (!json || !Array.isArray(json.meshes)) throw new MeshFileError(`${name} holds no meshes.`);
  const buffers = (json.buffers ?? []).map((/** @type {{ uri?: string }} */ b, /** @type {number} */ i) => {
    if (!b.uri) { if (i === 0 && bin) return bin; throw new MeshFileError(`${name} refers to a binary buffer it does not contain.`); }
    const m = b.uri.match(/^data:[^;]*;base64,(.*)$/);
    if (!m) throw new MeshFileError(`${name} keeps its geometry in a separate file (${b.uri}). Export a single .glb file instead.`);
    const bytes = Uint8Array.from(atob(m[1]), c => c.charCodeAt(0));
    return bytes.buffer;
  });
  /** @param {number} index @returns {{ array: Float32Array | Uint32Array | Uint16Array | Uint8Array, size: number }} */
  const accessor = index => {
    const a = json.accessors[index], bv = json.bufferViews[a.bufferView];
    const size = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[/** @type {'SCALAR'} */ (a.type)] ?? 1;
    const Type = { 5126: Float32Array, 5125: Uint32Array, 5123: Uint16Array, 5121: Uint8Array }[/** @type {5126} */ (a.componentType)];
    if (!Type) throw new MeshFileError(`${name} uses an accessor type Cutline does not read.`);
    const stride = bv.byteStride ?? 0, start = (bv.byteOffset ?? 0) + (a.byteOffset ?? 0);
    const src = buffers[bv.buffer];
    if (!stride || stride === size * Type.BYTES_PER_ELEMENT) return { array: new Type(src.slice(start, start + a.count * size * Type.BYTES_PER_ELEMENT)), size };
    const out = new Type(a.count * size), dv = new DataView(src);
    for (let i = 0; i < a.count; i++) for (let k = 0; k < size; k++) {
      const at = start + i * stride + k * Type.BYTES_PER_ELEMENT;
      out[i * size + k] = a.componentType === 5126 ? dv.getFloat32(at, true) : a.componentType === 5125 ? dv.getUint32(at, true) : a.componentType === 5123 ? dv.getUint16(at, true) : dv.getUint8(at);
    }
    return { array: out, size };
  };
  /** @type {number[][]} */
  const parts = [];
  let total = 0;
  /** @param {number} nodeIndex @param {number[]} parent */
  const visit = (nodeIndex, parent) => {
    const node = json.nodes[nodeIndex];
    const matrix = multiply(parent, localMatrix(node));
    if (node.mesh !== undefined) {
      for (const p of json.meshes[node.mesh].primitives) {
        if ((p.mode ?? 4) !== 4 || p.attributes?.POSITION === undefined) continue;
        const pos = accessor(p.attributes.POSITION).array;
        const idx = p.indices !== undefined ? accessor(p.indices).array : null;
        const n = idx ? idx.length : pos.length / 3;
        total += n / 3;
        checkSize(total, name);
        const out = new Array(n * 3);
        for (let k = 0; k < n; k++) {
          const i = idx ? idx[k] : k;
          const x = pos[3 * i], y = pos[3 * i + 1], z = pos[3 * i + 2];
          out[3 * k] = matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12];
          out[3 * k + 1] = matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13];
          out[3 * k + 2] = matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14];
        }
        parts.push(out);
      }
    }
    for (const child of node.children ?? []) visit(child, matrix);
  };
  const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  const scene = json.scenes?.[json.scene ?? 0];
  const roots = scene?.nodes ?? (json.nodes ?? []).map((/** @type {unknown} */ _, /** @type {number} */ i) => i);
  for (const r of roots) visit(r, identity);
  checkSize(total, name);
  const positions = new Float32Array(total * 9);
  let at = 0;
  for (const p of parts) { positions.set(p, at); at += p.length; }
  return { positions, triangles: total };
}

/** A glTF node's own transform, column-major. @param {any} node @returns {number[]} */
function localMatrix(node) {
  if (Array.isArray(node.matrix)) return node.matrix;
  const [tx, ty, tz] = node.translation ?? [0, 0, 0], [qx, qy, qz, qw] = node.rotation ?? [0, 0, 0, 1], [sx, sy, sz] = node.scale ?? [1, 1, 1];
  return [
    (1 - 2 * (qy * qy + qz * qz)) * sx, 2 * (qx * qy + qz * qw) * sx, 2 * (qx * qz - qy * qw) * sx, 0,
    2 * (qx * qy - qz * qw) * sy, (1 - 2 * (qx * qx + qz * qz)) * sy, 2 * (qy * qz + qx * qw) * sy, 0,
    2 * (qx * qz + qy * qw) * sz, 2 * (qy * qz - qx * qw) * sz, (1 - 2 * (qx * qx + qy * qy)) * sz, 0,
    tx, ty, tz, 1,
  ];
}

/** Column-major 4 × 4 product a·b. @param {number[]} a @param {number[]} b */
function multiply(a, b) {
  const out = new Array(16).fill(0);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) out[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
  return out;
}

/** @param {AxisName} a @returns {[number, number, number]} */
export function axisVector(a) {
  const s = a[0] === '-' ? -1 : 1;
  return a[1] === 'x' ? [s, 0, 0] : a[1] === 'y' ? [0, s, 0] : [0, 0, s];
}

/** Millimetres per model unit. */
export const UNITS = { mm: 1, cm: 10, m: 1000, in: 25.4 };

/**
 * Places a mesh in the vehicle frame (ISO 8855: x forwards, y to the left, z up, millimetres): the model's forward and
 * up axes become x and z, the front-most point lies at x = 0, the median plane at y = 0, and the ground at z = 0, a
 * given distance below the model's lowest point.
 * @param {Mesh} mesh @param {{ units: keyof typeof UNITS, forward: AxisName, up: AxisName, groundBelow: number }} frame
 * @returns {{ mesh: Mesh, bounds: Bounds }}
 */
export function toVehicleFrame(mesh, frame) {
  const f = axisVector(frame.forward), u = axisVector(frame.up);
  if (Math.abs(f[0] * u[0] + f[1] * u[1] + f[2] * u[2]) > 1e-9) throw new MeshFileError('The forward and up axes must differ.');
  // y = up × forward points to the left of a vehicle facing forwards.
  const l = [u[1] * f[2] - u[2] * f[1], u[2] * f[0] - u[0] * f[2], u[0] * f[1] - u[1] * f[0]];
  const k = UNITS[frame.units];
  const p = mesh.positions, out = new Float32Array(p.length);
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < p.length; i += 3) {
    const x = p[i], y = p[i + 1], z = p[i + 2];
    const v = [k * (f[0] * x + f[1] * y + f[2] * z), k * (l[0] * x + l[1] * y + l[2] * z), k * (u[0] * x + u[1] * y + u[2] * z)];
    for (let a = 0; a < 3; a++) { out[i + a] = v[a]; if (v[a] < min[a]) min[a] = v[a]; if (v[a] > max[a]) max[a] = v[a]; }
  }
  const shift = [-max[0], -(min[1] + max[1]) / 2, -min[2] + frame.groundBelow];
  for (let i = 0; i < out.length; i += 3) { out[i] += shift[0]; out[i + 1] += shift[1]; out[i + 2] += shift[2]; }
  return {
    mesh: { positions: out, triangles: mesh.triangles },
    bounds: { min: [min[0] + shift[0], min[1] + shift[1], min[2] + shift[2]], max: [max[0] + shift[0], max[1] + shift[1], max[2] + shift[2]] },
  };
}
