/** The Cutline design document: types, field spec, rules, defaults and parsing. A design stores the engineer's
 * intent only; geometry, traces, beam maps and compliance results are derived and never saved. */

import { number, string, constant, choice, object, union, validate, ValidationError, PERCENT } from './spec.js';

export const FORMAT = 'cutline.design';
export const FORMAT_VERSION = 1;
export const APP_VERSION = '0.3.0';

/**
 * @typedef {{ flux: number, width: number, height: number, offset: number }} Led
 * @typedef {{ focalDistance: number, semiMajor: number, widthRatio: number, frontCut: number, reflectance: number, slopeErrorMrad: number }} ProjectorReflector
 * @typedef {{ verticalDeg: number, elbowDeg: number, riseDeg: number, riseHeightDeg: number, aimMethod: 'threeLine' | 'line02D' }} Cutoff
 * @typedef {{ lowering: number, width: number, curvature: number, windowWidth: number, windowHeight: number, windowDepth: number }} Shield
 * @typedef {{ transmittance: number, haze: number, hazeAngleDeg: number }} Cover
 * @typedef {{ diameter: number, thickness: number, radius: number, conic: number, a4: number, refractiveIndex: number, abbe: number, textureDeg: number, signLightHeight: number, signLightMinDeg: number, signLightMaxDeg: number, defocus: number }} Lens
 * @typedef {{ type: 'projector', reflector: ProjectorReflector, shield: Shield, lens: Lens }} ProjectorOptics
 * @typedef {{ type: 'reflector', focalLength: number, width: number, height: number, columns: number, rows: number,
 *   spreadDeg: number, fanPower: number, dropDeg: number, rowDropDeg: number, wingDropDeg: number, kickColumns: number, facetSpreadDeg: number, overheadFacets: number, overheadHeight: number, overheadDeg: number, reflectance: number, slopeErrorMrad: number }} ReflectorOptics
 * @typedef {ProjectorOptics | ReflectorOptics} Optics
 * @typedef {{ height: number, aimPercent: number }} Mounting
 * @typedef {{ rays: number, seed: number }} Simulation
 * @typedef {{
 *   format: typeof FORMAT, version: typeof FORMAT_VERSION, id: string, title: string, notes: string,
 *   beamClass: 'C' | 'V' | 'B' | 'A', traffic: 'right' | 'left',
 *   led: Led, cutoff: Cutoff, optics: Optics, cover: Cover, mounting: Mounting, simulation: Simulation,
 * }} Design
 */

export const MAX_RAYS = 50_000_000;

const fraction = /** @param {string} label @param {string} [help] */ (label, help) => number(label, '', 0, 1, { display: PERCENT, step: 0.001, ...(help ? { help } : {}) });
const MM = { unit: 'mm', factor: 1, digits: 2 };

export const OPTICS_SPEC = union('Optics', 'type', {
  projector: ['Projector', object('LED projector module', {
    type: constant('projector'),
    reflector: object('Ellipsoidal reflector', {
      focalDistance: number('Distance between foci', 'mm', 5, 200, { display: MM, step: 0.5, help: 'From the LED (first focus) to the shield edge (second focus)' }),
      semiMajor: number('Semi-major axis', 'mm', 3, 200, { display: MM, step: 0.5, help: 'Half the reflector length along the beam; must exceed half the distance between foci' }),
      widthRatio: number('Width ratio', '', 0.5, 3, { step: 0.01, help: 'Horizontal over vertical semi-axis. Above 1 spreads the beam sideways' }),
      frontCut: number('Front edge', 'mm', 0, 200, { display: MM, step: 0.5, help: 'Where the reflector ends, measured forwards from the LED' }),
      reflectance: fraction('Reflectance', 'Vacuum-aluminised reflectors reach about 0.85–0.90'),
      slopeErrorMrad: number('Slope error', 'mrad', 0, 30, { step: 0.1 }),
    }),
    shield: object('Cut-off shield', {
      lowering: number('Edge offset', 'mm', -5, 5, { display: MM, step: 0.05, help: 'Moves the shield edge up (positive) or down at the second focus' }),
      width: number('Shield width', 'mm', 5, 200, { display: MM, step: 0.5 }),
      curvature: number('Curvature', '1/mm', -0.05, 0.05, { step: 0.0005, help: 'Bends the shield towards the lens at its ends (z = κx²), following the lens\'s curved field. Sharpens the cut-off far to the sides' }),
      windowWidth: number('Overhead window width', 'mm', 0, 80, { display: MM, step: 0.5, help: 'A slot below the shield edge that lets a little light through above the cut-off, for overhead signs. 0 for none' }),
      windowHeight: number('Overhead window height', 'mm', 0, 10, { display: MM, step: 0.05 }),
      windowDepth: number('Overhead window depth', 'mm', 0, 15, { display: MM, step: 0.05, help: 'How far below the edge the top of the window sits; deeper sends its light higher' }),
    }),
    lens: object('Aspheric lens', {
      diameter: number('Diameter', 'mm', 10, 200, { display: MM, step: 0.5 }),
      thickness: number('Centre thickness', 'mm', 2, 60, { display: MM, step: 0.1 }),
      radius: number('Front radius', 'mm', 5, 500, { display: MM, step: 0.1 }),
      conic: number('Conic constant', '', -5, 5, { step: 0.01, help: 'About −1/n² removes spherical aberration for a distant object' }),
      a4: number('Fourth-order term', '1/mm³', -0.01, 0.01, { step: 1e-7 }),
      refractiveIndex: number('Refractive index', '', 1.3, 2, { step: 0.001, help: 'At 587.6 nm. PMMA 1.49, polycarbonate 1.585, glass about 1.52' }),
      textureDeg: number('Surface texture', '°', 0, 2, { step: 0.01, help: 'The scale of a fine texture on the front face that scatters the light: half of it turns by less than about 0.77 times this angle, with a thin tail turning further. Makers use texture to tune cut-off sharpness and hide colour fringes' }),
      signLightHeight: number('Sign-light strip', 'mm', 0, 20, { display: MM, step: 0.1, help: 'Height of a strip along the bottom of the lens that turns its light upwards onto overhead signs. 0 for none' }),
      signLightMinDeg: number('Sign light from', '°', 0, 10, { step: 0.1, help: 'Smallest upward turn the strip gives' }),
      signLightMaxDeg: number('Sign light to', '°', 0, 10, { step: 0.1, help: 'Largest upward turn the strip gives' }),
      abbe: number('Abbe number', '', 15, 100, { step: 0.5, help: 'Lower numbers spread colours more, softening the cut-off with a coloured fringe. PMMA about 57, polycarbonate about 30' }),
      defocus: number('Defocus', 'mm', -10, 10, { display: MM, step: 0.05, help: 'Moves the lens away from (positive) or towards the shield. Softens the cut-off' }),
    }),
  })],
  reflector: ['Reflector', object('LED multi-facet reflector', {
    type: constant('reflector'),
    focalLength: number('Focal length', 'mm', 3, 100, { display: MM, step: 0.1 }),
    width: number('Reflector width', 'mm', 20, 400, { display: MM, step: 1 }),
    height: number('Reflector height', 'mm', 10, 200, { display: MM, step: 1, help: 'Above the LED, which faces up into the reflector' }),
    columns: number('Facet columns', '', 1, 16, { integer: true, step: 1 }),
    rows: number('Facet rows', '', 1, 8, { integer: true, step: 1 }),
    spreadDeg: number('Horizontal spread', '°', 0, 45, { step: 0.5, help: 'Half-width of the fan of facet aims across the road' }),
    fanPower: number('Fan concentration', '', 1, 4, { step: 0.05, help: 'How the facet columns share out across the spread: 1 spaces them evenly, higher values gather them towards the centre for a brighter hot spot' }),
    dropDeg: number('Image margin below the cut-off', '°', 0, 5, { step: 0.05, help: 'Extra downward aim, so each chip image sits under the cut-off' }),
    rowDropDeg: number('Row drop', '°', 0, 10, { step: 0.1, help: 'Extra downward aim for the bottom row, shared out evenly up to none for the top row. Lower rows form larger images, suited to the foreground' }),
    wingDropDeg: number('Wing drop', '°', 0, 10, { step: 0.1, help: 'Extra downward aim for the columns aimed widest, growing with how far out they point. It lights the road edges close to the car' }),
    kickColumns: number('Elbow columns', '', 0, 8, { integer: true, step: 1, help: 'Columns on the kerb side aimed up the rising part of the cut-off' }),
    facetSpreadDeg: number('Facet spread', '°', 0, 30, { step: 0.5, help: 'Each facet is curved sideways to smear its image across about this half-angle, smoothing the pattern' }),
    overheadFacets: number('Sign-light columns', '', 0, 8, { integer: true, step: 1, help: 'Central facet columns whose bottom strip lights overhead signs' }),
    overheadHeight: number('Sign-light strip', 'mm', 0, 20, { display: MM, step: 0.1, help: 'Height of the strip at the bottom of those columns that aims above the cut-off. 0 for none' }),
    overheadDeg: number('Sign-light aim', '°', 0.5, 8, { step: 0.1, help: 'How far above the horizon the sign-light strip aims' }),
    reflectance: fraction('Reflectance'),
    slopeErrorMrad: number('Slope error', 'mrad', 0, 30, { step: 0.1 }),
  })],
});

export const DESIGN_SPEC = object('Cutline design', {
  format: constant(FORMAT),
  version: constant(FORMAT_VERSION),
  id: string('Identifier', 64, { pattern: /^[A-Za-z0-9_-]+$/ }),
  title: string('Title', 160),
  notes: string('Notes', 20000),
  beamClass: choice('Beam class', { C: 'Passing C', V: 'Passing V', B: 'Driving B', A: 'Driving A' }, 'UN R149 01 series: passing-beam Class C is a normal car low beam, Class V a lower-output one; driving-beam Class B (HR) is a normal car high beam, Class A (R) a lower one'),
  traffic: choice('Traffic', { right: 'Right-hand', left: 'Left-hand' }, 'The side of the road vehicles drive on'),
  cutoff: object('Cut-off', {
    verticalDeg: number('Horizontal part', '°', -5, 5, { step: 0.01, help: 'Vertical angle of the flat part of the cut-off; negative is below the horizon. R149 aims it to 0.57° down (line B). Ignored for a driving beam' }),
    elbowDeg: number('Elbow', '°', -10, 10, { step: 0.05, help: 'Horizontal angle where the cut-off starts to rise towards the kerb' }),
    riseDeg: number('Rise angle', '°', 0, 60, { step: 0.5, help: 'Slope of the rising part. 15° is common practice; R149 itself does not prescribe it' }),
    riseHeightDeg: number('Rise height', '°', 0, 5, { step: 0.05, help: 'How far the rising part climbs' }),
    aimMethod: choice('Horizontal aim', { line02D: '0.2°D line', threeLine: 'Three lines' }, 'How the approval lab aims the beam sideways (R149 Annex 6 §2.3.2.1). The applicant chooses: the 0.2°D line puts the rising edge on line A at 0.5°R; three lines fit the rising edge and put its meeting with line B on V-V'),
  }),
  led: object('LED', {
    flux: number('Luminous flux', 'lm', 10, 10000, { step: 10, help: 'Hot operating flux at the junction temperature in the lamp, not the datasheet value at 25 °C' }),
    width: number('Emitter width', 'mm', 0.1, 20, { display: MM, step: 0.05 }),
    height: number('Emitter length', 'mm', 0.1, 20, { display: MM, step: 0.05, help: 'Along the beam axis' }),
    offset: number('Offset along the axis', 'mm', -20, 20, { display: MM, step: 0.05, help: 'Moves the LED forwards (positive) or back from the reflector\'s focus. In a projector, a chip just behind the focus images above the shield edge, so less light is lost on the shield' }),
  }),
  optics: OPTICS_SPEC,
  cover: object('Outer lens', {
    transmittance: fraction('Transmittance', 'Clear polycarbonate outer lenses pass about 0.85–0.92'),
    haze: fraction('Haze', 'Share of the light the outer lens scatters out of the beam: by the ASTM D1003 definition, light turned more than 2.5°. New clear polycarbonate lenses scatter about 0.5–1%; ageing raises it'),
    hazeAngleDeg: number('Haze spread', '°', 0.1, 30, { step: 0.1, help: 'Spread of the scattered light, as a Gaussian σ per axis' }),
  }),
  mounting: object('Mounting', {
    height: number('Mounting height', 'm', 0.3, 2, { step: 0.01, help: 'Height of the lamp above the road, for the road view' }),
    aimPercent: number('Downward aim', '%', 0, 5, { step: 0.1, help: 'Initial inclination of the cut-off, as a percentage, for the road view' }),
  }),
  simulation: object('Simulation', {
    rays: number('Rays', '', 10000, MAX_RAYS, { integer: true, step: 100000 }),
    seed: number('Random seed', '', 0, 4294967295, { integer: true, step: 1 }),
  }),
});

/** @param {Design} d @returns {ValidationError[]} */
export function designRuleViolations(d) {
  /** @type {ValidationError[]} */
  const out = [];
  const o = d.optics;
  if (o.type === 'projector') {
    if (!(o.reflector.semiMajor > o.reflector.focalDistance / 2)) out.push(new ValidationError('optics.reflector.semiMajor', 'must be more than half the distance between foci'));
    const sag = lensEdgeSag(o.lens);
    if (!(o.lens.thickness + sag > 0.5)) out.push(new ValidationError('optics.lens.thickness', 'the lens is too thin at its edge for this radius and diameter'));
    // The conic surface must be defined across the whole aperture: (1 + k)(r/R)² < 1.
    if ((1 + o.lens.conic) * (o.lens.diameter / 2 / o.lens.radius) ** 2 >= 1) out.push(new ValidationError('optics.lens.radius', 'the lens surface is not defined across its diameter; use a larger radius or a smaller conic constant'));
    if (o.lens.signLightMinDeg > o.lens.signLightMaxDeg) out.push(new ValidationError('optics.lens.signLightMaxDeg', 'must be at least the sign light\'s smallest turn'));
    if (o.lens.signLightHeight >= o.lens.diameter) out.push(new ValidationError('optics.lens.signLightHeight', 'must be less than the lens diameter'));
  } else {
    if (o.kickColumns > o.columns) out.push(new ValidationError('optics.kickColumns', 'cannot exceed the number of facet columns'));
    if (o.overheadFacets > o.columns) out.push(new ValidationError('optics.overheadFacets', 'cannot exceed the number of facet columns'));
    if (o.overheadHeight >= o.height / o.rows) out.push(new ValidationError('optics.overheadHeight', 'must be less than the height of one facet row'));
  }
  return out;
}

/** Sag of the lens front at its edge (negative: the edge sits behind the vertex). @param {Lens} lens */
export function lensEdgeSag(lens) {
  const c = -1 / lens.radius, r = lens.diameter / 2, r2 = r * r;
  const arg = 1 - (1 + lens.conic) * c * c * r2;
  if (arg < 0) return -Infinity;
  return (c * r2) / (1 + Math.sqrt(arg)) + lens.a4 * r2 * r2;
}

/** @param {unknown} raw @returns {Design} */
export function validateDesign(raw) {
  const design = /** @type {Design} */ (validate(DESIGN_SPEC, raw));
  const [first] = designRuleViolations(design);
  if (first) throw first;
  return design;
}

/** @param {string} text */
export function parseDesign(text) {
  if (text.length > 4 * 1024 * 1024) throw new ValidationError('', 'This file is larger than 4 MB, which is too large for a Cutline design.');
  let raw;
  try { raw = JSON.parse(text); } catch { throw new ValidationError('', 'This file is not valid JSON.'); }
  if (!raw || typeof raw !== 'object' || /** @type {{format?: unknown}} */ (raw).format !== FORMAT) throw new ValidationError('', 'This is not a Cutline design.');
  if (/** @type {{version?: unknown}} */ (raw).version !== FORMAT_VERSION) throw new ValidationError('version', `This design uses format version ${String(/** @type {{version?: unknown}} */ (raw).version)}; this app reads version ${FORMAT_VERSION}.`);
  return validateDesign(raw);
}

/** @param {Design} design */
export function serializeDesign(design) {
  return JSON.stringify(design, null, 2) + '\n';
}

export function newDesignId() {
  const bytes = new Uint8Array(9);
  crypto.getRandomValues(bytes);
  return 'design_' + Array.from(bytes, b => b.toString(36).padStart(2, '0')).join('').slice(0, 16);
}

/** @param {Optics['type']} type @returns {Optics} */
export function defaultOptics(type) {
  if (type === 'reflector') {
    return { type, focalLength: 22.2, width: 160, height: 70, columns: 14, rows: 3, spreadDeg: 20, fanPower: 2.3, dropDeg: 0.58, rowDropDeg: 0, wingDropDeg: 2.7, kickColumns: 3, facetSpreadDeg: 18.3, overheadFacets: 2, overheadHeight: 4.8, overheadDeg: 3.4, reflectance: 0.88, slopeErrorMrad: 3 };
  }
  return {
    type: 'projector',
    reflector: { focalDistance: 52.4, semiMajor: 33.7, widthRatio: 1.17, frontCut: 27, reflectance: 0.88, slopeErrorMrad: 2 },
    shield: { lowering: 0, width: 60, curvature: 0.0033, windowWidth: 0, windowHeight: 1, windowDepth: 3 },
    lens: { diameter: 60, thickness: 18, radius: 34, conic: -0.6, a4: 0, refractiveIndex: 1.49, abbe: 57, textureDeg: 0.24, signLightHeight: 1.45, signLightMinDeg: 2.1, signLightMaxDeg: 6.2, defocus: 0 },
  };
}

/**
 * The intended cut-off a lamp type starts with. The values are where each lamp's beam must be built so that, after
 * the laboratory aims it by its own cut-off, the cut-off sits on line B with its elbow on V-V: a soft projector
 * cut-off is aimed by the centre of its fall, which lies above the shield edge's image.
 * @param {Optics['type']} type @returns {Cutoff}
 */
export function defaultCutoff(type) {
  return type === 'projector'
    ? { verticalDeg: -0.8, elbowDeg: 0, riseDeg: 25, riseHeightDeg: 1.5, aimMethod: 'threeLine' }
    : { verticalDeg: -0.58, elbowDeg: 1.46, riseDeg: 15, riseHeightDeg: 1.5, aimMethod: 'threeLine' };
}

/** @returns {Design} */
export function defaultDesign() {
  return {
    format: FORMAT, version: FORMAT_VERSION, id: newDesignId(), title: 'Untitled projector', notes: '',
    beamClass: 'C', traffic: 'right',
    led: { flux: 1230, width: 1, height: 2, offset: -0.72 },
    cutoff: defaultCutoff('projector'),
    optics: defaultOptics('projector'),
    cover: { transmittance: 0.9, haze: 0.005, hazeAngleDeg: 8 },
    mounting: { height: 0.65, aimPercent: 1 },
    simulation: { rays: 20_000_000, seed: 1 },
  };
}

/** Whether a design is a passing (low) beam. @param {Design} design */
export function isPassing(design) {
  return design.beamClass === 'C' || design.beamClass === 'V';
}

/** @param {unknown} root @param {string} path @returns {unknown} */
export function getPath(root, path) {
  let node = root;
  for (const key of path.split('.')) node = node && typeof node === 'object' ? /** @type {Record<string, unknown>} */ (node)[key] : undefined;
  return node;
}

/** @param {unknown} root @param {string} path @param {unknown} value */
export function setPath(root, path, value) {
  const keys = path.split('.');
  let node = /** @type {Record<string, unknown>} */ (root);
  for (const key of keys.slice(0, -1)) node = /** @type {Record<string, unknown>} */ (node[key]);
  const last = /** @type {string} */ (keys.at(-1));
  if (!Object.hasOwn(node, last)) throw new Error(`Unknown design field ${path}`);
  node[last] = value;
}

/** @param {Design} design @param {string} path @param {string} tag */
export function switchVariant(design, path, tag) {
  if (path === 'optics') {
    const type = /** @type {Optics['type']} */ (tag);
    design.optics = defaultOptics(type);
    // A projector wants the chip just behind the focus, so its image clears the shield; a reflector wants it centred.
    design.led = { ...design.led, offset: type === 'projector' ? -0.72 : 0.35 };
    // Each lamp type has its own starting cut-off, keeping the aiming method the designer chose.
    design.cutoff = { ...defaultCutoff(type), aimMethod: design.cutoff.aimMethod };
    if (/^Untitled /.test(design.title)) design.title = `Untitled ${tag === 'reflector' ? 'reflector' : 'projector'}`;
    return;
  }
  throw new Error(`Cannot switch ${path} to ${tag}.`);
}
