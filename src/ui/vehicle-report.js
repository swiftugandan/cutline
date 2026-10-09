/** The vehicle's installation report: one self-contained HTML document with pictures of the vehicle, the lamps
 * placed, and every check of every regulation with its source. It opens in any browser and prints to PDF on A4.
 * Built as text, so it needs no DOM. */

import { INSTALL_ROLES } from '../core/installation.js';
import { APP_VERSION } from '../core/model.js';

/** @import { Vehicle } from '../core/vehicle.js' */
/** @import { InstallResult, InstallItem } from '../core/installation.js' */

/** @param {unknown} value */
const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);
/** @param {number} x @param {number} [d] */
const num = (x, d = 0) => (Number.isFinite(x) ? x.toLocaleString('en-GB', { minimumFractionDigits: d, maximumFractionDigits: d }) : '–');
const WORDS = { pass: 'Pass', near: 'Near', fail: 'Fail', info: 'By hand' };

/** @param {InstallItem} i */
function measured(i) {
  if (!Number.isFinite(i.value)) return '–';
  return i.unit === '% hidden' ? `${num(i.value)}% hidden` : `${num(i.value)}${i.unit ? ` ${i.unit}` : ''}`;
}

/**
 * @param {Vehicle} v @param {InstallResult[]} results
 * @param {{ width: number, images: Record<string, string>, generated: Date }} extra
 */
export function vehicleReport(v, results, { width, images, generated }) {
  const faces = { front: 'Forwards', rear: 'Rearwards', left: 'Left', right: 'Right' };
  const lamps = v.lamps.map(l => `<tr><td>${esc(l.name)}<small>${esc(INSTALL_ROLES[l.role]?.name ?? l.role)}</small></td><td>${faces[l.facing]}</td><td class="num">${num(l.x)}, ${num(l.y)}, ${num(l.z)}</td><td class="num">${num(l.width)} × ${num(l.height)}</td></tr>`).join('');
  const sections = results.map(r => {
    const fails = r.items.filter(i => i.status === 'fail').length, judged = r.items.filter(i => i.status !== 'info').length;
    const rows = r.items.map(i => `<tr class="${i.status}"><td class="status">${WORDS[i.status]}</td><td>${esc(i.label)}<small>${esc(i.cite)}</small></td><td class="num">${measured(i)}</td><td>${esc(i.requirement)}${i.note ? `<small>${esc(i.note)}</small>` : ''}</td></tr>`).join('');
    return `<section><h2>${esc(r.title)} <span class="verdict ${fails ? 'fail' : 'pass'}">${fails ? `${fails} of ${judged} fail` : `All ${judged} pass`}</span></h2>
      <p class="meta">${esc(r.source.title)}. ${esc(r.source.document)}</p>
      <table><thead><tr><th>Result</th><th>Check</th><th class="num">Measured</th><th>Requirement</th></tr></thead><tbody>${rows}</tbody></table></section>`;
  }).join('');
  const pics = Object.entries(images).map(([k, src]) => `<figure><img src="${src}" alt="The vehicle from the ${k === 'iso' ? 'front left, above' : k}"><figcaption>${k === 'iso' ? 'From the front left, above' : `From the ${k}`}</figcaption></figure>`).join('');
  return `<!doctype html>
<html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(v.title)}: installation report</title>
<style>
  :root { --ink: #15181e; --muted: #5d6775; --line: #dcdfe5; --ok: #2b8a3e; --warn: #a8690f; --bad: #c92a2a; }
  * { box-sizing: border-box; }
  body { margin: 0 auto; max-width: 1040px; padding: 32px 28px 48px; font: 13px/1.45 "Helvetica Neue", Arial, sans-serif; color: var(--ink); background: #fff; }
  h1 { font-size: 24px; margin: 0 0 4px; } h2 { font-size: 17px; margin: 28px 0 8px; }
  .meta { color: var(--muted); margin: 0 0 10px; }
  table { width: 100%; border-collapse: collapse; margin: 6px 0 4px; font-variant-numeric: tabular-nums; }
  th, td { padding: 5px 8px; border-bottom: 1px solid var(--line); text-align: left; vertical-align: top; }
  th { color: var(--muted); font-weight: 500; font-size: 11.5px; } td small { display: block; color: #939ba7; font-size: 10.5px; }
  .num { text-align: right; } .status { font-weight: 600; white-space: nowrap; }
  tr.pass .status { color: var(--ok); } tr.near .status { color: var(--warn); } tr.fail .status { color: var(--bad); } tr.info .status { color: var(--muted); }
  .verdict { font-size: 12px; padding: 2px 8px; border-radius: 10px; margin-left: 6px; vertical-align: 2px; }
  .verdict.pass { background: #e8f5ec; color: var(--ok); } .verdict.fail { background: #fbeaea; color: var(--bad); }
  .pictures { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; } figure { margin: 0; } figure img { width: 100%; border-radius: 6px; display: block; background: #0f1217; }
  figcaption { color: var(--muted); font-size: 11.5px; margin-top: 4px; }
  footer { margin-top: 32px; color: var(--muted); font-size: 11.5px; border-top: 1px solid var(--line); padding-top: 10px; }
  @media print { body { padding: 0; max-width: none; } tr { break-inside: avoid; } h2 { break-after: avoid; } }
  @page { size: A4; margin: 14mm; }
</style></head><body>
<h1>${esc(v.title)}</h1>
<p class="meta">Category ${esc(v.vehicle.category)}; overall width ${num(width)} mm${v.vehicle.overallWidth > 0 ? '' : ' (from the model, mirrors included)'}. Model: ${esc(v.model.name)}. Positions in the vehicle frame: x forwards from the front-most point, y to the left of the median plane, z up from the ground, in millimetres.</p>
<div class="pictures">${pics}</div>
<h2>Lamps</h2>
<p class="meta">Each lamp's apparent surface is taken as a rectangle of the size given, centred on its centre of reference and square to its reference axis.</p>
<table><thead><tr><th>Lamp</th><th>Faces</th><th class="num">x, y, z (mm)</th><th class="num">Apparent surface (mm)</th></tr></thead><tbody>${lamps}</tbody></table>
${sections}
<footer>Made with Cutline ${esc(APP_VERSION)} on ${esc(generated.toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' }))}. Visibility is found by casting rays from the apparent surface against the model, every 5° across each field. Cutline is a design tool: confirm the installation on the vehicle with the technical service.</footer>
</body></html>
`;
}
