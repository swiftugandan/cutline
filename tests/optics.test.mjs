import { test } from 'node:test';
import assert from 'node:assert/strict';
import { trace, mergeTraces, BUCKETS, RAY_BLOCK, directionToAngles, fresnelReflectance } from '../src/core/tracer.js';
import { binSolidAngle } from '../src/core/photometry.js';
import { Beam } from '../src/core/regulation/evaluate.js';
import { ellipsoidReflector, focalHalfDistance, paraboloidReflector, planoConvexLens, lensFocalLength, lensBackFocus } from '../src/core/optics.js';
import { rotation, compileSurface, newHit, crossesCell } from '../src/core/geometry.js';

const near = (a, b, tol, label) => assert.ok(Math.abs(a - b) <= tol, `${label}: ${a} vs ${b}`);
const MIRROR = { kind: 'mirror', reflectance: 1, slopeErrorMrad: 0 };
const PMMA = { n: 1.49, k: 0 };
const forwardLed = (flux, size = 1) => ({ kind: 'led', frame: { origin: [0, 0, 0] }, width: size, height: size, flux });
const upLed = (flux, size = 1e-4) => ({ kind: 'led', frame: { origin: [0, 0, 0], axes: [1, 0, 0, 0, 0, 1, 0, -1, 0] }, width: size, height: size, flux });
const ledger = r => BUCKETS.reduce((s, b) => s + r.ledger[b], 0);
const WIDE = { hMin: -80, hMax: 80, vMin: -80, vMax: 80, step: 1, vStep: 1 };

test('rotations aim as documented: positive yaw to the right, positive pitch down', () => {
  const r = rotation(10, 0);
  near(r[2], Math.sin(10 * Math.PI / 180), 1e-12, 'yaw turns +z to +x');
  const p = rotation(0, 10);
  near(p[5], -Math.sin(10 * Math.PI / 180), 1e-12, 'pitch turns +z down');
  const m = rotation(23, -7, 4);
  // Columns are orthonormal.
  for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) {
    const dot = m[a] * m[b] + m[3 + a] * m[3 + b] + m[6 + a] * m[6 + b];
    near(dot, a === b ? 1 : 0, 1e-12, `columns ${a}, ${b}`);
  }
});

test('a bare Lambertian LED: I(0) = Φ/π, I(60°) = I(0)/2, and every lumen is accounted for', () => {
  const scene = { surfaces: [], source: forwardLed(1000, 1e-3), cover: { transmittance: 1, haze: 0, hazeAngleDeg: 1 }, size: 50 };
  for (const convention of ['screen', 'goniometer']) {
    const r = trace(scene, { rays: 2_000_000, seed: 1, convention, grids: [WIDE] });
    near(ledger(r), 1000, 1e-6, 'conservation');
    near(r.ledger.beam, 1000, 1e-6, 'all forward');
    const beam = new Beam([r.histograms[0], r.histograms[0]], convention);
    const i0 = beam.at(0, 0, 3, 3);
    near(i0, 1000 / Math.PI, 0.02 * 1000 / Math.PI, `${convention} I(0)`);
    const i60 = beam.at(60, 0, 3, 3);
    near(i60 / i0, 0.5, 0.03, `${convention} I(60°)/I(0)`);
  }
});

test('bin solid angles over the forward hemisphere add up to 2π', () => {
  for (const convention of ['goniometer']) {
    let total = 0;
    for (let h = -180; h < 180; h += 2) for (let v = -90; v < 90; v += 2) total += binSolidAngle(h, h + 2, v, v + 2, convention);
    near(total, 4 * Math.PI, 1e-3, convention);
  }
  // On a screen, the rectangle |h| ≤ a, |v| ≤ b subtends exactly 4·asin(sin a · sin b).
  for (const [a, b] of [[89.5, 89.5], [30, 10], [60, 20]]) {
    let screen = 0;
    for (let h = -a; h < a - 1e-9; h += 0.5) for (let v = -b; v < b - 1e-9; v += 0.5) screen += binSolidAngle(h, h + 0.5, v, v + 0.5, 'screen');
    const exact = 4 * Math.asin(Math.sin(a * Math.PI / 180) * Math.sin(b * Math.PI / 180));
    near(screen, exact, 2e-4 * exact + 1e-6, `screen ±${a}° × ±${b}°`);
  }
});

test('an ellipsoid sends every ray from one focus through the other', () => {
  const b = 30, c = 40, half = focalHalfDistance(b, c);
  const mirror = ellipsoidReflector('e', [0, 0, half], b, b, c, [{ n: [0, -1, 0], d: 0 }], MIRROR);
  const scene = { surfaces: [mirror], source: upLed(100), cover: { transmittance: 1, haze: 0, hazeAngleDeg: 1 }, size: 100 };
  const r = trace(scene, { rays: 2000, seed: 2, convention: 'screen', grids: [WIDE], pathCount: 200 });
  let checked = 0;
  for (const p of r.paths) {
    if (p.points.length < 9) continue;
    // Segment from the reflection point onwards: distance from F2 = (0, 0, 2·half) to the line.
    const [x1, y1, z1, x2, y2, z2] = p.points.slice(3, 9);
    const ux = x2 - x1, uy = y2 - y1, uz = z2 - z1, ul = Math.hypot(ux, uy, uz);
    const fx = 0 - x1, fy = 0 - y1, fz = 2 * half - z1;
    const cx = fy * uz - fz * uy, cy = fz * ux - fx * uz, cz = fx * uy - fy * ux;
    near(Math.hypot(cx, cy, cz) / ul, 0, 1e-3, 'distance to F2');
    checked++;
  }
  assert.ok(checked > 50);
});

test('a paraboloid collimates a point source at its focus', () => {
  const mirror = paraboloidReflector('p', { origin: [0, 0, 0] }, 20, [{ n: [0, -1, 0], d: 0 }, { n: [0, 0, 1], d: 40 }], MIRROR);
  const scene = { surfaces: [mirror], source: upLed(100), cover: { transmittance: 1, haze: 0, hazeAngleDeg: 1 }, size: 100 };
  const r = trace(scene, { rays: 20000, seed: 3, convention: 'screen', grids: [{ hMin: -0.5, hMax: 0.5, vMin: -0.5, vMax: 0.5, step: 0.1, vStep: 0.1 }] });
  const centre = r.histograms[0].flux.reduce((s, f) => s + f, 0);
  // Everything that met the mirror leaves along the axis; the rest escaped past the rim.
  const reflectedForward = r.ledger.beam;
  assert.ok(reflectedForward > 30);
  near(centre / reflectedForward, 1, 0.3, 'share of the beam in the centre bins (the rest is direct light)');
});

test('Fresnel reflectance at normal incidence and total internal reflection', () => {
  near(fresnelReflectance(1, 1.5, 1), 0.04, 1e-12, 'normal incidence');
  assert.equal(fresnelReflectance(1.49, 1, Math.cos(Math.asin(1 / 1.49) + 0.01)), 1);
});

test('a plano-convex lens collimates a source at its back focus, and images an edge into a cut-off', () => {
  const radius = 40, thickness = 12, n = PMMA.n;
  const bfl = lensBackFocus(radius, thickness, n);
  near(lensFocalLength(radius, n), 81.6327, 1e-3, 'f = R/(n−1)');
  // A tiny source on the axis at the back focus: the beam is nearly parallel (spherical aberration aside).
  const lens = planoConvexLens({ zBack: bfl, thickness, radius, aperture: 12, conic: -1 / (n * n), a4: 0, glass: PMMA });
  const r = trace({ surfaces: lens, source: forwardLed(100, 1e-4), cover: { transmittance: 1, haze: 0, hazeAngleDeg: 1 }, size: 100 },
    { rays: 50000, seed: 4, convention: 'screen', grids: [{ hMin: -1, hMax: 1, vMin: -1, vMax: 1, step: 0.05, vStep: 0.05 }] });
  const inCore = r.histograms[0].flux.reduce((s, f) => s + f, 0);
  // Light that passes through the lens is concentrated within ±1°; the rest went past the 12 mm aperture.
  assert.ok(inCore > 0.9 * (r.ledger.beam - (100 - lensPass(bfl, 12))), `${inCore} of ${r.ledger.beam}`);
  // A source offset by h above the axis at the focus leaves at −atan(h / f): the projector's inverted image.
  const f = lensFocalLength(radius, n), h = 2;
  const off = trace({ surfaces: lens, source: { ...forwardLed(100, 1e-4), frame: { origin: [0, h, 0] } }, cover: { transmittance: 1, haze: 0, hazeAngleDeg: 1 }, size: 100 },
    { rays: 50000, seed: 5, convention: 'screen', grids: [{ hMin: -0.5, hMax: 0.5, vMin: -3, vMax: 1, step: 0.02, vStep: 0.02 }] });
  const hist = off.histograms[0];
  let best = 0, bestV = 0;
  const nh = 50;
  for (let row = 0; row < 200; row++) {
    let rowFlux = 0;
    for (let col = 0; col < nh; col++) rowFlux += hist.flux[row * nh + col];
    if (rowFlux > best) { best = rowFlux; bestV = -3 + (row + 0.5) * 0.02; }
  }
  near(bestV, -Math.atan(h / f) * 180 / Math.PI, 0.05, 'image of an offset point');
});

/** Lumens a Lambertian point source sends into a disc of radius a at distance d. @param {number} d @param {number} a */
function lensPass(d, a) {
  const sin2 = (a * a) / (a * a + d * d);
  return 100 * sin2;
}

test('every lumen ends in one bucket through a full projector-like stack', () => {
  const b = 25, c = 35, half = focalHalfDistance(b, c);
  const mirror = ellipsoidReflector('e', [0, 0, half], b * 1.2, b, c, [{ n: [0, -1, 0], d: 0 }, { n: [0, 0, 1], d: half }], { kind: 'mirror', reflectance: 0.88, slopeErrorMrad: 2 });
  const shield = { id: 's', label: 'Shield', role: 'shield', frame: { origin: [0, 0, 2 * half] }, shape: { kind: 'polygon', points: [-30, -40, 30, -40, 30, 0, -30, 0] }, material: { kind: 'opaque', bucket: 'shield' } };
  const lens = planoConvexLens({ zBack: 2 * half + lensBackFocus(40, 14, 1.49), thickness: 14, radius: 40, aperture: 30, conic: -0.45, a4: 0, glass: { n: 1.49, k: 0.001 } });
  const scene = { surfaces: [mirror, shield, ...lens], source: { kind: 'led', frame: { origin: [0, 0, 0], axes: [1, 0, 0, 0, 0, 1, 0, -1, 0] }, width: 1, height: 1, flux: 1000 }, cover: { transmittance: 0.9, haze: 0, hazeAngleDeg: 1 }, size: 150 };
  const r = trace(scene, { rays: 40000, seed: 6, convention: 'screen', grids: [WIDE] });
  near(ledger(r), 1000, 1e-9 * 1000, 'closure');
  assert.ok(r.ledger.shield > 0 && r.ledger.beam > 0 && r.ledger.reflectorAbsorption > 0 && r.ledger.coverLoss > 0);
});

test('a trace split into block-aligned chunks equals one uninterrupted trace', () => {
  const b = 25, c = 35, half = focalHalfDistance(b, c);
  const mirror = ellipsoidReflector('e', [0, 0, half], b, b, c, [{ n: [0, -1, 0], d: 0 }], { kind: 'mirror', reflectance: 0.9, slopeErrorMrad: 3 });
  const scene = { surfaces: [mirror], source: { ...upLed(500, 1) }, cover: { transmittance: 1, haze: 0, hazeAngleDeg: 1 }, size: 100 };
  const options = { rays: 3 * RAY_BLOCK + 500, seed: 9, convention: 'screen', grids: [WIDE], pathCount: 20 };
  const whole = trace(scene, options);
  const merged = mergeTraces([[0, RAY_BLOCK], [RAY_BLOCK, 3 * RAY_BLOCK], [3 * RAY_BLOCK, options.rays]].map(([from, to]) => trace(scene, options, { from, to })));
  for (const b2 of BUCKETS) near(merged.ledger[b2], whole.ledger[b2], 1e-9, b2);
  assert.deepEqual(Array.from(merged.histograms[0].flux).map(v => +v.toFixed(9)), Array.from(whole.histograms[0].flux).map(v => +v.toFixed(9)));
  assert.deepEqual(merged.paths, whole.paths);
});

test('angle conventions agree on the axis and differ off it as expected', () => {
  const d = [Math.sin(0.3), 0.2, Math.cos(0.3)], len = Math.hypot(...d);
  const [hs, vs] = directionToAngles(d[0] / len, d[1] / len, d[2] / len, 'screen');
  const [hg, vg] = directionToAngles(d[0] / len, d[1] / len, d[2] / len, 'goniometer');
  near(hs, hg, 1e-9, 'same azimuth for both');
  assert.ok(vs > vg, 'a screen projection reads a larger vertical angle off axis');
});

test('compiled surfaces report a unit normal facing the documented front', () => {
  const s = compileSurface(paraboloidReflector('p', { origin: [0, 0, 0] }, 20, [], MIRROR));
  const hit = newHit();
  s.intersect(0, 0, 0, 0, 1, 0, 1e-9, hit, 0);
  near(Math.hypot(hit.nx, hit.ny, hit.nz), 1, 1e-12, 'unit');
  assert.ok(hit.ny < 0, 'the mirrored side faces the focus');
});

test('the cell prism test agrees with stepping along the ray', () => {
  const cell = { x0: -2, x1: 3, y0: 1, y1: 4 };
  let seedState = 9;
  const rand = () => { seedState = (seedState * 1103515245 + 12345) % 2147483648; return seedState / 2147483648; };
  for (let i = 0; i < 2000; i++) {
    const ox = rand() * 20 - 10, oy = rand() * 20 - 10, dx = rand() * 2 - 1, dy = rand() * 2 - 1, tMax = rand() * 30;
    let inside = false;
    for (let t = 0; t <= tMax; t += 0.005) { const x = ox + t * dx, y = oy + t * dy; if (x >= cell.x0 && x <= cell.x1 && y >= cell.y0 && y <= cell.y1) { inside = true; break; } }
    // Stepping can miss a corner the exact test catches, never the reverse.
    if (inside) assert.ok(crossesCell(cell, ox, oy, 0, dx, dy, 0, 0, tMax), `ray ${i}`);
  }
});
