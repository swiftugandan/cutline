import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultDesign, switchVariant, validateDesign } from '../src/core/model.js';
import { buildLamp, traceOptions, CONVENTION } from '../src/core/lamp.js';
import { trace, BUCKETS } from '../src/core/tracer.js';
import { Beam, evaluate, evaluationInput } from '../src/core/regulation/evaluate.js';
import { paraboloidReflector } from '../src/core/optics.js';
import { rotation, compileSurface, newHit } from '../src/core/geometry.js';
import { LED_UP } from '../src/core/lamps/projector.js';

const ledgerTotal = r => BUCKETS.reduce((s, b) => s + r.ledger[b], 0);

test('a facet turned about its focus sends its beam exactly where it is aimed', () => {
  const facet = { ...paraboloidReflector('f', { origin: [0, 0, 0], axes: rotation(10, 2) }, 18, [], { kind: 'mirror', reflectance: 1, slopeErrorMrad: 0 }), cell: { x0: 10, x1: 20, y0: 10, y1: 20 } };
  const scene = { surfaces: [facet], source: { kind: 'led', frame: { origin: [0, 0, 0], axes: [...LED_UP] }, width: 1e-4, height: 1e-4, flux: 100 }, cover: { transmittance: 1, haze: 0, hazeAngleDeg: 1 }, size: 100 };
  const grid = { hMin: -20, hMax: 20, vMin: -10, vMax: 10, step: 0.25, vStep: 0.25 };
  const r = trace(scene, { rays: 200000, seed: 1, convention: 'screen', grids: [grid] });
  const f = r.histograms[0].flux;
  let best = 0, at = 0;
  f.forEach((v, i) => { if (v > best) { best = v; at = i; } });
  const nh = 160, h = -20 + (at % nh + 0.5) * 0.25, v = -10 + (Math.floor(at / nh) + 0.5) * 0.25;
  assert.ok(Math.abs(h - 10) <= 0.25 && Math.abs(v + 2) <= 0.25, `peak at ${h}, ${v}`);
});

test('the default projector is efficient and keeps every lumen accounted for', () => {
  const d = validateDesign(defaultDesign());
  const r = trace(buildLamp(d), traceOptions(d, { rays: 1_500_000 }));
  assert.ok(Math.abs(ledgerTotal(r) - d.led.flux) < 1e-6 * d.led.flux, 'every lumen accounted for');
  assert.ok(r.ledger.beam / d.led.flux > 0.33, `efficiency ${r.ledger.beam / d.led.flux}`);
});

/** The default projector with only geometric optics: no texture, haze, sign light or colour. */
function geometric() {
  const d = defaultDesign();
  d.optics.lens = { ...d.optics.lens, textureDeg: 0, signLightHeight: 0, abbe: 100 };
  d.cover = { ...d.cover, haze: 0 };
  return validateDesign(d);
}

/** Intensity well above and well below the intended cut-off on the driver's side. @param {import('../src/core/model.js').Design} d @param {number} rays */
function aboveBelow(d, rays) {
  const r = trace(buildLamp(d), traceOptions(d, { rays }));
  const beam = new Beam(r.histograms, CONVENTION);
  return { above: beam.at(-3, d.cutoff.verticalDeg + 0.9, 0.3, 0.3), below: beam.at(-3, d.cutoff.verticalDeg - 1.2, 0.3, 0.3) };
}

test('with geometric optics alone the projector cut-off is clean', () => {
  const { above, below } = aboveBelow(geometric(), 1_000_000);
  assert.ok(below > 3000 && above < 0.01 * below, `above ${above}, below ${below}`);
});

test('moving the LED back so its image clears the shield edge raises the projector beam', () => {
  const base = validateDesign(defaultDesign());
  const centred = validateDesign({ ...structuredClone(base), led: { ...base.led, offset: 0.5 } });
  const beam = d => trace(buildLamp(d), traceOptions(d, { rays: 400000 })).ledger.beam;
  assert.ok(beam(base) > 1.25 * beam(centred), `${beam(base)} vs ${beam(centred)}`);
});

test('a softer lens shape throws light above the cut-off', () => {
  const sharp = geometric();
  const soft = validateDesign({ ...structuredClone(sharp), optics: { ...sharp.optics, lens: { ...sharp.optics.lens, conic: -0.45 } } });
  assert.ok(aboveBelow(soft, 1_000_000).above > 10 * Math.max(1, aboveBelow(sharp, 1_000_000).above));
});

test('lens texture softens the cut-off: sharpness G falls as the texture grows', () => {
  const G = textureDeg => {
    const d = validateDesign({ ...defaultDesign(), optics: { ...defaultDesign().optics, lens: { ...defaultDesign().optics.lens, textureDeg } } });
    const r = trace(buildLamp(d), traceOptions(d, { rays: 4_000_000 }));
    return evaluate(evaluationInput(d), r.histograms, CONVENTION).items.find(i => i.id === 'Sharpness').value;
  };
  // Below about 0.1° the edge is too sharp for the scan cells to resolve at this ray count.
  const [g0, g1, g2] = [0.12, 0.2, 0.32].map(G);
  assert.ok(g0 > g1 && g1 > g2, `G ${g0}, ${g1}, ${g2}`);
});

test('the default reflector keeps its light under the cut-off on the driver\'s side and climbs the kink', () => {
  const d = defaultDesign();
  switchVariant(d, 'optics', 'reflector');
  validateDesign(d);
  const r = trace(buildLamp(d), traceOptions(d, { rays: 1_500_000 }));
  assert.ok(Math.abs(ledgerTotal(r) - d.led.flux) < 1e-6 * d.led.flux);
  const beam = new Beam(r.histograms, CONVENTION);
  const left = beam.at(-4, 0.5, 0.3, 0.3), leftBelow = beam.at(-4, -2, 0.3, 0.3);
  const kink = beam.at(4, 0, 0.3, 0.3);
  assert.ok(left < 0.05 * leftBelow, `left above ${left}, below ${leftBelow}`);
  assert.ok(kink > 10 * Math.max(left, 1), `kink ${kink}`);
});

test('the LED reaches every reflector facet inside its cell, however far the facet is turned', () => {
  // A facet curved about its own centre can meet a ray twice; the crossing inside its cell must count even when the
  // nearer one lies outside it.
  const d = defaultDesign();
  switchVariant(d, 'optics', 'reflector');
  const scene = buildLamp(validateDesign(d));
  const f = d.optics.focalLength, [ox, oy, oz] = scene.source.frame.origin;
  for (const s of scene.surfaces.filter(x => x.cell)) {
    const m = s.frame.axes, c = compileSurface(s), h = newHit();
    let tried = 0, hits = 0;
    for (let a = -120; a <= 120; a += 3) for (let b = -10; b <= 90; b += 3) {
      const z = (a * a + b * b) / (4 * f) - f;
      const X = m[0] * a + m[1] * b + m[2] * z, Y = m[3] * a + m[4] * b + m[5] * z, Z = m[6] * a + m[7] * b + m[8] * z;
      if (X < s.cell.x0 || X > s.cell.x1 || Y < s.cell.y0 || Y > s.cell.y1) continue;
      tried++;
      const l = Math.hypot(X - ox, Y - oy, Z - oz);
      h.t = Infinity; h.index = -1;
      c.intersect(ox, oy, oz, (X - ox) / l, (Y - oy) / l, (Z - oz) / l, 1e-6, h, 0);
      if (h.index >= 0) hits++;
    }
    assert.ok(tried > 0 && hits > 0.8 * tried, `${s.id}: ${hits} of ${tried}`);
  }
});
