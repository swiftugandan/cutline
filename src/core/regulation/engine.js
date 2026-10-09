/** The regulation engine: measures any regulation's requirements in an aimed beam and reports margins. A requirement
 * is data (see the kinds below); every pack, and the user's own targets, go through the same measurements. Aiming is
 * done before this, by the rule the pack names (see aim.js and evaluate.js). */

/** @import { Beam, Measurement } from './evaluate.js' */

/**
 * @typedef {'pass' | 'near' | 'fail' | 'blocked' | 'nodata' | 'info'} Status
 *   'blocked': a relative limit whose reference fails, so it cannot be judged yet. 'nodata': the requirement lies
 *   outside the angles an imported file covers. 'info': a requirement Cutline lists but cannot check from intensity.
 * @typedef {'cutoff' | 'glare' | 'signs' | 'beam' | 'foreground' | 'flux' | 'axis' | 'field' | 'target' | 'other'} Group
 *   What a requirement protects. The first six are a headlamp's; 'axis' and 'field' are a signal lamp's reference axis
 *   and the field around it; 'target' marks the user's own targets.
 * @typedef {{ id: string, label: string, group: Group, requirement: string, value: number, unit: string, margin: number,
 *   error: number, status: Status, cite: string, h?: number, v?: number, polygon?: number[], line?: [number, number, number, number], partial?: boolean }} Item
 *   margin is the relative headroom: (value − min)/min or (max − value)/max; negative fails. error is the value's relative
 *   statistical error from the rays it rests on (0 for an imported file). Positions are in the aimed frame. partial:
 *   a line or zone that runs beyond an imported file's angles, judged only where the file has data.
 */

/**
 * Geometry a limit applies to. Coordinates are degrees for right-hand traffic (headlamps) or with H outwards (signal
 * lamps); the engine mirrors them when asked.
 * @typedef {{ kind: 'point', h: number, v: number }} PointAt
 * @typedef {{ kind: 'line', h0: number, v0: number, h1: number, v1: number }} LineAt
 * @typedef {{ kind: 'zone', polygon: number[] }} ZoneAt
 * @typedef {PointAt | LineAt | ZoneAt} At
 * @typedef {{ id: string, cite: string, label?: string, group?: Group, min?: number, max?: number, when?: string[], replaces?: string, overrides?: 'imax', inSum?: string, sumKey?: string }} Base
 *   when: the conditions (ids in the pack's CONDITIONS) that must all hold for the requirement to apply. replaces: the
 *   id of a requirement this one stands in for when it applies. overrides 'imax': inside this zone its own maximum
 *   holds instead of the general maximum intensity. sumKey: names a sum, so its variants share one name; inSum: the
 *   sumKey of the sum a point belongs to, for the point rules below.
 * @typedef {Base & PointAt} PointRequirement
 * @typedef {Base & LineAt} LineRequirement   Everywhere along the line: its weakest position for a minimum, its brightest for a maximum.
 * @typedef {Base & ZoneAt & { measure?: 'everywhere' | 'brightest' }} ZoneRequirement
 *   Everywhere inside the polygon, or, with measure 'brightest', the brightest position inside it.
 * @typedef {Base & { kind: 'sum', points: number[] }} SumRequirement
 * @typedef {Base & { kind: 'relative', at: At, factor: number, of: string, bound: 'min' | 'max' }} RelativeRequirement
 *   A limit of `factor` times another requirement's measured value, or of the maximum intensity when `of` is 'imax'.
 * @typedef {Base & { kind: 'imax', spotRadiusDeg?: number }} ImaxRequirement
 *   spotRadiusDeg: spots smaller than a cone of this radius do not count; the maximum is read through a receiver of
 *   the same area.
 * @typedef {Base & { kind: 'distribution', reference: { min: number, max?: number }, points: { h: number, v: number, percent: number }[], between?: string }} DistributionRequirement
 *   A standard light distribution: at each point at least percent/100 of the reference minimum. With `between`, every
 *   direction inside the grid must also reach the lowest minimum at the corners of the grid cell around it.
 * @typedef {Base & { kind: 'note', text: string }} NoteRequirement
 * @typedef {PointRequirement | LineRequirement | ZoneRequirement | SumRequirement | RelativeRequirement | ImaxRequirement | DistributionRequirement | NoteRequirement} Requirement
 */

/**
 * The requirements that apply to a lamp, given the conditions declared for it: those whose conditions all hold, less
 * any that an applying variant replaces.
 * @param {Requirement[]} requirements @param {Iterable<string>} conditions
 * @returns {Requirement[]}
 */
export function applicable(requirements, conditions) {
  const declared = new Set(conditions);
  const kept = requirements.filter(r => !r.when || r.when.every(c => declared.has(c)));
  const replaced = new Set(kept.map(r => r.replaces).filter(Boolean));
  return kept.filter(r => !replaced.has(r.id));
}

/** Relative headroom below which a passing value is flagged as near the limit. */
export const NEAR = 0.1;
/** Rays a measurement should rest on (about 10% statistical error), and how far the receiver may grow to find them. */
export const MIN_RAYS = 100;
/**
 * Rays for each position of a line or zone. Its value is the weakest or brightest of many positions, and an extreme of
 * noisy values is biased by the noise, so each position rests on more rays (about 5% error).
 */
export const EXTREME_RAYS = 400;

/** @param {number} value @param {number | undefined} min @param {number | undefined} max */
export function margin(value, min, max) {
  const a = min !== undefined ? (value - min) / min : Infinity;
  const b = max !== undefined ? (max - value) / max : Infinity;
  return Math.min(a, b);
}

/** Relative statistical error of a value resting on n rays. @param {number} n */
export const errorOf = n => (n > 0 ? 1 / Math.sqrt(n) : 1);

/** A passing value counts as near the limit within NEAR, or within twice its statistical error. @param {number} m @param {number} [error] @returns {Status} */
export const status = (m, error = 0) => (m < 0 ? 'fail' : m < Math.max(NEAR, 2 * error) ? 'near' : 'pass');

/** @param {number | undefined} min @param {number | undefined} max @param {string} unit */
export function limitText(min, max, unit) {
  const f = /** @param {number} v */ v => `${v.toLocaleString('en-GB', { maximumFractionDigits: 2 })} ${unit}`;
  if (min !== undefined && max !== undefined) return `${f(min)} to ${f(max)}`;
  if (min === undefined && max === undefined) return '–';
  return min !== undefined ? `at least ${f(min)}` : `at most ${f(/** @type {number} */ (max))}`;
}

/** Mirrors a right-hand-traffic label for left-hand traffic: L ↔ R in test-point names. @param {string} id */
export function mirrorLabel(id) {
  /** @type {Record<string, string>} */
  const swap = { LL: 'RR', RR: 'LL', L: 'R', R: 'L' };
  // A side letter may carry a number after it, as in 25L1.
  return id.replace(/\b(\d*(?:\.\d+)?)(LL|RR|L|R)(\d*)\b/g, (_, n, side, k) => n + swap[side] + k).replace(/B50L|B50R/, m => (m === 'B50L' ? 'B50R' : 'B50L')).replace(/BLL|BRR/, m => (m === 'BLL' ? 'BRR' : 'BLL'));
}

/** Point in polygon, counting the boundary as inside. @param {number[]} p @param {number} x @param {number} y */
export function inside(p, x, y) {
  let c = false;
  for (let i = 0, j = p.length - 2; i < p.length; j = i, i += 2) {
    const xi = p[i], yi = p[i + 1], xj = p[j], yj = p[j + 1];
    if ((yi > y) !== (yj > y) && x <= ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

/**
 * Sampling step along an axis: fine inside the beam's fine grid, coarser outside it.
 * @param {Beam} beam @param {'h' | 'v'} axis @param {number} x
 */
function stepAt(beam, axis, x) {
  const s = beam.fine.spec;
  const fine = axis === 'h' ? x - beam.dh >= s.hMin && x - beam.dh <= s.hMax : x - beam.dv >= s.vMin && x - beam.dv <= s.vMax;
  return axis === 'h' ? (fine ? 0.1 : 0.5) : (fine ? 0.05 : 0.25);
}

/**
 * The weakest or brightest receiver position along a line.
 * Positions outside an imported file are left out, and the result says so.
 * @param {Beam} beam @param {LineAt} at @param {boolean} wantHigh
 * @returns {Measurement & { partial?: boolean }}
 */
export function lineExtreme(beam, at, wantHigh) {
  const length = Math.hypot(at.h1 - at.h0, at.v1 - at.v0);
  const horizontal = Math.abs(at.v1 - at.v0) <= Math.abs(at.h1 - at.h0);
  const step = horizontal ? stepAt(beam, 'h', (at.h0 + at.h1) / 2) : stepAt(beam, 'v', (at.v0 + at.v1) / 2) * 2;
  const n = Math.max(1, Math.round(length / step));
  /** @type {Measurement & { partial?: boolean }} */
  let best = { value: wantHigh ? -Infinity : Infinity, rays: 0 };
  let covered = 0;
  for (let k = 0; k <= n; k++) {
    const t = k / n;
    const x = beam.measure(at.h0 + t * (at.h1 - at.h0), at.v0 + t * (at.v1 - at.v0), EXTREME_RAYS);
    if (x.rays === 0 && beam.exact) continue;
    covered++;
    if (wantHigh ? x.value > best.value : x.value < best.value) best = x;
  }
  if (!covered) return { value: NaN, rays: 0 };
  return covered <= n ? { ...best, partial: true } : best;
}

/**
 * The brightest (or weakest) receiver position inside a polygon, on a lattice of 0.1° × 0.05° inside the beam's fine
 * grid and 0.5° × 0.25° outside it. Positions outside an imported file are left out, and the result says so.
 * @param {Beam} beam @param {number[]} polygon @param {boolean} [wantHigh]
 * @returns {Measurement & { partial?: boolean }}
 */
export function zoneExtreme(beam, polygon, wantHigh = true) {
  let h0 = Infinity, h1 = -Infinity, v0 = Infinity, v1 = -Infinity;
  for (let i = 0; i < polygon.length; i += 2) { h0 = Math.min(h0, polygon[i]); h1 = Math.max(h1, polygon[i]); v0 = Math.min(v0, polygon[i + 1]); v1 = Math.max(v1, polygon[i + 1]); }
  /** @type {Measurement & { partial?: boolean }} */
  let best = { value: wantHigh ? 0 : Infinity, rays: 0 };
  let covered = 0, missing = 0;
  for (let v = v0; v <= v1 + 1e-9; v += stepAt(beam, 'v', v)) {
    for (let h = h0; h <= h1 + 1e-9; h += stepAt(beam, 'h', h)) {
      if (!inside(polygon, h, v)) continue;
      const x = beam.measure(h, v, EXTREME_RAYS);
      if (x.rays === 0 && beam.exact) { missing++; continue; }
      covered++;
      if (wantHigh ? x.value > best.value : x.value < best.value) best = x;
    }
  }
  if (!covered) return { value: NaN, rays: 0 };
  return missing ? { ...best, partial: true } : best;
}

/**
 * The group of a requirement that does not name one. Above a passing beam's cut-off a maximum guards against glare;
 * a driving beam's points light the road.
 * @param {Requirement} r @param {boolean} passing
 * @returns {Group}
 */
function groupOf(r, passing) {
  if (r.group) return r.group;
  if (r.kind === 'note') return 'other';
  if (!passing) return 'beam';
  if (r.kind === 'sum') return 'signs';
  if (r.kind === 'zone') return 'glare';
  if (r.kind === 'relative') return r.of === 'imax' ? 'beam' : 'foreground';
  if (r.kind === 'imax') return 'glare';
  return r.max !== undefined && r.min === undefined ? 'glare' : 'beam';
}

/**
 * @typedef {{ kind: 'floor', factor: number } | { kind: 'sum-alternative' } | { kind: 'sum-only' }} PointRule
 *   How points that belong to a sum are judged. 'floor': every sum must pass, and each point need reach only factor
 *   times its printed minimum. 'sum-alternative': a point below its minimum still passes when its sum passes.
 *   'sum-only': only the sums are judged; their points are listed.
 * @typedef {{ mirror?: boolean, tolerance?: number, passing?: boolean, imax?: Measurement & { h: number, v: number }, idPrefix?: string,
 *   pointRule?: PointRule, between?: string }} MeasureOptions
 *   mirror: flip H and swap L and R in names (left-hand traffic, or a signal lamp on the left of the vehicle).
 *   tolerance: degrees around each point within which the most favourable value counts. between: the text of a rule
 *   that directions between adjacent test points on a horizontal or vertical line reach the lower of their minima.
 */

/**
 * Measures a list of requirements in an aimed beam.
 * @param {Beam} beam @param {Requirement[]} requirements @param {MeasureOptions} [options]
 * @returns {Item[]}
 */
export function measureRequirements(beam, requirements, options = {}) {
  const s = options.mirror ? -1 : 1;
  const tol = options.tolerance ?? 0;
  const passing = options.passing ?? false;
  const prefix = options.idPrefix ?? '';
  // A zone that overrides the general maximum takes its directions out of it.
  const exclude = requirements.filter(r => r.overrides === 'imax' && r.kind === 'zone').map(r => /** @type {ZoneRequirement} */ (r).polygon.map((x, i) => (i % 2 === 0 ? s * x : x)));
  const peak = options.imax ?? beam.maximum(exclude.length ? (h, v) => exclude.some(p => inside(p, h, v)) : undefined);
  /** @type {Item[]} */
  const items = [];
  /** Measured values by requirement id, and sums by key, for relative limits and point rules. @type {Map<string, Measurement & { item?: Item, min?: number }>} */
  const values = new Map([['imax', peak]]);
  /** @param {string} id */
  const name = id => (s > 0 ? id : mirrorLabel(id));
  /** @param {number} h */
  const X = h => s * h;
  /** The most favourable measurement within the coordinate tolerance. @param {number} h @param {number} v @param {boolean} wantHigh @returns {Measurement} */
  const pointValue = (h, v, wantHigh) => {
    const centre = beam.measure(h, v);
    if (centre.rays === 0 && beam.exact) return { value: NaN, rays: 0 };
    if (tol === 0) return centre;
    let best = centre;
    for (let dh = -tol; dh <= tol + 1e-9; dh += 0.05) for (let dv = -tol; dv <= tol + 1e-9; dv += 0.05) {
      if (dh * dh + dv * dv > tol * tol + 1e-9) continue;
      const x = beam.measure(h + dh, v + dv);
      if (x.rays === 0 && beam.exact) continue;
      if (wantHigh ? x.value > best.value : x.value < best.value) best = x;
    }
    return best;
  };
  /** The value of a limit's geometry. @param {At} at @param {boolean} wantHigh @returns {Measurement & { partial?: boolean }} */
  const measureAt = (at, wantHigh) => {
    if (at.kind === 'point') return pointValue(X(at.h), at.v, wantHigh);
    if (at.kind === 'line') return lineExtreme(beam, { kind: 'line', h0: X(at.h0), v0: at.v0, h1: X(at.h1), v1: at.v1 }, wantHigh);
    return zoneExtreme(beam, at.polygon.map((x, i) => (i % 2 === 0 ? s * x : x)), wantHigh);
  };
  /** Where an item sits, for drawing. @param {At} at */
  const place = at => at.kind === 'point' ? { h: X(at.h), v: at.v }
    : at.kind === 'line' ? { line: /** @type {[number, number, number, number]} */ ([X(at.h0), at.v0, X(at.h1), at.v1]) }
    : { polygon: at.polygon.map((x, i) => (i % 2 === 0 ? s * x : x)) };
  /**
   * @param {Requirement} r @param {Partial<Item>} fields @param {Measurement & { partial?: boolean }} x @param {number | undefined} min @param {number | undefined} max @param {string} requirement
   */
  const push = (r, fields, x, min, max, requirement) => {
    const label = r.label ? name(r.label) : name(r.id);
    const base = { id: prefix + name(r.id), label, group: groupOf(r, passing), requirement: x.partial ? `${requirement}, where the file has data` : requirement, value: x.value, unit: 'cd', cite: r.cite, ...fields, ...(x.partial ? { partial: true } : {}) };
    if (!Number.isFinite(x.value) && x.rays === 0) {
      items.push({ ...base, margin: NaN, error: 0, status: 'nodata' });
      return;
    }
    const m = margin(x.value, min, max), error = errorOf(x.rays);
    const item = { ...base, margin: m, error, status: status(m, error) };
    items.push(item);
    values.set(r.id, { ...x, item });
    // Of two applicable variants of one sum, the higher minimum is the one that binds.
    if (r.sumKey) {
      const key = `sum:${r.sumKey}`, prior = values.get(key);
      if (!prior || (min ?? 0) >= (prior.min ?? 0)) values.set(key, { ...x, item, min });
    }
  };

  for (const r of requirements) {
    if (r.kind === 'zone' && r.measure === 'brightest') {
      const x = measureAt(r, true);
      push(r, place(r), x, r.min, r.max, `brightest point ${limitText(r.min, r.max, 'cd')}`);
    } else if (r.kind === 'point' && r.inSum && options.pointRule?.kind === 'sum-only') {
      const x = measureAt(r, true);
      items.push({ id: prefix + name(r.id), label: r.label ? name(r.label) : name(r.id), group: groupOf(r, passing), requirement: `counts towards its group${r.min !== undefined ? ` (${limitText(r.min, undefined, 'cd')})` : ''}`, value: x.value, unit: 'cd', margin: NaN, error: 0, status: 'info', cite: r.cite, ...place(r) });
    } else if (r.kind === 'point' && r.inSum && options.pointRule?.kind === 'floor' && r.min !== undefined) {
      const floor = options.pointRule.factor * r.min;
      const x = measureAt(r, true);
      push(r, place(r), x, floor, r.max, `at least ${Math.round(options.pointRule.factor * 100)}% of ${limitText(r.min, undefined, 'cd').replace(/^at least /, '')}${r.max !== undefined ? `, at most ${limitText(undefined, r.max, 'cd').replace(/^at most /, '')}` : ''}`);
    } else if (r.kind === 'point' || r.kind === 'line' || r.kind === 'zone') {
      const wantHigh = r.min !== undefined;
      const x = measureAt(r, r.kind === 'point' ? wantHigh : r.max !== undefined && r.min === undefined);
      // A line or zone with both limits must meet both everywhere: take whichever extreme fails first.
      let value = x;
      if (r.kind !== 'point' && r.min !== undefined && r.max !== undefined) {
        const low = measureAt(r, false), high = measureAt(r, true);
        value = margin(low.value, r.min, undefined) < margin(high.value, undefined, r.max) ? low : high;
      }
      const prefixText = r.kind === 'point' ? '' : r.min !== undefined && r.max === undefined ? 'everywhere ' : r.min === undefined ? 'nowhere above ' : 'everywhere ';
      const text = r.kind !== 'point' && r.min === undefined && r.max !== undefined ? `${prefixText}${limitText(undefined, r.max, 'cd').replace(/^at most /, '')}` : `${prefixText}${limitText(r.min, r.max, 'cd')}`;
      push(r, place(r), value, r.min, r.max, text);
    } else if (r.kind === 'sum') {
      let value = 0, variance = 0, missing = false;
      for (let i = 0; i < r.points.length; i += 2) {
        const x = beam.measure(X(r.points[i]), r.points[i + 1]);
        if (x.rays === 0 && beam.exact) missing = true;
        value += x.value; variance += (x.value * errorOf(x.rays)) ** 2;
      }
      // Rays equivalent to the sum's combined error; an exact source has none.
      const rays = missing ? 0 : variance > 0 ? (value * value) / variance : value > 0 ? Infinity : 0;
      push(r, {}, { value: missing ? NaN : value, rays }, r.min, r.max, limitText(r.min, r.max, 'cd'));
    } else if (r.kind === 'relative') {
      const ref = values.get(r.of);
      const of = r.of === 'imax' ? 'Imax' : name(r.of);
      const requirement = `${r.bound === 'min' ? 'at least' : 'at most'} ${r.of === 'imax' ? `${Math.round(r.factor * 100)}% of Imax` : `${r.factor} × ${of}`}`;
      if (!ref || ref.item?.status === 'fail' || ref.item?.status === 'nodata') {
        items.push({ id: prefix + name(r.id), label: r.label ? name(r.label) : name(r.id), group: groupOf(r, passing), requirement, value: NaN, unit: 'cd', margin: NaN, error: 0, status: 'blocked', cite: r.cite, ...place(r.at) });
        continue;
      }
      const limit = r.factor * ref.value;
      const x = measureAt(r.at, r.bound === 'min' ? r.at.kind === 'point' : true);
      push(r, place(r.at), x, r.bound === 'min' ? limit : undefined, r.bound === 'max' ? limit : undefined, requirement);
    } else if (r.kind === 'imax') {
      const x = r.spotRadiusDeg ? spotMaximum(beam, r.spotRadiusDeg) : peak;
      push(r, { label: r.label ?? 'Maximum intensity' }, x, r.min, r.max, `${limitText(r.min, r.max, 'cd')}${r.spotRadiusDeg ? `, spots under ${r.spotRadiusDeg}° radius aside` : ''}`);
    } else if (r.kind === 'distribution') {
      for (const p of r.points) {
        const min = (p.percent / 100) * r.reference.min;
        const where = `${angleName(p.v, 'U', 'D', 'H')}, ${angleName(p.h, ' out', ' in', 'V')}`;
        const point = /** @type {PointRequirement} */ ({ kind: 'point', id: `${r.id} ${p.h},${p.v}`, label: `${r.label ?? r.id}: ${where}`, h: p.h, v: p.v, min, cite: r.cite, group: r.group ?? 'field' });
        const x = pointValue(X(p.h), p.v, true);
        push(point, { h: X(p.h), v: p.v }, x, min, undefined, `at least ${p.percent}% of ${r.reference.min.toLocaleString('en-GB')} cd`);
      }
      if (r.between) {
        const x = betweenGrid(beam, r, s, pointValue);
        if (x) push({ ...r, kind: 'point', id: `${r.id} between`, label: `${r.label ?? r.id}: between test points`, h: x.h, v: x.v }, { h: X(x.h), v: x.v }, x, x.required, undefined, 'at least the lowest minimum around it');
      }
      if (r.reference.max !== undefined) push({ ...r, kind: 'imax', label: `${r.label ?? r.id}: maximum`, id: `${r.id} max` }, {}, peak, undefined, r.reference.max, limitText(undefined, r.reference.max, 'cd'));
    } else if (r.kind === 'note') {
      items.push({ id: prefix + r.id, label: r.label ?? r.id, group: groupOf(r, passing), requirement: r.text, value: NaN, unit: '', margin: NaN, error: 0, status: 'info', cite: r.cite });
    }
  }
  if (options.pointRule?.kind === 'sum-alternative') {
    for (const r of requirements) {
      if (r.kind !== 'point' || !r.inSum) continue;
      const item = items.find(i => i.id === prefix + name(r.id));
      const sum = values.get(`sum:${r.inSum}`)?.item;
      if (item && item.status === 'fail' && sum && (sum.status === 'pass' || sum.status === 'near')) {
        item.status = 'pass';
        item.requirement += `; met through ${sum.label}`;
      }
    }
  }
  if (options.between) {
    const x = betweenPoints(beam, requirements, s);
    if (x) {
      const m = margin(x.value, x.required, undefined);
      items.push({ id: `${prefix}Between test points`, label: 'Between test points', group: 'field', requirement: 'at least the lower minimum of the two nearest test points', value: x.value, unit: 'cd', margin: m, error: 0, status: status(m), cite: options.between, h: X(x.h), v: x.v });
    }
  }
  return items;
}

/**
 * The weakest direction between adjacent test points on a horizontal or vertical line, against the lower minimum of
 * the two, sampled every 0.5°.
 * @param {Beam} beam @param {Requirement[]} requirements @param {number} s
 * @returns {(Measurement & { h: number, v: number, required: number }) | null}
 */
function betweenPoints(beam, requirements, s) {
  const points = /** @type {PointRequirement[]} */ (requirements.filter(r => r.kind === 'point' && r.min !== undefined && r.group !== 'axis'));
  /** @type {(Measurement & { h: number, v: number, required: number }) | null} */
  let worst = null;
  /** @param {PointRequirement[]} line @param {'h' | 'v'} along */
  const walk = (line, along) => {
    line.sort((a, b) => a[along] - b[along]);
    for (let i = 0; i + 1 < line.length; i++) {
      const a = line[i], b = line[i + 1], required = Math.min(/** @type {number} */ (a.min), /** @type {number} */ (b.min));
      for (let t = a[along] + 0.5; t < b[along] - 1e-9; t += 0.5) {
        const h = along === 'h' ? t : a.h, v = along === 'v' ? t : a.v;
        const x = beam.measure(s * h, v);
        if (x.rays === 0 && beam.exact) continue;
        if (!worst || x.value / required < worst.value / worst.required) worst = { ...x, h, v, required };
      }
    }
  };
  for (const v of new Set(points.map(p => p.v))) walk(points.filter(p => p.v === v), 'h');
  for (const h of new Set(points.map(p => p.h))) walk(points.filter(p => p.h === h), 'v');
  return worst;
}

/**
 * The maximum intensity read through a receiver with the area of a cone of the given radius, so smaller spots do not
 * count. Searched within 3° of the brightest direction.
 * @param {Beam} beam @param {number} radius degrees
 * @returns {Measurement & { h: number, v: number }}
 */
function spotMaximum(beam, radius) {
  const half = (radius * Math.sqrt(Math.PI)) / 2;
  const peak = beam.maximum();
  let best = { value: 0, rays: 0, h: peak.h, v: peak.v };
  for (let dh = -3; dh <= 3 + 1e-9; dh += 0.25) for (let dv = -3; dv <= 3 + 1e-9; dv += 0.25) {
    const h = peak.h + dh, v = peak.v + dv;
    const b = beam.box(h, v, half, half);
    const value = b.omega > 0 ? b.flux / b.omega : 0;
    if (value > best.value) best = { value, rays: b.rays, h, v };
  }
  return best;
}

/**
 * The weakest direction inside a standard light distribution's grid, against the lowest minimum at the corners of the
 * grid cell around it. Directions are sampled every 0.5°; a cell counts when at least three of its corners are test
 * points, since the regulation's figures draw grid lines only between test points.
 * @param {Beam} beam @param {DistributionRequirement} r @param {number} s @param {(h: number, v: number, wantHigh: boolean) => Measurement} pointValue
 * @returns {(Measurement & { h: number, v: number, required: number }) | null}
 */
function betweenGrid(beam, r, s, pointValue) {
  const hs = [...new Set(r.points.map(p => p.h))].sort((a, b) => a - b), vs = [...new Set(r.points.map(p => p.v))].sort((a, b) => a - b);
  const min = new Map(r.points.map(p => [`${p.h},${p.v}`, (p.percent / 100) * r.reference.min]));
  /** @type {(Measurement & { h: number, v: number, required: number }) | null} */
  let worst = null;
  for (let i = 0; i + 1 < hs.length; i++) for (let j = 0; j + 1 < vs.length; j++) {
    const corners = [[hs[i], vs[j]], [hs[i + 1], vs[j]], [hs[i], vs[j + 1]], [hs[i + 1], vs[j + 1]]].map(([h, v]) => min.get(`${h},${v}`)).filter(x => x !== undefined);
    if (corners.length < 3) continue;
    const required = Math.min(.../** @type {number[]} */ (corners));
    for (let h = hs[i]; h <= hs[i + 1] + 1e-9; h += 0.5) for (let v = vs[j]; v <= vs[j + 1] + 1e-9; v += 0.5) {
      const x = beam.measure(s * h, v);
      if (x.rays === 0 && beam.exact) continue;
      if (!worst || x.value / required < worst.value / worst.required) worst = { ...x, h, v, required };
    }
  }
  if (worst) worst = { ...worst, ...pointValue(s * worst.h, worst.v, true) };
  return worst;
}

/** A test-point angle in words: "10°U", "20° out", or the name of the line it lies on when zero.
 * @param {number} x @param {string} plus @param {string} minus @param {string} zero */
function angleName(x, plus, minus, zero) {
  return x === 0 ? zero : `${Math.abs(x)}°${x > 0 ? plus : minus}`;
}

/** Whether a list of items meets every judged requirement. @param {Item[]} items */
export const meets = items => items.every(i => i.status === 'pass' || i.status === 'near' || i.status === 'info');

/** The judged item with the least headroom. @param {Item[]} items */
export const weakest = items => items.reduce((/** @type {Item | null} */ w, it) => (Number.isFinite(it.margin) && (w === null || it.margin < w.margin) ? it : w), null);
