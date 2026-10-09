/** UN Regulation No. 149, original version (00 series), up to Supplement 10: photometric requirements for headlamps
 * (passing beams of Classes A, B and D and of the symmetric Classes AS, BS, CS, DS and ES; driving beams of Classes A,
 * B and D and of the symmetric Classes BS, CS, DS and ES). AFS, front fog lamps and cornering lamps are notes only.
 * Source and choices: docs/research/r149-00-notes.md
 *
 * Authentic text: ECE/TRANS/WP.29/2018/158/Rev.1 (published as E/ECE/TRANS/505/Rev.3/Add.148, in force 15 November
 * 2019), with Supplement 1 (ECE/TRANS/WP.29/2019/82 and 2019/125 as amended by ECE/TRANS/WP.29/1149 para. 69: 50L
 * minima deleted), Supplement 2 (ECE/TRANS/WP.29/2020/33: run-up values) and Supplement 3 (ECE/TRANS/WP.29/2021/46:
 * Table 8 Part A replaced). Supplements 4 to 10 change no value transcribed here. Page numbers are those printed in
 * ECE/TRANS/WP.29/2018/158/Rev.1 unless a supplement is named.
 *
 * Coordinates: degrees, h positive to the right of V-V, v positive above H-H. Classes A, B and D are written for
 * right-hand traffic; for left-hand traffic every horizontal coordinate is mirrored about V-V and R and L swap in the
 * names (Table 8 note ***, p. 30; Figure A4-V caption as amended by Supplement 5). The symmetric classes and the
 * driving beams are symmetric about V-V and are transcribed as printed. Intensities in candela. */

/**
 * @typedef {{ h: number, v: number }} PointGeometry
 * @typedef {{ h0: number, v0: number, h1: number, v1: number }} LineGeometry
 * @typedef {{ polygon: number[] }} ZoneGeometry
 * @typedef {{
 *   kind: 'point' | 'line' | 'zone' | 'sum' | 'relative' | 'imax' | 'note',
 *   id: string,
 *   cite: string,
 *   group?: 'cutoff' | 'glare' | 'signs' | 'beam' | 'foreground' | 'flux' | 'axis' | 'field' | 'other',
 *   when?: string[],
 *   replaces?: string,
 *   min?: number,
 *   max?: number,
 *   h?: number, v?: number,
 *   h0?: number, v0?: number, h1?: number, v1?: number,
 *   polygon?: number[],
 *   measure?: 'everywhere' | 'brightest',
 *   points?: number[],
 *   at?: ({ kind: 'point' } & PointGeometry) | ({ kind: 'line' } & LineGeometry) | ({ kind: 'zone' } & ZoneGeometry),
 *   factor?: number,
 *   of?: string,
 *   bound?: 'min' | 'max',
 *   text?: string,
 * }} Requirement
 *   `when` lists CONDITIONS ids that must all hold for the requirement to apply; without it the requirement always
 *   applies. `replaces` names the requirement (same function) that this conditional one stands in for when its
 *   conditions hold.
 * @typedef {{
 *   id: string, name: string, kind: 'headlamp', traffic: 'right' | 'both', aim: string, aimRule?: string,
 *   tolerance: { deg: number, cite: string } | null,
 *   requirements: Requirement[], notes: string[],
 * }} HeadlampFunction
 *   aimRule 'r149': aimed as the R149 01 series instrumental method aims an asymmetric passing beam (see the notes).
 *   aimRule 'driving-max': a driving-beam-only headlamp, with its area of maximum intensity centred on H-V.
 */

export const SOURCE = {
  title: 'UN Regulation No. 149 (road illumination devices), original version (00 series), up to Supplement 10',
  document: 'ECE/TRANS/WP.29/2018/158/Rev.1 (published as E/ECE/TRANS/505/Rev.3/Add.148); Supplement 1 ECE/TRANS/WP.29/2019/82 and ECE/TRANS/WP.29/2019/125 as amended by ECE/TRANS/WP.29/1149 para. 69; Supplement 2 ECE/TRANS/WP.29/2020/33; Supplement 3 ECE/TRANS/WP.29/2021/46',
  url: 'https://documents.un.org/api/symbol/access?s=ECE/TRANS/WP.29/2018/158/Rev.1&l=en&t=pdf',
  retrieved: '2026-10-09',
};

/**
 * Condition atoms that requirements name in `when`. Atoms sharing a `set` are mutually exclusive states; atoms
 * without a set are facts the user declares about the lamp or its test.
 * @type {{ id: string, text: string, set?: string }[]}
 */
export const CONDITIONS = [
  { id: 'led-module-ecg', text: 'LED modules produce the passing beam in conjunction with an electronic light source control gear: the 50L maximum of Classes A and B is 18,500 cd instead of 13,200 cd (R149 00 series, Table 8 note *, p. 30).' },
  { id: 'led-source', text: 'LED light sources or LED modules produce the principal passing beam, so its total objective luminous flux is limited (R149 00 series §4.5.3.2.3–4.5.3.2.5, p. 20).' },
  { id: 'gdl-ballast-separate', text: 'Gas-discharge light source with the ballast not integrated with the light source, tested after it has not been operated for 30 minutes or more (R149 00 series Supplement 2, ECE/TRANS/WP.29/2020/33, §5.1.3.7, §5.2.2.1 and §5.4.4.3.1).' },
  { id: 'driving-only', text: 'The headlamp provides a driving beam only (R149 00 series §5.1.1, pp. 26–27; Supplement 2 §5.1.3.7).' },
  { id: 'primary-driving-beam', set: 'driving-role', text: 'Driving beam of Class BS, CS, DS or ES declared as a primary driving beam (Table 6, p. 27; communication form item 9.4.9, Annex 1).' },
  { id: 'secondary-driving-beam', set: 'driving-role', text: 'Driving beam of Class BS, CS, DS or ES declared as a secondary driving beam, which "shall only be operated together with a passing beam or a primary driving beam" (Table 7, p. 28; communication form item 9.4.9, Annex 1).' },
];

const S = 'R149 00 series';
const SUP2 = 'R149 00 series Supplement 2 (ECE/TRANS/WP.29/2020/33)';
const SUP3 = 'R149 00 series Supplement 3 (ECE/TRANS/WP.29/2021/46)';
const T5 = `${S} Table 5 (p. 27)`;
const T6 = `${S} Table 6 (pp. 27–28)`;
const T7 = `${S} Table 7 (p. 28)`;
const T8A = `${S} Table 8 Part A as replaced by ${SUP3} (p. 2)`;
const T8B = `${S} Table 8 Part B (p. 30)`;
const T8C = `${S} Table 8 Parts A and C (p. 30)`;
const T33 = `${S} Table 33 (p. 51)`;
const T34 = `${S} Table 34 (p. 51)`;
const T35 = `${S} Table 35 (p. 52)`;

/** Zone III of Classes A, B and D, Table 8 Part C (p. 30): vertices in order, as [h, v, …]. */
export const ZONE_III = [-8, 1, -8, 4, 8, 4, 8, 2, 6, 1.5, 1.5, 1.5, 0, 0, -4, 0];

/** Zone 1 of Classes CS, DS and ES, Table 35 (p. 52): "1°U/8°L-4°U/8°L-4°U/8°R-1°U/8°R-0/4°R-0/1°R-0.6°U/0-0/1°L-0/4°L-1°U/8°L". */
export const ZONE_1_CS_DS_ES = [-8, 1, -8, 4, 8, 4, 8, 1, 4, 0, 1, 0, 0, 0.6, -1, 0, -4, 0];

/** Open edges of zones the text bounds on one side only. Cutline's wide grid ends at ±60° H and ±30° V. */
const FAR_H = 60;
const FAR_V = 30;

/** @param {string} id @param {number} h @param {number} v @param {{ min?: number, max?: number }} lim @param {string} cite @param {Requirement['group']} [group] @returns {Requirement} */
const point = (id, h, v, lim, cite, group) => ({ kind: 'point', id, h, v, ...lim, cite, ...(group ? { group } : {}) });

/**
 * Classes A, B and D passing beam, Table 8 (right-hand traffic).
 * @param {'A' | 'B' | 'D'} cls
 * @returns {Requirement[]}
 */
function table8(cls) {
  const A = cls === 'A', B = cls === 'B', D = cls === 'D';
  /** @type {Requirement[]} */
  const out = [
    point('B50L', -3.43, 0.57, { max: 350 }, `${T8A}, No. 1`),
    { kind: 'zone', id: 'Zone III', polygon: ZONE_III, max: 625, cite: `${T8A}, No. 3; ${T8C}` },
  ];
  if (!D) out.push(point('BR', 2.5, 1, { max: 1750 }, `${T8A}, No. 2`));
  else out.push(point('C-D', 2.5, 1, { max: 1750 }, `${T8A}, row "C-D" (renamed from "Segment I C to D" by ${SUP3})`, 'glare'));
  out.push(
    point('50R', 1.72, -0.86, { min: A ? 5100 : B ? 10100 : 12500 }, `${T8A}, No. 4`),
    point('75R', 1.15, -0.57, { min: A ? 5100 : B ? 10100 : 12500 }, `${T8A}, No. 5`),
  );
  if (!A) out.push(point('50V', 0, -0.86, { min: B ? 5100 : 7500 }, `${T8A}, No. 6`));
  out.push(point('50L', -3.43, -0.86, { max: D ? 18480 : 13200 }, `${T8A}, No. 7${D ? '' : '; Supplement 1 (ECE/TRANS/WP.29/2019/125) deleted the 50L minima'}`, 'glare'));
  if (!D) {
    out.push(
      { kind: 'point', id: '50L, LED modules with control gear', group: 'glare', h: -3.43, v: -0.86, max: 18500, when: ['led-module-ecg'], replaces: '50L', cite: `${T8A}, No. 7, and Table 8 note * (p. 30)` },
      point('75L', -3.43, -0.57, { max: 10600 }, `${T8A}, No. 8`, 'glare'),
    );
  } else {
    out.push(point('25L1', -3.43, -1.72, { max: 18800 }, `${T8A}, No. 9`, 'glare'));
  }
  const m25 = A ? 1250 : B ? 1700 : 2500;
  out.push(point('25L2', -9, -1.72, { min: m25 }, `${T8A}, No. 10`), point('25R1', 9, -1.72, { min: m25 }, `${T8A}, No. 11`));
  if (D) {
    out.push(
      point('25L3', -15, -1.72, { min: 1250 }, `${T8A}, No. 12`),
      point('25R2', 15, -1.72, { min: 1250 }, `${T8A}, No. 13`),
      point('15L', -20, -2.86, { min: 625 }, `${T8A}, No. 14`),
      point('15R', 20, -2.86, { min: 625 }, `${T8A}, No. 15`),
      { kind: 'line', id: 'Segment I A to B', h0: -5.15, v0: -0.86, h1: 5.15, v1: -0.86, min: 3750, cite: `${T8A}, row "Segment I A to B"` },
      { kind: 'zone', id: 'Segment III and under', group: 'foreground', polygon: [-9.37, -4.29, 8.5, -4.29, 8.5, -FAR_V, -9.37, -FAR_V], max: 12500, cite: `${T8A}, row "Segment III and under" (9.37 L to 8.50 R at 4.29 D and below; the lower edge at ${FAR_V}°D is Cutline's)` },
      { kind: 'zone', id: 'Imax R', group: 'beam', polygon: [0, -1.72, FAR_H, -1.72, FAR_H, FAR_V, 0, FAR_V], max: 43800, cite: `${T8A}, row "Imax R": "Vertical above 1.72D, right of V-V line" (renamed from "Emax R" by ${SUP3}; outer edges at ${FAR_H}° and ${FAR_V}°U are Cutline's)` },
      { kind: 'zone', id: 'Imax L', group: 'beam', polygon: [-FAR_H, FAR_V, 0, FAR_V, 0, -FAR_V, -FAR_H, -FAR_V], max: 31300, cite: `${T8A}, row "Imax L": "Left of V-V line" (renamed from "Emax L" by ${SUP3}; outer edges at ${FAR_H}° and ±${FAR_V}° are Cutline's)` },
    );
  } else {
    const zoneIV = [-5.15, -0.86, 5.15, -0.86, 5.15, -1.72, -5.15, -1.72];
    const zoneI = [-9, -1.72, 9, -1.72, 9, -4, -9, -4];
    out.push({ kind: 'zone', id: 'Zone IV', polygon: zoneIV, min: A ? 1700 : 2500, group: 'beam', cite: `${T8A}, row "Zone IV" (5.15 L to 5.15 R, 0.86 D to 1.72 D)` });
    if (A) out.push({ kind: 'zone', id: 'Zone I', polygon: zoneI, max: 17600, group: 'foreground', cite: `${T8A}, row "Zone I" (9.00 L to 9.00 R, 1.72 D to 4.00 D)` });
    else out.push({ kind: 'relative', id: 'Zone I', at: { kind: 'zone', polygon: zoneI }, factor: 2, of: '50R', bound: 'max', group: 'foreground', cite: `${T8A}, row "Zone I": "< 2I**", note ** "Actual measured value at points 50R / 50L respectively" (p. 30)` });
  }
  out.push(
    { kind: 'sum', id: 'B1 + B2 + B3', points: [-8, 4, 0, 4, 8, 4], min: 190, cite: `${T8B}: B1 4.00 U – 8.00 L, B2 4.00 U – 0, B3 4.00 U – 8.00 R` },
    { kind: 'sum', id: 'B4 + B5 + B6', points: [-4, 2, 0, 2, 4, 2], min: 375, cite: `${T8B}: B4 2.00 U – 4.00 L, B5 2.00 U – 0, B6 2.00 U – 4.00 R` },
    point('B7', -8, 0, { min: 65 }, `${T8B}: B7 0 – 8.00 L`, 'signs'),
    point('B8', -4, 0, { min: 125 }, `${T8B}: B8 0 – 4.00 L`, 'signs'),
    { kind: 'note', id: 'Lateral variations', text: 'There shall be no lateral variations detrimental to good visibility in any of the zones I, III and IV.', cite: `${S} §5.2.3 (p. 31)` },
    { kind: 'note', id: 'LED flux', group: 'flux', when: ['led-source'], text: 'The total objective luminous flux of all LED light sources and LED modules producing the principal passing beam, measured as in Annex 9 §5, shall be at least 1,000 lm.', cite: `${S} §4.5.3.2.3 (p. 20)` },
  );
  if (D) out.push({ kind: 'note', id: 'Run-up at 50V', when: ['gdl-ballast-separate'], text: 'Four seconds after ignition, at least 6,250 cd at 50V (for headlamps producing a passing beam only or alternately passing and driving beams). The power supply must secure the rise of the high current pulse.', cite: `${SUP2} §5.2.2.1 (p. 2)` });
  return out;
}

const AIM_PASSING = `The headlamp is aimed visually by its cut-off on a screen at 10 m or 25 m: the horizontal part is moved up from below line B to 0.57° (1 %) below H-H, and the elbow-shoulder moved from right to left (right-hand traffic) so that above 0.2°D the shoulder does not pass line A to the left, at or below 0.2°D it crosses line A, and the kink lies within ±0.5° of V-V (${S} §5.2.1 p. 29; Annex 5 §1.2–1.2.2, pp. 86–87; line A is drawn 0.5° right of V-V in Figures A5-I and A5-III, pp. 87 and 90). If the vertical aim cannot be repeated within the tolerances, the instrumental method of Annex 5 §2 applies (§1.2.4, p. 88): a vertical scan at 2.5° from V-V puts the inflection point on line B (§2.3.1, p. 89; Figure A5-III draws the scan line on the left of V-V), and the applicant chooses the "0.2 D line" or "3 line" horizontal method (§2.3.2, pp. 89–90).`;
const RHT_NOTE = `Written for right-hand traffic. For left-hand traffic, R and L swap (Table 8 note ***, p. 30) and the test points are mirrored about V-V (Figure A4-V and A4-VI captions, pp. 77–78; Figure A4-V caption as amended by Supplement 5, ECE/TRANS/WP.29/2022/38, p. 2). A headlamp for both traffic systems must meet the requirements in each of its two settings (§5.2.4, p. 31).`;
const NO_TOL = `No coordinate tolerance: Table 8 has no tolerance note, and §5.1 and §5.2 have no tolerance sentence. The "0.25° tolerance allowed independently at each test point" applies only to the tables that print it (Tables 6, 7, 33, 34 and 35). Points are measured where the table puts them.`;
const REALIGN = `If the aimed headlamp fails, its alignment may be changed by not more than 0.5° to the left or 0.75° to the right of line A (right-hand traffic; mirrored for left-hand traffic) and 0.25° up or down from line B (${S} Annex 5 §1.2.3, pp. 87–88; §5.2.1.2, p. 29). The 01 series allows 0.75° either way.`;
const PASSING_NOTES = [
  RHT_NOTE,
  NO_TOL,
  REALIGN,
  `Part B points B1 to B8 (overhead signs and the left verge) carry no class columns and are drawn in both Figure A4-V (Classes A and B) and Figure A4-VI (Class D), so they apply to all three classes (${T8B}; pp. 77–78).`,
  `A headlamp approved for a passing beam only may incorporate a driving beam not subject to requirements (${S} §5.2.1.1 and footnote 9, p. 29). A headlamp providing both must also meet §5.1 with the same aim (§5.1.1, p. 26).`,
  `Lamps with replaceable filament sources are measured with an étalon source at its reference flux at 13.2 V (H9 and H9B may use 12.2 V), or corrected by F = Φreference / Φtest; gas-discharge sources at 13.2 V ± 0.1 V on the ballast; replaceable LED sources at 13.2 V ± 0.1 V with a flux correction; LED modules at 6.3 V, 13.2 V or 28.0 V (${S} §4.6.1–4.6.5, pp. 21–22).`,
  `Lamps with an asymmetric cut-off adapted for the other traffic side (masking, lowering the beam) must give, with the aim unchanged, at least 2,500 cd at 0.86D-1.72L and not more than 880 cd at 0.57U-3.43R for a right-hand-traffic beam adapted to left-hand traffic, mirrored the other way (${S} §4.12.2, p. 25). This is a separate measured state and is not in the requirements.`,
  `Bend lighting: the requirements also apply with the bend lighting operating, and the beam may be re-aimed if its axis moves vertically by not more than 0.2° (${S} §5.2.5, p. 31). On failure of the bend lighting mechanism, intensity above H-H must not exceed the passing-beam values and 25V (V, 1.72D) must reach at least 2,500 cd (§4.11.2.1, p. 24; Supplement 10, ECE/TRANS/WP.29/2025/118, renumbers §4.11 without printing the new number of this paragraph).`,
  `Conformity of production: no value may deviate unfavourably by more than 20 %, with B50L allowed 170 cd (20 %) or 255 cd (30 %) and Zone III 255 cd (20 %) or 380 cd (30 %); or the values are met at one point within 0.35° of B50L (85 cd tolerance), 75R, 50V, 25R and 25L and over Zone IV up to 0.52° above line 25 (Classes A and B), or of B50L, 75R, 50V, 25R1, 25L2 and on Segment I (Class D) (${S} Annex 2 §1.2.1.1 and §1.2.2.1, pp. 66–67).`,
];

/** @param {'A' | 'B' | 'D'} cls @param {string} symbol @param {string} figure @returns {HeadlampFunction} */
function passingABD(cls, symbol, figure) {
  /** @type {string[]} */
  const extra = cls === 'D'
    ? [
      `Class D uses gas-discharge light sources (symbol "DC", ${S} §5.2 title, p. 28). Gas-discharge passing beams must meet the Table 8 values only after more than 10 minutes after ignition (§5.2.2, p. 29).`,
      `Imax R and Imax L bound only one side each in the table ("Vertical above 1.72D, right of V-V line"; "Left of V-V line"). Cutline closes them at its wide grid (${FAR_H}° H, ${FAR_V}° V). Figure A4-VI (p. 78) shades the Imax R zone only above about 1.7° up, which contradicts the table's "above 1.72D"; the data follow the table. Both zones share the V-V edge, and Cutline counts a reading on the edge in both.`,
      `Class D has no BR row: its "C-D" element sits at the same direction (2.50 R, 1.00 U) with the same 1,750 cd maximum (${T8A}).`,
    ]
    : [
      `The original text printed 50L minima of 3,550 cd (Class A) and 6,800 cd (Class B); Supplement 1 deleted them as a transposition error (ECE/TRANS/WP.29/2019/125, p. 2, adopted as part of Supplement 1 by ECE/TRANS/WP.29/1149 para. 69).`,
      ...(cls === 'B' ? [`Zone I: the table prints "< 2I**", strictly less than twice the value measured at 50R (50L for left-hand traffic). Cutline treats the limit as "at most".`] : []),
      `Figure A4-V (p. 77) draws Zone IV ending near 4°R, but Table 8 gives 5.15 L to 5.15 R; the data follow the table.`,
    ];
  return {
    id: `passing-${cls}`,
    name: `Class ${cls} passing beam`,
    kind: 'headlamp',
    traffic: 'right',
    aim: AIM_PASSING,
    aimRule: 'r149',
    tolerance: null,
    requirements: table8(cls),
    notes: [`Symbol "${symbol}"; beam pattern ${figure} (${T8A}).`, ...extra, ...PASSING_NOTES],
  };
}

const AIM_DRIVING = `A headlamp providing a driving beam and a passing beam is measured with the passing-beam aim (${S} §5.1.1, p. 26). A headlamp providing a driving beam only is adjusted so that the area of maximum intensity is centred on H-V (§5.1.1, pp. 26–27). All light sources of the driving beam are lit together to find IM; a part used only for "flash to pass" is declared on the drawing (§5.1.1, p. 27).`;
/** @param {'A' | 'B' | 'D'} cls @returns {HeadlampFunction} */
function drivingABD(cls) {
  const i = cls === 'A' ? 0 : cls === 'B' ? 1 : 2;
  const col = /** @param {number[]} v */ v => v[i];
  /** @type {Requirement[]} */
  const reqs = [
    { kind: 'imax', id: 'IM', min: col([27000, 40500, 43800]), max: 215000, cite: `${T5} (minimum); ${S} §5.1.3.5 (p. 28) (maximum)` },
    { kind: 'relative', id: 'HV within 80 % of Imax', at: { kind: 'point', h: 0, v: 0 }, factor: 0.8, of: 'imax', bound: 'min', cite: `${S} §5.1.3.4 (p. 28): HV "shall be situated within the isocandela 80 per cent of maximum luminous intensity (Imax)"` },
    point('H-5L', -5, 0, { min: col([3400, 5100, 6250]) }, T5),
    point('H-2.5L', -2.5, 0, { min: col([13500, 20300, 25000]) }, T5),
    point('H-2.5R', 2.5, 0, { min: col([13500, 20300, 25000]) }, T5),
    point('H-5R', 5, 0, { min: col([3400, 5100, 6250]) }, T5),
  ];
  if (cls === 'D') reqs.push({ kind: 'note', id: 'Run-up at HV', when: ['gdl-ballast-separate', 'driving-only'], text: 'Four seconds after ignition, at least 37,500 cd at HV for a headlamp producing a driving beam only. The power supply must secure the rise of the high current pulse.', cite: `${SUP2} §5.1.3.7 (p. 2)` });
  return {
    id: `driving-${cls}`,
    name: `Class ${cls} driving beam`,
    kind: 'headlamp',
    traffic: 'both',
    aim: AIM_DRIVING,
    aimRule: 'driving-max',
    tolerance: null,
    requirements: reqs,
    notes: [
      `Symbol "${['R', 'HR', 'DR'][i]}" (${S} §5.1 title, p. 26). Table 5 gives minima only; the maximum is 215,000 cd in any circumstances (§5.1.3.5).`,
      `Reference mark I′M = IM / 4,300, rounded to 5, 7.5, 10, 12.5, 17.5, 20, 25, 27.5, 30, 37.5, 40, 45 or 50 (${S} §5.1.3.6, p. 28). The 01 series adds 2.5 to this list.`,
      `No coordinate tolerance: Table 5 has no tolerance note and §5.1.3 no tolerance sentence. The 01 series grants 0.25° at each driving-beam test point (01 series §5.1.3); the 00 series grants it only in Tables 6 and 7.`,
      `HV is "within the isocandela 80 per cent of Imax": Cutline checks this as I(HV) ≥ 0.8 × Imax, which is the same condition read at one point.`,
      `With the passing-beam aim, the beam is measured as aimed; Cutline's 'driving-max' rule models the driving-beam-only case.`,
      `Conformity of production: with HV within the 0.75 Imax isocandela, +20 % on maxima and −20 % on minima at every §5.1 point (${S} Annex 2 §1.2.2.2, p. 67).`,
    ],
  };
}

/** @param {'BS' | 'CS' | 'DS' | 'ES'} cls @returns {HeadlampFunction} */
function drivingSymmetric(cls) {
  const i = cls === 'BS' ? 0 : cls === 'CS' ? 1 : 2;
  const col = /** @param {number[]} v */ v => v[i];
  /** @type {Requirement[]} */
  const reqs = [
    { kind: 'imax', id: 'IM', min: col([20000, 25000, 40000]), max: 215000, cite: `${T6}, rows "MIN/MAX luminous intensity of the maximum (IM)"; ${T7}` },
    point('H-V', 0, 0, { min: col([16000, 20000, 30000]) }, `${T6}, No. 1; ${T7}, No. 1`),
    point('H-2.5L', -2.5, 0, { min: col([9000, 10000, 20000]) }, `${T6}, No. 2; ${T7}, No. 2`),
    point('H-2.5R', 2.5, 0, { min: col([9000, 10000, 20000]) }, `${T6}, No. 2; ${T7}, No. 2`),
    point('H-5L', -5, 0, { min: col([2500, 3500, 5000]) }, `${T6}, No. 3; ${T7}, No. 3`),
    point('H-5R', 5, 0, { min: col([2500, 3500, 5000]) }, `${T6}, No. 3; ${T7}, No. 3`),
  ];
  if (cls !== 'BS') {
    reqs.push(point('2U-V', 0, 2, { min: col([0, 1000, 1700]) }, `${T6}, No. 6; ${T7}, No. 6`));
    /** @type {[string, number, number][]} */
    const rows45 = [['H-9L', -9, col([0, 2000, 3400])], ['H-9R', 9, col([0, 2000, 3400])], ['H-12L', -12, col([0, 600, 1000])], ['H-12R', 12, col([0, 600, 1000])]];
    for (const [id, h, min] of rows45) {
      reqs.push(point(id, h, 0, { min }, `${T6}, No. ${Math.abs(h) === 9 ? 4 : 5} (primary driving beam only)`));
      reqs.push({ kind: 'note', id: `${id}, secondary driving beam`, when: ['secondary-driving-beam'], replaces: id, text: `No requirement at ${id} for a secondary driving beam: Table 7 omits test points 4 and 5.`, cite: T7 });
    }
  }
  if (cls === 'ES') reqs.push({ kind: 'note', id: 'Run-up at HV', when: ['gdl-ballast-separate', 'driving-only'], text: 'Four seconds after ignition, at least 37,500 cd at HV for a headlamp producing a driving beam only. The power supply must secure the rise of the high current pulse.', cite: `${SUP2} §5.1.3.7 (p. 2)` });
  const symbol = ['R-BS', 'WR-CS', cls === 'DS' ? 'WR-DS' : 'WR-ES'][i];
  return {
    id: `driving-${cls}`,
    name: `Class ${cls} driving beam`,
    kind: 'headlamp',
    traffic: 'both',
    aim: AIM_DRIVING,
    aimRule: 'driving-max',
    tolerance: { deg: 0.25, cite: `${T6} and ${T7}, note *: "0.25° tolerance allowed independently at each test point for photometry unless indicated otherwise"` },
    requirements: reqs,
    notes: [
      `Symbol "${symbol}" (${S} §5.1 title, p. 26). For L-category and T-category vehicles. Tables 6 and 7 give the same values; Table 7 (secondary driving beam) omits test points 4 (H-9°R and 9°L) and 5 (H-12°R and 12°L).${cls === 'BS' ? ' Class BS has no requirement at those points in either table, nor at 2°U-V.' : ' The requirements default to the primary driving beam; declaring the secondary condition replaces points 4 and 5 by notes.'}`,
      `The HV-in-80 %-isocandela rule of §5.1.3.4 does not apply to Classes BS, CS, DS and ES (${S} §5.1.3.4, p. 28).`,
      ...(cls === 'DS' || cls === 'ES' ? [`Table 6 and Table 7 print one column for "Class DS, ES".`] : []),
      `Reference mark I′M = IM / 4,300, rounded as for Classes A, B and D (${S} §5.1.3.6, p. 28).`,
    ],
  };
}

const AIM_SYMMETRIC = `The cut-off must be sharp enough for visual adjustment on a flat screen at 10 m or 25 m, at least 3° wide either side of V-V, and substantially horizontal and straight from 3°L to 3°R (${S} §5.4.1.1, p. 50). Horizontal aim: the beam pattern appears approximately symmetrical about V-V. Vertical aim: the cut-off is moved up from below until it lies on V-V at 0.57° (1 %) below H-H (Annex 6 §3.1–3.2, p. 93). If three attempts differ by more than 0.2° (Class BS) or 0.3° (Classes AS, CS, DS, ES), the cut-off is checked instrumentally and the inflection point on V-V is placed at the nominal position, moving upwards (Annex 6 §3.3, §4 and §5, pp. 93–94; §5.4.1.2, p. 50).`;

/** @param {'AS' | 'BS' | 'CS' | 'DS' | 'ES'} cls @returns {string[]} */
function symmetricNotes(cls) {
  const g = cls === 'BS' ? '0.13' : '0.08';
  const lin = cls === 'BS' ? '0.2°' : '0.3°';
  const flux = { AS: '150 lm to 900 lm', BS: '350 lm to 1,000 lm', CS: '500 lm to 2,000 lm', DS: '1,000 lm to 2,000 lm', ES: 'at least 2,000 lm' }[cls];
  return [
    `For L-category and T-category vehicles. The beam is symmetric about V-V, so the same values apply in both traffic systems.`,
    `Cut-off quality, when checked instrumentally: vertical scans in steps not exceeding 0.05° at 10 m (detector about 10 mm) or 25 m (about 30 mm), along lines from 3° to 1.5° either side of V-V; the largest G = log E(β) − log E(β + 0.1°) on the ±2.5° lines must be at least ${g}; the inflection points at 3°L and 3°R must lie within ${lin} of the nominal position at V-V (${S} Annex 6 §4.1–4.1.3, p. 94).`,
    `This is not the asymmetric-beam aim of Classes A, B and D, and differs from the 01 series symmetric method (01 series Annex 6 §2.2.2 (b) and §2.2.3.1 (b): G ≥ 0.08 for all symmetric classes, inflection points within 0.5°).`,
    `If the aimed headlamp fails, its alignment may be changed (unless it has no horizontal adjustment) by not more than 0.5° left or right and 0.25° up or down; it may be partly occulted to sharpen the cut-off, which must not extend above H-H (${S} §5.4.3, p. 50).`,
    `A headlamp approved for a passing beam only may incorporate a driving beam not subject to requirements (${S} §5.4.2 and footnote 10, p. 50).`,
    `Total objective LED flux of the principal passing beam: ${flux} (${S} §4.5.3.2.4 Table 3 and §4.5.3.2.5 Table 4, p. 20).${cls === 'ES' ? '' : ` A filament source's reference flux at 13.2 V may not exceed ${cls === 'AS' || cls === 'BS' ? '900' : '2,000'} lm (§4.5.3.3, p. 21).`}`,
    `On failure of a mechanism, the lamp must automatically give a passing beam or a state with at most 1,200 cd in Zone 1 and at least 2,400 cd at 0.86D-V (${S} §4.11.3.1, p. 24; renumbered by Supplement 10 without the new number being printed).`,
    `Bend lighting by additional sources is allowed for categories L and T, with at most 900 cd from H-H to 15° up and from V-V to 10° towards the bank side at the minimum bank angle (${S} §5.4.5–5.4.5.3, pp. 52–53).`,
    ...(cls === 'BS' || cls === 'CS' || cls === 'DS' || cls === 'ES' ? [`Conformity of production: Zone I may deviate unfavourably by 255 cd (20 %) or 380 cd (30 %), other values by 20 %; realignment up to 0.5° laterally and 0.2° vertically (${S} Annex 2 §1.2.1.3–1.2.1.3.1, p. 66). The paragraph names "zone I", which the symmetric tables call Zone 1.`] : []),
  ];
}

/** @param {'AS' | 'BS'} cls @returns {HeadlampFunction} */
function passingASBS(cls) {
  const AS = cls === 'AS';
  const T = AS ? T33 : T34;
  const zone1 = [-5, 0, 5, 0, 5, 15, -5, 15];
  /** @type {Requirement[]} */
  const reqs = AS
    ? [
      { kind: 'zone', id: 'Zone 1', polygon: zone1, max: 320, cite: `${T}, "Any point in Zone 1": 0° to 15°U, 5°L to 5°R` },
      { kind: 'line', id: 'Line 25L to 25R', h0: -5, v0: -1.72, h1: 5, v1: -1.72, min: 1100, cite: `${T}, "Any point on line 25L to 25R": 1.72°D, 5°L to 5°R` },
      { kind: 'line', id: 'Line 12.5L to 12.5R', h0: -5, v0: -3.43, h1: 5, v1: -3.43, min: 550, cite: `${T}, "Any point on line 12.5L to 12.5R": 3.43°D, 5°L to 5°R` },
    ]
    : [
      { kind: 'zone', id: 'Zone 1', polygon: zone1, max: 700, cite: `${T}, "Any point in Zone 1": 0° to 15°U, 5°L to 5°R` },
      { kind: 'line', id: 'Line 50L to 50R', h0: -2.5, v0: -0.86, h1: 2.5, v1: -0.86, min: 1100, cite: `${T}, "Any point on line 50L to 50R except 50V": 0.86°D, 2.5°L to 2.5°R` },
      point('50V', 0, -0.86, { min: 2200 }, `${T}, "Point 50V": 0.86°D, 0`),
      { kind: 'line', id: 'Line 25L to 25R', h0: -5, v0: -1.72, h1: 5, v1: -1.72, min: 2200, cite: `${T}, "Any point on line 25L to 25R": 1.72°D, 5°L to 5°R` },
      { kind: 'zone', id: 'Zone 2', polygon: [-5, -0.86, 5, -0.86, 5, -1.72, -5, -1.72], min: 1100, group: 'beam', cite: `${T}, "Any point in Zone 2": 0.86°D to 1.72°D, 5°L to 5°R` },
    ];
  return {
    id: `passing-${cls}`,
    name: `Class ${cls} passing beam`,
    kind: 'headlamp',
    traffic: 'both',
    aim: AIM_SYMMETRIC,
    tolerance: { deg: 0.25, cite: `${T}, note *: "0.25° tolerance allowed independently at each test point for photometry unless indicated otherwise"` },
    requirements: reqs,
    notes: [
      `Symbol "C-${cls}" (${S} §5.4 title, p. 50); beam pattern Figure ${AS ? 'A4-VIII (p. 80)' : 'A4-IX (p. 81), titled for Class BS by Supplement 3 (ECE/TRANS/WP.29/2021/46, p. 3)'}.`,
      ...(AS ? [] : [`The 50L–50R line minimum (1,100 cd) excludes 50V, which has its own 2,200 cd minimum; checking the whole line against 1,100 cd is equivalent. Figure A4-IX draws a point "B50" at 0.57°U on V-V that Table 34 does not list; it carries no requirement.`]),
      ...symmetricNotes(cls),
    ],
  };
}

/** @param {'CS' | 'DS' | 'ES'} cls @returns {HeadlampFunction} */
function passingCSDSES(cls) {
  const i = cls === 'CS' ? 0 : cls === 'DS' ? 1 : 2;
  const col = /** @param {number[]} v */ v => v[i];
  const POS = 'with the front position lamp switched on if the applicant requests (Table 35 note **)';
  /** @type {Requirement[]} */
  const reqs = [
    point('1 (0.86D, 3.5R)', 3.5, -0.86, { min: col([2000, 2000, 2500]), max: 13750 }, `${T35}, No. 1`),
    point('2 (0.86D, V)', 0, -0.86, { min: col([2450, 4900, 4900]) }, `${T35}, No. 2`),
    point('3 (0.86D, 3.5L)', -3.5, -0.86, { min: col([2000, 2000, 2500]), max: 13750 }, `${T35}, No. 3`),
    point('4 (0.5U, 1.5L)', -1.5, 0.5, { max: 900 }, `${T35}, No. 4`, 'glare'),
    point('4 (0.5U, 1.5R)', 1.5, 0.5, { max: 900 }, `${T35}, No. 4`, 'glare'),
    point('5 (2D, 15L)', -15, -2, { min: col([550, 1100, 1100]) }, `${T35}, No. 5`),
    point('5 (2D, 15R)', 15, -2, { min: col([550, 1100, 1100]) }, `${T35}, No. 5`),
    point('6 (4D, 20L)', -20, -4, { min: col([150, 300, 600]) }, `${T35}, No. 6`),
    point('6 (4D, 20R)', 20, -4, { min: col([150, 300, 600]) }, `${T35}, No. 6`),
    point('7 (H-V)', 0, 0, { max: 1700 }, `${T35}, No. 7`, 'glare'),
    { kind: 'line', id: 'Line 1', h0: -9, v0: -2, h1: 9, v1: -2, min: col([1350, 1350, 1900]), cite: `${T35}, "Line 1": 2.00°D, 9°L to 9°R` },
    { kind: 'sum', id: '8 + 9 + 10', points: [-8, 4, 0, 4, 8, 4], min: 150, cite: `${T35}, Nos. 8–10 (4.00°U at 8.0°L, 0, 8.0°R), ${POS}` },
    point('8 (4U, 8L)', -8, 4, { max: 700 }, `${T35}, No. 8`, 'glare'),
    point('9 (4U, V)', 0, 4, { max: 700 }, `${T35}, No. 9`, 'glare'),
    point('10 (4U, 8R)', 8, 4, { max: 700 }, `${T35}, No. 10`, 'glare'),
    { kind: 'sum', id: '11 + 12 + 13', points: [-4, 2, 0, 2, 4, 2], min: 300, cite: `${T35}, Nos. 11–13 (2.00°U at 4.0°L, 0, 4.0°R), ${POS}` },
    point('11 (2U, 4L)', -4, 2, { max: 900 }, `${T35}, No. 11`, 'glare'),
    point('12 (2U, V)', 0, 2, { max: 900 }, `${T35}, No. 12`, 'glare'),
    point('13 (2U, 4R)', 4, 2, { max: 900 }, `${T35}, No. 13`, 'glare'),
    point('14 (H, 8L)', -8, 0, { min: 50 }, `${T35}, No. 14, ${POS}`, 'signs'),
    point('14 (H, 8R)', 8, 0, { min: 50 }, `${T35}, No. 14, ${POS}`, 'signs'),
    point('15 (H, 4L)', -4, 0, { min: 100, max: 900 }, `${T35}, No. 15, minimum ${POS}`, 'signs'),
    point('15 (H, 4R)', 4, 0, { min: 100, max: 900 }, `${T35}, No. 15, minimum ${POS}`, 'signs'),
    { kind: 'zone', id: 'Zone 1', polygon: ZONE_1_CS_DS_ES, max: 900, cite: `${T35}, "Zone 1"` },
    { kind: 'zone', id: 'Zone 2', polygon: [-8, 4, 8, 4, 8, 15, -8, 15], max: 700, cite: `${T35}, "Zone 2": >4U to <15U, 8°L to 8°R` },
    { kind: 'note', id: 'Even distribution', text: 'The light shall be as evenly distributed as possible within zones 1 and 2.', cite: `${S} §5.4.4.4 (p. 52)` },
  ];
  if (cls === 'ES') reqs.push({ kind: 'note', id: 'Run-up at point 2', when: ['gdl-ballast-separate'], text: 'Four seconds after ignition of a Class ES passing beam that has not been operated for 30 minutes or more, at least 3,750 cd at point 2 (0.86D-V), for headlamps with driving and passing beams or a passing beam only. The power supply must secure the rise of the high current pulse.', cite: `${SUP2} §5.4.4.3.1 (p. 2)` });
  return {
    id: `passing-${cls}`,
    name: `Class ${cls} passing beam`,
    kind: 'headlamp',
    traffic: 'both',
    aim: AIM_SYMMETRIC,
    tolerance: { deg: 0.25, cite: `${T35}, note *: "0.25° tolerance allowed independently at each test point for photometry unless indicated otherwise"` },
    requirements: reqs,
    notes: [
      `Symbol "WC-${cls}" (${S} §5.4 title, p. 50); beam pattern Figure A4-X (p. 82). Table 35 gives one maximum column for Classes CS, DS and ES.`,
      `Zone 2 is ">4U to <15U": its edges are open in the text; the polygon includes them. Points 8 to 10 on its lower edge carry their own 700 cd maxima.`,
      `Points 8 to 15: on request of the applicant, the front position lamp approved to UN R50, R7 or R148 (printed "[LSD]"), if combined, grouped or reciprocally incorporated, is switched on during these measurements (${T35}, note **).`,
      ...(cls === 'ES' ? [`Class ES uses one gas-discharge light source or LED sources or modules (${S} §5.4.4.5, p. 52). For Class ES the ballast terminal voltage is 13.2 V ± 0.1 V for 12 V systems or as otherwise specified (Notes before §5.4.4.1, p. 51).`] : []),
      ...symmetricNotes(cls),
    ],
  };
}

/** @type {HeadlampFunction[]} */
export const FUNCTIONS = [
  passingABD('A', 'C', 'Figure A4-V'),
  passingABD('B', 'HC', 'Figure A4-V'),
  passingABD('D', 'DC', 'Figure A4-VI'),
  drivingABD('A'),
  drivingABD('B'),
  drivingABD('D'),
  passingASBS('AS'),
  passingASBS('BS'),
  passingCSDSES('CS'),
  passingCSDSES('DS'),
  passingCSDSES('ES'),
  drivingSymmetric('BS'),
  drivingSymmetric('CS'),
  drivingSymmetric('DS'),
  drivingSymmetric('ES'),
];

/** Measurement and aiming rules of the 00 series, for comparison with RULES in ../r149.js. */
export const RULES = {
  /** Photoreceptor within a 65 mm square at least 25 m forward of the centre of reference: about 0.149° across. */
  receiverMm: 65,
  distanceM: 25,
  receiverDeg: (Math.atan(0.065 / 25) * 180) / Math.PI,
  receiverCite: `${S} Annex 4 §1.1.1 (p. 74)`,
  /** Asymmetric passing beams: horizontal part of the cut-off on line B, 0.57° (1 %) below H-H. Annex 5 §1.2.1 (p. 86) and §2.3.1 (p. 89). */
  lineB: -0.57,
  /** Vertical scans in steps of 0.05°; vertical aim and sharpness at 2.5° from V-V (drawn on the left for right-hand traffic, Figure A5-III, p. 90). */
  sharpnessScanH: -2.5,
  scanStep: 0.05,
  /** 0.13 ≤ G ≤ 0.40, G = log E(β) − log E(β + 0.1°). Annex 5 §2.2.2 (pp. 88–89). */
  sharpness: { min: 0.13, max: 0.4 },
  sharpnessCite: `${S} Annex 5 §2.2.2 (pp. 88–89)`,
  /** Inflection points at 1.5°, 2.5° and 3.5° from V-V within 0.2° vertically. Annex 5 §2.2.3 (p. 89). */
  linearity: { h: [-1.5, -2.5, -3.5], maxSpread: 0.2 },
  linearityCite: `${S} Annex 5 §2.2.3 (p. 89)`,
  /** Horizontal aim: (a) 0.2°D line from 5°L to 5°R, G ≥ 0.08, inflection on line A (0.5°R in Figures A5-I and A5-III); (b) three vertical scans 2°D to 2°U at 1°R, 2°R, 3°R, each G ≥ 0.08, line through the inflections meets line B on V-V. */
  horizontalAim: { threeLineH: [1, 2, 3], minG: 0.08, lineAH: 0.5, lineAV: -0.2 },
  horizontalAimCite: `${S} Annex 5 §2.3.2 (pp. 89–90); line A from Figures A5-I and A5-III (pp. 87, 90)`,
  /** Realignment after aiming, right-hand traffic: from line A 0.5° left or 0.75° right; 0.25° up or down from line B. */
  realign: { left: 0.5, right: 0.75, vertical: 0.25 },
  realignCite: `${S} Annex 5 §1.2.3 (pp. 87–88)`,
  /** Symmetric classes: cut-off on V-V at 0.57° below H-H; G ≥ 0.13 (BS) or 0.08 (AS, CS, DS, ES); linearity 0.2° (BS) or 0.3° (others) at 3°L and 3°R. */
  symmetric: { cutoffV: -0.57, minG: { BS: 0.13, other: 0.08 }, linearity: { BS: 0.2, other: 0.3 }, linearityH: 3 },
  symmetricCite: `${S} Annex 6 §3.2 (p. 93) and §4.1.2–4.1.3 (p. 94)`,
};

/** Requirements that apply across functions or that the per-function entries cannot carry. */
export const GENERAL = [
  { kind: 'note', id: 'AFS, front fog and cornering lamps', text: 'The 00 series also sets photometry for AFS (§5.3, Tables 9–32), Class F3 front fog lamps (§5.5, Table 36) and cornering lamps (§5.6). They are not transcribed here; see the research notes.', cite: `${S} §5.3, §5.5 and §5.6 (pp. 31–58)` },
  { kind: 'note', id: 'Colour', text: 'The colour of the light emitted shall be white for all headlamps.', cite: `${S} §4.16 (p. 25)` },
  { kind: 'note', id: 'Adjustable reflector', text: 'With an adjustable reflector, the requirements apply in each mounting position; after moving the reflector ±2° (or to its limit) and re-aiming the lamp, B50L and 75R (passing beam, Classes A, B, D), HV and 0.86D-V (Classes AS to ES) and IM and HV as a percentage of IM (driving beam) are checked again.', cite: `${S} §4.17–4.17.5 (p. 26)` },
];
