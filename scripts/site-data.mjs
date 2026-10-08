/** Numbers and pictures for the marketing page, computed by the real engine at build time so the page never claims
 * anything the app does not produce. */

import { deflateSync } from 'node:zlib';
import { defaultDesign, switchVariant, validateDesign } from '../src/core/model.js';
import { buildLamp, traceOptions } from '../src/core/lamp.js';
import { trace } from '../src/core/tracer.js';
import { analyse } from '../src/core/analysis.js';
import { cutoffAt } from '../src/core/lamps/cutoff.js';
import { sectionOutlines, outlineBounds } from '../src/core/section.js';
import { wallColour } from '../src/render/beam-view.js';
import { gridSize } from '../src/core/tracer.js';
import { Beam } from '../src/core/regulation/evaluate.js';
import { CONVENTION } from '../src/core/lamp.js';

/** @import { Design } from '../src/core/model.js' */
/** @import { Analysis } from '../src/core/analysis.js' */

/** @param {number} v */
const r = v => +v.toFixed(2);

/** The angular window of the hero picture, in the aimed frame. */
export const FRAME = { hMin: -40, hMax: 40, vMin: -10, vMax: 14 };

/**
 * Traces and analyses a default design.
 * @param {'projector' | 'reflector'} type @param {number} rays
 * @returns {{ design: Design, analysis: Analysis, result: import('../src/core/types.js').TraceResult }}
 */
export function study(type, rays) {
  const design = defaultDesign();
  if (type === 'reflector') switchVariant(design, 'optics', type);
  validateDesign(design);
  const result = trace(buildLamp(design), traceOptions(design, { rays, pathCount: 220 }));
  return { design, analysis: analyse(design, result), result };
}

/** A PNG file from RGB rows. @param {number} width @param {number} height @param {Uint8Array} rgb */
export function png(width, height, rgb) {
  const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  /** @param {Buffer} buf */
  const crc = buf => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  /** @param {string} type @param {Buffer} data */
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const sum = Buffer.alloc(4); sum.writeUInt32BE(crc(body));
    return Buffer.concat([len, body, sum]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4);
  header[8] = 8; header[9] = 2; header[10] = 0; header[11] = 0; header[12] = 0;
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 3 + 1)] = 0;
    Buffer.from(rgb.buffer, rgb.byteOffset + y * width * 3, width * 3).copy(raw, y * (width * 3 + 1) + 1);
  }
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', header), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

/**
 * The aimed beam as a picture, drawn the way the app's beam view draws it: light on a dark wall on a log scale.
 * @param {Analysis} analysis @param {number} width @param {number} height
 */
export function beamPng(analysis, width, height) {
  const rgb = new Uint8Array(width * height * 3);
  const peak = analysis.layers.reduce((m, l) => Math.max(m, l.candela.reduce((a, v) => Math.max(a, v), 0)), 1);
  const logMax = Math.log10(peak);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const h = FRAME.hMin + ((x + 0.5) / width) * (FRAME.hMax - FRAME.hMin);
    const v = FRAME.vMax - ((y + 0.5) / height) * (FRAME.vMax - FRAME.vMin);
    let cd = 0;
    // The finest layer that covers the direction, read between bin centres so the coarse grid does not show as steps.
    for (const layer of [...analysis.layers].reverse()) {
      const s = layer.spec;
      if (h < s.hMin || h >= s.hMax || v < s.vMin || v >= s.vMax) continue;
      const { nh, nv } = gridSize(s);
      const fx = Math.min(nh - 1, Math.max(0, (h - s.hMin) / s.step - 0.5)), fy = Math.min(nv - 1, Math.max(0, (v - s.vMin) / s.vStep - 0.5));
      const c0 = Math.floor(fx), r0 = Math.floor(fy), c1 = Math.min(nh - 1, c0 + 1), r1 = Math.min(nv - 1, r0 + 1), tx = fx - c0, ty = fy - r0;
      const at = (/** @type {number} */ r, /** @type {number} */ c) => layer.candela[r * nh + c];
      cd = (at(r0, c0) * (1 - tx) + at(r0, c1) * tx) * (1 - ty) + (at(r1, c0) * (1 - tx) + at(r1, c1) * tx) * ty;
      break;
    }
    const t = cd > 10 ? (Math.log10(cd) - 1) / Math.max(0.1, logMax - 1) : 0;
    const [cr, cg, cb] = wallColour(t);
    const k = (y * width + x) * 3;
    rgb[k] = cr; rgb[k + 1] = cg; rgb[k + 2] = cb;
  }
  return png(width, height, rgb);
}

/**
 * Overlay geometry for the hero picture in its own percent coordinates: the intended cut-off and the test points.
 * @param {Design} design @param {Analysis} analysis
 */
export function beamOverlay(design, analysis) {
  const { dh, dv } = analysis.evaluation.aim;
  /** @param {number} h @param {number} v */
  const at = (h, v) => [r(((h - FRAME.hMin) / (FRAME.hMax - FRAME.hMin)) * 100), r(((FRAME.vMax - v) / (FRAME.vMax - FRAME.vMin)) * 100)];
  const cut = [];
  for (let h = FRAME.hMin; h <= FRAME.hMax; h += 0.5) cut.push(at(h + dh, cutoffAt(design, h) + dv).join(','));
  // The overlay stretches with the picture, so test points are zero-length round-capped lines, which stay round.
  const points = analysis.evaluation.items.filter(i => i.h !== undefined && i.v !== undefined).map(i => {
    const [x, y] = at(/** @type {number} */ (i.h), /** @type {number} */ (i.v));
    return `<line class="pt ${i.status}" x1="${x}" y1="${y}" x2="${x}" y2="${y}"><title>${i.label}</title></line>`;
  });
  return `<polyline class="cutoff" points="${cut.join(' ')}"/>${points.join('')}`;
}

/** Where the flat part of the aimed cut-off (line B) lies, as the share of the picture below it. */
export function shareBelowLineB() {
  return r((-0.57 - FRAME.vMin) / (FRAME.vMax - FRAME.vMin));
}

/**
 * The vertical scan at 2.5° on the driver's side through the aimed beam, as an SVG chart of log intensity.
 * @param {import('../src/core/types.js').TraceResult} result @param {Analysis} analysis
 */
export function scanChart(result, analysis) {
  const beam = new Beam(result.histograms, CONVENTION);
  beam.dh = analysis.evaluation.aim.dh; beam.dv = analysis.evaluation.aim.dv;
  /** @type {[number, number][]} */
  const points = [];
  for (let b = -3; b <= 2.0001; b += 0.05) { const i = beam.at(-2.5, b, 0.25, 0.025); if (i > 0) points.push([b, Math.log10(i)]); }
  const W = 640, H = 300, L = 54, R = 16, T = 18, B = 42;
  const v0 = -3, v1 = 2, l0 = Math.floor(Math.min(...points.map(p => p[1]))), l1 = Math.ceil(Math.max(...points.map(p => p[1])));
  /** @param {number} b */
  const x = b => L + ((b - v0) / (v1 - v0)) * (W - L - R);
  /** @param {number} l */
  const y = l => T + ((l1 - l) / (l1 - l0)) * (H - T - B);
  const curve = points.map(([b, l], i) => `${i ? 'L' : 'M'}${r(x(b))},${r(y(l))}`).join('');
  const grid = [];
  for (let l = l0; l <= l1; l++) grid.push(`<line class="axis" x1="${L}" x2="${W - R}" y1="${r(y(l))}" y2="${r(y(l))}"/><text x="${L - 8}" y="${r(y(l)) + 4}" text-anchor="end">${(10 ** l).toLocaleString('en-GB')}</text>`);
  for (let b = v0; b <= v1; b++) grid.push(`<text x="${r(x(b))}" y="${H - 18}" text-anchor="middle">${b === 0 ? '0' : `${Math.abs(b)}°${b > 0 ? 'U' : 'D'}`}</text>`);
  const xb = r(x(-0.57));
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Log intensity along the vertical scan at 2.5 degrees left: the cut-off falls steeply at line B">${grid.join('')}<line class="mark" x1="${xb}" x2="${xb}" y1="${T}" y2="${H - B}"/><text class="hi" x="${xb + 8}" y="${T + 14}">Line B, 0.57°D</text><path class="curve" d="${curve}"/><text x="${W - R}" y="${H - 2}" text-anchor="end">Vertical angle, aimed beam</text><text x="${L}" y="${T - 4}">cd, log scale</text></svg>`;
}

/**
 * The side section of a lamp with its traced rays, as SVG.
 * @param {Design} design @param {import('../src/core/types.js').RayPath[]} paths @param {string} label
 */
export function sectionSvg(design, paths, label) {
  // Paths come from a trace; draw at most a hundred and fifty of them.
  paths = paths.filter((_, i) => i % Math.max(1, Math.ceil(paths.length / 150)) === 0);
  const outlines = sectionOutlines(buildLamp(design), 'side');
  const [u0, u1, w0, w1] = outlineBounds(outlines);
  // Every section shares one 2.4:1 frame around its lamp and the LED, so the cards line up.
  const pad = 8, ratio = 2.4;
  let left = u0 - pad, right = u1 + 40, high = Math.max(w1, 0) + pad, low = Math.min(w0, 0) - pad;
  if ((right - left) / (high - low) < ratio) { const grow = ((high - low) * ratio - (right - left)) / 2; left -= grow; right += grow; }
  else { const grow = ((right - left) / ratio - (high - low)) / 2; high += grow; low -= grow; }
  const clip = /** @param {number} w */ w => Math.max(low, Math.min(high, w));
  const rays = paths.filter(p => p.bucket === 'beam' || p.bucket === 'shield').map(p => {
    const pts = [];
    for (let i = 0; i < p.points.length; i += 3) {
      const u = p.points[i + 2], w = p.points[i + 1];
      pts.push(`${r(Math.min(right, u))},${r(-clip(w))}`);
      if (u > right) break;
    }
    return `<polyline class="ray ${p.bucket}" points="${pts.join(' ')}"/>`;
  }).join('');
  const shapes = outlines.filter(o => o.role !== 'housing').map(o => o.polylines.map(line => {
    const pts = [];
    for (let i = 0; i < line.length; i += 2) pts.push(`${r(line[i])},${r(-line[i + 1])}`);
    return `<polyline class="part ${o.role}" points="${pts.join(' ')}"/>`;
  }).join('')).join('');
  return `<svg class="section" viewBox="${r(left)} ${r(-high)} ${r(right - left)} ${r(high - low)}" role="img" aria-label="${label}">${rays}${shapes}<circle class="led" cx="0" cy="0" r="1.6"/></svg>`;
}
