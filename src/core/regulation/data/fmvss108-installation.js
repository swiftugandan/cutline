/** FMVSS No. 108 (49 CFR 571.108): which lamps a vehicle must carry, and their number, colour, location, mounting
 * height, effective projected luminous lens area and visibility. Covers passenger cars and MPVs, trucks and buses
 * (Table I-a) in full, with trailers (Table I-b) and motorcycles (Table I-c) noted briefly. Source and choices:
 * docs/research/fmvss108-signal-installation-notes.md
 *
 * Text: the eCFR (49 CFR 571.108 as in force on 2026-10-01; text last amended at 87 FR 10021, 22 February 2022),
 * checked against the annual edition, 49 CFR Chapter V (10-1-25 Edition); "p." is the page printed in that edition.
 *
 * In FMVSS 108 the number, colour, location and mounting height of every lamp are in Table I (a, b, c). Table II
 * lists headlighting systems (sealed beam, combination, integral beam, replaceable bulb) and is not about placement.
 *
 * Units: the CFR gives most heights in inches. Each `text` quotes the CFR; the millimetre values are converted at
 * 25.4 mm per inch exactly. Angles in degrees. Visibility angles name directions as the CFR does: IB (inboard, toward
 * the vehicle's longitudinal centerline) and OB (outboard). */

/**
 * @typedef {'mandatory' | 'optional' | 'not required' | string} Presence
 * @typedef {{
 *   id: string,
 *   name: string,
 *   table: string,
 *   presence: Record<string, Presence> & { cite: string },
 *   count?: { text: string, min?: number, max?: number, cite: string },
 *   colour?: { text: string, cite: string },
 *   arrangement?: { text: string, cite: string },
 *   width?: { minCentreSeparation?: number, maxCentreSeparation?: number, text: string, cite: string },
 *   height?: { min?: number, max?: number, measuredTo: string, text: string, cite: string },
 *   lensArea?: { singleCompartment?: number, multipleEach?: number, multipleCombined?: number, wideEach?: number, motorcycleEach?: number, motorcycleSingleOrCombined?: number, dualEach?: number, single?: number, each?: number, text: string, cite: string },
 *   visibility?: { up?: number, down?: number, outward?: number, inward?: number, left?: number, right?: number, unobstructedAreaMm2?: number, text: string, cite: string },
 *   visibilityIntensity?: { up: number, down: number, outward: number, inward: number, minCd: number, text: string, cite: string },
 *   activation?: { text: string, cite: string },
 *   notes: string[],
 * }} Device
 */

export const SOURCE = {
  title: 'FMVSS No. 108, Lamps, reflective devices, and associated equipment (49 CFR 571.108): installation',
  document: '49 CFR 571.108 as in force on 2026-10-01 (eCFR; the text is unchanged since 87 FR 10021, 22 February 2022, the last amendment in the source note of the section; the eCFR version dated 2023-12-05 changes table markup only); pages from 49 CFR Chapter V (10-1-25 Edition)',
  url: 'https://www.ecfr.gov/api/versioner/v1/full/2026-10-01/title-49.xml?part=571&section=571.108',
  annualEdition: 'https://www.govinfo.gov/content/pkg/CFR-2025-title49-vol6/pdf/CFR-2025-title49-vol6-sec571-108.pdf',
  retrieved: '2026-10-09',
};

const CFR = '49 CFR 571.108 (10-1-25 ed.)';
/** @param {string} where @param {string | number} page */
const c = (where, page) => `${CFR}, ${where} (p. ${page})`;
/** Inches to millimetres, exact. @param {number} inches */
const mm = inches => Math.round(inches * 254) / 10;

/** The vehicle groups Table I-a names, used as keys of `presence`. */
export const VEHICLE_TYPES = [
  { key: 'passengerCar', name: 'Passenger car', cite: c('Table I-a', '450–453') },
  { key: 'mpvTruckBusNarrow', name: 'Multipurpose passenger vehicle (MPV), truck or bus less than 2032 mm in overall width', cite: c('Table I-a', '450–453') },
  { key: 'mpvTruckBusWide', name: 'Multipurpose passenger vehicle (MPV), truck or bus 2032 mm or more in overall width', cite: c('Table I-a', '450–453') },
  { key: 'trailer', name: 'Trailer (Table I-b; noted briefly)', cite: c('Table I-b', '454–456') },
  { key: 'motorcycle', name: 'Motorcycle (Table I-c; noted briefly)', cite: c('Table I-c', '456–458') },
];

const MEASURED_TO = 'The center of the item, as mounted on the vehicle at curb weight, to the road surface (S6.1.4, p. 396).';
const SYMMETRIC = 'at the same height, symmetrically about the vertical centerline, as far apart as practicable';
const T1A_450 = c('Table I-a', 450);
const T1A_451 = c('Table I-a', 451);
const T1A_452 = c('Table I-a', 452);
const T1A_453 = c('Table I-a', 453);
const T1B = c('Table I-b', '454–456');
const T1C = c('Table I-c', '456–458');
const IVA = c('Table IV-a', 462);
const VA = c('Table V-a', 462);
const VB = c('Table V-b and S6.4.3(a)', '397, 463');
const VC = c('Table V-c and S6.4.3(b)', '397, 463–464');
const VD = c('Table V-d and S6.4.4', '397, 464');

/** Where the 750 mm footnote and the one-option rule of S6.4.3 apply to the visibility options. */
const VIS_NOTES = [
  `The manufacturer certifies each lamp function to one option, lens area (Table V-b) or luminous intensity (Table V-c), and may not later choose the other for that vehicle. ${c('S6.4.3', 397)}.`,
  `Where a lamp is mounted with its axis of reference less than 750 mm above the road surface, the downward corner points may be reduced to 5° down. ${c('Tables V-b and V-c, footnote 2', '463–464')}.`,
  `Legacy alternative (Table V-d), for passenger cars and motorcycles and for MPVs, trucks, trailers and buses under 2032 mm wide made on or before 1 September 2011, and for those 2032 mm or more wide made on or before 1 September 2014: turn signal lamps 1250 mm² unobstructed from H-V to H-45° OB (1300 mm² on vehicles 2032 mm or more wide); stop lamps 1250 mm² from H-45° IB to H-45° OB; taillamps 2 sq in from H-45° IB to H-45° OB. ${VD}.`,
  `Each lamp must meet its photometry, lens area and visibility requirements "with all obstructions considered". ${c('S6.1.3.1', 395)}.`,
];

/** Rules that apply to every lamp. */
export const GENERAL = [
  { rule: 'Mounting', text: 'Each lamp, reflective device and item of associated equipment must be securely mounted on a rigid part of the vehicle, other than glazing, that is not designed to be removed except for repair, within the location and height limits of Table I, where it meets all photometric, lens area and visibility requirements with all obstructions considered.', cite: c('S6.1.3.1', 395) },
  { rule: 'Non-fixed parts', text: 'When multiple lamp arrangements for rear turn signal lamps, stop lamps or taillamps are used with only part of them on a fixed part of the vehicle, those on the non-fixed part are auxiliary lamps.', cite: c('S6.1.3.2', 395) },
  { rule: 'Mounting height', text: MEASURED_TO, cite: c('S6.1.4', 396) },
  { rule: 'Colour', text: 'Colours are as specified in Table I. Amber is identical to yellow.', cite: c('S6.1.2', 395) },
  { rule: 'Obstruction', text: 'If a required lamp is obstructed by equipment (mirrors, snow plows, wrecker booms and the like, including dealer-installed equipment) and cannot meet photometry and visibility, the vehicle must carry an additional lamp of the same type that does.', cite: c('S6.2.2', 396) },
  { rule: 'Impairment', text: 'No additional lamp, reflective device or other equipment may be installed that impairs the effectiveness of required lighting equipment.', cite: c('S6.2.1', 396) },
  { rule: 'Combinations', text: 'Two or more lamps may be combined if each meets its requirements, except: no high-mounted stop lamp may be combined with any other lamp or reflective device other than a cargo lamp (S6.3.1), and never optically combined with a cargo lamp (S6.3.2); no clearance lamp may be optically combined with a taillamp (S6.3.3).', cite: c('S6.3 to S6.3.3', 396) },
  { rule: 'Auxiliary lamps near identification lamps', text: 'Each auxiliary lamp must be at least twice as far from any required identification lamp as the distance between two adjacent required identification lamps.', cite: c('S6.1.3.6', 396) },
  { rule: 'Hazard warning', text: 'The hazard warning signal must flash simultaneously enough turn signal lamps to meet, as a minimum, the turn signal photometric requirements.', cite: c('S6.1.5.1', 396) },
];

const ALL_A = { passengerCar: 'mandatory', mpvTruckBusNarrow: 'mandatory', mpvTruckBusWide: 'mandatory' };

/** @type {Device[]} */
export const DEVICES = [
  {
    id: 'lower-beam-headlamp',
    name: 'Lower beam headlamp',
    table: 'Table I-a',
    presence: { ...ALL_A, trailer: 'not required', motorcycle: 'mandatory (Table I-c, S10.17)', cite: `${T1A_450}; ${T1C}` },
    colour: { text: 'White, of a headlighting system listed in Table II.', cite: T1A_450 },
    arrangement: { text: `On the front, ${SYMMETRIC}.`, cite: T1A_450 },
    height: { min: 559, max: 1372, measuredTo: MEASURED_TO, text: 'Not less than 55.9 cm nor more than 137.2 cm.', cite: T1A_450 },
    activation: { text: 'Only the light sources intended for the lower beam are energised in the lower beam position, except certain Table II systems and semiautomatic beam switching devices certified to S9.4.1.6. Steady burning, except that it may be flashed for signalling, or vary in intensity for adaptive driving beam functionality.', cite: T1A_450 },
    notes: [
      `With multiple single-source headlamps mounted vertically the lower beam comes from the uppermost headlamp; horizontally, from the most outboard. With two light sources in one headlamp, from the uppermost or outboard source, or from all sources. ${c('S6.1.3.5', '395–396')}.`,
      `Headlamp photometry and aim are outside this file.`,
    ],
  },
  {
    id: 'upper-beam-headlamp',
    name: 'Upper beam headlamp',
    table: 'Table I-a',
    presence: { ...ALL_A, trailer: 'not required', motorcycle: 'mandatory (Table I-c, S10.17)', cite: `${T1A_450}; ${T1C}` },
    colour: { text: 'White, of a headlighting system listed in Table II.', cite: T1A_450 },
    arrangement: { text: `On the front, ${SYMMETRIC}.`, cite: T1A_450 },
    height: { min: 559, max: 1372, measuredTo: MEASURED_TO, text: 'Not less than 22 inches (55.9 cm) nor more than 54 inches (137.2 cm).', cite: T1A_450 },
    notes: ['Headlamp photometry and aim are outside this file.'],
  },
  {
    id: 'front-turn-signal-lamp',
    name: 'Front turn signal lamp',
    table: 'Table I-a',
    presence: { ...ALL_A, trailer: 'not required', motorcycle: 'mandatory (none on a motor driven cycle whose speed attainable in 1 mile is 30 mph or less)', cite: `${T1A_450}; ${T1C}` },
    count: { text: '2', min: 2, max: 2, cite: T1A_450 },
    colour: { text: 'Amber.', cite: T1A_450 },
    arrangement: { text: `At or near the front, ${SYMMETRIC}.`, cite: T1A_450 },
    width: { text: 'No distance from the outer edge is set; "as far apart as practicable". The spacing to the lower beam headlamp, auxiliary lower beam or fog lamp, and to a DRL, sets the photometric multiplier (S7.1.1.10, S7.10.10.1). On a motorcycle: lamp centrelines at least 16 inches (406.4 mm) apart, and at least 4 inches (101.6 mm) edge to edge from the headlamp.', cite: `${c('S7.1.1.10', '399–400')}; ${c('S7.10.10.1', 406)}; ${T1C}` },
    height: { min: mm(15), max: mm(83), measuredTo: MEASURED_TO, text: 'Not less than 15 inches, nor more than 83 inches.', cite: T1A_450 },
    lensArea: { singleCompartment: 2200, multipleCombined: 2200, wideEach: 7500, motorcycleEach: 2200, motorcycleSingleOrCombined: 2258, text: 'Minimum effective projected luminous lens area, mm²: vehicles under 2032 mm wide, single compartment lamp 2200, multiple compartment lamp or multiple lamps combined 2200 (no value for each compartment); MPVs, trucks, trailers and buses 2032 mm or more wide, 7500 each lamp; motorcycles, 2200 each compartment or lamp, 2258 single or combined.', cite: `${IVA}; ${c('S6.4.1', 397)}` },
    visibility: { up: 15, down: 15, inward: 45, outward: 45, unobstructedAreaMm2: 1250, text: 'Lens area option, all vehicles other than motorcycles: unobstructed effective projected luminous lens area of at least 1250 mm² in any direction throughout the pattern with corners 15° up and 15° down, 45° IB and 45° OB. Motorcycles: 20° IB to 45° OB.', cite: VB },
    visibilityIntensity: { up: 15, down: 15, inward: 45, outward: 80, minCd: 0.3, text: 'Luminous intensity option, all vehicles other than motorcycles: at least 0.3 cd in any direction throughout the pattern with corners 15° up and 15° down, 45° IB and 80° OB. Motorcycles: 20° IB to 80° OB.', cite: VC },
    activation: { text: 'Flash when the turn signal flasher is actuated by the turn signal operating unit.', cite: T1A_450 },
    notes: [
      `Where more than one lamp or optical area is lighted at the front on each side of an MPV, truck, trailer or bus 2032 mm or more wide, only one such area need meet the lens area visibility option. ${c('Table V-b, footnote 3', 463)}.`,
      ...VIS_NOTES,
    ],
  },
  {
    id: 'rear-turn-signal-lamp',
    name: 'Rear turn signal lamp',
    table: 'Table I-a',
    presence: { ...ALL_A, trailer: 'mandatory (2 red or amber)', motorcycle: 'mandatory (none on a motor driven cycle whose speed attainable in 1 mile is 30 mph or less)', cite: `${T1A_450}; ${T1B}; ${T1C}` },
    count: { text: '2. A truck tractor need not have rear turn signal lamps if the front ones are double-faced and meet Table VII footnote 6 (S6.1.1.3).', min: 2, max: 2, cite: `${T1A_450}; ${c('S6.1.1.3', 395)}` },
    colour: { text: 'Amber or red.', cite: T1A_450 },
    arrangement: { text: `On the rear, ${SYMMETRIC}.`, cite: T1A_450 },
    width: { text: 'No distance from the outer edge is set; "as far apart as practicable". On a motorcycle: lamp centrelines at least 9 inches (228.6 mm) apart, and at least 4 inches (101.6 mm) edge to edge from a single stop and taillamp on the vertical centreline when the turn signal lamps are red.', cite: `${T1A_450}; ${T1C}` },
    height: { min: mm(15), max: mm(83), measuredTo: MEASURED_TO, text: 'Not less than 15 inches, nor more than 83 inches (the front and rear turn signal rows share one height cell in Table I-a; Table I-b states the same limits for trailers).', cite: `${T1A_450}; ${T1B}` },
    lensArea: { singleCompartment: 5000, multipleEach: 2200, multipleCombined: 5000, wideEach: 7500, motorcycleEach: 2200, motorcycleSingleOrCombined: 2258, text: 'Minimum effective projected luminous lens area, mm²: vehicles under 2032 mm wide, single compartment lamp 5000, multiple compartment lamp or multiple lamps 2200 each and 5000 combined; vehicles 2032 mm or more wide, 7500 each lamp; motorcycles, 2200 each, 2258 single or combined.', cite: `${IVA}; ${c('S6.4.1', 397)}` },
    visibility: { up: 15, down: 15, inward: 45, outward: 45, unobstructedAreaMm2: 1250, text: 'Lens area option, all vehicles other than motorcycles: at least 1250 mm² unobstructed throughout 15° up to 15° down, 45° IB to 45° OB. Motorcycles: 20° IB to 45° OB.', cite: VB },
    visibilityIntensity: { up: 15, down: 15, inward: 45, outward: 80, minCd: 0.3, text: 'Luminous intensity option, all vehicles other than motorcycles: at least 0.3 cd throughout 15° up to 15° down, 45° IB to 80° OB. Motorcycles: 20° IB to 80° OB.', cite: VC },
    activation: { text: 'Flash when the turn signal flasher is actuated by the turn signal operating unit.', cite: T1A_450 },
    notes: [
      `The flashing signal of a double-faced lamp must not be obliterated by external light from in front or behind at any angle. ${c('S6.1.1.3.1', 395)}.`,
      ...VIS_NOTES,
    ],
  },
  {
    id: 'taillamp',
    name: 'Taillamp',
    table: 'Table I-a',
    presence: { ...ALL_A, trailer: 'mandatory (2 red, or 1 red on trailers less than 30 inches wide)', motorcycle: 'mandatory (1 red)', cite: `${T1A_450}; ${T1B}; ${T1C}` },
    count: { text: '2', min: 2, max: 2, cite: T1A_450 },
    colour: { text: 'Red.', cite: T1A_450 },
    arrangement: { text: `On the rear, ${SYMMETRIC}.`, cite: T1A_450 },
    height: { min: mm(15), max: mm(72), measuredTo: MEASURED_TO, text: 'Not less than 15 inches, nor more than 72 inches.', cite: T1A_450 },
    visibility: { up: 15, down: 15, inward: 45, outward: 45, unobstructedAreaMm2: 1250, text: 'Lens area option, all vehicles other than motorcycles: at least 1250 mm² unobstructed throughout 15° up to 15° down, 45° IB to 45° OB. Motorcycles: 45° right to 45° left (each lamp of a multiple arrangement 45° inboard).', cite: VB },
    visibilityIntensity: { up: 15, down: 15, inward: 45, outward: 80, minCd: 0.05, text: 'Luminous intensity option, all vehicles other than motorcycles: at least 0.05 cd throughout 15° up to 15° down, 45° IB to 80° OB. Motorcycles: 80° right to 80° left; 80° both ways for a single taillamp; 45° inboard for each lamp of a multiple arrangement.', cite: VC },
    activation: { text: 'Steady burning. Must be activated when the headlamps are activated in a steady burning state or the parking lamps on passenger cars and MPVs, trucks, and buses less than 80 inches in overall width are activated. May be activated when the headlamps are activated at less than full intensity as DRLs.', cite: T1A_450 },
    notes: [
      `No effective projected luminous lens area requirement. ${c('S7.2.6', 402)}.`,
      `A clearance lamp may not be optically combined with a taillamp. ${c('S6.3.3', 396)}.`,
      ...VIS_NOTES,
    ],
  },
  {
    id: 'stop-lamp',
    name: 'Stop lamp',
    table: 'Table I-a',
    presence: { ...ALL_A, trailer: 'mandatory (2 red, or 1 red on trailers less than 30 inches wide)', motorcycle: 'mandatory (1 red)', cite: `${T1A_450}; ${T1B}; ${T1C}` },
    count: { text: '2', min: 2, max: 2, cite: T1A_450 },
    colour: { text: 'Red.', cite: T1A_450 },
    arrangement: { text: `On the rear, ${SYMMETRIC}.`, cite: T1A_450 },
    height: { min: mm(15), max: mm(72), measuredTo: MEASURED_TO, text: 'Not less than 15 inches, nor more than 72 inches.', cite: T1A_450 },
    lensArea: { singleCompartment: 5000, multipleEach: 2200, multipleCombined: 5000, wideEach: 7500, motorcycleEach: 2200, motorcycleSingleOrCombined: 5000, text: 'Minimum effective projected luminous lens area, mm²: vehicles under 2032 mm wide, single compartment lamp 5000, multiple compartment lamp or multiple lamps 2200 each and 5000 combined; vehicles 2032 mm or more wide, 7500 each lamp; motorcycles, 2200 each, 5000 single or combined (2258 on a motor driven cycle whose speed attainable in 1 mile is 30 mph or less).', cite: `${IVA}, and footnote 1; ${c('S6.4.1', 397)}` },
    visibility: { up: 15, down: 15, inward: 45, outward: 45, unobstructedAreaMm2: 1250, text: 'Lens area option, all vehicles other than motorcycles: at least 1250 mm² unobstructed throughout 15° up to 15° down, 45° IB to 45° OB. Motorcycles: 45° right to 45° left (each lamp of a multiple arrangement 10° inboard).', cite: VB },
    visibilityIntensity: { up: 15, down: 15, inward: 45, outward: 45, minCd: 0.3, text: 'Luminous intensity option, all vehicles other than motorcycles: at least 0.3 cd throughout 15° up to 15° down, 45° IB to 45° OB. Motorcycles: 45° right to 45° left (each lamp of a multiple arrangement 10° inboard).', cite: VC },
    activation: { text: 'Steady burning. Must be activated upon application of the service brakes. When optically combined with a turn signal lamp, the stop signal cannot be activated while the turn signal lamp is flashing. May also be activated by a device designed to retard the motion of the vehicle.', cite: T1A_450 },
    notes: VIS_NOTES,
  },
  {
    id: 'high-mounted-stop-lamp',
    name: 'High-mounted stop lamp',
    table: 'Table I-a',
    presence: { passengerCar: 'mandatory', mpvTruckBusNarrow: 'mandatory if GVWR is 10,000 lb or less', mpvTruckBusWide: 'not required', trailer: 'not required', motorcycle: 'not required', cite: T1A_451 },
    count: { text: '1, or 2 where the exception of S6.1.1.2 applies: an MPV, truck or bus whose rear vertical centerline separates one or two moveable body sections (such as doors) with too little space for a single lamp on the centerline above them must have two lamps identical in size and shape, at the same height, each with one vertical edge on the edge of the body section nearest the centerline.', min: 1, max: 2, cite: `${T1A_451}; ${c('S6.1.1.2 and S6.1.1.2.1', '394–395')}` },
    colour: { text: 'Red.', cite: T1A_451 },
    arrangement: { text: 'On the rear including glazing, with the lamp center on the vertical centerline as viewed from the rear.', cite: T1A_451 },
    height: { min: mm(34), measuredTo: MEASURED_TO, text: 'Not less than 34 inches except for passenger cars. On a passenger car, a lamp mounted below the rear window must have no lens portion lower than 153 mm [6 in] below the lower edge of the rear glazing on convertibles, or 77 mm [3 in] on other passenger cars.', cite: `${T1A_451}; ${c('S6.1.4.1.1', 396)}` },
    lensArea: { single: 2903, dualEach: 1452, text: 'Minimum effective projected luminous lens area, mm²: 2903 for a single lamp; 1452 each for dual lamps of identical size and shape (MPVs, trucks and buses under 2032 mm wide with GVWR of 10,000 lb or less).', cite: `${c('Table IV-b', 462)}; ${c('S6.4.1', 397)}` },
    visibility: { left: 45, right: 45, text: 'Signal must be visible to the rear through a horizontal angle from 45° to the left to 45° to the right of the longitudinal axis of the vehicle (single lamp, or two lamps together where S6.1.1.2 requires them).', cite: `${VA}; ${c('S6.4.2', 397)}` },
    activation: { text: 'Steady burning. Must only be activated upon application of the service brakes, or may be activated by a device designed to retard the motion of the vehicle.', cite: T1A_451 },
    notes: [
      `A lamp mounted inside the vehicle must have means to minimise reflections on the rear window glazing visible to the driver directly or in the rearview mirror. ${c('S6.1.3.4.1', 395)}.`,
      `Bulbs must be replaceable without special tools. ${c('S6.1.3.4.2', 395)}.`,
      `It may be combined only with a cargo lamp, and never optically combined with it. ${c('S6.3.1 and S6.3.2', 396)}.`,
    ],
  },
  {
    id: 'parking-lamp',
    name: 'Parking lamp',
    table: 'Table I-a',
    presence: { passengerCar: 'mandatory', mpvTruckBusNarrow: 'mandatory', mpvTruckBusWide: 'not required', trailer: 'not required', motorcycle: 'not required', cite: T1A_451 },
    count: { text: '2', min: 2, max: 2, cite: T1A_451 },
    colour: { text: 'Amber or white.', cite: T1A_451 },
    arrangement: { text: `On the front, ${SYMMETRIC}.`, cite: T1A_451 },
    height: { min: mm(15), max: mm(72), measuredTo: MEASURED_TO, text: 'Not less than 15 inches, nor more than 72 inches.', cite: T1A_451 },
    visibility: { up: 15, down: 15, inward: 45, outward: 45, unobstructedAreaMm2: 1250, text: 'Lens area option: at least 1250 mm² unobstructed throughout 15° up to 15° down, 45° IB to 45° OB. No requirement for motorcycles.', cite: VB },
    visibilityIntensity: { up: 15, down: 15, inward: 45, outward: 80, minCd: 0.05, text: 'Luminous intensity option: at least 0.05 cd throughout 15° up to 15° down, 45° IB to 80° OB. No requirement for motorcycles.', cite: VC },
    activation: { text: 'Steady burning. Must be activated when the headlamps are activated in a steady burning state.', cite: T1A_451 },
    notes: VIS_NOTES,
  },
  {
    id: 'side-marker-lamp-front',
    name: 'Front side marker lamp',
    table: 'Table I-a',
    presence: { ...ALL_A, trailer: 'mandatory (none on trailers less than 1829 mm [6 ft] long including the tongue)', motorcycle: 'not required', cite: `${T1A_451}; ${T1B}` },
    count: { text: '2 (one each side)', min: 2, max: 2, cite: T1A_451 },
    colour: { text: 'Amber.', cite: T1A_451 },
    arrangement: { text: 'On each side as far to the front as practicable.', cite: T1A_451 },
    height: { min: mm(15), measuredTo: MEASURED_TO, text: 'Not less than 15 inches.', cite: T1A_451 },
    activation: { text: 'Steady burning except may be flashed for signaling purposes. Must be activated when the headlamps are activated in a steady burning state or the parking lamps on passenger cars and MPVs, trucks, and buses less than 80 inches in overall width are activated.', cite: T1A_451 },
    notes: [`No lens area or visibility requirement. ${c('S7.4.6 and S7.4.7', 404)}.`],
  },
  {
    id: 'side-marker-lamp-rear',
    name: 'Rear side marker lamp',
    table: 'Table I-a',
    presence: { passengerCar: 'mandatory', mpvTruckBusNarrow: 'mandatory (not required on a truck tractor)', mpvTruckBusWide: 'mandatory (not required on a truck tractor)', trailer: 'mandatory', motorcycle: 'not required', cite: `${T1A_451}; ${T1B}` },
    count: { text: '2 (one each side)', min: 2, max: 2, cite: T1A_451 },
    colour: { text: 'Red.', cite: T1A_451 },
    arrangement: { text: 'On each side as far to the rear as practicable.', cite: T1A_451 },
    height: { min: mm(15), measuredTo: MEASURED_TO, text: 'Not less than 15 inches (the front and rear side marker rows share one height cell in Table I-a). On trailers 2032 mm or more wide also not more than 60 inches (Table I-b).', cite: `${T1A_451}; ${T1B}` },
    activation: { text: 'As for the front side marker lamp.', cite: T1A_451 },
    notes: [`No lens area or visibility requirement. ${c('S7.4.6 and S7.4.7', 404)}.`],
  },
  {
    id: 'intermediate-side-marker-lamp',
    name: 'Intermediate side marker lamp',
    table: 'Table I-a',
    presence: { passengerCar: 'mandatory if 30 feet or longer', mpvTruckBusNarrow: 'mandatory if 30 feet or longer', mpvTruckBusWide: 'mandatory if 30 feet or longer', trailer: 'mandatory if 30 feet or longer', motorcycle: 'not required', cite: `${T1A_452}; ${T1B}` },
    count: { text: '2 (one each side)', min: 2, max: 2, cite: T1A_452 },
    colour: { text: 'Amber.', cite: T1A_452 },
    arrangement: { text: 'On each side located at or near the midpoint between the front and rear side marker lamps.', cite: T1A_452 },
    height: { min: mm(15), measuredTo: MEASURED_TO, text: 'Not less than 15 inches.', cite: T1A_452 },
    activation: { text: 'Steady burning except may be flashed for signaling purposes; activated with the headlamps or parking lamps as for side marker lamps.', cite: T1A_452 },
    notes: [],
  },
  {
    id: 'reflex-reflectors',
    name: 'Reflex reflectors',
    table: 'Table I-a',
    presence: { ...ALL_A, trailer: 'mandatory (may be replaced by conspicuity treatment at the same locations)', motorcycle: 'mandatory', cite: `${T1A_451}; ${T1B}; ${T1C}` },
    count: { text: '2 amber, one each side as far to the front as practicable; 2 red, one each side as far to the rear as practicable (not required on a truck tractor); 2 red on the rear.', cite: T1A_451 },
    colour: { text: 'Amber at the front of each side; red at the rear of each side and on the rear.', cite: T1A_451 },
    arrangement: { text: `Side reflectors as far to the front or rear as practicable. Rear reflectors on the rear, ${SYMMETRIC}; on a truck tractor they may be mounted on the back of the cab not less than 4 inches above the height of the rear tires.`, cite: T1A_451 },
    height: { min: mm(15), max: mm(60), measuredTo: MEASURED_TO, text: 'Not less than 15 inches, nor more than 60 inches.', cite: T1A_451 },
    notes: [`Vehicles 30 feet or longer also need 2 amber intermediate side reflex reflectors at or near the midpoint between the front and rear side reflectors, 15 to 60 inches high. ${T1A_452}.`, 'Reflector photometry is outside this file.'],
  },
  {
    id: 'backup-lamp',
    name: 'Backup lamp',
    table: 'Table I-a',
    presence: { ...ALL_A, trailer: 'not required', motorcycle: 'not required', cite: T1A_451 },
    count: { text: '1, additional lamps permitted to meet requirements', min: 1, cite: `${T1A_451}; ${c('S6.1.1', 394)}` },
    colour: { text: 'White. A backup lamp may project incidental red, yellow or white light through adjacent reflectors or lenses (S7.6.2.2).', cite: `${T1A_451}; ${c('S7.6.2.2', 405)}` },
    arrangement: { text: 'On the rear.', cite: T1A_451 },
    height: { measuredTo: MEASURED_TO, text: 'No requirement.', cite: T1A_451 },
    visibility: { text: 'The optical center of at least one lamp must be visible from any eye point elevation from 1828 mm (6 ft) to 610 mm (2 ft) above the horizontal plane on which the vehicle stands, and from any position in the area rearward of a vertical plane perpendicular to the longitudinal axis 914 mm (3 ft) to the rear of the vehicle and extending 914 mm (3 ft) beyond each side of the vehicle.', cite: `${VA}; ${c('S6.4.2', 397)}` },
    activation: { text: 'Steady burning. Must be activated when the ignition switch is energized and reverse gear is engaged. Must not be energized when the vehicle is in forward motion.', cite: T1A_451 },
    notes: [],
  },
  {
    id: 'licence-plate-lamp',
    name: 'Licence plate lamp',
    table: 'Table I-a',
    presence: { ...ALL_A, trailer: 'mandatory', motorcycle: 'mandatory', cite: `${T1A_451}; ${T1B}; ${T1C}` },
    count: { text: '1, additional lamps permitted to meet requirements', min: 1, cite: T1A_451 },
    colour: { text: 'White.', cite: T1A_451 },
    arrangement: { text: 'On the rear to illuminate the license plate from top or sides, without obstruction from any designed feature unless the lamp meets its photometry with those obstructions considered (S6.1.3.3).', cite: `${T1A_451}; ${c('S6.1.3.3', 395)}` },
    height: { measuredTo: MEASURED_TO, text: 'No requirement.', cite: T1A_451 },
    activation: { text: 'Steady burning. Must be activated when the headlamps are activated in a steady burning state or when the parking lamps on passenger cars and MPVs, trucks, and buses less than 80 inches in overall width are activated.', cite: T1A_451 },
    notes: ['The CFR spells it "license plate lamp". Its photometry is illuminance on a test plate (S7.7.13, S14.2.2) and is outside this file.'],
  },
  {
    id: 'clearance-lamp-front',
    name: 'Front clearance lamp',
    table: 'Table I-a',
    presence: { passengerCar: 'not required', mpvTruckBusNarrow: 'not required', mpvTruckBusWide: 'mandatory', trailer: 'mandatory if 2032 mm or more wide', motorcycle: 'not required', cite: `${T1A_452}; ${T1B}` },
    count: { text: '2', min: 2, max: 2, cite: T1A_452 },
    colour: { text: 'Amber.', cite: T1A_452 },
    arrangement: { text: 'On the front to indicate the overall width of the vehicle, or width of cab on truck tractor, at the same height, symmetrically about the vertical centerline. May be located elsewhere if necessary to indicate the overall width of the vehicle, or for protection from damage during normal operation of the vehicle.', cite: T1A_452 },
    height: { measuredTo: MEASURED_TO, text: 'As near the top as practicable.', cite: T1A_452 },
    activation: { text: 'Steady burning.', cite: T1A_452 },
    notes: [`On a boat trailer, front and rear clearance lamps may be met by a dual-facing lamp at or near the midpoint of each side indicating the extreme width. ${T1B}.`],
  },
  {
    id: 'clearance-lamp-rear',
    name: 'Rear clearance lamp',
    table: 'Table I-a',
    presence: { passengerCar: 'not required', mpvTruckBusNarrow: 'not required', mpvTruckBusWide: 'mandatory (not required on a truck tractor)', trailer: 'mandatory if 2032 mm or more wide', motorcycle: 'not required', cite: `${T1A_452}; ${T1B}` },
    count: { text: '2', min: 2, max: 2, cite: T1A_452 },
    colour: { text: 'Red.', cite: T1A_452 },
    arrangement: { text: 'On the rear to indicate the overall width of the vehicle, at the same height, symmetrically about the vertical centerline. May be located elsewhere if necessary to indicate the overall width, or for protection from damage during normal operation.', cite: T1A_452 },
    height: { measuredTo: MEASURED_TO, text: 'As near the top as practicable, except where the rear identification lamps are mounted at the extreme height of the vehicle. Practicability of locating lamps on the vehicle header is presumed when the header extends at least 25 mm (1 inch) above the rear doors.', cite: T1A_452 },
    activation: { text: 'Steady burning.', cite: T1A_452 },
    notes: [`A clearance lamp may not be optically combined with a taillamp. ${c('S6.3.3', 396)}.`],
  },
  {
    id: 'identification-lamps-front',
    name: 'Front identification lamps',
    table: 'Table I-a',
    presence: { passengerCar: 'not required', mpvTruckBusNarrow: 'not required', mpvTruckBusWide: 'mandatory', trailer: 'not required (rear only)', motorcycle: 'not required', cite: `${T1A_452}; ${T1B}` },
    count: { text: '3', min: 3, max: 3, cite: T1A_452 },
    colour: { text: 'Amber.', cite: T1A_452 },
    arrangement: { text: 'On the front, at the same height, as close as practicable to the vertical centerline.', cite: T1A_452 },
    width: { minCentreSeparation: mm(6), maxCentreSeparation: mm(12), text: 'With lamp centers spaced not less than 6 inches or more than 12 inches apart.', cite: T1A_452 },
    height: { measuredTo: MEASURED_TO, text: 'As near the top of the vehicle or top of the cab as practicable.', cite: T1A_452 },
    activation: { text: 'Steady burning.', cite: T1A_452 },
    notes: [`The S4 definition prints the spacing as "not less than [6 in] 15.2 mm nor more than [12 in] 30.4 mm"; the millimetre figures there are a factor of ten too small for the inches beside them. Table I-a gives 6 and 12 inches, used here. ${c('S4, "Identification lamps"', 392)}.`],
  },
  {
    id: 'identification-lamps-rear',
    name: 'Rear identification lamps',
    table: 'Table I-a',
    presence: { passengerCar: 'not required', mpvTruckBusNarrow: 'not required', mpvTruckBusWide: 'mandatory (not required on a truck tractor)', trailer: 'mandatory if 2032 mm or more wide', motorcycle: 'not required', cite: `${T1A_452}; ${T1B}` },
    count: { text: '3', min: 3, max: 3, cite: T1A_452 },
    colour: { text: 'Red.', cite: T1A_452 },
    arrangement: { text: 'On the rear, at the same height, as close as practicable to the vertical centerline.', cite: T1A_452 },
    width: { minCentreSeparation: mm(6), maxCentreSeparation: mm(12), text: 'With lamp centers spaced not less than 6 inches or more than 12 inches apart.', cite: T1A_452 },
    height: { measuredTo: MEASURED_TO, text: 'As near the top as practicable. Practicability of locating lamps on the vehicle header is presumed when the header extends at least 25 mm (1 inch) above the rear doors.', cite: T1A_452 },
    activation: { text: 'Steady burning.', cite: T1A_452 },
    notes: [],
  },
  {
    id: 'school-bus-signal-lamps',
    name: 'School bus signal warning lamps',
    table: 'Table I-a',
    presence: { passengerCar: 'not required', mpvTruckBusNarrow: 'mandatory on school buses except multifunction school activity buses', mpvTruckBusWide: 'mandatory on school buses except multifunction school activity buses', trailer: 'not required', motorcycle: 'not required', cite: T1A_453 },
    count: { text: '2 red plus 2 amber optional, on the front and on the rear.', cite: T1A_453 },
    colour: { text: 'Red; amber optional.', cite: T1A_453 },
    arrangement: { text: 'On the front of the cab (and the rear) as far apart as practicable, but in no case less than 40 inches apart. Amber lamps, when installed, at the same height as and just inboard of the red lamp.', cite: T1A_453 },
    width: { minCentreSeparation: mm(40), text: 'In no case shall the spacing between lamps be less than 40 inches.', cite: T1A_453 },
    height: { measuredTo: MEASURED_TO, text: 'As high as practicable but at least above the windshield (front), or above the top of any side window opening (rear).', cite: T1A_453 },
    lensArea: { each: 12258, text: 'Minimum effective projected luminous lens area 12,258 mm² each lamp.', cite: c('Table IV-c', 462) },
    visibility: { up: 5, down: 10, left: 30, right: 30, text: 'Signal of front lamps to the front and rear lamps to the rear must be unobstructed within the area bounded by 5° up to 10° down and 30° left to 30° right.', cite: VA },
    activation: { text: 'Flashing alternately between 60 and 120 cycles per minute when actuated by a manual switch; amber lamps only by manual or foot operation, switched to red automatically when the entrance door opens.', cite: T1A_453 },
    notes: [`Aimed with the aiming plane vertical and normal to the vehicle's longitudinal axis, within 5 in vertically and 10 in horizontally at 25 ft. ${c('S6.4.5', 397)}.`],
  },
  {
    id: 'daytime-running-lamp',
    name: 'Daytime running lamp',
    table: 'Table I-a',
    presence: { passengerCar: 'optional', mpvTruckBusNarrow: 'optional', mpvTruckBusWide: 'optional', trailer: 'not applicable', motorcycle: 'not covered by Table I-c', cite: `${T1A_453}; ${c('S6.1.1.4', 395)}` },
    count: { text: '2 identically colored lamps. Any pair of lamps on the front, other than parking lamps or fog lamps, may be wired as DRLs.', min: 2, max: 2, cite: `${T1A_453}; ${c('S6.1.1.4', 395)}` },
    colour: { text: 'White, white to yellow, white to selective yellow, selective yellow, or yellow; both identical.', cite: T1A_453 },
    arrangement: { text: 'On the front, symmetrically disposed about the vertical centerline if not a pair of lamps required by this standard or if not optically combined with a pair of lamps required by this standard.', cite: T1A_453 },
    width: { text: 'A DRL not optically combined with a turn signal lamp must have its lighted edge at least 100 mm from the optical centre of the nearest turn signal lamp, unless the DRL is at most 2,600 cd and the turn signal lamp meets 2.5 × base, or the DRL is combined with a lower beam headlamp and the turn signal lamp meets 2.5 × base, or the DRL switches off while the turn signal or hazard warning lamp operates.', cite: c('S7.10.10.1', 406) },
    height: { max: 1067, measuredTo: MEASURED_TO, text: 'Not more than 1.067 meters above the road surface if not a pair of lamps required by this standard or if not optically combined with a pair of lamps required by this standard. An upper beam headlamp used as a DRL must be mounted not higher than 864 mm (S7.10.13(b)).', cite: `${T1A_453}; ${c('S7.10.13(b)', 407)}` },
    activation: { text: 'Steady burning. Automatically activated as determined by the vehicle manufacturer and automatically deactivated when the headlamp control is in any "on" position. A DRL optically combined with a turn signal lamp must switch off as a DRL while the turn signal or hazard warning lamp operates, and back on afterwards.', cite: T1A_453 },
    notes: [`No lens area or visibility requirement. ${c('S7.10.6 and S7.10.7', 406)}.`],
  },
];

/** Definitions the installation rules rely on (S4). */
export const DEFINITIONS = [
  { term: 'Axis of reference', text: 'The characteristic axis of the lamp for use as the direction of reference (H = 0°, V = 0°) for angles of field for photometric measurements and for installing the lamp on the vehicle.', cite: c('S4', 391) },
  { term: 'Effective light-emitting surface', text: 'That portion of a lamp that directs light to the photometric test pattern, and does not include transparent lenses, mounting hole bosses, reflex reflector area, beads or rims that may glow or produce small areas of increased intensity as a result of uncontrolled light from an area of 1/2° radius around a test point.', cite: c('S4', '391–392') },
  { term: 'Effective projected luminous lens area', text: 'The area of the orthogonal projection of the effective light-emitting surface of a lamp on a plane perpendicular to a defined direction relative to the axis of reference. Unless otherwise specified, the direction is coincident with the axis of reference.', cite: c('S4', 392) },
  { term: 'Overall width', text: 'The nominal design dimension of the widest part of the vehicle, exclusive of signal lamps, marker lamps, outside rearview mirrors, flexible fender extensions, mud flaps, and outside door handles determined with doors and windows closed, and the wheels in the straight-ahead position. Running boards may also be excluded if they do not extend beyond the width as determined by the other items excluded.', cite: c('S4', 393) },
  { term: 'Multiple compartment lamp', text: 'A device which gives its indication by two or more separately lighted areas which are joined by one or more common parts, such as a housing or lens.', cite: c('S4', 393) },
  { term: 'Multiple lamp arrangement', text: 'An array of two or more separate lamps on each side of the vehicle which operate together to give a signal.', cite: c('S4', 393) },
  { term: 'Optically combined', text: 'A lamp having a single or two filament light source or two or more separate light sources that operate in different ways, and has its optically functional lens area wholly or partially common to two or more lamp functions.', cite: c('S4', 393) },
  { term: 'Clearance lamps', text: 'Lamps which show to the front or rear of the vehicle, mounted on the permanent structure of the vehicle as near as practicable to the upper left and right extreme edges to indicate the overall width and height of the vehicle.', cite: c('S4', 391) },
  { term: 'Identification lamps', text: 'Lamps used in groups of three, in a horizontal row, which show to the front or rear or both, having lamp centers spaced not less than [6 in] 15.2 mm nor more than [12 in] 30.4 mm apart (as printed), mounted on the permanent structure as near as practicable to the vertical centerline and the top of the vehicle to identify certain types of vehicles.', cite: c('S4', 392) },
  { term: 'Side marker lamps', text: 'Lamps which show to the side of the vehicle, mounted on the permanent structure of the vehicle as near as practicable to the front and rear edges to indicate the overall length of the vehicle. Additional lamps may also be mounted at intermediate locations on the sides of the vehicle.', cite: c('S4', 394) },
  { term: 'Parking lamps', text: 'Lamps on both the left and right of the vehicle which show to the front and are intended to mark the vehicle when parked or serve as a reserve front position indicating system in the event of headlamp failure.', cite: c('S4', 393) },
  { term: 'High-mounted stop lamp', text: 'A lamp mounted high and possibly forward of the tail, stop, and rear turn signal lamps intended to give a steady stop warning through intervening vehicles to operators of following vehicles.', cite: c('S4', 392) },
  { term: 'Daytime running lamps (DRLs)', text: 'Steady burning lamps that are used to improve the conspicuity of a vehicle from the front and front sides when the regular headlamps are not required for driving.', cite: c('S4', 391) },
  { term: 'Taillamps', text: 'Steady burning low intensity lamps used to designate the rear of a vehicle.', cite: c('S4', 394) },
  { term: 'Stop lamps', text: 'Lamps giving a steady light to the rear of a vehicle to indicate a vehicle is stopping or diminishing speed by braking.', cite: c('S4', 394) },
  { term: 'Turn signal lamps', text: 'The signaling element of a turn signal system which indicates the intention to turn or change direction by giving a flashing light on the side toward which the turn will be made.', cite: c('S4', 394) },
  { term: 'Backup lamp', text: 'A lamp or lamps which illuminate the road to the rear of a vehicle and provide a warning signal to pedestrians and other drivers when the vehicle is backing up or is about to back up.', cite: c('S4', 391) },
];
