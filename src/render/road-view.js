/** The road seen from above: illuminance from both lamps as light on asphalt, isolux lines, lane markings and
 * distance marks. Coordinates are metres: x across the road (right positive), z ahead of the vehicle. */

import { isoSegments } from './contours.js';
import { ISOLUX } from '../core/road.js';

/** @import { RoadResult } from '../core/road.js' */

/** Light on asphalt: dark grey to warm white, on a log scale of lux. @param {number} lux */
function asphalt(lux) {
  const t = lux > 0.1 ? Math.min(1, (Math.log10(lux) + 1) / 3) : 0;
  const stops = [[0, [20, 22, 26]], [0.4, [70, 66, 58]], [0.75, [190, 176, 140]], [1, [255, 248, 225]]];
  for (let i = 1; i < stops.length; i++) {
    const [t1, c1] = /** @type {[number, number[]]} */ (stops[i]), [t0, c0] = /** @type {[number, number[]]} */ (stops[i - 1]);
    if (t <= t1) { const f = (t - t0) / (t1 - t0); return c0.map((c, k) => Math.round(c + (c1[k] - c) * f)); }
  }
  return [255, 248, 225];
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
    this.frame = 0;
    /** Several views share one canvas; only the active one draws. */
    this.active = false;
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const r = this.canvas.getBoundingClientRect();
    this.width = r.width; this.height = r.height;
    this.canvas.width = Math.max(1, Math.round(r.width * dpr));
    this.canvas.height = Math.max(1, Math.round(r.height * dpr));
    this.request();
  }

  request() { if (!this.frame && this.active) this.frame = requestAnimationFrame(() => { this.frame = 0; this.draw(); }); }

  fit() { if (this.width) { this.camera = { x: 0, z: 62, scale: Math.min(this.width / 44, this.height / 130) }; this.request(); } }

  /** @param {number} x @param {number} z */
  toScreen(x, z) { return [this.width / 2 + (x - this.camera.x) * this.camera.scale, this.height / 2 - (z - this.camera.z) * this.camera.scale]; }
  /** @param {number} sx @param {number} sy */
  toRoad(sx, sy) { return [this.camera.x + (sx - this.width / 2) / this.camera.scale, this.camera.z - (sy - this.height / 2) / this.camera.scale]; }

  /** @param {number} factor @param {number} [sx] @param {number} [sy] */
  zoom(factor, sx = this.width / 2, sy = this.height / 2) {
    const [x, z] = this.toRoad(sx, sy);
    this.camera.scale = Math.min(200, Math.max(1, this.camera.scale * factor));
    const [x2, z2] = this.toRoad(sx, sy);
    this.camera.x += x - x2; this.camera.z += z - z2;
    this.request();
  }

  /** @param {number} dx @param {number} dy */
  pan(dx, dy) { this.camera.x -= dx / this.camera.scale; this.camera.z += dy / this.camera.scale; this.request(); }

  /** @param {RoadResult} road @param {'right' | 'left'} traffic */
  setRoad(road, traffic) {
    this.road = road;
    this.traffic = traffic;
    const c = document.createElement('canvas');
    c.width = road.nx; c.height = road.nz;
    const ctx = /** @type {CanvasRenderingContext2D} */ (c.getContext('2d'));
    const img = ctx.createImageData(road.nx, road.nz);
    for (let iz = 0; iz < road.nz; iz++) for (let ix = 0; ix < road.nx; ix++) {
      const [r, g, b] = asphalt(road.lux[iz * road.nx + ix]);
      const k = ((road.nz - 1 - iz) * road.nx + ix) * 4;
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
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#14161a';
    ctx.fillRect(0, 0, this.width, this.height);
    const r = this.road;
    if (r && this.image) {
      const g = r.grid;
      const [x0, y0] = this.toScreen(g.xMin - g.step / 2, g.zMax + g.step / 2), [x1, y1] = this.toScreen(g.xMax + g.step / 2, g.zMin - g.step / 2);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(this.image, x0, y0, x1 - x0, y1 - y0);
    }
    this.drawMarkings();
    if (r) this.drawIsolux(r);
    this.drawDistances();
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
      const [sx, sy0] = this.toScreen(x, 0), [, sy1] = this.toScreen(x, 150);
      ctx.beginPath(); ctx.moveTo(sx, sy0); ctx.lineTo(sx, sy1); ctx.stroke();
    }
    ctx.restore();
  }

  /** @param {RoadResult} r */
  drawIsolux(r) {
    const { ctx } = this;
    ctx.save();
    ctx.font = '500 11px Barlow, sans-serif';
    for (const level of ISOLUX) {
      const seg = isoSegments(r.lux, r.nx, r.nz, level);
      ctx.strokeStyle = level >= 10 ? 'rgba(242, 194, 48, .95)' : 'rgba(242, 194, 48, .55)';
      ctx.lineWidth = level === 3 ? 1.8 : 1.1;
      ctx.beginPath();
      for (let i = 0; i < seg.length; i += 4) {
        const [x1, y1] = this.toScreen(r.grid.xMin + seg[i] * r.grid.step, r.grid.zMin + seg[i + 1] * r.grid.step);
        const [x2, y2] = this.toScreen(r.grid.xMin + seg[i + 2] * r.grid.step, r.grid.zMin + seg[i + 3] * r.grid.step);
        ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
      }
      ctx.stroke();
      const far = r.reach[level];
      if (far > 0) {
        const [lx, ly] = this.toScreen(0, far);
        ctx.fillStyle = 'rgba(242, 194, 48, .95)';
        ctx.fillText(`${level} lx`, lx + 6, ly - 3);
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
    ctx.textAlign = 'right';
    for (let z = 0; z <= 140; z += 20) {
      const [, y] = this.toScreen(0, z);
      ctx.beginPath(); ctx.moveTo(0, Math.round(y) + .5); ctx.lineTo(this.width, Math.round(y) + .5); ctx.stroke();
      if (y > 14 && y < this.height + 2) ctx.fillText(`${z} m`, this.width - 10, y - 4);
    }
    ctx.textAlign = 'left';
    ctx.restore();
  }
}
