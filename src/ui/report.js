/** The photometry study's report: one self-contained HTML document with the market summary, the pictures, every
 * requirement of every market with its source, the user's targets and the dark patches. It opens in any browser and
 * prints to PDF on A4. The CSV holds the same requirements as a table. Built as text, so it needs no DOM. */

import { ROLES, isHeadlampRole } from '../core/regulation/catalog.js';
import { APP_VERSION } from '../core/model.js';

/** @import { Study } from '../core/study.js' */
/** @import { StudyAnalysis, MarketResult } from '../core/study-analysis.js' */
/** @import { Item } from '../core/regulation/engine.js' */
/** @import { Dip } from '../core/uniformity.js' */
/** @import { NotChecked } from '../core/regulation/catalog.js' */

/** @param {unknown} value */
const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);

/** @param {number} x @param {number} [digits] */
const num = (x, digits = 0) => (Number.isFinite(x) ? x.toLocaleString('en-GB', { minimumFractionDigits: digits, maximumFractionDigits: digits }) : '–');

/** @param {Item} i */
function value(i) {
  if (!Number.isFinite(i.value)) return '–';
  if (i.unit === 'G') return num(i.value, 2);
  if (i.unit === '°') return `${num(i.value, 2)}°`;
  if (i.unit === 'lm') return `${num(i.value)} lm`;
  return `${num(i.value, i.value < 10 ? 2 : i.value < 100 ? 1 : 0)} cd`;
}

/** @param {number} m */
const margin = m => (Number.isFinite(m) ? `${m >= 0 ? '+' : '−'}${Math.abs(Math.round(m * 100))}%` : '–');

const WORDS = { pass: 'Pass', near: 'Near', fail: 'Fail', blocked: 'Waits', nodata: 'No data', info: 'Listed' };

/** @param {MarketResult} r */
function counts(r) {
  const c = { pass: 0, near: 0, fail: 0, blocked: 0, nodata: 0, info: 0 };
  for (const i of r.items) c[i.status]++;
  return c;
}

/** @param {Item[]} items */
function itemRows(items) {
  return items.map(i => `<tr class="${i.status}"><td class="status">${WORDS[i.status]}</td><td>${esc(i.label)}<small>${esc(i.cite)}</small></td><td class="num">${value(i)}</td><td>${esc(i.requirement)}</td><td class="num">${margin(i.margin)}</td></tr>`).join('');
}

/**
 * @param {Study} study @param {StudyAnalysis} a
 * @param {{ images: { beam: string, road: string | null }, dips: Dip[], notChecked: NotChecked[], generated: Date }} extra
 */
export function studyReport(study, a, { images, dips, notChecked, generated }) {
  const headlamp = isHeadlampRole(study.lamp.role);
  const scope = headlamp ? 'headlamp' : 'signal';
  const passing = a.markets.filter(m => m.pass).length;
  const f = a.file;
  const marketName = (/** @type {MarketResult} */ r) => `${r.pack.short}${headlamp ? `, ${r.market.traffic}-hand traffic` : ''}`;
  const summary = a.markets.map(r => {
    const c = counts(r);
    return `<tr class="${r.pass ? 'pass' : 'fail'}"><td class="status">${r.pass ? 'Meets' : 'Fails'}</td><td>${esc(marketName(r))}<small>${esc(r.pack.region)}</small></td><td>${esc(r.fn.name)}</td><td class="num">${c.pass + c.near} of ${r.items.length - c.info}</td><td>${r.worst ? `${esc(r.worst.label)} (${margin(r.worst.margin)})` : '–'}</td><td>${esc(r.pack.provenance === 'official' ? 'Official text' : r.pack.provenance === 'adopted' ? 'Adopted' : 'Incomplete')}</td></tr>`;
  }).join('');
  const markets = a.markets.map(r => `
    <section class="market">
      <h3>${esc(marketName(r))}: ${esc(r.fn.name)} <span class="verdict ${r.pass ? 'pass' : 'fail'}">${r.pass ? 'Meets' : 'Does not meet'}</span></h3>
      <p class="meta">${esc(r.pack.title)}. ${esc(r.pack.statement)}<br>Source: ${esc(r.pack.source.document)}<br>Aim: ${esc(r.aim.method)}${r.aim.method !== 'as measured' ? ` (moved ${num(r.aim.dh, 2)}° across, ${num(r.aim.dv, 2)}° up)` : ''}${r.beam === 'mirror' ? '. Checked on the mirror image of the file: the lamp for this traffic side.' : ''}</p>
      ${r.aim.notes.map(n => `<p class="note">${esc(n)}</p>`).join('')}
      <table><thead><tr><th>Result</th><th>Requirement</th><th class="num">Measured</th><th>Limit</th><th class="num">Margin</th></tr></thead><tbody>${itemRows(r.items)}</tbody></table>
      ${r.pack.notes.length ? `<details><summary>Notes on this regulation</summary><ul>${r.pack.notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul></details>` : ''}
    </section>`).join('');
  const targets = study.targets.length ? `
    <section><h2>Your targets</h2><p class="meta">Measured in the beam ${a.reference.aim.method === 'as measured' ? 'as measured' : `aimed as ${esc(a.reference.label)}`}.</p>
    <table><thead><tr><th>Result</th><th>Target</th><th class="num">Measured</th><th>Limit</th><th class="num">Margin</th></tr></thead><tbody>${itemRows(a.targets)}</tbody></table></section>` : '';
  const uniformity = `
    <section><h2>Uniformity</h2><p class="meta">Directions at least ${Math.round(study.display.beam.depth * 100)}% darker than the average within ${num(study.display.beam.featureDeg, 1)}° around them, in the beam as pictured.</p>
    ${dips.length ? `<table><thead><tr><th class="num">#</th><th>Darkest point</th><th class="num">Below surroundings</th><th class="num">Area</th></tr></thead><tbody>${dips.map((d, n) => `<tr><td class="num">${n + 1}</td><td>${num(Math.abs(d.h), 1)}°${d.h >= 0 ? 'R' : 'L'}, ${num(Math.abs(d.v), 1)}°${d.v >= 0 ? 'U' : 'D'}</td><td class="num">−${Math.round((1 - d.ratio) * 100)}%</td><td class="num">${num(d.area, 2)} deg²</td></tr>`).join('')}</tbody></table>` : '<p>No dark patches at this setting.</p>'}</section>`;
  const missing = notChecked.filter(n => n.scope === scope);
  const notCheckedHtml = missing.length ? `
    <section><h2>Markets not checked</h2><p class="meta">Cutline checks only regulations it holds in full from an official source.</p>
    <table><thead><tr><th>Market</th><th>Document</th><th>Why not</th></tr></thead><tbody>${missing.map(n => `<tr><td>${esc(n.jurisdiction)}</td><td>${esc(n.document)}<small>${esc(n.status)}</small></td><td>${esc(n.reason)}</td></tr>`).join('')}</tbody></table></section>` : '';
  return `<!doctype html>
<html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(study.title)}: market report</title>
<style>
  :root { --ink: #15181e; --muted: #5d6775; --line: #dcdfe5; --ok: #2b8a3e; --warn: #a8690f; --bad: #c92a2a; }
  * { box-sizing: border-box; }
  body { margin: 0 auto; max-width: 1040px; padding: 32px 28px 48px; font: 13px/1.45 "Helvetica Neue", Arial, sans-serif; color: var(--ink); background: #fff; }
  h1 { font-size: 24px; margin: 0 0 4px; } h2 { font-size: 17px; margin: 28px 0 8px; } h3 { font-size: 14px; margin: 22px 0 6px; }
  .meta { color: var(--muted); margin: 0 0 10px; } .note { margin: 4px 0; padding: 6px 10px; background: #fdf5d8; color: #7a5a00; border-radius: 6px; }
  table { width: 100%; border-collapse: collapse; margin: 6px 0 4px; font-variant-numeric: tabular-nums; }
  th, td { padding: 5px 8px; border-bottom: 1px solid var(--line); text-align: left; vertical-align: top; }
  th { color: var(--muted); font-weight: 500; font-size: 11.5px; } td small { display: block; color: #939ba7; font-size: 10.5px; }
  .num { text-align: right; } .status { font-weight: 600; white-space: nowrap; }
  tr.pass .status { color: var(--ok); } tr.near .status { color: var(--warn); } tr.fail .status { color: var(--bad); }
  .verdict { font-size: 12px; padding: 2px 8px; border-radius: 10px; margin-left: 6px; vertical-align: 2px; }
  .verdict.pass { background: #e8f5ec; color: var(--ok); } .verdict.fail { background: #fbeaea; color: var(--bad); }
  .facts { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 6px 18px; margin: 12px 0; }
  .facts div { border-bottom: 1px solid var(--line); padding: 4px 0; } .facts span { color: var(--muted); display: block; font-size: 11.5px; }
  .banner { padding: 12px 14px; border-radius: 8px; font-size: 15px; font-weight: 600; margin: 14px 0; }
  .banner.pass { background: #e8f5ec; color: var(--ok); } .banner.fail { background: #fbeaea; color: var(--bad); }
  figure { margin: 10px 0; } figure img { width: 100%; border-radius: 6px; display: block; } figcaption { color: var(--muted); font-size: 11.5px; margin-top: 4px; }
  .pictures { display: grid; gap: 14px; }
  details { margin: 6px 0; color: var(--muted); } summary { cursor: pointer; }
  footer { margin-top: 32px; color: var(--muted); font-size: 11.5px; border-top: 1px solid var(--line); padding-top: 10px; }
  @media print { body { padding: 0; max-width: none; } section.market { break-inside: auto; } h2, h3 { break-after: avoid; } tr { break-inside: avoid; } details { display: block; } details > * { display: block; } }
  @page { size: A4; margin: 14mm; }
</style></head><body>
<h1>${esc(study.title)}</h1>
<p class="meta">${esc(ROLES[study.lamp.role])}${headlamp ? `, made for ${study.lamp.traffic}-hand traffic` : `, outward to ${study.lamp.outward === 'right' ? '+H' : '−H'}`}. ${study.lamp.aim === 'laboratory' ? 'Each market aims the beam by its own laboratory method.' : `Checked as measured${study.lamp.shiftH || study.lamp.shiftV ? `, moved ${num(study.lamp.shiftH, 2)}° across and ${num(study.lamp.shiftV, 2)}° up` : ''}.`}</p>
<div class="banner ${passing === a.markets.length ? 'pass' : 'fail'}">${passing === a.markets.length ? (passing === 1 ? 'Meets the market checked' : `Meets all ${passing} markets checked`) : `Meets ${passing} of ${a.markets.length} markets checked`}</div>
<div class="facts">
  <div><span>File</span>${esc(study.source.name)}</div>
  <div><span>Format</span>${esc(f.format)}, Type ${esc(f.type)}${study.mapping.system !== 'file' ? `, read as Type ${esc(study.mapping.system)}` : ''}${study.mapping.mirror === 'yes' ? ', mirrored' : ''}</div>
  <div><span>Peak intensity in the file</span>${num(f.peak)} cd</div>
  <div><span>Flux ahead of the lamp</span>${num(f.lumensForward)} lm</div>
  <div><span>Angles covered</span>${f.coverage ? `${num(Math.abs(f.coverage.hMin), 0)}°L to ${num(f.coverage.hMax, 0)}°R, ${num(Math.abs(f.coverage.vMin), 0)}°D to ${num(f.coverage.vMax, 0)}°U` : '–'}</div>
  <div><span>Finest step</span>${num(f.resolution[0], 2)}° × ${num(f.resolution[1], 2)}°</div>
</div>
<h2>Summary</h2>
<table><thead><tr><th>Result</th><th>Market</th><th>Function</th><th class="num">Met</th><th>Least headroom</th><th>Source</th></tr></thead><tbody>${summary}</tbody></table>
<h2>Pictures</h2>
<div class="pictures">
  <figure><img src="${images.beam}" alt="The light distribution"><figcaption>${study.display.beam.mode === 'uniformity' ? 'Uniformity: each direction against the average around it' : study.display.beam.quantity === 'intensity' ? 'Intensity in candela' : 'Illuminance on a screen 25 m ahead'}, ${study.display.beam.scale} scale, as aimed for ${a.markets[0] ? esc(marketName(a.markets[0])) : 'the file as measured'}.</figcaption></figure>
  ${images.road ? `<figure><img src="${images.road}" alt="Isolux on the road"><figcaption>${study.road.surface === 'road' ? 'Illuminance on the road surface' : 'Illuminance on a target facing the car'}, ${study.road.lamps === 'pair' ? 'both lamps' : `${study.road.lamps} lamp only`}, ${num(study.road.height, 2)} m high, aimed ${num(study.road.aimPercent, 1)}% down.</figcaption></figure>` : ''}
</div>
<h2>Markets</h2>
${markets}
${targets}
${uniformity}
${notCheckedHtml}
<footer>Made with Cutline ${esc(APP_VERSION)} on ${esc(generated.toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' }))}. Cutline is a design tool: a passing result means the light distribution in the file meets the transcribed values. It does not replace testing by a technical service or a laboratory.</footer>
</body></html>
`;
}

/** Every requirement of every market, and the targets, as CSV. @param {Study} study @param {StudyAnalysis} a */
export function studyCsv(study, a) {
  /** @param {unknown} v */
  const q = v => `"${String(v).replace(/"/g, '""')}"`;
  const lines = [
    `${q('Study')},${q(study.title)}`, `${q('File')},${q(study.source.name)}`, `${q('Function')},${q(ROLES[study.lamp.role])}`, '',
    ['Market', 'Traffic', 'Function', 'Source', 'Requirement', 'Group', 'Status', 'Measured', 'Unit', 'Limit', 'Margin', 'Citation'].map(q).join(','),
  ];
  for (const r of a.markets) for (const i of r.items) lines.push([r.pack.short, r.market.traffic, r.fn.name, r.pack.provenance, i.label, i.group, i.status, Number.isFinite(i.value) ? i.value.toPrecision(5) : '', i.unit, i.requirement, Number.isFinite(i.margin) ? i.margin.toFixed(4) : '', i.cite].map(q).join(','));
  for (const i of a.targets) lines.push(['Your targets', '', '', '', i.label, i.group, i.status, Number.isFinite(i.value) ? i.value.toPrecision(5) : '', i.unit, i.requirement, Number.isFinite(i.margin) ? i.margin.toFixed(4) : '', ''].map(q).join(','));
  return lines.join('\n') + '\n';
}
