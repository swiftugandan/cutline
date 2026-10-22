/** Which traffic side a passing beam is for, read from its own cut-off. The cut-off lies level on the side of oncoming
 * traffic and rises on the kerb side, so a lamp for right-hand traffic has its cut-off higher on the right (+H) and a
 * lamp for left-hand traffic higher on the left. The heights are found the way the R149 laboratory finds them: the
 * inflection of a vertical scan (Annex 6 §2.2), at the offsets of its linearity rule. See docs/PHYSICS.md. */

import { verticalScan } from './regulation/evaluate.js';
import { RULES } from './regulation/r149.js';

/** @import { Beam } from './regulation/evaluate.js' */

/**
 * @typedef {{ side: 'right' | 'left' | null, rise: number, reason: 'rise' | 'level' | 'no-cutoff' | 'coarse' }} TrafficReading
 *   side: the traffic side the beam is for, or null when the beam cannot tell. rise: how much higher the cut-off sits
 *   on the right than on the left, in degrees (negative when it is higher on the left; NaN without a cut-off on both
 *   sides). reason: 'rise' when the side is read; 'level' when the cut-off sits at the same height on both sides;
 *   'no-cutoff' when a scan finds no cut-off; 'coarse' when the file's angles are too far apart to place one.
 */

/** Offsets either side of V-V scanned for the cut-off: those of R149's linearity rule, on both sides. */
export const SCAN_H = RULES.linearity.h.map(Math.abs);
/** The scans reach from 5°D to 5°U, so a file not aimed in the laboratory still has its cut-off inside them. */
export const SCAN_V = /** @type {const} */ ([-5, 5]);
/** The gradient a scan must find to count as a cut-off: the least R149's horizontal aim accepts. */
export const MIN_G = RULES.horizontalAim.minG;
/** A difference in height below this is a level cut-off: R149's linearity rule lets a level part scatter as much. */
export const DEAD_BAND = RULES.linearity.maxSpread;
/** Vertical steps coarser than this, in degrees, cannot place a cut-off well enough to tell the sides apart. */
export const MAX_STEP = 0.5;

/**
 * Reads the traffic side of a passing beam as it is, before any aim.
 * @param {Beam} beam @param {number} verticalStep the file's finest vertical step, in degrees
 * @returns {TrafficReading}
 */
export function readTrafficSide(beam, verticalStep) {
  if (verticalStep > MAX_STEP) return { side: null, rise: NaN, reason: 'coarse' };
  const scans = SCAN_H.flatMap(h => [verticalScan(beam, -h, SCAN_V[0], SCAN_V[1]), verticalScan(beam, h, SCAN_V[0], SCAN_V[1])]);
  if (!scans.every(s => s.g >= MIN_G && Number.isFinite(s.inflection))) return { side: null, rise: NaN, reason: 'no-cutoff' };
  const mean = (/** @type {number} */ k) => scans.filter((_, i) => i % 2 === k).reduce((a, s) => a + s.inflection, 0) / SCAN_H.length;
  const rise = mean(1) - mean(0);
  if (Math.abs(rise) <= DEAD_BAND) return { side: null, rise, reason: 'level' };
  return { side: rise > 0 ? 'right' : 'left', rise, reason: 'rise' };
}
