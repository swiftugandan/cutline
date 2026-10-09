/** The road seen from above, with the vehicle on the left and the road running to the right: illuminance as a
 * picture on a colour scale, isolux lines, lane markings and distance marks. Coordinates are metres: x across the road
 * (the driver's right positive, drawn downwards), z ahead of the vehicle (drawn to the right). A road is long and
 * narrow, so running it across a wide viewport shows it largest. */

import { isoSegments } from './contours.js';
import { ISOLUX } from '../core/road.js';
import { PALETTES, colourAt, position } from './palettes.js';
import { formatLevel } from './beam-view.js';

/** @import { RoadResult } from '../core/road.js' */
/** @import { PaletteId, Range } from './palettes.js' */

/**
 * @typedef {{ scale: 'log' | 'linear', auto: boolean, min: number, max: number, palette: PaletteId | 'asphalt', contours: number[] }} RoadDisplay
 *   auto fits the range to the road; otherwise min and max (lx) hold.
 */

/** Light on asphalt, 0.1 to 100 lx on a log scale, with the classic isolux lines. @type {RoadDisplay} */
export const DEFAULT_ROAD_DISPLAY = { scale: 'log', auto: false, min: 0.1, max: 100, palette: 'asphalt', contours: ISOLUX };

/** The range a road display shows when the brightest point is peak. @param {RoadDisplay} d @param {number} peak @returns {Range} */
export function roadRange(d, peak) {
  if (!d.auto) return { scale: d.scale, min: d.min, max: d.max };
  const max = Math.max(peak, 1e-6);
  return d.scale === 'linear' ? { scale: 'linear', min: 0, max } : { scale: 'log', min: max / 1000, max };
}

export class RoadView {
  /** @param {HTMLCanvasElement} canvas */
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
    this.width = 0; this.height = 0;
    this.camera = { x: 0, z: 55, scale: 6 };
    /** @type {RoadResult | null} */
    this.road = null;
    /** @type {HTMLCanvasElement | null} */
    this.image = null;
    this.traffic = /** @type {'right' | 'left'} */ ('right');
    /** @type {RoadDisplay} */
    this.display = DEFAULT_ROAD_DISPLAY;
    /** @type {Range} */
    this.range = roadRange(this.display, 1);
    this.max = 1;
    this.frame = 0;
    /** Several views share one canvas; only the active one draws. */
    this.active = false;
    /** Pixels per CSS pixel, when drawing somewhere other than the screen; null follows the screen. @type {number | null} */
    this.dpr = null;
    /** The shell's drawing over the view, in CSS pixels. @type {((ctx: CanvasRenderingContext2D) => void) | null} */
    this.overlay = null;
    /** Draw without on-screen aids, for an exported image. */
    this.plain = false;
  }

  resize() {
    const dpr = this.dpr ?? (window.devicePixelRatio || 1);
    const r = this.canvas.getBoundingClientRect();
    this.width = r.width; this.height = r.height;
    this.canvas.width = Math.max(1, Math.round(r.width * dpr));
    this.canvas.height = Math.max(1, Math.round(r.height * dpr));
    this.request();
  }

  request() { if (!this.frame && this.active) this.frame = requestAnimationFrame(() => { this.frame = 0; this.draw(); }); }

  fit() {
    if (!this.width) return;
    const g = this.road?.grid ?? { xMin: -20, xMax: 20, zMin: 0, zMax: 140 };
    const w = g.xMax - g.xMin + 4, l = g.zMax - g.zMin + 12;
    this.camera = { x: (g.xMin + g.xMax) / 2, z: (g.zMin + g.zMax) / 2 + 2, scale: Math.min(this.width / l, this.height / w) };
    this.request();
  }

  /** @param {number} x @param {number} z */
  toScreen(x, z) { return [this.width / 2 + (z - this.camera.z) * this.camera.scale, this.height / 2 + (x - this.camera.x) * this.camera.scale]; }
  /** @param {number} sx @param {number} sy @returns {[number, number]} [x, z] */
  toRoad(sx, sy) { return [this.camera.x + (sy - this.height / 2) / this.camera.scale, this.camera.z + (sx - this.width / 2) / this.camera.scale]; }

  /** @param {number} factor @param {number} [sx] @param {number} [sy] */
  zoom(factor, sx = this.width / 2, sy = this.height / 2) {
    const [x, z] = this.toRoad(sx, sy);
    this.camera.scale = Math.min(200, Math.max(1, this.camera.scale * factor));
    const [x2, z2] = this.toRoad(sx, sy);
    this.camera.x += x - x2; this.camera.z += z - z2;
    this.request();
  }

  /** @param {number} dx @param {number} dy */
  pan(dx, dy) { this.camera.z -= dx / this.camera.scale; this.camera.x -= dy / this.camera.scale; this.request(); }

  /** @param {RoadResult} road @param {'right' | 'left'} traffic */
  setRoad(road, traffic) {
    this.road = road;
    this.traffic = traffic;
    this.rebuild();
  }

  /** @param {RoadDisplay} display */
  setDisplay(display) {
    this.display = display;
    this.rebuild();
  }

  rebuild() {
    const road = this.road;
    if (!road) return;
    this.max = road.lux.reduce((m, x) => (x > m ? x : m), 1e-9);
    this.range = roadRange(this.display, this.max);
    const stops = PALETTES[this.display.palette];
    // The image runs along the road: one column per step ahead, one row per step across, the driver's left at the top.
    const c = document.createElement('canvas');
    c.width = road.nz; c.height = road.nx;
    const ctx = /** @type {CanvasRenderingContext2D} */ (c.getContext('2d'));
    const img = ctx.createImageData(road.nz, road.nx);
    for (let iz = 0; iz < road.nz; iz++) for (let ix = 0; ix < road.nx; ix++) {
      const [r, g, b] = colourAt(stops, position(this.range, road.lux[iz * road.nx + ix]));
      const k = (ix * road.nz + iz) * 4;
      img.data[k] = r; img.data[k + 1] = g; img.data[k + 2] = b; img.data[k + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    this.image = c;
    this.request();
  }

  /** Lux at a road point. @param {number} x @param {number} z */
  luxAt(x, z) {
    const r = this.road;
    if (!r) return NaN;
    const ix = Math.round((x - r.grid.xMin) / r.grid.step), iz = Math.round((z - r.grid.zMin) / r.grid.step);
    if (ix < 0 || ix >= r.nx || iz < 0 || iz >= r.nz) return NaN;
    return r.lux[iz * r.nx + ix];
  }

  draw() {
    const { ctx } = this;
    const dpr = this.dpr ?? (window.devicePixelRatio || 1);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#14161a';
    ctx.fillRect(0, 0, this.width, this.height);
    const r = this.road;
    if (r && this.image) {
      const g = r.grid;
      const [x0, y0] = this.toScreen(g.xMin - g.step / 2, g.zMin - g.step / 2), [x1, y1] = this.toScreen(g.xMax + g.step / 2, g.zMax + g.step / 2);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(this.image, x0, y0, x1 - x0, y1 - y0);
    }
    this.drawMarkings();
    if (r) this.drawIsolux(r);
    this.drawDistances();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!this.plain) this.overlay?.(ctx);
  }

  drawMarkings() {
    const { ctx } = this;
    // Two 3.5 m lanes: the vehicle's own lane centred on x = 0, oncoming traffic on the other side.
    // Right-hand traffic: the kerb is at +1.75 m, the centre line at −1.75 m, oncoming traffic beyond it.
    const sign = this.traffic === 'right' ? -1 : 1;
    ctx.save();
    const own = 1.75 * -sign; // kerb side of the own lane
    const centre = 1.75 * sign;
    const far = centre + 3.5 * sign;
    for (const [x, dashed] of /** @type {[number, boolean][]} */ ([[own, false], [centre, true], [far, false]])) {
      ctx.strokeStyle = 'rgba(240, 240, 235, .55)';
      ctx.lineWidth = Math.max(1, 0.15 * this.camera.scale);
      ctx.setLineDash(dashed ? [3 * this.camera.scale, 6 * this.camera.scale] : []);
      const [sx0, sy] = this.toScreen(x, 0), [sx1] = this.toScreen(x, this.road?.grid.zMax ?? 150);
      ctx.beginPath(); ctx.moveTo(sx0, sy); ctx.lineTo(sx1, sy); ctx.stroke();
    }
    ctx.restore();
  }

  /** @param {RoadResult} r */
  drawIsolux(r) {
    const { ctx } = this;
    ctx.save();
    ctx.font = '500 11px Barlow, sans-serif';
    const levels = this.display.contours.filter(l => l > 0 && l <= this.max);
    for (const level of levels) {
      const seg = isoSegments(r.lux, r.nx, r.nz, level);
      ctx.strokeStyle = level >= 10 ? 'rgba(242, 194, 48, .95)' : 'rgba(242, 194, 48, .6)';
      ctx.lineWidth = level === 3 ? 1.8 : 1.1;
      ctx.beginPath();
      for (let i = 0; i < seg.length; i += 4) {
        const [x1, y1] = this.toScreen(r.grid.xMin + seg[i] * r.grid.step, r.grid.zMin + seg[i + 1] * r.grid.step);
        const [x2, y2] = this.toScreen(r.grid.xMin + seg[i + 2] * r.grid.step, r.grid.zMin + seg[i + 3] * r.grid.step);
        ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
      }
      ctx.stroke();
      // The label sits where the line crosses the road's centre line furthest ahead.
      const centre = Math.round((0 - r.grid.xMin) / r.grid.step);
      let far = 0;
      for (let iz = 0; iz < r.nz; iz++) if (r.lux[iz * r.nx + centre] >= level) far = r.grid.zMin + iz * r.grid.step;
      if (far > 0) {
        const [lx, ly] = this.toScreen(0, far);
        ctx.fillStyle = 'rgba(242, 194, 48, .95)';
        ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(11, 13, 17, .8)'; ctx.lineJoin = 'round';
        // Labels alternate above and below the centre line, so neighbouring levels do not overlap.
        const above = levels.indexOf(level) % 2 === 0;
        ctx.save(); ctx.translate(lx + 3, ly + (above ? -5 : 13)); ctx.rotate(0);
        ctx.strokeText(`${formatLevel(level)} lx`, 0, 0);
        ctx.fillText(`${formatLevel(level)} lx`, 0, 0);
        ctx.restore();
      }
    }
    ctx.restore();
  }

  drawDistances() {
    const { ctx } = this;
    ctx.save();
    ctx.font = '11px Barlow, sans-serif';
    ctx.fillStyle = 'rgba(195, 202, 214, .8)';
    ctx.strokeStyle = 'rgba(195, 202, 214, .12)';
    const zMax = this.road?.grid.zMax ?? 140;
    const step = this.camera.scale < 3 ? 50 : this.camera.scale < 8 ? 20 : 10;
    for (let z = 0; z <= zMax; z += step) {
      const [x] = this.toScreen(0, z);
      ctx.beginPath(); ctx.moveTo(Math.round(x) + .5, 0); ctx.lineTo(Math.round(x) + .5, this.height); ctx.stroke();
      if (x > 6 && x < this.width - 30) ctx.fillText(`${z} m`, x + 4, this.height - 8);
    }
    ctx.restore();
  }
}
