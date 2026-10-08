/** Ray–surface intersection kernels in 3D. Each surface is compiled once into a closure that works in its own
 * local frame. A hit reports the ray parameter t, the unit front normal in the lamp frame, and the hit point. */

/** @import { Surface, Frame, QuadricShape, AsphereShape, Cell } from './types.js' */

/**
 * Mutable nearest-hit record. (nx, ny, nz) is the unit front normal in the lamp frame; (px, py, pz) the hit point.
 * @typedef {{ t: number, nx: number, ny: number, nz: number, px: number, py: number, pz: number, index: number }} Hit
 * @typedef {{ surface: Surface, intersect: (ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, tMin: number, hit: Hit, index: number) => void }} CompiledSurface
 */

/** @returns {Hit} */
export function newHit() {
  return { t: Infinity, nx: 0, ny: 0, nz: 0, px: 0, py: 0, pz: 0, index: -1 };
}

const IDENTITY = /** @type {const} */ ([1, 0, 0, 0, 1, 0, 0, 0, 1]);

/**
 * Rotation from yaw (about +y, positive turns +z towards +x), pitch (about the new +x, positive turns +z down) and
 * roll, in degrees, as row-major axes for a Frame.
 * @param {number} yawDeg @param {number} pitchDeg @param {number} [rollDeg]
 * @returns {[number, number, number, number, number, number, number, number, number]}
 */
export function rotation(yawDeg, pitchDeg, rollDeg = 0) {
  const y = (yawDeg * Math.PI) / 180, p = (pitchDeg * Math.PI) / 180, r = (rollDeg * Math.PI) / 180;
  const cy = Math.cos(y), sy = Math.sin(y), cp = Math.cos(p), sp = Math.sin(p), cr = Math.cos(r), sr = Math.sin(r);
  // R = Ry(yaw) · Rx(pitch) · Rz(roll). Columns are the rotated axes: Ry turns +z towards +x, and this Rx turns
  // +z towards −y, so positive pitch aims down.
  const ry = [cy, 0, sy, 0, 1, 0, -sy, 0, cy];
  const rx = [1, 0, 0, 0, cp, -sp, 0, sp, cp];
  const rz = [cr, -sr, 0, sr, cr, 0, 0, 0, 1];
  const m = mul(mul(ry, rx), rz);
  return [m[0], m[1], m[2], m[3], m[4], m[5], m[6], m[7], m[8]];
}

/** 3×3 row-major product. @param {number[]} a @param {number[]} b */
function mul(a, b) {
  const out = new Array(9).fill(0);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) out[i * 3 + j] += a[i * 3 + k] * b[k * 3 + j];
  return out;
}

/**
 * Wraps a local-frame kernel with the frame transform. Local kernels see the ray in local coordinates and write
 * the local normal and point to `local`; this converts them back.
 * @param {Frame} frame
 * @param {LocalKernel} local
 * @param {Cell | undefined} cell
 */
function framed(frame, local, cell) {
  const [o0, o1, o2] = frame.origin;
  const m = frame.axes ?? IDENTITY;
  const scratch = newHit();
  // A facet is the part of its surface inside its cell. The cell is tested root by root inside the kernel, so when the
  // nearer crossing lies outside the cell the farther one still counts.
  const inCell = cell ? (/** @type {number} */ px, /** @type {number} */ py, /** @type {number} */ pz) => {
    const wx = m[0] * px + m[1] * py + m[2] * pz + o0, wy = m[3] * px + m[4] * py + m[5] * pz + o1;
    if (cell.z1 !== undefined && m[6] * px + m[7] * py + m[8] * pz + o2 > cell.z1) return false;
    return wx >= cell.x0 && wx <= cell.x1 && wy >= cell.y0 && wy <= cell.y1;
  } : null;
  /** @type {CompiledSurface['intersect']} */
  return (ox, oy, oz, dx, dy, dz, tMin, hit, index) => {
    // A facet counts only inside its cell, so a ray that never crosses the prism above the cell cannot hit it.
    if (cell && !crossesCell(cell, ox, oy, oz, dx, dy, dz, tMin, hit.t)) return;
    const rx = ox - o0, ry = oy - o1, rz = oz - o2;
    // Local = Mᵀ · world, where the columns of M are the local axes.
    const lx = m[0] * rx + m[3] * ry + m[6] * rz, ly = m[1] * rx + m[4] * ry + m[7] * rz, lz = m[2] * rx + m[5] * ry + m[8] * rz;
    const ex = m[0] * dx + m[3] * dy + m[6] * dz, ey = m[1] * dx + m[4] * dy + m[7] * dz, ez = m[2] * dx + m[5] * dy + m[8] * dz;
    if (!local(lx, ly, lz, ex, ey, ez, tMin, hit.t, scratch, inCell)) return;
    const wx = m[0] * scratch.px + m[1] * scratch.py + m[2] * scratch.pz + o0;
    const wy = m[3] * scratch.px + m[4] * scratch.py + m[5] * scratch.pz + o1;
    const wz = m[6] * scratch.px + m[7] * scratch.py + m[8] * scratch.pz + o2;
    hit.t = scratch.t; hit.index = index;
    hit.px = wx; hit.py = wy; hit.pz = wz;
    hit.nx = m[0] * scratch.nx + m[1] * scratch.ny + m[2] * scratch.nz;
    hit.ny = m[3] * scratch.nx + m[4] * scratch.ny + m[5] * scratch.nz;
    hit.nz = m[6] * scratch.nx + m[7] * scratch.ny + m[8] * scratch.nz;
  };
}

/**
 * Whether a ray passes through the prism x0 ≤ x ≤ x1, y0 ≤ y ≤ y1, z ≤ z1 (lamp frame) for some t in (tMin, tMax).
 * @param {{ x0: number, x1: number, y0: number, y1: number, z1?: number }} cell @param {number} ox @param {number} oy
 * @param {number} oz @param {number} dx @param {number} dy @param {number} dz @param {number} tMin @param {number} tMax
 */
export function crossesCell(cell, ox, oy, oz, dx, dy, dz, tMin, tMax) {
  let lo = tMin, hi = tMax;
  if (cell.z1 !== undefined) {
    if (dz === 0) { if (oz > cell.z1) return false; }
    else if (dz > 0) hi = Math.min(hi, (cell.z1 - oz) / dz);
    else lo = Math.max(lo, (cell.z1 - oz) / dz);
  }
  if (dx === 0) { if (ox < cell.x0 || ox > cell.x1) return false; }
  else {
    const a = (cell.x0 - ox) / dx, b = (cell.x1 - ox) / dx;
    lo = Math.max(lo, Math.min(a, b)); hi = Math.min(hi, Math.max(a, b));
  }
  if (dy === 0) { if (oy < cell.y0 || oy > cell.y1) return false; }
  else {
    const a = (cell.y0 - oy) / dy, b = (cell.y1 - oy) / dy;
    lo = Math.max(lo, Math.min(a, b)); hi = Math.min(hi, Math.max(a, b));
  }
  return lo <= hi;
}

/** @param {Surface} surface @returns {CompiledSurface} */
export function compileSurface(surface) {
  const s = surface.shape;
  if (s.kind === 'quadric') return { surface, intersect: framed(surface.frame, quadricKernel(s), surface.cell) };
  if (s.kind === 'asphere') return { surface, intersect: framed(surface.frame, asphereKernel(s), surface.cell) };
  if (s.kind === 'annulus') {
    const r0 = s.inner * s.inner, r1 = s.outer * s.outer;
    return { surface, intersect: framed(surface.frame, planeKernel((x, y) => { const r = x * x + y * y; return r >= r0 && r <= r1; }), surface.cell) };
  }
  const pts = s.points, holes = s.holes ?? [];
  return { surface, intersect: framed(surface.frame, planeKernel((x, y) => insidePolygon(pts, x, y) && !holes.some(h => insidePolygon(h, x, y))), surface.cell) };
}

/**
 * A surface's intersection in its own frame: the nearest crossing in (tMin, tMax) that accept allows, written to out.
 * @typedef {(ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, tMin: number, tMax: number, out: Hit,
 *   accept: ((x: number, y: number, z: number) => boolean) | null) => boolean} LocalKernel
 */

/** @param {(x: number, y: number) => boolean} inside */
function planeKernel(inside) {
  /** @type {LocalKernel} */
  return (ox, oy, oz, dx, dy, dz, tMin, tMax, out, accept) => {
    if (dz === 0) return false;
    const t = -oz / dz;
    if (t <= tMin || t >= tMax) return false;
    const x = ox + t * dx, y = oy + t * dy;
    if (!inside(x, y) || (accept && !accept(x, y, 0))) return false;
    out.t = t; out.px = x; out.py = y; out.pz = 0; out.nx = 0; out.ny = 0; out.nz = 1;
    return true;
  };
}

/** Even–odd point-in-polygon test. @param {number[]} p @param {number} x @param {number} y */
export function insidePolygon(p, x, y) {
  let inside = false;
  for (let i = 0, j = p.length - 2; i < p.length; j = i, i += 2) {
    const xi = p[i], yi = p[i + 1], xj = p[j], yj = p[j + 1];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** The nearest root that passes every clip. @param {QuadricShape} s */
function quadricKernel(s) {
  const [ax, ay, az] = s.a, [bx, by, bz] = s.b, c = s.c, clips = s.clips, sign = s.frontSign;
  /** @param {number} x @param {number} y @param {number} z */
  const clipped = (x, y, z) => {
    for (const cl of clips) if (cl.n[0] * x + cl.n[1] * y + cl.n[2] * z > cl.d) return true;
    return false;
  };
  /** @type {LocalKernel} */
  return (ox, oy, oz, dx, dy, dz, tMin, tMax, out, accept) => {
    const qa = ax * dx * dx + ay * dy * dy + az * dz * dz;
    const qb = 2 * (ax * ox * dx + ay * oy * dy + az * oz * dz) + bx * dx + by * dy + bz * dz;
    const qc = ax * ox * ox + ay * oy * oy + az * oz * oz + bx * ox + by * oy + bz * oz + c;
    let t1, t2;
    if (Math.abs(qa) < 1e-14 * (Math.abs(qb) + 1e-300)) {
      if (qb === 0) return false;
      t1 = t2 = -qc / qb;
    } else {
      const disc = qb * qb - 4 * qa * qc;
      if (disc < 0) return false;
      const root = Math.sqrt(disc);
      const q = -0.5 * (qb + (qb >= 0 ? root : -root));
      t1 = q / qa; t2 = q !== 0 ? qc / q : t1;
      if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
    }
    for (const t of t1 === t2 ? [t1] : [t1, t2]) {
      if (t <= tMin || t >= tMax) continue;
      const x = ox + t * dx, y = oy + t * dy, z = oz + t * dz;
      if (clipped(x, y, z) || (accept && !accept(x, y, z))) continue;
      let nx = 2 * ax * x + bx, ny = 2 * ay * y + by, nz = 2 * az * z + bz;
      const len = Math.hypot(nx, ny, nz) * sign;
      nx /= len; ny /= len; nz /= len;
      out.t = t; out.px = x; out.py = y; out.pz = z; out.nx = nx; out.ny = ny; out.nz = nz;
      return true;
    }
    return false;
  };
}

/** Sag of an even asphere and its radial derivative. @param {AsphereShape} s @param {number} r */
export function asphereSag(s, r) {
  const c = s.curvature, k = s.conic, r2 = r * r;
  const root = Math.sqrt(Math.max(0, 1 - (1 + k) * c * c * r2));
  const sag = (c * r2) / (1 + root) + s.a4 * r2 * r2 + s.a6 * r2 * r2 * r2;
  // d/dr of the conic term is c r / √(1 − (1 + k) c² r²).
  const slope = root > 0 ? (c * r) / root + 4 * s.a4 * r2 * r + 6 * s.a6 * r2 * r2 * r : Infinity;
  return [sag, slope];
}

/** @param {AsphereShape} s */
function asphereKernel(s) {
  const ap2 = s.aperture * s.aperture;
  /** @type {LocalKernel} */
  return (ox, oy, oz, dx, dy, dz, tMin, tMax, out, accept) => {
    if (Math.abs(dz) < 1e-12) return false;
    // Start on the vertex plane and refine with Newton's method on g(t) = z(t) − sag(r(t)).
    let t = -oz / dz;
    for (let i = 0; i < 30; i++) {
      const x = ox + t * dx, y = oy + t * dy, z = oz + t * dz;
      const r = Math.hypot(x, y);
      const [sag, slope] = asphereSag(s, r);
      if (!Number.isFinite(slope)) return false;
      const g = z - sag;
      const dr = r > 1e-12 ? (x * dx + y * dy) / r : 0;
      const dg = dz - slope * dr;
      if (Math.abs(dg) < 1e-14) return false;
      const step = g / dg;
      t -= step;
      if (Math.abs(step) < 1e-11) break;
    }
    if (t <= tMin || t >= tMax) return false;
    const x = ox + t * dx, y = oy + t * dy, z = oz + t * dz;
    const r2 = x * x + y * y;
    if (r2 > ap2) return false;
    const r = Math.sqrt(r2);
    const [sag, slope] = asphereSag(s, r);
    if (Math.abs(z - sag) > 1e-7 || (accept && !accept(x, y, z))) return false;
    let nx = r > 1e-12 ? (-slope * x) / r : 0, ny = r > 1e-12 ? (-slope * y) / r : 0, nz = 1;
    const len = Math.hypot(nx, ny, nz);
    nx /= len; ny /= len; nz /= len;
    out.t = t; out.px = x; out.py = y; out.pz = z; out.nx = nx; out.ny = ny; out.nz = nz;
    return true;
  };
}
