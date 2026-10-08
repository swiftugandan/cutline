/** UN Regulation No. 149, 01 series of amendments: photometric requirements for headlamps, as data. Every entry cites
 * the official text. Coordinates are degrees for right-hand traffic: h positive to the right, v positive upwards; the
 * evaluator mirrors them for left-hand traffic (Annex 4, p. 61). See docs/REGULATION.md for the sources and choices.
 *
 * Source: ECE/TRANS/WP.29/2022/93 (01 series, adopted June 2022, in force 4 January 2023) with the corrections in
 * ECE/TRANS/WP.29/1166 para. 143 and Supplements 1–7. Page numbers are the document's own. */

/**
 * @typedef {'C' | 'V' | 'B' | 'A'} BeamClass
 *   Passing beam Class C (a normal car headlamp) or V (lower output); driving beam Class B ("HR") or A ("R").
 * @typedef {{ kind: 'point', id: string, h: number, v: number, min?: number, max?: number, minOfImax?: number, cite: string }} PointRequirement
 * @typedef {{ kind: 'segment', id: string, v: number, h0: number, h1: number, min?: number, max?: number, cite: string }} SegmentRequirement
 * @typedef {{ kind: 'zone', id: string, polygon: number[], max: number, cite: string }} ZoneRequirement
 * @typedef {{ kind: 'sum', id: string, points: number[], min: number, cite: string }} SumRequirement
 * @typedef {{ kind: 'region-relative', id: string, vMax: number, h0: number, h1: number, factor: number, of: string, cite: string }} RelativeRequirement
 * @typedef {{ kind: 'imax', id: string, min?: number, max?: number, cite: string }} ImaxRequirement
 * @typedef {PointRequirement | SegmentRequirement | ZoneRequirement | SumRequirement | RelativeRequirement | ImaxRequirement} Requirement
 */

export const SOURCE = {
  title: 'UN Regulation No. 149, 01 series of amendments',
  document: 'ECE/TRANS/WP.29/2022/93, with corrections in ECE/TRANS/WP.29/1166 para. 143 and Supplements 1–7',
  url: 'https://documents.un.org/api/symbol/access?s=ECE/TRANS/WP.29/2022/93&l=en&t=pdf',
};

const T6 = 'R149 01 series, Table 6 Part A (p. 23)';
const T6B = 'R149 01 series, Table 6 Parts A and B (pp. 23–24)';
const T6C = 'R149 01 series, Table 6 Parts A and C (pp. 23–24)';
const T5 = 'R149 01 series, Table 5 (p. 22)';

/** Zone III, Table 6 Part C (p. 24): vertices in order, as [h, v, …]. */
export const ZONE_III = [-8, 1, -8, 4, 8, 4, 8, 2, 6, 1.5, 1.5, 1.5, 0, 0, -4, 0];

/**
 * Passing-beam requirements by class (right-hand traffic).
 * @param {'C' | 'V'} cls
 * @returns {Requirement[]}
 */
export function passingRequirements(cls) {
  const C = cls === 'C';
  /** @type {Requirement[]} */
  const out = [
    { kind: 'zone', id: 'Zone III', polygon: ZONE_III, max: 625, cite: T6C },
    { kind: 'point', id: 'BR', h: 2.5, v: 1, max: 1750, cite: T6 },
    { kind: 'segment', id: 'Segment BLL', v: 0.57, h0: -20, h1: -8, max: 625, cite: T6 },
    { kind: 'point', id: 'B50L', h: -3.43, v: 0.57, max: 350, cite: T6 },
    { kind: 'point', id: 'P', h: -7, v: 0, min: 63, cite: T6 },
    { kind: 'point', id: '50L', h: -3.43, v: -0.86, min: C ? 5000 : 3550, max: 37000, cite: T6 },
    { kind: 'point', id: '50V', h: 0, v: -0.86, min: 5100, cite: T6 },
    { kind: 'point', id: '50R', h: 1.72, v: -0.86, min: C ? 10100 : 5100, cite: T6 },
    { kind: 'segment', id: 'Segment 50', v: -0.86, h0: -6.84, h1: 6.84, min: C ? 2540 : 1800, cite: T6 },
    { kind: 'segment', id: 'Segment 40LL', v: -1.07, h0: -14, h1: -9, min: C ? 850 : 600, cite: T6 },
    { kind: 'point', id: '40L', h: -9, v: -1.07, min: C ? 2800 : 1950, cite: T6 },
    { kind: 'point', id: '40R', h: 9, v: -1.07, min: C ? 2800 : 1950, cite: T6 },
    { kind: 'segment', id: 'Segment 40RR', v: -1.07, h0: 9, h1: 14, min: C ? 850 : 600, cite: T6 },
    { kind: 'point', id: '25V', h: 0, v: -1.72, min: C ? 2500 : 1750, cite: T6 },
    { kind: 'segment', id: 'Segment 25L', v: -1.72, h0: -16, h1: -9, min: C ? 1180 : 825, cite: T6 },
    { kind: 'segment', id: 'Segment 25', v: -1.72, h0: -9, h1: 9, min: C ? 1700 : 1200, cite: T6 },
    { kind: 'segment', id: 'Segment 25R', v: -1.72, h0: 9, h1: 16, min: C ? 1180 : 825, cite: T6 },
    { kind: 'segment', id: 'Segment 15', v: -2.86, h0: -20, h1: 20, min: C ? 425 : 300, cite: T6 },
    { kind: 'segment', id: 'Segment 10', v: -4, h0: -4.5, h1: 2, min: C ? 500 : 350, cite: T6 },
    // Class V's reference point is 25V, per the correction adopted with the 01 series (WP.29/1166 para. 143).
    { kind: 'region-relative', id: 'Segment 10 and below', vMax: -4, h0: -4.5, h1: 2, factor: 0.8, of: C ? '50R' : '25V', cite: C ? 'R149 01 series, Table 6 Part A (p. 24)' : 'R149 01 series, Table 6 Part A (p. 24), corrected by WP.29/1166 para. 143' },
  ];
  if (C) {
    out.splice(1, 0,
      { kind: 'sum', id: 'S50 + S50LL + S50RR', points: [-8, 4, 0, 4, 8, 4], min: 190, cite: T6B },
      { kind: 'sum', id: 'S100 + S100LL + S100RR', points: [-4, 2, 0, 2, 4, 2], min: 375, cite: T6B });
    out.splice(out.findIndex(r => r.id === '50L'), 0, { kind: 'point', id: '75R', h: 1.15, v: -0.57, min: 12100, cite: T6 });
  } else {
    out.push({ kind: 'imax', id: 'Imax', max: 44100, cite: 'R149 01 series, Table 6 Part A (p. 24)' });
  }
  return out;
}

/**
 * Driving-beam requirements by class.
 * @param {'B' | 'A'} cls
 * @returns {Requirement[]}
 */
export function drivingRequirements(cls) {
  const B = cls === 'B';
  const p = /** @param {string} id @param {number} h @param {number} v @param {number} min */ (id, h, v, min) => /** @type {PointRequirement} */ ({ kind: 'point', id, h, v, min, cite: T5 });
  return [
    { kind: 'imax', id: 'Imax', min: B ? 40000 : 27000, max: 215000, cite: 'R149 01 series, Table 5 and §5.1.4.2 (p. 22)' },
    { kind: 'point', id: 'H-V', h: 0, v: 0, minOfImax: 0.8, cite: 'R149 01 series, Table 5 and §5.1.4.1 (p. 22)' },
    p('2U-V', 0, 2, B ? 1700 : 1000),
    p('H-12L', -12, 0, B ? 1500 : 600), p('H-9L', -9, 0, B ? 3400 : 2000), p('H-6L', -6, 0, B ? 5000 : 3400), p('H-3L', -3, 0, B ? 17500 : 12000),
    p('H-3R', 3, 0, B ? 17500 : 12000), p('H-6R', 6, 0, B ? 5000 : 3400), p('H-9R', 9, 0, B ? 3400 : 2000), p('H-12R', 12, 0, B ? 1500 : 600),
  ];
}

/** Measurement and aiming rules used by the evaluator. */
export const RULES = {
  /** The photoreceptor lies within a 65 mm square at least 25 m away: about 0.149° across. Annex 4 §1.1.1 (p. 59). */
  receiverDeg: (Math.atan(0.065 / 25) * 180) / Math.PI,
  receiverCite: 'R149 01 series, Annex 4 §1.1.1 (p. 59)',
  /** The horizontal part of the cut-off is aimed to line B, 0.57° below H-H. Annex 5 §3.2.1.1 (p. 71). */
  lineB: -0.57,
  /** Sharpness scan at 2.5° from V-V on the left for right-hand traffic, in steps of 0.05°. Annex 6 §2.2.2 and §2.3.1. */
  sharpnessScanH: -2.5,
  scanStep: 0.05,
  /** 0.13 ≤ G ≤ 0.40 for an asymmetric cut-off, G = log E(β) − log E(β + 0.1°). Annex 6 §2.2.2 (p. 75). */
  sharpness: { min: 0.13, max: 0.4 },
  sharpnessCite: 'R149 01 series, Annex 6 §2.2.2 (p. 75)',
  /** Inflection points at 1.5°, 2.5° and 3.5° from V-V within 0.2° vertically. Annex 6 §2.2.3.1 (p. 75). */
  linearity: { h: [-1.5, -2.5, -3.5], maxSpread: 0.2 },
  linearityCite: 'R149 01 series, Annex 6 §2.2.3.1 (p. 75)',
  /** Horizontal aim, method (b): vertical scans 2°D to 2°U at 1°R, 2°R and 3°R, each with G ≥ 0.08; the line through
   * their inflection points meets line B on V-V. Method (a): scan the 0.2°D line from 5°L to 5°R, G ≥ 0.08, inflection
   * on line A at 0.5°R. Annex 6 §2.3.2.1 (pp. 76–77); line A from Fig. A5-I (p. 70). */
  horizontalAim: { threeLineH: [1, 2, 3], minG: 0.08, lineAH: 0.5, lineAV: -0.2 },
  horizontalAimCite: 'R149 01 series, Annex 6 §2.3.2.1 (pp. 76–77)',
  /** Driving beams: 0.25° coordinate tolerance at each test point. §5.1.3 (p. 22). */
  drivingTolerance: 0.25,
  /** Minimum flux of a Class C or V passing beam: 1,000 lm objective flux, or Zone I ≥ 400 lm and Zone II ≥ 200 lm. §4.5.3.2, Tables 3a/3b (pp. 16–17). */
  flux: { objective: 1000, zoneI: { h0: -30, h1: 30, v0: -15, v1: 1, min: 400 }, zoneII: { h0: -30, h1: 30, v0: -3.5, v1: 1, min: 200 } },
  fluxCite: 'R149 01 series, §4.5.3.2 and Tables 3a/3b (pp. 16–17)',
};
