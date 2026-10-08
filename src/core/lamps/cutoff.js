/** The intended cut-off line in the far field, shared by both lamp types. */

/** @import { Design } from '../model.js' */

/**
 * Vertical angle (degrees) of the intended cut-off at horizontal angle h. Right-hand traffic rises towards +h (the
 * kerb on the right); left-hand traffic mirrors it.
 * @param {Design} design @param {number} h
 */
export function cutoffAt(design, h) {
  const c = design.cutoff;
  const across = design.traffic === 'right' ? h - c.elbowDeg : -h - c.elbowDeg;
  const rise = Math.min(c.riseHeightDeg, Math.max(0, across) * Math.tan((c.riseDeg * Math.PI) / 180));
  return c.verticalDeg + rise;
}
