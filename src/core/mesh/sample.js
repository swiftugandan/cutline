/** A simple sample vehicle, built from boxes, to try the vehicle workspace without a CAD export: a car about 4.5 m
 * long and 1.8 m wide, with a cabin, wheels and door mirrors. It is returned as a binary STL in millimetres with x
 * forwards and z up, so it goes through the same reader as any model file. */

/** Triangles of an axis-aligned box. @param {number[]} lo @param {number[]} hi @returns {number[]} */
function box(lo, hi) {
  const [x0, y0, z0] = lo, [x1, y1, z1] = hi;
  const v = [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]];
  const faces = [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]];
  return faces.flatMap(([a, b, c, d]) => [...v[a], ...v[b], ...v[c], ...v[a], ...v[c], ...v[d]]);
}

/** A wheel: a sixteen-sided prism across the vehicle. @param {number} x @param {number} y0 @param {number} y1 @param {number} r */
function wheel(x, y0, y1, r) {
  const out = [];
  const n = 16;
  for (let k = 0; k < n; k++) {
    const a0 = (k / n) * 2 * Math.PI, a1 = ((k + 1) / n) * 2 * Math.PI;
    const p0 = [x + r * Math.cos(a0), r + r * Math.sin(a0)], p1 = [x + r * Math.cos(a1), r + r * Math.sin(a1)];
    out.push(p0[0], y0, p0[1], p1[0], y0, p1[1], p1[0], y1, p1[1], p0[0], y0, p0[1], p1[0], y1, p1[1], p0[0], y1, p0[1]);
    out.push(x, y0, r, p1[0], y0, p1[1], p0[0], y0, p0[1], x, y1, r, p0[0], y1, p0[1], p1[0], y1, p1[1]);
  }
  return out;
}

/** The sample vehicle as binary STL bytes. @returns {ArrayBuffer} */
export function sampleVehicleStl() {
  const parts = [
    ...box([-4450, -880, 300], [0, 880, 820]),          // body
    ...box([-60, -840, 260], [60, 840, 520]),            // front bumper, standing proud of the body
    ...box([-4510, -840, 280], [-4400, 840, 560]),       // rear bumper
    ...box([-3450, -770, 820], [-1350, 770, 1430]),      // cabin
    ...box([-1350, -800, 820], [-1000, 800, 1000]),      // windscreen base
    ...box([-1500, 880, 980], [-1380, 1040, 1080]),      // left mirror
    ...box([-1500, -1040, 980], [-1380, -880, 1080]),    // right mirror
    ...wheel(-850, 700, 890, 320), ...wheel(-850, -890, -700, 320),
    ...wheel(-3550, 700, 890, 320), ...wheel(-3550, -890, -700, 320),
  ];
  const n = parts.length / 9, buf = new ArrayBuffer(84 + 50 * n), view = new DataView(buf);
  view.setUint32(80, n, true);
  for (let t = 0; t < n; t++) for (let k = 0; k < 9; k++) view.setFloat32(84 + t * 50 + 12 + k * 4, parts[t * 9 + k], true);
  return buf;
}
