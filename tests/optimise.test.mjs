import { test } from 'node:test';
import assert from 'node:assert/strict';
import { latinHypercube, nelderMead, penalty, TARGET_MARGIN, optimise } from '../src/core/optimise.js';
import { Rng } from '../src/core/rng.js';
import { defaultDesign } from '../src/core/model.js';

test('a Latin hypercube puts exactly one point in every stratum of every dimension', () => {
  const n = 12, points = latinHypercube(n, 3, new Rng(5));
  for (let d = 0; d < 3; d++) {
    const strata = points.map(p => Math.floor(p[d] * n)).sort((a, b) => a - b);
    assert.deepEqual(strata, Array.from({ length: n }, (_, i) => i));
  }
});

test('Nelder–Mead finds the minimum of a bowl inside the unit box', async () => {
  const r = await nelderMead(async x => (x[0] - 0.3) ** 2 + (x[1] - 0.7) ** 2, [0.9, 0.1], { maxEvaluations: 300 });
  assert.ok(Math.abs(r.x[0] - 0.3) < 1e-3 && Math.abs(r.x[1] - 0.7) < 1e-3, `${r.x}`);
});

test('the penalty is zero only when every requirement has the target headroom', () => {
  const item = (margin, status = 'pass') => ({ margin, status });
  assert.equal(penalty({ items: [item(0.2), item(TARGET_MARGIN)] }), 0);
  assert.ok(penalty({ items: [item(0.2), item(0.05)] }) > 0);
  assert.equal(penalty({ items: [item(NaN, 'blocked')] }), 1);
});

test('the optimiser explores, refines and confirms, using only the assessment it is given', async () => {
  const design = defaultDesign();
  // A stand-in assessment: one requirement whose margin peaks when the elbow sits at 0.8°.
  const assess = async d => ({ items: [{ margin: 0.3 - Math.abs(d.cutoff.elbowDeg - 0.8), status: 'pass' }] });
  const r = await optimise(design, assess, { variables: [{ path: 'cutoff.elbowDeg', label: 'Elbow', min: -1.5, max: 1.5 }], maxEvaluations: 60, explore: 12, rays: 1 });
  assert.ok(r && Math.abs(r.best.values[0] - 0.8) < 0.15, `best ${r?.best.values[0]}`);
  assert.equal(r.confirmation.best, 0);
});
