/** The lamp in section: its reflector, shield, lens and housing cut by a plane through the LED, with traced rays
 * projected onto that plane. Side and top sections sit next to each other. Coordinates are millimetres. */

import { outlineBounds } from '../core/section.js';

/** @import { SurfaceOutline } from '../core/section.js' */
/** @import { RayPath, Bucket } from '../core/types.js' */

/** Stroke colour and width by surface role. */
const ROLE_STYLE = {
  reflector: { colour: '#9fb4d0', width: 2 },
  shield: { colour: '#e8590c', width: 2.2 },
  lens: { colour: '#63c5da', width: 1.6 },
  housing: { colour: 'rgba(195, 202, 214, .45)', width: 1.2 },
};

/** Ray colours by where the light ended. */
export const RAY_STYLES = /** @type {Record<Bucket, { colour: string, label: string }>} */ ({
  beam: { colour: '242, 194, 48', label: 'Into the beam' },
  shield: { colour: '232, 89, 12', label: 'Stopped by the shield' },
  reflectorAbsorption: { colour: '159, 180, 208', label: 'Absorbed by the reflector' },
  lensLoss: { colour: '99, 197, 218', label: 'Lost in the lens' },
  housing: { colour: '134, 142, 150', label: 'Stopped by the housing' },
  coverLoss: { colour: '134, 142, 150', label: 'Lost in the outer lens' },
  backward: { colour: '134, 142, 150', label: 'Left backwards' },
  trapped: { colour: '255, 107, 107', label: 'Trapped' },
});

/**
 * @typedef {{ side: SurfaceOutline[], top: SurfaceOutline[] }} LampSections
 */

export class LampView {
  /** @param {HTMLCanvasElement} canvas */
  constructor(canvas) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available in this browser.');
    this.ctx = ctx;
    this.width = 0; this.height = 0;
    /** Shared camera for both panes: centre (u, w) in mm and pixels per mm. */
    this.camera = { u: 50, w: 0, scale: 3 };
    /** @type {LampSections | null} */
    this.sections = null;
    /** @type {RayPath[]} */
    this.paths = [];
    this.showRays = true;
    this.dark = true;
    this.frame = 0;
    /** Several views share one canvas; only the active one draws. */
    this.active = false;
    /** The shell's drawing over the view, in CSS pixels. @type {((ctx: CanvasRenderingContext2D) => void) | null} */
    this.overlay = null;
    /** Draw without on-screen aids, for an exported image. */
    this.plain = false;
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

  /** The two panes: side above top when the viewport is wide and short, else side by side. */
  panes() {
    const wide = this.width / this.height > 1.6;
    const gap = 12;
    if (wide) {
      const w = (this.width - gap) / 2;
      return [{ view: /** @type {const} */ ('side'), x: 0, y: 0, w, h: this.height }, { view: /** @type {const} */ ('top'), x: w + gap, y: 0, w, h: this.height }];
    }
    const h = (this.height - gap) / 2;
    return [{ view: /** @type {const} */ ('side'), x: 0, y: 0, w: this.width, h }, { view: /** @type {const} */ ('top'), x: 0, y: h + gap, w: this.width, h }];
  }

  fit() {
    if (!this.width || !this.sections) return;
    const [su0, su1, sw0, sw1] = outlineBounds(this.sections.side), [tu0, tu1, tw0, tw1] = outlineBounds(this.sections.top);
    const u0 = Math.min(su0, tu0), u1 = Math.max(su1, tu1);
    const half = Math.max(Math.abs(sw0), Math.abs(sw1), Math.abs(tw0), Math.abs(tw1));
    const pane = this.panes()[0];
    const scale = Math.min((pane.w - 60) / Math.max(1, u1 - u0), (pane.h - 56) / Math.max(1, 2 * half));
    this.camera = { u: (u0 + u1) / 2, w: 0, scale: Math.max(0.2, scale) };
    this.request();
  }

  /** Zooms about a canvas point, which keeps its place in its pane. @param {number} factor @param {number} [x] @param {number} [y] */
  zoom(factor, x, y) {
    const at = x !== undefined && y !== undefined ? this.toSection(x, y) : null;
    this.camera.scale = Math.min(60, Math.max(0.2, this.camera.scale * factor));
    if (at) {
      const after = /** @type {{ u: number, w: number }} */ (this.toSection(/** @type {number} */ (x), /** @type {number} */ (y), at.view));
      this.camera.u += at.u - after.u; this.camera.w += at.w - after.w;
    }
    this.request();
  }

  /** The section point under a canvas point: the pane, and u along the axis and w across it in mm. A pane may be
   * named to read a point outside it. @param {number} x @param {number} y @param {'side' | 'top'} [view] */
  toSection(x, y, view) {
    const pane = this.panes().find(p => (view ? p.view === view : x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h));
    if (!pane) return null;
    return { view: pane.view, u: this.camera.u + (x - pane.x - pane.w / 2) / this.camera.scale, w: this.camera.w - (y - pane.y - pane.h / 2) / this.camera.scale };
  }

  /** The canvas point of a section point. @param {'side' | 'top'} view @param {number} u @param {number} w */
  fromSection(view, u, w) {
    const pane = /** @type {{ x: number, y: number, w: number, h: number }} */ (this.panes().find(p => p.view === view));
    return [pane.x + pane.w / 2 + (u - this.camera.u) * this.camera.scale, pane.y + pane.h / 2 - (w - this.camera.w) * this.camera.scale];
  }

  /** @param {number} dx @param {number} dy */
  pan(dx, dy) { this.camera.u -= dx / this.camera.scale; this.camera.w += dy / this.camera.scale; this.request(); }

  /** @param {LampSections} sections @param {RayPath[]} paths */
  setLamp(sections, paths) {
    this.sections = sections;
    this.paths = paths;
    this.request();
  }

  draw() {
    const { ctx } = this;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#0b0d11';
    ctx.fillRect(0, 0, this.width, this.height);
    if (!this.sections) return;
    for (const pane of this.panes()) this.drawPane(pane);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!this.plain) this.overlay?.(ctx);
  }

  /** @param {{ view: 'side' | 'top', x: number, y: number, w: number, h: number }} pane */
  drawPane(pane) {
    const { ctx, camera } = this;
    const sections = /** @type {LampSections} */ (this.sections);
    /** @param {number} u @param {number} w */
    const at = (u, w) => [pane.x + pane.w / 2 + (u - camera.u) * camera.scale, pane.y + pane.h / 2 - (w - camera.w) * camera.scale];
    ctx.save();
    ctx.beginPath(); ctx.rect(pane.x, pane.y, pane.w, pane.h); ctx.clip();
    ctx.fillStyle = '#10131a';
    ctx.fillRect(pane.x, pane.y, pane.w, pane.h);
    // The optical axis.
    const [ax0, ay] = at(camera.u - pane.w / camera.scale, 0), [ax1] = at(camera.u + pane.w / camera.scale, 0);
    ctx.strokeStyle = 'rgba(195, 202, 214, .16)'; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(ax0, Math.round(ay) + 0.5); ctx.lineTo(ax1, Math.round(ay) + 0.5); ctx.stroke();
    ctx.setLineDash([]);
    if (this.showRays) this.drawRays(pane.view, at);
    for (const outline of sections[pane.view]) {
      const style = ROLE_STYLE[outline.role];
      ctx.strokeStyle = style.colour; ctx.lineWidth = style.width; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      for (const line of outline.polylines) {
        ctx.beginPath();
        for (let i = 0; i < line.length; i += 2) { const [x, y] = at(line[i], line[i + 1]); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
        ctx.stroke();
      }
    }
    // The LED.
    const [lx, ly] = at(0, 0);
    ctx.fillStyle = '#fff4c2'; ctx.strokeStyle = '#0b0d11'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(lx, ly, 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // Pane titles sit bottom right, clear of the legend at the top and the scale bar at the bottom left.
    ctx.textAlign = 'right';
    ctx.font = '500 12px Barlow, sans-serif';
    ctx.fillStyle = 'rgba(237, 240, 244, .82)';
    ctx.fillText(pane.view === 'side' ? 'Side section' : 'Top section', pane.x + pane.w - 12, pane.y + pane.h - 28);
    ctx.font = '11px Barlow, sans-serif';
    ctx.fillStyle = 'rgba(195, 202, 214, .6)';
    ctx.fillText(pane.view === 'side' ? 'Up ↑   forward →' : 'Right ↑   forward →', pane.x + pane.w - 12, pane.y + pane.h - 12);
    ctx.textAlign = 'left';
    ctx.restore();
  }

  /** Ray paths projected onto the pane's plane. @param {'side' | 'top'} view @param {(u: number, w: number) => number[]} at */
  drawRays(view, at) {
    const { ctx } = this;
    ctx.lineWidth = 1;
    for (const path of this.paths) {
      const style = RAY_STYLES[path.bucket];
      ctx.strokeStyle = `rgba(${style.colour}, ${path.bucket === 'beam' ? 0.42 : 0.22})`;
      ctx.beginPath();
      const p = path.points;
      for (let i = 0; i < p.length; i += 3) {
        const [x, y] = at(p[i + 2], view === 'side' ? p[i + 1] : p[i]);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }
}
