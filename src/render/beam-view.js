/** The beam pattern: intensity in every direction, drawn as light on a dark wall on a log scale, with iso-candela
 * contours, the intended cut-off, and the regulation's test points and zones. Coordinates are degrees (H, V). */

import { gridSize } from '../core/tracer.js';
import { isoSegments } from './contours.js';

/** @import { GridSpec } from '../core/types.js' */

/**
 * @typedef {{ spec: GridSpec, candela: Float64Array }} BeamLayer
 * @typedef {'pass' | 'fail' | 'near' | 'info' | 'blocked'} MarkStatus
 * @typedef {{ id: string, label: string, h: number, v: number, status: MarkStatus }} BeamMarker
 * @typedef {{ id: string, label: string, polygon: number[], status: MarkStatus }} BeamZone
 * @typedef {{ id: string, label: string, h0: number, h1: number, v: number, status: MarkStatus }} BeamSegment
 */

export const CONTOUR_LEVELS = [100, 500, 1000, 5000, 10000, 20000, 40000, 80000];

/** Light on a dark wall: night, blue-grey, then white. @param {number} t 0–1 */
export function wallColour(t) {
  const stops = [[0, [11, 13, 17]], [0.3, [24, 36, 58]], [0.6, [92, 122, 168]], [0.85, [205, 220, 245]], [1, [255, 255, 255]]];
  const x = Math.min(1, Math.max(0, t));
  for (let i = 1; i < stops.length; i++) {
    const [t1, c1] = /** @type {[number, number[]]} */ (stops[i]), [t0, c0] = /** @type {[number, number[]]} */ (stops[i - 1]);
    if (x <= t1) { const f = (x - t0) / (t1 - t0); return c0.map((c, k) => Math.round(c + (c1[k] - c) * f)); }
  }
  return [255, 255, 255];
}

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
    /** @type {{ canvas: HTMLCanvasElement, spec: GridSpec }[]} */
    this.images = [];
    this.max = 1;
    /** @type {BeamMarker[]} */
    this.markers = [];
    /** @type {BeamZone[]} */
    this.zones = [];
    /** @type {BeamSegment[]} */
    this.segments = [];
    /** The requirement picked in the compliance table, drawn emphasised. @type {string | null} */
    this.selected = null;
    /** @type {number[]} flat [h, v, …] of the intended cut-off */
    this.cutoff = [];
    this.showContours = true;
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

  request() {
    if (this.frame || !this.active) return;
    this.frame = requestAnimationFrame(() => { this.frame = 0; this.draw(); });
  }

  /** Frames H ±45° and V −14° to +8°. */
  fit() {
    if (!this.width) return;
    this.camera = { h: 0, v: -3, scale: Math.min(this.width / 92, this.height / 24) };
    this.request();
  }

  /** @param {number} h @param {number} v */
  toScreen(h, v) { return [this.width / 2 + (h - this.camera.h) * this.camera.scale, this.height / 2 - (v - this.camera.v) * this.camera.scale]; }
  /** @param {number} x @param {number} y */
  toAngles(x, y) { return [this.camera.h + (x - this.width / 2) / this.camera.scale, this.camera.v - (y - this.height / 2) / this.camera.scale]; }

  /** @param {number} factor @param {number} [x] @param {number} [y] */
  zoom(factor, x = this.width / 2, y = this.height / 2) {
    const [h, v] = this.toAngles(x, y);
    this.camera.scale = Math.min(400, Math.max(4, this.camera.scale * factor));
    const [h2, v2] = this.toAngles(x, y);
    this.camera.h += h - h2; this.camera.v += v - v2;
    this.request();
  }

  /** @param {number} dx @param {number} dy */
  pan(dx, dy) { this.camera.h -= dx / this.camera.scale; this.camera.v += dy / this.camera.scale; this.request(); }

  /**
   * New beam data. Each layer becomes an offscreen image once; drawing then only scales it.
   * @param {BeamLayer[]} layers
   */
  setBeam(layers) {
    this.layers = layers;
    this.max = Math.max(1, ...layers.map(l => l.candela.reduce((m, v) => Math.max(m, v), 0)));
    const logMax = Math.log10(this.max);
    this.images = layers.map(({ spec, candela }) => {
      const { nh, nv } = gridSize(spec);
      const c = document.createElement('canvas');
      c.width = nh; c.height = nv;
      const ctx = /** @type {CanvasRenderingContext2D} */ (c.getContext('2d'));
      const img = ctx.createImageData(nh, nv);
      for (let row = 0; row < nv; row++) for (let col = 0; col < nh; col++) {
        const cd = candela[row * nh + col];
        // Log scale from 10 cd to the peak; the image's top row is the highest V.
        const t = cd > 10 ? (Math.log10(cd) - 1) / Math.max(0.1, logMax - 1) : 0;
        const [r, g, b] = wallColour(t);
        const k = ((nv - 1 - row) * nh + col) * 4;
        img.data[k] = r; img.data[k + 1] = g; img.data[k + 2] = b; img.data[k + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
      return { canvas: c, spec };
    });
    this.request();
  }

  /** Intensity at a direction from the finest layer that covers it. @param {number} h @param {number} v */
  candelaAt(h, v) {
    let best = null;
    for (const l of this.layers) {
      const s = l.spec;
      if (h < s.hMin || h >= s.hMax || v < s.vMin || v >= s.vMax) continue;
      if (!best || s.step * s.vStep < best.spec.step * best.spec.vStep) best = l;
    }
    if (!best) return NaN;
    const { nh } = gridSize(best.spec);
    const col = Math.floor((h - best.spec.hMin) / best.spec.step), row = Math.floor((v - best.spec.vMin) / best.spec.vStep);
    return best.candela[row * nh + col];
  }

  draw() {
    const { ctx } = this;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#0b0d11';
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.imageSmoothingEnabled = this.camera.scale < 20;
    for (const { canvas, spec } of this.images) {
      const [x0, y0] = this.toScreen(spec.hMin, spec.vMax), [x1, y1] = this.toScreen(spec.hMax, spec.vMin);
      ctx.drawImage(canvas, x0, y0, x1 - x0, y1 - y0);
    }
    this.drawAxes();
    if (this.showContours) this.drawContours();
    this.drawZones();
    this.drawSegments();
    this.drawCutoff();
    this.drawMarkers();
  }

  drawSegments() {
    const { ctx } = this;
    ctx.save();
    ctx.lineCap = 'round';
    for (const s of this.segments) {
      const [x0, y] = this.toScreen(s.h0, s.v), [x1] = this.toScreen(s.h1, s.v);
      const picked = s.id === this.selected;
      ctx.strokeStyle = '#0b0d11'; ctx.lineWidth = picked ? 6 : 4;
      ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
      ctx.strokeStyle = STATUS[s.status]; ctx.lineWidth = picked ? 3 : 1.6;
      ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
      if (picked) this.label(s.label, Math.max(x0, Math.min(x1, this.width / 2)), y);
    }
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
    const step = this.camera.scale > 60 ? 1 : this.camera.scale > 18 ? 2 : 5;
    ctx.lineWidth = 1;
    ctx.font = '11px Barlow, sans-serif';
    ctx.fillStyle = 'rgba(195, 202, 214, .75)';
    for (let h = Math.ceil(h0 / step) * step; h <= h1; h += step) {
      const [x] = this.toScreen(h, 0);
      ctx.strokeStyle = h === 0 ? 'rgba(195, 202, 214, .45)' : 'rgba(195, 202, 214, .1)';
      ctx.beginPath(); ctx.moveTo(Math.round(x) + .5, 0); ctx.lineTo(Math.round(x) + .5, this.height); ctx.stroke();
      if (x > 34) ctx.fillText(`${h > 0 ? h + 'R' : h < 0 ? -h + 'L' : '0'}`, x + 3, this.height - 6);
    }
    for (let v = Math.ceil(v0 / step) * step; v <= v1; v += step) {
      const [, y] = this.toScreen(0, v);
      ctx.strokeStyle = v === 0 ? 'rgba(195, 202, 214, .45)' : 'rgba(195, 202, 214, .1)';
      ctx.beginPath(); ctx.moveTo(0, Math.round(y) + .5); ctx.lineTo(this.width, Math.round(y) + .5); ctx.stroke();
      // Labels clear the legend at the top and the H labels at the bottom.
      if (y > 52 && y < this.height - 24) ctx.fillText(`${v > 0 ? v + 'U' : v < 0 ? -v + 'D' : '0'}`, 6, y - 3);
    }
  }

  drawContours() {
    const { ctx } = this;
    ctx.save();
    ctx.lineWidth = 1;
    for (const layer of this.layers) {
      const { nh, nv } = gridSize(layer.spec);
      for (const level of CONTOUR_LEVELS) {
        if (level > this.max) continue;
        const seg = isoSegments(layer.candela, nh, nv, level);
        ctx.strokeStyle = `rgba(242, 194, 48, ${level >= 10000 ? 0.55 : 0.3})`;
        ctx.beginPath();
        for (let i = 0; i < seg.length; i += 4) {
          const [x1, y1] = this.toScreen(layer.spec.hMin + (seg[i] + 0.5) * layer.spec.step, layer.spec.vMin + (seg[i + 1] + 0.5) * layer.spec.vStep);
          const [x2, y2] = this.toScreen(layer.spec.hMin + (seg[i + 2] + 0.5) * layer.spec.step, layer.spec.vMin + (seg[i + 3] + 0.5) * layer.spec.vStep);
          ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
        }
        ctx.stroke();
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
