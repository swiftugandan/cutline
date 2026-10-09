/** FMVSS No. 108 (49 CFR 571.108): photometry of the upper beams (Table XVIII) and lower beams (Tables XIX-a, XIX-b
 * and XIX-c) of every headlighting system the standard defines (Tables II-a to II-d), with the aiming done before
 * measurement. Source and choices: docs/research/fmvss108-cmvss108-headlamps-notes.md
 *
 * Text used: 49 CFR 571.108 in the annual edition revised as of 1 October 2025 (govinfo PDF), whose printed page
 * numbers every cite gives. The eCFR, current to 7 October 2026, has the same text: its last substantive change to
 * § 571.108 is dated 5 December 2023 and a word-by-word comparison with the 22 February 2022 text found only layout
 * changes. Tables II-a, XVIII and XIX-a/b/c are printed as graphics; they were read from the page images and checked a
 * second time against the copies in Transport Canada's TSD 108 Revision 8 (pp. 165–168), which agree cell by cell.
 *
 * Coordinates: degrees, h positive to the right (R), v positive upwards (U), "as viewed from the headlamp"
 * (S14.2.5.8.1.2, p. 428). US traffic keeps to the right and the tables are written for it. Horizontal angles are
 * plan-view angles and vertical angles are true elevation angles (S14.2.5.8.1.3–4, p. 428), the same sphere as R149.
 *
 * The standard has no sum, Imax or between-test-point rule for headlamps: S14.2.1's interpolation rule excludes
 * headlamps (p. 423). The only area requirement is the 10U–90U boundary row. */

/**
 * @typedef {{ min?: number, max?: number }} Limits
 * @typedef {'glare' | 'road' | 'signs' | 'foreground' | 'cutoff' | 'axis' | 'field'} Group
 * @typedef {{ kind: 'point', id: string, h: number, v: number, min?: number, max?: number, cite: string, group?: Group }} PointRequirement
 * @typedef {{ kind: 'line', id: string, h0: number, v0: number, h1: number, v1: number, min?: number, max?: number,
 *   openEnd?: 'left' | 'right', cite: string, group?: Group, note?: string }} LineRequirement
 * @typedef {{ kind: 'zone', id: string, polygon: number[], min?: number, max?: number, cite: string, group?: Group, note?: string }} ZoneRequirement
 * @typedef {PointRequirement | LineRequirement | ZoneRequirement} Requirement
 * @typedef {{ id: string, name: string, kind: 'headlamp', traffic: 'right', aim: string,
 *   tolerance: { deg: number, cite: string } | null, requirements: Requirement[], notes: string[] }} PhotometricFunction
 */

export const SOURCE = {
  title: 'FMVSS No. 108, Lamps, reflective devices, and associated equipment (49 CFR 571.108): headlamp photometry',
  document: '49 CFR 571.108, Code of Federal Regulations annual edition revised as of 1 October 2025 (pp. 390–514); '
    + 'checked against the eCFR current to 7 October 2026',
  url: 'https://www.govinfo.gov/content/pkg/CFR-2025-title49-vol6/pdf/CFR-2025-title49-vol6-sec571-108.pdf',
  retrieved: '2026-10-09',
};

const CFR = 'FMVSS 108 (49 CFR 571.108, 10-1-25 ed.)';
const T18 = `${CFR}, Table XVIII (p. 479)`;
const T19 = { a: `${CFR}, Table XIX-a (p. 480)`, b: `${CFR}, Table XIX-b (p. 481)`, c: `${CFR}, Table XIX-c (p. 482)` };
const REAIM = `${CFR}, S14.2.5.5 (p. 426)`;

/** Measurement conditions and the aiming done before photometry. Numbers marked "derived" are arithmetic on the text. */
export const AIMING = {
  measurement: {
    /** "At least 18.3 m" between the light source and the photometer sensor. S14.2.5.3 (p. 426). */
    distanceMin: 18.3,
    /** The sensor's effective area fits in a circle of diameter 0.009 × test distance. S14.2.5.7.2.1 (p. 427). */
    sensorDiameterPerDistance: 0.009,
    /** Derived: such a circle subtends 2·atan(0.0045), about 0.516°, at any distance. */
    sensorDeg: (2 * Math.atan(0.0045) * 180) / Math.PI,
    /** Goniometer: horizontal rotation over elevation; its vertical axis is the lamp's design vertical. S14.2.5.6 (p. 427). */
    goniometer: 'horizontal rotation over elevation',
    /** Test points from 10°U to 90°U are measured from the normally exposed surface of the lens face. S14.2.5.2 (p. 426). */
    highAngleFromLensFace: true,
    /** 12.8 V ±20 mV DC at the lamp terminals, after seasoning (1% of design life or 10 h). S14.2.5.4 (p. 426). */
    testVoltage: 12.8,
    cite: `${CFR}, S14.2.5.2–S14.2.5.8 (pp. 426–428)`,
  },
  /** A 1/4° reaim is permitted in any direction at any test point, for all headlamps except a Type F upper beam unit
   * not equipped with a VHAD. S14.2.5.5 (p. 426). */
  reaimDeg: 0.25,
  reaimCite: REAIM,
  /** Mechanically aimable headlamps: no beam-based aim. With an external aimer the aiming plane is set at the design
   * angle(s) to the photometer axis and the mechanical axis lies on the photometer axis (S14.2.5.5.1); with a VHAD the
   * lamp is aimed by the VHAD per the manufacturer's instructions (S14.2.5.5.2). H-V is the lamp's mechanical axis. */
  mechanical: { cite: `${CFR}, S14.2.5.5.1–S14.2.5.5.2 (p. 426)` },
  /** Visually/optically aimable lower beams (marked VOL or VOR, S10.18.9.6.1, p. 422). Two steps: the cut-off is first
   * measured with its maximum gradient on H-H, then the lamp is set to its photometry aim. */
  visualLower: {
    cutoffCheck: {
      /** Measured at 10 m with a 10 mm diameter photosensor (about 0.057°, derived). S10.18.9.1.5.1 (p. 421). */
      distance: 10,
      sensorDiameterMm: 10,
      /** The beam is aimed with the cut-off at the H-H axis; no horizontal adjustment unless a VHAD, then set to zero. S10.18.9.1.5.2 (p. 421). */
      cutoffAt: 0,
      /** Vertical scan from 1.5°U to 1.5°D on the line 2.5°L (VOL) or 2.0°R (VOR). S10.18.9.1.5.3 (p. 421). */
      scanH: { VOL: -2.5, VOR: 2.0 },
      scanFromV: 1.5,
      scanToV: -1.5,
      /** G = log E(a) − log E(a + 0.1); the maximum G locates the cut-off. S10.18.9.1.5.4 (p. 421). */
      gradientStep: 0.1,
      /** Gradient not less than 0.13 at 2.5°L or 2.0°R. S10.18.9.1.2 (p. 420). */
      minGradient: 0.13,
      /** Width not less than 2°, with at least 2° of it centred at 2.5°L or 2.0°R. S10.18.9.1.3 (p. 420). */
      minWidth: 2,
      /** Highest gradient at the ends of the minimum width within ±0.2° vertically of the maximum gradient on the
       * measuring line; scans at 1.0°L and 1.0°R of that point. S10.18.9.1.4 and S10.18.9.1.5.4 (p. 421). */
      inclination: { endOffset: 1.0, maxDeviation: 0.2 },
      cite: `${CFR}, S10.18.9.1–S10.18.9.1.5.4 (pp. 420–421)`,
    },
    /** Photometry aim: the cut-off maximum gradient goes to 0.4°D (VOL) or onto H-H (VOR).
     * S14.2.5.5.3.1–2 (p. 426); also S10.18.9.1.1 (p. 420). */
    photometryCutoffV: { VOL: -0.4, VOR: 0 },
    /** No horizontal aim adjustment unless the lamp has a horizontal VHAD, which is then set to zero. S14.2.5.5.4 (p. 426). */
    horizontal: 'none',
    cite: `${CFR}, S14.2.5.5.3–S14.2.5.5.4 (p. 426)`,
  },
  /** Visually/optically aimable upper beams. Combined with a lower beam: keep the lower-beam aim
   * (S14.2.5.5.5.1, S14.2.5.5.6.1). Separate: maximum intensity on H-H (S14.2.5.5.5.2); horizontally, no adjustment if
   * the aim is fixed or set by a horizontal VHAD at zero (S14.2.5.5.6.2), otherwise maximum intensity on V-V
   * (S14.2.5.5.6.3). */
  visualUpper: { cite: `${CFR}, S14.2.5.5.5–S14.2.5.5.6 (pp. 426–427)` },
  /** Simultaneously aimed Type F and beam-contributor assemblies: lower beam unit (or the geometric centre of the
   * lower beam contributors) on the photometer axis, then the assembly is moved parallel to that aiming plane until
   * the upper beam unit (or centre of the upper contributors) is on the axis. S14.2.5.5.7 (p. 427). */
  simultaneous: { cite: `${CFR}, S14.2.5.5.7 (p. 427)` },
};

const AIM_UPPER = 'Mechanically aimable: no beam-based aim; aiming plane at its design angle and mechanical axis on the '
  + 'photometer axis, or aimed by the VHAD (S14.2.5.5.1–2, p. 426). Visually aimable: an upper beam combined with a '
  + 'lower beam keeps the lower-beam aim; a separate upper beam has its maximum intensity put on H-H and, unless its '
  + 'horizontal aim is fixed or set by a VHAD at zero, on V-V (S14.2.5.5.5–6, pp. 426–427). See AIMING.';
const AIM_LOWER_M = 'Mechanically aimable: no beam-based aim. With an external aimer the aiming plane is set at its '
  + 'design angle(s) to the photometer axis with the mechanical axis on the photometer axis (S14.2.5.5.1, p. 426); '
  + 'with a VHAD the lamp is aimed by the VHAD per the manufacturer\'s instructions (S14.2.5.5.2, p. 426). H-V is the '
  + 'lamp\'s mechanical axis. See AIMING.mechanical.';
const AIM_LOWER_V = 'Visually/optically aimable. First the cut-off is checked with its maximum gradient on H-H '
  + '(S10.18.9.1.5, p. 421). For photometry the cut-off maximum gradient goes to 0.4°D for a VOL lamp (cut-off measured '
  + 'at 2.5°L) or onto H-H for a VOR lamp (cut-off measured at 2.0°R) (S14.2.5.5.3, p. 426). No horizontal adjustment '
  + 'unless the lamp has a horizontal VHAD, which is set to zero (S14.2.5.5.4, p. 426). See AIMING.visualLower.';

const TOLERANCE = { deg: 0.25, cite: `${REAIM}: "A 1/4° reaim is permitted in any direction at any test point"` };

/** Open-ended rows ("1R to R", "1.5L to L") run to the edge of the widest field the same tables name, 90L–90R. The
 * text gives no far end; see the notes file. */
const FAR = 90;
const OPEN_NOTE = 'The table prints this row as an open-ended range ("to R" or "to L") with no far end. It is '
  + 'transcribed as running to 90° on that side, the edge of the widest field the same table names (10U–90U, '
  + '90L–90R). That end is this transcription\'s reading, not a number in the standard.';

/**
 * A test-point row as printed: "v h", where h may be "xL & xR" (two points), "aR to bR" (a line), or open-ended.
 * @typedef {{ row: string, at: Array<{ id: string, h: number, v: number } | { id: string, h0: number, v0: number, h1: number, v1: number, openEnd?: 'left' | 'right' } | { id: string, polygon: number[] }>, group: Group }} Row
 */

/** @param {string} id @param {number} h @param {number} v */
const P = (id, h, v) => ({ id, h, v });
/** "xL & xR" at elevation v. @param {string} vName @param {number} x @param {number} v */
const PAIR = (vName, x, v) => [P(`${vName}-${x}L`, -x, v), P(`${vName}-${x}R`, x, v)];
/** @param {string} id @param {number} h0 @param {number} h1 @param {number} v @param {'left' | 'right'} [openEnd] */
const LINE = (id, h0, h1, v, openEnd) => (openEnd ? { id, h0, v0: v, h1, v1: v, openEnd } : { id, h0, v0: v, h1, v1: v });

/** Table XVIII rows, in printed order (p. 479). @type {Row[]} */
const XVIII_ROWS = [
  { row: '2U V', at: [P('2U-V', 0, 2)], group: 'glare' },
  { row: '1U 3L & 3R', at: PAIR('1U', 3, 1), group: 'road' },
  { row: 'H V', at: [P('H-V', 0, 0)], group: 'axis' },
  { row: 'H 3L & 3R', at: PAIR('H', 3, 0), group: 'road' },
  { row: 'H 6L & 6R', at: PAIR('H', 6, 0), group: 'road' },
  { row: 'H 9L & 9R', at: PAIR('H', 9, 0), group: 'road' },
  { row: 'H 12L & 12R', at: PAIR('H', 12, 0), group: 'road' },
  { row: '1.5D V', at: [P('1.5D-V', 0, -1.5)], group: 'road' },
  { row: '1.5D 9L & 9R', at: PAIR('1.5D', 9, -1.5), group: 'road' },
  { row: '2.5D V', at: [P('2.5D-V', 0, -2.5)], group: 'foreground' },
  { row: '2.5D 12L & 12R', at: PAIR('2.5D', 12, -2.5), group: 'foreground' },
  { row: '4D V', at: [P('4D-V', 0, -4)], group: 'foreground' },
];

/** Table XVIII cells as printed, [maximum, minimum] in cd, null for "-". Row order as XVIII_ROWS.
 * @type {Record<string, Array<[number | null, number | null]>>} */
export const TABLE_XVIII = {
  UB1: [[null, 1500], [null, 5000], [70000, 40000], [null, 15000], [null, 5000], [null, 3000], [null, 1500], [null, 5000], [null, 2000], [null, 2500], [null, 1000], [5000, null]],
  UB2: [[null, 1500], [null, 5000], [75000, 40000], [null, 15000], [null, 5000], [null, 3000], [null, 1500], [null, 5000], [null, 2000], [null, 2500], [null, 1000], [12000, null]],
  UB3: [[null, 1000], [null, 2000], [75000, 20000], [null, 10000], [null, 3250], [null, 1500], [null, 750], [null, 5000], [null, 1500], [null, 2500], [null, 750], [5000, null]],
  UB4: [[null, 750], [null, 3000], [60000, 18000], [null, 12000], [null, 3000], [null, 2000], [null, 750], [null, 3000], [null, 1250], [null, 1500], [null, 600], [5000, null]],
  UB5: [[null, 750], [null, 2000], [15000, 7000], [null, 3000], [null, 2000], [null, 1000], [null, 750], [null, 2000], [null, 750], [null, 1000], [null, 400], [2500, null]],
  UB6: [[null, 1500], [null, 5000], [70000, 40000], [null, 15000], [null, 5000], [null, 3000], [null, 1500], [null, 5000], [null, 1000], [null, null], [null, null], [5000, null]],
};

/** Table XIX rows, in printed order (pp. 480–482); the same 26 rows head all three parts. @type {Row[]} */
const XIX_ROWS = [
  { row: '10U to 90U, 90L to 90R', at: [{ id: '10U to 90U, 90L to 90R', polygon: [-90, 10, 90, 10, 90, 90, -90, 90] }], group: 'glare' },
  { row: '4U 8L & 8R', at: PAIR('4U', 8, 4), group: 'signs' },
  { row: '2U 4L', at: [P('2U-4L', -4, 2)], group: 'signs' },
  { row: '1.5U 1R to 3R', at: [LINE('1.5U-1R to 3R', 1, 3, 1.5)], group: 'signs' },
  { row: '1.5U 1R to R', at: [LINE('1.5U-1R to R', 1, FAR, 1.5, 'right')], group: 'glare' },
  { row: '1U 1.5L to L', at: [LINE('1U-1.5L to L', -1.5, -FAR, 1, 'left')], group: 'glare' },
  { row: '0.5U 1.5L to L', at: [LINE('0.5U-1.5L to L', -1.5, -FAR, 0.5, 'left')], group: 'glare' },
  { row: '0.5U 1R to 3R', at: [LINE('0.5U-1R to 3R', 1, 3, 0.5)], group: 'glare' },
  { row: 'H V', at: [P('H-V', 0, 0)], group: 'glare' },
  { row: 'H 4L', at: [P('H-4L', -4, 0)], group: 'signs' },
  { row: 'H 8L', at: [P('H-8L', -8, 0)], group: 'signs' },
  { row: '0.5D 1.5L to L', at: [LINE('0.5D-1.5L to L', -1.5, -FAR, -0.5, 'left')], group: 'glare' },
  { row: '0.5D 1.5R', at: [P('0.5D-1.5R', 1.5, -0.5)], group: 'road' },
  { row: '0.6D 1.3R', at: [P('0.6D-1.3R', 1.3, -0.6)], group: 'road' },
  { row: '0.86D V', at: [P('0.86D-V', 0, -0.86)], group: 'road' },
  { row: '0.86D 3.5L', at: [P('0.86D-3.5L', -3.5, -0.86)], group: 'road' },
  { row: '1D 6L', at: [P('1D-6L', -6, -1)], group: 'road' },
  { row: '1.5D 2R', at: [P('1.5D-2R', 2, -1.5)], group: 'road' },
  { row: '1.5D 9L & 9R', at: PAIR('1.5D', 9, -1.5), group: 'road' },
  { row: '2D 9L & 9R', at: PAIR('2D', 9, -2), group: 'road' },
  { row: '2D 15L & 15R', at: PAIR('2D', 15, -2), group: 'road' },
  { row: '2.5D V', at: [P('2.5D-V', 0, -2.5)], group: 'foreground' },
  { row: '2.5D 12L & 12R', at: PAIR('2.5D', 12, -2.5), group: 'foreground' },
  { row: '4D V', at: [P('4D-V', 0, -4)], group: 'foreground' },
  { row: '4D 4R', at: [P('4D-4R', 4, -4)], group: 'foreground' },
  { row: '4D 20L & 20R', at: PAIR('4D', 20, -4), group: 'foreground' },
];

/** Table XIX cells as printed, [maximum, minimum] in cd, null for "-" (and for "--", printed in a few empty cells).
 * Row order as XIX_ROWS. Part a: LB1M, LB1V, LB2M, LB2V (p. 480); part b: LB3M, LB3V, LB4M, LB5M (p. 481);
 * part c: LB4V (p. 482).
 * @type {Record<string, Array<[number | null, number | null]>>} */
export const TABLE_XIX = {
  LB1M: [[125, null], [null, 64], [null, 135], [null, 200], [1400, null], [700, null], [1000, null], [2700, 500], [5000, null], [null, 135], [null, 64], [3000, null], [20000, 10000], [null, null], [null, null], [null, null], [null, 1000], [null, 15000], [null, 1000], [null, null], [null, 850], [null, null], [null, null], [7000, null], [12500, null], [null, null]],
  LB1V: [[125, null], [null, 64], [null, 135], [null, 200], [1400, null], [700, null], [1000, null], [2700, 500], [5000, null], [null, 135], [null, 64], [null, null], [null, null], [null, 10000], [null, 4500], [12000, 1800], [null, null], [null, 15000], [null, null], [null, 1250], [null, 1000], [null, null], [null, null], [10000, null], [12500, null], [null, 300]],
  LB2M: [[125, null], [null, 64], [null, 135], [null, 200], [1400, null], [700, null], [1000, null], [2700, 500], [null, null], [null, 135], [null, 64], [3000, null], [20000, 10000], [null, null], [null, null], [null, null], [null, 1000], [null, 15000], [null, 1000], [null, null], [null, 850], [null, null], [null, null], [null, null], [12500, null], [null, null]],
  LB2V: [[125, null], [null, 64], [null, 135], [null, 200], [1400, null], [700, null], [1000, null], [2700, 500], [null, null], [null, 135], [null, 64], [null, null], [null, null], [null, 10000], [null, 4500], [12000, 1800], [null, null], [null, 15000], [null, null], [null, 1250], [null, 1000], [null, null], [null, null], [null, null], [12500, null], [null, 300]],
  LB3M: [[125, null], [null, 64], [null, 135], [null, 200], [1400, null], [700, null], [1000, null], [2700, 500], [null, null], [null, 135], [null, 64], [2500, null], [20000, 8000], [null, null], [null, null], [null, null], [null, 750], [null, 15000], [null, 750], [null, null], [null, 700], [null, null], [null, null], [null, null], [12500, null], [null, null]],
  LB3V: [[125, null], [null, 64], [null, 135], [null, 200], [1400, null], [700, null], [1000, null], [2700, 500], [null, null], [null, 135], [null, 64], [null, null], [null, null], [null, 10000], [null, 4500], [12000, 1800], [null, null], [null, 15000], [null, null], [null, 1250], [null, 1000], [null, null], [null, null], [null, null], [12500, null], [null, 300]],
  LB4M: [[125, null], [null, 64], [null, 135], [null, 200], [1400, null], [700, null], [1000, null], [2700, 500], [null, null], [null, 135], [null, 64], [2500, null], [20000, 8000], [null, null], [null, null], [null, null], [null, 750], [null, 15000], [null, 750], [null, null], [null, 700], [null, null], [null, null], [null, null], [12500, null], [null, null]],
  LB5M: [[125, null], [null, 64], [null, 135], [null, 200], [1400, null], [700, null], [1000, null], [2700, 500], [5000, null], [null, 135], [null, 64], [3000, null], [20000, 10000], [null, null], [null, null], [null, null], [null, 1000], [null, 15000], [null, 1000], [null, null], [null, 850], [null, 2500], [null, 1000], [7000, null], [12500, null], [null, null]],
  LB4V: [[125, null], [null, 64], [null, 135], [null, 200], [1400, null], [700, null], [1000, null], [2700, 500], [5000, null], [null, 135], [null, 64], [null, null], [null, null], [null, 10000], [null, 4500], [12000, 1800], [null, null], [null, 15000], [null, null], [null, 1250], [null, 1000], [null, 2500], [null, 1000], [10000, null], [12500, null], [null, 300]],
};

/** @type {Record<string, string>} */
const XIX_PART = { LB1M: 'a', LB1V: 'a', LB2M: 'a', LB2V: 'a', LB3M: 'b', LB3V: 'b', LB4M: 'b', LB5M: 'b', LB4V: 'c' };

/**
 * Turn printed rows and one column of cells into requirements.
 * @param {Row[]} rows @param {Array<[number | null, number | null]>} cells @param {string} cite
 * @returns {Requirement[]}
 */
function fromTable(rows, cells, cite) {
  if (rows.length !== cells.length) throw new Error(`fmvss108: ${rows.length} rows but ${cells.length} cells`);
  /** @type {Requirement[]} */
  const out = [];
  rows.forEach((row, i) => {
    const [max, min] = cells[i];
    if (max === null && min === null) return;
    /** @type {Limits} */
    const lim = {};
    if (min !== null) lim.min = min;
    if (max !== null) lim.max = max;
    for (const at of row.at) {
      if ('polygon' in at) {
        out.push({ kind: 'zone', id: at.id, polygon: at.polygon, ...lim, group: row.group,
          cite: `${cite}, row "${row.row}" and footnote (1)`,
          note: 'Footnote (1): "These test points are boundaries, intensity values within this boundary must meet the '
            + 'listed photometry requirement." Points from 10°U to 90°U are measured from the normally exposed '
            + 'surface of the lens face (S14.2.5.2, p. 426).' });
      } else if ('h0' in at) {
        out.push({ kind: 'line', ...at, ...lim, group: row.group, cite: `${cite}, row "${row.row}"`,
          ...(at.openEnd ? { note: OPEN_NOTE } : {}) });
      } else {
        out.push({ kind: 'point', id: at.id, h: at.h, v: at.v, ...lim, group: row.group, cite: `${cite}, row "${row.row}"` });
      }
    }
  });
  return out;
}

const SIMULTANEOUS_UB1 = 'Systems built to UB1 with LB1M or LB1V may keep the lamps marked "L" or "LF" on when the '
  + 'upper beams are on (S6.1.5.2.1, p. 396; Table II-a note 1, Table II-b note 2, Table II-c note 2, Table II-d note 2, '
  + 'pp. 459–461).';
const SIMULTANEOUS_UB2 = 'Systems built to UB2 with LB2M or LB2V may keep a lower beam light source on with the upper '
  + 'beam if it contributes to upper beam photometric compliance (S6.1.5.2.3, p. 396; Tables II-b, II-c, II-d note 1, '
  + 'pp. 460–461).';
const SIMULTANEOUS_UB6 = 'Integral beam systems built to UB6 with LB5M or LB4V must keep the lower beams on when the '
  + 'upper beams are on (S6.1.5.2.2, p. 396; Table II-c note 3, p. 460). The standard does not say whether the lower '
  + 'beam\'s light counts towards the Table XVIII values in this case; not resolved here.';
const CONTRIBUTORS = 'Beam contributors: where more than one contributor provides a beam, each must meet the table '
  + 'values scaled by 2 / (number of contributors for that beam on the vehicle) (S14.2.5.9, p. 428). Applies to '
  + 'integral beam contributor systems (Table II-c note 4) and may apply to 4-lamp combination systems (Table II-b '
  + 'note 3).';
const MOVEABLE = 'A headlamp aimed by moving its reflector relative to the lens (or the reverse) must meet the values '
  + 'with the lens at any position over the vehicle\'s full vertical pitch range and ±2.5° horizontally, unless it is '
  + 'visually aimed with fixed horizontal aim (S10.18.6, p. 418; S14.2.5.10, p. 428).';
const ADB = 'Adaptive driving beam (Option 2 of S9.4.1, p. 410): in areas of reduced intensity Table XIX applies, in '
  + 'areas of unreduced intensity Table XVIII; a transition zone up to 1.0° wide is exempt except that the Table XVIII '
  + 'H-V maximum may not be exceeded in it (S9.4.1.6.4.3–5, p. 411). Table XXI (ADB) is not transcribed here.';
const VISUAL_UB = 'The same column applies to mechanically and visually aimed upper beams (Tables II-a to II-d, '
  + 'column "Upper beam mechanical and visual aim"). A solely upper-beam lamp intended for visual aim is marked "VO" '
  + '(S10.18.9.6.1, p. 422).';
const TYPE_F_REAIM = 'The 1/4° reaim does not apply to a Type F upper beam unit (UF) not equipped with a VHAD '
  + '(S14.2.5.5, p. 426).';

/** @type {Record<string, string[]>} Where each column is used, from Tables II-a to II-d (pp. 459–461). */
const USED_IN = {
  UB1: ['Sealed beam Type F (UF)', '4-lamp combination', 'Integral beam 4-lamp (U)', 'Integral beam contributors', 'Replaceable bulb 4-lamp'],
  UB2: ['2-lamp combination', 'Integral beam 2-lamp', 'Replaceable bulb 2-lamp'],
  UB3: ['Sealed beam Types B, D, E, H', 'Integral beam 2-lamp', 'Replaceable bulb 2-lamp (dual filament other than HB2)', 'Replaceable bulb 4-lamp (dual filament other than HB2)'],
  UB4: ['Sealed beam Types A (1A1), C (1C1), G (1G1)', 'Integral beam 4-lamp (upper beam unit)'],
  UB5: ['Sealed beam Types A (2A1), C (2C1), G (2G1)', 'Integral beam 4-lamp (upper and lower beam unit)'],
  UB6: ['Integral beam 4-lamp (upper beam unit, with LB5M or LB4V lower beams)'],
  LB1M: ['Sealed beam Type F (LF)', '4-lamp combination', 'Integral beam 4-lamp (L)', 'Integral beam contributors', 'Replaceable bulb 4-lamp'],
  LB1V: ['Sealed beam Type F (LF)', '4-lamp combination', 'Integral beam 4-lamp (L)', 'Integral beam contributors', 'Replaceable bulb 4-lamp'],
  LB2M: ['2-lamp combination', 'Integral beam 2-lamp', 'Replaceable bulb 2-lamp'],
  LB2V: ['Sealed beam Types A (2A1), C (2C1), G (2G1)', '2-lamp combination', 'Integral beam 2-lamp', 'Integral beam 4-lamp (upper and lower beam unit)', 'Replaceable bulb 2-lamp'],
  LB3M: ['Sealed beam Types B, D, E, H', 'Integral beam 2-lamp', 'Replaceable bulb 2-lamp and 4-lamp (dual filament other than HB2)'],
  LB3V: ['Sealed beam Types B, D, E, H', 'Integral beam 2-lamp', 'Replaceable bulb 2-lamp and 4-lamp (dual filament other than HB2)'],
  LB4M: ['Sealed beam Types A (2A1), C (2C1), G (2G1)', 'Integral beam 4-lamp (upper and lower beam unit)'],
  LB4V: ['Integral beam 4-lamp (lower beam unit, with UB6)'],
  LB5M: ['Integral beam 4-lamp (lower beam unit, with UB6)'],
};

/** @param {string} id */
const usedIn = (id) => `Used by: ${USED_IN[id].join('; ')} (Tables II-a to II-d, pp. 459–461).`;

/** @param {string} ub @returns {PhotometricFunction} */
function upper(ub) {
  const n = ub.slice(2);
  /** @type {string[]} */
  const notes = [usedIn(ub), VISUAL_UB, MOVEABLE, ADB];
  if (ub === 'UB1') notes.push(SIMULTANEOUS_UB1, CONTRIBUTORS, TYPE_F_REAIM);
  if (ub === 'UB2') notes.push(SIMULTANEOUS_UB2);
  if (ub === 'UB6') notes.push(SIMULTANEOUS_UB6);
  return {
    id: `upper-${ub}`,
    name: `Upper beam ${ub}`,
    kind: 'headlamp',
    traffic: 'right',
    aim: AIM_UPPER,
    tolerance: TOLERANCE,
    requirements: fromTable(XVIII_ROWS, TABLE_XVIII[ub], `${T18}, column "Upper beam #${n} (${ub})"`),
    notes,
  };
}

/** @param {string} lb @returns {PhotometricFunction} */
function lower(lb) {
  const visual = lb.endsWith('V');
  const part = XIX_PART[lb];
  const cite = `${T19[/** @type {'a' | 'b' | 'c'} */ (part)]}, column "Lower beam #${lb.slice(2, 3)}${lb.slice(3)} (${lb})"`;
  /** @type {string[]} */
  const notes = [usedIn(lb), MOVEABLE, ADB];
  if (visual) {
    notes.push('A visually/optically aimable lower beam must meet LB1V, LB2V, LB3V or LB4V (S10.18.9.5, p. 421), '
      + 'have a cut-off on the left (VOL) or right (VOR) of the optical axis (S10.18.9.1, p. 420), and be marked '
      + '"VOL" or "VOR" (S10.18.9.6.1, p. 422). A visually aimed lower beam may have no horizontal adjustment '
      + 'mechanism unless it meets the on-vehicle (VHAD) aiming rules (S10.18.4, p. 418).');
  }
  if (lb === 'LB1M' || lb === 'LB1V') notes.push(SIMULTANEOUS_UB1, CONTRIBUTORS);
  if (lb === 'LB2M' || lb === 'LB2V') notes.push(SIMULTANEOUS_UB2);
  if (lb === 'LB5M' || lb === 'LB4V') notes.push(SIMULTANEOUS_UB6);
  return {
    id: `lower-${lb}`,
    name: `Lower beam ${lb} (${visual ? 'visual/optical aim' : 'mechanical aim'})`,
    kind: 'headlamp',
    traffic: 'right',
    aim: visual ? AIM_LOWER_V : AIM_LOWER_M,
    tolerance: TOLERANCE,
    requirements: fromTable(XIX_ROWS, TABLE_XIX[lb], cite),
    notes,
  };
}

/** One function per column of Tables XVIII and XIX. @type {PhotometricFunction[]} */
export const FUNCTIONS = [
  ...['UB1', 'UB2', 'UB3', 'UB4', 'UB5', 'UB6'].map(upper),
  ...['LB1M', 'LB1V', 'LB2M', 'LB2V', 'LB3M', 'LB3V', 'LB4M', 'LB4V', 'LB5M'].map(lower),
];

/**
 * The headlighting systems of Tables II-a to II-d and the columns each must meet. Where the table offers a choice
 * ("UB2 OR UB3") the list holds every option; `null` is "N.A.".
 * @typedef {{ id: string, table: string, system: string, unit: string, upper: string[] | null, lowerMech: string[] | null,
 *   lowerVisual: string[] | null, notes: string[], cite: string }} HeadlightingSystem
 */
const IIA = `${CFR}, Table II-a (p. 459)`;
const IIB = `${CFR}, Table II-b (p. 460)`;
const IIC = `${CFR}, Table II-c (p. 460)`;
const IID = `${CFR}, Table II-d (pp. 460–461)`;
const NOTE_UB2 = 'Note (1): with UB2 and LB2M or LB2V the lower beam light source(s) may stay on with the upper beam if they contribute to upper beam compliance.';
const NOTE_LB_MAY = 'Note (2): lower beams may remain activated when upper beams are activated.';

/** @type {HeadlightingSystem[]} */
export const SYSTEMS = [
  { id: 'sealed-A-1A1', table: 'II-a', system: 'Sealed beam Type A, 100 × 165 mm, 2 lamps', unit: '1A1 (1 UB filament)', upper: ['UB4'], lowerMech: null, lowerVisual: null, notes: [], cite: IIA },
  { id: 'sealed-A-2A1', table: 'II-a', system: 'Sealed beam Type A, 100 × 165 mm, 2 lamps', unit: '2A1 (1 UB & 1 LB filaments)', upper: ['UB5'], lowerMech: ['LB4M'], lowerVisual: ['LB2V'], notes: [], cite: IIA },
  { id: 'sealed-B-2B1', table: 'II-a', system: 'Sealed beam Type B, 142 × 200 mm, 2 lamps', unit: '2B1 (1 UB & 1 LB filaments)', upper: ['UB3'], lowerMech: ['LB3M'], lowerVisual: ['LB3V'], notes: [], cite: IIA },
  { id: 'sealed-C-1C1', table: 'II-a', system: 'Sealed beam Type C, 146 mm dia., 2 lamps', unit: '1C1 (1 UB filament)', upper: ['UB4'], lowerMech: null, lowerVisual: null, notes: [], cite: IIA },
  { id: 'sealed-C-2C1', table: 'II-a', system: 'Sealed beam Type C, 146 mm dia., 2 lamps', unit: '2C1 (1 UB & 1 LB filaments)', upper: ['UB5'], lowerMech: ['LB4M'], lowerVisual: ['LB2V'], notes: [], cite: IIA },
  { id: 'sealed-D-2D1', table: 'II-a', system: 'Sealed beam Type D, 178 mm dia., 2 lamps', unit: '2D1 (1 UB & 1 LB filaments)', upper: ['UB3'], lowerMech: ['LB3M'], lowerVisual: ['LB3V'], notes: [], cite: IIA },
  { id: 'sealed-E-2E1', table: 'II-a', system: 'Sealed beam Type E, 100 × 165 mm, 2 lamps', unit: '2E1 (1 UB & 1 LB filaments)', upper: ['UB3'], lowerMech: ['LB3M'], lowerVisual: ['LB3V'], notes: [], cite: IIA },
  { id: 'sealed-F-UF', table: 'II-a', system: 'Sealed beam Type F, 92 × 150 mm, 2 lamps', unit: 'UF (1 UB filament)', upper: ['UB1'], lowerMech: null, lowerVisual: null,
    notes: ['Note (2): Type F lamps may be mounted on common or parallel seating and aiming planes for simultaneous aim, with restrictions (S10.13.2).', TYPE_F_REAIM], cite: IIA },
  { id: 'sealed-F-LF', table: 'II-a', system: 'Sealed beam Type F, 92 × 150 mm, 2 lamps', unit: 'LF (1 LB filament)', upper: null, lowerMech: ['LB1M'], lowerVisual: ['LB1V'],
    notes: ['Note (1): headlamps marked "LF" may remain activated when headlamps marked "UF" are activated.'], cite: IIA },
  { id: 'sealed-G-1G1', table: 'II-a', system: 'Sealed beam Type G, 2 lamps', unit: '1G1 (1 UB filament)', upper: ['UB4'], lowerMech: null, lowerVisual: null, notes: [], cite: IIA },
  { id: 'sealed-G-2G1', table: 'II-a', system: 'Sealed beam Type G, 2 lamps', unit: '2G1 (1 UB & 1 LB filaments)', upper: ['UB5'], lowerMech: ['LB4M'], lowerVisual: ['LB2V'], notes: [], cite: IIA },
  { id: 'sealed-H-2H1', table: 'II-a', system: 'Sealed beam Type H, 2 lamps', unit: '2H1 (1 UB & 1 LB filaments)', upper: ['UB3'], lowerMech: ['LB3M'], lowerVisual: ['LB3V'], notes: [], cite: IIA },
  { id: 'combination-2', table: 'II-b', system: 'Combination, 2-lamp system', unit: 'Two different headlamps chosen from Type F, an integral beam headlamp or a replaceable bulb headlamp',
    upper: ['UB2'], lowerMech: ['LB2M'], lowerVisual: ['LB2V'], notes: [NOTE_UB2], cite: IIB },
  { id: 'combination-4', table: 'II-b', system: 'Combination, 4-lamp system', unit: 'Any combination of four different headlamps chosen from Type F, an integral beam headlamp or a replaceable bulb headlamp',
    upper: ['UB1'], lowerMech: ['LB1M'], lowerVisual: ['LB1V'], notes: [NOTE_LB_MAY, 'Note (3): the beam contributor formula of S14.2.5.9 may apply to integral beam headlamps.'], cite: IIB },
  { id: 'integral-2', table: 'II-c', system: 'Integral beam, 2-lamp system', unit: 'Upper beam & lower beam', upper: ['UB2', 'UB3'], lowerMech: ['LB2M', 'LB3M'], lowerVisual: ['LB2V', 'LB3V'], notes: [NOTE_UB2], cite: IIC },
  { id: 'integral-4-UB4', table: 'II-c', system: 'Integral beam, 4-lamp system', unit: 'Upper beam', upper: ['UB4'], lowerMech: null, lowerVisual: null, notes: [], cite: IIC },
  { id: 'integral-4-UB5', table: 'II-c', system: 'Integral beam, 4-lamp system', unit: 'Upper beam & lower beam', upper: ['UB5'], lowerMech: ['LB4M'], lowerVisual: ['LB2V'], notes: [], cite: IIC },
  { id: 'integral-4-U', table: 'II-c', system: 'Integral beam, 4-lamp system', unit: 'Upper beam (U)', upper: ['UB1'], lowerMech: null, lowerVisual: null, notes: [], cite: IIC },
  { id: 'integral-4-L', table: 'II-c', system: 'Integral beam, 4-lamp system', unit: 'Lower beam (L)', upper: null, lowerMech: ['LB1M'], lowerVisual: ['LB1V'], notes: [NOTE_LB_MAY], cite: IIC },
  { id: 'integral-4-UB6', table: 'II-c', system: 'Integral beam, 4-lamp system', unit: 'Upper beam', upper: ['UB6'], lowerMech: null, lowerVisual: null, notes: [], cite: IIC },
  { id: 'integral-4-LB5M', table: 'II-c', system: 'Integral beam, 4-lamp system', unit: 'Lower beam', upper: null, lowerMech: ['LB5M'], lowerVisual: ['LB4V'],
    notes: ['Note (3): lower beams must remain activated when upper beams are activated.'], cite: IIC },
  { id: 'integral-contributor', table: 'II-c', system: 'Integral beam, beam contributor', unit: 'Upper beam & lower beam', upper: ['UB1'], lowerMech: ['LB1M'], lowerVisual: ['LB1V'],
    notes: [NOTE_LB_MAY, 'Note (4): the beam contributor photometric allocation formula of S14.2.5.9 applies.'], cite: IIC },
  { id: 'bulb-2-dual', table: 'II-d', system: 'Replaceable bulb, 2-lamp system', unit: 'Any dual filament type other than HB2, alone or with another dual filament type other than HB2',
    upper: ['UB2', 'UB3'], lowerMech: ['LB2M', 'LB3M'], lowerVisual: ['LB2V', 'LB3V'], notes: [NOTE_UB2], cite: IID },
  { id: 'bulb-2-single', table: 'II-d', system: 'Replaceable bulb, 2-lamp system', unit: 'HB2 or any single filament type, alone or with any other single or dual filament type',
    upper: ['UB2', 'UB3'], lowerMech: ['LB2M'], lowerVisual: ['LB2V'], notes: [NOTE_UB2], cite: IID },
  { id: 'bulb-4-dual', table: 'II-d', system: 'Replaceable bulb, 4-lamp system', unit: 'Any dual filament type other than HB2, alone or with another dual filament type other than HB2',
    upper: ['UB1', 'UB3'], lowerMech: ['LB1M', 'LB3M'], lowerVisual: ['LB1V', 'LB3V'], notes: [NOTE_LB_MAY + ' (Applies to UB1, LB1M, LB1V.)'], cite: IID },
  { id: 'bulb-4-single', table: 'II-d', system: 'Replaceable bulb, 4-lamp system', unit: 'HB2 or any single filament type, alone or with any other single or dual filament type (U & L)',
    upper: ['UB1'], lowerMech: ['LB1M'], lowerVisual: ['LB1V'], notes: [NOTE_LB_MAY], cite: IID },
];

/** Non-photometric rules recorded for reference only. */
export const OTHER_RULES = [
  { topic: 'Beam switching', text: 'A means of switching between lower and upper beams, operable by a simple movement of the '
    + 'driver\'s hand or foot, with no dead point; lower and upper beams not energised together except as S6.1.5.2 allows, '
    + 'momentarily for signalling, or while switching.', cite: `${CFR}, S9.4 (p. 410)` },
  { topic: 'Semiautomatic beam switching', text: 'Allowed as an alternative to S9.4 if it has operating instructions, a manual '
    + 'override, fail-safe manual control, and an indicator when control is automatic (S9.4.1.1–S9.4.1.4); and either '
    + 'Option 1 (lens cleanable, lens centre at least 24 in above the road, tests of S14.9.3.11) or Option 2 (adaptive '
    + 'driving beam: malfunction detection and warning, lower beams only below 32 km/h, Table XXI photometry).',
    cite: `${CFR}, S9.4.1–S9.4.1.6 (pp. 410–412)` },
  { topic: 'Aimability', text: 'Each headlamp must be aimable vertically and horizontally on the vehicle (S10.18.1) by an '
    + 'external aimer (S10.18.7), a VHAD (S10.18.8) or visually/optically (S10.18.9). Adjusting one axis through its range '
    + 'may not move the other more than ±0.76° (S10.18.3).', cite: `${CFR}, S10.18–S10.18.9 (pp. 417–422)` },
  { topic: 'Photometry procedure', text: 'Headlamps are measured under S14.2.5; the general procedure of S14.2.1, including its '
    + 'between-test-point rule, excludes headlamps.', cite: `${CFR}, S14.2.1 (p. 423), S14.2.5 (pp. 426–428)` },
];
