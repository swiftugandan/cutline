import { test } from 'node:test';
import assert from 'node:assert/strict';
import { passingRequirements, drivingRequirements, RULES } from '../src/core/regulation/r149.js';
import { evaluate, Beam, verticalScan } from '../src/core/regulation/evaluate.js';
import { mirrorLabel } from '../src/core/regulation/engine.js';
import { GRIDS } from '../src/core/lamp.js';
import { gridSize } from '../src/core/tracer.js';
import { binSolidAngle } from '../src/core/photometry.js';

const CONVENTION = 'goniometer';

/**
 * Histograms filled from an analytic intensity I(h, v), with plenty of rays per bin so no measurement has to grow.
 * @param {(h: number, v: number) => number} intensity
 */
function synthetic(intensity) {
  return GRIDS.map(spec => {
    const { nh, nv } = gridSize(spec);
    const flux = new Float64Array(nh * nv), count = new Float64Array(nh * nv).fill(1e6);
    for (let r = 0; r < nv; r++) for (let c = 0; c < nh; c++) {
      const h0 = spec.hMin + c * spec.step, v0 = spec.vMin + r * spec.vStep;
      flux[r * nh + c] = intensity(h0 + spec.step / 2, v0 + spec.vStep / 2) * binSolidAngle(h0, h0 + spec.step, v0, v0 + spec.vStep, CONVENTION);
    }
    return { spec, flux, count };
  });
}

/**
 * A passing beam with a cut-off at `cut`, flat on the left and rising at 15° from the elbow on the right. Across the
 * cut-off, log intensity falls by `depth` decades along a logistic step, so its inflection lies exactly on the edge and
 * its steepest slope is `slope` decades per degree.
 */
function passingBeam({ cut = -0.3, elbow = 0, i0 = 20000, depth = 3, slope = 3 } = {}) {
  const width = depth / (4 * slope);
  return (/** @type {number} */ h, /** @type {number} */ v) => {
    const edge = cut + Math.min(1.5, Math.max(0, h - elbow) * Math.tan((15 * Math.PI) / 180));
    return i0 * 10 ** (-depth / (1 + Math.exp(-(v - edge) / width)));
  };
}

test('every R149 requirement cites the 01 series text', () => {
  for (const r of [...passingRequirements('C'), ...passingRequirements('V'), ...drivingRequirements('B'), ...drivingRequirements('A')]) {
    assert.match(r.cite, /^R149 01 series, (Table|Annex|§)/, r.id);
  }
  for (const key of ['receiverCite', 'sharpnessCite', 'linearityCite', 'horizontalAimCite', 'fluxCite']) assert.match(RULES[key], /^R149 01 series/);
});

test('Class V foreground limit follows the adopted correction: 0.8 × 25V, while Class C keeps 50R', () => {
  const rel = cls => passingRequirements(cls).find(r => r.id === 'Segment 10 and below');
  assert.equal(rel('C').of, '50R');
  assert.equal(rel('V').of, '25V');
  assert.match(rel('V').cite, /WP\.29\/1166/);
});

test('a uniform beam reads its own intensity everywhere, through the receiver and through grown receivers', () => {
  const beam = new Beam(synthetic(() => 1234), CONVENTION);
  for (const [h, v] of [[0, 0], [-3.43, 0.57], [12, -4], [-40, 10]]) assert.ok(Math.abs(beam.measure(h, v).value / 1234 - 1) < 1e-9, `${h}, ${v}`);
  // With few rays, the receiver grows but a uniform beam still reads the same.
  const sparse = synthetic(() => 1234).map(hist => ({ ...hist, count: new Float64Array(hist.count.length).fill(1) }));
  const m = new Beam(sparse, CONVENTION).measure(5, 2);
  assert.ok(Math.abs(m.value / 1234 - 1) < 1e-9);
  assert.ok(m.rays >= 100, 'grows until it holds enough rays');
});

test('vertical aim puts the steepest fall of a cut-off on line B, and sharpness reads the beam\'s log slope', () => {
  // At its steepest the cut-off falls 3 decades per degree: G = 0.3 over 0.1°, inside 0.13–0.40.
  const e = evaluate({ beamClass: 'C', traffic: 'right', ledFlux: 1000, aimMethod: 'line02D' }, synthetic(passingBeam({ cut: -0.3 })), CONVENTION);
  assert.ok(Math.abs(e.aim.dv - (RULES.lineB - -0.3)) <= 0.02, `dv ${e.aim.dv}`);
  const g = e.items.find(i => i.id === 'Sharpness');
  assert.ok(Math.abs(g.value - 0.3) < 0.02, `G ${g.value}`);
  assert.equal(g.status, 'pass');
  assert.equal(e.items.find(i => i.id === 'Linearity').status, 'pass');
});

test('a razor cut-off fails the maximum sharpness, a soft one the minimum', () => {
  const G = slope => evaluate({ beamClass: 'C', traffic: 'right', ledFlux: 1000, aimMethod: 'line02D' }, synthetic(passingBeam({ slope, depth: Math.max(3, slope / 2) })), CONVENTION).items.find(i => i.id === 'Sharpness');
  assert.equal(G(8).status, 'fail');
  assert.equal(G(1).status, 'fail');
});

test('the 0.2°D line puts the rising edge on line A, and three lines put the elbow on V-V', () => {
  const histograms = synthetic(passingBeam({ cut: -0.57, elbow: 1, slope: 6 }));
  const a = evaluate({ beamClass: 'C', traffic: 'right', ledFlux: 1000, aimMethod: 'line02D' }, histograms, CONVENTION);
  // Moving left along 0.2°D the beam goes dark where the rising edge crosses it; that point goes to 0.5°R.
  const b = evaluate({ beamClass: 'C', traffic: 'right', ledFlux: 1000, aimMethod: 'threeLine' }, histograms, CONVENTION);
  assert.ok(Math.abs(b.aim.dh - -1) < 0.15, `three lines dh ${b.aim.dh}`);
  // After the vertical aim the rising edge crosses 0.2°D where it has climbed from line B, 1 + (0.57 − 0.2)/tan 15° ≈ 2.4°R
  // (less the inflection's lift above the edge); that point moves to line A at 0.5°R.
  // After the vertical aim the rising edge crosses 0.2°D at 1 + (0.57 − 0.2)/tan 15°; that point moves to 0.5°R.
  assert.ok(Math.abs(a.aim.dh - (0.5 - (1 + (0.57 - 0.2) / Math.tan((15 * Math.PI) / 180)))) < 0.15, `0.2°D line dh ${a.aim.dh}`);
});

test('left-hand traffic mirrors positions and names', () => {
  assert.equal(mirrorLabel('B50L'), 'B50R');
  assert.equal(mirrorLabel('75R'), '75L');
  assert.equal(mirrorLabel('Segment 40LL'), 'Segment 40RR');
  assert.equal(mirrorLabel('Segment BLL'), 'Segment BRR');
  const mirrored = (/** @type {number} */ h, /** @type {number} */ v) => passingBeam()(-h, v);
  const right = evaluate({ beamClass: 'C', traffic: 'right', ledFlux: 1000, aimMethod: 'threeLine' }, synthetic(passingBeam()), CONVENTION);
  const left = evaluate({ beamClass: 'C', traffic: 'left', ledFlux: 1000, aimMethod: 'threeLine' }, synthetic(mirrored), CONVENTION);
  for (const r of right.items) {
    const l = left.items.find(i => i.id === (r.id.startsWith('Cut-off') || r.id === 'Sharpness' || r.id === 'Linearity' ? r.id : mirrorLabel(r.id)));
    assert.ok(l, r.id);
    // Mirrored scans sample slightly different bins, so values agree to a couple of per cent.
    if (Number.isFinite(r.value)) assert.ok(Math.abs(l.value - r.value) <= 0.02 * Math.abs(r.value) + 0.02, `${r.id}: ${r.value} vs ${l.value}`);
  }
});

test('a relative limit whose reference fails is blocked, not failed', () => {
  // Dark at 50R: the foreground limit 0.8 × 50R cannot be judged.
  const e = evaluate({ beamClass: 'C', traffic: 'right', ledFlux: 1000, aimMethod: 'line02D' }, synthetic(passingBeam({ i0: 100 })), CONVENTION);
  assert.equal(e.items.find(i => i.id === '50R').status, 'fail');
  assert.equal(e.items.find(i => i.id === 'Segment 10 and below').status, 'blocked');
  assert.equal(e.pass, false);
});

test('a driving beam is centred on its maximum and judged with the 0.25° tolerance', () => {
  const peakH = 1.2, peakV = 0.4;
  const beam = (/** @type {number} */ h, /** @type {number} */ v) => 60000 * Math.exp(-(((h - peakH) / 6) ** 2) - (((v - peakV) / 2) ** 2));
  const e = evaluate({ beamClass: 'B', traffic: 'right', ledFlux: 1000, aimMethod: 'line02D' }, synthetic(beam), CONVENTION);
  assert.ok(Math.abs(e.aim.dh + peakH) < 0.06 && Math.abs(e.aim.dv + peakV) < 0.06, `aim ${e.aim.dh}, ${e.aim.dv}`);
  const hv = e.items.find(i => i.id === 'H-V');
  assert.equal(hv.status, 'pass');
  assert.ok(Math.abs(e.items.find(i => i.id === 'Imax').value / 60000 - 1) < 0.01);
});
