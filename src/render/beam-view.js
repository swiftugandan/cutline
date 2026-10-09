/** The beam pattern: intensity in every direction, or illuminance on a screen 25 m away, drawn in a palette on a
 * scale the user controls, with contour lines, the intended cut-off, the regulation's test points and zones, and an
 * optional uniformity map that shows each direction against its surroundings. Coordinates are degrees (H, V). */

import { gridSize } from '../core/tracer.js';
import { localRatio } from '../core/uniformity.js';
import { CONTOUR_LEVELS, screenLux } from '../core/photometry.js';
import { isoSegments } from './contours.js';
import { PALETTES, colourAt, position } from './palettes.js';

/** @import { GridSpec } from '../core/types.js' */
/** @import { PaletteId, Range } from './palettes.js' */
/** @import { Dip } from '../core/uniformity.js' */

/**
 * @typedef {{ spec: GridSpec, candela: Float64Array }} BeamLayer
 * @typedef {'pass' | 'fail' | 'near' | 'info' | 'blocked'} MarkStatus
 * @typedef {{ id: string, label: string, h: number, v: number, status: MarkStatus }} BeamMarker
 * @typedef {{ id: string, label: string, polygon: number[], status: MarkStatus }} BeamZone
 * @typedef {{ id: string, label: string, h0: number, v0: number, h1: number, v1: number, status: MarkStatus }} BeamLine
 * @typedef {{ quantity: 'intensity' | 'illuminance', scale: 'log' | 'linear', auto: boolean, min: number, max: number,
 *   palette: PaletteId, contours: number[], mode: 'light' | 'uniformity', featureDeg: number }} BeamDisplay
 *   quantity: candela, or lux on a flat screen 25 m away. auto fits the range to the beam; otherwise min and max hold.
 *   contours are in the quantity's unit. mode 'uniformity' colours each direction by its ratio to the average within
 *   featureDeg around it.
 */

/** @type {BeamDisplay} */
export const DEFAULT_DISPLAY = { quantity: 'intensity', scale: 'log', auto: true, min: 10, max: 100000, palette: 'night', contours: CONTOUR_LEVELS, mode: 'light', featureDeg: 1 };

/** The range a display shows for a beam whose brightest value is peak. @param {BeamDisplay} d @param {number} peak @returns {Range} */
export function displayRange(d, peak) {
  if (!d.auto) return { scale: d.scale, min: d.min, max: d.max };
  const max = Math.max(peak, 1e-6);
  if (d.scale === 'linear') return { scale: 'linear', min: 0, max };
  return { scale: 'log', min: d.quantity === 'intensity' && max > 1000 ? 10 : max / 1e4, max };
}

/** Directions outside an imported file: a flat slate, unlike the dark end of any palette. */
const NO_DATA = /** @type {[number, number, number]} */ ([44, 47, 56]);

const STATUS = { pass: '#51cf66', fail: '#ff6b6b', near: '#f2c230', info: '#c3cad6', blocked: '#c3cad6' };

export class BeamView {
  /** @param {HTMLCanvasElement} canvas */
  constructor(canvas) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available in this browser.');
    this.ctx = ctx;
    this.width = 0; this.height = 0;
    this.camera = { h: 0, v: -2, scale: 14 };
    /** @type {BeamLayer[]} */
    this.layers = [];
    /** The displayed quantity per layer: candela, or lux on the screen. @type {Float64Array[]} */
    this.values = [];
    /** Each layer's ratio to its surroundings, in uniformity mode. @type {(Float64Array | null)[]} */
    this.ratios = [];
    /** @type {{ canvas: HTMLCanvasElement, spec: GridSpec }[]} */
    this.images = [];
    /** The brightest displayed value. */
    this.max = 1;
    /** @type {BeamDisplay} */
    this.display = { ...DEFAULT_DISPLAY };
    /** @type {Range} */
    this.range = displayRange(this.display, 1);
    /** @type {BeamMarker[]} */
    this.markers = [];
    /** @type {BeamZone[]} */
    this.zones = [];
    /** @type {BeamLine[]} */
    this.lines = [];
    /** Dark patches found in uniformity mode, drawn as numbered boxes. @type {Dip[]} */
    this.dips = [];
    /** The requirement picked in a compliance table, drawn emphasised. @type {string | null} */
    this.selected = null;
    /** @type {number[]} flat [h, v, …] of the intended cut-off */
    this.cutoff = [];
    this.showContours = true;
    this.hasNoData = false;
    /** Width covered by a panel on the right of the view, kept clear of contour labels (px). */
    this.reserveRight = 0;
    /** The default framing: H ±45° and V −14° to +8°. */
    this.frame = { h: 0, v: -3, width: 92, height: 24 };
    this.raf = 0;
    /** Several views share one canvas; only the active one draws. */
    this.active = false;
    /** Pixels per CSS pixel, when drawing somewhere other than the screen; null follows the screen. @type {number | null} */
    this.dpr = null;
  }

  resize() {
    const dpr = this.dpr ?? (window.devicePixelRatio || 1);
    const r = this.canvas.getBoundingClientRect();
    this.width = r.width; this.height = r.height;
    this.canvas.width = Math.max(1, Math.round(r.width * dpr));
    this.canvas.height = Math.max(1, Math.round(r.height * dpr));
    this.request();
  }

  request() {
    if (this.raf || !this.active) return;
    this.raf = requestAnimationFrame(() => { this.raf = 0; this.draw(); });
  }

  fit() {
    if (!this.width) return;
    this.camera = { h: this.frame.h, v: this.frame.v, scale: Math.min(this.width / this.frame.width, this.height / this.frame.height) };
    this.request();
  }

  /** @param {number} h @param {number} v */
  toScreen(h, v) { return [this.width / 2 + (h - this.camera.h) * this.camera.scale, this.height / 2 - (v - this.camera.v) * this.camera.scale]; }
  /** @param {number} x @param {number} y */
  toAngles(x, y) { return [this.camera.h + (x - this.width / 2) / this.camera.scale, this.camera.v - (y - this.height / 2) / this.camera.scale]; }

  /** @param {number} factor @param {number} [x] @param {number} [y] */
  zoom(factor, x = this.width / 2, y = this.height / 2) {
    const [h, v] = this.toAngles(x, y);
    this.camera.scale = Math.min(400, Math.max(2, this.camera.scale * factor));
    const [h2, v2] = this.toAngles(x, y);
    this.camera.h += h - h2; this.camera.v += v - v2;
    this.request();
  }

  /** @param {number} dx @param {number} dy */
  pan(dx, dy) { this.camera.h -= dx / this.camera.scale; this.camera.v += dy / this.camera.scale; this.request(); }

  /** New beam data. @param {BeamLayer[]} layers */
  setBeam(layers) {
    this.layers = layers;
    this.rebuild();
  }

  /** New display settings. @param {BeamDisplay} display */
  setDisplay(display) {
    this.display = display;
    this.rebuild();
  }

  /** Converts the layers to the displayed quantity and paints each into an offscreen image once; drawing then only scales it. */
  rebuild() {
    const d = this.display;
    this.values = this.layers.map(({ spec, candela }) => {
      if (d.quantity === 'intensity') return candela;
      const { nh, nv } = gridSize(spec);
      const out = new Float64Array(nh * nv);
      for (let r = 0; r < nv; r++) for (let c = 0; c < nh; c++) out[r * nh + c] = screenLux(candela[r * nh + c], spec.hMin + (c + 0.5) * spec.step, spec.vMin + (r + 0.5) * spec.vStep);
      return out;
    });
    this.max = Math.max(1e-9, ...this.values.map(v => v.reduce((m, x) => (x > m ? x : m), 0)));
    /** Whether any direction lies outside the file, for the legend. */
    this.hasNoData = this.values.some(v => v.some(x => !Number.isFinite(x)));
    this.range = displayRange(d, this.max);
    // Uniformity: below the bottom of the scale the beam is dark, and its ratio to the surroundings means nothing.
    const floor = this.range.scale === 'log' ? this.range.min : Math.max(this.range.min, this.max * 0.01);
    this.ratios = this.layers.map(({ spec }, k) => {
      if (d.mode !== 'uniformity') return null;
      const { nh, nv } = gridSize(spec);
      return localRatio(this.values[k], nh, nv, Math.max(1, Math.round(d.featureDeg / spec.step)), Math.max(1, Math.round(d.featureDeg / spec.vStep)), floor);
    });
    this.images = this.layers.map(({ spec }, k) => {
      const { nh, nv } = gridSize(spec);
      const c = document.createElement('canvas');
      c.width = nh; c.height = nv;
      const ctx = /** @type {CanvasRenderingContext2D} */ (c.getContext('2d'));
      const img = ctx.createImageData(nh, nv);
      const values = this.values[k], ratio = this.ratios[k];
      const stops = PALETTES[d.palette];
      for (let row = 0; row < nv; row++) for (let col = 0; col < nh; col++) {
        const i = row * nh + col;
        let rgb;
        if (ratio) {
          const x = ratio[i];
          // Half as bright as the surroundings at the bottom of the palette, twice as bright at the top.
          rgb = Number.isFinite(x) ? colourAt(PALETTES.contrast, 0.5 + Math.log2(Math.max(x, 1e-6)) / 2) : Number.isFinite(values[i]) ? colourAt(PALETTES.grey, Math.max(0, position(this.range, values[i])) * 0.18) : NO_DATA;
        } else rgb = Number.isFinite(values[i]) ? colourAt(stops, position(this.range, values[i])) : NO_DATA;
        // The image's top row is the highest V.
        const p = ((nv - 1 - row) * nh + col) * 4;
        img.data[p] = rgb[0]; img.data[p + 1] = rgb[1]; img.data[p + 2] = rgb[2]; img.data[p + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
      return { canvas: c, spec };
    });
    this.request();
  }

  /** The layer and cell that hold a direction, finest first. @param {number} h @param {number} v */
  cellAt(h, v) {
    let best = -1;
    this.layers.forEach((l, k) => {
      const s = l.spec;
      if (h < s.hMin || h >= s.hMax || v < s.vMin || v >= s.vMax) return;
      if (best < 0 || s.step * s.vStep < this.layers[best].spec.step * this.layers[best].spec.vStep) best = k;
    });
    if (best < 0) return null;
    const s = this.layers[best].spec, { nh } = gridSize(s);
    return { k: best, i: Math.floor((v - s.vMin) / s.vStep) * nh + Math.floor((h - s.hMin) / s.step) };
  }

  /** Intensity at a direction from the finest layer that covers it. @param {number} h @param {number} v */
  candelaAt(h, v) {
    const cell = this.cellAt(h, v);
    return cell ? this.layers[cell.k].candela[cell.i] : NaN;
  }

  /** The displayed quantity and, in uniformity mode, the ratio to the surroundings. @param {number} h @param {number} v */
  valueAt(h, v) {
    const cell = this.cellAt(h, v);
    if (!cell) return { value: NaN, ratio: NaN };
    return { value: this.values[cell.k][cell.i], ratio: this.ratios[cell.k]?.[cell.i] ?? NaN };
  }

  draw() {
    const { ctx } = this;
    const dpr = this.dpr ?? (window.devicePixelRatio || 1);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#0b0d11';
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.imageSmoothingEnabled = this.camera.scale < 20;
    for (const { canvas, spec } of this.images) {
      const [x0, y0] = this.toScreen(spec.hMin, spec.vMax), [x1, y1] = this.toScreen(spec.hMax, spec.vMin);
      ctx.drawImage(canvas, x0, y0, x1 - x0, y1 - y0);
    }
    this.drawAxes();
    if (this.showContours && this.display.mode === 'light') this.drawContours();
    this.drawDips();
    this.drawZones();
    this.drawLines();
    this.drawCutoff();
    this.drawMarkers();
  }

  drawLines() {
    const { ctx } = this;
    ctx.save();
    ctx.lineCap = 'round';
    for (const s of this.lines) {
      const [x0, y0] = this.toScreen(s.h0, s.v0), [x1, y1] = this.toScreen(s.h1, s.v1);
      const picked = s.id === this.selected;
      ctx.strokeStyle = '#0b0d11'; ctx.lineWidth = picked ? 6 : 4;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      ctx.strokeStyle = STATUS[s.status]; ctx.lineWidth = picked ? 3 : 1.6;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      if (picked) this.label(s.label, Math.max(Math.min(x0, x1), Math.min(Math.max(x0, x1), this.width / 2)), (y0 + y1) / 2);
    }
    ctx.restore();
  }

  drawDips() {
    if (!this.dips.length || this.display.mode !== 'uniformity') return;
    const { ctx } = this;
    ctx.save();
    ctx.font = '600 11px Barlow, sans-serif';
    this.dips.forEach((d, n) => {
      const [x0, y0] = this.toScreen(d.h0, d.v1), [x1, y1] = this.toScreen(d.h1, d.v0);
      const picked = this.selected === `dip-${n + 1}`;
      ctx.strokeStyle = picked ? '#ffffff' : 'rgba(150, 190, 255, .9)';
      ctx.lineWidth = picked ? 2 : 1.2;
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(Math.min(x0, x1) - 2, Math.min(y0, y1) - 2, Math.abs(x1 - x0) + 4, Math.abs(y1 - y0) + 4);
      ctx.setLineDash([]);
      this.label(String(n + 1), Math.max(x0, x1) - 6, Math.min(y0, y1) + 4);
    });
    ctx.restore();
  }

  /** A label with a dark halo, so it reads on bright and dark parts of the beam. @param {string} text @param {number} x @param {number} y */
  label(text, x, y) {
    const { ctx } = this;
    ctx.font = '600 12px Barlow, sans-serif';
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(11, 13, 17, .85)'; ctx.lineJoin = 'round';
    ctx.strokeText(text, x + 8, y - 8);
    ctx.fillStyle = '#edf0f4';
    ctx.fillText(text, x + 8, y - 8);
  }

  drawAxes() {
    const { ctx } = this;
    const [h0, v1] = this.toAngles(0, 0), [h1, v0] = this.toAngles(this.width, this.height);
    const step = this.camera.scale > 60 ? 1 : this.camera.scale > 18 ? 2 : this.camera.scale > 6 ? 5 : 10;
    ctx.lineWidth = 1;
    ctx.font = '11px Barlow, sans-serif';
    /** @type {[string, number, number][]} */
    const labels = [];
    for (let h = Math.ceil(h0 / step) * step; h <= h1; h += step) {
      const [x] = this.toScreen(h, 0);
      ctx.strokeStyle = h === 0 ? 'rgba(195, 202, 214, .45)' : 'rgba(195, 202, 214, .1)';
      ctx.beginPath(); ctx.moveTo(Math.round(x) + .5, 0); ctx.lineTo(Math.round(x) + .5, this.height); ctx.stroke();
      if (x > 34) labels.push([`${h > 0 ? h + 'R' : h < 0 ? -h + 'L' : '0'}`, x + 3, this.height - 6]);
    }
    for (let v = Math.ceil(v0 / step) * step; v <= v1; v += step) {
      const [, y] = this.toScreen(0, v);
      ctx.strokeStyle = v === 0 ? 'rgba(195, 202, 214, .45)' : 'rgba(195, 202, 214, .1)';
      ctx.beginPath(); ctx.moveTo(0, Math.round(y) + .5); ctx.lineTo(this.width, Math.round(y) + .5); ctx.stroke();
      // Labels clear the legend at the top and the H labels at the bottom.
      if (y > 52 && y < this.height - 24) labels.push([`${v > 0 ? v + 'U' : v < 0 ? -v + 'D' : '0'}`, 6, y - 3]);
    }
    // A dark halo keeps the labels readable over the brightest part of the beam.
    ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(11, 13, 17, .7)'; ctx.fillStyle = 'rgba(214, 220, 230, .9)';
    for (const [text, x, y] of labels) { ctx.strokeText(text, x, y); ctx.fillText(text, x, y); }
  }

  drawContours() {
    const { ctx } = this;
    ctx.save();
    ctx.lineWidth = 1;
    ctx.font = '500 10px Barlow, sans-serif';
    const unit = this.display.quantity === 'intensity' ? 'cd' : 'lx';
    /** @type {Map<number, [number, number][]>} points on each level's line where its label could go */
    const candidates = new Map();
    const levels = this.display.contours.filter(l => l > 0 && l <= this.max);
    const top = levels.length ? Math.max(...levels) : 1;
    this.layers.forEach((layer, k) => {
      const { nh, nv } = gridSize(layer.spec);
      const s = layer.spec;
      // The wide layer draws only outside the fine one, so lines are not drawn twice.
      const finer = this.layers.find((l, j) => j !== k && l.spec.step * l.spec.vStep < s.step * s.vStep);
      for (const level of levels) {
        const seg = isoSegments(this.values[k], nh, nv, level);
        ctx.strokeStyle = `rgba(242, 194, 48, ${level >= top / 4 ? 0.65 : 0.4})`;
        ctx.beginPath();
        const spots = candidates.get(level) ?? [];
        for (let i = 0; i < seg.length; i += 4) {
          const ha = s.hMin + (seg[i] + 0.5) * s.step, va = s.vMin + (seg[i + 1] + 0.5) * s.vStep;
          const hb = s.hMin + (seg[i + 2] + 0.5) * s.step, vb = s.vMin + (seg[i + 3] + 0.5) * s.vStep;
          if (finer && inSpec(finer.spec, (ha + hb) / 2, (va + vb) / 2)) continue;
          const [x1, y1] = this.toScreen(ha, va), [x2, y2] = this.toScreen(hb, vb);
          ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
          if (x2 > 40 && x2 < this.width - this.reserveRight - 60 && y2 > 50 && y2 < this.height - 24) spots.push([x2, y2]);
        }
        candidates.set(level, spots);
        ctx.stroke();
      }
    });
    if (this.camera.scale > 8) {
      // Each level's label goes to the rightmost point on its line that does not cover a label already placed.
      ctx.fillStyle = 'rgba(242, 194, 48, .95)';
      ctx.strokeStyle = 'rgba(11, 13, 17, .8)'; ctx.lineWidth = 3; ctx.lineJoin = 'round';
      /** @type {[number, number, number, number][]} */
      const placed = [];
      for (const level of [...levels].sort((a, b) => b - a)) {
        const text = `${formatLevel(level)} ${unit}`;
        const w = ctx.measureText(text).width + 6, ht = 13;
        const spots = (candidates.get(level) ?? []).sort((a, b) => b[0] - a[0]);
        for (let i = 0; i < spots.length; i += Math.max(1, Math.floor(spots.length / 60))) {
          const [x, y] = spots[i];
          const box = /** @type {[number, number, number, number]} */ ([x + 1, y - 12, x + 1 + w, y - 12 + ht]);
          if (placed.some(p => box[0] < p[2] && box[2] > p[0] && box[1] < p[3] && box[3] > p[1])) continue;
          placed.push(box);
          ctx.strokeText(text, x + 3, y - 2); ctx.fillText(text, x + 3, y - 2);
          break;
        }
      }
    }
    ctx.restore();
  }

  drawCutoff() {
    if (this.cutoff.length < 4) return;
    const { ctx } = this;
    ctx.save();
    ctx.strokeStyle = 'rgba(242, 194, 48, .9)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    for (let i = 0; i < this.cutoff.length; i += 2) {
      const [x, y] = this.toScreen(this.cutoff[i], this.cutoff[i + 1]);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  drawZones() {
    const { ctx } = this;
    ctx.save();
    ctx.lineWidth = 1.2;
    for (const z of this.zones) {
      const picked = z.id === this.selected;
      ctx.strokeStyle = STATUS[z.status];
      ctx.lineWidth = picked ? 2.4 : 1.2;
      ctx.globalAlpha = picked ? 1 : 0.85;
      ctx.beginPath();
      for (let i = 0; i < z.polygon.length; i += 2) {
        const [x, y] = this.toScreen(z.polygon[i], z.polygon[i + 1]);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    }
    ctx.restore();
  }

  drawMarkers() {
    const { ctx } = this;
    ctx.save();
    ctx.font = '500 11px Barlow, sans-serif';
    for (const m of this.markers) {
      const [x, y] = this.toScreen(m.h, m.v);
      if (x < -20 || y < -20 || x > this.width + 20 || y > this.height + 20) continue;
      const picked = m.id === this.selected;
      ctx.beginPath(); ctx.arc(x, y, picked ? 6.5 : 4.5, 0, Math.PI * 2);
      ctx.fillStyle = STATUS[m.status]; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = '#0b0d11'; ctx.stroke();
      if (picked) { ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.strokeStyle = STATUS[m.status]; ctx.lineWidth = 1.5; ctx.stroke(); }
      if (picked) this.label(m.label, x, y);
      else if (this.camera.scale > 22) {
        ctx.fillStyle = 'rgba(237, 240, 244, .92)';
        ctx.fillText(m.label, x + 7, y - 6);
      }
    }
    ctx.restore();
  }

  /** The nearest marker within reach of a screen point. @param {number} x @param {number} y */
  markerAt(x, y) {
    let best = null, bestD = 10;
    for (const m of this.markers) {
      const [mx, my] = this.toScreen(m.h, m.v);
      const d = Math.hypot(mx - x, my - y);
      if (d < bestD) { bestD = d; best = m; }
    }
    return best;
  }
}

/** @param {GridSpec} s @param {number} h @param {number} v */
function inSpec(s, h, v) { return h >= s.hMin && h <= s.hMax && v >= s.vMin && v <= s.vMax; }

/** A contour level as a short label. @param {number} x */
export function formatLevel(x) {
  if (x >= 10000) return `${+(x / 1000).toPrecision(3)}k`;
  return x >= 100 ? String(Math.round(x)) : String(+x.toPrecision(2));
}
