/** Iso-lines on a regular grid by marching squares, returned as line segments in grid coordinates. */

/**
 * @param {Float64Array | number[]} values row-major, nv rows of nh columns
 * @param {number} nh @param {number} nv @param {number} level
 * @returns {number[]} flat [x1, y1, x2, y2, …] in cell units, where (0, 0) is the centre of the first value
 */
export function isoSegments(values, nh, nv, level) {
  const out = [];
  /** @param {number} a @param {number} b */
  const t = (a, b) => (level - a) / (b - a);
  for (let j = 0; j < nv - 1; j++) for (let i = 0; i < nh - 1; i++) {
    const a = values[j * nh + i], b = values[j * nh + i + 1], c = values[(j + 1) * nh + i + 1], d = values[(j + 1) * nh + i];
    const code = (a >= level ? 1 : 0) | (b >= level ? 2 : 0) | (c >= level ? 4 : 0) | (d >= level ? 8 : 0);
    if (code === 0 || code === 15) continue;
    // Edge crossings: bottom (a–b), right (b–c), top (d–c), left (a–d).
    const bottom = [i + t(a, b), j], right = [i + 1, j + t(b, c)], top = [i + t(d, c), j + 1], left = [i, j + t(a, d)];
    /** @type {number[][][]} */
    const pairs = ({ 1: [[left, bottom]], 2: [[bottom, right]], 3: [[left, right]], 4: [[right, top]], 5: [[left, top], [bottom, right]], 6: [[bottom, top]], 7: [[left, top]],
      8: [[top, left]], 9: [[top, bottom]], 10: [[top, right], [left, bottom]], 11: [[top, right]], 12: [[right, left]], 13: [[right, bottom]], 14: [[bottom, left]] })[code] ?? [];
    for (const [p, q] of pairs) out.push(p[0], p[1], q[0], q[1]);
  }
  return out;
}
