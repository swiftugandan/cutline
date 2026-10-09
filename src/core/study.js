/** The photometry study document: a light distribution file and what the engineer decided about it. It holds the
 * file's text, how its angles map to Cutline's frame, what the lamp is, the markets to check it against, the
 * engineer's own targets, the road, and the colour scales of the pictures. Everything computed from it (the resampled
 * beam, every evaluation, the road) is derived and never saved. */

import { number, string, constant, choice, object, list, array, flag, validate, ValidationError } from './spec.js';
import { ROLES, PACKS, packById, functionById, defaultMarkets, isHeadlampRole } from './regulation/catalog.js';
import { CONTOUR_LEVELS } from './photometry.js';

/** @import { Role, Market } from './regulation/catalog.js' */

export const STUDY_FORMAT = 'cutline.photometry';
export const STUDY_VERSION = 1;

/**
 * @typedef {{ name: string, shape: 'point' | 'line' | 'zone', h0: number, v0: number, h1: number, v1: number,
 *   limit: 'min' | 'max' | 'range', min: number, max: number, unit: 'cd' | 'lx' }} Target
 *   A requirement of the engineer's own. A point uses (h0, v0); a line runs from (h0, v0) to (h1, v1); a zone is the
 *   rectangle with those corners. Values in lx are on a flat screen 25 m away.
 * @typedef {{ quantity: 'intensity' | 'illuminance', scale: 'log' | 'linear', auto: 'yes' | 'no', min: number, max: number,
 *   palette: 'night' | 'heat' | 'spectrum' | 'grey', contours: number[], mode: 'light' | 'uniformity', featureDeg: number, depth: number }} BeamScale
 * @typedef {{ scale: 'log' | 'linear', auto: 'yes' | 'no', min: number, max: number, palette: 'night' | 'heat' | 'spectrum' | 'grey', contours: number[] }} RoadScale
 * @typedef {{
 *   format: typeof STUDY_FORMAT, version: typeof STUDY_VERSION, id: string, title: string, notes: string,
 *   source: { name: string, text: string },
 *   mapping: { system: 'file' | 'A' | 'B' | 'C', axisC: number, cTurn: 'left' | 'right', mirror: 'no' | 'yes' },
 *   lamp: { role: Role, traffic: 'right' | 'left', otherTraffic: 'mirror' | 'as-is', outward: 'right' | 'left',
 *     aim: 'laboratory' | 'measured', shiftH: number, shiftV: number, aimMethod: 'threeLine' | 'line02D', sourceFlux: number },
 *   conditions: string[],
 *   markets: Market[],
 *   targets: Target[],
 *   road: { surface: 'road' | 'target', lamps: 'pair' | 'left' | 'right', height: number, spacing: number, aimPercent: number, length: number, width: number },
 *   display: { beam: BeamScale, road: RoadScale },
 * }} Study
 */

const DEG = { step: 0.05 };
const PALETTE = choice('Palette', { night: 'Night', heat: 'Heat', spectrum: 'False colour', grey: 'Grey' }, 'Night shows light on a dark wall; false colour changes hue quickly, so small differences in an even area show');
const SCALE = choice('Scale', { log: 'Log', linear: 'Linear' }, 'A log scale shows the whole beam, from the faint glare zones to the hot spot; a linear scale shows differences within the bright part');
const CONTOURS = array('Contour levels', number('Level', '', 0, 1e7), 0, 16);

export const STUDY_SPEC = object('Cutline photometry study', {
  format: constant(STUDY_FORMAT),
  version: constant(STUDY_VERSION),
  id: string('Identifier', 64, { pattern: /^[A-Za-z0-9_-]+$/ }),
  title: string('Title', 160),
  notes: string('Notes', 20000),
  source: object('Light distribution', {
    name: string('File name', 260),
    text: string('File contents', 48 * 1024 * 1024),
  }),
  mapping: object('Angles', {
    system: choice('Photometry type', { file: 'From file', A: 'Type A', B: 'Type B', C: 'Type C' }, 'How the file\'s angles are drawn. Type A: horizontal angle about a vertical axis, then elevation (the R149 goniometer). Type B: tilt about a horizontal axis, then the angle across. Type C: angle from the nadir in planes about the vertical axis'),
    axisC: number('Lamp axis plane', '°', 0, 359, { step: 90, integer: true, help: 'For Type C: the C-plane that holds the lamp\'s axis, at γ = 90°' }),
    cTurn: choice('C grows towards', { left: 'Left', right: 'Right' }, 'For Type C: the side the C angle grows towards, seen from behind the lamp'),
    mirror: flag('Mirror left and right', 'Swaps left and right, for a file measured from the other side'),
  }),
  lamp: object('Lamp', {
    role: choice('Function', /** @type {Record<string, string>} */ (ROLES), 'What the lamp is. It decides which requirements of each market apply'),
    traffic: choice('Made for', { right: 'Right-hand traffic', left: 'Left-hand traffic' }, 'The traffic side this headlamp is designed for'),
    otherTraffic: choice('For the other traffic side', { mirror: 'Check its mirror image', 'as-is': 'Check it as it is' }, 'A headlamp for the other traffic side is usually the mirror image of this one. Check it as it is for a lamp that serves both sides'),
    outward: choice('Outward is', { right: 'To the right (+H)', left: 'To the left (−H)' }, 'Which side of the file faces away from the vehicle\'s centre line. Signal lamp requirements are written with H positive outwards'),
    aim: choice('Aim', { laboratory: 'As the laboratory aims it', measured: 'As measured' }, 'As the laboratory aims it: each market aims the beam by its own method, such as by the cut-off. As measured: the file\'s own axis, moved by the shifts below'),
    shiftH: number('Move right', '°', -10, 10, { ...DEG, help: 'Moves the beam to the right (negative: left) when it is checked as measured' }),
    shiftV: number('Move up', '°', -10, 10, { ...DEG, help: 'Moves the beam up (negative: down) when it is checked as measured' }),
    aimMethod: choice('R149 horizontal aim', { line02D: '0.2°D line', threeLine: 'Three lines' }, 'How the R149 laboratory aims a passing beam sideways (Annex 6 §2.3.2.1); the applicant chooses'),
    sourceFlux: number('Source flux', 'lm', 0, 100000, { step: 10, help: 'The light source\'s objective flux, for R149\'s minimum-flux rule. 0 when not known: the rule then uses the flux in Zones I and II' }),
  }),
  conditions: list('Conditions', string('Condition', 64), 64, 'Facts about the lamp that decide which requirements apply, such as a mounting height below 750 mm'),
  markets: list('Markets', object('Market', {
    pack: string('Regulation', 32, { pattern: /^[a-z0-9-]+$/ }),
    fn: string('Function', 64),
    traffic: choice('Traffic', { right: 'Right-hand', left: 'Left-hand' }),
  }), 60),
  targets: list('Targets', object('Target', {
    name: string('Name', 80),
    shape: choice('Shape', { point: 'Point', line: 'Line', zone: 'Area' }),
    h0: number('H', '°', -90, 90, DEG), v0: number('V', '°', -90, 90, DEG),
    h1: number('H to', '°', -90, 90, DEG), v1: number('V to', '°', -90, 90, DEG),
    limit: choice('Limit', { min: 'At least', max: 'At most', range: 'Between' }),
    min: number('Minimum', '', 0, 1e7), max: number('Maximum', '', 0, 1e7),
    unit: choice('Unit', { cd: 'cd', lx: 'lx at 25 m' }),
  }), 200),
  road: object('Road', {
    surface: choice('Light on', { road: 'The road surface', target: 'A target facing the car' }, 'The road surface shows the horizontal illuminance an isolux road diagram uses; a target facing the car shows how far the lamps light an obstacle'),
    lamps: choice('Lamps', { pair: 'Both', left: 'Left only', right: 'Right only' }),
    height: number('Mounting height', 'm', 0.2, 4, { step: 0.01 }),
    spacing: number('Lamp spacing', 'm', 0, 3, { step: 0.01, help: 'Between the centres of the two lamps' }),
    aimPercent: number('Downward aim', '%', -5, 5, { step: 0.1, help: 'Inclination of the beam on the vehicle. A laboratory-aimed passing beam is first raised so its cut-off is level' }),
    length: number('Road length', 'm', 20, 400, { step: 10 }),
    width: number('Road width', 'm', 10, 100, { step: 2 }),
  }),
  display: object('Display', {
    beam: object('Beam picture', {
      quantity: choice('Show', { intensity: 'Intensity (cd)', illuminance: 'Illuminance at 25 m (lx)' }, 'Illuminance on a flat screen 25 m ahead, square to the lamp\'s axis'),
      scale: SCALE,
      auto: flag('Fit the range', 'Fit the colour range to the beam'),
      min: number('Bottom of the scale', '', 0, 1e7, { help: 'In the unit shown' }),
      max: number('Top of the scale', '', 0, 1e7, { help: 'In the unit shown' }),
      palette: PALETTE,
      contours: CONTOURS,
      mode: choice('Colour by', { light: 'Light', uniformity: 'Uniformity' }, 'Uniformity colours each direction by its intensity against the average around it, so dark patches and stripes stand out'),
      featureDeg: number('Feature size', '°', 0.2, 10, { step: 0.1, help: 'How far around each direction the average reaches: about the size of the patches to find' }),
      depth: number('Dark patch depth', '%', 0.05, 0.9, { step: 0.01, display: { unit: '%', factor: 100, digits: 0 }, help: 'How far below its surroundings a patch must fall to be listed' }),
    }),
    road: object('Road picture', {
      scale: SCALE,
      auto: flag('Fit the range', 'Fit the colour range to the road'),
      min: number('Bottom of the scale', 'lx', 0, 1e6),
      max: number('Top of the scale', 'lx', 0, 1e6),
      palette: PALETTE,
      contours: CONTOURS,
    }),
  }),
});

/** @param {Study} s @returns {ValidationError[]} */
export function studyRuleViolations(s) {
  /** @type {ValidationError[]} */
  const out = [];
  s.markets.forEach((m, i) => {
    const pack = packById(m.pack);
    if (!pack) { out.push(new ValidationError(`markets[${i}].pack`, `names no regulation Cutline holds (${m.pack})`)); return; }
    if (!functionById(m.pack, m.fn)) out.push(new ValidationError(`markets[${i}].fn`, `names no function of ${pack.short} (${m.fn})`));
    if (!pack.traffics.includes(m.traffic)) out.push(new ValidationError(`markets[${i}].traffic`, `${pack.short} has no ${m.traffic}-hand traffic version`));
  });
  s.targets.forEach((t, i) => {
    if (t.limit === 'range' && t.min > t.max) out.push(new ValidationError(`targets[${i}].max`, 'must be at least the minimum'));
  });
  const d = s.display.beam;
  if (d.auto === 'no' && !(d.max > d.min)) out.push(new ValidationError('display.beam.max', 'must be above the bottom of the scale'));
  if (d.auto === 'no' && d.scale === 'log' && !(d.min > 0)) out.push(new ValidationError('display.beam.min', 'must be above zero on a log scale'));
  const r = s.display.road;
  if (r.auto === 'no' && !(r.max > r.min)) out.push(new ValidationError('display.road.max', 'must be above the bottom of the scale'));
  if (r.auto === 'no' && r.scale === 'log' && !(r.min > 0)) out.push(new ValidationError('display.road.min', 'must be above zero on a log scale'));
  return out;
}

/** @param {unknown} raw @returns {Study} */
export function validateStudy(raw) {
  const study = /** @type {Study} */ (validate(STUDY_SPEC, raw));
  const [first] = studyRuleViolations(study);
  if (first) throw first;
  return study;
}

/** @param {string} text */
export function parseStudy(text) {
  let raw;
  try { raw = JSON.parse(text); } catch { throw new ValidationError('', 'This file is not valid JSON.'); }
  if (!raw || typeof raw !== 'object' || /** @type {{format?: unknown}} */ (raw).format !== STUDY_FORMAT) throw new ValidationError('', 'This is not a Cutline photometry study.');
  if (/** @type {{version?: unknown}} */ (raw).version !== STUDY_VERSION) throw new ValidationError('version', `This study uses format version ${String(/** @type {{version?: unknown}} */ (raw).version)}; this app reads version ${STUDY_VERSION}.`);
  return validateStudy(raw);
}

/** @param {Study} study */
export function serializeStudy(study) { return JSON.stringify(study) + '\n'; }

function newStudyId() {
  const bytes = new Uint8Array(9);
  crypto.getRandomValues(bytes);
  return 'study_' + Array.from(bytes, b => b.toString(36).padStart(2, '0')).join('').slice(0, 16);
}

/** @param {Role} role */
export function defaultContours(role) {
  return isHeadlampRole(role) ? CONTOUR_LEVELS.slice() : [0.3, 1, 5, 20, 50, 100, 200, 500];
}

/** @returns {Study} */
export function defaultStudy() {
  return {
    format: STUDY_FORMAT, version: STUDY_VERSION, id: newStudyId(), title: 'Untitled study', notes: '',
    source: { name: '', text: '' },
    mapping: { system: 'file', axisC: 0, cTurn: 'left', mirror: 'no' },
    lamp: { role: 'passing', traffic: 'right', otherTraffic: 'mirror', outward: 'right', aim: 'laboratory', shiftH: 0, shiftV: 0, aimMethod: 'threeLine', sourceFlux: 0 },
    conditions: [],
    markets: defaultMarkets('passing'),
    targets: [],
    road: { surface: 'road', lamps: 'pair', height: 0.65, spacing: 1.4, aimPercent: 1, length: 140, width: 40 },
    display: {
      beam: { quantity: 'intensity', scale: 'log', auto: 'yes', min: 10, max: 100000, palette: 'spectrum', contours: CONTOUR_LEVELS.slice(), mode: 'light', featureDeg: 1, depth: 0.2 },
      road: { scale: 'log', auto: 'yes', min: 0.1, max: 100, palette: 'heat', contours: [0.5, 1, 3, 5, 10, 20, 50] },
    },
  };
}

/**
 * Sets the lamp's role, bringing the markets, conditions and contour levels along: the markets become each pack's
 * usual function for the role.
 * @param {Study} study @param {Role} role
 */
export function setRole(study, role) {
  study.lamp.role = role;
  study.markets = defaultMarkets(role);
  study.conditions = [];
  study.display.beam.contours = defaultContours(role);
  if (!isHeadlampRole(role)) study.lamp.aim = 'measured';
}

/** The packs a study's markets use, in catalogue order. @param {Study} study */
export function studyPacks(study) {
  return PACKS.filter(p => study.markets.some(m => m.pack === p.id));
}
