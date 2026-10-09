/** UN Regulation No. 148, original (00) series: photometric requirements for light-signalling lamps (position,
 * end-outline marker, parking, daytime running, stop, direction indicator, side marker, reversing, rear fog and
 * manoeuvring lamps; rear registration plate lamps as notes). Taiwan VSTD item 91 and India's AIS-198 adopt this
 * series. Source and choices: docs/research/r148-00-notes.md
 *
 * Authentic text: ECE/TRANS/WP.29/2018/157 (published as E/ECE/TRANS/505/Rev.3/Add.147), with Supplement 1
 * (ECE/TRANS/WP.29/2019/81 as amended by ECE/TRANS/WP.29/1149 para. 69: Table A2-1 row "Rear position pair (MR)"),
 * Supplement 2 (ECE/TRANS/WP.29/2020/32: Figure A3-I restated, Table 9 footnote 1 deleted), Supplement 3
 * (ECE/TRANS/WP.29/2021/45: §4.6.1 failure rules, Annex 3 §1.2 reversing-lamp rule), Supplement 4
 * (ECE/TRANS/WP.29/2022/37: §5.4.4.2, §5.10.2 formula, §5.11.3 plate categories) and Supplement 6
 * (ECE/TRANS/WP.29/2024/94: §5.4.1.1 reduced DRL). Supplement 5 (ECE/TRANS/WP.29/2023/35) changes no value
 * transcribed here. Page numbers are those printed in ECE/TRANS/WP.29/2018/157 unless a supplement is named.
 *
 * Coordinates: degrees, v positive upwards. For lamps that face forwards or rearwards, h is measured from the
 * reference axis and is positive outwards (away from the vehicle's median plane); Annex 2 draws its angles for a lamp
 * on the right of the vehicle and names them inboard and outboard. The Annex 3 grids for these lamps are symmetric
 * and are transcribed as printed. For side direction indicators (categories 5 and 6), h is measured outwards from
 * the rearward direction parallel to the median plane, and "direction A" is h = 5. For side marker lamps, h is
 * measured from the reference axis (perpendicular to the vehicle side) and is positive towards the front of the
 * vehicle. Intensities in candela. */

/**
 * @typedef {{ h: number, v: number }} PointGeometry
 * @typedef {{ h0: number, v0: number, h1: number, v1: number }} LineGeometry
 * @typedef {{ polygon: number[] }} ZoneGeometry
 * @typedef {{ h: number, v: number, percent: number }} DistributionPoint
 * @typedef {{
 *   kind: 'point' | 'line' | 'zone' | 'sum' | 'relative' | 'imax' | 'distribution' | 'note',
 *   id: string,
 *   cite: string,
 *   group?: string,
 *   when?: string[],
 *   replaces?: string,
 *   overrides?: string,
 *   measure?: 'everywhere' | 'brightest',
 *   min?: number,
 *   max?: number,
 *   h?: number, v?: number,
 *   h0?: number, v0?: number, h1?: number, v1?: number,
 *   polygon?: number[],
 *   points?: DistributionPoint[] | number[],
 *   reference?: { min: number, max?: number },
 *   between?: string,
 *   at?: PointGeometry | LineGeometry | ZoneGeometry,
 *   factor?: number,
 *   of?: string,
 *   bound?: 'min' | 'max',
 *   ratio?: { factor: number, numerator: string, denominator: string, zone: number[] },
 *   text?: string,
 * }} Requirement
 *   `when` lists CONDITIONS ids that must all hold for the requirement to apply; without it the requirement always
 *   applies. `replaces` names the requirement (same function) that this conditional one stands in for when its
 *   conditions hold. `overrides: 'imax'` marks an allowance that replaces the general maximum inside its zone.
 *   `between` states the rule for directions between grid points. `ratio` gives a ratio between two
 *   functions measured in the same direction, which the `relative` kind cannot express.
 * @typedef {{
 *   id: string, name: string, kind: 'signal', traffic: 'n/a', aim: string,
 *   tolerance: { deg: number, cite: string } | null,
 *   requirements: Requirement[], notes: string[],
 * }} SignalFunction
 */

export const SOURCE = {
  title: 'UN Regulation No. 148 (light-signalling devices), original (00) series, up to Supplement 6',
  document: 'ECE/TRANS/WP.29/2018/157 (published as E/ECE/TRANS/505/Rev.3/Add.147); Supplement 1 ECE/TRANS/WP.29/2019/81 as amended by ECE/TRANS/WP.29/1149 para. 69; Supplement 2 ECE/TRANS/WP.29/2020/32; Supplement 3 ECE/TRANS/WP.29/2021/45; Supplement 4 ECE/TRANS/WP.29/2022/37; Supplement 5 ECE/TRANS/WP.29/2023/35; Supplement 6 ECE/TRANS/WP.29/2024/94',
  url: 'https://documents.un.org/api/symbol/access?s=ECE/TRANS/WP.29/2018/157&l=en&t=pdf',
  retrieved: '2026-10-09',
};

/**
 * Condition atoms that requirements name in `when`. Atoms sharing a `set` are mutually exclusive states; atoms
 * without a set are facts the user declares about the lamp or its test.
 * @type {{ id: string, text: string, set?: string }[]}
 */
export const CONDITIONS = [
  { id: 'low-mounting', text: 'Lamp installed with its H-plane less than 750 mm above the ground. Table A2-1 note 1 reduces the inboard angle below the H-plane and note 2 the downward angle (R148 00 series Annex 2, p. 36); Table A2-2 note 2 (p. 38); Table A2-3 note 2 (p. 39).' },
  { id: 'high-mounting', text: 'Optional lamp installed with its H-plane more than 2,100 mm above the ground (Table A2-1 note 3, p. 36).' },
  { id: 'marked-d', text: 'Assembly of two independent lamps approved as a lamp marked "D": the maximum applies with all lamps lit, and the minimum values apply with either lamp failed (R148 00 series §4.8.4, p. 18). "D" is allowed only for front and rear position lamps except MA and MR, stop lamps except MS, end-outline marker lamps and direction indicators except categories 11, 11a, 11b, 11c and 12 (§4.4.1, p. 14).' },
  { id: 'day', set: 'period', text: 'Variable intensity lamp operating under daytime conditions (field minimum "by day", §5.5.3 p. 23 and §5.6.5 p. 25).' },
  { id: 'night', set: 'period', text: 'Variable intensity lamp operating under night-time conditions (field minimum "by night", §5.5.3 p. 23 and §5.6.5 p. 25).' },
  { id: 'singular', set: 'arrangement', text: 'L-category lamp (MA, MR or MS) installed singly (Table A2-1 rows "singular", p. 36).' },
  { id: 'pair', set: 'arrangement', text: 'L-category lamp (MA, MR or MS) installed as one of a pair (Table A2-1 rows "pair", p. 36, the MR row as amended by Supplement 1).' },
  { id: 'variable-night-limit', text: 'Variable intensity control: under night-time conditions for systems depending only on day and night, otherwise under standard conditions (MOR > 2,000 m, clean lens), the intensity may not exceed the steady maximum of the lamp (R148 00 series §4.8.9.2, p. 19; for category 2b §5.6.8, pp. 25–26, which says "reference conditions as demonstrated by the manufacturer"; for F2 §5.9.3, p. 28). Pairs R2/R1, RM2/RM1, S2/S1, S4/S3, 2b/2a, F2/F1 from §4.6.2 (pp. 15–16).' },
  { id: 'incorporated-with-stop', text: 'Rear position lamp, rear end-outline marker lamp or rearward facing parking lamp reciprocally incorporated (or, for a parking lamp, incorporated) with a stop lamp (R148 00 series §4.8.11 pp. 19–20, §5.2.3 p. 21, §5.3.2 p. 22).' },
  { id: 'reduced-drl', text: 'Daytime running lamp intended to be reduced under R48 (08 series or later) §6.19.7 (R148 00 series Supplement 6, §5.4.1.1).' },
  { id: 'red-side-marker', text: 'Side marker lamp emitting red light (R148 00 series §5.7.1, p. 27; §5.7.4, p. 27).' },
  { id: 'local-variation', text: 'Visual examination of the lamp appears to reveal substantial local variations of intensity (R148 00 series Annex 3 §1.2 as amended by Supplement 3, and §2.6, pp. 44–45).' },
];

const S = 'R148 00 series';
const SUP1 = 'R148 00 series Supplement 1 (ECE/TRANS/WP.29/2019/81 as amended by ECE/TRANS/WP.29/1149 para. 69)';
const SUP2 = 'R148 00 series Supplement 2 (ECE/TRANS/WP.29/2020/32)';
const SUP3 = 'R148 00 series Supplement 3 (ECE/TRANS/WP.29/2021/45)';
const SUP4 = 'R148 00 series Supplement 4 (ECE/TRANS/WP.29/2022/37)';
const SUP6 = 'R148 00 series Supplement 6 (ECE/TRANS/WP.29/2024/94)';

const C_MAX = `${S} §4.8.3.2 (p. 18): maximum "in no direction within the space from which the light-signalling lamp is visible"`;
const C_DIST = `${S} §4.8.3.1 (p. 18) and Annex 3 §1.1 (p. 41): minimum = Table minimum × percentage for the direction`;
const C_BETWEEN = `${S} Annex 3 §1.2 (p. 41), as restated by ${SUP3} p. 2`;
const C_D = `${S} §4.8.4 (p. 18)`;
const C_A21 = `${S} Annex 2, Table A2-1 (p. 36)`;

/** Rule for directions between grid points, Annex 3 §1.2 (p. 41). */
const BETWEEN_GRID = 'Within the field of light distribution schematically shown as a grid, the light pattern should be substantially uniform, i.e. the light intensity in each direction of a part of the field formed by the grid lines shall meet at least the lowest minimum value being shown on the grid lines surrounding the questioned direction as a percentage.';

/** @param {number[][]} rows [h, v, percent] @returns {DistributionPoint[]} */
const pts = rows => rows.map(([h, v, percent]) => ({ h, v, percent }));

/** Figure A3-I (p. 42; restated without stray letters by Supplement 2, p. 3, values unchanged): front and rear
 * position, parking, end-outline marker, stop (S1, S2, MS) and direction indicator lamps (1, 1a, 1b, 2a, 2b, 11, 11a,
 * 11b, 11c, 12). Percent of the Table minimum. Symmetric about V-V. */
export const FIGURE_A3_I = pts([
  [-5, 10, 20], [5, 10, 20],
  [-20, 5, 10], [-10, 5, 20], [0, 5, 70], [10, 5, 20], [20, 5, 10],
  [-10, 0, 35], [-5, 0, 90], [0, 0, 100], [5, 0, 90], [10, 0, 35],
  [-20, -5, 10], [-10, -5, 20], [0, -5, 70], [10, -5, 20], [20, -5, 10],
  [-5, -10, 20], [5, -10, 20],
]);

/** Figure A3-II (p. 42): daytime running lamps. Percent of the Table 6 minimum. Symmetric about V-V. */
export const FIGURE_A3_II = pts([
  [-5, 10, 20], [0, 10, 20], [5, 10, 20],
  [-20, 5, 10], [-10, 5, 20], [0, 5, 70], [10, 5, 20], [20, 5, 10],
  [-20, 0, 25], [-10, 0, 70], [-5, 0, 90], [0, 0, 100], [5, 0, 90], [10, 0, 70], [20, 0, 25],
  [-20, -5, 10], [-10, -5, 20], [0, -5, 70], [10, -5, 20], [20, -5, 10],
]);

/** Figure A3-III (p. 43): S3 and S4 stop lamps. Percent of the Table 7 minimum. Symmetric about V-V. */
export const FIGURE_A3_III = pts([
  [-10, 10, 32], [0, 10, 64], [10, 10, 32],
  [-10, 5, 64], [-5, 5, 100], [0, 5, 100], [5, 5, 100], [10, 5, 64],
  [-10, 0, 64], [-5, 0, 100], [0, 0, 100], [5, 0, 100], [10, 0, 64],
  [-10, -5, 64], [-5, -5, 100], [0, -5, 100], [5, -5, 100], [10, -5, 64],
]);

/** Figure A3-IV (p. 43): category 6 direction indicators. h outwards from the rearward direction parallel to the
 * vehicle side ("outer side of the vehicle"); 100 % at H = 5°, V = 0° (Annex 3 §2.4). Percent of the Table 8 minimum. */
export const FIGURE_A3_IV = pts([
  [5, 30, 20], [60, 30, 20],
  [30, 20, 30],
  [20, 15, 30],
  [5, 10, 40], [10, 10, 40],
  [5, 5, 60], [10, 5, 60],
  [5, 0, 100], [10, 0, 80], [20, 0, 40],
  [5, -5, 60], [10, -5, 60], [20, -5, 40], [30, -5, 20], [60, -5, 20],
]);

/** Figure A3-V (p. 44): reversing lamps. Values are minimum intensities in cd, not percentages. Symmetric. */
export const FIGURE_A3_V_CD = [
  [-10, 10, 10], [0, 10, 15], [10, 10, 10],
  [-45, 5, 15], [-10, 5, 20], [0, 5, 25], [10, 5, 20], [45, 5, 15],
  [-45, 0, 15], [-30, 0, 25], [-10, 0, 50], [0, 0, 80], [10, 0, 50], [30, 0, 25], [45, 0, 15],
  [-45, -5, 15], [-30, -5, 25], [-10, -5, 50], [0, -5, 80], [10, -5, 50], [30, -5, 25], [45, -5, 15],
];

/**
 * A field of geometric visibility as a polygon [h, v, …], h positive outboard.
 * @param {number} inboard @param {number} outboard @param {number} above @param {number} below
 * @param {number} [inboardBelow] reduced inboard angle below the H-plane (Table A2-1 note 1)
 */
function field(inboard, outboard, above, below, inboardBelow) {
  if (inboardBelow === undefined) return [-inboard, above, outboard, above, outboard, -below, -inboard, -below];
  return [-inboard, above, outboard, above, outboard, -below, -inboardBelow, -below, -inboardBelow, 0, -inboard, 0];
}

const LOW_DOWN = `Annex 3 §1.3 (p. 41): for front and rear direction indicators, front and rear position lamps, front and rear end-outline marker lamps, parking lamps, S1, S2 and MS stop lamps and side marker lamps installed with the H-plane at or below 750 mm, the photometric intensity is verified only down to 5° below H.`;

/**
 * Field-of-visibility zones from Table A2-1 for a lamp row, with the low and high mounting variants.
 * @param {string} cite @param {number} minCd
 * @param {{ inb: number, out: number, up: number, down: number, inbLow?: number, low?: [number, number], high?: [number, number] }} a
 * @param {'day' | 'night' | 'singular' | 'pair'} [state] CONDITIONS id of a day/night period or singular/pair arrangement
 * @returns {Requirement[]}
 */
function fieldZones(cite, minCd, a, state) {
  const base = state ? `field (${state})` : 'field';
  const when = state ? [state] : [];
  /** @type {Requirement[]} */
  const out = [{ kind: 'zone', id: base, group: 'field', polygon: field(a.inb, a.out, a.up, a.down), min: minCd, cite, ...(state ? { when } : {}) }];
  if (a.low) out.push({ kind: 'zone', id: state ? `field, low mounting (${state})` : 'field, low mounting', group: 'field', polygon: field(a.inb, a.out, a.low[0], a.low[1], a.inbLow), min: minCd, when: [...when, 'low-mounting'], replaces: base, cite: `${cite}, notes 1 and 2` });
  if (a.high) out.push({ kind: 'zone', id: state ? `field, high mounting (${state})` : 'field, high mounting', group: 'field', polygon: field(a.inb, a.out, a.high[0], a.high[1]), min: minCd, when: [...when, 'high-mounting'], replaces: base, cite: `${cite}, note 3` });
  return out;
}

/** @param {number} min @param {string} cite @returns {Requirement} */
const axis = (min, cite) => ({ kind: 'point', id: 'HV', group: 'axis', h: 0, v: 0, min, cite: `${S} §4.8.3 (p. 18); ${cite}, column "Minimum luminous intensity in H-V"` });
/** @param {number} max @param {string} cite @returns {Requirement} */
const imax = (max, cite) => ({ kind: 'imax', id: 'Imax', max, cite: `${C_MAX}; ${cite}, column "A single lamp" or "Maximum luminous intensity in any direction"` });
/** @param {number} max @param {string} cite @returns {Requirement} */
const imaxD = (max, cite) => ({ kind: 'imax', id: 'Imax, lamp marked "D"', max, when: ['marked-d'], replaces: 'Imax', cite: `${C_D}; ${cite}, column "A lamp marked D"` });
/** @param {DistributionPoint[]} points @param {number} min @param {string} cite @returns {Requirement} */
const dist = (points, min, cite) => ({ kind: 'distribution', id: 'Standard light distribution', group: 'field', reference: { min }, points, between: BETWEEN_GRID, cite: `${C_DIST}; ${cite}; between grid points: ${C_BETWEEN}` });

/**
 * Night-time maximum for a variable-intensity category: the steady category's maximum.
 * @param {number} max @param {string} steady @param {string} cite @returns {Requirement}
 */
const nightMax = (max, steady, cite) => ({ kind: 'imax', id: `Imax, night-time or standard conditions (${steady} maximum)`, max, when: ['variable-night-limit'], cite: `${S} §4.8.9.2 (p. 19) and §4.6.2 (pp. 15–16); ${cite}` });

const AIM = `The laboratory measures about the reference axis (H = 0°, V = 0°) and centre of reference that the applicant declares; on the vehicle the axis is horizontal, parallel to the median longitudinal plane and points in the required direction of visibility (${S} Annex 3 §1.1, p. 41). A lamp that may be installed in more than one position, or in a field of positions, is measured in each position or at the extremes of the field (§4.8.1.3, p. 17). Each of the two lamps supplied must comply (§4.8.3, p. 18).`;
const TOL = { deg: 0.25, cite: `${S} §4.8.1.2.3 (p. 17): if results are challenged, a requirement for a direction is met if it is met in a direction deviating by not more than one quarter of a degree; the receiver aperture is between 10′ and 1° (§4.8.1.2.2) and the distance must satisfy the inverse square law (§4.8.1.2.1)` };

const RATIO_5_1 = (/** @type {string} */ position, /** @type {string} */ stop) => /** @type {Requirement} */ ({
  kind: 'note', id: 'Stop to position ratio', group: 'field',
  when: ['incorporated-with-stop'],
  ratio: { factor: 5, numerator: `${stop} and ${position} lit together`, denominator: `${position} alone`, zone: [-10, 5, 10, 5, 10, -5, -10, -5] },
  text: 'The ratio of the intensities measured with both lamps lit to the intensity of the rear position (or end-outline marker) lamp alone "should be at least 5:1" in the field between ±5° V and ±10° H. If either lamp has more than one light source and counts as a single lamp, use the values with all sources lit.',
  cite: `${S} §4.8.11 (pp. 19–20)`,
});

const COMMON_NOTES = [
  `Each of the two samples must meet the requirements (${S} §4.8.3, p. 18, and §5.x.1). Lamps other than those with filament sources must meet minima and maxima after 1 min and after 30 min of operation; the 1 min distribution may be scaled from the 30 min one by the ratio at HV (${S} §4.8.2.3.2, p. 18). Direction indicators are run in flashing mode for this (f = 1.5 Hz, duty factor 50 %) (§4.8.2.3.2, §5.6.10).`,
  `Lamps with replaceable filament sources are measured with a standard light source at its reference luminous flux; with LED sources at 6.75 V, 13.5 V or 28.0 V with the flux corrected to the objective flux; lamps with non-replaceable sources at 6.75 V, 13.5 V or 28.0 V or the voltage the applicant declares (${S} §4.7.1, pp. 16–17; §4.8.2.2, pp. 17–18). Red lamps are measured in coloured light with the source continuously lit (§4.8.7, p. 19). LED substitute sources, if declared, repeat all measurements (§4.7.7 added by ${SUP1} p. 3).`,
  `Interdependent lamp systems ("Y") must meet the requirements with all their lamps lit together (${S} §4.8.5, p. 18).`,
  `Failure of one of several light sources: either the Annex 3 minima are still met (with maxima met when all sources are lit) or a tell-tale signal is produced and the axis intensity is at least 50 % of the minimum (${S} §4.6.1.2, p. 15, as restated by ${SUP3} p. 2). Option (b) does not apply to L-category stop and position lamps (§4.6.1.6).`,
];

/** Rows of Table A2-1 (p. 36, MR pair row as amended by Supplement 1) by lamp group. Angles in degrees. */
const A21 = {
  frontDI: { inb: 45, out: 80, up: 15, down: 15, inbLow: 20, low: /** @type {[number, number]} */ ([15, 5]) },
  rearDI: { inb: 45, out: 80, up: 15, down: 15, inbLow: 20, low: /** @type {[number, number]} */ ([15, 5]), high: /** @type {[number, number]} */ ([5, 15]) },
  frontRearDI: { inb: 20, out: 80, up: 15, down: 15, low: /** @type {[number, number]} */ ([15, 5]) },
  positionSingular: { inb: 80, out: 80, up: 15, down: 10, low: /** @type {[number, number]} */ ([15, 5]) },
  frontPositionPair: { inb: 20, out: 80, up: 15, down: 10, low: /** @type {[number, number]} */ ([15, 5]) },
  rearPositionPair: { inb: 20, out: 80, up: 15, down: 10, low: /** @type {[number, number]} */ ([15, 5]) },
  stopSingular: { inb: 45, out: 45, up: 15, down: 10, low: /** @type {[number, number]} */ ([15, 5]) },
  stopPair: { inb: 0, out: 45, up: 15, down: 10, low: /** @type {[number, number]} */ ([15, 5]) },
  position: { inb: 45, out: 80, up: 15, down: 15, inbLow: 20, low: /** @type {[number, number]} */ ([15, 5]), high: /** @type {[number, number]} */ ([5, 15]) },
  parking: { inb: 0, out: 45, up: 15, down: 15, low: /** @type {[number, number]} */ ([15, 5]) },
  endOutline: { inb: 0, out: 80, up: 15, down: 15, low: /** @type {[number, number]} */ ([15, 5]), high: /** @type {[number, number]} */ ([5, 15]) },
  stop: { inb: 45, out: 45, up: 15, down: 15, inbLow: 20, low: /** @type {[number, number]} */ ([15, 5]), high: /** @type {[number, number]} */ ([5, 15]) },
  highStop: { inb: 10, out: 10, up: 10, down: 5 },
  drl: { inb: 20, out: 20, up: 10, down: 5 },
};

const T3 = `${S} Table 3 (p. 20)`;
const T4 = `${S} Table 4 (p. 21)`;
const T5 = `${S} Table 5 (p. 22)`;
const T6 = `${S} Table 6 (p. 22), restated by ${SUP6} p. 2`;
const T7 = `${S} Table 7 (p. 23)`;
const T8 = `${S} Table 8 (p. 24)`;
const T9 = `${S} Table 9 (p. 27), footnote 1 deleted by ${SUP2} p. 2`;
const T10 = `${S} Table 10 (p. 27)`;
const T11 = `${S} Table 11 (p. 28)`;
const FIG1 = `Figure A3-I (p. 42), restated by ${SUP2} p. 3`;

/** Allowance of 60 cd below 5° down for a rear lamp incorporated with a stop lamp. */
const BELOW_5D_60 = (/** @type {string} */ cite) => /** @type {Requirement} */ ({
  kind: 'zone', id: 'Allowance below 5° down', group: 'field', polygon: [-90, -5, 90, -5, 90, -90, -90, -90], max: 60, overrides: 'imax', when: ['incorporated-with-stop'], cite,
});

/**
 * A position-type function on Figure A3-I.
 * @param {{ id: string, name: string, min: number, max: number, maxD?: number, cite: string, fields: Requirement[], extra?: Requirement[], notes?: string[] }} o
 * @returns {SignalFunction}
 */
function fig1Function(o) {
  /** @type {Requirement[]} */
  const reqs = [axis(o.min, o.cite), imax(o.max, o.cite)];
  if (o.maxD !== undefined) reqs.push(imaxD(o.maxD, o.cite));
  reqs.push(dist(FIGURE_A3_I, o.min, `${o.cite}; ${FIG1}`), ...o.fields, ...(o.extra ?? []));
  return { id: o.id, name: o.name, kind: 'signal', traffic: 'n/a', aim: AIM, tolerance: TOL, requirements: reqs, notes: [...(o.notes ?? []), LOW_DOWN, ...COMMON_NOTES] };
}

const C_DI_FIELD = `${S} §5.6.5 (p. 25)`;

/**
 * A direction indicator of categories 1, 1a, 1b, 2a, 2b, 11, 11a, 11b, 11c or 12.
 * @param {string} cat @param {string} where @param {number} min @param {number} max @param {number | undefined} maxD
 * @param {number} fieldMin @param {{ inb: number, out: number, up: number, down: number, inbLow?: number, low?: [number, number], high?: [number, number] }} row
 * @param {string} rowName @param {Requirement[]} [extra] @param {string[]} [notes] @returns {SignalFunction}
 */
function indicator(cat, where, min, max, maxD, fieldMin, row, rowName, extra, notes) {
  const variable = cat === '2b';
  const cite = `${C_DI_FIELD}; ${C_A21}, ${rowName}`;
  return fig1Function({
    id: `direction-indicator-${cat}`, name: `Direction indicator, category ${cat} (${where})`, min, max, maxD, cite: T8,
    fields: variable
      ? [...fieldZones(cite, 0.3, row, 'day'), ...fieldZones(cite, 0.07, row, 'night')]
      : fieldZones(cite, fieldMin, row),
    extra,
    notes: [
      ...(notes ?? []),
      `Colour amber (${S} §5.6.9, p. 26). A lamp may be measured in flashing mode (f = 1.5 ± 0.5 Hz, pulse width over 0.3 s at 95 % of peak, intensity reported as the maximum) (§5.6.6, p. 25). Sequential activation is allowed under §5.6.11 (p. 26; extended to categories 11, 11a, 11b, 11c and 12 by ${SUP2} p. 2), including a circumscribing rectangle with width to height of at least 1.7.`,
      ...(['1', '1a', '1b', '2a', '2b'].includes(cat) ? [`Failure: a tell-tale signal is required when a source fails, when a two-source lamp falls below 50 % of the axis minimum, or when the minimum is lost at H = 0°, V = 0°; H = 20° outward, V = +5°; or H = 10° inward, V = 0° (${S} §5.6.3, pp. 24–25).`] : [`The §4.6.1.2 failure rules do not apply to direction indicators; only categories 1, 1a, 1b, 2a and 2b have the §5.6.3 tell-tale rule (${S} §4.6.1.4 as restated by ${SUP3} p. 2).`]),
      ...(variable ? [`Category 2b has variable intensity. A failed variable intensity control must fall back to the steady requirements of category 2a (${S} §4.6.2, pp. 15–16). The lowest level must not take longer than the highest to reach 90 % of its value (§5.6.7, p. 25).`] : []),
    ],
  });
}

/** @type {SignalFunction[]} */
export const FUNCTIONS = [
  // Front position lamps, front end-outline marker lamps (5.1)
  fig1Function({
    id: 'front-position-A', name: 'Front position lamp (A)', min: 4, max: 140, maxD: 70, cite: T3,
    fields: fieldZones(`${S} §5.1.3 (p. 20); ${C_A21}, row "Front position (A), Rear position (R, R1, R2)"`, 0.05, A21.position),
    notes: [
      `Table 3 has a separate row for a front position lamp A incorporated in a headlamp or a front fog lamp: same 4 cd and 140 cd, but "D" is "N.A.", so such a lamp cannot be approved as a "D" assembly (${T3}).`,
      `Colour white (${S} §5.1.4, p. 21). With an infrared generator, the photometric and colour requirements apply with and without it operating (§4.5.5, p. 15). Approval as a front position lamp also counts as approval as an end-outline marker lamp (§4.5.1, p. 14).`,
    ],
  }),
  fig1Function({
    id: 'front-position-MA', name: 'Front position lamp for L-category vehicles (MA)', min: 4, max: 140, cite: T3,
    fields: [
      ...fieldZones(`${S} §5.1.3 (p. 20); ${C_A21}, row "Front position singular (MA)"`, 0.05, A21.positionSingular, 'singular'),
      ...fieldZones(`${S} §5.1.3 (p. 20); ${C_A21}, row "Front position pair (MA)"`, 0.05, A21.frontPositionPair, 'pair'),
    ],
    notes: [`Table 3 gives "N.A." for a lamp marked "D", and §4.4.1 (p. 14) excludes MA from "D" assemblies. Colour white, or amber for MA (${S} §5.1.4, p. 21). Table A2-1 gives separate fields for a singular lamp and for a pair.`],
  }),
  fig1Function({
    id: 'front-end-outline-AM', name: 'Front end-outline marker lamp (AM)', min: 4, max: 140, maxD: 70, cite: T3,
    fields: fieldZones(`${S} §5.1.3 (p. 20); ${C_A21}, row "Front end-outline marker (AM), Rear end-outline marker (RM1, RM2)"`, 0.05, A21.endOutline),
    notes: [`Colour white (${S} §5.1.4, p. 21). The 00 series has no option to verify the standard light distribution from the V-V line outboard only.`],
  }),

  // Rear position lamps, rear end-outline marker lamps (5.2)
  fig1Function({
    id: 'rear-position-R1', name: 'Rear position lamp, steady (R1)', min: 4, max: 17, maxD: 8.5, cite: T4,
    fields: fieldZones(`${S} §5.2.4 (p. 21); ${C_A21}, row "Front position (A), Rear position (R, R1, R2)"`, 0.05, A21.position),
    extra: [BELOW_5D_60(`${S} §5.2.3 (p. 21)`), RATIO_5_1('rear position lamp', 'stop lamp')],
    notes: [`Colour red (${S} §5.2.5, p. 21). A rear position lamp reciprocally incorporated with a stop lamp must be part of a multiple light source arrangement or be for vehicles with a failure monitoring system (§4.5.4, pp. 14–15).`],
  }),
  fig1Function({
    id: 'rear-position-R2', name: 'Rear position lamp, variable (R2)', min: 4, max: 42, maxD: 21, cite: T4,
    fields: fieldZones(`${S} §5.2.4 (p. 21); ${C_A21}, row "Front position (A), Rear position (R, R1, R2)"`, 0.05, A21.position),
    extra: [nightMax(17, 'R1', T4), BELOW_5D_60(`${S} §5.2.3 (p. 21)`), RATIO_5_1('rear position lamp', 'stop lamp')],
    notes: [`Colour red, also across the variable range (${S} §5.2.5, p. 21). A failed variable intensity control must fall back to the steady requirements of R1 (§4.6.2, pp. 15–16). The control must keep the intensity within the Table 4 range (§4.8.9.1, p. 19). The lowest level must not take longer than the highest to reach 90 % (§4.8.8, p. 19).`],
  }),
  fig1Function({
    id: 'rear-position-MR', name: 'Rear position lamp for L-category vehicles (MR)', min: 4, max: 17, cite: T4,
    fields: [
      ...fieldZones(`${S} §5.2.4 (p. 21); ${C_A21}, row "Rear position singular (MR)"`, 0.05, A21.positionSingular, 'singular'),
      ...fieldZones(`${S} §5.2.4 (p. 21); ${C_A21}, row "Rear position pair (MR)" as amended by ${SUP1}`, 0.05, A21.rearPositionPair, 'pair'),
    ],
    extra: [BELOW_5D_60(`${S} §5.2.3 (p. 21)`), RATIO_5_1('rear position lamp', 'stop lamp')],
    notes: [
      `Table 4 gives "N.A." for a lamp marked "D", and §4.4.1 (p. 14) excludes MR from "D" assemblies. Colour red (${S} §5.2.5, p. 21).`,
      `The original 00 text printed the MR pair field as 45°/80° inboard/outboard with 20°/80° below the H-plane for low lamps, and 15°/10° vertically. Supplement 1 replaced the row with 20°/80°, 15°/10° and 15°/5° below 750 mm; the WP.29 draft said 15°/15° vertically and WP.29 corrected it to 15°/10° at adoption (ECE/TRANS/WP.29/1149 para. 69; published slip E/ECE/TRANS/505/Rev.3/Add.147/Amend.1).`,
    ],
  }),
  fig1Function({
    id: 'rear-end-outline-RM1', name: 'Rear end-outline marker lamp, steady (RM1)', min: 4, max: 17, maxD: 8.5, cite: T4,
    fields: fieldZones(`${S} §5.2.4 (p. 21); ${C_A21}, row "Front end-outline marker (AM), Rear end-outline marker (RM1, RM2)"`, 0.05, A21.endOutline),
    extra: [RATIO_5_1('rear end-outline marker lamp', 'stop lamp')],
    notes: [`Colour red (${S} §5.2.5, p. 21). The 60 cd allowance below 5° down (§5.2.3) is written for rear position lamps only. The 00 series has no V-V-outboard-only option.`],
  }),
  fig1Function({
    id: 'rear-end-outline-RM2', name: 'Rear end-outline marker lamp, variable (RM2)', min: 4, max: 42, maxD: 21, cite: T4,
    fields: fieldZones(`${S} §5.2.4 (p. 21); ${C_A21}, row "Front end-outline marker (AM), Rear end-outline marker (RM1, RM2)"`, 0.05, A21.endOutline),
    extra: [nightMax(17, 'RM1', T4), RATIO_5_1('rear end-outline marker lamp', 'stop lamp')],
    notes: [`A failed variable intensity control must fall back to RM1 (${S} §4.6.2, pp. 15–16). Colour red, also across the variable range (§5.2.5, p. 21).`],
  }),

  // Parking lamps (5.3)
  fig1Function({
    id: 'parking-front', name: 'Parking lamp, forward facing (77R)', min: 2, max: 60, cite: T5,
    fields: fieldZones(`${S} §5.3.4 (p. 22); ${C_A21}, row "Front parking (77R), Rear parking (77R)"`, 0.05, A21.parking),
    notes: [
      `Table 5 has no "D" column and §4.4.1 (p. 14) does not list parking lamps for "D". Colour white (${S} §5.3.5, p. 22).`,
      `§5.3.4 (p. 22) applies the 0.05 cd field minimum "throughout the fields defined in the diagrams in Part B of Annex 2", while §5.3.3 refers to Part A for the standard light distribution. Part B (Table A2-2, p. 38) holds only side parking lamps (0°/45° applied to front and rear, 15°/15° vertically, 15°/5° below 750 mm); Part A (Table A2-1) has the "Front parking (77R), Rear parking (77R)" row with 0°/45° and 15°/15°. Both give the same angles, so the file uses Table A2-1.`,
    ],
  }),
  fig1Function({
    id: 'parking-rear', name: 'Parking lamp, rearward facing (77R)', min: 2, max: 30, cite: T5,
    fields: fieldZones(`${S} §5.3.4 (p. 22); ${C_A21}, row "Front parking (77R), Rear parking (77R)"`, 0.05, A21.parking),
    extra: [BELOW_5D_60(`${S} §5.3.2 (p. 22)`)],
    notes: [
      `Colour red; side facing parking lamps amber (${S} §5.3.5, p. 22).`,
      `Side parking lamps: see the forward facing entry; Table A2-2 (p. 38).`,
    ],
  }),

  // Daytime running lamps (5.4)
  {
    id: 'daytime-running-RL', name: 'Daytime running lamp (RL)', kind: 'signal', traffic: 'n/a', aim: AIM, tolerance: TOL,
    requirements: [
      axis(400, T6), imax(1200, T6),
      { kind: 'imax', id: 'Imax, reduced mode', max: 140, when: ['reduced-drl'], cite: `${SUP6} §5.4.1.1 (p. 2)` },
      dist(FIGURE_A3_II, 400, `${T6}; ${S} §5.4.2 (p. 22); Figure A3-II (p. 42)`),
      ...fieldZones(`${S} §5.4.3 (p. 22); ${C_A21}, row "Daytime running lamps (RL)"`, 1, A21.drl),
    ],
    notes: [
      `Table 6 has no "D" column and §4.4.1 (p. 14) does not list daytime running lamps for "D"; an interdependent "Y" system is allowed (§4.4.2).`,
      `Apparent surface in the direction of the reference axis between 25 cm² and 200 cm² (${S} §5.4.6, p. 23).`,
      `Failure of one of several sources: the Annex 3 §2.2 points must keep at least 80 % of their minima, or the axis keeps at least 50 % of the minimum and the lamp is only for vehicles with a tell-tale (${S} §5.4.4.2, p. 23, as restated by ${SUP4} p. 2).`,
      `Heat resistance test of Annex 6 (${S} §5.4.7, p. 23). Colour white (§5.4.5). A DRL whose maximum does not exceed 700 cd uses 700 cd as the conformity-of-production maximum (§3.5.1.1.1 added by ${SUP1} pp. 2–3).`,
      `The Annex 3 §1.3 rule that limits verification to 5° down for low-mounted lamps does not list daytime running lamps (p. 41).`,
      ...COMMON_NOTES,
    ],
  },

  // Stop lamps (5.5)
  fig1Function({
    id: 'stop-S1', name: 'Stop lamp, steady (S1)', min: 60, max: 260, maxD: 130, cite: T7,
    fields: fieldZones(`${S} §5.5.3 (p. 23); ${C_A21}, row "Stop lamp (S1, S2)"`, 0.3, A21.stop),
    extra: [RATIO_5_1('rear position or rear end-outline marker lamp', 'stop lamp')],
    notes: [`Colour red (${S} §5.5.4, p. 23).`],
  }),
  fig1Function({
    id: 'stop-S2', name: 'Stop lamp, variable (S2)', min: 60, max: 730, maxD: 365, cite: T7,
    fields: [...fieldZones(`${S} §5.5.3 (p. 23); ${C_A21}, row "Stop lamp (S1, S2)"`, 0.3, A21.stop, 'day'), ...fieldZones(`${S} §5.5.3 (p. 23); ${C_A21}, row "Stop lamp (S1, S2)"`, 0.07, A21.stop, 'night')],
    extra: [nightMax(260, 'S1', T7), RATIO_5_1('rear position or rear end-outline marker lamp', 'stop lamp')],
    notes: [`Colour red, also across the variable range (${S} §5.5.4, pp. 23–24). A failed variable intensity control must fall back to S1 (§4.6.2, pp. 15–16).`],
  }),
  {
    id: 'stop-S3', name: 'Centre high-mounted stop lamp, steady (S3)', kind: 'signal', traffic: 'n/a', aim: AIM, tolerance: TOL,
    requirements: [axis(25, T7), imax(110, T7), imaxD(55, T7), dist(FIGURE_A3_III, 25, `${T7}; ${S} §5.5.2 (p. 23); Figure A3-III (p. 43)`), ...fieldZones(`${S} §5.5.3 (p. 23); ${C_A21}, row "High mounted stop lamp (S3, S4)"`, 0.3, A21.highStop)],
    notes: [
      `A lamp mounted inside the vehicle is tested behind the sample plate(s) supplied, in the drawn position (${S} §4.7.6, p. 17), and its colour with the worst-case combination of lamp and rear window or sample plate (§5.5.4, p. 23). Colour red.`,
      `The Annex 3 §1.3 5°-down limit for low lamps does not list S3 or S4 (p. 41).`,
      ...COMMON_NOTES,
    ],
  },
  {
    id: 'stop-S4', name: 'Centre high-mounted stop lamp, variable (S4)', kind: 'signal', traffic: 'n/a', aim: AIM, tolerance: TOL,
    requirements: [
      axis(25, T7), imax(160, T7), imaxD(80, T7), nightMax(110, 'S3', T7), dist(FIGURE_A3_III, 25, `${T7}; ${S} §5.5.2 (p. 23); Figure A3-III (p. 43)`),
      ...fieldZones(`${S} §5.5.3 (p. 23); ${C_A21}, row "High mounted stop lamp (S3, S4)"`, 0.3, A21.highStop, 'day'),
      ...fieldZones(`${S} §5.5.3 (p. 23); ${C_A21}, row "High mounted stop lamp (S3, S4)"`, 0.07, A21.highStop, 'night'),
    ],
    notes: [
      `As S3 for lamps mounted inside the vehicle (${S} §4.7.6, §5.5.4). A failed variable intensity control must fall back to S3 (§4.6.2, pp. 15–16). Colour red.`,
      ...COMMON_NOTES,
    ],
  },
  fig1Function({
    id: 'stop-MS', name: 'Stop lamp for L-category vehicles (MS)', min: 40, max: 260, cite: T7,
    fields: [...fieldZones(`${S} §5.5.3 (p. 23); ${C_A21}, row "Stop singular (MS)"`, 0.3, A21.stopSingular, 'singular'), ...fieldZones(`${S} §5.5.3 (p. 23); ${C_A21}, row "Stop pair (MS)"`, 0.3, A21.stopPair, 'pair')],
    extra: [RATIO_5_1('rear position lamp', 'stop lamp')],
    notes: [`Table 7 gives "N.A." for a lamp marked "D", and §4.4.1 (p. 14) excludes MS from "D" assemblies. Colour red (${S} §5.5.4, p. 23). The 00 series has no V-V-outboard-only option for a pair.`],
  }),

  // Direction indicators (5.6)
  indicator('1', 'front', 175, 1000, 500, 0.3, A21.frontDI, 'row "Front direction indicator (1, 1a, 1b)"'),
  indicator('1a', 'front', 250, 1200, 600, 0.3, A21.frontDI, 'row "Front direction indicator (1, 1a, 1b)"'),
  indicator('1b', 'front', 400, 1200, 600, 0.7, A21.frontDI, 'row "Front direction indicator (1, 1a, 1b)"'),
  indicator('2a', 'rear, steady', 50, 500, 250, 0.3, A21.rearDI, 'row "Rear direction indicator (2a, 2b)"'),
  indicator('2b', 'rear, variable', 50, 1000, 500, 0.3, A21.rearDI, 'row "Rear direction indicator (2a, 2b)"', [{ ...nightMax(500, '2a', T8), cite: `${S} §5.6.8 (pp. 25–26) and §4.6.2 (pp. 15–16); ${T8}` }]),
  {
    id: 'direction-indicator-5', name: 'Side direction indicator, category 5', kind: 'signal', traffic: 'n/a',
    aim: `${AIM} For categories 5 and 6 the minimum applies in direction A (${S} §5.6.1 (b), p. 24): Figure A2-II (p. 37) draws direction A along the vehicle side, pointing rearwards, and Annex 3 §2.4 (p. 43) puts the category 6 reference at H = 5°, V = 0°; the file uses h = 5 for direction A.`,
    tolerance: TOL,
    requirements: [
      { kind: 'point', id: 'Direction A', group: 'axis', h: 5, v: 0, min: 0.6, cite: `${S} §5.6.1 (b) (p. 24); ${T8}` },
      imax(280, T8), imaxD(140, T8),
      { kind: 'zone', id: 'field', group: 'field', polygon: [5, 15, 60, 15, 60, -15, 5, -15], min: 0.6, cite: `${S} §5.6.4 (p. 25): "In divergence from paragraphs 4.8.3. and 4.8.3.1., for category 5 direction indicators, to the rear, a minimum value of 0.6 cd is required throughout the fields"; ${S} Annex 2 Table A2-2 (p. 38): horizontal angles A/B 5°/55°, vertical 15°/15°. Outer edge 60° = 5° + 55°, derived (see notes)` },
      { kind: 'zone', id: 'field, low mounting', group: 'field', polygon: [5, 15, 60, 15, 60, -5, 5, -5], min: 0.6, when: ['low-mounting'], replaces: 'field', cite: `${S} §5.6.4 (p. 25); Annex 2 Table A2-2 and note 2 (p. 38). Outer edge 60° derived` },
    ],
    notes: [
      `§5.6.4 refers to "the fields specified in Part A of Annex 2", but Part A (Table A2-1) has no category 5 row; the category 5 field is in Part B, Table A2-2 (p. 38). The file uses Table A2-2.`,
      `Field extent, an interpretation: Table A2-2 prints the horizontal angles as "A/B 5°/55°", applying to direction A. Figure A2-II (p. 37) draws angle A from the reference axis (parallel to the vehicle side, pointing rearwards) to the near edge of the field, and angle B as the width of the field from that edge. Read that way the field runs from 5° to 60°, the same extent as the category 6 grid in Figure A3-IV. If angle B is instead measured from the reference axis, the outer edge is 55°. Confirm with a technical service before relying on the 55°–60° strip.`,
      `Category 5 has no Annex 3 grid: §5.6.2 names grids only for the other categories and category 6, and §5.6.4 sets 0.6 cd throughout the field instead (${S} pp. 24–25).`,
      `Colour amber (${S} §5.6.9, p. 26).`,
      ...COMMON_NOTES,
    ],
  },
  {
    id: 'direction-indicator-6', name: 'Side direction indicator, category 6', kind: 'signal', traffic: 'n/a',
    aim: `${AIM} H = 0° is the rearward direction parallel to the vehicle side and h is positive outwards; "the reference axis, H = 5° and V = 0°, corresponds to the direction A" (${S} Annex 3 §2.4, p. 43).`,
    tolerance: TOL,
    requirements: [
      { kind: 'point', id: 'Direction A', group: 'axis', h: 5, v: 0, min: 50, cite: `${S} §5.6.1 (b) (p. 24); ${T8}; Annex 3 §2.4 (p. 43)` },
      imax(280, T8), imaxD(140, T8),
      { kind: 'distribution', id: 'Standard light distribution', group: 'field', reference: { min: 50 }, points: FIGURE_A3_IV, between: BETWEEN_GRID, cite: `${C_DIST}; ${S} §5.6.2 (b) (p. 24); ${T8}; Figure A3-IV (p. 43); between grid points: ${C_BETWEEN}` },
    ],
    notes: [
      `Table A2-2 (p. 38) gives category 6 a field of 5°/55° horizontally (applying to direction A) and 30° above / 5° below, but no paragraph sets a minimum throughout it: §5.6.5 lists every other category and not 5 or 6, and §5.6.4 covers only category 5. The Figure A3-IV grid spans the same field (h 0° to 60°, v −5° to +30°), so the grid and its between-points rule carry the requirement here. The 01 series drops the category 6 row from Table A2-2.`,
      `Colour amber. The lamp shows "R" or "L" for the side of the vehicle (${S} §3.3.2.5.1.3, p. 9). The limits of the light emitting surface, not the apparent surface, are determined for categories 5 and 6 (§4.7.5, p. 17).`,
      ...COMMON_NOTES,
    ],
  },
  indicator('11', 'front or rear', 90, 1000, undefined, 0.3, A21.frontRearDI, 'row "Front direction indicator (11, 11a, 11b, 11c), Rear direction indicator (12)"', undefined, [`Table 8 gives "N.A." for a lamp marked "D" (${T8}; §4.4.1, p. 14).`]),
  indicator('11a', 'front or rear', 175, 1000, undefined, 0.3, A21.frontRearDI, 'row "Front direction indicator (11, 11a, 11b, 11c), Rear direction indicator (12)"', undefined, [`Table 8 gives "N.A." for a lamp marked "D" (${T8}; §4.4.1, p. 14).`]),
  indicator('11b', 'front or rear', 250, 1200, undefined, 0.3, A21.frontRearDI, 'row "Front direction indicator (11, 11a, 11b, 11c), Rear direction indicator (12)"', undefined, [`Table 8 gives "N.A." for a lamp marked "D" (${T8}; §4.4.1, p. 14).`]),
  indicator('11c', 'front or rear', 400, 1200, undefined, 0.3, A21.frontRearDI, 'row "Front direction indicator (11, 11a, 11b, 11c), Rear direction indicator (12)"', undefined, [`Table 8 gives "N.A." for a lamp marked "D" (${T8}; §4.4.1, p. 14).`]),
  indicator('12', 'front or rear', 50, 500, undefined, 0.3, A21.frontRearDI, 'row "Front direction indicator (11, 11a, 11b, 11c), Rear direction indicator (12)"', undefined, [`Table A2-1 lists category 12 as a rear direction indicator (p. 36). Table 8 gives "N.A." for a lamp marked "D" (${T8}; §4.4.1, p. 14).`]),

  // Side marker lamps (5.7)
  ...[
    { cat: 'SM1', axisMin: 4, half: 45, fig: 'Figure A3-VII (p. 45)' },
    { cat: 'SM2', axisMin: 0.6, half: 30, fig: 'Figure A3-VIII (p. 45)' },
  ].map(({ cat, axisMin, half, fig }) => /** @type {SignalFunction} */ ({
    id: `side-marker-${cat}`, name: `Side marker lamp (${cat})`, kind: 'signal', traffic: 'n/a',
    aim: `${AIM} The reference axis is perpendicular to the vehicle side (Figure A2-III, p. 38). Here h is positive towards the front of the vehicle (angle A).`,
    tolerance: TOL,
    requirements: [
      { kind: 'point', id: 'HV', group: 'axis', h: 0, v: 0, min: axisMin, cite: `${T9}, row "Minimum intensity in the axis of reference"` },
      { kind: 'imax', id: 'Imax', max: 25, cite: `${T9}, row "Maximum intensity within the specified angular field"; ${S} §5.7.2 (b) (p. 27): "in no direction within the space from which the side marker lamp is visible"; ${fig}: "Maximum values: 25.0 cd at any point"` },
      { kind: 'zone', id: 'Standard light distribution', group: 'field', polygon: [-half, 10, half, 10, half, -10, -half, -10], min: 0.6, cite: `${T9}, row "Within the specified angular field, other than above" and angular field ±${half}° H, ±10° V; ${S} §5.7.2 (a) (p. 27); ${fig}: grid ±${half}° H, ±10° V, "Minimum values: 0.6 cd"` },
      { kind: 'zone', id: 'field', group: 'field', polygon: [-half, 10, half, 10, half, -10, -half, -10], min: 0.6, cite: `${S} §5.7.2 (p. 27); ${T9}; ${S} Annex 2 Table A2-3 (p. 39): ${half}°/${half}° (A/B), 10°/10°` },
      { kind: 'zone', id: 'field, low mounting', group: 'field', polygon: [-half, 10, half, 10, half, -5, -half, -5], min: 0.6, when: ['low-mounting'], replaces: 'field', cite: `${S} §5.7.2 (p. 27); Annex 2 Table A2-3 and note 2 (p. 39)` },
      { kind: 'zone', id: 'Red lamp towards the front', group: 'glare', polygon: [60, 20, 90, 20, 90, -20, 60, -20], max: 0.25, when: ['red-side-marker'], cite: `${S} §5.7.1, text below Table 9 (p. 27): 60° to 90° horizontally and ±20° vertically towards the front of the vehicle` },
    ],
    notes: [
      `It may be enough to check five points chosen by the type approval authority (${S} §5.7.3, p. 27).`,
      `Colour amber; red is allowed if the rearmost side marker lamp is grouped, combined or reciprocally incorporated with the rear position lamp, rear end-outline marker lamp, rear fog lamp or stop lamp, or is grouped with or shares light emitting surface with the rear retro-reflector (${S} §5.7.4, p. 27).`,
      LOW_DOWN,
      ...COMMON_NOTES,
    ],
  })),

  // Reversing lamps (5.8)
  {
    id: 'reversing-AR', name: 'Reversing lamp (AR)', kind: 'signal', traffic: 'n/a', aim: AIM, tolerance: TOL,
    requirements: [
      axis(80, T10),
      { kind: 'zone', id: 'Imax in or above H', polygon: [-90, 0, 90, 0, 90, 90, -90, 90], max: 300, cite: `${C_MAX}; ${T10}, column "in or above the h plane"` },
      { kind: 'zone', id: 'Imax below H to 5° down', polygon: [-90, 0, 90, 0, 90, -5, -90, -5], max: 600, cite: `${C_MAX}; ${T10}, column "below the h plane, down to 5°D"` },
      { kind: 'zone', id: 'Imax below 5° down', polygon: [-90, -5, 90, -5, 90, -90, -90, -90], max: 8000, cite: `${C_MAX}; ${T10}, column "below 5°D"` },
      ...FIGURE_A3_V_CD.map(([h, v, cd]) => /** @type {Requirement} */ ({ kind: 'point', id: `${h}, ${v}`, group: 'field', h, v, min: cd, cite: `${S} §5.8.2 (p. 27); Annex 3 §2.5 and Figure A3-V (p. 44), values in cd` })),
      { kind: 'note', id: 'Between points', group: 'field', when: ['local-variation'], text: 'If visual examination of a lamp appears to reveal substantial local variations of intensity, no intensity measured between two of the directions of measurement may be below 50 % of the lower minimum of the two prescribed for them.', cite: `${S} Annex 3 §1.2 as restated by ${SUP3} p. 2` },
    ],
    notes: [
      `A lamp intended only for installation in a pair may be verified only up to 30° inwards, where at least 25 cd is required; the communication form then says it must be installed in a pair (${S} §5.8.2, pp. 27–28).`,
      `No field of geometric visibility requirement. The boundaries in the maximum zones (±90° H) stand for "every direction in which the lamp is visible". Colour white (${S} §5.8.3, p. 28).`,
      `Lamps other than those with filament sources are measured after 1 min and after 10 min, scaled from the stabilised distribution by the ratio at HV (${S} §4.8.2.3.1, p. 18).`,
      `The 50 % rule between points was added by Supplement 3 (in force 30 September 2021); before it, Annex 3 §1.2 gave only the general grid rule.`,
      ...COMMON_NOTES.slice(1),
    ],
  },

  // Rear fog lamps (5.9)
  ...[
    { cat: 'F1', name: 'Rear fog lamp, steady (F1)', max: 300 },
    { cat: 'F2', name: 'Rear fog lamp, variable (F2)', max: 840 },
  ].map(({ cat, name, max }) => /** @type {SignalFunction} */ ({
    id: `rear-fog-${cat}`, name, kind: 'signal', traffic: 'n/a', aim: AIM, tolerance: TOL,
    requirements: [
      axis(150, T11),
      imax(max, T11),
      ...(cat === 'F2' ? [{ ...nightMax(300, 'F1', T11), cite: `${S} §5.9.3 (p. 28) and §4.6.2 (pp. 15–16); ${T11}` }] : []),
      { kind: 'line', id: 'H axis, 10° L to 10° R', group: 'field', h0: -10, v0: 0, h1: 10, v1: 0, min: 150, cite: `${T11}, column "Minimum luminous intensity along the axis HH and VV"; ${S} §5.9.2 (p. 28); Annex 3 §2.6, Figure A3-VI (p. 44): "150 cd Minimum" on the axes within the rhombus` },
      { kind: 'line', id: 'V axis, 5° D to 5° U', group: 'field', h0: 0, v0: -5, h1: 0, v1: 5, min: 150, cite: `${T11}; ${S} Annex 3 §2.6, Figure A3-VI (p. 44)` },
      { kind: 'zone', id: 'Rhombus', group: 'field', polygon: [-10, 0, 0, 5, 10, 0, 0, -5], min: 75, when: ['local-variation'], cite: `${S} Annex 3 §2.6 and Figure A3-VI (pp. 44–45)` },
    ],
    notes: [
      `No field of geometric visibility requirement. Apparent surface in the direction of the reference axis at most 140 cm² (${S} §5.9.4, p. 28). Heat resistance test of Annex 6 (§5.9.6). Colour red (§5.9.5).`,
      ...(cat === 'F2' ? [`A failed variable intensity control must fall back to F1 (${S} §4.6.2, pp. 15–16).`] : []),
      ...COMMON_NOTES,
    ],
  })),

  // Manoeuvring lamps (5.10)
  {
    id: 'manoeuvring-ML', name: 'Manoeuvring lamp (ML)', kind: 'signal', traffic: 'n/a', aim: AIM, tolerance: TOL,
    requirements: [
      { kind: 'imax', id: 'Imax', max: 500, cite: `${S} §5.10.1 (p. 28): in all directions in which the light can be observed, in any mounting position specified by the applicant` },
      { kind: 'note', id: 'Side, front and rear glare field', group: 'glare', text: 'Light emitted directly towards the side, front or rear must not exceed 0.5 cd between φmin = arctan((1 − h)/10) and φmax = φmin + 11.3° vertically, h the mounting height in m, and from +90° to −90° horizontally about the line through the reference axis perpendicular to the vehicle\'s vertical longitudinal plane. The field depends on mounting height, so it cannot be a fixed zone.', cite: `${S} §5.10.2 (pp. 28–29), formula as corrected by ${SUP4} p. 2` },
    ],
    notes: [
      `Measurement distance at least 3.0 m (${S} §5.10.2, p. 29). Colour white (§5.10.3). Lamps other than those with filament sources are measured after 1 min and after 10 min (§4.8.2.3.1, p. 18).`,
      `The original text printed the lower angle as "φmin = arctan (1-mounting height)/10"; Supplement 4 wrote it as arctan((1-h)/10).`,
    ],
  },

  // Rear registration plate illuminating lamps (5.11)
  {
    id: 'rear-registration-plate', name: 'Rear registration plate illuminating lamp (L, LM1)', kind: 'signal', traffic: 'n/a',
    aim: `The lamp is placed in the position(s) the manufacturer specifies relative to the plate space; luminance is measured on a diffuse colourless surface 2 mm in front of the plate holder, perpendicular to it within 5°, each point a 25 mm circle, corrected to a reflection factor of 1.0 (${S} §5.11.2 and §5.11.5, pp. 29–30).`,
    tolerance: null,
    requirements: [
      { kind: 'note', id: 'Luminance minimum', text: 'Luminance (not intensity) at each Annex 3 §3 measuring point at least 2.5 cd/m² for plate categories 1a, 1b, 1c, 2a and 2b, and at least 2.0 cd/m² for categories 1 and 2 (L-category vehicles).', cite: `${S} §5.11.3 (p. 29), restated by ${SUP4} p. 2` },
      { kind: 'note', id: 'Luminance gradient', text: 'Between any two measuring points, (B2 − B1) / distance in cm ≤ 2 × B0 per cm, B0 the lowest luminance measured.', cite: `${S} §5.11.3 (p. 29)` },
      { kind: 'note', id: 'Angle of incidence', text: 'The angle of incidence on the plate surface does not exceed 82° at any point, measured from the extremity of the illuminating area furthest from the plate.', cite: `${S} §5.11.5 (p. 30)` },
      { kind: 'note', id: 'No light to the rear', text: 'No light is emitted directly towards the rear, except red light when combined or grouped with a rear lamp.', cite: `${S} §5.11.5 (p. 30)` },
    ],
    notes: [
      `Plate categories and illuminated areas, added by ${SUP4} p. 2: 1a 340 × 240 mm, 1b 520 × 120 mm, 1c 255 × 165 mm (agricultural or forestry tractors), 2a 330 × 165 mm, 2b 440 × 220 mm, 1 130 × 240 mm and 2 200 × 280 mm (L-category). Supplement 2 redrew Figure A3-X (category 1b). The measuring points are drawn in Annex 3 Figures A3-IX to A3-XV (pp. 46–48) and are not transcribed here.`,
      `The whole plate must be visible within the angles of Annex 2 Part D (pp. 39–40). Colour: sufficiently colourless not to change the plate's colour appreciably (${S} §5.11.4, p. 29).`,
    ],
  },
];

/** Requirements that apply to every function or that the per-function entries cannot carry. */
export const GENERAL = [
  { kind: 'note', id: 'Conformity of production', text: 'No production value may deviate unfavourably by more than 20 % from the values prescribed; field minima map to Table A4-1: 0.7 → 0.5 cd (20 %) and 0.3 cd (30 %), 0.6 → 0.4 and 0.2, 0.3 → 0.2 and 0.1, 0.07 → 0.05 and 0.03, 0.05 → 0.03 and 0.02. Registration plate lamps: luminance gradient 2.5 × B0/cm (20 %) and 3.0 × B0/cm (30 %), Table A4-2.', cite: `${S} Annex 4 §1.2.1, Tables A4-1 and A4-2 (p. 49)` },
];
