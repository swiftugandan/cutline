/** The photometry workspace's dock: the market matrix and one market's requirements, the user's targets, the dark
 * patches the uniformity map finds, the road and the file. Each view is a function of the study and its analysis;
 * every edit goes back through callbacks that run a store transaction. */

import { h, fmt } from './dom.js';
import { complianceView, formatValue, STATUS_TEXT } from './compliance-view.js';
import { PACKS, ROLES, packById, functionsFor, isHeadlampRole, conditionPack } from '../core/regulation/catalog.js';

/** @import { Study, Target } from '../core/study.js' */
/** @import { StudyAnalysis, MarketResult } from '../core/study-analysis.js' */
/** @import { Item } from '../core/regulation/engine.js' */
/** @import { Market, Provenance } from '../core/regulation/catalog.js' */
/** @import { Dip } from '../core/uniformity.js' */

export const PROVENANCE = /** @type {Record<Provenance, [string, string]>} */ ({
  official: ['Official text', 'Transcribed from the official text, every value cited'],
  adopted: ['Adopted', 'The national rule adopts another regulation; Cutline checks that regulation\'s data'],
  incomplete: ['Incomplete', 'Part of the text could not be reached; missing requirements are listed'],
});

/** @param {number} m */
export function formatMargin(m) {
  if (!Number.isFinite(m)) return '–';
  const p = Math.round(m * 100);
  return `${p > 0 ? '+' : p < 0 ? '−' : ''}${Math.abs(p)}%`;
}

/** The headline of one market: met, failing, near. @param {MarketResult} r */
export function marketCounts(r) {
  const c = { pass: 0, near: 0, fail: 0, blocked: 0, nodata: 0, info: 0 };
  for (const i of r.items) c[i.status]++;
  return { ...c, met: c.pass + c.near, judged: r.items.length - c.info };
}

/** A market's name: the pack, its function and the traffic side. @param {MarketResult | { pack: { short: string }, fn: { name: string }, market: Market }} r @param {boolean} headlamp */
export function marketName(r, headlamp) {
  return `${r.pack.short}${headlamp ? `, ${r.market.traffic === 'right' ? 'RHT' : 'LHT'}` : ''}`;
}

/** @param {Provenance} p */
function provenanceBadge(p) {
  const [text, tip] = PROVENANCE[p];
  return h('span', { class: `badge provenance-${p}`, 'data-tip': tip, text });
}

/**
 * @param {{ study: Study, analysis: StudyAnalysis | null, error: string | null, running: boolean, selected: string | null,
 *   picked: string | null, onPick: (key: string) => void, onSelect: (id: string | null) => void, onRemove: (index: number) => void,
 *   onAdd: () => void, onCondition: (packId: string, id: string, on: boolean, set?: string) => void, onReport: () => void }} props
 */
export function marketsView({ study, analysis, error, running, selected, picked, onPick, onSelect, onRemove, onAdd, onCondition, onReport }) {
  const headlamp = isHeadlampRole(study.lamp.role);
  const tools = h('div', { class: 'dock-tools' }, [
    button('plus', 'Add a market', onAdd),
    button('table', 'Report', onReport, !analysis),
  ]);
  const title = h('div', { class: 'dock-title' }, [
    h('h3', { text: 'Markets' }),
    h('p', { text: `${ROLES[study.lamp.role]}${headlamp ? `, made for ${study.lamp.traffic}-hand traffic` : ''}${study.lamp.aim === 'laboratory' ? ', aimed as each laboratory aims it' : ', as measured'}` }),
    tools,
  ]);
  if (error) return h('div', { class: 'dock-inner' }, [title, h('div', { class: 'error-note', text: error })]);
  if (!analysis) return h('div', { class: 'dock-inner' }, [title, h('div', { class: 'empty-state' }, [h('strong', { text: running ? 'Checking every market…' : 'No light distribution yet' }), running ? 'Results appear as soon as the file is read.' : 'Open an IES or EULUMDAT file to check it.'])]);
  if (!analysis.markets.length) return h('div', { class: 'dock-inner' }, [title, h('div', { class: 'empty-state' }, [h('strong', { text: 'No market chosen' }), 'Add a market to check this lamp against its regulation.'])]);

  const rows = analysis.markets.map((r, index) => {
    const c = marketCounts(r);
    const verdict = r.pass ? 'pass' : 'fail';
    const [icon, word] = STATUS_TEXT[verdict];
    const remove = h('button', { class: 'icon-button small', type: 'button', 'aria-label': `Remove ${marketName(r, headlamp)}`, 'data-tip': 'Remove this market' }, [h('span', { 'data-icon': 'close' })]);
    remove.addEventListener('click', e => { e.stopPropagation(); onRemove(index); });
    const row = h('tr', { class: 'req-row market-row', 'aria-selected': String(r.key === picked), tabindex: '0', 'data-key': r.key }, [
      h('td', {}, [h('span', { class: `verdict ${verdict}` }, [h('span', { 'data-icon': icon }), r.pass ? word : `${c.fail} failing`])]),
      h('td', { class: 'req-name' }, [h('span', { text: marketName(r, headlamp) }), h('small', { text: r.pack.region })]),
      h('td', { class: 'req-name' }, [h('span', { text: r.fn.name }), h('small', { text: r.beam === 'mirror' ? 'Checked on the mirror image, the lamp for this traffic side' : r.aim.method })]),
      h('td', { class: 'req-value', text: `${c.met} of ${c.judged}` }),
      h('td', { class: 'req-limit' }, r.worst ? [h('span', { text: r.worst.label }), h('small', { class: 'margin-inline', text: ` ${formatMargin(r.worst.margin)}` })] : ['–']),
      h('td', {}, [provenanceBadge(r.pack.provenance)]),
      h('td', {}, [remove]),
    ]);
    row.addEventListener('click', () => onPick(r.key));
    row.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(r.key); } });
    return row;
  });
  const passing = analysis.markets.filter(r => r.pass).length;
  const matrix = h('table', { class: 'compliance markets' }, [
    h('thead', {}, [h('tr', {}, ['Result', 'Market', 'Function', 'Met', 'Least headroom', 'Source', ''].map(text => h('th', { text, scope: 'col' })))]),
    h('tbody', {}, rows),
  ]);
  const summary = h('div', { class: `summary-banner ${passing === analysis.markets.length ? 'pass' : 'fail'}` }, [
    h('span', { 'data-icon': passing === analysis.markets.length ? 'pass' : 'alert' }),
    passing === analysis.markets.length ? (passing === 1 ? 'Meets the market checked' : `Meets all ${passing} markets`) : `Meets ${passing} of ${analysis.markets.length} markets`,
  ]);

  const r = analysis.markets.find(m => m.key === picked) ?? analysis.markets[0];
  const pack = packById(r.market.pack);
  const fn = pack?.functions.find(f => f.id === r.market.fn);
  // The conditions this function's requirements depend on, and for a visually aimed FMVSS lower beam, which side its
  // cut-off is on, which decides its aim.
  const used = new Set((fn?.requirements ?? []).flatMap(q => q.when ?? []));
  if (fn?.aimRule === 'fmvss-visual-lower') used.add('vol').add('vor');
  const conditions = (pack?.conditions ?? []).filter(c => used.has(c.id));
  const declared = new Set(study.conditions);
  const owner = pack ? conditionPack(pack) : r.market.pack;
  const conditionBox = conditions.length ? h('div', { class: 'conditions' }, [
    h('span', { class: 'scale-sub', text: 'This lamp' }),
    ...conditions.map(c => {
      const key = `${owner}:${c.id}`;
      const input = h('input', { type: 'checkbox', checked: declared.has(key) });
      input.addEventListener('change', () => onCondition(owner, c.id, input.checked, c.set));
      return h('label', { class: 'condition', 'data-tip': c.text }, [input, h('span', { text: conditionLabel(c.text) })]);
    }),
  ]) : null;
  const heading = [
    h('p', { class: 'provenance-note' }, [provenanceBadge(r.pack.provenance), ` ${r.pack.statement} `, h('a', { href: r.pack.source.url, target: '_blank', rel: 'noopener', text: r.pack.source.document.length > 90 ? `${r.pack.source.document.slice(0, 90)}…` : r.pack.source.document })]),
    conditionBox,
    ...r.pack.notes.slice(0, 6).map(n => h('p', { class: 'aim-note subtle' }, [h('span', { 'data-icon': 'info' }), n])),
  ];
  const detail = complianceView({
    title: `${marketName(r, headlamp)}: ${r.fn.name}`, subtitle: r.pack.title,
    evaluation: { beamClass: 'C', traffic: r.market.traffic, aim: r.aim, items: r.items, pass: r.pass, worst: r.worst, source: { title: r.pack.title, document: r.pack.source.document, url: r.pack.source.url } },
    peak: null, error: null, running, selected, onSelect, heading,
  });
  return h('div', { class: 'dock-inner' }, [title, summary, h('div', { class: 'table-wrap' }, [matrix]), detail]);
}

/** A condition's text up to its first clause, for a checkbox label. @param {string} text */
function conditionLabel(text) {
  const first = text.split(/[(;:]|\. /)[0].trim().replace(/\.$/, '');
  return first.length > 70 ? `${first.slice(0, 68)}…` : first;
}

/** @param {string} icon @param {string} text @param {() => void} run @param {boolean} [disabled] */
function button(icon, text, run, disabled = false) {
  const b = h('button', { class: 'outline-button', type: 'button', disabled }, [h('span', { 'data-icon': icon }), h('span', { text })]);
  b.addEventListener('click', run);
  return b;
}

/**
 * The add-a-market form: a pack, one of its functions for the lamp's role, and a traffic side.
 * @param {Study} study @returns {{ body: HTMLElement, value: () => Market | null }}
 */
export function marketForm(study) {
  const role = study.lamp.role;
  const packs = PACKS.filter(p => functionsFor(p, role).length);
  const pack = h('select', { class: 'select', 'aria-label': 'Regulation' }, packs.map(p => h('option', { value: p.id, text: `${p.short}: ${p.region}` })));
  const fn = h('select', { class: 'select', 'aria-label': 'Function' });
  const traffic = h('select', { class: 'select', 'aria-label': 'Traffic' });
  const refill = () => {
    const p = packById(pack.value);
    fn.replaceChildren(...(p ? functionsFor(p, role) : []).map(f => h('option', { value: f.id, text: f.name })));
    traffic.replaceChildren(...(p?.traffics ?? []).map(t => h('option', { value: t, text: t === 'right' ? 'Right-hand traffic' : 'Left-hand traffic' })));
  };
  pack.addEventListener('change', refill);
  refill();
  const field = (/** @type {string} */ label, /** @type {HTMLElement} */ input) => h('label', { class: 'field' }, [h('span', { class: 'field-label', text: label }), input]);
  return {
    body: h('div', { class: 'form-grid' }, [field('Regulation', pack), field('Function', fn), field('Traffic', traffic)]),
    value: () => (pack.value && fn.value && traffic.value ? { pack: pack.value, fn: fn.value, traffic: /** @type {'right' | 'left'} */ (traffic.value) } : null),
  };
}

/**
 * The user's targets: an editable table with each target's result.
 * @param {{ study: Study, items: Item[], picking: boolean, selected: string | null, onSelect: (id: string | null) => void,
 *   onEdit: (index: number, patch: Partial<Target>) => void, onAdd: () => void, onRemove: (index: number) => void, onPickMode: () => void, frame: string }} props
 */
export function targetsView({ study, items, picking, selected, onSelect, onEdit, onAdd, onRemove, onPickMode, frame }) {
  const title = h('div', { class: 'dock-title' }, [
    h('h3', { text: 'Your targets' }),
    h('p', { text: `Measured in the beam as shown: ${frame}` }),
    h('div', { class: 'dock-tools' }, [button('plus', 'Add a target', onAdd), (() => { const b = button('target', picking ? 'Click the beam…' : 'Pick on the beam', onPickMode); b.setAttribute('aria-pressed', String(picking)); return b; })()]),
  ]);
  if (!study.targets.length) return h('div', { class: 'dock-inner' }, [title, h('div', { class: 'empty-state' }, [h('strong', { text: 'No targets yet' }), 'Add a target, or pick a point on the beam, to hold the lamp to your own values at the points that matter to you.'])]);
  /** @param {number} i @param {keyof Target} key @param {string} label @param {number} [digits] */
  const num = (i, key, label, digits = 2) => {
    const t = study.targets[i];
    const input = h('input', { class: 'text-input cell', value: String(+(/** @type {number} */ (t[key])).toFixed(digits)), 'aria-label': label, inputmode: 'decimal' });
    input.addEventListener('change', () => { const v = Number(input.value.replace(',', '.')); if (Number.isFinite(v)) onEdit(i, { [key]: v }); else input.value = String(t[key]); });
    return input;
  };
  /** @param {number} i @param {keyof Target} key @param {Record<string, string>} options @param {string} label */
  const pick = (i, key, options, label) => {
    const s = h('select', { class: 'select cell', 'aria-label': label }, Object.entries(options).map(([v, text]) => h('option', { value: v, text, selected: study.targets[i][key] === v })));
    s.addEventListener('change', () => onEdit(i, { [key]: s.value }));
    return s;
  };
  const rows = study.targets.map((t, i) => {
    const item = items.find(x => x.id === `target-${i + 1}`);
    const name = h('input', { class: 'text-input cell', value: t.name, 'aria-label': 'Name' });
    name.addEventListener('change', () => onEdit(i, { name: name.value.trim().slice(0, 80) }));
    const remove = h('button', { class: 'icon-button small', type: 'button', 'aria-label': 'Remove this target' }, [h('span', { 'data-icon': 'close' })]);
    remove.addEventListener('click', () => onRemove(i));
    const [icon, word] = item ? STATUS_TEXT[item.status] : ['minus', '–'];
    const row = h('tr', { class: 'req-row', 'data-id': item?.id ?? '', 'aria-selected': String(item?.id === selected) }, [
      h('td', {}, [h('span', { class: `verdict ${item?.status ?? 'blocked'}` }, [h('span', { 'data-icon': icon }), word])]),
      h('td', {}, [name]),
      h('td', {}, [pick(i, 'shape', { point: 'Point', line: 'Line', zone: 'Area' }, 'Shape')]),
      h('td', { class: 'cells' }, [num(i, 'h0', 'H'), num(i, 'v0', 'V'), ...(t.shape === 'point' ? [] : [h('span', { class: 'to', text: 'to' }), num(i, 'h1', 'H to'), num(i, 'v1', 'V to')])]),
      h('td', {}, [pick(i, 'limit', { min: 'At least', max: 'At most', range: 'Between' }, 'Limit')]),
      h('td', { class: 'cells' }, [...(t.limit !== 'max' ? [num(i, 'min', 'Minimum', 1)] : []), ...(t.limit === 'range' ? [h('span', { class: 'to', text: 'and' })] : []), ...(t.limit !== 'min' ? [num(i, 'max', 'Maximum', 1)] : []), pick(i, 'unit', { cd: 'cd', lx: 'lx at 25 m' }, 'Unit')]),
      h('td', { class: 'req-value', text: item ? formatValue(item) : '–' }),
      h('td', { class: 'margin-value', text: item ? formatMargin(item.margin) : '–' }),
      h('td', {}, [remove]),
    ]);
    if (item) row.addEventListener('pointerenter', () => onSelect(item.id));
    return row;
  });
  const table = h('table', { class: 'compliance targets' }, [
    h('thead', {}, [h('tr', {}, ['Result', 'Name', 'Shape', 'Where (H, V in degrees)', 'Limit', 'Value', 'Measured', 'Margin', ''].map(text => h('th', { text, scope: 'col' })))]),
    h('tbody', {}, rows),
  ]);
  table.addEventListener('pointerleave', () => onSelect(null));
  return h('div', { class: 'dock-inner' }, [title, h('div', { class: 'table-wrap' }, [table])]);
}

/**
 * The dark patches the uniformity map finds.
 * @param {{ dips: Dip[], mode: 'light' | 'uniformity', featureDeg: number, depth: number, unit: string, selected: string | null,
 *   onSelect: (id: string | null) => void, onMode: () => void }} props
 */
export function uniformityView({ dips, mode, featureDeg, depth, unit, selected, onSelect, onMode }) {
  const title = h('div', { class: 'dock-title' }, [
    h('h3', { text: 'Uniformity' }),
    h('p', { text: `Directions at least ${Math.round(depth * 100)}% darker than the average within ${fmt(featureDeg, 1)}° around them` }),
    h('div', { class: 'dock-tools' }, [(() => { const b = button('layers', mode === 'uniformity' ? 'Show the light' : 'Show the uniformity map', onMode); return b; })()]),
  ]);
  const deepest = dips[0];
  const tiles = h('div', { class: 'tiles stacked' }, [
    h('div', { class: `tile hero verdict-tile ${dips.length ? 'fail' : 'pass'}` }, [
      h('div', { class: 'tile-label', text: dips.length ? 'Dark patches found' : 'No dark patches' }),
      h('div', { class: 'tile-value', text: String(dips.length) }),
      h('div', { class: 'tile-note', text: dips.length ? `The deepest is ${Math.round((1 - deepest.ratio) * 100)}% below its surroundings` : `Nothing ${Math.round(depth * 100)}% below its surroundings` }),
    ]),
    h('div', { class: 'tile' }, [h('div', { class: 'tile-label', text: 'Change what counts' }), h('div', { class: 'tile-note', text: 'Feature size and depth are under Beam picture in the design panel. A larger feature size finds broad shadows; a smaller one finds stripes.' })]),
  ]);
  const rows = dips.map((d, n) => {
    const id = `dip-${n + 1}`;
    const row = h('tr', { class: 'req-row', 'data-id': id, 'aria-selected': String(id === selected), tabindex: '0' }, [
      h('td', { class: 'req-value', text: String(n + 1) }),
      h('td', { text: `${fmt(Math.abs(d.h), 1)}°${d.h >= 0 ? 'R' : 'L'}, ${fmt(Math.abs(d.v), 1)}°${d.v >= 0 ? 'U' : 'D'}` }),
      h('td', { class: 'req-value', text: `−${Math.round((1 - d.ratio) * 100)}%` }),
      h('td', { class: 'req-value', text: `${label(d.value)} ${unit}` }),
      h('td', { class: 'req-value', text: `${label(d.around)} ${unit}` }),
      h('td', { class: 'req-value', text: `${fmt(d.area, d.area < 1 ? 2 : 1)} deg²` }),
      h('td', { class: 'req-limit', text: `${fmt(d.h1 - d.h0, 1)}° × ${fmt(d.v1 - d.v0, 1)}°` }),
    ]);
    row.addEventListener('pointerenter', () => onSelect(id));
    row.addEventListener('focus', () => onSelect(id));
    return row;
  });
  const table = dips.length ? h('table', { class: 'compliance' }, [
    h('thead', {}, [h('tr', {}, ['#', 'Darkest point', 'Below surroundings', 'Value there', 'Surroundings', 'Area', 'Extent'].map(text => h('th', { text, scope: 'col' })))]),
    h('tbody', {}, rows),
  ]) : h('div', { class: 'empty-state' }, [h('strong', { text: 'The beam is even at this scale' }), 'Lower the depth or change the feature size to look for smaller variations.']);
  if (dips.length) table.addEventListener('pointerleave', () => onSelect(null));
  return h('div', { class: 'dock-inner' }, [title, h('div', { class: 'study-layout' }, [tiles, h('div', { class: 'table-wrap' }, [table])])]);
}

/** @param {number} x */
function label(x) {
  if (!Number.isFinite(x)) return '–';
  return x >= 100 ? fmt(x, 0) : x >= 1 ? fmt(x, 1) : String(+x.toPrecision(2));
}

/**
 * The road: how far and how wide the lamps light it.
 * @param {{ study: Study, analysis: StudyAnalysis | null, running: boolean }} props
 */
export function roadView({ study, analysis, running }) {
  const road = analysis?.road;
  const title = h('div', { class: 'dock-title' }, [
    h('h3', { text: 'Road' }),
    h('p', { text: `${study.road.lamps === 'pair' ? 'Both lamps' : `The ${study.road.lamps} lamp`}, ${fmt(study.road.height, 2)} m high, aimed ${fmt(study.road.aimPercent, 1)}% down; light on ${study.road.surface === 'road' ? 'the road surface' : 'a target facing the car'}` }),
  ]);
  if (!road) return h('div', { class: 'dock-inner' }, [title, h('div', { class: 'empty-state' }, [h('strong', { text: running ? 'Lighting the road…' : isHeadlampRole(study.lamp.role) ? 'No light distribution yet' : 'The road is for headlamps' }), isHeadlampRole(study.lamp.role) ? 'Open a light distribution to see it on the road.' : 'Signal lamps are judged by their light distribution alone.'])]);
  // Reach along the centre line and width at 20 m, for every contour level.
  const centre = Math.round((0 - road.grid.xMin) / road.grid.step);
  const levels = study.display.road.contours.length ? study.display.road.contours : [1, 3, 10];
  const rows = levels.map(level => {
    let far = 0;
    for (let iz = 0; iz < road.nz; iz++) if (road.lux[iz * road.nx + centre] >= level) far = road.grid.zMin + iz * road.grid.step;
    const widthAt = /** @param {number} z */ z => {
      const row = Math.round((z - road.grid.zMin) / road.grid.step);
      if (row < 0 || row >= road.nz) return NaN;
      let lo = Infinity, hi = -Infinity;
      for (let ix = 0; ix < road.nx; ix++) if (road.lux[row * road.nx + ix] >= level) { const x = road.grid.xMin + ix * road.grid.step; lo = Math.min(lo, x); hi = Math.max(hi, x); }
      return hi >= lo ? hi - lo : 0;
    };
    return h('tr', {}, [h('td', { text: `${label(level)} lx` }), h('td', { text: `${fmt(far, 0)} m` }), h('td', { text: `${fmt(widthAt(20), 1)} m` }), h('td', { text: `${fmt(widthAt(50), 1)} m` })]);
  });
  const peak = road.lux.reduce((m, x) => Math.max(m, x), 0);
  const tiles = h('div', { class: 'tiles stacked' }, [
    h('div', { class: 'tile hero' }, [h('div', { class: 'tile-label', text: `Reach to ${study.road.surface === 'road' ? '1' : '3'} lx` }), h('div', { class: 'tile-value' }, [fmt(road.reach[study.road.surface === 'road' ? 1 : 3] ?? 0, 0), h('small', { text: 'm' })]), h('div', { class: 'tile-note', text: 'Along the centre line' })]),
    h('div', { class: 'tile' }, [h('div', { class: 'tile-label', text: 'Brightest' }), h('div', { class: 'tile-value' }, [label(peak), h('small', { text: 'lx' })])]),
    analysis.reference.lift ? h('div', { class: 'tile' }, [h('div', { class: 'tile-label', text: 'Cut-off on the road' }), h('div', { class: 'tile-note', text: `The laboratory aim put the cut-off ${fmt(analysis.reference.lift, 2)}° down; it is raised to the horizon, then tilted ${fmt(study.road.aimPercent, 1)}% down as on the vehicle.` })]) : null,
  ]);
  const table = h('table', { class: 'data-table' }, [h('thead', {}, [h('tr', {}, ['Level', 'Reach', 'Width at 20 m', 'Width at 50 m'].map(text => h('th', { text })))]), h('tbody', {}, rows)]);
  return h('div', { class: 'dock-inner' }, [title, h('div', { class: 'study-layout' }, [tiles, h('div', { class: 'table-wrap' }, [table])])]);
}

/**
 * The file: what it is and what it holds.
 * @param {{ study: Study, analysis: StudyAnalysis | null, error: string | null }} props
 */
export function fileView({ study, analysis, error }) {
  const title = h('div', { class: 'dock-title' }, [h('h3', { text: 'File' }), h('p', { text: study.source.name || 'No file open' })]);
  if (error) return h('div', { class: 'dock-inner' }, [title, h('div', { class: 'error-note', text: error })]);
  if (!analysis) return h('div', { class: 'dock-inner' }, [title, h('div', { class: 'empty-state' }, [h('strong', { text: 'No light distribution yet' }), 'Open an IES (LM-63) or EULUMDAT (.ldt) file.'])]);
  const f = analysis.file;
  const cov = f.coverage;
  /** @type {[string, string][]} */
  const facts = [
    ['Format', `${f.format}, photometry Type ${f.type}`],
    ['Read as', study.mapping.system === 'file' ? `Type ${f.type}, as the file says` : `Type ${study.mapping.system}, chosen in the design panel`],
    ['Values', `${fmt(f.values, 0)} (${f.type === 'C' ? 'C' : 'H'} ${fmt(f.horizontal[0], 1)}° to ${fmt(f.horizontal[1], 1)}°, ${f.type === 'C' ? 'γ' : 'V'} ${fmt(f.vertical[0], 1)}° to ${fmt(f.vertical[1], 1)}°)`],
    ['Finest step', `${fmt(f.resolution[0], 2)}° across, ${fmt(f.resolution[1], 2)}° up`],
    ['Covers', cov ? `${fmt(Math.abs(cov.hMin), 1)}°L to ${fmt(cov.hMax, 1)}°R, ${fmt(Math.abs(cov.vMin), 1)}°D to ${fmt(cov.vMax, 1)}°U` : 'Nothing ahead of the lamp'],
    ['Peak in the file', `${fmt(f.peak, 0)} cd`],
    ['Flux ahead of the lamp', `${fmt(f.lumensForward, 0)} lm`],
    ['Lamp flux in the file', f.lampLumens ? `${fmt(f.lampLumens, 0)} lm` : 'Not given (absolute photometry)'],
    ...Object.entries(f.keywords).filter(([, v]) => v).slice(0, 12).map(([k, v]) => /** @type {[string, string]} */ ([k[0] + k.slice(1).toLowerCase(), v])),
  ];
  const table = h('table', { class: 'data-table facts' }, [h('tbody', {}, facts.map(([k, v]) => h('tr', {}, [h('th', { text: k, scope: 'row' }), h('td', { text: v })])))]);
  const coarse = f.resolution[0] > 1 || f.resolution[1] > 1;
  return h('div', { class: 'dock-inner' }, [title, coarse ? h('p', { class: 'aim-note' }, [h('span', { 'data-icon': 'alert' }), `This file's angles are ${fmt(Math.max(...f.resolution), 1)}° apart at their closest. Test points between them are interpolated, and a cut-off or a hot spot narrower than that cannot be judged reliably.`]) : null, h('div', { class: 'table-wrap' }, [table])]);
}
