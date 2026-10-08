#!/usr/bin/env node
/** Builds the GitHub Pages site into _site/: the marketing page at /, the app at /app/, the single-file download, the
 * published schema and build-info.json. The page's figures and pictures are computed by the engine here. */

import { readFile, writeFile, mkdir, rm, cp } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildApp } from './build.mjs';
import { study, beamPng, beamOverlay, shareBelowLineB, scanChart, sectionSvg, FRAME } from './scripts/site-data.mjs';
import { APP_VERSION, defaultDesign } from './src/core/model.js';

const root = dirname(fileURLToPath(import.meta.url));
const out = join(root, '_site');
export const REPO_URL = 'https://github.com/swiftugandan/cutline';
/** Rays for the page's traces: the app's own full trace, so the page reports what the app shows. */
const RAYS = defaultDesign().simulation.rays;
const BEAM_W = 1600, BEAM_H = Math.round((BEAM_W * (FRAME.vMax - FRAME.vMin)) / (FRAME.hMax - FRAME.hMin));

/** @param {number} v @param {number} d */
const num = (v, d = 0) => v.toLocaleString('en-GB', { minimumFractionDigits: d, maximumFractionDigits: d });
/** @param {string} s */
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const GROUPS = { cutoff: 'Cut-off', glare: 'Glare', signs: 'Overhead signs', beam: 'Road ahead', foreground: 'Foreground', flux: 'Flux' };
const WORDS = { pass: 'Pass', near: 'Near', fail: 'Fail', blocked: 'Waits' };

/** @param {import('./src/core/regulation/evaluate.js').Item} i */
function measured(i) {
  if (!Number.isFinite(i.value)) return '–';
  if (i.unit === 'G') return num(i.value, 2);
  if (i.unit === '°') return `${num(i.value, 2)}°`;
  if (i.unit === 'lm') return `${num(i.value)} lm`;
  return `${num(i.value, i.value < 100 ? 1 : 0)} cd`;
}

/** @param {import('./src/core/regulation/evaluate.js').Evaluation} e */
function reportRows(e) {
  const rows = [];
  for (const [group, name] of Object.entries(GROUPS)) {
    const items = e.items.filter(i => i.group === group);
    if (!items.length) continue;
    rows.push(`<tr class="group"><td colspan="5">${name}</td></tr>`);
    for (const i of items) {
      const m = Number.isFinite(i.margin) ? Math.max(-1, Math.min(1, i.margin)) : 0;
      const fill = m >= 0 ? `left:50%;width:${(m * 50).toFixed(1)}%` : `right:50%;width:${(-m * 50).toFixed(1)}%`;
      const pctText = Number.isFinite(i.margin) ? `${i.margin >= 0 ? '+' : '−'}${Math.abs(Math.round(i.margin * 100))}%` : '–';
      const error = i.error >= 0.03 && Number.isFinite(i.value) ? ` <small>±${Math.round(i.error * 100)}%</small>` : '';
      rows.push(`<tr><td>${esc(i.label)}<span class="cite">${esc(i.cite.replace('R149 01 series, ', ''))}</span></td><td class="num">${measured(i)}${error}</td><td>${esc(i.requirement)}</td><td><span class="bar ${i.status}"><i style="${fill}"></i></span><span class="margin-text">${pctText}</span></td><td><span class="status ${i.status}">${WORDS[i.status]}</span></td></tr>`);
    }
  }
  return rows.join('\n            ');
}

/** @param {ReturnType<typeof study>} s */
function facts(s) {
  const met = s.analysis.evaluation.items.filter(i => i.status === 'pass' || i.status === 'near').length;
  return [
    ['Requirements met', `${met}<small>of ${s.analysis.evaluation.items.length}</small>`],
    ['Optical efficiency', `${num((100 * s.analysis.ledger.beam) / s.analysis.emitted, 0)}<small>%</small>`],
    ['Peak intensity', `${num(s.analysis.peak.value / 1000, 1)}<small>kcd</small>`],
  ].map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
}

/** @param {number} v @param {string} plus @param {string} minus */
const turn = (v, plus, minus) => `${num(Math.abs(v), 2)}° ${v >= 0 ? plus : minus}`;

export async function buildSite() {
  const app = await buildApp();
  const projector = study('projector', RAYS);
  const reflector = study('reflector', RAYS);
  const e = projector.analysis.evaluation;
  const met = e.items.filter(i => i.status === 'pass' || i.status === 'near').length;
  const g = e.items.find(i => i.id === 'Sharpness');
  const favicon = `data:image/svg+xml,${encodeURIComponent(await readFile(join(root, 'favicon.svg'), 'utf8'))}`;
  const values = {
    version: APP_VERSION, repo: REPO_URL, favicon,
    beamWidth: String(BEAM_W), beamHeight: String(BEAM_H), beamTall: (BEAM_H / BEAM_W).toFixed(5), beamBelow: String(shareBelowLineB()),
    beamOverlay: beamOverlay(projector.design, projector.analysis),
    heroCaption: `The default projector's beam, traced with ${num(RAYS / 1e6)} million rays and aimed by its cut-off: ${met} of ${e.items.length} requirements met.`,
    reportSubtitle: `Default LED projector, right-hand traffic, aimed by ${e.aim.method.replace(/ \(.*\)$/, '')}`,
    reportResult: e.pass ? `Meets the regulation: ${met} of ${e.items.length}` : `${met} of ${e.items.length} met`,
    reportClass: e.pass ? 'status pass' : 'status fail',
    reportRows: reportRows(e),
    reportFoot: `Aimed ${turn(e.aim.dv, 'up', 'down')} and ${turn(e.aim.dh, 'right', 'left')}. Traced with ${num(RAYS / 1e6)} million rays; a passing value within 10% of its limit, or within twice its statistical error, is marked near.`,
    scanChart: scanChart(projector.result, projector.analysis),
    scanText: g ? `The scan at 2.5°L through the default projector's beam. Its steepest fall is <strong>G = ${num(g.value, 2)}</strong> over 0.1°, inside the 0.13 to 0.40 that R149 allows, and after aiming it sits on line B.` : '',
    projectorSvg: sectionSvg(projector.design, projector.result.paths, 'Side section of the LED projector with traced rays'),
    reflectorSvg: sectionSvg(reflector.design, reflector.result.paths, 'Side section of the multi-facet reflector with traced rays'),
    projectorFacts: facts(projector), reflectorFacts: facts(reflector),
  };
  let page = await readFile(join(root, 'site', 'index.html'), 'utf8');
  page = page.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    if (!(key in values)) throw new Error(`site/index.html uses unknown placeholder ${match}`);
    return values[/** @type {keyof typeof values} */ (key)];
  });
  await rm(out, { recursive: true, force: true });
  await mkdir(join(out, 'app'), { recursive: true });
  await mkdir(join(out, 'fonts'), { recursive: true });
  await writeFile(join(out, 'index.html'), page);
  await writeFile(join(out, 'beam.png'), beamPng(projector.analysis, BEAM_W, BEAM_H));
  await writeFile(join(out, 'app', 'index.html'), app);
  await writeFile(join(out, 'Cutline.html'), app);
  for (const w of [400, 500, 600]) await cp(join(root, 'brand', 'fonts', `barlow-latin-${w}-normal.woff2`), join(out, 'fonts', `barlow-${w}.woff2`));
  if (existsSync(join(root, 'site', 'editor.png'))) await cp(join(root, 'site', 'editor.png'), join(out, 'editor.png'));
  await cp(join(root, 'favicon.svg'), join(out, 'favicon.svg'));
  await cp(join(root, 'schema'), join(out, 'schema'), { recursive: true });
  await writeFile(join(out, 'build-info.json'), JSON.stringify({ name: 'cutline', version: APP_VERSION, sourceRevision: process.env.GITHUB_SHA ?? null }, null, 2) + '\n');
  await writeFile(join(out, '.nojekyll'), '');
  return { pass: e.pass, met, total: e.items.length };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const info = await buildSite();
  console.log(`Built _site/ (default projector: ${info.met} of ${info.total} requirements met)`);
}
