/** Colour maps for the beam and road views, and the scale that maps a value onto them. A palette is a list of stops,
 * each a position from 0 to 1 and an sRGB colour. */

/** @typedef {'night' | 'heat' | 'spectrum' | 'grey'} PaletteId */
/** @typedef {[number, [number, number, number]][]} Stops */

/** @type {Record<PaletteId | 'asphalt' | 'contrast', Stops>} */
export const PALETTES = {
  /** Light on a dark wall: night, blue-grey, then white. */
  night: [[0, [11, 13, 17]], [0.3, [24, 36, 58]], [0.6, [92, 122, 168]], [0.85, [205, 220, 245]], [1, [255, 255, 255]]],
  /** Black through red and orange to pale yellow: even steps in lightness, so equal steps of value look equal. */
  heat: [[0, [0, 0, 4]], [0.2, [40, 11, 84]], [0.4, [101, 21, 110]], [0.6, [159, 42, 99]], [0.7, [212, 72, 66]], [0.85, [245, 125, 21]], [0.95, [250, 193, 39]], [1, [252, 255, 164]]],
  /** False colour, blue to red through green: the hue changes quickly, so small differences in a flat area show. */
  spectrum: [[0, [48, 18, 59]], [0.13, [65, 69, 171]], [0.25, [62, 155, 254]], [0.38, [24, 214, 203]], [0.5, [70, 247, 131]], [0.63, [162, 252, 60]], [0.75, [225, 220, 55]], [0.87, [254, 155, 45]], [0.95, [228, 76, 14]], [1, [122, 4, 3]]],
  grey: [[0, [8, 9, 11]], [1, [255, 255, 255]]],
  /** Light on asphalt: dark grey to warm white. */
  asphalt: [[0, [20, 22, 26]], [0.4, [70, 66, 58]], [0.75, [190, 176, 140]], [1, [255, 248, 225]]],
  /** Uniformity: darker than the surroundings in blue, brighter in orange, even light in dim grey. */
  contrast: [[0, [70, 140, 255]], [0.3, [40, 80, 160]], [0.5, [34, 37, 43]], [0.7, [170, 90, 30]], [1, [255, 170, 60]]],
};

export const PALETTE_NAMES = { night: 'Night', heat: 'Heat', spectrum: 'False colour', grey: 'Grey' };

/** @param {Stops} stops @param {number} t 0–1 @returns {[number, number, number]} */
export function colourAt(stops, t) {
  const x = Math.min(1, Math.max(0, Number.isFinite(t) ? t : 0));
  for (let i = 1; i < stops.length; i++) {
    const [t1, c1] = stops[i], [t0, c0] = stops[i - 1];
    if (x <= t1) { const f = (x - t0) / (t1 - t0); return [Math.round(c0[0] + (c1[0] - c0[0]) * f), Math.round(c0[1] + (c1[1] - c0[1]) * f), Math.round(c0[2] + (c1[2] - c0[2]) * f)]; }
  }
  return stops[stops.length - 1][1];
}

/** A CSS gradient through a palette, for legends. @param {Stops} stops @param {string} [direction] */
export function cssGradient(stops, direction = 'to top') {
  return `linear-gradient(${direction}, ${stops.map(([t, [r, g, b]]) => `rgb(${r}, ${g}, ${b}) ${Math.round(t * 100)}%`).join(', ')})`;
}

/**
 * @typedef {{ scale: 'log' | 'linear', min: number, max: number }} Range
 *   The values at the bottom and top of the palette. On a log scale min must be above zero.
 */

/**
 * Where a value sits on a range, from 0 at min to 1 at max.
 * @param {Range} range @param {number} value
 */
export function position(range, value) {
  if (range.scale === 'log') {
    if (!(value > 0)) return 0;
    const lo = Math.log10(Math.max(range.min, 1e-9)), hi = Math.log10(Math.max(range.max, range.min * 1.0001, 1e-9));
    return (Math.log10(value) - lo) / (hi - lo);
  }
  return (value - range.min) / Math.max(1e-12, range.max - range.min);
}

/** The value at a position on a range. @param {Range} range @param {number} t */
export function valueAt(range, t) {
  if (range.scale === 'log') {
    const lo = Math.log10(Math.max(range.min, 1e-9)), hi = Math.log10(Math.max(range.max, 1e-9));
    return 10 ** (lo + t * (hi - lo));
  }
  return range.min + t * (range.max - range.min);
}

/**
 * Round tick values for a range's legend.
 * @param {Range} range @returns {number[]}
 */
export function ticks(range) {
  if (range.scale === 'log') {
    const out = [];
    for (let e = Math.floor(Math.log10(Math.max(range.min, 1e-9))); e <= Math.ceil(Math.log10(Math.max(range.max, 1e-9))); e++) {
      for (const m of [1, 2, 5]) { const v = m * 10 ** e; if (v >= range.min * 0.999 && v <= range.max * 1.001) out.push(v); }
    }
    return out.length > 8 ? out.filter(v => Math.abs(Math.log10(v) - Math.round(Math.log10(v))) < 1e-9) : out;
  }
  const span = range.max - range.min;
  const p = 10 ** Math.floor(Math.log10(Math.max(span, 1e-12) / 5));
  const step = [1, 2, 5, 10].map(m => m * p).find(s => span / s <= 6) ?? 10 * p;
  const out = [];
  for (let v = Math.ceil(range.min / step) * step; v <= range.max + step * 1e-9; v += step) out.push(+v.toPrecision(12));
  return out;
}
