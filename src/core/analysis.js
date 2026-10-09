/** Everything the app shows about a traced beam: the R149 evaluation, the aimed beam as candela per bin, and light on
 * the road. It runs in a worker so the page stays responsive while a 20-million-ray beam is checked. */

import { CONVENTION } from './lamp.js';
import { isPassing } from './model.js';
import { binSolidAngle } from './photometry.js';
import { gridSize } from './tracer.js';
import { roadIlluminance, designRoad } from './road.js';
import { evaluate, evaluationInput, Beam } from './regulation/evaluate.js';
import { RULES } from './regulation/r149.js';

/** @import { Design } from './model.js' */
/** @import { GridSpec, Histogram, Bucket, AngleConvention } from './types.js' */
/** @import { Evaluation } from './regulation/evaluate.js' */
/** @import { RoadResult } from './road.js' */

/**
 * @typedef {{ spec: GridSpec, candela: Float64Array }} CandelaLayer  Candela per bin, positioned in the aimed frame.
 * @typedef {{ evaluation: Evaluation, layers: CandelaLayer[], road: RoadResult, peak: { value: number, h: number, v: number },
 *   emitted: number, ledger: Record<Bucket, number>, rays: number }} Analysis
 * @typedef {{ histograms: Histogram[], emitted: number, ledger: Record<Bucket, number>, rays: number }} BeamData
 */

/**
 * The full analysis of a traced beam.
 * @param {Design} design @param {BeamData} data
 * @returns {Analysis}
 */
export function analyse(design, data) {
  const evaluation = evaluate(evaluationInput(design), data.histograms, CONVENTION);
  const { dh, dv } = evaluation.aim;
  const beam = new Beam(data.histograms, CONVENTION);
  beam.dh = dh; beam.dv = dv;
  const layers = data.histograms.map(hist => ({
    spec: { ...hist.spec, hMin: hist.spec.hMin + dh, hMax: hist.spec.hMax + dh, vMin: hist.spec.vMin + dv, vMax: hist.spec.vMax + dv },
    candela: displayCandela(hist, CONVENTION, hist === data.histograms[1] ? 1 : 0),
  }));
  // On the road the aimed beam is raised so a passing beam's cut-off sits on the horizon; the vehicle's own downward
  // aim then tilts it back. A 1% aim puts the cut-off where the laboratory did, on line B.
  const lift = isPassing(design) ? -RULES.lineB : 0;
  const road = roadIlluminance(designRoad(design), (h, v) => beam.at(h, v - lift, 0, 0));
  return { evaluation, layers, road, peak: beam.maximum(), emitted: data.emitted, ledger: data.ledger, rays: data.rays };
}

/** Rays a displayed bin should rest on, so iso-candela lines follow the beam and not its sampling noise. */
const DISPLAY_RAYS = 64;
/** Box half-sizes in bins, tried in turn until one holds DISPLAY_RAYS rays. Growth is mostly sideways, along the cut-off. */
const GROWTH = [[0, 0], [1, 1], [2, 1], [3, 1], [5, 2], [8, 2], [12, 3], [18, 4]];

/**
 * Candela per bin for drawing: each bin's intensity averaged over the smallest box around it that holds enough rays.
 * On the fine grid the smallest box is three bins square, about the regulation's receiver. Summed-area tables make
 * every box a constant-time lookup.
 * @param {Histogram} hist @param {AngleConvention} convention @param {number} minHalf the smallest half-size, in bins
 */
export function displayCandela(hist, convention, minHalf) {
  const s = hist.spec, { nh, nv } = gridSize(s);
  const w = nh + 1;
  const flux = new Float64Array(w * (nv + 1)), rays = new Float64Array(w * (nv + 1)), omega = new Float64Array(w * (nv + 1));
  for (let r = 0; r < nv; r++) {
    const v0 = s.vMin + r * s.vStep;
    let f = 0, n = 0, o = 0;
    for (let c = 0; c < nh; c++) {
      const i = r * nh + c, h0 = s.hMin + c * s.step;
      f += hist.flux[i]; n += hist.count[i]; o += binSolidAngle(h0, h0 + s.step, v0, v0 + s.vStep, convention);
      const k = (r + 1) * w + c + 1;
      flux[k] = flux[k - w] + f; rays[k] = rays[k - w] + n; omega[k] = omega[k - w] + o;
    }
  }
  /** @param {Float64Array} t @param {number} c0 @param {number} c1 @param {number} r0 @param {number} r1 */
  const sum = (t, c0, c1, r0, r1) => t[(r1 + 1) * w + c1 + 1] - t[r0 * w + c1 + 1] - t[(r1 + 1) * w + c0] + t[r0 * w + c0];
  const out = new Float64Array(nh * nv);
  const steps = GROWTH.filter(([a, b]) => a >= minHalf && b >= minHalf);
  for (let r = 0; r < nv; r++) for (let c = 0; c < nh; c++) {
    let value = 0;
    for (const [a, b] of steps) {
      const c0 = Math.max(0, c - a), c1 = Math.min(nh - 1, c + a), r0 = Math.max(0, r - b), r1 = Math.min(nv - 1, r + b);
      value = sum(flux, c0, c1, r0, r1) / sum(omega, c0, c1, r0, r1);
      if (sum(rays, c0, c1, r0, r1) >= DISPLAY_RAYS) break;
    }
    out[r * nh + c] = value;
  }
  return out;
}

/** The evaluation alone, for the optimiser. @param {Design} design @param {BeamData} data @returns {Evaluation} */
export function evaluateBeam(design, data) {
  return evaluate(evaluationInput(design), data.histograms, CONVENTION);
}

/**
 * Angles of the grid a traced design is exported on as an IES file: 0.1° steps across the fine grid, where the
 * cut-off and the hot spot are, and 0.5° beyond it, out to the wide grid's edges.
 */
export function exportGridAngles() {
  /** @param {number} lo @param {number} fineLo @param {number} fineHi @param {number} hi */
  const axis = (lo, fineLo, fineHi, hi) => {
    const out = [];
    for (let x = lo; x < fineLo - 1e-9; x += 0.5) out.push(+x.toFixed(3));
    for (let x = fineLo; x < fineHi - 1e-9; x += 0.1) out.push(+x.toFixed(3));
    for (let x = fineHi; x <= hi + 1e-9; x += 0.5) out.push(+x.toFixed(3));
    return out;
  };
  return { horizontal: axis(-60, -20, 20, 60), vertical: axis(-30, -6, 5, 30) };
}

/**
 * Candela at a direction from display layers, by bilinear interpolation between bin centres in the finest layer that
 * holds the direction.
 * @param {CandelaLayer[]} layers @param {number} h @param {number} v
 */
export function layerCandela(layers, h, v) {
  for (const layer of [...layers].sort((a, b) => a.spec.step * a.spec.vStep - b.spec.step * b.spec.vStep)) {
    const s = layer.spec, { nh, nv } = gridSize(s);
    if (h < s.hMin || h > s.hMax || v < s.vMin || v > s.vMax) continue;
    const x = Math.min(nh - 1, Math.max(0, (h - s.hMin) / s.step - 0.5)), y = Math.min(nv - 1, Math.max(0, (v - s.vMin) / s.vStep - 0.5));
    const c0 = Math.min(nh - 2, Math.floor(x)), r0 = Math.min(nv - 2, Math.floor(y)), tx = x - c0, ty = y - r0;
    const at = (/** @type {number} */ r, /** @type {number} */ c) => layer.candela[r * nh + c];
    return (1 - ty) * ((1 - tx) * at(r0, c0) + tx * at(r0, c0 + 1)) + ty * ((1 - tx) * at(r0 + 1, c0) + tx * at(r0 + 1, c0 + 1));
  }
  return 0;
}
