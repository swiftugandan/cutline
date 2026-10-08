/** Turns a design into a traceable lamp, and fixes the far-field grids every trace uses. */

import { buildProjector } from './lamps/projector.js';
import { buildReflector } from './lamps/reflector.js';

/** @import { Design } from './model.js' */
/** @import { LampScene, GridSpec, AngleConvention, TraceOptions } from './types.js' */

/** The far-field convention used for binning and for the regulation's test points. See docs/PHYSICS.md. */
export const CONVENTION = /** @type {AngleConvention} */ ('goniometer');

/**
 * Two grids: a wide one for zones and the road view, and a fine one around the cut-off, where the regulation reads
 * the gradient in 0.1° steps.
 * @type {GridSpec[]}
 */
export const GRIDS = [
  { hMin: -60, hMax: 60, vMin: -30, vMax: 30, step: 0.5, vStep: 0.25 },
  { hMin: -20, hMax: 20, vMin: -6, vMax: 5, step: 0.05, vStep: 0.05 },
];

/** @param {Design} design @returns {LampScene} */
export function buildLamp(design) {
  return design.optics.type === 'projector' ? buildProjector(design) : buildReflector(design);
}

/** @param {Design} design @param {{ rays?: number, seed?: number, pathCount?: number }} [overrides] @returns {TraceOptions} */
export function traceOptions(design, overrides = {}) {
  return {
    rays: overrides.rays ?? design.simulation.rays,
    seed: overrides.seed ?? design.simulation.seed,
    convention: CONVENTION,
    grids: GRIDS,
    pathCount: overrides.pathCount ?? 0,
  };
}
