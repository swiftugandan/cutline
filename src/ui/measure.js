/** The measure tool: click two points on the canvas and read what lies between them. The tool belongs to the shell;
 * the active workspace gives it an adapter for the view on screen, which turns a canvas point into a point in the
 * view's own terms (a model point in millimetres, a direction in degrees, a point on the road), finds where that point
 * is now drawn, and describes two points. The tool draws through each view's overlay hook, so a measurement follows
 * the camera. */

/**
 * @typedef {{ p: number[], label?: string, pane?: string }} MeasurePoint
 *   p: the point in the view's terms. label: what it snapped to, if anything. pane: for a view of several panes,
 *   the pane it is in; two points in different panes are not measured.
 * @typedef {{ point(x: number, y: number): MeasurePoint | null, screen(p: MeasurePoint): number[] | null,
 *   describe(a: MeasurePoint, b: MeasurePoint): string[] }} MeasureAdapter
 *   describe returns lines of text, the first the main value.
 */

const LINE = '#6fb6cf';
const HALO = 'rgba(9, 13, 22, .85)';

export class MeasureTool {
  /** @param {() => void} onChange called when the drawing must be redone */
  constructor(onChange) {
    this.onChange = onChange;
    this.active = false;
    /** @type {MeasureAdapter | null} */
    this.adapter = null;
    /** @type {MeasurePoint | null} */
    this.a = null;
    /** @type {MeasurePoint | null} */
    this.b = null;
    /** The point under the pointer while choosing the second point. @type {MeasurePoint | null} */
    this.hover = null;
  }

  /** @param {MeasureAdapter} adapter @param {MeasurePoint | null} [first] */
  start(adapter, first = null) {
    this.active = true;
    this.adapter = adapter;
    this.a = first; this.b = null; this.hover = null;
    this.onChange();
  }

  stop() {
    if (!this.active && !this.a) return;
    this.active = false;
    this.adapter = null;
    this.a = this.b = this.hover = null;
    this.onChange();
  }

  /** A click: the first point, the second, or a fresh first point after a finished measurement. @param {number} x @param {number} y */
  click(x, y) {
    const p = this.adapter?.point(x, y);
    if (!p) return;
    if (!this.a || this.b) { this.a = p; this.b = null; }
    else if (!sameView(this.a, p)) { this.a = p; }
    else this.b = p;
    this.hover = null;
    this.onChange();
  }

  /** @param {number} x @param {number} y */
  move(x, y) {
    if (!this.active || !this.a || this.b) return;
    const p = this.adapter?.point(x, y) ?? null;
    this.hover = p && sameView(this.a, p) ? p : null;
    this.onChange();
  }

  /** The text of the measurement on screen, for the status bar. */
  text() {
    const b = this.b ?? this.hover;
    if (!this.adapter || !this.a || !b) return '';
    return this.adapter.describe(this.a, b).join(' · ');
  }

  /** Draws the measurement on a view's canvas, in CSS pixels. @param {CanvasRenderingContext2D} ctx */
  draw(ctx) {
    const adapter = this.adapter;
    if (!adapter || !this.a) return;
    const a = adapter.screen(this.a);
    const second = this.b ?? this.hover;
    const b = second ? adapter.screen(second) : null;
    ctx.save();
    ctx.lineCap = 'round';
    if (a && b) {
      ctx.setLineDash(this.b ? [] : [6, 4]);
      ctx.strokeStyle = HALO; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
      ctx.strokeStyle = LINE; ctx.lineWidth = 1.75;
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
      ctx.setLineDash([]);
    }
    for (const [s, p] of /** @type {[number[] | null, MeasurePoint | null][]} */ ([[a, this.a], [b, second]])) {
      if (!s || !p) continue;
      ctx.fillStyle = HALO; ctx.strokeStyle = LINE; ctx.lineWidth = 2;
      ctx.beginPath();
      if (p.label) ctx.rect(s[0] - 4.5, s[1] - 4.5, 9, 9); else ctx.arc(s[0], s[1], 4.5, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
    }
    if (a && b && second) label(ctx, adapter.describe(this.a, second), (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
    ctx.restore();
  }
}

/** @param {MeasurePoint} a @param {MeasurePoint} b */
function sameView(a, b) { return (a.pane ?? '') === (b.pane ?? ''); }

/** A label of a few lines in a dark pill, offset from a point. @param {CanvasRenderingContext2D} ctx @param {string[]} lines @param {number} x @param {number} y */
function label(ctx, lines, x, y) {
  ctx.font = '600 12px Barlow, sans-serif';
  const widths = lines.map((t, i) => { ctx.font = i ? '500 11px Barlow, sans-serif' : '600 12px Barlow, sans-serif'; return ctx.measureText(t).width; });
  const w = Math.max(...widths) + 16, ht = 10 + 14 + (lines.length - 1) * 14;
  const dpr = window.devicePixelRatio || 1, width = ctx.canvas.width / dpr, height = ctx.canvas.height / dpr;
  const left = Math.max(4, Math.min(width - w - 4, x + 10));
  // Above the point, unless that would meet the legend along the top of the view; then below it.
  const top = y - ht - 10 >= 48 ? y - ht - 10 : Math.min(height - ht - 4, y + 12);
  ctx.fillStyle = 'rgba(9, 13, 22, .92)';
  ctx.strokeStyle = 'rgba(111, 182, 207, .55)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(left, top, w, ht, 6); ctx.fill(); ctx.stroke();
  lines.forEach((t, i) => {
    ctx.font = i ? '500 11px Barlow, sans-serif' : '600 12px Barlow, sans-serif';
    ctx.fillStyle = i ? '#b8c2d3' : '#ffffff';
    ctx.fillText(t, left + 8, top + 17 + i * 14);
  });
}
