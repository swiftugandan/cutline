/** UN Regulation No. 148, 01 series of amendments: photometric requirements for light-signalling lamps (position,
 * end-outline marker, parking, daytime running, stop, direction indicator, side marker, reversing, rear fog and
 * manoeuvring lamps; rear registration plate lamps as notes). Source and choices: docs/research/r148-notes.md
 *
 * Authentic text: ECE/TRANS/WP.29/2022/92 as corrected by ECE/TRANS/WP.29/1166 para. 142, published as
 * E/ECE/TRANS/505/Rev.3/Add.147/Amend.5, with Supplement 2 (ECE/TRANS/WP.29/2024/23: Table 8 replaced), Supplement 3
 * (ECE/TRANS/WP.29/2024/95: §5.4.1.1 added) and Supplement 6 (ECE/TRANS/WP.29/2026/34: Annex 3 §1.1 rounding rule).
 * Supplements 1, 4, 5, 7 and 8 change no value transcribed here. Page numbers are those printed in
 * ECE/TRANS/WP.29/2022/92 unless a supplement is named.
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
  title: 'UN Regulation No. 148 (light-signalling devices), 01 series of amendments, up to Supplement 7',
  document: 'ECE/TRANS/WP.29/2022/92 as corrected by ECE/TRANS/WP.29/1166 para. 142 (published as E/ECE/TRANS/505/Rev.3/Add.147/Amend.5); Supplement 2 ECE/TRANS/WP.29/2024/23; Supplement 3 ECE/TRANS/WP.29/2024/95; Supplement 6 ECE/TRANS/WP.29/2026/34',
  url: 'https://documents.un.org/api/symbol/access?s=ECE/TRANS/WP.29/2022/92&l=en&t=pdf',
  retrieved: '2026-10-09',
};

/**
 * Condition atoms that requirements name in `when`. Atoms sharing a `set` are mutually exclusive states; atoms
 * without a set are facts the user declares about the lamp or its test.
 * @type {{ id: string, text: string, set?: string }[]}
 */
export const CONDITIONS = [
  { id: 'low-mounting', text: 'Lamp installed with its H-plane less than 750 mm above the ground. Table A2-1 note a reduces the inboard angle below the H-plane and note b the downward angle (p. 35); Table A2-2 note b (p. 36); Table A2-3 note a (p. 37).' },
  { id: 'high-mounting', text: 'Optional lamp installed with its H-plane more than 2,100 mm above the ground (Table A2-1 note c, p. 35).' },
  { id: 'marked-d', text: 'Assembly of two independent lamps approved as a lamp marked "D": the maximum applies with all lamps lit, and the minimum values apply with either lamp failed (R148 01 series §4.8.3.2, p. 17).' },
  { id: 'day', set: 'period', text: 'Variable intensity lamp operating under daytime conditions (Tables 7 and 8, field minimum "(day)").' },
  { id: 'night', set: 'period', text: 'Variable intensity lamp operating under night-time conditions (Tables 7 and 8, field minimum "(night)").' },
  { id: 'singular', set: 'arrangement', text: 'L-category lamp (MA, MR or MS) installed singly (Table A2-1 rows "singular", p. 35).' },
  { id: 'pair', set: 'arrangement', text: 'L-category lamp (MA, MR or MS) installed as one of a pair (Table A2-1 rows "pair", p. 35).' },
  { id: 'variable-night-limit', text: 'Variable intensity control: under night-time conditions for systems depending only on day and night, otherwise under standard conditions (MOR > 2,000 m, clean lens), the intensity may not exceed the maximum of the corresponding steady category (R148 01 series §4.8.3.4.2, p. 18; pairs R2/R1, RM2/RM1, S2/S1, S4/S3, 2b/2a, F2/F1 from §4.6.2, p. 14).' },
  { id: 'incorporated-with-stop', text: 'Rear position, rear end-outline marker or rearward facing parking lamp reciprocally incorporated with a stop lamp (R148 01 series §4.8.3.5 p. 18, §5.2.1 p. 19, §5.3.1 p. 20).' },
  { id: 'reduced-drl', text: 'Daytime running lamp declared for reduced intensity under R48 (08 series or later) §6.19.7 (R148 01 series Supplement 3, §5.4.1.1).' },
  { id: 'red-side-marker', text: 'Side marker lamp emitting red light (R148 01 series §5.7.1, p. 24; §5.7.7 as amended by Supplement 2).' },
  { id: 'local-variation', text: 'Visual examination of the lamp suggests substantial local variations of intensity (R148 01 series Annex 3 §1.2 and §2.6, pp. 39 and 42).' },
];

const S = 'R148 01 series';
const SUP2 = 'R148 01 series Supplement 2 (ECE/TRANS/WP.29/2024/23)';
const SUP3 = 'R148 01 series Supplement 3 (ECE/TRANS/WP.29/2024/95)';
const SUP6 = 'R148 01 series Supplement 6 (ECE/TRANS/WP.29/2026/34)';

const C_AXIS = `${S} §4.8.3.1 (a) (p. 17)`;
const C_MAX = `${S} §4.8.3.1 (b) (p. 17): maximum "in no direction where the lamp is visible"`;
const C_DIST = `${S} §4.8.3.1 (c) (p. 17) and Annex 3 §1.1 (p. 39), as amended by ${SUP6} p. 4: minimum = Table minimum × percentage, rounded down to three significant digits`;
const C_FIELD = `${S} §4.8.3.1 (d) (p. 17)`;
const C_BETWEEN = `${S} Annex 3 §1.2 (p. 39)`;
const C_D = `${S} §4.8.3.2 (p. 17)`;
const C_A21 = `${S} Annex 2, Table A2-1 (p. 35)`;

/** Rule for directions between grid points, Annex 3 §1.2 (p. 39). */
const BETWEEN_GRID = 'Within the grid, the intensity in each direction of a part of the field formed by the grid lines shall meet at least the lowest minimum shown on the grid lines surrounding that direction.';

/** @param {number[][]} rows [h, v, percent] @returns {DistributionPoint[]} */
const pts = rows => rows.map(([h, v, percent]) => ({ h, v, percent }));

/** Figure A3-I (p. 40): front and rear position, parking, end-outline marker, stop (S1, S2, MS) and direction indicator
 * lamps (1, 1a, 1b, 2a, 2b, 11, 11a, 11b, 11c, 12). Percent of the Table minimum. Symmetric about V-V. */
export const FIGURE_A3_I = pts([
  [-5, 10, 20], [5, 10, 20],
  [-20, 5, 10], [-10, 5, 20], [0, 5, 70], [10, 5, 20], [20, 5, 10],
  [-10, 0, 35], [-5, 0, 90], [0, 0, 100], [5, 0, 90], [10, 0, 35],
  [-20, -5, 10], [-10, -5, 20], [0, -5, 70], [10, -5, 20], [20, -5, 10],
  [-5, -10, 20], [5, -10, 20],
]);

/** Figure A3-II (p. 40): daytime running lamps. Percent of the Table 6 minimum. Symmetric about V-V. */
export const FIGURE_A3_II = pts([
  [-5, 10, 20], [0, 10, 20], [5, 10, 20],
  [-20, 5, 10], [-10, 5, 20], [0, 5, 70], [10, 5, 20], [20, 5, 10],
  [-20, 0, 25], [-10, 0, 70], [-5, 0, 90], [0, 0, 100], [5, 0, 90], [10, 0, 70], [20, 0, 25],
  [-20, -5, 10], [-10, -5, 20], [0, -5, 70], [10, -5, 20], [20, -5, 10],
]);

/** Figure A3-III (p. 41): S3 and S4 stop lamps. Percent of the Table 7 minimum. Symmetric about V-V. */
export const FIGURE_A3_III = pts([
  [-10, 10, 32], [0, 10, 64], [10, 10, 32],
  [-10, 5, 64], [-5, 5, 100], [0, 5, 100], [5, 5, 100], [10, 5, 64],
  [-10, 0, 64], [-5, 0, 100], [0, 0, 100], [5, 0, 100], [10, 0, 64],
  [-10, -5, 64], [-5, -5, 100], [0, -5, 100], [5, -5, 100], [10, -5, 64],
]);

/** Figure A3-IV (p. 41): category 6 direction indicators. h outwards from the rearward direction parallel to the
 * vehicle side ("outer side of the vehicle"); 100 % at H = 5°, V = 0° (§2.4). Percent of the Table 8 minimum. */
export const FIGURE_A3_IV = pts([
  [5, 30, 20], [60, 30, 20],
  [30, 20, 30],
  [20, 15, 30],
  [5, 10, 40], [10, 10, 40],
  [5, 5, 60], [10, 5, 60],
  [5, 0, 100], [10, 0, 80], [20, 0, 40],
  [5, -5, 60], [10, -5, 60], [20, -5, 40], [30, -5, 20], [60, -5, 20],
]);

/** Figure A3-V (p. 42): reversing lamps. Values are minimum intensities in cd, not percentages. Symmetric. */
export const FIGURE_A3_V_CD = [
  [-10, 10, 10], [0, 10, 15], [10, 10, 10],
  [-45, 5, 15], [-10, 5, 20], [0, 5, 25], [10, 5, 20], [45, 5, 15],
  [-45, 0, 15], [-30, 0, 25], [-10, 0, 50], [0, 0, 80], [10, 0, 50], [30, 0, 25], [45, 0, 15],
  [-45, -5, 15], [-30, -5, 25], [-10, -5, 50], [0, -5, 80], [10, -5, 50], [30, -5, 25], [45, -5, 15],
];

/**
 * A field of geometric visibility as a polygon [h, v, …], h positive outboard.
 * @param {number} inboard @param {number} outboard @param {number} above @param {number} below
 * @param {number} [inboardBelow] reduced inboard angle below the H-plane (Table A2-1 note a)
 */
function field(inboard, outboard, above, below, inboardBelow) {
  if (inboardBelow === undefined) return [-inboard, above, outboard, above, outboard, -below, -inboard, -below];
  return [-inboard, above, outboard, above, outboard, -below, -inboardBelow, -below, -inboardBelow, 0, -inboard, 0];
}

const LOW_DOWN = `Annex 3 §1.1 (p. 39): for front and rear direction indicators, front and rear position lamps, end-outline marker lamps, parking lamps, S1, S2 and MS stop lamps and side marker lamps installed with the H-plane at or below 750 mm, the standard light distribution is verified only down to 5° below H.`;

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
  const out = [{ kind: 'zone', id: base, group: 'field', polygon: field(a.inb, a.out, a.up, a.down), min: minCd, cite: `${C_FIELD}; ${cite}`, ...(state ? { when } : {}) }];
  if (a.low) out.push({ kind: 'zone', id: state ? `field, low mounting (${state})` : 'field, low mounting', group: 'field', polygon: field(a.inb, a.out, a.low[0], a.low[1], a.inbLow), min: minCd, when: [...when, 'low-mounting'], replaces: base, cite: `${C_FIELD}; ${cite}, notes a and b` });
  if (a.high) out.push({ kind: 'zone', id: state ? `field, high mounting (${state})` : 'field, high mounting', group: 'field', polygon: field(a.inb, a.out, a.high[0], a.high[1]), min: minCd, when: [...when, 'high-mounting'], replaces: base, cite: `${C_FIELD}; ${cite}, note c` });
  return out;
}

/** @param {number} min @param {string} cite @returns {Requirement} */
const axis = (min, cite) => ({ kind: 'point', id: 'HV', group: 'axis', h: 0, v: 0, min, cite: `${C_AXIS}; ${cite}` });
/** @param {number} max @param {string} cite @returns {Requirement} */
const imax = (max, cite) => ({ kind: 'imax', id: 'Imax', max, cite: `${C_MAX}; ${cite}` });
/** @param {number} max @param {string} cite @returns {Requirement} */
const imaxD = (max, cite) => ({ kind: 'imax', id: 'Imax, lamp marked "D"', max, when: ['marked-d'], replaces: 'Imax', cite: `${C_D}; ${cite}` });
/** @param {DistributionPoint[]} points @param {number} min @param {string} cite @returns {Requirement} */
const dist = (points, min, cite) => ({ kind: 'distribution', id: 'Standard light distribution', group: 'field', reference: { min }, points, between: BETWEEN_GRID, cite: `${C_DIST}; ${cite}; between grid points: ${C_BETWEEN}` });

/**
 * Night-time maximum for a variable-intensity category: the steady category's maximum. §4.8.3.4.2 (p. 18).
 * @param {number} max @param {string} steady @param {string} cite @returns {Requirement}
 */
const nightMax = (max, steady, cite) => ({ kind: 'imax', id: `Imax, night-time or standard conditions (${steady} maximum)`, max, when: ['variable-night-limit'], cite: `${S} §4.8.3.4.2 (p. 18) and §4.6.2 (p. 14); ${cite}` });

const AIM = `The laboratory measures about the reference axis (H = 0°, V = 0°) and centre of reference that the applicant declares on the drawings (${S} §3.1.2.1 (b), p. 4; Annex 3 §1.1, p. 39). On the vehicle the axis is horizontal, parallel to the median longitudinal plane and points in the required direction of visibility. A lamp that may be installed in several positions is measured in each position or at the extremes of the field (§4.8.1.5, p. 16).`;
const TOL = { deg: 0.25, cite: `${S} §4.8.1.8.3 (p. 16): if results are challenged, a requirement for a direction is met if it is met within 0.25° of that direction; the receiver aperture is between 10′ and 1° (§4.8.1.8.2)` };

const RATIO_5_1 = (/** @type {string} */ position, /** @type {string} */ stop) => /** @type {Requirement} */ ({
  kind: 'note', id: 'Stop to position ratio', group: 'field',
  when: ['incorporated-with-stop'],
  ratio: { factor: 5, numerator: `${stop} and ${position} lit together`, denominator: `${position} alone`, zone: [-10, 5, 10, 5, 10, -5, -10, -5] },
  text: 'The ratio of the intensities measured with both functions lit to the intensity of the position (or end-outline marker) function alone "should be at least 5:1" in the field between ±5° V and ±10° H, measured in the same direction. If either function has more than one light source and counts as a single lamp, use the values with all sources lit.',
  cite: `${S} §4.8.3.5 (p. 18)`,
});

const COMMON_NOTES = [
  `Each of the two samples must meet the requirements (${S} §5.x.1). Lamps with non-incandescent sources must meet minima and maxima after 1 min and after 30 min (or after photometric stability), and some technologies also at the times in Table A8-1 (${S} Annex 8, pp. 55–56; ${SUP2} p. 2).`,
  `Lamps with replaceable UN light sources are measured with standard light sources at reference flux; other lamps with their own sources at the declared voltage, 6.75 V, 13.5 V or 28 V (${S} §4.8.1–4.8.2, pp. 15–17).`,
  `Interdependent lamp systems ("Y") must meet the requirements with all their lamps lit together (${S} §4.8.3.3, p. 17).`,
  `Failure of one of several light sources: either the Annex 3 minima are still met (with maxima met when all sources are lit) or a tell-tale signal is produced (${S} §4.6.1.2, p. 13).`,
];

/** Rows of Table A2-1 (p. 35) by lamp group. Angles in degrees. */
const A21 = {
  frontDI: { inb: 45, out: 80, up: 15, down: 15, inbLow: 20, low: /** @type {[number, number]} */ ([15, 5]) },
  rearDI: { inb: 45, out: 80, up: 15, down: 15, inbLow: 20, low: /** @type {[number, number]} */ ([15, 5]), high: /** @type {[number, number]} */ ([5, 15]) },
  frontRearDI: { inb: 20, out: 80, up: 15, down: 15, low: /** @type {[number, number]} */ ([15, 5]) },
  positionSingular: { inb: 80, out: 80, up: 15, down: 10, low: /** @type {[number, number]} */ ([15, 5]) },
  positionPair: { inb: 20, out: 80, up: 15, down: 10, low: /** @type {[number, number]} */ ([15, 5]) },
  stopSingular: { inb: 45, out: 45, up: 15, down: 10, low: /** @type {[number, number]} */ ([15, 5]) },
  stopPair: { inb: 0, out: 45, up: 15, down: 10, low: /** @type {[number, number]} */ ([15, 5]) },
  position: { inb: 45, out: 80, up: 15, down: 15, inbLow: 20, low: /** @type {[number, number]} */ ([15, 5]), high: /** @type {[number, number]} */ ([5, 15]) },
  parking: { inb: 0, out: 45, up: 15, down: 15, low: /** @type {[number, number]} */ ([15, 5]) },
  endOutline: { inb: 0, out: 80, up: 15, down: 15, low: /** @type {[number, number]} */ ([15, 5]), high: /** @type {[number, number]} */ ([5, 15]) },
  stop: { inb: 45, out: 45, up: 15, down: 15, inbLow: 20, low: /** @type {[number, number]} */ ([15, 5]), high: /** @type {[number, number]} */ ([5, 15]) },
  highStop: { inb: 10, out: 10, up: 10, down: 5 },
  drl: { inb: 20, out: 20, up: 10, down: 5 },
};

const T3 = `${S} Table 3 (p. 19)`;
const T4 = `${S} Table 4 (p. 20)`;
const T5 = `${S} Table 5 (p. 20)`;
const T6 = `${S} Table 6 (p. 21), restated by ${SUP3} p. 2`;
const T7 = `${S} Table 7 (p. 22)`;
const T8 = `${S} Table 8 as replaced by ${SUP2} p. 2`;
const T9 = `${S} Table 9 (p. 24)`;
const T10 = `${S} Table 10 (p. 25)`;
const T11 = `${S} Table 11 (p. 26)`;
const FIG1 = `Figure A3-I (p. 40)`;

/** Allowance of 60 cd below 5° down for a rear lamp incorporated with a stop lamp. */
const BELOW_5D_60 = (/** @type {string} */ cite) => /** @type {Requirement} */ ({
  kind: 'zone', id: 'Allowance below 5° down', group: 'field', polygon: [-90, -5, 90, -5, 90, -90, -90, -90], max: 60, overrides: 'imax', when: ['incorporated-with-stop'], cite,
});

/**
 * A position-type function on Figure A3-I.
 * @param {{ id: string, name: string, min: number, max: number, maxD?: number, cite: string, fieldMin: number, fields: Requirement[], extra?: Requirement[], notes?: string[] }} o
 * @returns {SignalFunction}
 */
function fig1Function(o) {
  /** @type {Requirement[]} */
  const reqs = [axis(o.min, o.cite), imax(o.max, o.cite)];
  if (o.maxD !== undefined) reqs.push(imaxD(o.maxD, o.cite));
  reqs.push(dist(FIGURE_A3_I, o.min, `${o.cite}; ${FIG1}`), ...o.fields, ...(o.extra ?? []));
  return { id: o.id, name: o.name, kind: 'signal', traffic: 'n/a', aim: AIM, tolerance: TOL, requirements: reqs, notes: [...(o.notes ?? []), LOW_DOWN, ...COMMON_NOTES] };
}

/**
 * A direction indicator of categories 1, 1a, 1b, 2a, 2b, 11, 11a, 11b, 11c or 12.
 * @param {string} cat @param {string} where @param {number} min @param {number} max @param {number} maxD
 * @param {number} fieldMin @param {{ inb: number, out: number, up: number, down: number, inbLow?: number, low?: [number, number], high?: [number, number] }} row
 * @param {string} rowName @param {Requirement[]} [extra] @returns {SignalFunction}
 */
function indicator(cat, where, min, max, maxD, fieldMin, row, rowName, extra) {
  const variable = cat === '2b';
  return fig1Function({
    id: `direction-indicator-${cat}`, name: `Direction indicator, category ${cat} (${where})`, min, max, maxD, cite: T8, fieldMin,
    fields: variable
      ? [...fieldZones(`${C_A21}, ${rowName}; ${T8}`, 0.3, row, 'day'), ...fieldZones(`${C_A21}, ${rowName}; ${T8}`, 0.07, row, 'night')]
      : fieldZones(`${C_A21}, ${rowName}; ${T8}`, fieldMin, row),
    extra,
    notes: [
      `Colour amber (${S} §5.6.7, p. 24). A lamp may be measured in flashing mode (f = 1.5 ± 0.5 Hz, pulse width over 0.3 s, intensity reported as the maximum) (§5.6.4, p. 23). Sequential activation is allowed under §5.6.5 (pp. 23–24), including a circumscribing rectangle with width to height of at least 1.7.`,
      `Failure: a tell-tale signal is required when a source fails, when a two-source lamp falls below 50 % of the axis minimum, or when the minimum is lost at H = 0°, V = 0°; H = 20° outward, V = +5°; or H = 10° inward, V = 0° (${S} §4.6.1.4, p. 14).`,
      ...(variable ? [`Category 2b has variable intensity. A failed variable intensity control must fall back to the steady requirements of category 2a (§4.6.2, p. 14).`] : []),
    ],
  });
}

/** @type {SignalFunction[]} */
export const FUNCTIONS = [
  // Front position lamps, front end-outline marker lamps (5.1)
  fig1Function({
    id: 'front-position-A', name: 'Front position lamp (A)', min: 4, max: 140, maxD: 70, cite: T3, fieldMin: 0.05,
    fields: fieldZones(`${C_A21}, row "Front/rear position (A, R1, R2)"; ${T3}`, 0.05, A21.position),
    notes: [`Colour white (${S} §5.1.7, p. 19). With an infrared generator, the photometric and colour requirements apply with and without it operating (§4.5.4, p. 13). Approval as a front position lamp also counts as approval as an end-outline marker lamp (§4.5.1, p. 12).`],
  }),
  fig1Function({
    id: 'front-position-MA', name: 'Front position lamp for L-category vehicles (MA)', min: 4, max: 140, maxD: 70, cite: T3, fieldMin: 0.05,
    fields: [...fieldZones(`${C_A21}, row "Front/rear position singular (MA, MR)"; ${T3}`, 0.05, A21.positionSingular, 'singular'), ...fieldZones(`${C_A21}, row "Front/rear position pair (MA, MR)"; ${T3}`, 0.05, A21.positionPair, 'pair')],
    notes: [`Colour white, or amber for MA (${S} §5.1.7, p. 19). Table A2-1 gives separate fields for a singular lamp and for a pair.`],
  }),
  fig1Function({
    id: 'front-end-outline-AM', name: 'Front end-outline marker lamp (AM)', min: 4, max: 140, maxD: 70, cite: T3, fieldMin: 0.05,
    fields: fieldZones(`${C_A21}, row "Front/rear end-outline marker (AM, RM1, RM2)"; ${T3}`, 0.05, A21.endOutline),
    notes: [`At the applicant's request the standard light distribution may be considered from the V-V line outboard only (${S} §5.1.4, p. 19). Colour white (§5.1.7).`],
  }),

  // Rear position lamps, rear end-outline marker lamps (5.2)
  fig1Function({
    id: 'rear-position-R1', name: 'Rear position lamp, steady (R1)', min: 4, max: 17, maxD: 8.5, cite: T4, fieldMin: 0.05,
    fields: fieldZones(`${C_A21}, row "Front/rear position (A, R1, R2)"; ${T4}`, 0.05, A21.position),
    extra: [BELOW_5D_60(`${S} §5.2.1 (p. 19)`), RATIO_5_1('rear position lamp', 'stop lamp')],
    notes: [`Colour red (${S} §5.2.7, p. 20). A rear position lamp reciprocally incorporated with a stop lamp must use multiple light sources or be for vehicles with a failure tell-tale (§4.5.3.1, p. 12).`],
  }),
  fig1Function({
    id: 'rear-position-R2', name: 'Rear position lamp, variable (R2)', min: 4, max: 42, maxD: 21, cite: T4, fieldMin: 0.05,
    fields: fieldZones(`${C_A21}, row "Front/rear position (A, R1, R2)"; ${T4}`, 0.05, A21.position),
    extra: [nightMax(17, 'R1', T4), BELOW_5D_60(`${S} §5.2.1 (p. 19)`), RATIO_5_1('rear position lamp', 'stop lamp')],
    notes: [`Colour red (${S} §5.2.7, p. 20). A failed variable intensity control must fall back to the steady requirements of R1 (§4.6.2, p. 14). The control must keep the intensity within the Table 4 range (§4.8.3.4.1, p. 18).`],
  }),
  fig1Function({
    id: 'rear-position-MR', name: 'Rear position lamp for L-category vehicles (MR)', min: 4, max: 17, maxD: 8.5, cite: T4, fieldMin: 0.05,
    fields: [...fieldZones(`${C_A21}, row "Front/rear position singular (MA, MR)"; ${T4}`, 0.05, A21.positionSingular, 'singular'), ...fieldZones(`${C_A21}, row "Front/rear position pair (MA, MR)"; ${T4}`, 0.05, A21.positionPair, 'pair')],
    extra: [BELOW_5D_60(`${S} §5.2.1 (p. 19)`), RATIO_5_1('rear position lamp', 'stop lamp')],
    notes: [`Colour red (${S} §5.2.7, p. 20). Table 4 lists MR with R1 and RM1 as steady.`],
  }),
  fig1Function({
    id: 'rear-end-outline-RM1', name: 'Rear end-outline marker lamp, steady (RM1)', min: 4, max: 17, maxD: 8.5, cite: T4, fieldMin: 0.05,
    fields: fieldZones(`${C_A21}, row "Front/rear end-outline marker (AM, RM1, RM2)"; ${T4}`, 0.05, A21.endOutline),
    extra: [RATIO_5_1('rear end-outline marker lamp', 'stop lamp')],
    notes: [`At the applicant's request the standard light distribution may be considered from the V-V line outboard only (${S} §5.2.4, p. 20). Colour red (§5.2.7).`],
  }),
  fig1Function({
    id: 'rear-end-outline-RM2', name: 'Rear end-outline marker lamp, variable (RM2)', min: 4, max: 42, maxD: 21, cite: T4, fieldMin: 0.05,
    fields: fieldZones(`${C_A21}, row "Front/rear end-outline marker (AM, RM1, RM2)"; ${T4}`, 0.05, A21.endOutline),
    extra: [nightMax(17, 'RM1', T4), RATIO_5_1('rear end-outline marker lamp', 'stop lamp')],
    notes: [`At the applicant's request the standard light distribution may be considered from the V-V line outboard only (${S} §5.2.4, p. 20). A failed variable intensity control must fall back to RM1 (§4.6.2, p. 14). Colour red.`],
  }),

  // Parking lamps (5.3)
  fig1Function({
    id: 'parking-front', name: 'Parking lamp, forward facing (77R)', min: 2, max: 60, cite: T5, fieldMin: 0.05,
    fields: fieldZones(`${C_A21}, row "Front/rear parking (77R)"; ${T5}`, 0.05, A21.parking),
    notes: [
      `At the applicant's request the standard light distribution may be considered from the V-V line outboard only (${S} §5.3.4, p. 21). Colour white (§5.3.7). Table 5 has no "D" column.`,
      `Side parking lamps combine a forward and a rearward facing parking lamp; Table A2-2 (p. 36) gives 0°/45° horizontally, applied to front and rear, and 15°/15° vertically (15°/5° below 750 mm). The rows here use Table A2-1.`,
    ],
  }),
  fig1Function({
    id: 'parking-rear', name: 'Parking lamp, rearward facing (77R)', min: 2, max: 30, cite: T5, fieldMin: 0.05,
    fields: fieldZones(`${C_A21}, row "Front/rear parking (77R)"; ${T5}`, 0.05, A21.parking),
    extra: [BELOW_5D_60(`${S} §5.3.1 (p. 20)`)],
    notes: [
      `At the applicant's request the standard light distribution may be considered from the V-V line outboard only (${S} §5.3.4, p. 21). Colour red (§5.3.7).`,
      `Side parking lamps: see the forward facing entry; Table A2-2 (p. 36).`,
    ],
  }),

  // Daytime running lamps (5.4)
  {
    id: 'daytime-running-RL', name: 'Daytime running lamp (RL)', kind: 'signal', traffic: 'n/a', aim: AIM, tolerance: TOL,
    requirements: [
      axis(400, T6), imax(1200, T6), imaxD(600, T6),
      { kind: 'imax', id: 'Imax, reduced mode', max: 140, when: ['reduced-drl'], cite: `${SUP3} §5.4.1.1 (p. 2)` },
      dist(FIGURE_A3_II, 400, `${T6}; Figure A3-II (p. 40)`),
      ...fieldZones(`${C_A21}, row "Daytime running lamps (RL)"; ${T6}`, 1, A21.drl),
    ],
    notes: [
      `Apparent surface in the direction of the reference axis between 25 cm² and 200 cm²; at most 100 cm² for a lamp marked "D" (${S} §5.4.3, p. 21).`,
      `Failure of one of several sources: the Annex 3 §2.2 points must keep at least 80 % of their minima, or a tell-tale signal is produced (${S} §4.6.1.3, p. 13).`,
      `Heat resistance test of Annex 6 (${S} §5.4.5, p. 21). Colour white (§5.4.7). For an L3 DRL with designed maximum up to 700 cd, 700 cd is the conformity-of-production maximum (§6.1.3.1, p. 29).`,
      `The Annex 3 §1.1 rule that limits verification to 5° down for low-mounted lamps does not list daytime running lamps (p. 39).`,
      ...COMMON_NOTES,
    ],
  },

  // Stop lamps (5.5)
  fig1Function({
    id: 'stop-S1', name: 'Stop lamp, steady (S1)', min: 60, max: 260, maxD: 130, cite: T7, fieldMin: 0.3,
    fields: fieldZones(`${C_A21}, row "Stop lamp (S1, S2)"; ${T7}`, 0.3, A21.stop),
    extra: [RATIO_5_1('rear position or rear end-outline marker lamp', 'stop lamp')],
    notes: [`Colour red (${S} §5.5.7, p. 22).`],
  }),
  fig1Function({
    id: 'stop-S2', name: 'Stop lamp, variable (S2)', min: 60, max: 730, maxD: 365, cite: T7, fieldMin: 0.3,
    fields: [...fieldZones(`${C_A21}, row "Stop lamp (S1, S2)"; ${T7}`, 0.3, A21.stop, 'day'), ...fieldZones(`${C_A21}, row "Stop lamp (S1, S2)"; ${T7}`, 0.07, A21.stop, 'night')],
    extra: [nightMax(260, 'S1', T7), RATIO_5_1('rear position or rear end-outline marker lamp', 'stop lamp')],
    notes: [`Colour red (${S} §5.5.7, p. 22). A failed variable intensity control must fall back to S1 (§4.6.2, p. 14).`],
  }),
  {
    id: 'stop-S3', name: 'Centre high-mounted stop lamp, steady (S3)', kind: 'signal', traffic: 'n/a', aim: AIM, tolerance: TOL,
    requirements: [axis(25, T7), imax(110, T7), imaxD(55, T7), dist(FIGURE_A3_III, 25, `${T7}; Figure A3-III (p. 41)`), ...fieldZones(`${C_A21}, row "High mounted stop lamp (S3, S4)"; ${T7}`, 0.3, A21.highStop)],
    notes: [
      `A lamp mounted inside the vehicle is tested behind the sample plate(s) or rear window supplied, in the drawn position (${S} §4.8.1.10, p. 16), and its colour with the worst-case combination (§5.5.4.1, p. 22). Colour red.`,
      `The Annex 3 §1.1 5°-down limit for low lamps does not list S3 or S4 (p. 39).`,
      ...COMMON_NOTES,
    ],
  },
  {
    id: 'stop-S4', name: 'Centre high-mounted stop lamp, variable (S4)', kind: 'signal', traffic: 'n/a', aim: AIM, tolerance: TOL,
    requirements: [
      axis(25, T7), imax(160, T7), imaxD(80, T7), nightMax(110, 'S3', T7), dist(FIGURE_A3_III, 25, `${T7}; Figure A3-III (p. 41)`),
      ...fieldZones(`${C_A21}, row "High mounted stop lamp (S3, S4)"; ${T7}`, 0.3, A21.highStop, 'day'),
      ...fieldZones(`${C_A21}, row "High mounted stop lamp (S3, S4)"; ${T7}`, 0.07, A21.highStop, 'night'),
    ],
    notes: [
      `As S3 for lamps mounted inside the vehicle (${S} §4.8.1.10, §5.5.4.1). A failed variable intensity control must fall back to S3 (§4.6.2, p. 14). Colour red.`,
      ...COMMON_NOTES,
    ],
  },
  fig1Function({
    id: 'stop-MS', name: 'Stop lamp for L-category vehicles (MS)', min: 40, max: 260, maxD: 130, cite: T7, fieldMin: 0.3,
    fields: [...fieldZones(`${C_A21}, row "Stop singular (MS)"; ${T7}`, 0.3, A21.stopSingular, 'singular'), ...fieldZones(`${C_A21}, row "Stop pair (MS)"; ${T7}`, 0.3, A21.stopPair, 'pair')],
    extra: [RATIO_5_1('rear position lamp', 'stop lamp')],
    notes: [`For a pair, at the applicant's request the standard light distribution may be considered from the V-V line outboard only (${S} §5.5.4.2, p. 22). Colour red.`],
  }),

  // Direction indicators (5.6)
  indicator('1', 'front', 175, 1200, 600, 0.3, A21.frontDI, 'row "Front direction indicator (1, 1a, 1b)"'),
  indicator('1a', 'front', 250, 1200, 600, 0.3, A21.frontDI, 'row "Front direction indicator (1, 1a, 1b)"'),
  indicator('1b', 'front', 400, 1200, 600, 0.7, A21.frontDI, 'row "Front direction indicator (1, 1a, 1b)"'),
  indicator('2a', 'rear, steady', 50, 500, 250, 0.3, A21.rearDI, 'row "Rear direction indicator (2a, 2b)"'),
  indicator('2b', 'rear, variable', 50, 1000, 500, 0.3, A21.rearDI, 'row "Rear direction indicator (2a, 2b)"', [nightMax(500, '2a', T8)]),
  {
    id: 'direction-indicator-5', name: 'Side direction indicator, category 5', kind: 'signal', traffic: 'n/a',
    aim: `${AIM} For categories 5 and 6 the minimum applies in direction A (${S} §5.6.1 (b), p. 22), which Annex 8 Table A8-1 (p. 55) gives as H = 5°, V = 0°: 5° outwards from the rearward direction parallel to the vehicle side (Figure A2-II, p. 36).`,
    tolerance: TOL,
    requirements: [
      { kind: 'point', id: 'Direction A', group: 'axis', h: 5, v: 0, min: 0.6, cite: `${S} §5.6.1 (b) (p. 22); ${T8}; Annex 8 Table A8-1 (p. 55)` },
      imax(280, T8), imaxD(140, T8),
      { kind: 'zone', id: 'field', group: 'field', polygon: [5, 15, 60, 15, 60, -15, 5, -15], min: 0.6, cite: `${C_FIELD}; ${T8} (standard light distribution and field both "Table A2-2"); ${S} Annex 2 Table A2-2 (p. 36): horizontal angles A/B 5°/55°, vertical 15°/15°. Outer edge 60° = 5° + 55°, derived (see notes)` },
      { kind: 'zone', id: 'field, low mounting', group: 'field', polygon: [5, 15, 60, 15, 60, -5, 5, -5], min: 0.6, when: ['low-mounting'], replaces: 'field', cite: `${C_FIELD}; ${S} Annex 2 Table A2-2 and note b (p. 36). Outer edge 60° derived` },
    ],
    notes: [
      `Field extent, an interpretation: Table A2-2 prints the horizontal angles as "A/B 5°/55°", applying to direction A. Figure A2-II (p. 36) draws angle A from the reference axis (parallel to the vehicle side, pointing rearwards) to the near edge of the field, and angle B as the width of the field from that edge. Read that way the field runs from 5° to 60°. This matches Figure A3-IV for category 6, whose grid runs to 60°. If angle B is instead measured from the reference axis, the outer edge is 55°. Confirm with a technical service before relying on the 55°–60° strip.`,
      `For category 5, Table 8 names "Table A2-2" as the standard light distribution, so there is no grid of percentages: the 0.6 cd minimum applies throughout the field (${T8}).`,
      `Colour amber; the approval arrow points to the front of the vehicle (${SUP6} §3.3.2.5.1.2, p. 3).`,
      ...COMMON_NOTES,
    ],
  },
  {
    id: 'direction-indicator-6', name: 'Side direction indicator, category 6', kind: 'signal', traffic: 'n/a',
    aim: `${AIM} H = 0° is the rearward direction parallel to the vehicle side and h is positive outwards; the minimum applies at H = 5°, V = 0° (${S} Annex 3 §2.4, p. 41).`,
    tolerance: TOL,
    requirements: [
      { kind: 'point', id: 'Direction A', group: 'axis', h: 5, v: 0, min: 50, cite: `${S} §5.6.1 (b) (p. 22); ${T8}; Annex 3 §2.4 (p. 41)` },
      imax(280, T8), imaxD(140, T8),
      { kind: 'distribution', id: 'Standard light distribution', group: 'field', reference: { min: 50 }, points: FIGURE_A3_IV, between: BETWEEN_GRID, cite: `${C_DIST}; ${T8}; Figure A3-IV (p. 41); between grid points: ${C_BETWEEN}` },
    ],
    notes: [
      `Table 8 gives no field of geometric visibility for category 6 ("N.A."), so only the Figure A3-IV grid applies. The grid spans h 0° to 60° and v −5° to +30°; the line h = 0° is the vehicle side (${S} Figure A3-IV, p. 41).`,
      `Colour amber. The lamp shows "R" or "L" for the side of the vehicle, and its approval arrow points to the front (${SUP6} §3.3.2.5.1.2–3.3.2.5.1.3, p. 3). The light emitting surface, not the apparent surface, is determined for categories 5 and 6 (§4.8.1.9, p. 16).`,
      ...COMMON_NOTES,
    ],
  },
  indicator('11', 'front or rear', 90, 1200, 600, 0.3, A21.frontRearDI, 'row "Front/rear direction indicator (11, 11a, 11b, 11c, 12)"'),
  indicator('11a', 'front or rear', 175, 1200, 600, 0.3, A21.frontRearDI, 'row "Front/rear direction indicator (11, 11a, 11b, 11c, 12)"'),
  indicator('11b', 'front or rear', 250, 1200, 600, 0.3, A21.frontRearDI, 'row "Front/rear direction indicator (11, 11a, 11b, 11c, 12)"'),
  indicator('11c', 'front or rear', 400, 1200, 600, 0.3, A21.frontRearDI, 'row "Front/rear direction indicator (11, 11a, 11b, 11c, 12)"'),
  indicator('12', 'front or rear', 50, 500, 250, 0.3, A21.frontRearDI, 'row "Front/rear direction indicator (11, 11a, 11b, 11c, 12)"'),

  // Side marker lamps (5.7)
  ...[
    { cat: 'SM1', axisMin: 4, half: 45, fig: 'Figure A3-VII (p. 43)' },
    { cat: 'SM2', axisMin: 0.6, half: 30, fig: 'Figure A3-VIII (p. 43)' },
  ].map(({ cat, axisMin, half, fig }) => /** @type {SignalFunction} */ ({
    id: `side-marker-${cat}`, name: `Side marker lamp (${cat})`, kind: 'signal', traffic: 'n/a',
    aim: `${AIM} The reference axis is perpendicular to the vehicle side (Figure A2-III, p. 37). Here h is positive towards the front of the vehicle (angle A).`,
    tolerance: TOL,
    requirements: [
      axis(axisMin, T9),
      imax(25, T9),
      { kind: 'zone', id: 'Standard light distribution', group: 'field', polygon: [-half, 10, half, 10, half, -10, -half, -10], min: 0.6, cite: `${S} §4.8.3.1 (c) (p. 17); ${T9} column "Minimum luminous intensity in cd within the standard light distribution"; ${fig}: grid ±${half}° H, ±10° V, with no percentages` },
      { kind: 'zone', id: 'field', group: 'field', polygon: [-half, 10, half, 10, half, -10, -half, -10], min: 0.6, cite: `${C_FIELD}; ${T9}; ${S} Annex 2 Table A2-3 (p. 37): ${half}°/${half}° (A/B), 10°/10°` },
      { kind: 'zone', id: 'field, low mounting', group: 'field', polygon: [-half, 10, half, 10, half, -5, -half, -5], min: 0.6, when: ['low-mounting'], replaces: 'field', cite: `${C_FIELD}; ${S} Annex 2 Table A2-3 and note a (p. 37)` },
      { kind: 'zone', id: 'Red lamp towards the front', group: 'glare', polygon: [60, 20, 90, 20, 90, -20, 60, -20], max: 0.25, when: ['red-side-marker'], cite: `${S} §5.7.1 (p. 24): 60° to 90° horizontally and ±20° vertically towards the front of the vehicle` },
    ],
    notes: [
      `It may be enough to check five points chosen by the type approval authority (${S} §5.7.4, p. 24).`,
      `Colour amber; red is allowed for the rearmost side marker lamp grouped, combined or reciprocally incorporated with a rear position, rear end-outline marker, rear fog or stop lamp, or grouped with or sharing light emitting surface with the rear retro-reflector (${S} §5.7.7 as amended by ${SUP2} p. 2).`,
      LOW_DOWN,
      ...COMMON_NOTES,
    ],
  })),

  // Reversing lamps (5.8)
  {
    id: 'reversing-AR', name: 'Reversing lamp (AR)', kind: 'signal', traffic: 'n/a', aim: AIM, tolerance: TOL,
    requirements: [
      axis(80, T10),
      { kind: 'zone', id: 'Imax in or above H', polygon: [-90, 0, 90, 0, 90, 90, -90, 90], max: 300, cite: `${C_MAX}; ${T10}, column "in or above the h-plane"` },
      { kind: 'zone', id: 'Imax below H to 5° down', polygon: [-90, 0, 90, 0, 90, -5, -90, -5], max: 600, cite: `${C_MAX}; ${T10}, column "below the h-plane, down to 5°D"` },
      { kind: 'zone', id: 'Imax below 5° down', polygon: [-90, -5, 90, -5, 90, -90, -90, -90], max: 8000, cite: `${C_MAX}; ${T10}, column "below 5°D"` },
      ...FIGURE_A3_V_CD.map(([h, v, cd]) => /** @type {Requirement} */ ({ kind: 'point', id: `${h}, ${v}`, group: 'field', h, v, min: cd, cite: `${S} §4.8.3.1 (c) second option (p. 17); Annex 3 §2.5 and Figure A3-V (p. 42), values in cd` })),
      { kind: 'note', id: 'Between points', group: 'field', when: ['local-variation'], text: 'If visual examination suggests substantial local variations, no intensity measured between two measuring directions may be below 50 % of the lower of the two minima prescribed for them. This replaces the general grid rule for reversing lamps.', cite: C_BETWEEN },
    ],
    notes: [
      `A lamp intended only for installation in a pair may be verified only up to 30° inwards, where at least 25 cd is required; the communication form then says it must be installed in a pair (${S} §5.8.1, p. 25).`,
      `No field of geometric visibility requirement (${S} §5.8.2, p. 25). The boundaries in the maximum zones (±90° H) stand for "every direction in which the lamp is visible". Colour white (§5.8.7).`,
      `Reversing projectors (Supplement 5, §5.12) are a separate function and are not transcribed here.`,
      `Lamps with non-incandescent sources are measured after 1 min and after 10 min (${S} Annex 8 §1.2.1, p. 55).`,
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
      ...(cat === 'F2' ? [nightMax(300, 'F1', T11)] : []),
      { kind: 'line', id: 'H axis, 10° L to 10° R', group: 'field', h0: -10, v0: 0, h1: 10, v1: 0, min: 150, cite: `${T11}; ${S} Annex 3 §2.6, Figure A3-VI (p. 42): "1.50·10² cd Minimum" on the axes within the rhombus` },
      { kind: 'line', id: 'V axis, 5° D to 5° U', group: 'field', h0: 0, v0: -5, h1: 0, v1: 5, min: 150, cite: `${T11}; ${S} Annex 3 §2.6, Figure A3-VI (p. 42)` },
      { kind: 'zone', id: 'Rhombus', group: 'field', polygon: [-10, 0, 0, 5, 10, 0, 0, -5], min: 75, when: ['local-variation'], cite: `${S} Annex 3 §2.6 and Figure A3-VI (p. 42)` },
    ],
    notes: [
      `No field of geometric visibility requirement (${S} §5.9.2, p. 26). Apparent surface in the direction of the reference axis at most 140 cm² (§5.9.3). Heat resistance test of Annex 6 (§5.9.5). Colour red (§5.9.7).`,
      ...(cat === 'F2' ? [`A failed variable intensity control must fall back to F1 (${S} §4.6.2, p. 14).`] : []),
      ...COMMON_NOTES,
    ],
  })),

  // Manoeuvring lamps (5.10)
  {
    id: 'manoeuvring-ML', name: 'Manoeuvring lamp (ML)', kind: 'signal', traffic: 'n/a', aim: AIM, tolerance: TOL,
    requirements: [
      { kind: 'imax', id: 'Imax', max: 500, cite: `${S} §5.10.1.1 (p. 26): in all directions in which the light can be observed, in any mounting position specified by the applicant` },
      { kind: 'note', id: 'Side, front and rear glare field', group: 'glare', text: 'Light emitted directly towards the side, front or rear must not exceed 0.5 cd between φmin = arctan((1 − h)/10) and φmax = φmin + 11.3° vertically, h the mounting height in m, and from +90° to −90° horizontally about the line through the reference axis perpendicular to the vehicle\'s vertical longitudinal plane. The field depends on mounting height, so it cannot be a fixed zone.', cite: `${S} §5.10.1.2 (p. 26)` },
    ],
    notes: [`Measurement distance at least 3.0 m (${S} §5.10.4, p. 26). Colour white (§5.10.7, p. 27). Not in the list this research was asked to cover; included because R148 sets its photometry.`],
  },

  // Rear registration plate illuminating lamps (5.11)
  {
    id: 'rear-registration-plate', name: 'Rear registration plate illuminating lamp (L, LM1)', kind: 'signal', traffic: 'n/a',
    aim: `The lamp is placed in the position(s) the manufacturer specifies relative to the plate space; luminance is measured on a diffuse colourless surface 2 mm in front of the plate holder, perpendicular to it within 5°, each point a 25 mm circle, corrected to a reflection factor of 1.0 (${S} §5.11.4, pp. 27–28).`,
    tolerance: null,
    requirements: [
      { kind: 'note', id: 'Luminance minimum', text: 'Luminance (not intensity) at each Annex 3 §3 measuring point at least 2.5 cd/m² for plate categories 1a, 1b, 1c, 2a and 2b, and at least 2 cd/m² for categories 1 and 2 (L-category vehicles).', cite: `${S} §5.11.2 (p. 27)` },
      { kind: 'note', id: 'Luminance gradient', text: 'Between any two measuring points, (B2 − B1) / distance in cm ≤ 2 × B0 per cm, B0 the lowest luminance measured.', cite: `${S} §5.11.2 (p. 27)` },
      { kind: 'note', id: 'Angle of incidence', text: 'The angle of incidence on the plate surface does not exceed 82° at any point, measured from the extremity of the illuminating area furthest from the plate.', cite: `${S} §5.11.5.2 (p. 28)` },
      { kind: 'note', id: 'No light to the rear', text: 'No light is emitted directly towards the rear, except red light when grouped or combined with a rear lamp.', cite: `${S} §5.11.5.2 (p. 28)` },
    ],
    notes: [
      `Plate categories and illuminated areas: 1a 340 × 240 mm, 1b 520 × 120 mm, 1c 255 × 165 mm (tractors), 2a 330 × 165 mm, 2b 440 × 220 mm, 1 130 × 240 mm and 2 200 × 280 mm (L-category) (${S} §5.11.2, p. 27). The measuring points are drawn in Figures A3-IX to A3-XV (pp. 43–46) and are not transcribed here.`,
      `The whole plate must be visible within the angles of Annex 2 Part D (p. 38). Colour: sufficiently colourless not to change the plate's colour appreciably (§5.11.7, p. 28).`,
    ],
  },
];

/** Requirements that apply to every function or that the per-function entries cannot carry. */
export const GENERAL = [
  { kind: 'note', id: 'Red to the front, white to the rear', text: 'At the applicant\'s request, an extra test may show that from 165° to 180° outboard horizontally and −2.5° to +5° vertically the maximum intensity is at most 0.25 cd, to verify the R48 rules on red light to the front and white light to the rear. The vehicle body may be taken into account.', cite: `${S} §4.8.3.1.1 (p. 17)` },
  { kind: 'note', id: 'Conformity of production', text: 'No production value may deviate unfavourably by more than 20 %; field minima map to the Table 12 values (0.7 → 0.5, 0.6 → 0.4, 0.3 → 0.2, 0.07 → 0.05, 0.05 → 0.03 cd at 20 %).', cite: `${S} §6.1.3 and Table 12 (pp. 28–29)` },
];
