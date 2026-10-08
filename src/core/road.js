/** Light on the road from a pair of headlamps, seen from above. At every point of the road Cutline gives the
 * illuminance on a target there facing the car, I/d²: the measure behind a headlamp's range, the distance at which it
 * still lights an obstacle or a pedestrian to 1 or 3 lx. (The flat road surface itself receives far less, because the
 * light grazes it.) Mounting height and aim come from the design; they are installation choices governed by UN
 * Regulation No. 48, not part of the lamp's own approval. */

/** @import { Design } from './model.js' */

/**
 * @typedef {{ xMin: number, xMax: number, zMin: number, zMax: number, step: number }} RoadGrid  metres
 * @typedef {{ grid: RoadGrid, nx: number, nz: number, lux: Float64Array, reach: Record<number, number>, width3lx20m: number }} RoadResult
 */

export const ROAD_GRID = /** @type {RoadGrid} */ ({ xMin: -20, xMax: 20, zMin: 0, zMax: 140, step: 0.25 });
/** Lateral position of each lamp, metres from the vehicle's centre line. */
export const LAMP_SPACING = 0.7;
export const ISOLUX = [1, 3, 10, 30, 50];

/**
 * Lux on a target facing the car at each road point, from both lamps.
 * @param {Design} design @param {(h: number, v: number) => number} candela intensity of one lamp at (H, V) in degrees
 * @param {RoadGrid} [grid]
 * @returns {RoadResult}
 */
export function roadIlluminance(design, candela, grid = ROAD_GRID) {
  const nx = Math.round((grid.xMax - grid.xMin) / grid.step) + 1, nz = Math.round((grid.zMax - grid.zMin) / grid.step) + 1;
  const lux = new Float64Array(nx * nz);
  const height = design.mounting.height;
  // The whole beam is tipped down by the aim: a road point at V′ below the lamp is seen at V = V′ + aim in the lamp frame.
  const aim = (Math.atan(design.mounting.aimPercent / 100) * 180) / Math.PI;
  for (let iz = 0; iz < nz; iz++) {
    const z = grid.zMin + iz * grid.step;
    if (z < 1) continue;
    for (let ix = 0; ix < nx; ix++) {
      const x = grid.xMin + ix * grid.step;
      let e = 0;
      for (const lampX of [-LAMP_SPACING, LAMP_SPACING]) {
        const dx = x - lampX;
        const d = Math.hypot(dx, height, z);
        const h = (Math.atan(dx / z) * 180) / Math.PI, v = (Math.atan(-height / z) * 180) / Math.PI + aim;
        const i = candela(h, v);
        if (Number.isFinite(i) && i > 0) e += i / (d * d);
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
  const row = Math.round((20 - grid.zMin) / grid.step);
  let left = 0, right = 0;
  for (let ix = 0; ix < nx; ix++) if (lux[row * nx + ix] >= 3) { const x = grid.xMin + ix * grid.step; left = Math.min(left, x); right = Math.max(right, x); }
  return { grid, nx, nz, lux, reach, width3lx20m: right - left };
}
