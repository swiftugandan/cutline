/** UN Regulation No. 123 (adaptive front-lighting systems, AFS): passing-beam classes C, V, E (with data sets E1–E3)
 * and W, the driving beam, the adaptive driving beam, bending modes and the traffic-change function, as photometric
 * data for right-hand traffic. Source and choices: docs/research/r123-notes.md
 *
 * Text used: the consolidated Revision 2 (01 series up to Supplement 4) as amended by Amendments 1–9, the last
 * amendment R123 has received (02 series Supplement 2, in force 30 September 2021). Only Supplement 6 and
 * Supplement 8 to the 01 series change photometric values or their wording; each entry they touch cites them.
 * Page numbers are the document's own.
 *
 * Coordinates: degrees, h positive to the right of V-V, v positive above H-H, as the regulation prints them for
 * right-hand traffic. For left-hand traffic every horizontal coordinate is mirrored and R and L swap in the names
 * (R123 §5.1, p. 14).
 *
 * Every value applies to half the sum of the values measured from all lighting units of the system (both sides of
 * the vehicle), except the one-side rules listed in Annex 9 §1.8.1 (Annex 9 §1.8, p. 75). See the notes. */

export const SOURCE = {
  title: 'UN Regulation No. 123 (adaptive front-lighting systems), 01 and 02 series of amendments',
  document: 'E/ECE/324/Rev.2/Add.122/Rev.2 (Revision 2, 21 October 2013) with Amendments 1–9 '
    + '(E/ECE/324/Rev.2/Add.122/Rev.2/Amend.1–9); photometric changes from ECE/TRANS/WP.29/2014/25 (01 series '
    + 'Suppl. 6) and ECE/TRANS/WP.29/2017/41 (01 series Suppl. 8)',
  url: 'https://documents.un.org/api/symbol/access?s=E/ECE/324/Rev.2/Add.122/Rev.2&l=en&t=pdf',
  retrieved: '2026-10-09',
};

const REV2 = 'R123 Rev.2 (E/ECE/324/Rev.2/Add.122/Rev.2)';
const T1A = `${REV2}, Annex 3 Table 1 Part A, line`;
const T1B = `${REV2}, Annex 3 Table 1 Part B, line`;
const T3 = `${REV2}, Annex 3 Table 3 (p. 40)`;
const T4 = `${REV2}, Annex 3 Table 4 (p. 41)`;
const T5 = `${REV2}, Annex 3 Table 5 (p. 41)`;
const T6 = `${REV2}, Annex 3 Table 6 (p. 41)`;
const T7A = `${REV2}, Annex 3 Table 7 Part A (p. 42)`;
const T7B = `${REV2}, Annex 3 Table 7 Part B and its notes (p. 43)`;
const SUP8 = 'R123 01 series Suppl. 8 (ECE/TRANS/WP.29/2017/41)';
const SUP8_T2 = `${SUP8}, Annex 3 Table 2 as amended (p. 4)`;
const SUP8_IMAX = `${SUP8}, Table 1 line 18 "Emax" renamed "Imax" (p. 3)`;
const SUP6 = 'R123 01 series Suppl. 6 (ECE/TRANS/WP.29/2014/25)';

/** @param {string} line @param {'A' | 'B'} part */
const t1 = (line, part = 'A') => `${part === 'A' ? T1A : T1B} ${line} (p. 39)`;

/** Zone III a (Class C and V) and III b (Class E and W): corner points 1–8 of Annex 3 Table 3 (p. 40), as [h, v, …]. */
export const ZONE_III_A = [-8, 1, -8, 4, 8, 4, 8, 2, 6, 1.5, 1.5, 1.5, 0, 0, -4, 0];
export const ZONE_III_B = [-8, 1, -8, 4, 8, 4, 8, 2, 6, 1.5, 1.5, 1.5, -0.5, 0.34, -4, 0.34];

/** "Below it" means vertically below only and the text sets no lower limit (Annex 3, p. 38), so these zones run down
 * to the nadir (v = −90°). The floor is this transcription's, not the regulation's. */
const SEGMENT_10_AND_BELOW = [-4.5, -4, 2, -4, 2, -90, -4.5, -90];
const SEGMENT_20_AND_BELOW = [-3.5, -2, 0, -2, 0, -90, -3.5, -90];

/** "Segment Imax" rectangles, Table 2 item 2.1 as amended by Supplement 8 (p. 4). Class V has a vertical extent
 * only (0.3°D to 1.72°D, horizontal cell blank); its band runs from 90°L to 90°R, a bound this transcription chose. */
export const SEGMENT_IMAX = {
  C: [-0.5, -0.3, 3, -0.3, 3, -1.72, -0.5, -1.72],
  V: [-90, -0.3, 90, -0.3, 90, -1.72, -90, -1.72],
  E: [-0.5, -0.1, 3, -0.1, 3, -1.72, -0.5, -1.72],
  W: [-0.5, -0.3, 3, -0.3, 3, -1.72, -0.5, -1.72],
};

/** Bending, §6.2.5.2 (former §6.2.5.3): from H-H to 2°D, 10° to 45° on the side the vehicle turns to. */
const TURN_ZONE = { left: [-45, 0, -10, 0, -10, -2, -45, -2], right: [10, 0, 45, 0, 45, -2, 10, -2] };

/**
 * Conditions a requirement may depend on. A requirement with `when` applies only if every listed condition holds;
 * with `replaces` it stands instead of the named requirement of the same function while its conditions hold.
 */
export const CONDITIONS = [
  { id: 'also-class-w', text: 'The system also provides a Class W passing beam (Table 1 footnote 1, p. 39).' },
  { id: 'stabilised-supply', text: 'The manufacturer\'s description guarantees the 50L maximum will not be exceeded '
    + 'in use, by the system itself or because its use is confined to vehicles that stabilise or limit its supply, as '
    + 'stated in the communication form (Table 1 footnote 9, p. 39).' },
  { id: 'w-table-4-2', text: 'The applicant specifies (§2.2.2(e)) a Class W passing beam designed to give no more than '
    + '8,800 cd on segment 20 and below it and no more than 3,550 cd on segment 10 and below it (Table 4 item 4.2, p. 41).' },
  { id: 'turn-left-smallest-radius', text: 'The T-signal corresponds to the vehicle\'s smallest turn radius to the '
    + 'left (§6.2.5.2, p. 18).' },
  { id: 'turn-right-smallest-radius', text: 'The T-signal corresponds to the vehicle\'s smallest turn radius to the '
    + 'right (§6.2.5.2, p. 18).' },
  { id: 'no-continuous-passing-beam', text: 'No passing beam meeting §6.2 is kept on throughout the adaptation of the '
    + 'driving beam; otherwise Table 7 Part B is not applied (Table 7 notes, p. 43).' },
];

const AIM_C = 'System in its neutral state emitting the Class C passing beam (§6.2, p. 18; Annex 9 §1.10–1.11, p. 75). '
  + 'Vertical: scan upwards through the horizontal part of the cut-off at 2.5° left of V-V and put the inflection '
  + 'point (d²(log E)/dv² = 0) on line B, one per cent (0.57°) below H-H (Annex 8 §2.3 p. 68, §3.1 and Figure 1 '
  + 'p. 71; Table 2 item 2.2(b) "at V = 0.57 D", Suppl. 8 p. 4). Horizontal, the applicant chooses: (a) the 0.2°D '
  + 'line, scanned from 5°L to 5°R, maximum G ≥ 0.08, inflection point on line A; or (b) three vertical scans from '
  + '2°D to 2°U at 1°R, 2°R and 3°R, each with G ≥ 0.08, whose straight line through the inflection points meets '
  + 'line B on V-V (Annex 8 §3.2, pp. 71–72). Line A lies 0.5° right of V-V (Annex 8 Figures 1 and 2, pp. 68 and '
  + '72). G = log E(β) − log E(β + 0.1°).';

/** @param {string} range */
const aimMode = range => 'Not re-aimed: the system keeps the aim found for the Class C passing beam in its neutral '
  + 'state, and this mode\'s cut-off must fall in place automatically (Annex 8 §2.11, p. 70; §6.2.2, p. 18). The '
  + `flat horizontal part of its cut-off must lie ${range} (Table 2 item 2.2(b), ${SUP8_T2}). See the Class C aim `
  + 'for the method.';

/**
 * @param {string} id @param {number} h @param {number} v @param {{min?: number, max?: number}} lim
 * @param {string} cite @param {string} group
 */
const pt = (id, h, v, lim, cite, group) => ({ kind: 'point', id, h, v, ...lim, cite, group });

/** @param {string} id @param {number} h0 @param {number} v0 @param {number} h1 @param {number} v1
 * @param {{min?: number, max?: number}} lim @param {string} cite @param {string} group */
const ln = (id, h0, v0, h1, v1, lim, cite, group) => ({ kind: 'line', id, h0, v0, h1, v1, ...lim, cite, group });

/** @param {string} id @param {number[]} polygon @param {{min?: number, max?: number}} lim @param {string} cite
 * @param {string} group */
const zn = (id, polygon, lim, cite, group) => ({ kind: 'zone', id, polygon, ...lim, cite, group });

/** @param {number} min @param {string} cite */
const s50 = (min, cite) => ({ kind: 'sum', id: 'S50 + S50LL + S50RR', points: [0, 4, -8, 4, 8, 4], min, cite, group: 'signs' });
/** @param {number} min @param {string} cite */
const s100 = (min, cite) => ({ kind: 'sum', id: 'S100 + S100LL + S100RR', points: [0, 2, -4, 2, 4, 2], min, cite, group: 'signs' });

/** @param {string} id @param {string} text @param {string} cite @param {string} [group] @param {number[]} [polygon] */
const note = (id, text, cite, group, polygon) => ({ kind: 'note', id, text, cite, ...(group ? { group } : {}), ...(polygon ? { polygon } : {}) });

const SIGN_CITE = `${t1('8a and 9a')}, footnote 7; point positions ${T5}`;
const SEG10_CITE = `${t1('17')}, footnote 1`;
const IMAX_CITE = `${t1('18')}, footnote 3; ${SUP8_IMAX}`;

/**
 * Table 2 item 2.1: the highest intensity inside "segment Imax" lies within line 18's limits. Bending modes do not
 * have this rule (§6.2.5.1).
 * @param {'C' | 'V' | 'E' | 'W'} cls @param {number} min @param {number} max @param {string} cite
 * @param {{ id?: string, when?: string[], replaces?: string }} [cond]
 */
const segmentImax = (cls, min, max, cite, cond = {}) => ({
  kind: 'zone', measure: 'brightest', id: cond.id ?? 'Segment Imax', polygon: SEGMENT_IMAX[cls], min, max,
  cite: `${SUP8_T2}; limits ${cite}`, group: 'axis',
  ...(cond.when ? { when: cond.when } : {}), ...(cond.replaces ? { replaces: cond.replaces } : {}),
});

const SEG10_ALT = 'Segment 10 and below it: the maximum is 15,900 cd instead of 12,300 cd if the system also provides '
  + 'a Class W passing beam (Table 1 footnote 1, p. 39); the conditional requirement carries it.';
const FOOTNOTE_7 = 'Overhead sign sums: one pair of position lamps, incorporated in the system or intended to be '
  + 'installed with it, may be switched on while these are measured, as the applicant indicates (Table 1 footnote 7, p. 39).';
const HALF_SUM = 'All values apply to half the sum of the intensities measured from every lighting unit of the system '
  + 'that provides this function or mode, both sides together. A single-lamp distribution therefore stands for the '
  + 'pair only if the left and right sides are mirror images (Annex 9 §1.8, p. 75).';
const SIDE_50V = 'Each side of the system on its own must give at least 2,500 cd at 50V in every passing-beam mode; '
  + 'Class V modes are exempt (§6.2.8.1, p. 19; one-side rule, Annex 9 §1.8.1 as amended by Suppl. 6).';
const SHARPNESS = 'Cut-off quality (Annex 8 §2.7–2.7.3, pp. 69–70): scan vertically through the horizontal part at '
  + '2.5° from V-V in steps of 0.05°, with a detector of about 10 mm at 10 m or about 30 mm at 25 m (maximum '
  + 'sharpness only at 25 m with the 30 mm detector). 0.13 ≤ G ≤ 0.40. The cut-off must be horizontal from 1.5° to '
  + '3.5°: the inflection points on the vertical lines at 1.5°, 2.5° and 3.5° lie within 0.2° of each other '
  + 'vertically. Only one cut-off may be visible. Shape: straight horizontal part to the left, raised elbow-shoulder '
  + 'to the right with a sharp edge (Annex 8 §1.1, p. 68).';
const REAIM = 'If the aimed beam fails, its alignment may be changed provided the beam axis moves no more than 0.5° to '
  + 'the left or 0.75° to the right of line A, and no more than 0.25° up or down from line B (Annex 8 §2.5, p. 69).';
const NO_TOLERANCE = 'R123 grants no coordinate tolerance at test points; each value is measured where the table puts it.';
const LHT = 'Left-hand traffic: the coordinates are mirrored about V-V and R and L swap in every name (§5.1, p. 14).';

/** Requirements of Table 1 Part A shared by the four classes. Values per class: [min, max] or undefined. */
const PART_A = {
  C: {
    B50L: { min: 50, max: 350 }, HV: { min: 50, max: 625 }, BR: { min: 50, max: 1750 },
    BRR: { min: 50, max: 3550 }, BLL: { min: 50, max: 625 }, P: { min: 63 }, zone: { max: 625 },
    S50: 190, S100: 375, R50: undefined, R75: { min: 10100 }, V50: { min: 5100 }, L50: { min: 3550, max: 13200 },
    LL25: { min: 1180 }, RR25: { min: 1180 }, seg20: undefined, seg10: { max: 12300 }, imax: { min: 16900, max: 44100 },
  },
  V: {
    B50L: { min: 50, max: 350 }, HV: { min: 50, max: 625 }, BR: { min: 50, max: 880 },
    BRR: { max: 880 }, BLL: { max: 880 }, P: undefined, zone: { max: 625 },
    S50: undefined, S100: undefined, R50: { min: 5100 }, R75: undefined, V50: { min: 5100 }, L50: { min: 3550, max: 13200 },
    LL25: { min: 845 }, RR25: { min: 845 }, seg20: undefined, seg10: { max: 12300 }, imax: { min: 8400, max: 44100 },
  },
  E: {
    B50L: { min: 50, max: 625 }, HV: { min: 50 }, BR: { min: 50, max: 1750 },
    BRR: { max: 3550 }, BLL: { max: 880 }, P: undefined, zone: { max: 880 },
    S50: 190, S100: 375, R50: undefined, R75: { min: 15200 }, V50: { min: 10100 }, L50: { min: 6800 },
    LL25: { min: 1180 }, RR25: { min: 1180 }, seg20: undefined, seg10: { max: 12300 }, imax: { min: 16900, max: 79300 },
  },
  W: {
    B50L: { min: 50, max: 625 }, HV: { min: 50 }, BR: { min: 50, max: 2650 },
    BRR: { max: 5300 }, BLL: { max: 880 }, P: { min: 63 }, zone: { max: 880 },
    S50: 190, S100: 375, R50: undefined, R75: { min: 20300 }, V50: { min: 10100 }, L50: { min: 6800, max: 26400 },
    LL25: { min: 3400 }, RR25: { min: 3400 }, seg20: { max: 17600 }, seg10: { max: 7100 }, imax: { min: 29530, max: 70500 },
  },
};

/** Table 1 Part B (bending modes): lines 1, 2, 7, 13 and 18 replace Part A's. A blank cell is left out. */
const PART_B = {
  C: { B50L: { min: 50, max: 530 }, HV: { min: 50, max: 880 }, zone: { max: 880 }, L50: { min: 1700 }, imax: { min: 10100, max: 44100 } },
  V: { B50L: { max: 530 }, HV: { max: 880 }, zone: { max: 880 }, L50: { min: 1700 }, imax: { min: 5100, max: 44100 } },
  E: { B50L: undefined, HV: undefined, zone: { max: 880 }, L50: { min: 3400 }, imax: { min: 10100, max: 79300 } },
  W: { B50L: { max: 790 }, HV: undefined, zone: { max: 880 }, L50: { min: 3400 }, imax: { min: 20300, max: 70500 } },
};

/**
 * @typedef {{min?: number, max?: number}} Limits
 * @typedef {{ B50L?: Limits, HV?: Limits, BR?: Limits, BRR?: Limits, BLL?: Limits, P?: Limits, zone?: Limits,
 *   S50?: number, S100?: number, R50?: Limits, R75?: Limits, V50?: Limits, L50?: Limits, LL25?: Limits,
 *   RR25?: Limits, seg20?: Limits, seg10?: Limits, imax?: Limits }} ClassValues
 */

/**
 * Builds one class's requirements from Table 1, in the table's line order.
 * @param {'C' | 'V' | 'E' | 'W'} cls
 * @param {ClassValues} a Part A values (with any replacements already applied)
 * @param {'A' | 'B'} part which part the replaced lines come from, for the citations
 * @param {Partial<Record<'B50L' | 'imax' | 'seg10' | 'seg20', string>>} [cites] citation overrides
 */
function table1(cls, a, part = 'A', cites = {}) {
  const fromB = /** @param {string} line */ line => (part === 'B' ? t1(line, 'B') : t1(line));
  const zone = cls === 'C' || cls === 'V' ? ZONE_III_A : ZONE_III_B;
  /** @type {object[]} */
  const out = [];
  /** @param {Limits | undefined} lim @param {() => object} make */
  const add = (lim, make) => { if (lim) out.push(make()); };
  add(a.B50L, () => pt('B50L', -3.43, 0.57, /** @type {Limits} */ (a.B50L), cites.B50L ?? fromB('1'), 'glare'));
  add(a.HV, () => pt('HV', 0, 0, /** @type {Limits} */ (a.HV), fromB('2'), 'glare'));
  add(a.BR, () => pt('BR', 2.5, 1, /** @type {Limits} */ (a.BR), t1('3'), 'glare'));
  add(a.BRR, () => ln('Segment BRR', 8, 0.57, 20, 0.57, /** @type {Limits} */ (a.BRR), t1('4'), 'glare'));
  add(a.BLL, () => ln('Segment BLL', -8, 0.57, -20, 0.57, /** @type {Limits} */ (a.BLL), t1('5'), 'glare'));
  add(a.P, () => pt('P', -7, 0, /** @type {Limits} */ (a.P), t1('6'), 'field'));
  add(a.zone, () => zn(cls === 'C' || cls === 'V' ? 'Zone III a' : 'Zone III b', zone, /** @type {Limits} */ (a.zone),
    `${fromB('7')}; corners ${T3}`, 'glare'));
  if (a.S50) out.push(s50(a.S50, SIGN_CITE));
  if (a.S100) out.push(s100(a.S100, SIGN_CITE));
  add(a.R50, () => pt('50R', 1.72, -0.86, /** @type {Limits} */ (a.R50), t1('10'), 'road'));
  add(a.R75, () => pt('75R', 1.15, -0.57, /** @type {Limits} */ (a.R75), t1('11'), 'road'));
  add(a.V50, () => pt('50V', 0, -0.86, /** @type {Limits} */ (a.V50), t1('12'), 'road'));
  add(a.L50, () => pt('50L', -3.43, -0.86, /** @type {Limits} */ (a.L50), `${fromB('13')}${a.L50?.max ? ', footnote 9' : ''}`, 'road'));
  add(a.LL25, () => pt('25LL', -16, -1.72, /** @type {Limits} */ (a.LL25), t1('14'), 'road'));
  add(a.RR25, () => pt('25RR', 11, -1.72, /** @type {Limits} */ (a.RR25), t1('15'), 'road'));
  add(a.seg20, () => zn('Segment 20 and below it', SEGMENT_20_AND_BELOW, /** @type {Limits} */ (a.seg20),
    cites.seg20 ?? `${t1('16')}, footnote 2`, 'foreground'));
  add(a.seg10, () => zn('Segment 10 and below it', SEGMENT_10_AND_BELOW, /** @type {Limits} */ (a.seg10),
    cites.seg10 ?? SEG10_CITE, 'foreground'));
  // Footnote 1 belongs to the 12,300 cd maximum of Classes C, V and E.
  if (cls !== 'W' && a.seg10?.max === 12300) {
    out.push({ ...zn('Segment 10 and below it, system with Class W', SEGMENT_10_AND_BELOW, { max: 15900 }, SEG10_CITE, 'foreground'),
      when: ['also-class-w'], replaces: 'Segment 10 and below it' });
  }
  add(a.imax, () => ({ kind: 'imax', id: 'Imax', .../** @type {Limits} */ (a.imax),
    cite: cites.imax ?? (part === 'B' ? `${t1('18', 'B')}; ${SUP8_IMAX}` : IMAX_CITE), group: 'axis' }));
  // Footnote 9 sets a factor, not a value: kept as a note that scales 50L's maximum.
  if (a.L50?.max) {
    out.push({ kind: 'note', id: '50L maximum, stabilised supply', factor: 1.4, of: '50L', bound: 'max',
      when: ['stabilised-supply'], cite: `${t1('13')}, footnote 9`, group: 'road',
      text: 'The 50L maximum "may be multiplied by 1.4, if it is guaranteed according to the manufacturer\'s '
        + 'description that this value will not be exceeded in use, either by means of the system or, if the '
        + 'system\'s use is confined to vehicles, providing a corresponding stabilization/ limitation of the system\'s '
        + 'supply, as indicated in the communication form."' });
  }
  // Table 4 item 4.2 replaces lines 16, 17 and 18 of Part A or B for Class W.
  if (cls === 'W' && a.imax?.min !== undefined) {
    const t42 = `${T4}, item 4.2`;
    out.push(
      { ...zn('Segment 20 and below it, Table 4.2 set', SEGMENT_20_AND_BELOW, { max: 8800 }, t42, 'foreground'),
        when: ['w-table-4-2'], replaces: 'Segment 20 and below it' },
      { ...zn('Segment 10 and below it, Table 4.2 set', SEGMENT_10_AND_BELOW, { max: 3550 }, t42, 'foreground'),
        when: ['w-table-4-2'], replaces: 'Segment 10 and below it' },
      { kind: 'imax', id: 'Imax, Table 4.2 set', min: a.imax.min, max: 88100,
        cite: `${part === 'B' ? t1('18', 'B') : t1('18')} (min); ${t42} (max)`, group: 'axis',
        when: ['w-table-4-2'], replaces: 'Imax' });
  }
  return out;
}

/** §6.2.5.2: at the smallest turn radius, one side of the system gives at least 2,500 cd somewhere in the zone. */
const TURN_RADIUS = /** @type {const} */ (['left', 'right']).map(side => ({
  kind: 'zone', measure: 'brightest', id: `Smallest turn radius to the ${side}`, polygon: TURN_ZONE[side], min: 2500,
  when: [`turn-${side}-smallest-radius`], scope: 'one-side', group: 'road',
  cite: `${REV2}, §6.2.5.3 (p. 18), renumbered §6.2.5.2 by ${SUP6} (p. 2)`,
}));

/** @param {'C' | 'V' | 'E' | 'W'} cls */
const bending = cls => ({ ...PART_A[cls], ...PART_B[cls] });

/** Class W segments E, F1, F2 and F3, Table 4 item 4.1 (p. 41). */
const W_SEGMENTS = [
  ln('Segment E', -20, 10, 20, 10, { max: 175 }, `${T4}, item 4.1`, 'glare'),
  ln('Segment F1', -10, 10, -10, 60, { max: 175 }, `${T4}, item 4.1`, 'glare'),
  ln('Segment F2', 0, 10, 0, 60, { max: 175 }, `${T4}, item 4.1`, 'glare'),
  ln('Segment F3', 10, 10, 10, 60, { max: 175 }, `${T4}, item 4.1`, 'glare'),
];

const COMMON_PASSING_NOTES = [HALF_SUM, SIDE_50V, SHARPNESS, REAIM, NO_TOLERANCE, LHT];

const BENDING_NOTES = [
  'Bending mode: Table 1 Part A applies with lines 1, 2, 7, 13 and 18 replaced by Part B (p. 39); a blank cell in '
  + 'Part B is read here as no requirement. The cut-off must still meet Table 2 item 2.2, but item 2.1 (segment Imax) '
  + 'does not apply (§6.2.5.1, p. 18). The Imax position rule in former §6.2.5.2 and Part B footnote 6 were deleted '
  + `by ${SUP6} (p. 2).`,
  'Measure in the neutral state and at the smallest turn radius of the vehicle in both directions, using the '
  + 'signal generator. A category 2 bending mode (kink does not move) is measured without horizontal re-aim; a '
  + 'category 1 bending mode (kink moves sideways) is measured after re-aiming the installation unit horizontally '
  + 'in the opposite direction (Annex 9 §3.1.1–3.1.1.2, p. 76). At other radii the distribution must look '
  + 'substantially uniform without undue glare, or Table 1 is checked (Annex 9 §3.1.2, p. 77).',
  'At the smallest turn radius to the left (or right), the right or left side of the system, all contributors '
  + 'added, must give at least 2,500 cd at one or more points between H-H and 2°D, from 10° to 45° left (or right) '
  + `(§6.2.5.2, former §6.2.5.3, renumbered by ${SUP6}). This is a one-side rule, not halved (Annex 9 §1.8.1), `
  + 'marked scope: \'one-side\'. It is checked without horizontal re-aim even for a category 1 mode (Annex 9 '
  + '§3.1.1.1), whereas category 1 Part B values are checked after horizontal re-aim.',
  'Category 1 bending: on failure of the sideways movement the system must fall back automatically to the '
  + 'photometry of §6.2.4, or to a state with no more than 1,300 cd in zone III b and at least 3,400 cd at a point '
  + `of "segment Imax" (§6.2.5.4 as amended by ${SUP8}, p. 3). This is not needed if 880 cd is never exceeded at `
  + '0.3°U up to 5°L, and at 0.57°U beyond 5°L, relative to the system reference axis (§6.2.5.4.1, former '
  + '§6.2.5.5.1, p. 19). Category 1 systems are restricted to vehicles whose kink position meets R48 §6.22.7.4.5(i) '
  + '(§6.2.5.3, former §6.2.5.4, p. 18).',
  HALF_SUM,
  LHT,
];

/**
 * @typedef {{ id: string, name: string, kind: string, traffic: string, aim: string,
 *   aimRule: string, tolerance: null, requirements: any[], notes: string[] }} HeadlampFunction
 *   kind is 'headlamp'; aimRule is one of 'r123-passing', 'keep-passing-aim', 'driving-max', 'keep-driving-aim'.
 *   requirements follow the shared kinds of src/core/regulation/engine.js.
 */

/** @type {HeadlampFunction[]} */
export const FUNCTIONS = [
  {
    id: 'passing-C',
    name: 'Class C passing beam (basic)',
    kind: 'headlamp',
    traffic: 'right',
    aim: AIM_C,
    aimRule: 'r123-passing',
    tolerance: null,
    requirements: [
      ...table1('C', PART_A.C),
      segmentImax('C', 16900, 44100, t1('18')),
      note('Each side 50 cd', 'Class C: the contribution of each side of the system must be at least 50 cd at '
        + 'B50L, HV and BR, and at at least one point of segments BLL and BRR. This one-side rule is not halved. The '
        + 'table\'s 50 cd minimum on BLL and BRR is transcribed as applying along the whole segment, which is the '
        + 'stricter reading.', `${t1('1 to 5')}, footnote 4; Annex 9 §1.8.1 (p. 75)`, 'glare'),
    ],
    notes: [
      'Every system must provide a Class C passing beam and at least one passing beam of another class (§6.1.1, p. 17). '
      + 'The neutral state is a Class C mode at maximum activation with no AFS control signal (§1.9, p. 6).',
      SEG10_ALT, FOOTNOTE_7, ...COMMON_PASSING_NOTES,
      'Supply failure of a beam-switching device: the system must fall back automatically to a passing beam, or to a '
      + 'state with no more than 1,300 cd in zone III b and at least 3,400 cd at a point of "segment Imax" '
      + `(§5.7.3 as amended by ${SUP8}, p. 2).`,
      'Light sources: Class C may use only replaceable light sources or LED modules (§5.3.3, p. 15). If the basic '
      + 'passing beam in the neutral state comes only from LED modules, their total objective flux must be at '
      + 'least 1,000 lm per side (§5.14, p. 17).',
      'Run-up, gas-discharge source with separate ballast: at least 3,100 cd at 50V four seconds after switching on '
      + 'a system that has been off for 30 minutes or more (§6.1.4.4.2, p. 17).',
    ],
  },
  {
    id: 'passing-V',
    name: 'Class V passing beam (town)',
    kind: 'headlamp',
    traffic: 'right',
    aim: aimMode('not above 0.57°D and not below 1.3°D'),
    aimRule: 'keep-passing-aim',
    tolerance: null,
    requirements: [
      ...table1('V', PART_A.V),
      segmentImax('V', 8400, 44100, t1('18')),
    ],
    notes: [
      'Class V is meant for lit areas such as towns (§1.3 footnote 2, p. 5). It has no P point, no overhead sign '
      + 'sums and no 75R; 50R takes the place of 75R.',
      'Rev.2 printed the Class V cut-off range with the lower bound cut off ("not above 0.57D, not below"); '
      + 'Supplement 8 prints "not below 1.3D" (p. 4).',
      'Class V modes are exempt from the 2,500 cd per side at 50V (§6.2.8.1, p. 19).',
      'Segment Imax: Table 2 item 2.1 gives Class V only a vertical extent, 0.3°D to 1.72°D, and leaves the '
      + 'horizontal extent blank. The zone here spans 90°L to 90°R; that horizontal bound is this transcription\'s.',
      SEG10_ALT, HALF_SUM, SHARPNESS, NO_TOLERANCE, LHT,
    ],
  },
  {
    id: 'passing-E',
    name: 'Class E passing beam (motorway)',
    kind: 'headlamp',
    traffic: 'right',
    aim: aimMode('not above 0.23°D and not below 0.57°D'),
    aimRule: 'keep-passing-aim',
    tolerance: null,
    requirements: [
      ...table1('E', PART_A.E, 'A', { B50L: `${t1('1')}, footnote 8`, imax: `${IMAX_CITE}; footnote 8` }),
      segmentImax('E', 16900, 79300, `${t1('18')}, footnote 8`),
    ],
    notes: [
      'Class E is meant for roads such as motorways (§1.3 footnote 2, p. 5). A Class E mode may also comply with one '
      + 'of the data sets E1, E2 or E3 of Table 6; the communication form states which (§6.4.7, p. 21). Those data '
      + 'sets are separate functions here.',
      SEG10_ALT, FOOTNOTE_7, ...COMMON_PASSING_NOTES,
    ],
  },
  ...(/** @type {const} */ ([['E1', 530, 70500, 0.34], ['E2', 440, 61700, 0.45], ['E3', 350, 52900, 0.57]])).map(
    ([set, b50l, imax, cut], i) => ({
      id: `passing-${set}`,
      name: `Class E passing beam, data set ${set}`,
      kind: 'headlamp',
      traffic: 'right',
      aim: aimMode(`not above ${cut.toFixed(2)}°D and not below 0.57°D (Table 6 item 6.${i + 1} replaces the "not above" bound)`),
      aimRule: 'keep-passing-aim',
      tolerance: null,
      requirements: [
        ...table1('E', { ...PART_A.E, B50L: { min: 50, max: b50l }, imax: { min: 16900, max: imax } }, 'A', {
          B50L: `${t1('1')} (min); ${T6}, item 6.${i + 1} (max)`,
          imax: `${t1('18')} (min); ${T6}, item 6.${i + 1} (max); ${SUP8_IMAX}`,
        }),
        segmentImax('E', 16900, imax, `${t1('18')} (min); ${T6}, item 6.${i + 1} (max)`),
      ],
      notes: [
        `Data set ${set}: Table 1 Part A (or Part B for bending) and Table 2 apply with line 1 (B50L maximum), line 18 `
        + `(Imax maximum) and Table 2 item 2.2 (cut-off "not above") replaced by Table 6 item 6.${i + 1} (p. 41).`,
        SEG10_ALT, FOOTNOTE_7, ...COMMON_PASSING_NOTES,
      ],
    })),
  {
    id: 'passing-W',
    name: 'Class W passing beam (adverse weather)',
    kind: 'headlamp',
    traffic: 'right',
    aim: aimMode('not above 0.23°D and not below 0.57°D'),
    aimRule: 'keep-passing-aim',
    tolerance: null,
    requirements: [
      ...table1('W', PART_A.W, 'A', { seg10: `${t1('17')}, footnote 2`, imax: `${IMAX_CITE}; footnote 2` }),
      ...W_SEGMENTS,
      segmentImax('W', 29530, 70500, `${t1('18')}, footnote 2`),
      segmentImax('W', 29530, 88100, `${t1('18')} (min); ${T4}, item 4.2 (max)`,
        { id: 'Segment Imax, Table 4.2 set', when: ['w-table-4-2'], replaces: 'Segment Imax' }),
    ],
    notes: [
      'Class W is meant for adverse conditions such as a wet road (§1.3 footnote 2, p. 5).',
      'Table 4 item 4.2 (p. 41): if the applicant specifies a Class W beam designed to give no more than 8,800 cd on '
      + 'segment 20 and below it and no more than 3,550 cd on segment 10 and below it, the design value of its Imax '
      + 'may be up to 88,100 cd. These are the requirements with when: [\'w-table-4-2\']. The text sets no new '
      + 'minimum, so line 18\'s minimum is kept.',
      'The Imax minimum 29,530 cd is printed so in Rev.2 (p. 39), unlike the round values elsewhere; it was checked '
      + 'against the rendered page.',
      FOOTNOTE_7, ...COMMON_PASSING_NOTES,
    ],
  },
  ...(/** @type {const} */ (['C', 'V', 'E', 'W'])).map(cls => ({
    id: `passing-${cls}-bending`,
    name: `Class ${cls} passing beam, bending mode`,
    kind: 'headlamp',
    traffic: 'right',
    aim: `${aimMode({ C: 'at 0.57°D', V: 'not above 0.57°D and not below 1.3°D', E: 'not above 0.23°D and not below 0.57°D', W: 'not above 0.23°D and not below 0.57°D' }[cls])} `
      + 'Category 1 bending modes are first re-aimed horizontally in the opposite direction (Annex 9 §3.1.1.2(b), p. 76).',
    aimRule: 'keep-passing-aim',
    tolerance: null,
    requirements: [
      ...table1(cls, bending(cls), 'B', cls === 'W' ? { seg10: `${t1('17')}, footnote 2` } : {}),
      ...(cls === 'W' ? W_SEGMENTS : []),
      ...TURN_RADIUS,
    ],
    notes: [
      ...(cls === 'E' ? ['Class E in Part B: lines 1 (B50L) and 2 (HV) are blank. Table 6 data sets E1–E3 still apply '
        + 'to Part B (Table 6 heading, p. 41) and would add a B50L maximum of 530, 440 or 350 cd.'] : []),
      ...(cls === 'W' ? ['Class W in Part B: line 2 (HV) is blank and line 1 (B50L) has a maximum only. Table 4 item '
        + '4.2 also applies to Part B (p. 41).'] : []),
      ...(cls === 'V' ? ['Class V in Part B: lines 1 (B50L) and 2 (HV) have maxima only.'] : []),
      ...(cls !== 'W' ? [SEG10_ALT] : []),
      ...(cls !== 'V' ? [SIDE_50V] : []),
      ...BENDING_NOTES,
    ],
  })),
  {
    id: 'traffic-change',
    name: 'Traffic-change function (right-hand system used in left-hand traffic)',
    kind: 'headlamp',
    traffic: 'right',
    aim: 'Measured as in §6.2 with the adjustment left as it was for the original direction of traffic (§5.8.2, p. 16). '
      + 'Annex 8 does not apply to the traffic-change function (§6.2.1.2, p. 18).',
    aimRule: 'keep-passing-aim',
    tolerance: null,
    requirements: [
      pt('0.86D-1.72L', -1.72, -0.86, { min: 2500 }, `${REV2}, §5.8.2.1 (p. 16)`, 'road'),
      pt('0.57U-3.43R', 3.43, 0.57, { max: 880 }, `${REV2}, §5.8.2.1 (p. 16)`, 'glare'),
    ],
    notes: [
      'A system must let the vehicle be used temporarily where traffic drives on the other side, either by a user '
      + 'setting without special tools (§5.4) or by a traffic-change function meeting these two values (§5.8, p. 16).',
      'For a left-hand system adapted to right-hand traffic the points are 0.86D-1.72R (at least 2,500 cd) and '
      + '0.57U-3.43L (at most 880 cd) (§5.8.2.2, p. 16).',
      HALF_SUM,
    ],
  },
  {
    id: 'driving',
    name: 'Driving beam',
    kind: 'headlamp',
    traffic: 'right',
    aim: 'System in its neutral state; the lighting units are adjusted, following the manufacturer\'s instructions, so '
      + 'that the area of maximum illumination is centred on HV. Units that cannot be adjusted on their own, or were '
      + 'aimed for the passing-beam measurements, are tested unchanged (§6.3–6.3.1.1, p. 19).',
    aimRule: 'driving-max',
    tolerance: null,
    requirements: [
      { kind: 'imax', id: 'Im', min: 40500, max: 215000, cite: `${REV2}, §6.3.2 table (p. 20) (min); §6.3.2.1.1 (p. 20) (max)`, group: 'axis' },
      { kind: 'relative', id: 'HV', at: { kind: 'point', h: 0, v: 0 }, factor: 0.8, of: 'imax', bound: 'min',
        cite: `${REV2}, §6.3.2.1 (p. 20)`, group: 'axis' },
      pt('H-5L', -5, 0, { min: 5100 }, `${REV2}, §6.3.2 table (p. 20)`, 'road'),
      pt('H-2.5L', -2.5, 0, { min: 20300 }, `${REV2}, §6.3.2 table (p. 20)`, 'road'),
      pt('H-2.5R', 2.5, 0, { min: 20300 }, `${REV2}, §6.3.2 table (p. 20)`, 'road'),
      pt('H-5R', 5, 0, { min: 5100 }, `${REV2}, §6.3.2 table (p. 20)`, 'road'),
      note('Each side at HV', 'The lighting units of the right side and of the left side must each give at least '
        + '16,200 cd at HV (one-side rule, not halved).', `${SUP6}, §6.3.4.1 (p. 2)`, 'axis'),
    ],
    notes: [
      'HV must lie inside the 80 per cent isolux of the maximum intensity (§6.3.2.1), transcribed as I(HV) ≥ 0.8 × Imax.',
      'The 215,000 cd ceiling (§6.3.2.1.1) and the reference mark I\'M = IM / 4,300, rounded to 5, 10, 12.5, 17.5, 20, '
      + '25, 27.5, 30, 37.5, 40, 45 or 50 (§6.3.2.1.2), are one-side rules and are not halved (Annex 9 §1.8.1 as '
      + 'amended by Suppl. 6). The other values apply to half the sum of both sides (Annex 9 §1.8, p. 75).',
      'If the beam fails, it may be re-aimed within 0.5° up or down and/or 1° left or right of its first aim, and '
      + 'must then meet every requirement; this does not apply to units tested unchanged under §6.3.1.1 (§6.3.5, p. 20).',
      'A driving beam that moves sideways must still meet §6.3.2.1.1 and §6.3.2.1.2 with each unit measured per '
      + 'Annex 9 (§6.3.3, p. 20). An adapting driving beam meets these values only at maximum activation (§6.3.6).',
      'Adjustable systems: repeat after moving the unit ±2° vertically (or to the end of its range) and re-aiming '
      + 'the opposite way; check Imax and HV as a percentage of Imax (§6.4.3–6.4.3.1 as amended by Suppl. 8).',
      'Run-up, gas-discharge source with separate ballast, driving-beam-only system: at least 37,500 cd at HV four '
      + 'seconds after switching on (§6.1.4.4.1, p. 17).',
      NO_TOLERANCE,
    ],
  },
  ...(/** @type {const} */ ([
    ['oncoming-50m', 'oncoming vehicle at 50 m', [['Line 1 Left', -4.8, -2, 0.57, 625]]],
    ['oncoming-100m', 'oncoming vehicle at 100 m', [['Line 2 Left', -2.4, -1, 0.3, 1750]]],
    ['oncoming-200m', 'oncoming vehicle at 200 m', [['Line 3 Left', -1.2, -0.5, 0.15, 5450]]],
    ['preceding-50m', 'preceding vehicle at 50 m', [['Line 4 (1.7°L to 1.0°R)', -1.7, 1, 0.3, 1850], ['Line 4 (beyond 1.0°R to 1.7°R)', 1, 1.7, 0.3, 2500]]],
    ['preceding-100m', 'preceding vehicle at 100 m', [['Line 5 (0.9°L to 0.5°R)', -0.9, 0.5, 0.15, 5300], ['Line 5 (beyond 0.5°R to 0.9°R)', 0.5, 0.9, 0.15, 7000]]],
    ['preceding-200m', 'preceding vehicle at 200 m', [['Line 6', -0.45, 0.45, 0.1, 16000]]],
  ])).map(([key, label, lines]) => ({
    id: `driving-adaptive-${key}`,
    name: `Adaptive driving beam, ${label}`,
    kind: 'headlamp',
    traffic: 'right',
    aim: 'The driving-beam aim (§6.3.1, p. 19) is kept; the adaptation state is set by the applicant\'s signal '
      + 'generator, which reproduces the vehicle\'s signals (§6.3.7, p. 20).',
    aimRule: 'keep-driving-aim',
    tolerance: null,
    requirements: [
      ...lines.map(([id, h0, h1, v, max]) => ln(id, h0, v, h1, v, { max }, T7A, 'glare')),
      ...[
        pt('50R', 1.72, -0.86, { min: 5100 }, T7B, 'road'),
        pt('50V', 0, -0.86, { min: 5100 }, T7B, 'road'),
        pt('50L', -3.43, -0.86, { min: 2550 }, T7B, 'road'),
        pt('25LL', -16, -1.72, { min: 1180 }, T7B, 'road'),
        pt('25RR', 11, -1.72, { min: 1180 }, T7B, 'road'),
      ].map(r => ({ ...r, when: ['no-continuous-passing-beam'] })),
    ],
    notes: [
      'Each line of Table 7 Part A is a separate adaptation state, measured on its own together with the Part B '
      + 'points, with the signal the generator gives for that state. Do not apply the lines of different states '
      + 'to one distribution (Table 7 notes, p. 43).',
      'Part B (the minimum points) is not applied when a passing beam meeting §6.2 stays on throughout the '
      + 'adaptation (Table 7 notes, p. 43).',
      ...(key.startsWith('preceding-50') || key.startsWith('preceding-100')
        ? ['The table splits the line at a boundary point: the boundary belongs to the lower limit, and the higher '
          + 'limit applies to points "greater than" it (">1.0° R", ">0.5°R"). Both line entries include the boundary '
          + 'here, so the boundary is held to the lower limit by the first.'] : []),
      'Table 7 Part A lists separate lines for left-hand traffic (Line 1–5 Right); they are the mirror images of '
      + 'these. Line 6 is the same for both. If the requirements can be met for one direction of traffic only, or if '
      + 'lines 1–3 are met as a symmetrical beam, the communication form says so (§6.3.7.1–6.3.7.2, p. 21).',
      'All values apply to half the sum of the values from all lighting units used for this function (Table 7 note **, p. 43).',
    ],
  })),
];
