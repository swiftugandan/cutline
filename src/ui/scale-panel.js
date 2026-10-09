/** The colour scale beside a picture: the palette as a bar with its values, the contour levels marked on it, and the
 * controls that change them. Typing a top or bottom value fixes the range; Fit returns it to the data. In uniformity
 * mode the bar shows the ratio to the surroundings instead. */

import { h, fmt } from './dom.js';
import { PALETTES, PALETTE_NAMES, cssGradient, position, ticks } from '../render/palettes.js';
import { formatLevel } from '../render/beam-view.js';

/** @import { Range, PaletteId } from '../render/palettes.js' */

/**
 * @typedef {{ scale?: 'log' | 'linear', auto?: 'yes' | 'no', min?: number, max?: number, palette?: PaletteId, contours?: number[] }} ScalePatch
 * @typedef {{ title: string, unit: string, range: Range, auto: boolean, palette: PaletteId, contours: number[],
 *   uniformity?: boolean, collapsed: boolean, onChange: (patch: ScalePatch, label: string) => void, onCollapse: (collapsed: boolean) => void }} ScaleProps
 */

/** A value for a scale label: three significant figures, grouped. @param {number} x */
function label(x) {
  if (!Number.isFinite(x)) return '–';
  if (x >= 1000) return fmt(Math.round(x), 0);
  if (x >= 1) return String(+x.toPrecision(3));
  return String(+x.toPrecision(2));
}

/** Remembers whether the contour editor is open between renders. */
let contoursOpen = false;

/** The contour levels, folded until wanted. @param {ScaleProps} p @param {HTMLElement} chips @param {HTMLElement} add */
function contoursBlock(p, chips, add) {
  const block = h('details', { class: 'scale-contours', open: contoursOpen }, [h('summary', { text: `Contours (${p.contours.length})` }), chips, add]);
  block.addEventListener('toggle', () => { contoursOpen = /** @type {HTMLDetailsElement} */ (block).open; });
  return block;
}

/** @param {ScaleProps} p @returns {HTMLElement} */
export function scalePanel(p) {
  const head = h('button', { class: 'scale-head', type: 'button', 'aria-expanded': String(!p.collapsed) }, [
    h('span', { text: p.title }), h('small', { text: p.uniformity ? 'ratio' : p.unit }), h('span', { 'data-icon': 'chevron' }),
  ]);
  head.addEventListener('click', () => p.onCollapse(!p.collapsed));
  if (p.collapsed) return h('div', { class: 'scale-panel', 'data-collapsed': 'true' }, [head]);

  if (p.uniformity) {
    const stops = PALETTES.contrast;
    return h('div', { class: 'scale-panel' }, [head, h('div', { class: 'scale-body uniform' }, [
      h('div', { class: 'scale-bar-v', style: `background: ${cssGradient(stops)}` }),
      h('div', { class: 'scale-labels' }, [['Twice as bright', 1], ['Even', 0.5], ['Half as bright', 0]].map(([text, t]) => h('span', { class: 'tick', style: `bottom: calc(${Number(t) * 100}% - ${Number(t) * 14}px)`, text: String(text) }))),
    ]), h('p', { class: 'scale-note', text: 'Each direction against its surroundings on both sides. A steady change, such as the cut-off, reads as even. Grey: dark beyond the scale.' })]);
  }

  const r = p.range;
  const stops = PALETTES[p.palette];
  const bar = h('div', { class: 'scale-bar-v', style: `background: ${cssGradient(stops)}` }, p.contours.filter(c => c >= r.min && c <= r.max).map(c => h('i', { style: `bottom: ${Math.max(0, Math.min(1, position(r, c))) * 100}%`, 'data-tip': `Contour at ${formatLevel(c)} ${p.unit}` })));
  // Tick values between the two editable ends, which sit beside the bar's top and bottom.
  const tickEls = ticks(r).filter(v => { const t = position(r, v); return t > 0.16 && t < 0.84; }).map(v => h('span', { class: 'tick', style: `bottom: calc(${position(r, v) * 100}% - 7px)`, text: label(v) }));

  /** An editable end of the scale. @param {'min' | 'max'} end */
  const endInput = end => {
    const input = h('input', { class: 'scale-end', value: label(r[end]), 'aria-label': `${end === 'max' ? 'Top' : 'Bottom'} of the scale (${p.unit})`, inputmode: 'decimal', spellcheck: 'false' });
    input.addEventListener('change', () => {
      const v = Number(input.value.replace(/[\s,]/g, ''));
      if (!Number.isFinite(v) || v < 0) { input.value = label(r[end]); return; }
      p.onChange({ auto: 'no', min: end === 'min' ? v : r.min, max: end === 'max' ? v : r.max }, `Set the ${end === 'max' ? 'top' : 'bottom'} of the scale`);
    });
    input.addEventListener('keydown', e => { if (e.key === 'Enter') input.blur(); if (e.key === 'Escape') { input.value = label(r[end]); input.blur(); } });
    return input;
  };

  const scale = h('div', { class: 'segmented compact', role: 'group', 'aria-label': 'Scale' }, (/** @type {['log' | 'linear', string][]} */ ([['log', 'Log'], ['linear', 'Linear']])).map(([v, text]) => {
    const b = h('button', { type: 'button', 'aria-pressed': String(r.scale === v), text });
    b.addEventListener('click', () => { if (r.scale !== v) p.onChange({ scale: v, auto: 'yes' }, `Use a ${v} scale`); });
    return b;
  }));
  const fit = h('button', { class: 'outline-button compact', type: 'button', 'aria-pressed': String(p.auto), 'data-tip': 'Fit the range to the picture' }, [h('span', { 'data-icon': 'fit' }), h('span', { text: 'Fit' })]);
  fit.addEventListener('click', () => p.onChange({ auto: 'yes' }, 'Fit the scale'));
  const palette = h('select', { class: 'select compact', 'aria-label': 'Palette' }, Object.entries(PALETTE_NAMES).map(([id, name]) => h('option', { value: id, text: name, selected: id === p.palette })));
  palette.addEventListener('change', () => p.onChange({ palette: /** @type {PaletteId} */ (palette.value) }, 'Change the palette'));

  const chips = h('div', { class: 'contour-chips' }, p.contours.map((c, i) => {
    const remove = h('button', { type: 'button', 'aria-label': `Remove the contour at ${formatLevel(c)}`, text: '×' });
    remove.addEventListener('click', () => p.onChange({ contours: p.contours.filter((_, j) => j !== i) }, 'Remove a contour level'));
    return h('span', { class: 'chip' }, [formatLevel(c), remove]);
  }));
  const add = h('input', { class: 'text-input compact', placeholder: 'Add a level', 'aria-label': `Add a contour level (${p.unit})`, inputmode: 'decimal' });
  add.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    const v = Number(add.value.replace(/[\s,]/g, ''));
    if (!(v > 0) || p.contours.length >= 16) return;
    p.onChange({ contours: [...new Set([...p.contours, v])].sort((a, b) => a - b) }, 'Add a contour level');
  });

  return h('div', { class: 'scale-panel' }, [
    head,
    h('div', { class: 'scale-body' }, [
      bar, h('div', { class: 'scale-labels' }, [endInput('max'), ...tickEls, endInput('min')]),
    ]),
    h('div', { class: 'scale-controls' }, [h('div', { class: 'scale-row' }, [scale, fit]), palette]),
    contoursBlock(p, chips, add),
  ]);
}
