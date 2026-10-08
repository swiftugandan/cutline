/** Photometry from far-field histograms: the solid angle of a bin. Intensity at a direction is read through the
 * regulation's receiver by the Beam class in regulation/evaluate.js. */

/** @import { AngleConvention } from './types.js' */

const RAD = Math.PI / 180;

/**
 * Solid angle (sr) of a bin [h0, h1] × [v0, v1] in degrees. Exact on the goniometer convention, (h1 − h0)(sin v1 − sin v0);
 * on the screen convention, by the midpoint rule on a 4 × 4 sub-grid.
 * @param {number} h0 @param {number} h1 @param {number} v0 @param {number} v1 @param {AngleConvention} convention
 */
export function binSolidAngle(h0, h1, v0, v1, convention) {
  if (convention === 'goniometer') return (h1 - h0) * RAD * (Math.sin(v1 * RAD) - Math.sin(v0 * RAD));
  const n = 4, dh = (h1 - h0) / n, dv = (v1 - v0) / n;
  let sum = 0;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    // Direction ∝ (tan h, tan v, 1); dΩ = sec²h sec²v / (1 + tan²h + tan²v)^(3/2) dh dv.
    const th = Math.tan((h0 + (i + 0.5) * dh) * RAD), tv = Math.tan((v0 + (j + 0.5) * dv) * RAD);
    sum += ((1 + th * th) * (1 + tv * tv)) / (1 + th * th + tv * tv) ** 1.5;
  }
  return sum * dh * RAD * dv * RAD;
}
