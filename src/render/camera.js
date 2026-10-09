/** The orbit camera of the 3D view, as plain functions with no DOM, so Node tests can check what it promises: a zoom
 * keeps the point it zooms about still on the screen, an orbit keeps its pivot still, and a fit frames a box.
 * Matrices are column-major 4 × 4 arrays. Coordinates are the vehicle frame in millimetres: x forwards, y to the left,
 * z up. */

/**
 * @typedef {{ target: number[], yaw: number, pitch: number, distance: number, ortho: boolean, scale: number }} OrbitCamera
 *   The camera looks at target from distance away, from the direction given by yaw (about z, from +x) and pitch
 *   (above the horizontal). scale is pixels per millimetre at the target, for the zoom read-out.
 * @typedef {{ min: number[], max: number[] }} Box
 */

/** Half the vertical field of view, in radians. */
export const HALF_FOV = 0.35;
export const MIN_DISTANCE = 200;
export const MAX_DISTANCE = 200000;
export const MIN_PITCH = -1.45;
export const MAX_PITCH = Math.PI / 2 - 0.001;

/** @param {number[]} a @param {number[]} b */
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
/** @param {number[]} a @param {number[]} b */
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
/** @param {number[]} a */
export const norm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

/** @param {number[]} a @param {number[]} b */
export function mul(a, b) {
  const o = new Array(16).fill(0);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
  return o;
}

/** @param {number[]} m @param {number[]} p @returns {number[]} [x, y, z, w] */
export function apply(m, p) {
  return [0, 1, 2, 3].map(r => m[r] * p[0] + m[4 + r] * p[1] + m[8 + r] * p[2] + m[12 + r]);
}

/** @param {OrbitCamera} c */
export function copyCamera(c) { return { ...c, target: [...c.target] }; }

/** The orthonormal frame of a viewing direction: dir points from the target to the eye, side is horizontal, up is
 * the screen's up. @param {number} yaw @param {number} pitch */
export function frame(yaw, pitch) {
  const dir = [Math.cos(pitch) * Math.cos(yaw), Math.cos(pitch) * Math.sin(yaw), Math.sin(pitch)];
  const side = [-Math.sin(yaw), Math.cos(yaw), 0];
  return { dir, side, up: cross(dir, side) };
}

/** The eye position and viewing direction. @param {OrbitCamera} c */
export function eyeOf(c) {
  const { dir } = frame(c.yaw, c.pitch);
  return { eye: [c.target[0] + dir[0] * c.distance, c.target[1] + dir[1] * c.distance, c.target[2] + dir[2] * c.distance], dir };
}

/** The view-projection matrix, and the camera's scale in pixels per millimetre at the target.
 * @param {OrbitCamera} c @param {number} width @param {number} height */
export function viewProjection(c, width, height) {
  const { eye } = eyeOf(c);
  const f = norm([c.target[0] - eye[0], c.target[1] - eye[1], c.target[2] - eye[2]]);
  const up0 = Math.abs(f[2]) > 0.999 ? [Math.cos(c.yaw + Math.PI), Math.sin(c.yaw + Math.PI), 0] : [0, 0, 1];
  const s = norm(cross(f, up0)), u = cross(s, f);
  const view = [s[0], u[0], -f[0], 0, s[1], u[1], -f[1], 0, s[2], u[2], -f[2], 0,
    -dot(s, eye), -dot(u, eye), dot(f, eye), 1];
  const aspect = Math.max(1e-6, width / Math.max(1, height));
  const near = Math.max(10, c.distance / 200), far = c.distance * 20 + 50000;
  let proj;
  if (c.ortho) {
    const hh = c.distance * Math.tan(HALF_FOV), hw = hh * aspect;
    proj = [1 / hw, 0, 0, 0, 0, 1 / hh, 0, 0, 0, 0, -2 / (far - near), 0, 0, 0, -(far + near) / (far - near), 1];
  } else {
    const t = 1 / Math.tan(HALF_FOV);
    proj = [t / aspect, 0, 0, 0, 0, t, 0, 0, 0, 0, (far + near) / (near - far), -1, 0, 0, (2 * far * near) / (near - far), 0];
  }
  return { matrix: mul(proj, view), scale: height / (2 * c.distance * Math.tan(HALF_FOV)) };
}

/** Screen position of a point, or null behind the camera. @param {number[]} m @param {number[]} p @param {number} width @param {number} height */
export function project(m, p, width, height) {
  const q = apply(m, p);
  if (q[3] <= 0) return null;
  return [(q[0] / q[3] * 0.5 + 0.5) * width, (0.5 - q[1] / q[3] * 0.5) * height];
}

/** The ray through a screen point. @param {number[]} m @param {number} x @param {number} y @param {number} width @param {number} height */
export function rayThrough(m, x, y, width, height) {
  const inv = invert(m);
  const nx = (x / width) * 2 - 1, ny = 1 - (y / height) * 2;
  const a = apply(inv, [nx, ny, -1]), b = apply(inv, [nx, ny, 1]);
  const p0 = [a[0] / a[3], a[1] / a[3], a[2] / a[3]], p1 = [b[0] / b[3], b[1] / b[3], b[2] / b[3]];
  return { origin: /** @type {[number, number, number]} */ (p0), dir: /** @type {[number, number, number]} */ (norm([p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]])) };
}

/** Where a ray crosses the plane through the target that faces the camera: the point a zoom or a slide holds when the
 * pointer is off the model. @param {OrbitCamera} c @param {{ origin: number[], dir: number[] }} ray */
export function onTargetPlane(c, ray) {
  const { dir } = eyeOf(c);
  const denom = dot(ray.dir, dir);
  if (Math.abs(denom) < 1e-9) return [...c.target];
  const t = dot([c.target[0] - ray.origin[0], c.target[1] - ray.origin[1], c.target[2] - ray.origin[2]], dir) / denom;
  return [ray.origin[0] + ray.dir[0] * t, ray.origin[1] + ray.dir[1] * t, ray.origin[2] + ray.dir[2] * t];
}

/** The camera after zooming by factor (above 1 moves closer) about a point, which keeps its place on the screen: the
 * eye and the target both scale about it. @param {OrbitCamera} c @param {number} factor @param {number[]} point */
export function zoomAbout(c, factor, point) {
  const distance = Math.max(MIN_DISTANCE, Math.min(MAX_DISTANCE, c.distance / factor));
  const k = distance / c.distance;
  return { ...c, distance, target: [0, 1, 2].map(a => point[a] + (c.target[a] - point[a]) * k) };
}

/** The camera after turning about a pivot by dyaw about the vertical and dpitch about the screen's horizontal. The
 * pivot keeps its place on the screen. @param {OrbitCamera} c @param {number} dyaw @param {number} dpitch @param {number[]} pivot */
export function orbitAbout(c, dyaw, dpitch, pivot) {
  const yaw = c.yaw + dyaw, pitch = Math.max(MIN_PITCH, Math.min(MAX_PITCH, c.pitch + dpitch));
  const a = frame(c.yaw, c.pitch), b = frame(yaw, pitch);
  const rel = [0, 1, 2].map(i => c.target[i] - pivot[i]);
  // Express the target in the old frame and rebuild it in the new one: the same rigid turn that takes dir to dir'.
  const p = [dot(rel, a.dir), dot(rel, a.side), dot(rel, a.up)];
  const target = [0, 1, 2].map(i => pivot[i] + p[0] * b.dir[i] + p[1] * b.side[i] + p[2] * b.up[i]);
  return { ...c, yaw, pitch, target };
}

/** The camera after sliding across the screen so that a point at depth from the eye follows the pointer.
 * @param {OrbitCamera} c @param {number} dx @param {number} dy pixels @param {number} height @param {number} [depth] */
export function slideBy(c, dx, dy, height, depth = c.distance) {
  const { side, up } = frame(c.yaw, c.pitch);
  const k = (c.ortho ? c.distance : depth) * 2 * Math.tan(HALF_FOV) / Math.max(1, height);
  // side is the screen's right; the target moves against the pointer so the scene follows it.
  return { ...c, target: [0, 1, 2].map(a => c.target[a] + (-dx * side[a] + dy * up[a]) * k) };
}

/** The camera that frames a box from the camera's own direction, the box's corners filling `fill` of the view in its
 * tighter direction. @param {OrbitCamera} c @param {Box} b @param {number} width @param {number} height @param {number} [fill] */
export function fitCamera(c, b, width, height, fill = 0.92) {
  const out = { ...c, target: [(b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, (b.min[2] + b.max[2]) / 2] };
  out.distance = Math.max(MIN_DISTANCE, Math.hypot(b.max[0] - b.min[0], b.max[1] - b.min[1], b.max[2] - b.min[2]) * 1.5);
  const corners = [];
  for (const x of [b.min[0], b.max[0]]) for (const y of [b.min[1], b.max[1]]) for (const z of [b.min[2], b.max[2]]) corners.push([x, y, z]);
  for (let k = 0; k < 5 && width > 0 && height > 0; k++) {
    const { matrix } = viewProjection(out, width, height);
    let extent = 0;
    for (const p of corners) { const q = apply(matrix, p); if (q[3] > 0) extent = Math.max(extent, Math.abs(q[0] / q[3]), Math.abs(q[1] / q[3])); }
    if (extent > 0) out.distance = Math.max(MIN_DISTANCE, Math.min(MAX_DISTANCE, out.distance * extent / fill));
  }
  out.scale = viewProjection(out, width, height).scale;
  return out;
}

/** A camera between two, at t from 0 to 1, the yaw taking the short way round. @param {OrbitCamera} a @param {OrbitCamera} b @param {number} t */
export function lerpCamera(a, b, t) {
  let dyaw = (b.yaw - a.yaw) % (2 * Math.PI);
  if (dyaw > Math.PI) dyaw -= 2 * Math.PI;
  if (dyaw < -Math.PI) dyaw += 2 * Math.PI;
  // Distance moves geometrically, so a long zoom does not rush through its near end.
  const distance = a.distance * (b.distance / a.distance) ** t;
  return { ...b, yaw: a.yaw + dyaw * t, pitch: a.pitch + (b.pitch - a.pitch) * t, distance, target: [0, 1, 2].map(i => a.target[i] + (b.target[i] - a.target[i]) * t) };
}

/** The inverse of a column-major 4 × 4 matrix. @param {number[]} m */
export function invert(m) {
  const inv = new Array(16);
  inv[0] = m[5] * m[10] * m[15] - m[5] * m[11] * m[14] - m[9] * m[6] * m[15] + m[9] * m[7] * m[14] + m[13] * m[6] * m[11] - m[13] * m[7] * m[10];
  inv[4] = -m[4] * m[10] * m[15] + m[4] * m[11] * m[14] + m[8] * m[6] * m[15] - m[8] * m[7] * m[14] - m[12] * m[6] * m[11] + m[12] * m[7] * m[10];
  inv[8] = m[4] * m[9] * m[15] - m[4] * m[11] * m[13] - m[8] * m[5] * m[15] + m[8] * m[7] * m[13] + m[12] * m[5] * m[11] - m[12] * m[7] * m[9];
  inv[12] = -m[4] * m[9] * m[14] + m[4] * m[10] * m[13] + m[8] * m[5] * m[14] - m[8] * m[6] * m[13] - m[12] * m[5] * m[10] + m[12] * m[6] * m[9];
  inv[1] = -m[1] * m[10] * m[15] + m[1] * m[11] * m[14] + m[9] * m[2] * m[15] - m[9] * m[3] * m[14] - m[13] * m[2] * m[11] + m[13] * m[3] * m[10];
  inv[5] = m[0] * m[10] * m[15] - m[0] * m[11] * m[14] - m[8] * m[2] * m[15] + m[8] * m[3] * m[14] + m[12] * m[2] * m[11] - m[12] * m[3] * m[10];
  inv[9] = -m[0] * m[9] * m[15] + m[0] * m[11] * m[13] + m[8] * m[1] * m[15] - m[8] * m[3] * m[13] - m[12] * m[1] * m[11] + m[12] * m[3] * m[9];
  inv[13] = m[0] * m[9] * m[14] - m[0] * m[10] * m[13] - m[8] * m[1] * m[14] + m[8] * m[2] * m[13] + m[12] * m[1] * m[10] - m[12] * m[2] * m[9];
  inv[2] = m[1] * m[6] * m[15] - m[1] * m[7] * m[14] - m[5] * m[2] * m[15] + m[5] * m[3] * m[14] + m[13] * m[2] * m[7] - m[13] * m[3] * m[6];
  inv[6] = -m[0] * m[6] * m[15] + m[0] * m[7] * m[14] + m[4] * m[2] * m[15] - m[4] * m[3] * m[14] - m[12] * m[2] * m[7] + m[12] * m[3] * m[6];
  inv[10] = m[0] * m[5] * m[15] - m[0] * m[7] * m[13] - m[4] * m[1] * m[15] + m[4] * m[3] * m[13] + m[12] * m[1] * m[7] - m[12] * m[3] * m[5];
  inv[14] = -m[0] * m[5] * m[14] + m[0] * m[6] * m[13] + m[4] * m[1] * m[14] - m[4] * m[2] * m[13] - m[12] * m[1] * m[6] + m[12] * m[2] * m[5];
  inv[3] = -m[1] * m[6] * m[11] + m[1] * m[7] * m[10] + m[5] * m[2] * m[11] - m[5] * m[3] * m[10] - m[9] * m[2] * m[7] + m[9] * m[3] * m[6];
  inv[7] = m[0] * m[6] * m[11] - m[0] * m[7] * m[10] - m[4] * m[2] * m[11] + m[4] * m[3] * m[10] + m[8] * m[2] * m[7] - m[8] * m[3] * m[6];
  inv[11] = -m[0] * m[5] * m[11] + m[0] * m[7] * m[9] + m[4] * m[1] * m[11] - m[4] * m[3] * m[9] - m[8] * m[1] * m[7] + m[8] * m[3] * m[5];
  inv[15] = m[0] * m[5] * m[10] - m[0] * m[6] * m[9] - m[4] * m[1] * m[10] + m[4] * m[2] * m[9] + m[8] * m[1] * m[6] - m[8] * m[2] * m[5];
  const det = m[0] * inv[0] + m[1] * inv[4] + m[2] * inv[8] + m[3] * inv[12];
  return inv.map(x => x / det);
}
