/** CMVSS 108 (Canada): what the Motor Vehicle Safety Regulations require of headlamp photometry, the UN Regulations
 * they accept instead, and where the Canadian text differs from FMVSS 108. Source and choices:
 * docs/research/fmvss108-cmvss108-headlamps-notes.md
 *
 * In short, as data: s. 108(1) of Schedule IV makes Technical Standards Document No. 108 the standard. TSD 108
 * Revision 8 reproduces FMVSS 108 as it read on 22 February 2022, with Canadian edits marked; its headlamp tables
 * (II-a to II-d, XVIII, XIX-a/b/c) are the same as the CFR's, so every FMVSS lower- and upper-beam value in
 * fmvss108-headlamps.js applies unchanged. No Canadian photometric value differs. */

export const SOURCE = {
  title: 'CMVSS 108, Lighting systems and reflective devices (Motor Vehicle Safety Regulations, C.R.C., c. 1038, '
    + 'Schedule IV, s. 108) and Technical Standards Document No. 108, Revision 8',
  document: 'MVSR C.R.C., c. 1038, Schedule IV, s. 108 (Justice Laws, current to 21 September 2026, last amended '
    + '1 January 2025); TSD 108 Revision 8, Lamps, Reflective Devices, and Associated Equipment (published and '
    + 'effective 1 April 2025, mandatory compliance 1 October 2025)',
  url: 'https://laws-lois.justice.gc.ca/eng/regulations/C.R.C.,_c._1038/FullText.html',
  tsdUrl: 'https://tc.canada.ca/sites/default/files/2025-05/108_tsd_rev_r8_en-web.pdf',
  retrieved: '2026-10-09',
};

const MVSR = 'MVSR C.R.C., c. 1038, Sch. IV, s. 108';
const TSD = 'TSD 108 Rev. 8';

/** What TSD 108 incorporates. */
export const BASIS = {
  text: 'Vehicles must conform to TSD 108 "as amended from time to time". TSD 108 Revision 8 is based on FMVSS 108 '
    + '(49 CFR 571.108) as it read on 22 February 2022. Underlined text is Canadian addition, struck text is deleted, '
    + 'and "[CONTENT NOT REPRODUCED]" marks omitted provisions. The FMVSS 108 text has had no change of substance '
    + 'since then (eCFR, current to 7 October 2026), so Revision 8 tracks the current US text.',
  fmvssAsOf: '2022-02-22',
  cite: `${MVSR}(1); ${TSD}, title page and Introduction (pp. i–iii); Change Log (p. 197)`,
};

/**
 * Alternatives to the TSD 108 headlamps. MVSR s. 108 names no series: each UN Regulation applies "as amended from
 * time to time". `via` marks a route that rests on another regulation's cross-reference, not on the MVSR's own words.
 * @typedef {{ regulation: string, series: string, functions: string[], vehicles: string[], conditions: string[],
 *   via?: string, cite: string }} Alternative
 * @type {Alternative[]}
 */
export const ALTERNATIVES = [
  { regulation: 'UN R8 (halogen headlamps: H1, H2, H3, HB3, HB4, H7, H8, H9, HIR1, HIR2, H11)', series: 'none named; as amended from time to time',
    functions: ['lower beam (passing beam)', 'upper beam (driving beam)'], vehicles: ['passenger car', 'MPV', 'truck', 'bus', 'three-wheeled vehicle'],
    conditions: ['108(5)(c)', '108(5)(d)', '108(8)'], cite: `${MVSR}(5)(a)(i), (5)(b)(i)` },
  { regulation: 'UN R20 (halogen H4 headlamps)', series: 'none named; as amended from time to time',
    functions: ['lower beam (passing beam)', 'upper beam (driving beam)'], vehicles: ['passenger car', 'MPV', 'truck', 'bus', 'three-wheeled vehicle'],
    conditions: ['108(5)(c)', '108(5)(d)', '108(8)'], cite: `${MVSR}(5)(a)(ii), (5)(b)(i)` },
  { regulation: 'UN R31 (halogen sealed-beam headlamps, HSB)', series: 'none named; as amended from time to time',
    functions: ['lower beam (passing beam)', 'upper beam (driving beam)'], vehicles: ['passenger car', 'MPV', 'truck', 'bus', 'three-wheeled vehicle (as if a passenger car)'],
    conditions: ['108(5)(c)', '108(5)(d)', '108(8)'], cite: `${MVSR}(5)(a)(iii), (5)(b)(ii)` },
  { regulation: 'UN R98 (gas-discharge headlamps)', series: 'none named; as amended from time to time',
    functions: ['lower beam (passing beam)', 'upper beam (driving beam)'], vehicles: ['passenger car', 'MPV', 'truck', 'bus', 'three-wheeled vehicle (as if a passenger car)'],
    conditions: ['108(5)(c)', '108(5)(d)', '108(8)'], cite: `${MVSR}(5)(a)(iv), (5)(b)(ii)` },
  { regulation: 'UN R112 (asymmetric passing beam and driving beam, filament or LED)', series: 'none named; as amended from time to time',
    functions: ['lower beam (passing beam)', 'upper beam (driving beam)'], vehicles: ['passenger car', 'MPV', 'truck', 'bus', 'three-wheeled vehicle'],
    conditions: ['108(5)(c)', '108(5)(d)', '108(8)'], cite: `${MVSR}(5)(a)(v), (5)(b)(i)` },
  { regulation: 'UN R123 (adaptive front-lighting systems, AFS)', series: 'none named; as amended from time to time',
    functions: ['lower beam (passing beam) classes', 'upper beam (driving beam)', 'adaptive driving beam', 'bending'],
    vehicles: ['passenger car', 'MPV', 'truck', 'bus', 'three-wheeled vehicle'],
    conditions: ['108(7)(a)(i)', '108(7)(a)(ii)', '108(7)(b)', '108(8)', '108(9)'], cite: `${MVSR}(6), (7), (9)` },
  { regulation: 'UN R149 (road illumination devices), latest version: 01 series at the time of writing',
    series: 'reached through Supplement 1 to the 02 series of R98 (§5.13), Supplement 1 to the 02 series of R112 (§5.12) '
      + 'and Supplement 1 to the 02 series of R123 (§5.16)',
    functions: ['lower beam (passing beam)', 'upper beam (driving beam)', 'AFS (through R123 §5.16)'],
    vehicles: ['as for the regulation it is reached through'],
    conditions: ['as for the regulation it is reached through'],
    via: 'The MVSR never names R149. R98 §5.13, R112 §5.12 and R123 §5.16, added in November 2019, read "Instead of '
      + 'requirements of this Regulation, headlamps may conform with requirements of the latest version of UN Regulation '
      + 'No. [149] as it relates to …". Because the MVSR applies R98, R112 and R123 "as amended from time to time", a '
      + 'headlamp meeting R149 appears to qualify. That is a reading of the cross-reference, not a provision of the MVSR, '
      + 'and Transport Canada has not been asked to confirm it. GRE adopted these paragraphs so that UN headlamps stay '
      + 'acceptable in Canada once R149 replaced R98/R112/R113/R123 (GRE/2018/32, as summarised by GlobalAutoRegs).',
    cite: `${MVSR}(5)(a)(iv)–(v), (6); ECE/TRANS/WP.29/2019/89 (R98 §5.13, p. 2), ECE/TRANS/WP.29/2019/90 (R112 §5.12, `
      + 'p. 2), ECE/TRANS/WP.29/2019/92 (R123 §5.16, p. 2); adopted by AC.1 at the 179th WP.29 session (12–14 November 2019), votes 37/0/0, 39/0/0 and '
      + '39/0/0 (ECE/TRANS/WP.29/1149, Annex table, p. 23)' },
  { regulation: 'SAE J3069, Adaptive Driving Beam (June 2016)', series: 'June 2016',
    functions: ['adaptive driving beam'], vehicles: ['passenger car', 'MPV', 'truck', 'bus', 'three-wheeled vehicle'],
    conditions: ['not activated or deactivated by pedal', '108(4): if formed by an upper or lower beam, that beam must also meet TSD 108, with horizontal aim adjustment allowed despite S10.18'],
    cite: `${MVSR}(3), (4)` },
  { regulation: 'UN R57 (motorcycle headlamps)', series: 'none named; as amended from time to time',
    functions: ['lower beam (passing beam)', 'upper beam (driving beam)'], vehicles: ['motorcycle'],
    conditions: ['installed per R53 §§5.7, 5.11, 5.13, 6.1, 6.2', 'TSD 108 S14.5 vibration, moisture, dust and corrosion tests', 'S14.4 plastic optical materials tests if not glass', '108(14)'],
    cite: `${MVSR}(13)(a)(ii), (13)(b)–(c), (14)` },
  { regulation: 'UN R72 (motorcycle headlamps, HS1)', series: 'none named; as amended from time to time',
    functions: ['lower beam (passing beam)', 'upper beam (driving beam)'], vehicles: ['motorcycle'],
    conditions: ['as for R57'], cite: `${MVSR}(13)(a)(iii), (13)(b)–(c), (14)` },
  { regulation: 'UN R113 (symmetric passing beam)', series: 'none named; as amended from time to time',
    functions: ['symmetric lower beam (passing beam)', 'upper beam (driving beam)'], vehicles: ['motorcycle'],
    conditions: ['as for R57'], cite: `${MVSR}(13)(a)(iv), (13)(b)–(c), (14)` },
  { regulation: 'Any headlamp allowed by s. 108(5) (R8, R20, R31, R98, R112)', series: 'as listed above',
    functions: ['lower beam (passing beam)', 'upper beam (driving beam)'], vehicles: ['motorcycle'],
    conditions: ['installed per R53 §§5.7, 5.11, 5.13, 6.1, 6.2', '108(14)'], cite: `${MVSR}(13)(a)(i), (13)(b), (14)` },
];

/**
 * Where Canada differs from FMVSS 108 for headlamps. `effect` says what a checker would have to do differently:
 * 'none' for wording only.
 * @typedef {{ id: string, topic: string, text: string, effect: 'photometry' | 'aiming' | 'installation' | 'activation' | 'procedure' | 'marking' | 'none',
 *   value?: Record<string, number>, cite: string }} Difference
 * @type {Difference[]}
 */
export const DIFFERENCES = [
  { id: 'photometry-identical', topic: 'Photometric values', effect: 'none',
    text: 'TSD 108 Tables II-a to II-d, XVIII and XIX-a/b/c are the same graphics as the CFR tables; every cell was compared '
      + 'and none differs. Aiming and measurement (S10.18.9, S14.2.5) are reproduced without change of substance.',
    cite: `${TSD}, Tables II-a–II-d (pp. 139–142), Table XVIII (p. 165), Tables XIX-a/b/c (pp. 166–168), S14.2.5 (pp. 85–88)` },
  { id: 'un-right-hand-only', topic: 'UN headlamps: traffic side', effect: 'installation',
    text: 'UN headlamps used under s. 108(5) must be installed to produce only a right-hand-traffic beam pattern; a mechanism '
      + 'that lets them produce a left-hand pattern must be inoperative. The same applies to R123 systems under s. 108(7).',
    cite: `${MVSR}(5)(c), (7)(a)(ii)` },
  { id: 'un-physical-tests', topic: 'UN headlamps: physical tests', effect: 'procedure',
    text: 'UN headlamps under s. 108(5) must also pass, as applicable, the physical tests of TSD 108 S10.13.4 (sealed beam), '
      + 'S10.14.7 (integral beam) and S10.15.7 (replaceable bulb).',
    cite: `${MVSR}(5)(d)` },
  { id: 'un-no-approval', topic: 'UN headlamps: type approval', effect: 'procedure',
    text: 'For UN headlamps the requirements on the type-approval process, approval marking, conformity of production, its '
      + 'penalties, and modification or extension of approval do not apply.',
    cite: `${MVSR}(8), (14)` },
  { id: 'afs-installation', topic: 'R123 AFS: installation', effect: 'installation',
    text: 'R123 systems must be installed per R48 §6.22, except that the automatic levelling device is mandatory in all '
      + 'cases despite R48 §6.22.6.2. R48 and R123 are treated as applying to three-wheeled vehicles.',
    cite: `${MVSR}(7)(a)(i), (9)` },
  { id: 'afs-high-mount', topic: 'R123 AFS mounted above 850 mm', effect: 'photometry',
    text: 'Above a mounting height of 850 mm (measured to the centre of the highest mounted lamp), the maximum intensity '
      + 'of an R123 system must not exceed the TSD 108 intensity requirements for upper beam headlamps. The text does '
      + 'not say which Table XVIII maximum (UB1–UB6) or which test point; the H-V maxima range from 15,000 to 75,000 cd.',
    value: { mountingHeightAbove: 850 }, cite: `${MVSR}(7)(b)` },
  { id: 'adb-horizontal-aim', topic: 'ADB to SAE J3069', effect: 'aiming',
    text: 'An SAE J3069 adaptive driving beam formed by all or part of an upper or lower beam must also meet TSD 108, but '
      + 'horizontal aim adjustment is allowed despite S10.18.',
    cite: `${MVSR}(4)` },
  { id: 'cutoff-side-free', topic: 'Visually aimed lower beam: cut-off side', effect: 'aiming',
    text: 'TSD 108 strikes the clause of S10.18.9.1 that fixes the cut-off side (left or right) for all replacement '
      + 'headlamps of a system once chosen. The cut-off must still be on the left or the right of the optical axis.',
    cite: `${TSD}, S10.18.9.1 (p. 76)` },
  { id: 'cutoff-illuminance', topic: 'Cut-off gradient wording', effect: 'none',
    text: 'In G = log E(a) − log E(a + 0.1), E is "illuminance" (FMVSS: "illumination"). The upper-beam test voltage reads '
      + '"12.8 V ±0.20 mV" (FMVSS: "12.8 ±0.20 mV"). Wording only.',
    cite: `${TSD}, S10.18.9.1.5.4 and S10.18.9.4.2 (p. 77)` },
  { id: 'vhad-metric', topic: 'VHAD and aiming pads in metric units', effect: 'none',
    text: 'Metric equivalents are added to the VHAD and aiming-pad rules, for example "[25 mm at 7.6 m]" beside "1 in at '
      + '25 ft" and 323 lux beside 30 foot-candles. The angular limits are unchanged.',
    cite: `${TSD}, S10.18.7.1.1–S10.18.8.1.2.4 (pp. 74–75)` },
  { id: 'markings', topic: 'Lens and light-source markings', effect: 'marking',
    text: 'TSD 108 strikes the "L"/"U" lens marking of four-lamp replaceable bulb headlamps (S10.15.4), the replaceable '
      + 'light source and ballast markings (S11.1, S11.2), and the motorcycle lens marking (S10.17.2), and does not '
      + 'reproduce S10.15.3 (replacement lens reflector units) or S13 (replaceable headlamp lenses). Marked text must '
      + 'be in English and French, except "sealed beam" and "motorcycle".',
    cite: `${TSD}, S10.15.3–S10.15.4 (p. 67), S10.17.2 (p. 70), S11.1–S11.2 (p. 78), S13 (p. 80); ${MVSR}(24)` },
  { id: 'upper-beam-activation', topic: 'Upper beam activation', effect: 'activation',
    text: 'Except for brief flashing, the upper beam may be activated only when the master light switch is at "headlamps '
      + 'on", or at "AUTO" when the conditions for automatic lower-beam activation exist.',
    cite: `${MVSR}(17)` },
  { id: 'auto-lower-beam', topic: 'Automatic lower beams', effect: 'activation',
    text: 'From 1 September 2021, if the listed instrument displays are lit while the daytime running lamps are on, either '
      + 'the lower beams switch on automatically within 2 s below 1,000 lux ambient light (vehicle moving, forward or '
      + 'reverse selected), or the tail lamps are lit.',
    value: { ambientLux: 1000, seconds: 2 }, cite: `${MVSR}(19), (20)` },
  { id: 'motorcycle-aim', topic: 'Motorcycles: aimability', effect: 'aiming',
    text: 'For motorcycles and motor tricycles, S10.18.1 applies with "both vertical and horizontal aim" read as "the '
      + 'vertical aim".',
    cite: `${MVSR}(10)(b), (11)(b)` },
  { id: 'terms', topic: 'Terms', effect: 'none',
    text: 'In the UN Regulations named, "dipped beam" and "passing beam" are read as "lower beam", and "driving beam" and '
      + '"main beam" as "upper beam".',
    cite: `${MVSR}(33)` },
];
