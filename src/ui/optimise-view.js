/** The optimiser's dock view: choose the values to vary, run, watch the shortfall fall, and apply. */

import { h, fmt } from './dom.js';
import { lineChart, chartFrame, dataTable } from './charts.js';
import { variablesFor, TARGET_MARGIN } from '../core/optimise.js';
import { DESIGN_SPEC, getPath } from '../core/model.js';
import { specAt } from '../core/spec.js';

/** @import { Design } from '../core/model.js' */
/** @import { Variable, OptimiseResult } from '../core/optimise.js' */
/** @import { NumberSpec } from '../core/spec.js' */

/**
 * Optimiser setup kept for the session, per optics type.
 * @typedef {{ chosen: Record<string, { enabled: boolean, min: number, max: number }> }} OptimiseSetup
 * @typedef {{ running: boolean, done: number, total: number, history: number[], result: OptimiseResult | null, error: string | null, revision: number }} OptimiseState
 */

/** Values varied by default: the optics, leaving the LED and the outer lens as given. */
const DEFAULT_OFF = ['cover.haze', 'optics.slopeErrorMrad'];

/** @param {Design} design @returns {OptimiseSetup} */
export function defaultSetup(design) {
  /** @type {OptimiseSetup['chosen']} */
  const chosen = {};
  for (const v of variablesFor(design)) chosen[v.path] = { enabled: !DEFAULT_OFF.includes(v.path), min: v.min, max: v.max };
  return { chosen };
}

/** @param {number} v */
export function formatShortfall(v) {
  return Number.isFinite(v) ? fmt(v, v < 0.1 ? 3 : 2) : '–';
}

/**
 * @param {{ design: Design, setup: OptimiseSetup, state: OptimiseState, width: number, revision: number,
 *   onSetup: (setup: OptimiseSetup) => void, onRun: () => void, onStop: () => void, onApply: () => void }} props
 */
export function optimiseView({ design, setup, state, width, revision, onSetup, onRun, onStop, onApply }) {
  const vars = variablesFor(design);
  const rows = vars.map(v => {
    const spec = /** @type {NumberSpec} */ (specAt(DESIGN_SPEC, design, v.path));
    const chosen = setup.chosen[v.path] ?? { enabled: false, min: v.min, max: v.max };
    const factor = spec.display?.factor ?? 1, unit = spec.display?.unit ?? spec.unit;
    const digits = spec.integer ? 0 : (spec.display?.digits ?? (spec.step && spec.step < 0.01 ? 4 : 2));
    const box = h('input', { type: 'checkbox', checked: chosen.enabled, disabled: state.running, 'aria-label': `Vary ${v.label}` });
    /** @param {'min' | 'max'} key */
    const bound = key => {
      const input = h('input', { class: 'text-input bound', value: fmt(chosen[key] * factor, digits).replace(/,/g, ''), disabled: state.running || !chosen.enabled, 'aria-label': `${key === 'min' ? 'Lowest' : 'Highest'} ${v.label}`, inputmode: 'decimal' });
      input.addEventListener('change', () => {
        const value = Number(input.value.replace(',', '.')) / factor;
        if (Number.isFinite(value)) onSetup({ chosen: { ...setup.chosen, [v.path]: { ...chosen, [key]: Math.min(spec.max, Math.max(spec.min, value)) } } });
      });
      return input;
    };
    box.addEventListener('change', () => onSetup({ chosen: { ...setup.chosen, [v.path]: { ...chosen, enabled: box.checked } } }));
    return h('div', { class: 'opt-var', 'data-enabled': String(chosen.enabled) }, [
      h('label', { class: 'opt-name', 'data-tip': v.label }, [box, h('span', { text: v.label })]),
      bound('min'), h('span', { class: 'opt-dash', text: 'to' }), bound('max'), h('span', { class: 'opt-unit', text: unit }),
    ]);
  });
  const anyChosen = vars.some(v => setup.chosen[v.path]?.enabled);
  const action = state.running
    ? h('button', { class: 'outline-button', type: 'button', text: 'Stop' })
    : h('button', { class: 'primary-button', type: 'button', disabled: !anyChosen, text: 'Optimise' });
  action.addEventListener('click', () => (state.running ? onStop() : onRun()));

  const setupPanel = h('div', { class: 'opt-setup' }, [
    h('p', { class: 'opt-help', text: `Searches for values that give every requirement at least ${Math.round(TARGET_MARGIN * 100)}% headroom: first by sampling the ranges evenly, then by refining the best sample. The shortfall adds up how far each requirement falls short; 0 means none does.` }),
    h('div', { class: 'subhead', text: 'Values to vary, and their range' }),
    ...rows,
    h('div', { class: 'opt-actions' }, [action, state.running ? h('span', { class: 'opt-progress', text: state.done >= state.total ? 'Confirming the result with fresh rays…' : `Candidate ${state.done} of up to ${state.total}` }) : null]),
  ]);

  /** @type {(Node | null)[]} */
  const results = [];
  if (state.error) results.push(h('div', { class: 'error-note', text: state.error }));
  if (state.history.length) {
    const points = state.history.map((v, i) => /** @type {[number, number]} */ ([i + 1, v])).filter(([, v]) => Number.isFinite(v));
    results.push(chartFrame({
      title: 'Best so far',
      subtitle: 'Shortfall against candidates tried',
      chart: lineChart({ series: [{ name: 'Shortfall', colour: 'var(--series-1)', points }], x: { label: 'Candidates tried', format: v => fmt(v, 0) }, y: { label: 'Shortfall', format: v => fmt(v, 2) }, width: Math.max(260, width), height: 140 }),
      table: dataTable(['Candidate', 'Shortfall'], points.map(([i, v]) => [String(i), formatShortfall(v)])),
    }));
  }
  if (state.result) results.push(summary(design, state.result, revision !== state.revision, onApply));
  if (!results.length) results.push(h('div', { class: 'empty-state' }, [h('strong', { text: 'Let the tracer search for you' }), 'Tick the values to vary, set their ranges, and press Optimise. Every candidate is checked against the design rules, traced with the same random rays so differences are real, and judged against R149.']));

  return h('div', { class: 'dock-inner' }, [
    h('div', { class: 'dock-title' }, [h('h3', { text: 'Optimise' }), h('p', { text: 'Search for values that meet R149 with headroom, within the ranges you set' })]),
    h('div', { class: 'opt-layout' }, [setupPanel, h('div', { class: 'opt-results' }, results)]),
  ]);
}

/** @param {Design} design @param {OptimiseResult} r @param {boolean} changed @param {() => void} onApply */
function summary(design, r, changed, onApply) {
  const gain = r.confirmation.start - r.confirmation.best;
  const noise = Math.max(r.confirmation.noise, 1e-12);
  const real = gain > 2 * noise;
  const verdict = real
    ? `Confirmed with fresh rays: the shortfall fell from ${formatShortfall(r.confirmation.start)} to ${formatShortfall(r.confirmation.best)}, against sampling noise of about ±${formatShortfall(noise)}.`
    : `No improvement beyond sampling noise (±${formatShortfall(noise)}). More rays per candidate, or different ranges, may help.`;
  const apply = h('button', { class: 'primary-button', type: 'button', disabled: !real, text: 'Apply these values' });
  apply.addEventListener('click', onApply);
  const failing = r.best.evaluation.items.filter(i => i.status === 'fail' || i.status === 'blocked');
  return h('div', { class: 'opt-summary' }, [
    dataTable(['Value', 'Before', 'After'], r.variables.map((v, i) => {
      const spec = /** @type {NumberSpec} */ (specAt(DESIGN_SPEC, design, v.path));
      const factor = spec.display?.factor ?? 1, unit = spec.display?.unit ?? spec.unit, digits = spec.integer ? 0 : (spec.display?.digits ?? 3);
      const edge = (r.best.values[i] - v.min) / (v.max - v.min);
      const limit = edge < 0.01 ? ' (at the lowest limit)' : edge > 0.99 ? ' (at the highest limit)' : '';
      return [v.label, `${fmt(r.start.values[i] * factor, digits)} ${unit}`.trim(), `${fmt(r.best.values[i] * factor, digits)} ${unit}${limit}`.trim()];
    })),
    h('p', { class: real ? 'opt-verdict' : 'opt-verdict muted', text: verdict }),
    failing.length ? h('p', { class: 'opt-help', text: `Still failing: ${failing.map(i => i.label).join(', ')}.` }) : h('p', { class: 'opt-help', text: 'Every requirement passes with the best values found.' }),
    changed ? h('p', { class: 'opt-help', text: 'The design has changed since this run. Applying sets only the values in the table.' }) : null,
    h('div', { class: 'opt-actions' }, [apply, h('span', { class: 'opt-progress', text: `${r.evaluations} candidates` })]),
  ]);
}

/** Variables chosen in a setup, as the optimiser expects them. @param {Design} design @param {OptimiseSetup} setup @returns {Variable[]} */
export function chosenVariables(design, setup) {
  return variablesFor(design).filter(v => setup.chosen[v.path]?.enabled).map(v => {
    const c = setup.chosen[v.path];
    const current = /** @type {number} */ (getPath(design, v.path));
    // Keep the current value inside the range so the search starts from the design as it is.
    return { path: v.path, label: v.label, min: Math.min(c.min, current), max: Math.max(c.max, current) };
  });
}
