/** Light on the road from headlamps, seen from above. Two quantities are offered:
 * - on a **target** facing the car at each road point, I/d²: the measure behind a headlamp's range, the distance at
 *   which it still lights an obstacle or a pedestrian to 1 or 3 lx;
 * - on the **road** surface itself (horizontal illuminance), I·cos θ / d² = I·height / d³, which is far smaller
 *   because the light grazes the road, and is what an isolux diagram of the road ("isoroad") shows.
 * Mounting height, spacing and aim are installation choices governed by UN Regulation No. 48, not part of the lamp's
 * own approval. See docs/PHYSICS.md, "The road". */

/** @import { Design } from './model.js' */

/**
 * @typedef {{ xMin: number, xMax: number, zMin: number, zMax: number, step: number }} RoadGrid  metres
 * @typedef {{ height: number, aimPercent: number, spacing: number, lamps: 'pair' | 'left' | 'right', surface: 'target' | 'road', length: number, width: number }} RoadSetup
 *   height: lamp above the road (m); aimPercent: the downward inclination of the beam (%); spacing: between the two
 *   lamps' centres (m); lamps: both, or only the one on that side; length and width of the road shown (m).
 * @typedef {{ grid: RoadGrid, nx: number, nz: number, lux: Float64Array, reach: Record<number, number>, width3lx20m: number, surface: 'target' | 'road' }} RoadResult
 */

export const ROAD_GRID = /** @type {RoadGrid} */ ({ xMin: -20, xMax: 20, zMin: 0, zMax: 140, step: 0.25 });
/** Distance between the two lamps' centres in the design workspace, metres. */
export const LAMP_SPACING = 1.4;
export const ISOLUX = [1, 3, 10, 30, 50];

/** The road the design workspace shows: a pair of lamps, lux on a target. @param {Design} design @returns {RoadSetup} */
export function designRoad(design) {
  return { height: design.mounting.height, aimPercent: design.mounting.aimPercent, spacing: LAMP_SPACING, lamps: 'pair', surface: 'target', length: ROAD_GRID.zMax, width: ROAD_GRID.xMax - ROAD_GRID.xMin };
}

/** The grid for a road setup: 0.25 m steps, or coarser on a very large road. @param {RoadSetup} setup @returns {RoadGrid} */
export function roadGrid(setup) {
  const step = setup.length * setup.width > 40000 ? 0.5 : 0.25;
  return { xMin: -setup.width / 2, xMax: setup.width / 2, zMin: 0, zMax: setup.length, step };
}

/**
 * Lux at each road point, from one lamp or both.
 * @param {RoadSetup} setup @param {(h: number, v: number) => number} candela intensity of one lamp at (H, V) in degrees
 * @param {RoadGrid} [grid]
 * @returns {RoadResult}
 */
export function roadIlluminance(setup, candela, grid = roadGrid(setup)) {
  const nx = Math.round((grid.xMax - grid.xMin) / grid.step) + 1, nz = Math.round((grid.zMax - grid.zMin) / grid.step) + 1;
  const lux = new Float64Array(nx * nz);
  const height = setup.height;
  // The whole beam is tipped down by the aim: a road point at V′ below the lamp is seen at V = V′ + aim in the lamp frame.
  const aim = (Math.atan(setup.aimPercent / 100) * 180) / Math.PI;
  const half = setup.spacing / 2;
  const lamps = setup.lamps === 'pair' ? [-half, half] : setup.lamps === 'left' ? [-half] : [half];
  for (let iz = 0; iz < nz; iz++) {
    const z = grid.zMin + iz * grid.step;
    if (z < 1) continue;
    for (let ix = 0; ix < nx; ix++) {
      const x = grid.xMin + ix * grid.step;
      let e = 0;
      for (const lampX of lamps) {
        const dx = x - lampX;
        const d = Math.hypot(dx, height, z);
        const h = (Math.atan(dx / z) * 180) / Math.PI, v = (Math.atan(-height / z) * 180) / Math.PI + aim;
        const i = candela(h, v);
        if (Number.isFinite(i) && i > 0) e += setup.surface === 'road' ? (i * height) / (d * d * d) : i / (d * d);
      }
      lux[iz * nx + ix] = e;
    }
  }
  /** @type {Record<number, number>} */
  const reach = {};
  const centre = Math.round((0 - grid.xMin) / grid.step);
  for (const level of ISOLUX) {
    let far = 0;
    for (let iz = 0; iz < nz; iz++) if (lux[iz * nx + centre] >= level) far = grid.zMin + iz * grid.step;
    reach[level] = far;
  }
  const row = Math.round((Math.min(20, grid.zMax) - grid.zMin) / grid.step);
  let left = 0, right = 0;
  for (let ix = 0; ix < nx; ix++) if (lux[row * nx + ix] >= 3) { const x = grid.xMin + ix * grid.step; left = Math.min(left, x); right = Math.max(right, x); }
  return { grid, nx, nz, lux, reach, width3lx20m: right - left, surface: setup.surface };
}
