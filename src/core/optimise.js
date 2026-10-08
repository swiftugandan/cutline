/** Optimiser: searches chosen design values for the design that clears every R149 requirement with the most headroom.
 * The search is Nelder–Mead in the unit box of the chosen ranges, with every candidate traced on the same rays
 * (common random numbers), so differences between candidates are not sampling noise. */

import { DESIGN_SPEC, getPath, setPath, validateDesign } from './model.js';
import { ValidationError } from './spec.js';
import { Rng } from './rng.js';

/** @import { Design } from './model.js' */
/** @import { NumberSpec, Spec } from './spec.js' */
/** @import { Evaluation } from './regulation/evaluate.js' */

/**
 * @typedef {{ path: string, label: string, min: number, max: number }} Variable
 * @typedef {(design: Design, rays: number, seed: number) => Promise<Evaluation | null>} Assess
 *   Traces a design with the given rays and seed and evaluates it; null when the work was cancelled.
 * @typedef {{ values: number[], penalty: number, evaluation: Evaluation }} Point
 * @typedef {{ variables: Variable[], history: number[], evaluations: number, start: Point, best: Point, design: Design,
 *   confirmation: { start: number, best: number, noise: number } }} OptimiseResult
 */

/** Thrown inside a search when the tracer reports that the work was cancelled. */
class Cancelled extends Error {}

/** The headroom every requirement should have; less is penalised. */
export const TARGET_MARGIN = 0.15;

/**
 * How far a design falls short: the sum over requirements of the squared shortfall below TARGET_MARGIN. 0 means every
 * requirement holds with that headroom. A requirement that cannot be judged counts as a full shortfall.
 * @param {Evaluation} evaluation
 */
export function penalty(evaluation) {
  let p = 0;
  for (const item of evaluation.items) {
    if (item.status === 'blocked' || !Number.isFinite(item.margin)) { p += 1; continue; }
    const short = TARGET_MARGIN - Math.max(-2, item.margin);
    if (short > 0) p += short * short;
  }
  return p;
}

/** Values worth searching, with ranges, by optics type. */
const CANDIDATES = {
  projector: [
    ['led.offset', -2.5, 0.5], ['cutoff.verticalDeg', -0.6, -0.15], ['cutoff.elbowDeg', -1.5, 1.5],
    ['optics.reflector.focalDistance', 36, 60], ['optics.reflector.semiMajor', 22, 45], ['optics.reflector.widthRatio', 1.02, 1.35],
    ['optics.reflector.frontCut', 15, 45], ['optics.shield.curvature', 0, 0.01], ['optics.lens.diameter', 50, 80],
    ['optics.lens.radius', 28, 50], ['optics.lens.conic', -1, -0.3], ['optics.lens.textureDeg', 0.08, 0.3],
    ['optics.lens.signLightHeight', 0, 2.5], ['optics.lens.signLightMinDeg', 1.5, 3.5], ['optics.lens.signLightMaxDeg', 3.5, 7],
    ['optics.lens.defocus', -1, 1.5], ['cover.haze', 0, 0.02],
  ],
  reflector: [
    ['cutoff.verticalDeg', -0.6, 0], ['cutoff.elbowDeg', -1.5, 1.5], ['optics.focalLength', 14, 30],
    ['optics.spreadDeg', 6, 24], ['optics.fanPower', 1, 3], ['optics.dropDeg', 0, 1.5], ['optics.rowDropDeg', 0, 6], ['optics.wingDropDeg', 0, 6], ['optics.facetSpreadDeg', 1, 10], ['optics.overheadHeight', 0.2, 6], ['optics.overheadDeg', 1, 6],
    ['optics.slopeErrorMrad', 1, 6], ['cover.haze', 0, 0.03],
  ],
};

/** @param {Design} design @returns {Variable[]} */
export function variablesFor(design) {
  return CANDIDATES[design.optics.type].map(([path, min, max]) => ({ path: /** @type {string} */ (path), label: labelAt(/** @type {string} */ (path)), min: /** @type {number} */ (min), max: /** @type {number} */ (max) }));
}

/** The spec of a design field; a union's variants are searched for the key. @param {string} path @returns {Spec | undefined} */
function specAt(path) {
  /** @type {Spec | undefined} */
  let spec = DESIGN_SPEC;
  for (const key of path.split('.')) {
    if (spec?.kind === 'object') spec = spec.fields[key];
    else if (spec?.kind === 'union') spec = Object.values(spec.variants).map(v => v.fields[key]).find(Boolean);
    else return undefined;
  }
  return spec;
}

/** @param {string} path */
function labelAt(path) {
  const spec = specAt(path);
  return spec && 'label' in spec ? spec.label : path;
}

/**
 * A Latin hypercube in the unit box: n points, each dimension cut into n strata with one point in each.
 * @param {number} n @param {number} k @param {Rng} rng
 * @returns {number[][]}
 */
export function latinHypercube(n, k, rng) {
  const points = Array.from({ length: n }, () => new Array(k).fill(0));
  for (let d = 0; d < k; d++) {
    const order = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(rng.next() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    for (let i = 0; i < n; i++) points[i][d] = (order[i] + rng.next()) / n;
  }
  return points;
}

/**
 * Nelder–Mead minimisation in the unit box. Points outside the box are clamped into it.
 * @param {(x: number[]) => Promise<number>} f @param {number[]} x0 in [0, 1]^k
 * @param {{ maxEvaluations: number, step?: number, tolerance?: number, onEvaluate?: (best: number, count: number) => Promise<boolean> }} options
 * @returns {Promise<{ x: number[], value: number, evaluations: number, stopped: boolean }>}
 */
export async function nelderMead(f, x0, { maxEvaluations, step = 0.15, tolerance = 1e-6, onEvaluate }) {
  const k = x0.length;
  const clamp = /** @param {number[]} x */ x => x.map(v => Math.min(1, Math.max(0, v)));
  let evaluations = 0, best = Infinity, stopped = false;
  /** @param {number[]} x */
  const evaluateAt = async x => {
    const value = await f(clamp(x));
    evaluations++;
    best = Math.min(best, value);
    if (onEvaluate && !(await onEvaluate(best, evaluations))) stopped = true;
    return value;
  };
  /** @type {{ x: number[], v: number }[]} */
  const simplex = [{ x: clamp(x0), v: await evaluateAt(x0) }];
  for (let i = 0; i < k && !stopped; i++) {
    const x = [...x0];
    x[i] = x[i] + step <= 1 ? x[i] + step : x[i] - step;
    simplex.push({ x: clamp(x), v: await evaluateAt(x) });
  }
  while (!stopped && evaluations < maxEvaluations) {
    simplex.sort((a, b) => a.v - b.v);
    if (simplex[0].v === 0) break;
    const spread = Math.abs(simplex[k].v - simplex[0].v);
    const size = Math.max(...simplex.slice(1).map(p => Math.max(...p.x.map((v, i) => Math.abs(v - simplex[0].x[i])))));
    if (spread <= tolerance * (Math.abs(simplex[0].v) + 1e-12) && size < 1e-3) break;
    const centroid = Array.from({ length: k }, (_, i) => simplex.slice(0, k).reduce((s, p) => s + p.x[i], 0) / k);
    const worst = simplex[k];
    /** @param {number} t */
    const along = t => clamp(centroid.map((c, i) => c + t * (worst.x[i] - c)));
    const reflected = along(-1), vr = await evaluateAt(reflected);
    if (vr < simplex[0].v) {
      const expanded = along(-2), ve = await evaluateAt(expanded);
      simplex[k] = ve < vr ? { x: expanded, v: ve } : { x: reflected, v: vr };
    } else if (vr < simplex[k - 1].v) {
      simplex[k] = { x: reflected, v: vr };
    } else {
      const contracted = vr < worst.v ? along(-0.5) : along(0.5);
      const vc = await evaluateAt(contracted);
      if (vc < Math.min(vr, worst.v)) simplex[k] = { x: contracted, v: vc };
      else {
        // Shrink towards the best point.
        for (let j = 1; j <= k && !stopped; j++) {
          const x = clamp(simplex[j].x.map((v, i) => simplex[0].x[i] + 0.5 * (v - simplex[0].x[i])));
          simplex[j] = { x, v: await evaluateAt(x) };
        }
      }
    }
  }
  simplex.sort((a, b) => a.v - b.v);
  return { x: simplex[0].x, value: simplex[0].v, evaluations, stopped };
}

/**
 * Optimises a design for R149 compliance in two phases. Exploration samples a Latin hypercube across the ranges, so
 * the search is not tied to the starting design; refinement runs Nelder–Mead from the best point found. The result is
 * confirmed on two fresh seeds, so the reported improvement can be compared with sampling noise.
 * @param {Design} design @param {Assess} assess
 * @param {{ variables: Variable[], maxEvaluations?: number, explore?: number, seeds?: number, rays: number }} options
 *   explore: points sampled before refining, counted in maxEvaluations; 0 refines from the design as it is.
 *   seeds: random seeds each candidate is traced with; it is judged by the worst. One seed lets a long search find
 *   designs that only pass thanks to that seed's noise; two make that much harder.
 * @param {(best: number, count: number) => Promise<boolean>} [progress] return false to stop
 * @returns {Promise<OptimiseResult | null>} null when stopped before any result
 */
export async function optimise(design, assess, { variables, maxEvaluations = 200, explore = 0, seeds = 1, rays }, progress) {
  if (!variables.length) throw new Error('Choose at least one value to optimise.');
  for (const v of variables) if (!(v.max > v.min)) throw new Error(`The range for ${v.label} needs a maximum above its minimum.`);
  const seed = design.simulation.seed;
  /** @param {number[]} x */
  const toDesign = x => {
    const d = structuredClone(design);
    variables.forEach((v, i) => {
      let value = v.min + x[i] * (v.max - v.min);
      if (/** @type {NumberSpec | undefined} */ (specAt(v.path))?.integer) value = Math.round(value);
      setPath(d, v.path, value);
    });
    return d;
  };
  /** @param {Design} d @param {number} r @param {number} s */
  const judged = async (d, r, s) => {
    const evaluation = await assess(d, r, s);
    if (!evaluation) throw new Cancelled();
    return evaluation;
  };
  /** @param {number[]} x */
  const penaltyAt = async x => {
    try {
      const d = validateDesign(toDesign(x));
      let worst = 0;
      for (let k = 0; k < seeds; k++) worst = Math.max(worst, penalty(await judged(d, rays, (seed + k * 65537) >>> 0)));
      return worst;
    }
    catch (error) { if (error instanceof ValidationError) return Infinity; throw error; }
  };
  const x0 = variables.map(v => Math.min(1, Math.max(0, (/** @type {number} */ (getPath(design, v.path)) - v.min) / (v.max - v.min))));
  /** @type {number[]} */
  const history = [];
  let result;
  try {
    let start = x0, startValue = Infinity, count = 0, stopped = false;
    if (explore > 0) {
      const samples = latinHypercube(explore, variables.length, new Rng(seed ^ 0x5bd1e995));
      for (const x of [x0, ...samples]) {
        const value = await penaltyAt(x);
        if (value < startValue) { startValue = value; start = x; }
        history.push(startValue);
        count++;
        if (progress && !(await progress(startValue, count))) { stopped = true; break; }
      }
    }
    result = stopped
      ? { x: start, value: startValue, evaluations: count, stopped }
      : await nelderMead(penaltyAt, start, {
        maxEvaluations: Math.max(variables.length + 2, maxEvaluations - count), step: explore > 0 ? 0.08 : 0.15,
        onEvaluate: async (best, n) => { const b = Math.min(best, startValue); history.push(b); return progress ? progress(b, count + n) : true; },
      });
    if (!stopped) result = { ...result, evaluations: result.evaluations + count };
  } catch (error) {
    if (error instanceof Cancelled) return null;
    throw error;
  }
  if (!Number.isFinite(result.value) && result.stopped) return null;
  const best = validateDesign(toDesign(result.x));
  // Confirm on two fresh seeds at twice the rays: the noise is the RMS difference between seeds.
  const fresh = [(seed + 7919) >>> 0, (seed + 104729) >>> 0];
  /** @type {Evaluation[]} */
  const startE = [], bestE = [];
  try {
    for (const s of fresh) { startE.push(await judged(design, rays * 2, s)); bestE.push(await judged(best, rays * 2, s)); }
  } catch (error) {
    if (error instanceof Cancelled) return null;
    throw error;
  }
  const [s0, s1] = startE.map(penalty), [b0, b1] = bestE.map(penalty);
  return {
    variables, history, evaluations: result.evaluations, design: best,
    start: { values: variables.map(v => /** @type {number} */ (getPath(design, v.path))), penalty: (s0 + s1) / 2, evaluation: startE[0] },
    best: { values: variables.map(v => /** @type {number} */ (getPath(best, v.path))), penalty: (b0 + b1) / 2, evaluation: bestE[0] },
    confirmation: { start: (s0 + s1) / 2, best: (b0 + b1) / 2, noise: Math.sqrt(((s0 - s1) ** 2 + (b0 - b1) ** 2) / 2) },
  };
}
