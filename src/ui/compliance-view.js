/** The compliance study: every R149 requirement for the design's beam class, measured in the aimed beam, with its
 * margin. Rows are grouped by what the requirement protects, and pointing at a row picks it out in the beam view. */

import { h, fmt } from './dom.js';
import { SOURCE } from '../core/regulation/r149.js';

/** @import { Design } from '../core/model.js' */
/** @import { Analysis } from '../core/analysis.js' */
/** @import { Item, Group, Status } from '../core/regulation/evaluate.js' */

const CLASS_TITLES = { C: 'Class C passing beam', V: 'Class V passing beam', B: 'Class B driving beam', A: 'Class A driving beam' };

/** @type {[Group, string, string][]} */
const GROUPS = [
  ['cutoff', 'Cut-off', 'Sharpness and straightness of the line the laboratory aims by'],
  ['glare', 'Glare', 'Limits above the cut-off that protect oncoming drivers'],
  ['signs', 'Overhead signs', 'Light above the cut-off for signs and the road edge'],
  ['beam', 'Road ahead', 'Light below the cut-off for range and width'],
  ['foreground', 'Foreground', 'The road just ahead must not outshine the distance'],
  ['flux', 'Flux', 'Total light of the beam'],
];

/** @type {Record<Status, [string, string]>} icon and word */
const STATUS_TEXT = { pass: ['pass', 'Pass'], near: ['alert', 'Near'], fail: ['fail', 'Fail'], blocked: ['minus', 'Waits'] };

/** @param {Item} item */
export function formatValue(item) {
  if (!Number.isFinite(item.value)) return '–';
  if (item.unit === 'G') return fmt(item.value, 2);
  if (item.unit === '°') return `${fmt(item.value, 2)}°`;
  if (item.unit === 'lm') return `${fmt(item.value, 0)} lm`;
  return `${fmt(item.value, item.value < 100 ? 1 : 0)} cd`;
}

/** @param {number} m */
function formatMargin(m) {
  if (!Number.isFinite(m)) return '–';
  const p = Math.round(m * 100);
  return `${p > 0 ? '+' : p < 0 ? '−' : ''}${Math.abs(p)}%`;
}

/**
 * A bar centred on zero margin: failing headroom grows left in red, passing headroom right, both clipped at 100%.
 * @param {Item} item
 */
function marginBar(item) {
  const m = Number.isFinite(item.margin) ? Math.max(-1, Math.min(1, item.margin)) : 0;
  const bar = h('span', { class: 'margin-bar', 'data-status': item.status }, [
    h('i', { style: m >= 0 ? `left:50%;width:${m * 50}%` : `right:50%;width:${-m * 50}%` }),
  ]);
  return h('span', { class: 'margin' }, [bar, h('span', { class: 'margin-value', text: formatMargin(item.margin) })]);
}

/**
 * @param {{ design: Design, analysis: Analysis | null, error: string | null, running: boolean, selected: string | null,
 *   onSelect: (id: string | null) => void }} props
 */
export function complianceView({ design, analysis, error, running, selected, onSelect }) {
  const title = h('div', { class: 'dock-title' }, [
    h('h3', { text: 'Compliance' }),
    h('p', { text: `${SOURCE.title}, ${CLASS_TITLES[design.beamClass]}, ${design.traffic === 'right' ? 'right' : 'left'}-hand traffic` }),
  ]);
  if (error) return h('div', { class: 'dock-inner' }, [title, h('div', { class: 'error-note', text: error })]);
  if (!analysis) {
    return h('div', { class: 'dock-inner' }, [title, h('div', { class: 'empty-state' }, [h('strong', { text: running ? 'Tracing the beam…' : 'No beam yet' }), running ? 'The check appears as soon as the first rays are in.' : 'Change any value to trace the design.'])]);
  }
  const e = analysis.evaluation;
  const counts = { pass: 0, near: 0, fail: 0, blocked: 0 };
  for (const item of e.items) counts[item.status]++;
  const met = counts.pass + counts.near;

  const verdict = h('div', { class: `tile hero verdict-tile ${e.pass ? 'pass' : 'fail'}` }, [
    h('div', { class: 'tile-label', text: e.pass ? 'Meets the regulation' : 'Does not meet it yet' }),
    h('div', { class: 'tile-value' }, [`${met} of ${e.items.length}`, h('small', { text: 'met' })]),
    h('div', { class: 'tile-note', text: [counts.fail ? `${counts.fail} failing` : '', counts.near ? `${counts.near} near the limit` : '', counts.blocked ? `${counts.blocked} waiting` : ''].filter(Boolean).join(', ') || 'Every requirement has headroom' }),
  ]);
  const worst = e.worst;
  const tiles = h('div', { class: 'tiles stacked' }, [
    verdict,
    worst ? h('div', { class: 'tile', 'data-tip': worst.cite }, [
      h('div', { class: 'tile-label', text: 'Least headroom' }),
      h('div', { class: 'tile-value tile-text', text: worst.label }),
      h('div', { class: 'tile-note', text: `${formatMargin(worst.margin)} against ${worst.requirement}` }),
    ]) : null,
    h('div', { class: 'tile', 'data-tip': `Aimed by the ${e.aim.method}` }, [
      h('div', { class: 'tile-label', text: 'Laboratory aim' }),
      h('div', { class: 'tile-value aim-value', text: aimText(e.aim.dh, e.aim.dv) }),
      h('div', { class: 'tile-note', text: e.aim.method.replace(/ \(.*\)$/, '') }),
    ]),
    h('div', { class: 'tile' }, [
      h('div', { class: 'tile-label', text: 'Peak intensity' }),
      h('div', { class: 'tile-value' }, [fmt(analysis.peak.value, 0), h('small', { text: 'cd' })]),
      h('div', { class: 'tile-note', text: `At ${angle(analysis.peak.h, 'R', 'L')}, ${angle(analysis.peak.v, 'U', 'D')}` }),
    ]),
  ]);

  const rows = [];
  for (const [group, name, note] of GROUPS) {
    const items = e.items.filter(i => i.group === group);
    if (!items.length) continue;
    rows.push(h('tr', { class: 'group-row' }, [h('th', { colspan: '5', scope: 'rowgroup' }, [h('span', { text: name }), h('small', { text: note })])]));
    for (const item of items) {
      const [icon, word] = STATUS_TEXT[item.status];
      const showError = item.error >= 0.03 && Number.isFinite(item.value);
      const row = h('tr', { class: 'req-row', 'data-id': item.id, 'aria-selected': String(item.id === selected), tabindex: '0' }, [
        h('td', {}, [h('span', { class: `verdict ${item.status}` }, [h('span', { 'data-icon': icon }), word])]),
        h('td', { class: 'req-name' }, [h('span', { text: item.label }), h('small', { text: item.cite.replace('R149 01 series, ', '') })]),
        h('td', { class: 'req-value' }, [formatValue(item), showError ? h('small', { text: ` ±${Math.round(item.error * 100)}%`, 'data-tip': 'Statistical error from the rays this value rests on. More rays make it smaller.' }) : null]),
        h('td', { class: 'req-limit', text: item.requirement }),
        h('td', {}, [marginBar(item)]),
      ]);
      row.addEventListener('pointerenter', () => onSelect(item.id));
      row.addEventListener('focus', () => onSelect(item.id));
      rows.push(row);
    }
  }
  const table = h('table', { class: 'compliance' }, [
    h('thead', {}, [h('tr', {}, ['Result', 'Requirement', 'Measured', 'Limit', 'Margin'].map(text => h('th', { text, scope: 'col' })))]),
    h('tbody', {}, rows),
  ]);
  table.addEventListener('pointerleave', () => onSelect(null));

  const notes = e.aim.notes.map(n => h('p', { class: 'aim-note' }, [h('span', { 'data-icon': 'alert' }), n]));
  return h('div', { class: 'dock-inner' }, [
    title,
    h('div', { class: 'study-layout' }, [tiles, h('div', { class: 'compliance-main' }, [...notes, h('div', { class: 'table-wrap' }, [table])])]),
  ]);
}

/** @param {number} value @param {string} plus @param {string} minus */
function angle(value, plus, minus) {
  const a = Math.abs(value);
  return a < 0.005 ? '0°' : `${fmt(a, 2)}°${value > 0 ? plus : minus}`;
}

/** How far the laboratory moved the beam. @param {number} dh @param {number} dv */
export function aimText(dh, dv) {
  const parts = [];
  if (Math.abs(dv) >= 0.005) parts.push(`${fmt(Math.abs(dv), 2)}° ${dv > 0 ? 'up' : 'down'}`);
  if (Math.abs(dh) >= 0.005) parts.push(`${fmt(Math.abs(dh), 2)}° ${dh > 0 ? 'right' : 'left'}`);
  return parts.length ? parts.join(', ') : 'Not moved';
}
