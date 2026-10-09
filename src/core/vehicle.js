/** The vehicle document: a vehicle model and the lamps placed on it. The model's file is kept beside the document in
 * the browser, not inside it; the document records how the model maps to the vehicle frame, the vehicle's category,
 * and each lamp's function, position and apparent surface. Positions are millimetres in the vehicle frame (ISO 8855):
 * x forwards from the front-most point, y to the left of the median plane, z up from the ground. */

import { number, string, constant, choice, object, list, flag, validate, ValidationError } from './spec.js';
import { INSTALL_ROLES } from './installation.js';

/** @import { AxisName } from './mesh/mesh.js' */

export const VEHICLE_FORMAT = 'cutline.vehicle';
export const VEHICLE_VERSION = 1;

/**
 * @typedef {keyof typeof INSTALL_ROLES} InstallRole
 * @typedef {'front' | 'rear' | 'left' | 'right'} Facing  The direction of the lamp's reference axis.
 * @typedef {{ name: string, role: InstallRole, facing: Facing, x: number, y: number, z: number, width: number, height: number }} PlacedLamp
 *   (x, y, z) is the centre of reference; width and height are the apparent surface's, across and up, seen along the
 *   reference axis.
 * @typedef {{
 *   format: typeof VEHICLE_FORMAT, version: typeof VEHICLE_VERSION, id: string, title: string, notes: string,
 *   model: { name: string, units: 'mm' | 'cm' | 'm' | 'in', forward: AxisName, up: AxisName, groundBelow: number },
 *   vehicle: { category: 'M1' | 'N1' | 'M2' | 'M3' | 'N2' | 'N3', fmvssType: 'passengerCar' | 'mpvTruckBusNarrow' | 'mpvTruckBusWide', overallWidth: number, r48: 'yes' | 'no', fmvss108: 'yes' | 'no' },
 *   lamps: PlacedLamp[],
 * }} Vehicle
 */

const AXES = { '+x': '+X', '-x': '−X', '+y': '+Y', '-y': '−Y', '+z': '+Z', '-z': '−Z' };
const MM = { step: 1 };

export const VEHICLE_SPEC = object('Cutline vehicle', {
  format: constant(VEHICLE_FORMAT),
  version: constant(VEHICLE_VERSION),
  id: string('Identifier', 64, { pattern: /^[A-Za-z0-9_-]+$/ }),
  title: string('Title', 160),
  notes: string('Notes', 20000),
  model: object('Model', {
    name: string('File name', 260),
    units: choice('Units', { mm: 'mm', cm: 'cm', m: 'm', in: 'in' }, 'The unit the model file is drawn in'),
    forward: choice('Forward is', AXES, 'The model\'s axis that points to the front of the vehicle'),
    up: choice('Up is', AXES, 'The model\'s axis that points up'),
    groundBelow: number('Ground below the model', 'mm', 0, 2000, { ...MM, help: 'How far below the model\'s lowest point the road lies. 0 when the tyres are in the model' }),
  }),
  vehicle: object('Vehicle', {
    category: choice('Category', { M1: 'M1', N1: 'N1', M2: 'M2', M3: 'M3', N2: 'N2', N3: 'N3' }, 'The UN vehicle category: M1 passenger cars, N1 light goods vehicles, and so on. R48 sets presence and some limits by category'),
    fmvssType: choice('FMVSS vehicle type', { passengerCar: 'Passenger car', mpvTruckBusNarrow: 'MPV, truck or bus under 2,032 mm wide', mpvTruckBusWide: 'MPV, truck or bus 2,032 mm or wider' }, 'The vehicle type of FMVSS 108 Table I'),
    overallWidth: number('Overall width', 'mm', 0, 5000, { ...MM, help: 'Between the extreme outer edges, leaving out mirrors, side lamps and tyre bulge (R48 §2.3.3). 0 takes the model\'s width, which includes the mirrors' }),
    r48: flag('Check UN R48'),
    fmvss108: flag('Check FMVSS 108'),
  }),
  lamps: list('Lamps', object('Lamp', {
    name: string('Name', 80),
    role: choice('Function', Object.fromEntries(Object.entries(INSTALL_ROLES).map(([k, v]) => [k, v.name]))),
    facing: choice('Faces', { front: 'Forwards', rear: 'Rearwards', left: 'Left', right: 'Right' }, 'The direction of the reference axis'),
    x: number('Ahead', 'mm', -30000, 1000, { ...MM, help: 'From the vehicle\'s front-most point; negative is behind it' }),
    y: number('Left', 'mm', -3000, 3000, { ...MM, help: 'From the median plane; negative is to the right' }),
    z: number('Up', 'mm', -500, 6000, { ...MM, help: 'From the ground' }),
    width: number('Apparent surface width', 'mm', 1, 3000, { ...MM, help: 'Across, seen along the reference axis' }),
    height: number('Apparent surface height', 'mm', 1, 3000, MM),
  }), 120),
});

/** @param {Vehicle} v @returns {ValidationError[]} */
export function vehicleRuleViolations(v) {
  /** @type {ValidationError[]} */
  const out = [];
  if (v.model.forward[1] === v.model.up[1]) out.push(new ValidationError('model.up', 'must be a different axis from forward'));
  return out;
}

/** @param {unknown} raw @returns {Vehicle} */
export function validateVehicle(raw) {
  const v = /** @type {Vehicle} */ (validate(VEHICLE_SPEC, raw));
  const [first] = vehicleRuleViolations(v);
  if (first) throw first;
  return v;
}

/** @param {string} text */
export function parseVehicle(text) {
  let raw;
  try { raw = JSON.parse(text); } catch { throw new ValidationError('', 'This file is not valid JSON.'); }
  if (!raw || typeof raw !== 'object' || /** @type {{format?: unknown}} */ (raw).format !== VEHICLE_FORMAT) throw new ValidationError('', 'This is not a Cutline vehicle.');
  if (/** @type {{version?: unknown}} */ (raw).version !== VEHICLE_VERSION) throw new ValidationError('version', `This vehicle uses format version ${String(/** @type {{version?: unknown}} */ (raw).version)}; this app reads version ${VEHICLE_VERSION}.`);
  return validateVehicle(raw);
}

/** @param {Vehicle} v */
export function serializeVehicle(v) { return JSON.stringify(v, null, 2) + '\n'; }

/** @returns {Vehicle} */
export function defaultVehicle() {
  const bytes = new Uint8Array(9);
  crypto.getRandomValues(bytes);
  return {
    format: VEHICLE_FORMAT, version: VEHICLE_VERSION, id: 'vehicle_' + Array.from(bytes, b => b.toString(36).padStart(2, '0')).join('').slice(0, 16), title: 'Untitled vehicle', notes: '',
    model: { name: '', units: 'mm', forward: '-x', up: '+z', groundBelow: 0 },
    vehicle: { category: 'M1', fmvssType: 'passengerCar', overallWidth: 0, r48: 'yes', fmvss108: 'yes' },
    lamps: [],
  };
}
