import { test } from 'node:test';
import assert from 'node:assert/strict';
import { indexAt, dispersionFactor, sampleWavelength } from '../src/core/spectrum.js';
import { refractOrReflect, trace, TEXTURE_K } from '../src/core/tracer.js';
import { Rng } from '../src/core/rng.js';
import { roadIlluminance, designRoad, LAMP_SPACING } from '../src/core/road.js';
import { displayCandela } from '../src/core/analysis.js';
import { binSolidAngle } from '../src/core/photometry.js';
import { gridSize } from '../src/core/tracer.js';
import { defaultDesign, switchVariant, validateDesign } from '../src/core/model.js';
import { buildLamp } from '../src/core/lamp.js';
import { sectionOutlines, outlineBounds } from '../src/core/section.js';
import { planoConvexLens } from '../src/core/optics.js';

const near = (a, b, tol, label) => assert.ok(Math.abs(a - b) <= tol, `${label}: ${a} vs ${b}`);
const DEG = 180 / Math.PI;

test('dispersion follows the Abbe number: n_d at the d line, n_F − n_C = (n_d − 1)/V', () => {
  near(indexAt(1.49, 57, 587.6), 1.49, 1e-12, 'd line');
  near(indexAt(1.49, 57, 486.1) - indexAt(1.49, 57, 656.3), 0.49 / 57, 1e-12, 'F − C');
  assert.ok(dispersionFactor(450) > dispersionFactor(600), 'blue bends more than red');
});

test('wavelengths are drawn from the luminous spectrum of a white LED', () => {
  const n = 20000;
  let sum = 0, blue = 0;
  for (let i = 0; i < n; i++) { const nm = sampleWavelength((i + 0.5) / n); sum += nm; if (nm < 480) blue++; }
  const mean = sum / n;
  assert.ok(mean > 540 && mean < 580, `mean ${mean} nm`);
  // The blue pump peak is bright but weighs little in lumens.
  assert.ok(blue / n > 0.005 && blue / n < 0.08, `share below 480 nm ${blue / n}`);
});

test('a textured surface scatters with power-law wings about its scale', () => {
  const rng = new Rng(7);
  const material = { kind: 'dielectric', front: { n: 1, k: 0 }, back: { n: 1.0001, k: 0 }, textureDeg: 0.5 };
  const angles = [];
  for (let i = 0; i < 40000; i++) {
    const [dx, dy, dz, , reflected] = refractOrReflect(0, 0, -1, 0, 0, 1, true, material, rng);
    if (!reflected) angles.push(Math.acos(Math.min(1, -dz)) * DEG);
  }
  angles.sort((x, y) => x - y);
  // P(θ < t) = 1 − (1 + t²/a²)^(1 − k): the median is a·√(2^(1/(k − 1)) − 1).
  const quantile = q => 0.5 * Math.sqrt((1 - q) ** (1 / (1 - TEXTURE_K)) - 1);
  near(angles[angles.length >> 1], quantile(0.5), 0.01, 'median');
  near(angles[Math.floor(angles.length * 0.99)], quantile(0.99), 0.15, '99th percentile');
});

test('a lens\'s sign-light strip turns only the light below its height upwards, within its range', () => {
  const lens = planoConvexLens({ zBack: 10, thickness: 4, radius: 1e6, aperture: 20, conic: 0, a4: 0, glass: { n: 1.0001, k: 0 }, signLight: { yMax: -15, upMinDeg: 2, upMaxDeg: 4 } });
  // A forward LED close behind a nearly flat window: its rays cross the strip only below y = −15.
  const scene = { surfaces: lens, source: { kind: 'led', frame: { origin: [0, 0, 0] }, width: 1e-3, height: 1e-3, flux: 1000 }, cover: { transmittance: 1, haze: 0, hazeAngleDeg: 1 }, size: 60 };
  const r = trace(scene, { rays: 200000, seed: 3, convention: 'goniometer', grids: [{ hMin: -90, hMax: 90, vMin: -90, vMax: 90, step: 1, vStep: 1 }], pathCount: 4000 });
  let turned = 0, checked = 0;
  for (const p of r.paths) {
    if (p.bucket !== 'beam' || p.points.length < 12) continue;
    const pts = p.points, n = pts.length / 3;
    // Direction before the lens and after it.
    const before = Math.atan2(pts[4] - pts[1], pts[5] - pts[2]) * DEG;
    const after = Math.atan2(pts[3 * n - 2] - pts[3 * n - 5], pts[3 * n - 1] - pts[3 * n - 4]) * DEG;
    const crossY = pts[7];
    const lift = after - before;
    if (crossY < -15) { assert.ok(lift > 1.9 && lift < 4.1, `lift ${lift} at y ${crossY}`); turned++; }
    else assert.ok(Math.abs(lift) < 0.1, `no lift above the strip: ${lift}`);
    checked++;
  }
  assert.ok(turned > 5 && checked > 100, `${turned} of ${checked}`);
});

test('the road gives the light on a target facing the car: I/d² from both lamps', () => {
  const d = defaultDesign();
  const r = roadIlluminance(designRoad(d), () => 10000, { xMin: 0, xMax: 0, zMin: 50, zMax: 50, step: 1 });
  const dist = Math.hypot(LAMP_SPACING / 2, d.mounting.height, 50);
  near(r.lux[0], (2 * 10000) / (dist * dist), 1e-9, 'two lamps at 50 m');
});

test('on the road surface the light grazes: I·height/d³, from the lamps chosen', () => {
  const setup = { height: 0.7, aimPercent: 0, spacing: 1.4, lamps: /** @type {const} */ ('left'), surface: /** @type {const} */ ('road'), length: 100, width: 20 };
  const r = roadIlluminance(setup, () => 10000, { xMin: -0.7, xMax: -0.7, zMin: 30, zMax: 30, step: 1 });
  const dist = Math.hypot(0.7, 30);
  near(r.lux[0], (10000 * 0.7) / dist ** 3, 1e-9, 'the left lamp alone, straight ahead of it at 30 m');
});

test('the displayed beam averages over enough rays without biasing a uniform field', () => {
  const spec = { hMin: -5, hMax: 5, vMin: -2, vMax: 2, step: 0.05, vStep: 0.05 };
  const { nh, nv } = gridSize(spec);
  const flux = new Float64Array(nh * nv), count = new Float64Array(nh * nv);
  for (let r = 0; r < nv; r++) for (let c = 0; c < nh; c++) {
    const h0 = spec.hMin + c * spec.step, v0 = spec.vMin + r * spec.vStep;
    flux[r * nh + c] = 500 * binSolidAngle(h0, h0 + spec.step, v0, v0 + spec.vStep, 'goniometer');
    count[r * nh + c] = (r + c) % 7 === 0 ? 3 : 0;
  }
  const out = displayCandela({ spec, flux, count }, 'goniometer', 1);
  for (const value of out) near(value, 500, 1e-9, 'uniform intensity survives smoothing');
});

test('section outlines show each lamp\'s optics where they are built', () => {
  const d = validateDesign(defaultDesign());
  const side = sectionOutlines(buildLamp(d), 'side');
  for (const id of ['reflector', 'lens-back', 'lens-front']) assert.ok(side.some(o => o.id === id), id);
  const [u0, u1, w0, w1] = outlineBounds(side);
  assert.ok(u0 < 0 && u1 > d.optics.reflector.focalDistance && w1 > 0 && w0 < 0, `bounds ${[u0, u1, w0, w1]}`);
  const r = defaultDesign();
  switchVariant(r, 'optics', 'reflector');
  const top = sectionOutlines(buildLamp(validateDesign(r)), 'top');
  assert.ok(top.filter(o => o.role === 'reflector').length === r.optics.columns, 'one facet outline per column');
});
