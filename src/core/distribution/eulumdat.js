/** EULUMDAT (.ldt) photometric files. EULUMDAT always uses Type C photometry and stores intensities per 1,000 lm of
 * lamp flux; Cutline converts them to candela with the first lamp set's flux. */

import { PhotometryFileError } from './ies.js';

/** @import { Distribution } from './distribution.js' */

/**
 * Reads a EULUMDAT file.
 * @param {string} text @param {string} [name]
 * @returns {Distribution}
 */
export function parseEulumdat(text, name = 'The file') {
  const lines = text.replace(/^﻿/, '').split(/\r\n|\r|\n/);
  let i = 0;
  const line = () => {
    if (i >= lines.length) throw new PhotometryFileError(`${name} ends early: the EULUMDAT data is incomplete.`);
    return lines[i++].trim();
  };
  const num = () => {
    const raw = line();
    const value = Number(raw.replace(',', '.'));
    if (!Number.isFinite(value)) throw new PhotometryFileError(`${name} has "${raw}" on line ${i}, where EULUMDAT expects a number.`);
    return value;
  };
  const company = line();
  num(); // type indicator
  const isym = num(), mc = num(); num(); const ng = num(); num();
  const report = line(), luminaire = line(), number = line(); line(); const date = line();
  const length = num(), width = num(), height = num();
  for (let k = 0; k < 6; k++) num(); // luminous area
  num(); num(); // downward flux fraction, light output ratio
  const conversion = num() || 1;
  num(); // tilt during measurement
  const sets = num();
  if (!(Number.isInteger(mc) && mc >= 1 && Number.isInteger(ng) && ng >= 2 && Number.isInteger(sets) && sets >= 1)) throw new PhotometryFileError(`${name} is not a EULUMDAT file Cutline can read (it gives ${mc} C-planes, ${ng} angles and ${sets} lamp sets).`);
  const kinds = [], flux = [], watts = [];
  for (let k = 0; k < sets; k++) num(); // number of lamps
  for (let k = 0; k < sets; k++) kinds.push(line());
  for (let k = 0; k < sets; k++) flux.push(num());
  for (let k = 0; k < sets; k++) line(); // colour temperature
  for (let k = 0; k < sets; k++) line(); // colour rendering
  for (let k = 0; k < sets; k++) watts.push(num());
  for (let k = 0; k < 10; k++) num(); // direct ratios
  const cAngles = Array.from({ length: mc }, num), gAngles = Array.from({ length: ng }, num);
  if (![0, 1, 2, 3, 4].includes(isym)) throw new PhotometryFileError(`${name} has symmetry indicator ${isym}; EULUMDAT uses 0 to 4.`);
  // The planes stored for each symmetry, 1-based and inclusive, as the format defines them.
  const [mc1, mc2] = isym === 1 ? [1, 1] : isym === 2 ? [1, mc / 2 + 1] : isym === 3 ? [(3 * mc) / 4 + 1, (3 * mc) / 4 + 1 + mc / 2] : isym === 4 ? [1, mc / 4 + 1] : [1, mc];
  const lumens = flux[0] > 0 ? flux[0] : null;
  const scale = conversion * (lumens ?? 1000) / 1000;
  /** @type {Map<number, Float64Array>} intensities by C angle */
  const planes = new Map();
  for (let p = mc1; p <= mc2; p++) {
    const values = new Float64Array(ng);
    for (let g = 0; g < ng; g++) values[g] = num() * scale;
    planes.set(cAngles[(p - 1) % mc], values);
  }
  /** The stored plane that gives the intensity in plane c under the file's symmetry. @param {number} c */
  const source = c => {
    const wrap = (/** @type {number} */ x) => ((x % 360) + 360) % 360;
    if (isym === 1) return planes.values().next().value;
    if (planes.has(c)) return planes.get(c);
    const candidates = isym === 2 ? [wrap(360 - c)] : isym === 3 ? [wrap(180 - c)] : isym === 4 ? [wrap(360 - c), wrap(180 - c), wrap(180 + c)] : [];
    for (const x of candidates) if (planes.has(x)) return planes.get(x);
    return undefined;
  };
  const horizontal = cAngles.slice();
  const candela = new Float64Array(mc * ng);
  horizontal.forEach((c, j) => {
    const values = source(c);
    if (!values) throw new PhotometryFileError(`${name} has no intensities for the C${c} plane under its symmetry.`);
    candela.set(values, j * ng);
  });
  return {
    format: 'ldt', version: 'EULUMDAT', type: 'C',
    keywords: { MANUFAC: company, LUMINAIRE: luminaire, LUMCAT: number, TEST: report, DATE: date, LAMP: kinds[0] ?? '' },
    vertical: gAngles, horizontal, candela,
    lampLumens: lumens,
    size: { width: width / 1000, length: length / 1000, height: height / 1000 },
    watts: watts[0] ?? 0,
  };
}
