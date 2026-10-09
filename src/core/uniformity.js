/** Uniformity of a light distribution: where a direction is darker (or brighter) than its surroundings on both sides,
 * and the dark patches where it falls well below them. A beam is meant to change: it falls steeply at the cut-off and
 * gently towards its edges. Such a change is darker on one side and brighter on the other, so it is not counted. A dip
 * is darker than both its neighbours along a line through it: stripes from facet joins, gaps between LED images,
 * shadows of a shield or a bezel. See docs/PHYSICS.md, "Uniformity". */

/** @import { GridSpec } from './types.js' */

/**
 * @typedef {{ h: number, v: number, ratio: number, area: number, h0: number, h1: number, v0: number, v1: number, value: number, around: number }} Dip
 *   A dark patch: where its darkest point is, its intensity there over its surroundings (ratio), its area in square
 *   degrees and its bounding box, in the grid's own angles.
 */

/**
 * Each cell against its surroundings. Four strips flank the cell: along its row to the left and right, reaching rh
 * cells, and along its column above and below, reaching rv cells. Each strip leaves out the third of its reach nearest
 * the cell, so a patch's own flanks do not count as its surroundings, and is one cell thick, so a steep edge parallel
 * to it, such as the cut-off, cannot leak into it. A cell darker than both boxes along one
 * axis is a valley, and its ratio is its value over the darker of the two, the smallest such ratio of the two axes. A
 * cell brighter than both boxes along an axis is a ridge, with its value over the brighter box. Any other cell sits
 * on a slope and reads 1. Cells whose surroundings are all darker than `floor` read NaN: in the dark beyond the beam
 * the comparison means nothing.
 * @param {Float64Array} values row-major, nv rows of nh @param {number} nh @param {number} nv
 * @param {number} rh @param {number} rv reach in cells, across and up @param {number} floor
 * @returns {Float64Array}
 */
export function localRatio(values, nh, nv, rh, rv, floor) {
  const w = nh + 1;
  const sum = new Float64Array(w * (nv + 1));
  for (let r = 0; r < nv; r++) {
    let row = 0;
    for (let c = 0; c < nh; c++) {
      const x = values[r * nh + c];
      row += Number.isFinite(x) ? x : 0;
      sum[(r + 1) * w + c + 1] = sum[r * w + c + 1] + row;
    }
  }
  /** Mean of the cells in columns c0..c1 and rows r0..r1, clipped to the grid; NaN when nothing is left. */
  const mean = (/** @type {number} */ c0, /** @type {number} */ c1, /** @type {number} */ r0, /** @type {number} */ r1) => {
    c0 = Math.max(0, c0); c1 = Math.min(nh - 1, c1); r0 = Math.max(0, r0); r1 = Math.min(nv - 1, r1);
    if (c1 < c0 || r1 < r0) return NaN;
    return (sum[(r1 + 1) * w + c1 + 1] - sum[r0 * w + c1 + 1] - sum[(r1 + 1) * w + c0] + sum[r0 * w + c0]) / ((r1 - r0 + 1) * (c1 - c0 + 1));
  };
  const out = new Float64Array(nh * nv);
  for (let r = 0; r < nv; r++) for (let c = 0; c < nh; c++) {
    const x = values[r * nh + c];
    const gh = Math.floor(rh / 3) + 1, gv = Math.floor(rv / 3) + 1;
    const left = mean(c - rh, c - gh, r, r), right = mean(c + gh, c + rh, r, r);
    const down = mean(c, c, r - rv, r - gv), up = mean(c, c, r + gv, r + rv);
    const brightest = Math.max(...[left, right, down, up].filter(Number.isFinite));
    if (!Number.isFinite(x) || !(brightest >= floor)) { out[r * nh + c] = NaN; continue; }
    let valley = Infinity, ridge = 0;
    for (const [a, b] of [[left, right], [down, up]]) {
      if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
      const lo = Math.min(a, b), hi = Math.max(a, b);
      if (x < lo && lo > 0) valley = Math.min(valley, x / lo);
      else if (x > hi && hi > 0) ridge = Math.max(ridge, x / hi);
    }
    out[r * nh + c] = valley < Infinity ? valley : ridge > 0 ? ridge : 1;
  }
  return out;
}

/**
 * Dark patches: connected cells whose ratio to their surroundings is below 1 − depth. The patches are sorted with the
 * deepest first.
 * @param {Float64Array} ratio from localRatio @param {Float64Array} values @param {GridSpec} spec
 * @param {{ depth: number, minCells?: number, limit?: number }} options
 * @returns {Dip[]}
 */
export function findDips(ratio, values, spec, { depth, minCells = 4, limit = 30 }) {
  const nh = Math.round((spec.hMax - spec.hMin) / spec.step), nv = Math.round((spec.vMax - spec.vMin) / spec.vStep);
  const threshold = 1 - depth;
  const seen = new Uint8Array(nh * nv);
  /** @type {Dip[]} */
  const dips = [];
  const stack = [];
  for (let start = 0; start < nh * nv; start++) {
    if (seen[start] || !(ratio[start] < threshold)) continue;
    stack.push(start); seen[start] = 1;
    let cells = 0, worst = start, c0 = nh, c1 = 0, r0 = nv, r1 = 0;
    while (stack.length) {
      const i = /** @type {number} */ (stack.pop());
      cells++;
      if (ratio[i] < ratio[worst]) worst = i;
      const r = Math.floor(i / nh), c = i % nh;
      c0 = Math.min(c0, c); c1 = Math.max(c1, c); r0 = Math.min(r0, r); r1 = Math.max(r1, r);
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const cc = c + dc, rr = r + dr;
        if (cc < 0 || cc >= nh || rr < 0 || rr >= nv) continue;
        const j = rr * nh + cc;
        if (!seen[j] && ratio[j] < threshold) { seen[j] = 1; stack.push(j); }
      }
    }
    if (cells < minCells) continue;
    const wr = Math.floor(worst / nh), wc = worst % nh;
    dips.push({
      h: spec.hMin + (wc + 0.5) * spec.step, v: spec.vMin + (wr + 0.5) * spec.vStep, ratio: ratio[worst], area: cells * spec.step * spec.vStep,
      h0: spec.hMin + c0 * spec.step, h1: spec.hMin + (c1 + 1) * spec.step, v0: spec.vMin + r0 * spec.vStep, v1: spec.vMin + (r1 + 1) * spec.vStep,
      value: values[worst], around: values[worst] / ratio[worst],
    });
  }
  dips.sort((a, b) => a.ratio - b.ratio || b.area - a.area);
  return dips.slice(0, limit);
}
