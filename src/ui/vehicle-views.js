/** The vehicle workspace's dock: the installation checks of one regulation, the lamps placed, the selected lamp's
 * visibility map and the model. */

import { h, fmt } from './dom.js';
import { INSTALL_ROLES, overallWidth } from '../core/installation.js';
import { formatMargin } from './photometry-views.js';

/** @import { Vehicle } from '../core/vehicle.js' */
/** @import { InstallResult, InstallItem, VisibilityMap } from '../core/installation.js' */
/** @import { Bounds } from '../core/mesh/mesh.js' */

const WORDS = /** @type {Record<InstallItem['status'], [string, string]>} */ ({ pass: ['pass', 'Pass'], near: ['alert', 'Near'], fail: ['fail', 'Fail'], info: ['info', 'By hand'] });

/** @param {InstallItem} i */
function value(i) {
  if (!Number.isFinite(i.value)) return '–';
  if (i.unit === 'mm') return `${fmt(i.value, 0)} mm`;
  if (i.unit === 'mm²') return `${fmt(i.value, 0)} mm²`;
  if (i.unit === '% hidden') return `${fmt(i.value, 0)}% hidden`;
  return fmt(i.value, 0);
}

/**
 * The checks of one regulation, grouped by lamp function.
 * @param {{ vehicle: Vehicle, results: InstallResult[], pack: 'r48' | 'fmvss108', hasModel: boolean, busy: boolean, selected: number | null,
 *   onPack: (pack: 'r48' | 'fmvss108') => void, onSelect: (lamp: number | null) => void, onAdd: () => void, onReport: () => void }} props
 */
export function checksView({ vehicle, results, pack, hasModel, busy, selected, onPack, onSelect, onAdd, onReport }) {
  const result = results.find(r => r.pack === pack);
  const tabs = h('div', { class: 'segmented compact pack-switch', role: 'group', 'aria-label': 'Regulation' }, results.map(r => {
    const b = h('button', { type: 'button', 'aria-pressed': String(r.pack === pack), text: r.title });
    b.addEventListener('click', () => onPack(r.pack));
    return b;
  }));
  const add = h('button', { class: 'outline-button', type: 'button' }, [h('span', { 'data-icon': 'plus' }), h('span', { text: 'Add a lamp' })]);
  add.addEventListener('click', onAdd);
  const report = h('button', { class: 'outline-button', type: 'button', disabled: !results.length }, [h('span', { 'data-icon': 'table' }), h('span', { text: 'Report' })]);
  report.addEventListener('click', onReport);
  const title = h('div', { class: 'dock-title' }, [h('h3', { text: 'Installation' }), results.length > 1 ? tabs : null, h('p', { text: `Category ${vehicle.vehicle.category}, ${vehicle.lamps.length} ${vehicle.lamps.length === 1 ? 'lamp' : 'lamps'} placed` }), h('div', { class: 'dock-tools' }, [add, report])]);
  if (!hasModel) return h('div', { class: 'dock-inner' }, [title, h('div', { class: 'empty-state' }, [h('strong', { text: 'No vehicle model yet' }), 'Open an STL, OBJ or glTF model of the vehicle, or try the sample vehicle.'])]);
  if (!result) return h('div', { class: 'dock-inner' }, [title, h('div', { class: 'empty-state' }, [h('strong', { text: busy ? 'Checking…' : 'No regulation chosen' }), busy ? '' : 'Choose UN R48 or FMVSS 108 under Vehicle in the design panel.'])]);
  const counts = { pass: 0, near: 0, fail: 0, info: 0 };
  for (const i of result.items) counts[i.status]++;
  const judged = result.items.length - counts.info;
  const banner = h('div', { class: `summary-banner ${counts.fail ? 'fail' : 'pass'}` }, [
    h('span', { 'data-icon': counts.fail ? 'alert' : 'pass' }),
    counts.fail ? `${counts.fail} of ${judged} checks fail` : `All ${judged} checks pass`,
    counts.info ? h('small', { class: 'banner-note', text: ` · ${counts.info} to check by hand` }) : null,
  ]);
  const rows = [];
  for (const [role, def] of Object.entries(INSTALL_ROLES)) {
    const items = result.items.filter(i => i.role === role);
    if (!items.length) continue;
    rows.push(h('tr', { class: 'group-row' }, [h('th', { colspan: '5', scope: 'rowgroup' }, [h('span', { text: def.name })])]));
    for (const item of items) {
      const [icon, word] = WORDS[item.status];
      const row = h('tr', { class: 'req-row', 'aria-selected': String(item.lamp !== null && item.lamp === selected), tabindex: '0' }, [
        h('td', {}, [h('span', { class: `verdict ${item.status === 'info' ? 'info' : item.status}` }, [h('span', { 'data-icon': icon }), word])]),
        h('td', { class: 'req-name' }, [h('span', { text: item.label }), h('small', { text: item.cite })]),
        h('td', { class: 'req-value', text: value(item) }),
        h('td', { class: 'req-limit' }, [item.requirement, item.note ? h('small', { class: 'item-note', text: item.note }) : null]),
        h('td', { class: 'margin-value', text: formatMargin(item.margin) }),
      ]);
      if (item.lamp !== null) row.addEventListener('click', () => onSelect(item.lamp));
      rows.push(row);
    }
  }
  const table = h('table', { class: 'compliance installation' }, [
    h('thead', {}, [h('tr', {}, ['Result', 'Check', 'Measured', 'Requirement', 'Margin'].map(text => h('th', { text, scope: 'col' })))]),
    h('tbody', {}, rows),
  ]);
  const source = h('details', { class: 'source-note' }, [h('summary', { text: `Source: ${result.source.title}` }), h('p', { text: result.source.document })]);
  return h('div', { class: 'dock-inner' }, [title, banner, source, h('div', { class: 'table-wrap' }, [table])]);
}

/**
 * The lamps placed on the vehicle.
 * @param {{ vehicle: Vehicle, statuses: ('pass' | 'near' | 'fail' | 'none')[], selected: number | null, onSelect: (i: number) => void, onAdd: () => void }} props
 */
export function lampsView({ vehicle, statuses, selected, onSelect, onAdd }) {
  const add = h('button', { class: 'outline-button', type: 'button' }, [h('span', { 'data-icon': 'plus' }), h('span', { text: 'Add a lamp' })]);
  add.addEventListener('click', onAdd);
  const title = h('div', { class: 'dock-title' }, [h('h3', { text: 'Lamps' }), h('p', { text: 'Centre of reference in the vehicle frame: ahead of the front, left of the median plane, above the ground' }), h('div', { class: 'dock-tools' }, [add])]);
  if (!vehicle.lamps.length) return h('div', { class: 'dock-inner' }, [title, h('div', { class: 'empty-state' }, [h('strong', { text: 'No lamps placed' }), 'Add a lamp, then click the model where its centre of reference is.'])]);
  const faces = { front: 'Forwards', rear: 'Rearwards', left: 'Left', right: 'Right' };
  const rows = vehicle.lamps.map((l, i) => {
    const s = statuses[i] ?? 'none';
    const [icon, word] = s === 'none' ? ['minus', '–'] : WORDS[s];
    const row = h('tr', { class: 'req-row', 'aria-selected': String(i === selected), tabindex: '0' }, [
      h('td', {}, [h('span', { class: `verdict ${s === 'none' ? 'info' : s}` }, [h('span', { 'data-icon': icon }), word])]),
      h('td', { class: 'req-name' }, [h('span', { text: l.name }), h('small', { text: INSTALL_ROLES[l.role]?.name ?? l.role })]),
      h('td', { text: faces[l.facing] }),
      h('td', { class: 'req-value', text: `${fmt(l.x, 0)}, ${fmt(l.y, 0)}, ${fmt(l.z, 0)}` }),
      h('td', { class: 'req-value', text: `${fmt(l.width, 0)} × ${fmt(l.height, 0)}` }),
    ]);
    row.addEventListener('click', () => onSelect(i));
    return row;
  });
  const table = h('table', { class: 'compliance' }, [h('thead', {}, [h('tr', {}, ['Result', 'Lamp', 'Faces', 'x, y, z (mm)', 'Apparent surface (mm)'].map(text => h('th', { text, scope: 'col' })))]), h('tbody', {}, rows)]);
  return h('div', { class: 'dock-inner' }, [title, h('div', { class: 'table-wrap' }, [table])]);
}

/**
 * The selected lamp's visibility: every direction of its field, coloured by how much of the apparent surface is seen.
 * @param {{ vehicle: Vehicle, selected: number | null, map: VisibilityMap | null }} props
 */
export function visibilityView({ vehicle, selected, map }) {
  const lamp = selected !== null ? vehicle.lamps[selected] : null;
  const title = h('div', { class: 'dock-title' }, [h('h3', { text: 'Visibility' }), h('p', { text: lamp ? `${lamp.name}: the share of its apparent surface seen from each direction` : 'Select a lamp to see its field of visibility' })]);
  if (!lamp || !map) return h('div', { class: 'dock-inner' }, [title, h('div', { class: 'empty-state' }, [h('strong', { text: lamp ? 'No field for this lamp' : 'No lamp selected' }), lamp ? 'Its regulation gives its visibility in words; see the installation checks.' : 'Click a lamp on the model or in the list.'])]);
  const betas = [...new Set(map.sights.map(s => s.beta))].sort((a, b) => a - b), alphas = [...new Set(map.sights.map(s => s.alpha))].sort((a, b) => b - a);
  const cell = 22, ox = 54, oy = 12;
  const w = ox + betas.length * cell + 8, ht = oy + alphas.length * cell + 30;
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${w} ${ht}`);
  svg.setAttribute('width', String(w)); svg.setAttribute('height', String(ht));
  svg.setAttribute('class', 'visibility-map');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `Visibility of ${lamp.name}`);
  /** @param {string} tag @param {Record<string, string | number>} attrs @param {string} [text] */
  const el = (tag, attrs, text) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v)); if (text) e.textContent = text; svg.append(e); return e; };
  for (const s of map.sights) {
    const x = ox + betas.indexOf(s.beta) * cell, y = oy + alphas.indexOf(s.alpha) * cell;
    const r = el('rect', { x: x + 1, y: y + 1, width: cell - 2, height: cell - 2, rx: 3, class: s.visible >= 1 ? 'seen' : s.visible > 0 ? 'partly' : 'hidden' });
    const t = document.createElementNS(NS, 'title'); t.textContent = `${Math.abs(s.beta)}° ${s.beta >= 0 ? (map.side ? 'forwards' : 'outwards') : (map.side ? 'rearwards' : 'inwards')}, ${Math.abs(s.alpha)}° ${s.alpha >= 0 ? 'up' : 'down'}: ${Math.round(s.visible * 100)}% seen`; r.append(t);
  }
  alphas.forEach((a, k) => { if (k % 2 === 0 || a === 0) el('text', { x: ox - 6, y: oy + k * cell + cell / 2 + 4, 'text-anchor': 'end' }, `${Math.abs(a)}°${a > 0 ? 'U' : a < 0 ? 'D' : ''}`); });
  betas.forEach((b, k) => { if (k % 3 === 0 || b === 0) el('text', { x: ox + k * cell + cell / 2, y: oy + alphas.length * cell + 14, 'text-anchor': 'middle' }, `${Math.abs(b)}°`); });
  el('text', { x: ox, y: ht - 2 }, map.side ? '← rearwards · forwards →' : '← inwards · outwards →');
  const hiddenDirs = map.sights.filter(s => s.visible < 1).length;
  const legend = h('div', { class: 'visibility-legend' }, [
    h('span', {}, [h('i', { class: 'seen' }), 'Whole surface seen']), h('span', {}, [h('i', { class: 'partly' }), 'Partly hidden']), h('span', {}, [h('i', { class: 'hidden' }), 'Hidden']),
  ]);
  const summary = h('div', { class: 'tiles stacked' }, [
    h('div', { class: `tile hero verdict-tile ${hiddenDirs ? 'fail' : 'pass'}` }, [h('div', { class: 'tile-label', text: hiddenDirs ? 'Bodywork hides part of the lamp' : 'Nothing hides the lamp' }), h('div', { class: 'tile-value' }, [`${map.sights.length - hiddenDirs}`, h('small', { text: `of ${map.sights.length} directions clear` })])]),
    h('div', { class: 'tile' }, [h('div', { class: 'tile-label', text: 'Field' }), h('div', { class: 'tile-note', text: `${map.field.up}° up, ${map.field.down}° down; across from ${-map.field.in}° to ${map.field.out}°${map.field.inBelowH !== undefined ? `, ${map.field.inBelowH}° inwards below its centre` : ''}. Sampled every 5°.` })]),
  ]);
  return h('div', { class: 'dock-inner' }, [title, h('div', { class: 'study-layout' }, [summary, h('div', { class: 'table-wrap' }, [svg, legend])])]);
}

/**
 * The model: its size in the vehicle frame and how it was read.
 * @param {{ vehicle: Vehicle, bounds: Bounds | null, triangles: number, error: string | null }} props
 */
export function modelView({ vehicle, bounds, triangles, error }) {
  const title = h('div', { class: 'dock-title' }, [h('h3', { text: 'Model' }), h('p', { text: vehicle.model.name || 'No model open' })]);
  if (error) return h('div', { class: 'dock-inner' }, [title, h('div', { class: 'error-note', text: error })]);
  if (!bounds) return h('div', { class: 'dock-inner' }, [title, h('div', { class: 'empty-state' }, [h('strong', { text: 'No vehicle model yet' }), 'Cutline reads STL, OBJ and glTF (.glb). Export STEP or other CAD files from your CAD system in one of these formats.'])]);
  const w = overallWidth(vehicle, bounds);
  /** @type {[string, string][]} */
  const facts = [
    ['Length', `${fmt(bounds.max[0] - bounds.min[0], 0)} mm`],
    ['Width of the model', `${fmt(bounds.max[1] - bounds.min[1], 0)} mm, mirrors included`],
    ['Overall width used', `${fmt(w, 0)} mm${vehicle.vehicle.overallWidth > 0 ? ', as set' : ', from the model: set it under Vehicle to leave out the mirrors'}`],
    ['Height', `${fmt(bounds.max[2] - bounds.min[2], 0)} mm above the ground`],
    ['Triangles', fmt(triangles, 0)],
    ['Read as', `${vehicle.model.units}, forward ${vehicle.model.forward.toUpperCase()}, up ${vehicle.model.up.toUpperCase()}`],
    ['Frame', 'x forwards from the front-most point, y to the left of the median plane, z up from the ground (ISO 8855)'],
  ];
  const table = h('table', { class: 'data-table facts' }, [h('tbody', {}, facts.map(([k, v]) => h('tr', {}, [h('th', { text: k, scope: 'row' }), h('td', { text: v })])))]);
  return h('div', { class: 'dock-inner' }, [title, h('div', { class: 'table-wrap' }, [table])]);
}
