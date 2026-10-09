/** IES LM-63 photometric files: reading every published edition (1986, 1991, 1995, 2002, 2019) and writing LM-63-2002
 * Type A files. A file's angles stay in its own photometric system here; distribution.js maps them to Cutline's frame.
 * See docs/PHYSICS.md, "Imported light distributions". */

/** @import { Distribution, PhotometricType } from './distribution.js' */

const TYPES = /** @type {Record<number, PhotometricType>} */ ({ 1: 'C', 2: 'B', 3: 'A' });

/** A file Cutline cannot read, with a message the user can act on. */
export class PhotometryFileError extends Error {
  /** @param {string} message */
  constructor(message) { super(message); this.name = 'PhotometryFileError'; }
}

/**
 * Reads an IES LM-63 file.
 * @param {string} text the file's contents @param {string} [name] the file name, for messages
 * @returns {Distribution}
 */
export function parseIes(text, name = 'The file') {
  const lines = text.replace(/^﻿/, '').split(/\r\n|\r|\n/);
  let i = 0;
  let version = 'LM-63-1986';
  const first = lines[0]?.trim() ?? '';
  if (/^IESNA\s*:?\s*LM-63-(\d{4})/i.test(first)) { version = `LM-63-${/** @type {RegExpMatchArray} */ (first.match(/(\d{4})/))[1]}`; i = 1; }
  else if (/^IESNA91/i.test(first)) { version = 'LM-63-1991'; i = 1; }
  /** @type {Record<string, string>} */
  const keywords = {};
  let last = '';
  for (; i < lines.length; i++) {
    const line = lines[i].trim();
    if (/^TILT\s*=/i.test(line)) break;
    const m = line.match(/^\[([^\]]+)\]\s*(.*)$/);
    if (m) {
      const key = m[1].toUpperCase();
      if (key === 'MORE' && last) keywords[last] += ` ${m[2]}`;
      else { keywords[key] = keywords[key] ? `${keywords[key]} ${m[2]}` : m[2]; last = key; }
    } else if (line && version === 'LM-63-1986') keywords.TEST = keywords.TEST ? `${keywords.TEST} ${line}` : line;
  }
  if (i >= lines.length) throw new PhotometryFileError(`${name} is not an IES file: it has no TILT line.`);
  const tilt = lines[i].trim().replace(/^TILT\s*=\s*/i, '').toUpperCase();
  const tokens = lines.slice(i + 1).join(' ').split(/[\s,]+/).filter(Boolean);
  let k = 0;
  const next = () => {
    if (k >= tokens.length) throw new PhotometryFileError(`${name} ends early: the IES data is incomplete.`);
    const value = Number(tokens[k++]);
    if (!Number.isFinite(value)) throw new PhotometryFileError(`${name} has a value that is not a number ("${tokens[k - 1]}").`);
    return value;
  };
  if (tilt === 'INCLUDE') {
    next(); // lamp-to-luminaire geometry
    const n = next();
    k += 2 * n;
  } else if (tilt !== 'NONE') {
    // A separate tilt file only matters for lamps that change output with tilt; the distribution itself is complete.
    keywords['TILT FILE'] = tilt;
  }
  const lampCount = next(), lumensPerLamp = next(), multiplier = next();
  const nv = next(), nh = next(), typeCode = next(), units = next();
  const width = next(), length = next(), height = next();
  const ballast = next(), blpf = next(), watts = next();
  const type = TYPES[typeCode];
  if (!type) throw new PhotometryFileError(`${name} has photometric type ${typeCode}; IES files use 1 (Type C), 2 (Type B) or 3 (Type A).`);
  if (!(nv >= 1 && nh >= 1 && Number.isInteger(nv) && Number.isInteger(nh))) throw new PhotometryFileError(`${name} gives ${nv} vertical and ${nh} horizontal angles.`);
  if (nv * nh > 4_000_000) throw new PhotometryFileError(`${name} has ${nv} × ${nh} values, more than Cutline reads (4 million).`);
  const vertical = Array.from({ length: nv }, next), horizontal = Array.from({ length: nh }, next);
  checkAscending(vertical, 'vertical', name); checkAscending(horizontal, 'horizontal', name);
  // Before LM-63-2002 the second of these three numbers was the ballast-lamp photometric factor, which scales the candela.
  const older = /19(86|91|95)/.test(version);
  const scale = multiplier * ballast * (older ? blpf : 1);
  const candela = new Float64Array(nv * nh);
  for (let j = 0; j < nh; j++) for (let v = 0; v < nv; v++) candela[j * nv + v] = next() * scale;
  const toMetres = units === 1 ? 0.3048 : 1;
  return {
    format: 'ies', version, type, keywords, vertical, horizontal, candela,
    lampLumens: lumensPerLamp > 0 ? lumensPerLamp * lampCount : null,
    size: { width: Math.abs(width) * toMetres, length: Math.abs(length) * toMetres, height: Math.abs(height) * toMetres },
    watts,
  };
}

/** @param {number[]} values @param {string} which @param {string} name */
function checkAscending(values, which, name) {
  for (let i = 1; i < values.length; i++) if (!(values[i] > values[i - 1])) throw new PhotometryFileError(`${name} lists its ${which} angles out of order at ${values[i]}°.`);
}

/**
 * Writes a Type A LM-63-2002 file: horizontal angles about the vertical axis, vertical angles of elevation, the
 * frame Cutline itself uses.
 * @param {{ title: string, keywords?: Record<string, string>, horizontal: number[], vertical: number[], candela: (h: number, v: number) => number, lumens?: number }} data
 */
export function writeIesTypeA({ title, keywords = {}, horizontal, vertical, candela, lumens }) {
  /** @param {string} s */
  const clean = s => s.replace(/[\r\n]+/g, ' ').slice(0, 250);
  const out = ['IESNA:LM-63-2002', `[TEST] ${clean(title)}`, ...Object.entries(keywords).map(([k, v]) => `[${k.toUpperCase()}] ${clean(v)}`), 'TILT=NONE'];
  out.push(`1 ${lumens && lumens > 0 ? lumens.toFixed(1) : -1} 1 ${vertical.length} ${horizontal.length} 3 2 0 0 0`, '1 1 0');
  /** @param {number[]} values @param {number} digits */
  const wrap = (values, digits) => {
    for (let i = 0; i < values.length; i += 10) out.push(values.slice(i, i + 10).map(x => +x.toFixed(digits)).join(' '));
  };
  wrap(vertical, 3);
  wrap(horizontal, 3);
  for (const h of horizontal) wrap(vertical.map(v => Math.max(0, candela(h, v))), 1);
  return out.join('\r\n') + '\r\n';
}
