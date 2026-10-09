import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseIes, writeIesTypeA, PhotometryFileError } from '../src/core/distribution/ies.js';
import { parseEulumdat } from '../src/core/distribution/eulumdat.js';
import { parseDistribution, intensityFunction, toHistograms, nativeAngles, photometricTypeOf, DEFAULT_MAPPING } from '../src/core/distribution/distribution.js';
import { Beam } from '../src/core/regulation/evaluate.js';
import { measureRequirements } from '../src/core/regulation/engine.js';
import { defaultStudy } from '../src/core/study.js';
import { analyseStudy } from '../src/core/study-analysis.js';

const RAD = Math.PI / 180, DEG = 180 / Math.PI;
const near = (/** @type {number} */ a, /** @type {number} */ b, /** @type {number} */ tol, /** @type {string} */ what) => assert.ok(Math.abs(a - b) <= tol, `${what}: ${a} vs ${b}`);
/** @param {number} lo @param {number} hi @param {number} step */
const range = (lo, hi, step) => Array.from({ length: Math.round((hi - lo) / step) + 1 }, (_, i) => +(lo + i * step).toFixed(6));

/** An IES file of any type from a function of its own angles. @param {1 | 2 | 3} type @param {number[]} H @param {number[]} V @param {(a: number, b: number) => number} f */
function ies(type, H, V, f, { multiplier = 1, lumens = -1, version = 'IESNA:LM-63-2002' } = {}) {
  const lines = [version, '[TEST] synthetic', 'TILT=NONE', `1 ${lumens} ${multiplier} ${V.length} ${H.length} ${type} 2 0 0 0`, '1 1 0', V.join(' '), H.join(' ')];
  for (const a of H) lines.push(V.map(b => f(a, b)).join(' '));
  return lines.join('\n');
}

test('an IES file reads back what was written, with its multiplier, and reports its type from the header', () => {
  const H = range(-40, 40, 0.5), V = range(-20, 20, 0.25);
  const f = (/** @type {number} */ h, /** @type {number} */ v) => 1000 + 10 * h + 30 * v;
  const text = writeIesTypeA({ title: 'x', horizontal: H, vertical: V, candela: f, lumens: 1200 });
  const d = parseIes(text);
  assert.equal(d.type, 'A');
  assert.equal(d.lampLumens, 1200);
  const I = intensityFunction(d, DEFAULT_MAPPING);
  for (const [h, v] of [[0, 0], [12.25, -3.4], [-33, 17]]) near(I(h, v), f(h, v), 0.11, `(${h}, ${v})`);
  const scaled = parseIes(ies(3, [0, 10], [0, 10], () => 7, { multiplier: 2.5 }));
  near(scaled.candela[0], 17.5, 1e-12, 'candela multiplier');
  assert.equal(photometricTypeOf(ies(2, [0, 1], [0, 1], () => 1), 'x.ies'), 'B');
  assert.throws(() => parseIes('IESNA:LM-63-2002\nno tilt here'), PhotometryFileError);
});

test('Type A angles are the R149 goniometer\'s: azimuth about the vertical axis, then elevation', () => {
  // Cutline's own frame: the direction (cos V sin H, sin V, cos V cos H).
  const [a, b] = nativeAngles('A', DEFAULT_MAPPING, Math.cos(20 * RAD) * Math.sin(30 * RAD), Math.sin(20 * RAD), Math.cos(20 * RAD) * Math.cos(30 * RAD));
  near(a, 30, 1e-9, 'H'); near(b, 20, 1e-9, 'V');
});

test('Type B angles turn about the horizontal axis first, so they differ from Type A off the axes', () => {
  // Off both axes the systems disagree by degrees: at Cutline (20°R, 20°U) a Type B file is read at 18.75°, 21.17°.
  const dir = [Math.cos(20 * RAD) * Math.sin(20 * RAD), Math.sin(20 * RAD), Math.cos(20 * RAD) * Math.cos(20 * RAD)];
  const [a, b] = nativeAngles('B', DEFAULT_MAPPING, dir[0], dir[1], dir[2]);
  near(a, Math.asin(dir[0]) * DEG, 1e-9, 'B horizontal'); near(a, 18.747, 0.001, 'B horizontal value');
  near(b, 21.173, 0.001, 'B vertical value');
  // On the horizontal and vertical planes through the axis the two systems agree.
  const d = parseIes(ies(2, range(-60, 60, 1), range(-60, 60, 1), (h, v) => 100 + h + 1000 * v));
  const I = intensityFunction(d, DEFAULT_MAPPING);
  near(I(15, 0), 115, 1e-6, 'on the horizon'); near(I(0, 10), 10100, 1e-6, 'on V-V');
  near(I(20, 20), 100 + 18.747 + 1000 * 21.173, 1.5, 'off both axes');
});

test('Type C files put the lamp axis at γ = 90° in the chosen plane, C growing to the left by default', () => {
  const C = range(0, 350, 10), G = range(0, 180, 5);
  // A peak in the C = 30 plane on the horizon.
  const d = parseIes(ies(1, C, G, (c, g) => (c === 30 && g === 90 ? 5000 : 100)));
  const I = intensityFunction(d, DEFAULT_MAPPING);
  near(I(-30, 0), 5000, 1e-9, '30° to the left');
  near(intensityFunction(d, { ...DEFAULT_MAPPING, cTurn: 'right' })(30, 0), 5000, 1e-9, 'C growing to the right');
  near(intensityFunction(d, { ...DEFAULT_MAPPING, axisC: 30 })(0, 0), 5000, 1e-9, 'the axis in the C30 plane');
  // Straight down is γ = 0.
  const down = parseIes(ies(1, [0], G, (_, g) => (g === 0 ? 900 : 0)));
  near(intensityFunction(down, DEFAULT_MAPPING)(0, -90 + 1e-9), 900, 1e-3, 'nadir of a rotationally symmetric file');
});

test('a Type C quadrant file is mirrored into the whole sphere', () => {
  const G = range(0, 180, 10);
  const quadrant = parseIes(ies(1, range(0, 90, 15), G, c => 100 + c));
  const I = intensityFunction(quadrant, DEFAULT_MAPPING);
  // C = 120 mirrors C = 60, and C = 300 mirrors C = 60 too.
  near(I(-60, 0), 160, 1e-9, 'C60'); near(I(-120, 0), 160, 1e-9, 'C120 → C60'); near(I(60, 0), 160, 1e-9, 'C300 → C60');
});

test('a EULUMDAT file gives candela from its intensities per 1,000 lm and the lamp flux', () => {
  const lines = ['Maker', '1', '1', '1', '0', '3', '90', 'R1', 'Lamp', 'L1', 'f.ldt', 'today', '100', '50', '20', '80', '40', '0', '0', '0', '0', '100', '80', '1', '0', '1', '1', 'LED', '2000', '4000', '80', '20'];
  for (let k = 0; k < 10; k++) lines.push('0.5');
  lines.push('0', '0', '90', '180', '300', '200', '0');
  const d = parseEulumdat(lines.join('\r\n'));
  assert.equal(d.type, 'C');
  near(d.candela[0], 600, 1e-9, '300 cd/klm at 2,000 lm');
  near(intensityFunction(d, DEFAULT_MAPPING)(-45, 0), 400, 1e-9, 'γ = 90° in every plane');
  assert.equal(parseDistribution(lines.join('\n'), 'lamp.ldt').format, 'ldt');
});

test('outside an imported file a requirement has no data, and a line half outside is judged on its covered part', () => {
  const d = parseIes(ies(3, range(-20, 20, 0.5), range(-10, 10, 0.5), () => 500));
  const beam = new Beam(toHistograms(intensityFunction(d, DEFAULT_MAPPING)), 'goniometer', { exact: true });
  const items = measureRequirements(beam, [
    { kind: 'point', id: 'inside', h: 5, v: 2, min: 400, cite: 'x' },
    { kind: 'point', id: 'outside', h: 45, v: 2, min: 400, cite: 'x' },
    { kind: 'line', id: 'half', h0: 0, v0: 0, h1: 60, v1: 0, max: 600, cite: 'x' },
  ]);
  const by = Object.fromEntries(items.map(i => [i.id, i]));
  assert.equal(by.inside.status, 'pass'); assert.equal(by.inside.error, 0);
  assert.equal(by.outside.status, 'nodata');
  assert.equal(by.half.status, 'pass'); assert.equal(by.half.partial, true);
});

test('a study checks the lamp for the other traffic side on the file\'s mirror image', () => {
  // A beam bright on the right: the right-hand traffic lamp.
  const f = (/** @type {number} */ h, /** @type {number} */ v) => 20000 * Math.exp(-(((h - 4) / 6) ** 2) - (((v + 2) / 2) ** 2)) + 50;
  const H = range(-60, 60, 0.5), V = range(-30, 30, 0.25);
  const study = defaultStudy();
  study.source = { name: 'beam.ies', text: writeIesTypeA({ title: 'x', horizontal: H, vertical: V, candela: f }) };
  study.lamp.role = 'driving';
  study.markets = [{ pack: 'r149', fn: 'driving-B', traffic: 'right' }, { pack: 'r149', fn: 'driving-B', traffic: 'left' }];
  const { analysis } = analyseStudy(study, null);
  const [right, left] = analysis.markets;
  assert.equal(right.beam, 'file'); assert.equal(left.beam, 'mirror');
  // The mirror image aims to the mirrored position and reads the same values at the mirrored points. The two aims may
  // land a 0.05° bin apart, and on this beam's flanks that moves a value by up to about 4%.
  near(left.aim.dh, -right.aim.dh, 0.06, 'aim across');
  for (const r of right.items) {
    const l = left.items.find(i => i.label.replace(/L/g, '#').replace(/R/g, 'L').replace(/#/g, 'R') === r.label || i.id === r.id);
    if (l && Number.isFinite(r.value)) near(l.value, r.value, 0.05 * r.value + 1, r.id);
  }
});

test('an FMVSS visually aimed lower beam is aimed by the cut-off side the engineer declares', () => {
  // A passing beam whose cut-off lies level at 1°D everywhere: VOL puts it at 0.4°D, VOR on H-H.
  const f = (/** @type {number} */ h, /** @type {number} */ v) => 15000 * Math.exp(-((h / 10) ** 2)) * 10 ** (-2 / (1 + Math.exp(-(v + 1) / 0.08))) + 20;
  const study = defaultStudy();
  study.source = { name: 'low.ies', text: writeIesTypeA({ title: 'x', horizontal: range(-40, 40, 0.5), vertical: range(-20, 20, 0.1), candela: f }) };
  study.markets = [{ pack: 'fmvss108', fn: 'lower-LB1V', traffic: 'right' }];
  const aimOf = (/** @type {string[]} */ conditions) => { study.conditions = conditions; return analyseStudy(study, null).analysis.markets[0].aim; };
  const vol = aimOf([]), vor = aimOf(['fmvss108:vor']);
  assert.match(vol.method, /VOL/); assert.match(vor.method, /VOR/);
  near(vor.dv - vol.dv, 0.4, 0.06, 'VOR sits 0.4° higher than VOL');
  // CMVSS 108 stands on FMVSS 108's data, so it shares the declaration.
  study.markets = [{ pack: 'cmvss108', fn: 'lower-LB1V', traffic: 'right' }];
  assert.match(aimOf(['fmvss108:vor']).method, /VOR/);
});
