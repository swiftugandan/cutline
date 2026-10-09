/** Imported light distributions: a file's intensity table in its own photometric system, mapped into Cutline's frame
 * and resampled into far-field histograms. A resampled bin holds the file's intensity at the bin's centre times the
 * bin's solid angle, and an infinite ray count, so it reads exactly through the same Beam as a traced design, with no
 * statistical error. Bins outside the file's angles hold no rays, which the regulation engine reports as no data.
 * See docs/PHYSICS.md, "Imported light distributions". */

import { binSolidAngle } from '../photometry.js';
import { gridSize } from '../tracer.js';
import { parseIes, PhotometryFileError } from './ies.js';
import { parseEulumdat } from './eulumdat.js';

/** @import { GridSpec, Histogram } from '../types.js' */

/**
 * @typedef {'A' | 'B' | 'C'} PhotometricType
 * @typedef {{ format: 'ies' | 'ldt', version: string, type: PhotometricType, keywords: Record<string, string>,
 *   vertical: number[], horizontal: number[], candela: Float64Array, lampLumens: number | null,
 *   size: { width: number, length: number, height: number }, watts: number }} Distribution
 *   candela is stored by horizontal angle, then vertical: candela[j * vertical.length + i]. Angles in degrees as the file
 *   gives them; lampLumens is null for absolute photometry.
 * @typedef {{ system: 'file' | PhotometricType, axisC: number, cTurn: 'left' | 'right', mirror: boolean }} Mapping
 *   How the file's angles map to Cutline's frame. 'file' takes the system from the file. For Type C, the lamp's axis
 *   lies at γ = 90° in plane axisC, and C grows towards cTurn. mirror swaps left and right.
 */

const RAD = Math.PI / 180, DEG = 180 / Math.PI;

/** The far-field grids an imported file is resampled to: the whole forward hemisphere, and a fine grid around the beam. */
export const FILE_GRIDS = /** @type {GridSpec[]} */ ([
  { hMin: -90, hMax: 90, vMin: -90, vMax: 90, step: 0.25, vStep: 0.25 },
  { hMin: -30, hMax: 30, vMin: -10, vMax: 10, step: 0.05, vStep: 0.05 },
]);

export const DEFAULT_MAPPING = /** @type {Mapping} */ ({ system: 'file', axisC: 0, cTurn: 'left', mirror: false });

/**
 * Reads an IES or EULUMDAT file, choosing the reader by content and name.
 * @param {string} text @param {string} name
 * @returns {Distribution}
 */
export function parseDistribution(text, name) {
  if (text.length > 64 * 1024 * 1024) throw new PhotometryFileError(`${name} is larger than 64 MB.`);
  if (/^\s*(IESNA|\[)/i.test(text) || /^TILT\s*=/im.test(text)) return parseIes(text, name);
  if (/\.ldt$/i.test(name)) return parseEulumdat(text, name);
  try { return parseIes(text, name); } catch { return parseEulumdat(text, name); }
}

/**
 * The photometric type a file declares, read from its header alone: EULUMDAT is always Type C. Null when the text is
 * not a file Cutline reads.
 * @param {string} text @param {string} name
 * @returns {PhotometricType | null}
 */
export function photometricTypeOf(text, name) {
  if (!text) return null;
  if (/\.ldt$/i.test(name)) return 'C';
  const tilt = text.slice(0, 20000).match(/TILT\s*=\s*(\S+)[^\S\n]*\r?\n([\s\S]*)/i);
  if (!tilt) return null;
  const tokens = tilt[2].split(/[\s,]+/).filter(Boolean);
  const skip = tilt[1].toUpperCase() === 'INCLUDE' ? 2 + 2 * Number(tokens[1]) : 0;
  return /** @type {Record<number, PhotometricType>} */ ({ 1: 'C', 2: 'B', 3: 'A' })[Number(tokens[skip + 5])] ?? null;
}

/**
 * The file's table on a full, regular footing: symmetric halves mirrored out, Type C planes wrapped to 0–360°.
 * @param {Distribution} d
 * @returns {{ h: number[], v: number[], cd: Float64Array, periodic: boolean }}
 */
export function normalise(d) {
  const nv = d.vertical.length;
  /** @type {[number, Float64Array][]} */
  let planes = d.horizontal.map((a, j) => [a, d.candela.subarray(j * nv, (j + 1) * nv)]);
  if (d.type === 'C') {
    const hs = d.horizontal, lo = hs[0], hi = hs[hs.length - 1];
    /** @param {(a: number) => number} f */
    const mirrored = f => planes.map(([a, c]) => /** @type {[number, Float64Array]} */ ([f(a), c]));
    if (hs.length === 1) planes = [[0, planes[0][1]], [360, planes[0][1]]];
    else if (lo === 0 && hi === 90) { planes = [...planes, ...mirrored(a => 180 - a)]; planes = [...planes, ...mirrored(a => 360 - a)]; }
    else if (lo === 0 && hi === 180) planes = [...planes, ...mirrored(a => 360 - a)];
    else if (lo === 90 && hi === 270) planes = [...planes, ...mirrored(a => (540 - a) % 360)];
    planes = dedupe(planes.map(([a, c]) => /** @type {[number, Float64Array]} */ ([((a % 360) + 360) % 360, c])));
    const first = planes[0];
    if (first[0] === 0 && planes[planes.length - 1][0] < 360) planes.push([360, first[1]]);
    if (first[0] > 0 && planes[planes.length - 1][0] < 360) {
      // Wrap: the last plane continues past 360° into the first.
      const last = planes[planes.length - 1];
      planes = [[last[0] - 360, last[1]], ...planes, [first[0] + 360, first[1]]];
    }
  } else if (d.horizontal[0] >= 0 && d.horizontal.length > 1) {
    // Type A or B with only one side given: the distribution is symmetric about the vertical plane.
    planes = dedupe([...planes.map(([a, c]) => /** @type {[number, Float64Array]} */ ([-a, c])), ...planes]);
  }
  const cd = new Float64Array(planes.length * nv);
  planes.forEach(([, c], j) => cd.set(c, j * nv));
  return { h: planes.map(([a]) => a), v: d.vertical.slice(), cd, periodic: d.type === 'C' };
}

/** Sorts planes by angle and drops repeats. @param {[number, Float64Array][]} planes */
function dedupe(planes) {
  planes.sort((a, b) => a[0] - b[0]);
  return planes.filter((p, i) => i === 0 || p[0] - planes[i - 1][0] > 1e-9);
}

/** Index of the interval holding x in an ascending list, or −1 outside it. @param {number[]} xs @param {number} x */
function locate(xs, x) {
  const n = xs.length;
  if (n === 1) return Math.abs(x - xs[0]) < 1e-9 ? 0 : -1;
  if (x < xs[0] - 1e-9 || x > xs[n - 1] + 1e-9) return -1;
  let lo = 0, hi = n - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (xs[mid] <= x) lo = mid; else hi = mid; }
  return Math.min(lo, n - 2);
}

/**
 * Intensity in the file's own angles by bilinear interpolation, or NaN outside the file.
 * @param {{ h: number[], v: number[], cd: Float64Array }} table @param {number} a horizontal or C angle @param {number} b vertical or γ angle
 */
export function sampleNative(table, a, b) {
  const { h, v, cd } = table, nv = v.length;
  const j = locate(h, a), i = locate(v, b);
  if (j < 0 || i < 0) return NaN;
  if (h.length === 1 || nv === 1) {
    const tj = h.length === 1 ? 0 : (a - h[j]) / (h[j + 1] - h[j]), ti = nv === 1 ? 0 : (b - v[i]) / (v[i + 1] - v[i]);
    const j1 = h.length === 1 ? j : j + 1, i1 = nv === 1 ? i : i + 1;
    return (1 - tj) * ((1 - ti) * cd[j * nv + i] + ti * cd[j * nv + i1]) + tj * ((1 - ti) * cd[j1 * nv + i] + ti * cd[j1 * nv + i1]);
  }
  const tj = (a - h[j]) / (h[j + 1] - h[j]), ti = (b - v[i]) / (v[i + 1] - v[i]);
  const c00 = cd[j * nv + i], c01 = cd[j * nv + i + 1], c10 = cd[(j + 1) * nv + i], c11 = cd[(j + 1) * nv + i + 1];
  return (1 - tj) * ((1 - ti) * c00 + ti * c01) + tj * ((1 - ti) * c10 + ti * c11);
}

/**
 * The file's angles for a direction in Cutline's frame (x right, y up, z forward along the lamp's axis).
 * @param {PhotometricType} system @param {Mapping} mapping @param {number} dx @param {number} dy @param {number} dz
 * @returns {[number, number]} [horizontal or C, vertical or γ]
 */
export function nativeAngles(system, mapping, dx, dy, dz) {
  if (system === 'A') return [Math.atan2(dx, dz) * DEG, Math.asin(Math.max(-1, Math.min(1, dy))) * DEG];
  if (system === 'B') return [Math.asin(Math.max(-1, Math.min(1, dx))) * DEG, Math.atan2(dy, dz) * DEG];
  const gamma = Math.acos(Math.max(-1, Math.min(1, -dy))) * DEG;
  const turn = Math.atan2(mapping.cTurn === 'left' ? -dx : dx, dz) * DEG;
  return [(((mapping.axisC + turn) % 360) + 360) % 360, gamma];
}

/** The photometric system a mapping uses for a file. @param {Distribution} d @param {Mapping} mapping */
export const systemOf = (d, mapping) => (mapping.system === 'file' ? d.type : mapping.system);

/**
 * A function giving the file's intensity at (H, V) in Cutline's goniometer frame, NaN outside the file.
 * @param {Distribution} d @param {Mapping} mapping
 * @returns {(h: number, v: number) => number}
 */
export function intensityFunction(d, mapping) {
  const table = normalise(d), system = systemOf(d, mapping);
  if (system === 'C' && !table.periodic) throw new PhotometryFileError('A Type C reading needs the file\'s angles as C-planes and γ angles; this file is not Type C.');
  return (h, v) => {
    const hh = (mapping.mirror ? -h : h) * RAD, vv = v * RAD;
    const dx = Math.cos(vv) * Math.sin(hh), dy = Math.sin(vv), dz = Math.cos(vv) * Math.cos(hh);
    const [a, b] = nativeAngles(system, mapping, dx, dy, dz);
    return sampleNative(table, system === 'C' && a < table.h[0] ? a + 360 : a, b);
  };
}

/**
 * Resamples a distribution into far-field histograms, in the order the evaluator expects (wide, then fine).
 * @param {(h: number, v: number) => number} intensity @param {GridSpec[]} [grids]
 * @returns {Histogram[]}
 */
export function toHistograms(intensity, grids = FILE_GRIDS) {
  return grids.map(spec => {
    const { nh, nv } = gridSize(spec);
    const flux = new Float64Array(nh * nv), count = new Float64Array(nh * nv);
    for (let r = 0; r < nv; r++) {
      const v0 = spec.vMin + r * spec.vStep;
      for (let c = 0; c < nh; c++) {
        const h0 = spec.hMin + c * spec.step;
        const cd = intensity(h0 + spec.step / 2, v0 + spec.vStep / 2);
        if (!Number.isFinite(cd)) continue;
        flux[r * nh + c] = Math.max(0, cd) * binSolidAngle(h0, h0 + spec.step, v0, v0 + spec.vStep, 'goniometer');
        count[r * nh + c] = Infinity;
      }
    }
    return { spec, flux, count };
  });
}

/**
 * Facts about a file for the user: the brightest direction, the lumens it holds and the angles it covers.
 * @param {Distribution} d @param {Histogram[]} histograms
 */
export function describe(d, histograms) {
  const wide = histograms[0], s = wide.spec, { nh } = gridSize(s);
  let lumens = 0, covered = 0;
  let hMin = Infinity, hMax = -Infinity, vMin = Infinity, vMax = -Infinity;
  for (let i = 0; i < wide.flux.length; i++) {
    if (wide.count[i] === 0) continue;
    lumens += wide.flux[i]; covered++;
    const h = s.hMin + ((i % nh) + 0.5) * s.step, v = s.vMin + (Math.floor(i / nh) + 0.5) * s.vStep;
    hMin = Math.min(hMin, h); hMax = Math.max(hMax, h); vMin = Math.min(vMin, v); vMax = Math.max(vMax, v);
  }
  let peak = 0;
  for (let i = 0; i < d.candela.length; i++) peak = Math.max(peak, d.candela[i]);
  const steps = (/** @type {number[]} */ xs) => xs.length > 1 ? Math.min(...xs.slice(1).map((x, i) => x - xs[i])) : 0;
  return {
    format: d.format === 'ies' ? `IES ${d.version}` : 'EULUMDAT', type: d.type,
    values: d.candela.length, horizontal: [d.horizontal[0], d.horizontal[d.horizontal.length - 1]], vertical: [d.vertical[0], d.vertical[d.vertical.length - 1]],
    resolution: [steps(d.horizontal), steps(d.vertical)], peak, lumensForward: lumens, lampLumens: d.lampLumens,
    coverage: covered ? { hMin: hMin - s.step / 2, hMax: hMax + s.step / 2, vMin: vMin - s.vStep / 2, vMax: vMax + s.vStep / 2 } : null,
    keywords: d.keywords,
  };
}
