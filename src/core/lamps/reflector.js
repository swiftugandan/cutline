/** LED multi-facet reflector (MFR): an upward-facing LED near the focus of a faceted paraboloid. Each facet is the
 * paraboloid turned about its focus, which turns that facet's beam by exactly the same angle, plus a little extra
 * sideways curvature that widens it. Facets are aimed so that every image of the chip sits under the cut-off. */

import { paraboloidReflector } from '../optics.js';
import { rotation } from '../geometry.js';
import { cutoffAt } from './cutoff.js';
import { isPassing } from '../model.js';
import { LED_UP } from './projector.js';

/** @import { LampScene, Surface } from '../types.js' */
/** @import { Design, ReflectorOptics } from '../model.js' */

/**
 * @typedef {{ column: number, row: number, cell: { x0: number, x1: number, y0: number, y1: number }, yaw: number, pitch: number, roll: number,
 *   spreadDeg: number, distance: number, overhead: boolean }} Facet
 *   roll turns the facet about its beam so its sideways smear runs along a rising cut-off; spreadDeg is the width of
 *   that smear; overhead marks a thin strip at the bottom of a central facet, aimed above the cut-off for signs.
 */

/**
 * Aims for every facet. Columns fan out across ±spread; on a passing beam the kerb-side columns follow the rising
 * part of the cut-off. Each facet is pitched down so the highest image of the chip — found by reflecting its four
 * corners at the facet's centre — sits the margin below the cut-off, whatever the chip's size and offset.
 * @param {Design} design @param {ReflectorOptics} o
 * @returns {Facet[]}
 */
export function facetAims(design, o) {
  const facets = [];
  const kerb = design.traffic === 'right' ? 1 : -1;
  for (let col = 0; col < o.columns; col++) {
    const x0 = -o.width / 2 + (o.width * col) / o.columns, x1 = x0 + o.width / o.columns;
    // The kick columns sit at the kerb-side end and aim along the rising cut-off; the other columns fan out evenly
    // across the whole spread on both sides.
    const fromKerb = kerb > 0 ? o.columns - 1 - col : col;
    const kicks = isPassing(design) ? Math.min(o.kickColumns, o.columns - 1) : 0;
    const kick = fromKerb < kicks;
    const fan = o.columns - kicks, j = kerb > 0 ? col : col - kicks;
    // A fan concentration above 1 gathers the columns towards the centre, where the hot spot is.
    const u = fan === 1 ? 0 : (2 * j) / (fan - 1) - 1;
    let yaw = Math.sign(u) * Math.abs(u) ** o.fanPower * o.spreadDeg;
    let roll = 0, spread = o.facetSpreadDeg, cut = lowestCutoff(design, yaw, spread);
    if (kick) {
      // Kick facets light the rising part of the cut-off: rolled by the rise angle so their smear runs along it, and
      // spaced so every smear stays between the elbow and the top of the rise.
      const rise = (design.cutoff.riseDeg * Math.PI) / 180;
      const span = rise > 0 ? design.cutoff.riseHeightDeg / Math.tan(rise) : 0;
      spread = Math.min(o.facetSpreadDeg, span / kicks);
      const along = ((kicks - fromKerb - 0.5) / kicks) * span;
      yaw = kerb * (design.cutoff.elbowDeg * kerb + along);
      roll = kerb * design.cutoff.riseDeg;
      cut = cutoffAt(design, yaw);
    }
    // Columns aimed wide drop lower, lighting the road edges close to the car.
    const wing = kick ? 0 : o.wingDropDeg * Math.abs(u);
    // On a passing beam, a thin strip at the bottom of the central columns lights overhead signs. It sits nearest the
    // LED, where images are large and faint, which suits the little light signs need; it aims up and fans out a little.
    const sign = isPassing(design) && o.overheadHeight > 0 && Math.abs(col - (o.columns - 1) / 2) < o.overheadFacets / 2;
    for (let row = 0; row < o.rows; row++) {
      let y0 = (o.height * row) / o.rows;
      const y1 = (o.height * (row + 1)) / o.rows;
      const xc = (x0 + x1) / 2;
      if (sign && row === 0) {
        const ys = o.overheadHeight / 2;
        // The sign columns share out ±SIGN_FAN between them, reaching P at 7° and the S50 points at 8°.
        const k = (col - (o.columns - 1) / 2) / Math.max(0.5, (o.overheadFacets - 1) / 2);
        facets.push({ column: col, row, cell: { x0, x1, y0, y1: o.overheadHeight }, yaw: Math.max(-1, Math.min(1, k)) * SIGN_FAN, pitch: -o.overheadDeg, roll: 0, spreadDeg: o.facetSpreadDeg, distance: o.focalLength + (xc * xc + ys * ys) / (4 * o.focalLength), overhead: true });
        y0 = o.overheadHeight;
      }
      const yc = (y0 + y1) / 2;
      const distance = o.focalLength + (xc * xc + yc * yc) / (4 * o.focalLength);
      // Lower rows sit nearer the LED and form larger images; they aim lower, into the foreground and spread, while the
      // top row's small images build the hot spot under the cut-off.
      const rowDrop = o.rows > 1 ? (o.rowDropDeg * (o.rows - 1 - row)) / (o.rows - 1) : 0;
      // A driving beam aims its images onto the axis instead of under a cut-off.
      const pitch = isPassing(design) ? -cut + chipImageTop(design, o.focalLength, xc, yc) + o.dropDeg + wing + rowDrop : (row - (o.rows - 1) / 2) * 0.5 + wing;
      facets.push({ column: col, row, cell: { x0, x1, y0, y1 }, yaw, pitch, roll, spreadDeg: spread, distance, overhead: false });
    }
  }
  return facets;
}

/** Half-width of the sign-light strip's fan, degrees. */
const SIGN_FAN = 8;

/**
 * The lowest the cut-off reaches across a facet's sideways smear. A facet pitched by this never throws light above
 * the flat part of the cut-off, even when its smear crosses the elbow.
 * @param {Design} design @param {number} yaw @param {number} spreadDeg
 */
export function lowestCutoff(design, yaw, spreadDeg) {
  let low = Infinity;
  for (let h = yaw - spreadDeg / 2; h <= yaw + spreadDeg / 2 + 1e-9; h += 0.25) low = Math.min(low, cutoffAt(design, h));
  return Math.min(low, cutoffAt(design, yaw + spreadDeg / 2));
}

/**
 * How far (degrees) the chip's image reaches above the beam direction of an unturned facet whose centre is (x, y) on
 * the paraboloid: the highest of the chip's four corners, reflected at that point.
 * @param {Design} design @param {number} f @param {number} x @param {number} y
 */
export function chipImageTop(design, f, x, y) {
  const z = (x * x + y * y) / (4 * f) - f;
  let nx = -x / (2 * f), ny = -y / (2 * f), nz = 1;
  const nl = Math.hypot(nx, ny, nz); nx /= nl; ny /= nl; nz /= nl;
  const { width: w, height: h, offset } = design.led;
  let top = -Infinity;
  for (const sx of [-w / 2, w / 2]) for (const sz of [offset - h / 2, offset + h / 2]) {
    let dx = x - sx, dy = y, dz = z - sz;
    const dl = Math.hypot(dx, dy, dz); dx /= dl; dy /= dl; dz /= dl;
    const dot = dx * nx + dy * ny + dz * nz;
    const ry = dy - 2 * dot * ny, rz = dz - 2 * dot * nz;
    top = Math.max(top, (Math.atan2(ry, rz) * 180) / Math.PI);
  }
  return top;
}

/** @param {Design} design @returns {LampScene & { facets: Facet[], front: number }} */
export function buildReflector(design) {
  const o = /** @type {ReflectorOptics} */ (design.optics);
  const f = o.focalLength;
  const material = /** @type {const} */ ({ kind: 'mirror', reflectance: o.reflectance, slopeErrorMrad: o.slopeErrorMrad });
  const facets = facetAims(design, o);
  // The reflector's front edge bounds every facet's depth.
  const front = (o.width ** 2 / 4 + o.height ** 2) / (4 * f) - f;
  /** @type {Surface[]} */
  const surfaces = facets.map(fa => {
    const axes = rotation(fa.yaw, fa.pitch, fa.roll);
    // The facet's centre in its own frame: the cell centre on the base paraboloid, rotated back by the facet's aim.
    const cx = (fa.cell.x0 + fa.cell.x1) / 2, cy = (fa.cell.y0 + fa.cell.y1) / 2, cz = (cx * cx + cy * cy) / (4 * f) - f;
    const xc = axes[0] * cx + axes[3] * cy + axes[6] * cz;
    // A sideways curvature kx tilts the normal by about 2·kx·(x − xc), so the reflected ray turns by twice that:
    // reaching ±spread at the facet's edges needs kx = tan(spread / 2) / facet width.
    const kx = Math.tan((fa.spreadDeg * Math.PI) / 360) / (fa.cell.x1 - fa.cell.x0);
    const id = `facet-${fa.column + 1}-${fa.row + 1}${fa.overhead ? '-sign' : ''}`;
    const label = `${fa.overhead ? 'Sign-light strip' : 'Facet'} ${fa.column + 1}, ${fa.row + 1}`;
    return { ...paraboloidReflector(id, { origin: [0, 0, 0], axes }, f, [], material, { kx, xc, label }), cell: { ...fa.cell, z1: front + 2 } };
  });
  // A shade in front of the LED stops direct light leaving above the cut-off.
  const shadeZ = Math.max(4, Math.min(12, front * 0.25));
  const shadeH = (shadeZ * o.height) / Math.max(front, 1) * 1.05;
  surfaces.push(
    { id: 'shade', label: 'Direct-light shade', role: 'housing', frame: { origin: [0, 0, shadeZ] }, shape: { kind: 'polygon', points: [-o.width / 2, -1, o.width / 2, -1, o.width / 2, shadeH, -o.width / 2, shadeH] }, material: { kind: 'opaque', bucket: 'housing' } },
    // The housing roof, level with the top of the reflector.
    { id: 'roof', label: 'Housing', role: 'housing', frame: { origin: [0, o.height, 0], axes: [1, 0, 0, 0, 0, -1, 0, 1, 0] }, shape: { kind: 'polygon', points: [-o.width, -2 * f, o.width, -2 * f, o.width, front + 20, -o.width, front + 20] }, material: { kind: 'opaque', bucket: 'housing' } },
  );
  return {
    surfaces,
    source: { kind: 'led', frame: { origin: [0, 0, design.led.offset], axes: [...LED_UP] }, width: design.led.width, height: design.led.height, flux: design.led.flux },
    cover: design.cover,
    size: Math.max(o.width, o.height, front + f) * 1.5,
    facets,
    front,
  };
}
