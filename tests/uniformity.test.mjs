import { test } from 'node:test';
import assert from 'node:assert/strict';
import { localRatio, findDips } from '../src/core/uniformity.js';

const spec = { hMin: -10, hMax: 10, vMin: -5, vMax: 5, step: 0.1, vStep: 0.1 };
const nh = 200, nv = 100;
/** @param {(h: number, v: number) => number} f */
function grid(f) {
  const out = new Float64Array(nh * nv);
  for (let r = 0; r < nv; r++) for (let c = 0; c < nh; c++) out[r * nh + c] = f(spec.hMin + (c + 0.5) * spec.step, spec.vMin + (r + 0.5) * spec.vStep);
  return out;
}
const R = 10; // a 1° feature size on this 0.1° grid

test('a sharp cut-off and a smooth gradient are not dark patches', () => {
  // Bright below 0°, a hundred times dimmer above, with a gradient across: the shape of a passing beam.
  const values = grid((h, v) => (v < 0 ? 10000 : 100) * (1 + 0.04 * h));
  const ratio = localRatio(values, nh, nv, R, R, 1);
  assert.equal(findDips(ratio, values, spec, { depth: 0.2 }).length, 0);
});

test('a dark spot and a dark stripe are found, the spot where it is and as deep as it is', () => {
  const spot = grid((h, v) => 1000 * (1 - 0.5 * Math.exp(-(((h - 3) / 0.3) ** 2) - (((v + 1) / 0.3) ** 2))));
  const dips = findDips(localRatio(spot, nh, nv, R, R, 1), spot, spec, { depth: 0.2 });
  assert.equal(dips.length, 1);
  assert.ok(Math.abs(dips[0].h - 3) < 0.11 && Math.abs(dips[0].v + 1) < 0.11, `at ${dips[0].h}, ${dips[0].v}`);
  assert.ok(Math.abs(dips[0].ratio - 0.5) < 0.08, `ratio ${dips[0].ratio}`);
  const stripe = grid(h => 1000 * (Math.abs(h + 4) < 0.15 ? 0.6 : 1));
  const found = findDips(localRatio(stripe, nh, nv, R, R, 1), stripe, spec, { depth: 0.2 });
  assert.equal(found.length, 1);
  assert.ok(found[0].v1 - found[0].v0 > 9, 'the stripe runs the height of the grid');
});

test('a bright spot reads above one, and the dark beyond the scale is left out', () => {
  const values = grid((h, v) => (Math.hypot(h, v) < 0.3 ? 2000 : 1000) * (Math.abs(h) > 8 ? 0 : 1));
  const ratio = localRatio(values, nh, nv, R, R, 1);
  const centre = (nv / 2) * nh + nh / 2;
  assert.ok(ratio[centre] > 1.5, `ratio ${ratio[centre]}`);
  assert.ok(Number.isNaN(ratio[nv / 2 * nh + 5]), 'dark beyond the beam has no ratio');
});
