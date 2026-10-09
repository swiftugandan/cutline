/** Checks a traced or imported beam against UN R149: aims it the way the regulation's instrumental method does, then
 * measures every point, line, zone and rule with the receiver's size, and reports margins. Requirements live in
 * ./r149.js; the measurements are the shared engine's (./engine.js). */

import { passingRequirements, drivingRequirements, RULES, SOURCE } from './r149.js';
import { measureRequirements, status, meets, weakest, MIN_RAYS } from './engine.js';
import { gridSize } from '../tracer.js';
import { binSolidAngle } from '../photometry.js';

/** @import { Histogram, AngleConvention } from '../types.js' */
/** @import { BeamClass } from './r149.js' */
/** @import { Design } from '../model.js' */
/** @import { Item } from './engine.js' */

/**
 * @typedef {{ value: number, rays: number }} Measurement
 * @typedef {{ dh: number, dv: number, method: string, notes: string[] }} Aim
 * @typedef {{ beamClass: BeamClass, traffic: 'right' | 'left', aim: Aim, items: Item[], pass: boolean, worst: Item | null, source: typeof SOURCE }} Evaluation
 * @typedef {{ beamClass: BeamClass, traffic: 'right' | 'left', ledFlux: number, aimMethod: 'threeLine' | 'line02D' }} EvaluationInput
 *   ledFlux: the source's objective flux in lumens, or 0 when it is not known (an imported file in absolute photometry).
 * @typedef {{ aim?: 'laboratory' | 'measured', shift?: { dh: number, dv: number } }} EvaluationOptions
 *   aim: 'laboratory' aims the beam by the regulation's method; 'measured' takes it as it is, moved by shift.
 */

const GROW_H = 2, GROW_V = 0.15;

/**
 * Beam access over the traced histograms, with optional aiming shift. Positions are in the aimed frame; the shift moves
 * the beam by (dh, dv), so the aimed beam at (h, v) is the traced beam at (h − dh, v − dv).
 */
export class Beam {
  /**
   * @param {Histogram[]} histograms wide first, fine second @param {AngleConvention} convention
   * @param {{ exact?: boolean }} [options] exact: the histograms hold an imported file, whose bins carry no statistical
   *   error; a bin without rays then lies outside the file, not in the dark.
   */
  constructor(histograms, convention, { exact = false } = {}) {
    this.wide = histograms[0];
    this.fine = histograms[1];
    this.convention = convention;
    this.exact = exact;
    /** The receiver's width in degrees. */
    this.receiverDeg = RULES.receiverDeg;
    this.dh = 0; this.dv = 0;
    this.wideCd = toCandela(this.wide, convention);
    this.fineCd = toCandela(this.fine, convention);
  }

  /** @param {Histogram} hist @param {number} h @param {number} v */
  static covers(hist, h, v) {
    const s = hist.spec;
    return h >= s.hMin && h < s.hMax && v >= s.vMin && v < s.vMax;
  }

  /**
   * Aimed positions of the fine grid's bin centres along one axis, from `from` to `to`.
   * @param {'h' | 'v'} axis @param {number} from @param {number} to
   */
  centres(axis, from, to) {
    const s = this.fine.spec, { nh, nv } = gridSize(s);
    const [min, step, n, shift] = axis === 'h' ? [s.hMin, s.step, nh, this.dh] : [s.vMin, s.vStep, nv, this.dv];
    /** @type {number[]} */
    const out = [];
    for (let k = 0; k < n; k++) { const x = min + (k + 0.5) * step + shift; if (x >= from - 1e-9 && x <= to + 1e-9) out.push(x); }
    return out;
  }

  /**
   * Flux, rays and solid angle of every bin whose centre falls inside a rectangle of half-sizes (hr, vr) about an aimed
   * direction, from the finest grid that holds the direction.
   * @param {number} h @param {number} v @param {number} hr @param {number} vr
   */
  box(h, v, hr, vr) {
    const th = h - this.dh, tv = v - this.dv;
    const hist = Beam.covers(this.fine, th, tv) ? this.fine : Beam.covers(this.wide, th, tv) ? this.wide : null;
    if (!hist) return { flux: 0, rays: 0, omega: 0, hist };
    const s = hist.spec, { nh, nv } = gridSize(s);
    // A small allowance keeps a bin centre that lies on the rectangle's edge from flipping in and out with rounding.
    const c0 = Math.max(0, Math.ceil((th - hr - s.hMin) / s.step - 0.5 - 1e-9)), c1 = Math.min(nh - 1, Math.floor((th + hr - s.hMin) / s.step - 0.5 + 1e-9));
    const r0 = Math.max(0, Math.ceil((tv - vr - s.vMin) / s.vStep - 0.5 - 1e-9)), r1 = Math.min(nv - 1, Math.floor((tv + vr - s.vMin) / s.vStep - 0.5 + 1e-9));
    let flux = 0, rays = 0, omega = 0;
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
      flux += hist.flux[r * nh + c];
      rays += hist.count[r * nh + c];
      const h0 = s.hMin + c * s.step, v0 = s.vMin + r * s.vStep;
      omega += binSolidAngle(h0, h0 + s.step, v0, v0 + s.vStep, this.convention);
    }
    if (omega === 0) {
      // Smaller than a bin: the bin holding the direction.
      const c = Math.min(nh - 1, Math.floor((th - s.hMin) / s.step)), r = Math.min(nv - 1, Math.floor((tv - s.vMin) / s.vStep));
      const h0 = s.hMin + c * s.step, v0 = s.vMin + r * s.vStep;
      return { flux: hist.flux[r * nh + c], rays: hist.count[r * nh + c], omega: binSolidAngle(h0, h0 + s.step, v0, v0 + s.vStep, this.convention), hist };
    }
    return { flux, rays, omega, hist };
  }

  /**
   * Flux, rays and solid angle of the fine-grid bins in a slanted strip: within hr of h across, and within vr of the
   * line through (h, v) with the given slope (degrees of v per degree of h). A strip along a rising cut-off gathers
   * many rays while keeping the edge sharp.
   * @param {number} h @param {number} v @param {number} hr @param {number} vr @param {number} slope
   */
  slantBox(h, v, hr, vr, slope) {
    const s = this.fine.spec, { nh, nv } = gridSize(s);
    const th = h - this.dh, tv = v - this.dv;
    const c0 = Math.max(0, Math.ceil((th - hr - s.hMin) / s.step - 0.5 - 1e-9)), c1 = Math.min(nh - 1, Math.floor((th + hr - s.hMin) / s.step - 0.5 + 1e-9));
    let flux = 0, rays = 0, omega = 0;
    for (let c = c0; c <= c1; c++) {
      const hc = s.hMin + (c + 0.5) * s.step, vc = tv + slope * (hc - th);
      const r0 = Math.max(0, Math.ceil((vc - vr - s.vMin) / s.vStep - 0.5 - 1e-9)), r1 = Math.min(nv - 1, Math.floor((vc + vr - s.vMin) / s.vStep - 0.5 + 1e-9));
      for (let r = r0; r <= r1; r++) {
        flux += this.fine.flux[r * nh + c]; rays += this.fine.count[r * nh + c];
        const h0 = s.hMin + c * s.step, v0 = s.vMin + r * s.vStep;
        omega += binSolidAngle(h0, h0 + s.step, v0, v0 + s.vStep, this.convention);
      }
    }
    return { flux, rays, omega };
  }

  /**
   * Intensity at an aimed direction, averaged over a rectangle of half-sizes (hr, vr).
   * @param {number} h @param {number} v @param {number} hr @param {number} vr
   */
  at(h, v, hr = this.receiverDeg / 2, vr = this.receiverDeg / 2) {
    const b = this.box(h, v, hr, vr);
    return b.omega > 0 ? b.flux / b.omega : 0;
  }

  /**
   * Intensity as the regulation's receiver sees it. Where too few rays reach the receiver for a trustworthy value, the
   * averaging area grows, mostly sideways because cut-offs run across, until it holds MIN_RAYS rays or reaches its
   * limit. The result carries the rays it rests on.
   * @param {number} h @param {number} v @param {number} [minRays]
   * @returns {Measurement}
   */
  measure(h, v, minRays = MIN_RAYS) {
    let hr = this.receiverDeg / 2, vr = this.receiverDeg / 2;
    let b = this.box(h, v, hr, vr);
    while (b.rays < minRays && hr < GROW_H) {
      hr = Math.min(GROW_H, hr * 1.5); vr = Math.min(GROW_V, vr * 1.5);
      b = this.box(h, v, hr, vr);
    }
    return { value: b.omega > 0 ? b.flux / b.omega : 0, rays: b.rays };
  }

  /** Lumens in an aimed angular box. @param {number} h0 @param {number} h1 @param {number} v0 @param {number} v1 */
  fluxIn(h0, h1, v0, v1) {
    const s = this.wide.spec, { nh, nv } = gridSize(s);
    let f = 0;
    for (let r = 0; r < nv; r++) for (let c = 0; c < nh; c++) {
      const h = s.hMin + (c + 0.5) * s.step + this.dh, v = s.vMin + (r + 0.5) * s.vStep + this.dv;
      if (h >= h0 && h < h1 && v >= v0 && v < v1) f += this.wide.flux[r * nh + c];
    }
    return f;
  }

  /**
   * Highest receiver-averaged intensity, and where (aimed frame). Found on the fine grid around its brightest bins, so a
   * single lucky bin cannot set it; outside the fine grid the wide grid's bins count as they are.
   * @param {(h: number, v: number) => boolean} [skip] directions to leave out, such as a zone with its own maximum
   * @returns {Measurement & { h: number, v: number }}
   */
  maximum(skip = () => false) {
    let best = { value: 0, rays: 0, h: 0, v: 0 };
    const ws = this.wide.spec, wn = gridSize(ws).nh;
    this.wideCd.forEach((val, i) => {
      const h = ws.hMin + ((i % wn) + 0.5) * ws.step + this.dh, v = ws.vMin + (Math.floor(i / wn) + 0.5) * ws.vStep + this.dv;
      if (val > best.value && !Beam.covers(this.fine, h - this.dh, v - this.dv) && !skip(h, v)) best = { value: val, rays: this.wide.count[i], h, v };
    });
    const fs = this.fine.spec, fn = gridSize(fs).nh;
    const peak = this.fineCd.reduce((a, x) => Math.max(a, x), 0);
    this.fineCd.forEach((val, i) => {
      if (val < 0.5 * peak) return;
      const h = fs.hMin + ((i % fn) + 0.5) * fs.step + this.dh, v = fs.vMin + (Math.floor(i / fn) + 0.5) * fs.vStep + this.dv;
      if (skip(h, v)) return;
      const b = this.box(h, v, this.receiverDeg / 2, this.receiverDeg / 2);
      const cd = b.omega > 0 ? b.flux / b.omega : 0;
      if (cd > best.value) best = { value: cd, rays: b.rays, h, v };
    });
    return best;
  }
}

/** @param {Histogram} hist @param {AngleConvention} convention */
function toCandela(hist, convention) {
  const s = hist.spec, { nh, nv } = gridSize(s);
  const out = new Float64Array(nh * nv);
  for (let r = 0; r < nv; r++) {
    const v0 = s.vMin + r * s.vStep;
    for (let c = 0; c < nh; c++) { const h0 = s.hMin + c * s.step; out[r * nh + c] = hist.flux[r * nh + c] / binSolidAngle(h0, h0 + s.step, v0, v0 + s.vStep, convention); }
  }
  return out;
}

/** Rays each scan cell needs before its log intensity counts: about 10% statistical error. */
export const SCAN_RAYS = 100;
/** Share of the steepest G that bounds the peak whose centre is the inflection point. */
export const PEAK_SHARE = 0.7;

/**
 * The steepest fall of log intensity along a scan, G = log I(x) − log I(x + 0.1°), and where it is (the inflection
 * point, at x + 0.05°). Only cells with SCAN_RAYS rays count, so the scan follows the cut-off down into its physical
 * tail and stops where sampling noise would take over.
 * @param {number[]} positions evenly spaced, ascending @param {(x: number) => { flux: number, rays: number, omega: number }} cell
 * @param {number} [smooth] cells averaged on each side of a position, to temper sampling noise along the scan
 */
function steepestFall(positions, cell, smooth = 0) {
  if (positions.length < 2) return { g: -Infinity, inflection: NaN };
  const cells = positions.map(cell);
  const logs = positions.map((_, i) => {
    let flux = 0, rays = 0, omega = 0;
    for (let k = Math.max(0, i - smooth); k <= Math.min(cells.length - 1, i + smooth); k++) { flux += cells[k].flux; rays += cells[k].rays; omega += cells[k].omega; }
    return rays >= SCAN_RAYS && flux > 0 ? Math.log10(flux / omega) : NaN;
  });
  const step = positions[1] - positions[0];
  const steps = Math.max(1, Math.round(0.1 / step));
  const raw = logs.map((l, i) => (i + steps < logs.length ? l - logs[i + steps] : NaN));
  /** G averaged over ±reach scan steps, so a single noisy pair of cells cannot pose as the cut-off. @param {number} reach */
  const smoothed = reach => raw.map((g, i) => {
    let sum = 0, n = 0;
    for (let j = i - reach; j <= i + reach; j++) if (Number.isFinite(raw[j])) { sum += raw[j]; n++; }
    return Number.isFinite(g) && n ? sum / n : NaN;
  });
  const gs = smoothed(1);
  let k = -1;
  for (let i = 0; i < gs.length; i++) if (Number.isFinite(gs[i]) && (k < 0 || gs[i] > gs[k])) k = i;
  if (k < 0) return { g: -Infinity, inflection: NaN };
  // The size of the steepest fall: a parabola through the largest value and its neighbours, so it does not jump with
  // the scan steps.
  let g = gs[k];
  const before = gs[k - 1], after = gs[k + 1];
  if (Number.isFinite(before) && Number.isFinite(after)) {
    const curve = before - 2 * g + after;
    if (curve < 0) { const shift = Math.max(-0.5, Math.min(0.5, (before - after) / (2 * curve))); g -= ((before - after) * shift) / 4; }
  }
  // Where it is: the centre of the peak, weighted by how far G rises above PEAK_SHARE of its maximum across the
  // contiguous stretch around the largest value. A soft cut-off has a broad, flat-topped peak, and the single largest
  // value would wander across it with sampling noise; its centre does not. The location uses G averaged more widely,
  // over ±0.1°, so one noisy cell at the dim end of the plateau cannot narrow the stretch around itself.
  const wide = smoothed(2);
  let m = -1;
  for (let i = 0; i < wide.length; i++) if (Number.isFinite(wide[i]) && (m < 0 || wide[i] > wide[m])) m = i;
  const floor = PEAK_SHARE * wide[m];
  let lo = m, hi = m;
  while (lo > 0 && wide[lo - 1] >= floor) lo--;
  while (hi + 1 < wide.length && wide[hi + 1] >= floor) hi++;
  let sw = 0, sx = 0;
  for (let i = lo; i <= hi; i++) { const w = wide[i] - floor + 1e-12; sw += w; sx += w * (positions[i] + positions[i + steps]) / 2; }
  return { g, inflection: sx / sw };
}

/**
 * A vertical scan upwards through the cut-off at h, one fine-grid row at a time (0.05°, the step R149 Annex 6 asks
 * for). Each cell is one row tall, close to the regulation's 30 mm detector at 25 m, and 2 × halfWidth wide to gather
 * rays. On the flat part of the cut-off, level from 1.5° to 3.5° by the linearity rule, a cell ±0.5° wide costs
 * nothing; on the rising part it stays at ±0.2°.
 * @param {Beam} beam @param {number} h @param {number} from @param {number} to @param {number} [halfWidth]
 */
export function verticalScan(beam, h, from, to, halfWidth = 0.5, slope = 0) {
  const s = beam.fine.spec;
  if (slope) return steepestFall(beam.centres('v', from, to), v => beam.slantBox(h, v, halfWidth, 0.4 * s.vStep, slope));
  return steepestFall(beam.centres('v', from, to), v => beam.box(h, v, halfWidth, 0.4 * s.vStep));
}

/**
 * A horizontal scan along v, one fine-grid column at a time, towards the dark side: −1 left, +1 right. A rising edge
 * crosses a horizontal line at a slant, so its gradient there is gentle and sampling noise matters more: each position
 * averages 0.15° along the line, about the width of the regulation's 30 mm detector at 25 m plus one step.
 * @param {Beam} beam @param {number} v @param {number} from @param {number} to @param {number} towards
 */
function horizontalScan(beam, v, from, to, towards) {
  const s = beam.fine.spec;
  const cell = /** @param {number} h */ h => beam.box(h, v, 0.4 * s.step, 0.4 * s.vStep);
  if (towards > 0) return steepestFall(beam.centres('h', from, to), cell, 1);
  // Walking leftwards from the bright side: scan the mirrored positions.
  const r = steepestFall(beam.centres('h', from, to).map(x => -x).reverse(), x => cell(-x), 1);
  return { g: r.g, inflection: -r.inflection };
}


/** What the evaluator needs from a design. @param {Design} design @returns {EvaluationInput} */
export function evaluationInput(design) {
  return { beamClass: design.beamClass, traffic: design.traffic, ledFlux: design.led.flux, aimMethod: design.cutoff.aimMethod };
}

/** Whether a class is a passing beam. @param {BeamClass} cls */
const passingClass = cls => cls === 'C' || cls === 'V';

/**
 * Aims a beam the way R149's laboratory does and checks the cut-off it aims by. A passing beam is aimed by its cut-off
 * (Annex 6); a driving beam has its maximum centred on H-V (Annex 5 §3.1.2). Moves the beam in place.
 * @param {Beam} beam @param {EvaluationInput} design
 * @returns {{ aim: Aim, items: Item[] }} the aim, and the cut-off's sharpness and linearity for a passing beam
 */
export function aimR149(beam, design) {
  const s = design.traffic === 'right' ? 1 : -1;
  /** @type {Item[]} */
  const items = [];
  /** @type {Aim} */
  const aim = { dh: 0, dv: 0, method: '', notes: [] };
  if (!passingClass(design.beamClass)) {
    const m = beam.maximum();
    beam.dh = -m.h; beam.dv = -m.v;
    aim.dh = beam.dh; aim.dv = beam.dv;
    aim.method = 'maximum centred on H-V (Annex 5 §3.1.2)';
    return { aim, items };
  }
  // Vertical aim: the inflection of the cut-off at 2.5° on the driver's side goes to line B.
  const scan = verticalScan(beam, s * RULES.sharpnessScanH, -4, 2);
  if (Number.isFinite(scan.inflection)) {
    beam.dv = RULES.lineB - scan.inflection;
    aim.dv = beam.dv;
  } else aim.notes.push('No cut-off was found on the 2.5° scan; the beam was not aimed vertically.');
  // Horizontal aim by the applicant's method: (a) the 0.2°D line, or (b) three vertical scans on the kerb side.
  const H = RULES.horizontalAim;
  if (design.aimMethod === 'threeLine') {
    // A first pass with narrow scans finds the rising edge's slope. The second scans along strips that follow that
    // slope ±0.4° across, which gathers far more rays for the same sharpness, so the inflections, and the aim the
    // line through them gives, hold still between traces.
    const first = H.threeLineH.map(h => ({ h: s * h, ...verticalScan(beam, s * h, -2, 2, 0.2) }));
    const rough = fitLine(first).slope;
    const scans = Number.isFinite(rough) ? H.threeLineH.map(h => ({ h: s * h, ...verticalScan(beam, s * h, -2, 2, 0.4, rough) })) : first;
    if (scans.every(x => x.g >= H.minG && Number.isFinite(x.inflection))) {
      const { mh, mv, slope } = fitLine(scans);
      // Where the fitted line meets line B goes onto V-V.
      if (Math.abs(slope) > 1e-6) beam.dh = -(mh + (RULES.lineB - mv) / slope);
      else aim.notes.push('The three inflection points lie level, so the line through them never meets line B; the beam was not aimed sideways.');
    } else aim.notes.push(`A scan at 1°, 2° or 3°${s > 0 ? 'R' : 'L'} found no gradient of ${H.minG}; the beam was not aimed sideways.`);
    aim.method = 'three lines (Annex 6 §2.3.2.1 b)';
  } else {
    const line = horizontalScan(beam, H.lineAV, -5, 5, -s);
    if (line.g >= H.minG) beam.dh = s * H.lineAH - line.inflection;
    else aim.notes.push(`The 0.2°D line found no gradient of ${H.minG}; the beam was not aimed sideways.`);
    aim.method = '0.2°D line (Annex 6 §2.3.2.1 a)';
  }
  aim.dh = beam.dh;
  // Aiming should move the beam only slightly; a large shift means the cut-off is not where the design intends.
  if (Math.abs(aim.dv) > 0.25) aim.notes.push(`Aiming moved the beam ${Math.abs(aim.dv).toFixed(2)}° ${aim.dv > 0 ? 'up' : 'down'}: the cut-off sits away from the intended 0.57°D.`);
  if (Math.abs(aim.dh) > 0.75) aim.notes.push(`Aiming moved the beam ${Math.abs(aim.dh).toFixed(2)}° sideways: the elbow sits away from V-V.`);
  items.push(...cutoffQuality(beam, s));
  return { aim, items };
}

/** A least-squares line through scan inflections. @param {{ h: number, inflection: number }[]} xs */
function fitLine(xs) {
  const n = xs.length, mh = xs.reduce((a, x) => a + x.h, 0) / n, mv = xs.reduce((a, x) => a + x.inflection, 0) / n;
  const sxx = xs.reduce((a, x) => a + (x.h - mh) ** 2, 0), sxy = xs.reduce((a, x) => a + (x.h - mh) * (x.inflection - mv), 0);
  return { mh, mv, slope: sxy / sxx };
}

/**
 * Sharpness and linearity of a passing beam's cut-off, in the beam as it is now aimed (Annex 6 §2.2).
 * @param {Beam} beam @param {number} s 1 for right-hand traffic, −1 for left
 * @returns {Item[]}
 */
export function cutoffQuality(beam, s) {
  const g = verticalScan(beam, s * RULES.sharpnessScanH, -4, 2).g;
  const gm = Math.min((g - RULES.sharpness.min) / RULES.sharpness.min, (RULES.sharpness.max - g) / RULES.sharpness.max);
  // Linearity: the inflection points at 1.5°, 2.5° and 3.5° lie within 0.2° of each other.
  const inflections = RULES.linearity.h.map(h => verticalScan(beam, s * h, -3, 1.5).inflection);
  const spread = Math.max(...inflections) - Math.min(...inflections);
  const lm = (RULES.linearity.maxSpread - spread) / RULES.linearity.maxSpread;
  return [
    { id: 'Sharpness', group: 'cutoff', label: `Cut-off sharpness at 2.5°${s > 0 ? 'L' : 'R'}`, requirement: `G from ${RULES.sharpness.min} to ${RULES.sharpness.max}`, value: g, unit: 'G', margin: Number.isFinite(gm) ? gm : -1, error: 0, status: status(Number.isFinite(gm) ? gm : -1), cite: RULES.sharpnessCite, h: s * RULES.sharpnessScanH, v: RULES.lineB },
    { id: 'Linearity', group: 'cutoff', label: 'Cut-off linearity, 1.5° to 3.5°', requirement: `inflections within ${RULES.linearity.maxSpread}°`, value: spread, unit: '°', margin: Number.isFinite(lm) ? lm : -1, error: 0, status: status(Number.isFinite(lm) ? lm : -1), cite: RULES.linearityCite },
  ];
}

/**
 * The minimum flux of a Class C or V passing beam: 1,000 lm of objective source flux, or enough flux in Zones I and
 * II of the aimed beam (§4.5.3.2, Tables 3a and 3b).
 * @param {Beam} beam @param {number} sourceFlux lumens, or 0 when unknown
 * @returns {Item}
 */
export function fluxRule(beam, sourceFlux) {
  const F = RULES.flux;
  const zoneI = beam.fluxIn(F.zoneI.h0, F.zoneI.h1, F.zoneI.v0, F.zoneI.v1), zoneII = beam.fluxIn(F.zoneII.h0, F.zoneII.h1, F.zoneII.v0, F.zoneII.v1);
  const bySource = sourceFlux > 0 ? (sourceFlux - F.objective) / F.objective : -Infinity;
  const byZones = Math.min((zoneI - F.zoneI.min) / F.zoneI.min, (zoneII - F.zoneII.min) / F.zoneII.min);
  const m = Math.max(bySource, byZones);
  return { id: 'Flux', group: 'flux', label: 'Minimum flux', requirement: `source ≥ ${F.objective} lm, or Zone I ≥ ${F.zoneI.min} lm and Zone II ≥ ${F.zoneII.min} lm`, value: bySource >= byZones ? sourceFlux : zoneI, unit: 'lm', margin: m, error: 0, status: status(m), cite: RULES.fluxCite };
}

/**
 * Evaluates a beam against R149 for one class and traffic side. The beam is aimed in place.
 * @param {Beam} beam @param {EvaluationInput} design @param {EvaluationOptions} [options]
 * @returns {Evaluation}
 */
export function evaluateBeam(beam, design, options = {}) {
  const s = design.traffic === 'right' ? 1 : -1;
  const passing = passingClass(design.beamClass);
  /** @type {{ aim: Aim, items: Item[] }} */
  let aimed;
  if (options.aim === 'measured') {
    beam.dh = options.shift?.dh ?? 0; beam.dv = options.shift?.dv ?? 0;
    aimed = { aim: { dh: beam.dh, dv: beam.dv, method: 'as measured', notes: [] }, items: passing ? cutoffQuality(beam, s) : [] };
  } else aimed = aimR149(beam, design);
  const requirements = passing ? passingRequirements(/** @type {'C' | 'V'} */ (design.beamClass)) : drivingRequirements(/** @type {'A' | 'B'} */ (design.beamClass));
  const items = [
    ...aimed.items,
    ...measureRequirements(beam, requirements, { mirror: s < 0, tolerance: passing ? 0 : RULES.drivingTolerance, passing }),
  ];
  if (passing) items.push(fluxRule(beam, design.ledFlux));
  return { beamClass: design.beamClass, traffic: design.traffic, aim: aimed.aim, items, pass: meets(items), worst: weakest(items), source: SOURCE };
}

/**
 * @param {EvaluationInput} design @param {Histogram[]} histograms @param {AngleConvention} convention
 * @returns {Evaluation}
 */
export function evaluate(design, histograms, convention) {
  return evaluateBeam(new Beam(histograms, convention), design);
}
