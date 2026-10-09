/** A bounding volume hierarchy over a triangle mesh, for casting rays against a vehicle: picking a point on the model
 * and testing whether bodywork blocks the view of a lamp. Nodes split at the median of their widest axis, down to a
 * few triangles per leaf. */

/** @import { Mesh } from './mesh.js' */

/**
 * @typedef {{ t: number, triangle: number, normal: [number, number, number] }} Hit
 *   t is the distance along the ray's unit direction; normal is the triangle's geometric normal, facing the ray.
 */

const LEAF = 4;

export class Bvh {
  /** @param {Mesh} mesh */
  constructor(mesh) {
    this.positions = mesh.positions;
    const n = mesh.triangles;
    /** Triangle order, rearranged so each node's triangles are contiguous. */
    this.order = new Uint32Array(n);
    const centroids = new Float32Array(n * 3), boxes = new Float32Array(n * 6);
    const p = mesh.positions;
    for (let t = 0; t < n; t++) {
      this.order[t] = t;
      for (let a = 0; a < 3; a++) {
        const v0 = p[t * 9 + a], v1 = p[t * 9 + 3 + a], v2 = p[t * 9 + 6 + a];
        boxes[t * 6 + a] = Math.min(v0, v1, v2);
        boxes[t * 6 + 3 + a] = Math.max(v0, v1, v2);
        centroids[t * 3 + a] = (v0 + v1 + v2) / 3;
      }
    }
    // Nodes: [minX, minY, minZ, maxX, maxY, maxZ] boxes, and per node either two children or a range of triangles.
    // Median splits leave at least two triangles in a leaf, so there are at most n/2 leaves and n nodes.
    const capacity = n + 2;
    this.bounds = new Float32Array(capacity * 6);
    /** For an inner node, the index of its first child (the second follows it); for a leaf, −1. */
    this.child = new Int32Array(capacity);
    this.start = new Uint32Array(capacity);
    this.count = new Uint32Array(capacity);
    let nodes = 1;
    /** @param {number} node @param {number} start @param {number} end */
    const build = (node, start, end) => {
      const b = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
      const c = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
      for (let i = start; i < end; i++) {
        const t = this.order[i];
        for (let a = 0; a < 3; a++) {
          b[a] = Math.min(b[a], boxes[t * 6 + a]); b[a + 3] = Math.max(b[a + 3], boxes[t * 6 + 3 + a]);
          c[a] = Math.min(c[a], centroids[t * 3 + a]); c[a + 3] = Math.max(c[a + 3], centroids[t * 3 + a]);
        }
      }
      this.bounds.set(b, node * 6);
      const extent = [c[3] - c[0], c[4] - c[1], c[5] - c[2]];
      const axis = extent[0] >= extent[1] && extent[0] >= extent[2] ? 0 : extent[1] >= extent[2] ? 1 : 2;
      if (end - start <= LEAF || extent[axis] <= 0) {
        this.child[node] = -1; this.start[node] = start; this.count[node] = end - start;
        return;
      }
      const mid = (start + end) >> 1;
      select(this.order, start, end, mid, i => centroids[i * 3 + axis]);
      const left = nodes; nodes += 2;
      this.child[node] = left;
      build(left, start, mid);
      build(left + 1, mid, end);
    };
    if (n) build(0, 0, n); else this.child[0] = -1;
    this.nodes = nodes;
  }

  /**
   * The nearest triangle a ray meets beyond tMin and before tMax, or null.
   * @param {[number, number, number]} o origin @param {[number, number, number]} d unit direction
   * @param {number} [tMin] @param {number} [tMax]
   * @returns {Hit | null}
   */
  intersect(o, d, tMin = 0, tMax = Infinity) {
    return this.trace(o, d, tMin, tMax, false);
  }

  /** Whether anything blocks a ray between tMin and tMax. @param {[number, number, number]} o @param {[number, number, number]} d @param {number} [tMin] @param {number} [tMax] */
  blocked(o, d, tMin = 0, tMax = Infinity) {
    return this.trace(o, d, tMin, tMax, true) !== null;
  }

  /**
   * @param {[number, number, number]} o @param {[number, number, number]} d @param {number} tMin @param {number} tMax @param {boolean} any
   * @returns {Hit | null}
   */
  trace(o, d, tMin, tMax, any) {
    const inv = [1 / d[0], 1 / d[1], 1 / d[2]];
    const stack = [0];
    let best = tMax, bestTri = -1;
    const p = this.positions;
    while (stack.length) {
      const node = /** @type {number} */ (stack.pop());
      if (!this.hitsBox(node, o, inv, tMin, best)) continue;
      const first = this.child[node];
      if (first >= 0) { stack.push(first, first + 1); continue; }
      for (let i = this.start[node], end = i + this.count[node]; i < end; i++) {
        const tri = this.order[i], k = tri * 9;
        const t = rayTriangle(o, d, p[k], p[k + 1], p[k + 2], p[k + 3], p[k + 4], p[k + 5], p[k + 6], p[k + 7], p[k + 8]);
        if (t > tMin && t < best) {
          best = t; bestTri = tri;
          if (any) return { t, triangle: tri, normal: [0, 0, 0] };
        }
      }
    }
    if (bestTri < 0) return null;
    const k = bestTri * 9;
    const e1 = [p[k + 3] - p[k], p[k + 4] - p[k + 1], p[k + 5] - p[k + 2]], e2 = [p[k + 6] - p[k], p[k + 7] - p[k + 1], p[k + 8] - p[k + 2]];
    let nx = e1[1] * e2[2] - e1[2] * e2[1], ny = e1[2] * e2[0] - e1[0] * e2[2], nz = e1[0] * e2[1] - e1[1] * e2[0];
    const len = Math.hypot(nx, ny, nz) || 1;
    nx /= len; ny /= len; nz /= len;
    if (nx * d[0] + ny * d[1] + nz * d[2] > 0) { nx = -nx; ny = -ny; nz = -nz; }
    return { t: best, triangle: bestTri, normal: [nx, ny, nz] };
  }

  /** @param {number} node @param {[number, number, number]} o @param {number[]} inv @param {number} tMin @param {number} tMax */
  hitsBox(node, o, inv, tMin, tMax) {
    const b = this.bounds, k = node * 6;
    let lo = tMin, hi = tMax;
    for (let a = 0; a < 3; a++) {
      let t0 = (b[k + a] - o[a]) * inv[a], t1 = (b[k + 3 + a] - o[a]) * inv[a];
      if (t0 > t1) { const s = t0; t0 = t1; t1 = s; }
      if (t0 > lo) lo = t0;
      if (t1 < hi) hi = t1;
      if (lo > hi) return false;
    }
    return true;
  }
}

/**
 * Distance along a ray to a triangle (Möller–Trumbore), or −1 when it misses.
 * @param {number[]} o @param {number[]} d
 * @param {number} ax @param {number} ay @param {number} az @param {number} bx @param {number} by @param {number} bz @param {number} cx @param {number} cy @param {number} cz
 */
export function rayTriangle(o, d, ax, ay, az, bx, by, bz, cx, cy, cz) {
  const e1x = bx - ax, e1y = by - ay, e1z = bz - az, e2x = cx - ax, e2y = cy - ay, e2z = cz - az;
  const px = d[1] * e2z - d[2] * e2y, py = d[2] * e2x - d[0] * e2z, pz = d[0] * e2y - d[1] * e2x;
  const det = e1x * px + e1y * py + e1z * pz;
  if (Math.abs(det) < 1e-12) return -1;
  const inv = 1 / det;
  const tx = o[0] - ax, ty = o[1] - ay, tz = o[2] - az;
  const u = (tx * px + ty * py + tz * pz) * inv;
  if (u < 0 || u > 1) return -1;
  const qx = ty * e1z - tz * e1y, qy = tz * e1x - tx * e1z, qz = tx * e1y - ty * e1x;
  const v = (d[0] * qx + d[1] * qy + d[2] * qz) * inv;
  if (v < 0 || u + v > 1) return -1;
  return (e2x * qx + e2y * qy + e2z * qz) * inv;
}

/**
 * Rearranges order[start..end) so the element at k is where a full sort by key would put it, with smaller keys
 * before it and larger after (quickselect).
 * @param {Uint32Array} order @param {number} start @param {number} end @param {number} k @param {(i: number) => number} key
 */
function select(order, start, end, k, key) {
  let lo = start, hi = end - 1;
  while (hi > lo) {
    const pivot = key(order[(lo + hi) >> 1]);
    let i = lo, j = hi;
    while (i <= j) {
      while (key(order[i]) < pivot) i++;
      while (key(order[j]) > pivot) j--;
      if (i <= j) { const s = order[i]; order[i] = order[j]; order[j] = s; i++; j--; }
    }
    if (k <= j) hi = j; else if (k >= i) lo = i; else return;
  }
}
