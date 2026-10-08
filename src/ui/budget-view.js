/** The light budget: where the LED's lumens go, and how much of them reaches the beam. */

import { h, fmt, pct } from './dom.js';
import { barList, chartFrame, dataTable } from './charts.js';
import { RAY_STYLES } from '../render/lamp-view.js';

/** @import { Design } from '../core/model.js' */
/** @import { Analysis } from '../core/analysis.js' */
/** @import { Bucket } from '../core/types.js' */

/** Ledger buckets in reading order, with what each means. @type {[Bucket, string][]} */
const ROWS = [
  ['beam', 'Leaves the lamp forwards, after the outer lens'],
  ['shield', 'Stopped by the projector\'s cut-off shield'],
  ['reflectorAbsorption', 'Absorbed at each reflection'],
  ['lensLoss', 'Absorbed in the lens, stopped by its rim, or reflected by it and lost'],
  ['housing', 'Stopped by the bezel, the shade, the roof or a mirror\'s back'],
  ['coverLoss', 'Absorbed or reflected by the outer lens'],
  ['backward', 'Left the lamp backwards'],
  ['trapped', 'Bounced more than 64 times; should stay near zero'],
];

/** @param {{ design: Design, analysis: Analysis | null, running: boolean, width: number }} props */
export function budgetView({ design, analysis, running, width }) {
  const title = h('div', { class: 'dock-title' }, [h('h3', { text: 'Light budget' }), h('p', { text: `Where the LED's ${fmt(design.led.flux, 0)} lm go` })]);
  if (!analysis) return h('div', { class: 'dock-inner' }, [title, h('div', { class: 'empty-state' }, [h('strong', { text: running ? 'Tracing the beam…' : 'No beam yet' }), 'The budget appears with the first trace.'])]);
  const { ledger, emitted } = analysis;
  const rows = ROWS.map(([key, note]) => ({ key, label: RAY_STYLES[key].label, note, value: ledger[key] / emitted }))
    .filter(r => r.key === 'beam' || r.value >= 0.0005);
  const tiles = h('div', { class: 'tiles stacked' }, [
    h('div', { class: 'tile hero' }, [h('div', { class: 'tile-label', text: 'Optical efficiency' }), h('div', { class: 'tile-value', text: pct(ledger.beam / emitted, 1) }), h('div', { class: 'tile-note', text: 'Beam lumens over LED lumens' })]),
    h('div', { class: 'tile' }, [h('div', { class: 'tile-label', text: 'Beam' }), h('div', { class: 'tile-value' }, [fmt(ledger.beam, 0), h('small', { text: 'lm' })])]),
    h('div', { class: 'tile' }, [h('div', { class: 'tile-label', text: 'Rays traced' }), h('div', { class: 'tile-value' }, [fmt(analysis.rays / 1e6, 1), h('small', { text: 'million' })])]),
  ]);
  const chart = chartFrame({
    title: 'Where the light goes',
    subtitle: 'Share of the LED\'s flux',
    chart: barList({ rows: rows.map(r => ({ label: r.label, value: r.value, emphasis: r.key === 'beam', note: r.note })), max: 1, width: Math.max(260, width - 238), format: v => pct(v, v < 0.01 ? 2 : 1) }),
    table: dataTable(['Destination', 'Share', 'Lumens'], rows.map(r => [r.label, pct(r.value, 2), fmt(r.value * emitted, 1)])),
  });
  return h('div', { class: 'dock-inner' }, [title, h('div', { class: 'study-layout' }, [tiles, chart])]);
}
