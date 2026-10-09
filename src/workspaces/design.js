/** The lamp design workspace: design a headlamp, trace it across every core and check it against UN R149. It wires
 * the design store, the trace pool, the analysis worker, the beam, road and lamp views, the inspector and the studies
 * together. It can hand its traced beam to the photometry workspace as an IES file. */

import { DocumentStore } from '../core/history.js';
import { defaultDesign, parseDesign, serializeDesign, switchVariant, setPath, isPassing, validateDesign, DESIGN_SPEC } from '../core/model.js';
import { buildLamp } from '../core/lamp.js';
import { cutoffAt } from '../core/lamps/cutoff.js';
import { lensFocalLength, lensBackFocus } from '../core/optics.js';
import { sectionOutlines } from '../core/section.js';
import { optimise } from '../core/optimise.js';
import { ISOLUX } from '../core/road.js';
import { exportGridAngles, layerCandela } from '../core/analysis.js';
import { writeIesTypeA } from '../core/distribution/ies.js';
import { BeamView } from '../render/beam-view.js';
import { CONTOUR_LEVELS } from '../core/photometry.js';
import { RoadView } from '../render/road-view.js';
import { LampView, RAY_STYLES } from '../render/lamp-view.js';
import { Inspector } from '../ui/inspector.js';
import { complianceView, formatValue, itemMarks } from '../ui/compliance-view.js';
import { budgetView } from '../ui/budget-view.js';
import { roadPanel } from '../ui/road-panel.js';
import { optimiseView, defaultSetup, chosenVariables, formatShortfall } from '../ui/optimise-view.js';
import { Persistence } from '../ui/persistence.js';
import { byId, h, fmt, pct, debounce, downloadBlob, fileName } from '../ui/dom.js';
import { hydrateIcons } from '../ui/icons.js';
import { readPref, writePref } from '../ui/prefs.js';

/** @import { Design } from '../core/model.js' */
/** @import { Analysis } from '../core/analysis.js' */
/** @import { RayPath } from '../core/types.js' */
/** @import { ChangeDetail } from '../core/history.js' */
/** @import { RibbonTab, Command } from '../ui/shell.js' */
/** @import { Figure, InspectorConfig } from '../ui/inspector.js' */
/** @import { OptimiseSetup, OptimiseState } from '../ui/optimise-view.js' */
/** @import { SurfaceOutline } from '../core/section.js' */
/** @import { CutlineApp } from '../app.js' */
/** @import { Workspace, ViewEntry, Legend, ScaleUnit } from './workspace.js' */

/** Rays for the quick trace that follows every edit; the full trace uses the design's own count. */
const PREVIEW_RAYS = 1_000_000;
/** Ray paths kept for the lamp view. */
const PATHS = 360;
const OPTICS_NAMES = { projector: 'LED projector', reflector: 'Multi-facet reflector' };
export const CLASS_NAMES = { C: 'Class C passing beam', V: 'Class V passing beam', B: 'Class B driving beam', A: 'Class A driving beam' };
const SHORT_CLASS = { C: 'Class C passing', V: 'Class V passing', B: 'Class B driving', A: 'Class A driving' };

/** @typedef {'beam' | 'road' | 'lamp'} ViewId */
/** @typedef {'compliance' | 'budget' | 'road' | 'optimise'} StudyId */

/** The design panel's sections and the states that show or hide fields. @type {InspectorConfig<Design>} */
const INSPECTOR = {
  spec: DESIGN_SPEC,
  sections: [
    { id: 'beam', title: 'Beam', paths: ['beamClass', 'traffic'], summary: d => SHORT_CLASS[d.beamClass] },
    { id: 'cutoff', title: 'Cut-off', paths: ['cutoff'], summary: d => `${fmt(d.cutoff.verticalDeg, 2)}°, ${fmt(d.cutoff.riseDeg, 0)}° rise`, visible: isPassing },
    { id: 'led', title: 'LED', paths: ['led'], summary: d => `${fmt(d.led.flux, 0)} lm` },
    { id: 'optics', title: 'Optics', paths: ['optics'], summary: d => (d.optics.type === 'projector' ? 'Projector' : `${d.optics.columns} × ${d.optics.rows} facets`), extra: d => [figuresBlock(figuresFor(d))] },
    { id: 'cover', title: 'Outer lens', paths: ['cover'], summary: d => `τ ${fmt(d.cover.transmittance * 100, 0)}%` },
    { id: 'mounting', title: 'Mounting', paths: ['mounting'], summary: d => `${fmt(d.mounting.height, 2)} m` },
    { id: 'simulation', title: 'Simulation', paths: ['simulation'], summary: d => `${fmt(d.simulation.rays / 1e6, 1)}M rays` },
  ],
  visible: {
    'optics.shield': isPassing,
    'optics.shield.windowHeight': d => d.optics.type === 'projector' && d.optics.shield.windowWidth > 0,
    'optics.shield.windowDepth': d => d.optics.type === 'projector' && d.optics.shield.windowWidth > 0,
    'optics.lens.signLightHeight': isPassing,
    'optics.lens.signLightMinDeg': d => isPassing(d) && d.optics.type === 'projector' && d.optics.lens.signLightHeight > 0,
    'optics.lens.signLightMaxDeg': d => isPassing(d) && d.optics.type === 'projector' && d.optics.lens.signLightHeight > 0,
    'optics.dropDeg': isPassing,
    'optics.rowDropDeg': isPassing,
    'optics.kickColumns': isPassing,
    'optics.overheadFacets': isPassing,
    'optics.overheadHeight': d => isPassing(d) && d.optics.type === 'reflector' && d.optics.overheadFacets > 0,
    'optics.overheadDeg': d => isPassing(d) && d.optics.type === 'reflector' && d.optics.overheadFacets > 0 && d.optics.overheadHeight > 0,
  },
  switchVariant,
};

/** Derived figures shown under the optics. @param {Design} d @returns {Figure[]} */
function figuresFor(d) {
  try { buildLamp(d); } catch { return []; }
  if (d.optics.type === 'projector') {
    const l = d.optics.lens;
    const f = lensFocalLength(l.radius, l.refractiveIndex);
    return [
      { label: 'Lens focal length', value: f, unit: 'mm', digits: 1, help: 'R / (n − 1): sets how many degrees one millimetre at the shield becomes' },
      { label: 'Degrees per millimetre', value: (180 / Math.PI) / f, unit: '°/mm', digits: 3, help: 'How far the beam moves for each millimetre the shield edge or the LED image moves' },
      { label: 'Module length', value: d.optics.reflector.focalDistance + lensBackFocus(l.radius, l.thickness, l.refractiveIndex) + l.defocus + l.thickness, unit: 'mm', digits: 0, help: 'From the LED to the front of the lens' },
    ];
  }
  const o = d.optics;
  return [
    { label: 'Facet size', value: o.width / o.columns, unit: 'mm', digits: 1, help: 'Width of one facet column' },
    { label: 'Facets', value: o.columns * o.rows, unit: '', digits: 0, help: 'Columns times rows' },
  ];
}

/** @param {Figure[]} figures */
function figuresBlock(figures) {
  if (!figures.length) return null;
  return h('div', { class: 'figures' }, figures.map(f => h('div', { class: 'figure', 'data-tip': f.help }, [h('span', { text: f.label }), h('span', { text: `${fmt(f.value, f.digits)} ${f.unit}`.trim() })])));
}

/** @implements {Workspace} */
export class DesignWorkspace {
  /** @param {CutlineApp} app */
  constructor(app) {
    this.app = app;
    this.id = /** @type {const} */ ('design');
    this.label = 'Lamp design';
    this.icon = 'projector';
    this.fileTypes = '.json,.cutline.json,application/json';
    this.ready = false;
    this.started = false;
    this.persistence = new Persistence({ key: 'current', fallbackKey: 'cutline-design', parse: parseDesign, serialize: serializeDesign });
    this.beamView = new BeamView(app.canvas);
    this.roadView = new RoadView(app.canvas);
    this.lampView = new LampView(app.canvas);
    /** @type {ViewId} */
    this.view = /** @type {ViewId} */ (readPref('cutline-view') ?? 'beam');
    if (!['beam', 'road', 'lamp'].includes(this.view)) this.view = 'beam';
    /** @type {StudyId} */
    this.study = 'compliance';
    /** @type {DocumentStore<Design>} */
    this.store = new DocumentStore(defaultDesign(), validateDesign);
    /** @type {Analysis | null} */
    this.analysis = null;
    /** Rays traced for the analysis on screen, and how long the trace took. */
    this.traced = { rays: 0, ms: 0, quality: /** @type {'preview' | 'full'} */ ('preview') };
    /** @type {RayPath[]} */
    this.paths = [];
    /** @type {string | null} */
    this.error = null;
    this.running = false;
    /** @type {number | null} */
    this.progress = null;
    /** @type {string | null} the requirement picked in the compliance table */
    this.selected = null;
    /** @type {'saved' | 'pending' | 'error'} */
    this.saveState = 'saved';
    /** @type {Partial<Record<string, OptimiseSetup>>} */
    this.optimiseSetups = {};
    /** @type {OptimiseState} */
    this.optimisation = { running: false, done: 0, total: 0, history: [], result: null, error: null, revision: -1 };
    this.inspector = new Inspector(byId('inspectorBody'), { store: this.store, config: INSPECTOR, onError: message => app.toasts.show(message, { kind: 'error' }) });
    this.autosave = debounce(() => this.save(), 450);
    this.fullTrace = debounce(() => this.trace('full'), 220);
    /** The optics type the lamp view was last framed for. @type {string} */
    this.lampType = '';
    /** Store revision of the analysis on screen. */
    this.analysisRevision = -1;
  }

  get design() { return this.store.doc; }
  get isActive() { return this.app.active === this; }

  async start() {
    try {
      const saved = await this.persistence.load();
      if (saved) this.store.replace(saved);
    } catch (error) {
      this.app.toasts.show(`The saved design could not be opened (${error instanceof Error ? error.message : error}). Starting a new one.`, { kind: 'error', ms: 8000 });
    }
    this.store.addEventListener('change', event => this.onChange(/** @type {CustomEvent<ChangeDetail>} */ (event).detail));
    this.rebuildLamp();
  }

  activate() {
    for (const v of [this.beamView, this.roadView, this.lampView]) v.active = v === this.current;
    if (!this.started) {
      this.started = true;
      this.trace('preview').then(() => this.trace('full')).then(() => { this.ready = true; });
    }
  }

  deactivate() {
    for (const v of [this.beamView, this.roadView, this.lampView]) v.active = false;
  }

  title() { return this.design.title; }
  /** @param {string} title */
  rename(title) { this.edit('Rename design', d => { d.title = title; }); }

  /** @param {string} label @param {(design: Design) => void} mutate */
  edit(label, mutate) {
    try { this.store.transact(label, mutate); } catch (e) { this.app.toasts.show(e instanceof Error ? e.message : String(e), { kind: 'error' }); }
  }

  // ---------- Design changes ----------

  /** @param {ChangeDetail} detail */
  onChange(detail) {
    this.rebuildLamp();
    if (detail.kind === 'preview') {
      this.inspector.refreshValues();
      this.trace('preview');
      return;
    }
    if (detail.kind === 'rollback') {
      this.inspector.refreshValues(true);
      this.trace('preview').then(() => this.fullTrace());
      return;
    }
    if (this.isActive) {
      this.renderPanels();
      this.app.renderChrome();
      if (detail.kind === 'load') { this.app.unfit('design', 'beam'); this.app.unfit('design', 'road'); this.app.unfit('design', 'lamp'); this.app.resizeView(); }
      this.app.setStatus(detail.kind === 'undo' ? `Undid ${detail.label.toLowerCase()}` : detail.kind === 'redo' ? `Redid ${detail.label.toLowerCase()}` : detail.kind === 'load' ? 'Design opened' : detail.label);
    }
    this.saveState = 'pending';
    if (this.isActive) this.app.renderSaveState();
    this.autosave();
    this.trace('preview').then(() => this.fullTrace());
  }

  /** Builds the lamp on the main thread for its section drawing; errors stop tracing. */
  rebuildLamp() {
    const d = this.design;
    try {
      const scene = buildLamp(d);
      /** @type {{ side: SurfaceOutline[], top: SurfaceOutline[] }} */
      const sections = { side: sectionOutlines(scene, 'side'), top: sectionOutlines(scene, 'top') };
      const typeChanged = this.lampView.sections === null || this.lampType !== d.optics.type;
      this.lampType = d.optics.type;
      this.lampView.setLamp(sections, this.paths);
      if (typeChanged && this.isActive && this.view === 'lamp') this.app.fitView();
      else if (typeChanged) this.app.unfit('design', 'lamp');
      this.error = null;
    } catch (error) {
      this.error = error instanceof Error ? error.message : String(error);
    }
    this.beamView.cutoff = this.intendedCutoff();
    this.beamView.request();
  }

  /** The design's intended cut-off as drawn on the beam, moved by the laboratory aim. */
  intendedCutoff() {
    const d = this.design;
    if (!isPassing(d)) return [];
    const aim = this.analysis?.evaluation.aim ?? { dh: 0, dv: 0 };
    const out = [];
    for (let h = -45; h <= 45; h += 0.25) out.push(h + aim.dh, cutoffAt(d, h) + aim.dv);
    return out;
  }

  /**
   * Traces the design and analyses the beam. A preview uses a million rays for quick feedback; a full trace uses the
   * design's ray count across every worker.
   * @param {'preview' | 'full'} quality
   */
  async trace(quality) {
    if (this.error) { this.analysis = null; this.running = false; this.renderResults(); return; }
    const design = structuredClone(this.design);
    const rays = quality === 'preview' ? Math.min(PREVIEW_RAYS, design.simulation.rays) : design.simulation.rays;
    this.running = true;
    this.progress = quality === 'full' ? 0 : null;
    this.renderTraceState();
    const started = performance.now();
    try {
      const result = await this.app.pool.trace('design', design, {
        rays, pathCount: quality === 'preview' ? PATHS : 0,
        onProgress: (done, total) => { if (quality === 'full') { this.progress = done / total; this.renderTraceState(); } },
      });
      if (!result) return;
      const ms = performance.now() - started;
      if (quality === 'preview') { this.paths = result.paths; this.lampView.paths = result.paths; this.lampView.request(); }
      const analysis = await this.app.analyser.analyse('design', design, result);
      if (!analysis) return;
      // A preview never replaces a full analysis of the same design.
      if (quality === 'preview' && this.traced.quality === 'full' && this.analysisRevision === this.store.revision && this.analysis) return;
      this.analysis = analysis;
      this.analysisRevision = this.store.revision;
      this.traced = { rays, ms, quality };
      this.error = null;
      this.running = quality === 'preview';
      this.progress = null;
    } catch (error) {
      this.analysis = null;
      this.error = error instanceof Error ? error.message : String(error);
      this.running = false;
    }
    this.showAnalysis();
    this.renderResults();
  }

  /** Hands the analysis to the views. */
  showAnalysis() {
    const a = this.analysis;
    if (!a) return;
    this.beamView.setBeam(a.layers);
    Object.assign(this.beamView, itemMarks(a.evaluation.items));
    this.beamView.cutoff = this.intendedCutoff();
    this.beamView.request();
    this.roadView.setRoad(a.road, this.design.traffic);
  }

  // ---------- Optimiser ----------

  get optimiseSetup() {
    const type = this.design.optics.type;
    return (this.optimiseSetups[type] ??= defaultSetup(this.design));
  }

  async runOptimise() {
    const design = structuredClone(this.design);
    const variables = chosenVariables(design, this.optimiseSetup);
    // Explore a Latin hypercube first, then refine from the best point.
    const explore = 10 + 4 * variables.length;
    const maxEvaluations = explore + 20 * variables.length;
    this.optimisation = { running: true, done: 0, total: maxEvaluations, history: [], result: null, error: null, revision: this.store.revision };
    this.renderDock();
    const redraw = debounce(() => { this.renderStudies(); if (this.study === 'optimise') this.renderDock(); }, 150);
    // Each candidate is traced on two seeds and judged by the worse, each with a tenth of the design's rays and at
    // least four million, so a design cannot pass on one seed's luck.
    const rays = Math.max(4_000_000, Math.round(design.simulation.rays / 10));
    try {
      const result = await optimise(design, async (d, r, seed) => {
        if (!this.optimisation.running) return null;
        const traced = await this.app.pool.trace('optimise', { ...d, simulation: { ...d.simulation, seed } }, { rays: r });
        if (!traced || !this.optimisation.running) return null;
        return this.app.analyser.evaluate('optimise', d, traced);
      }, { variables, maxEvaluations, explore, seeds: 2, rays }, async (best, count) => {
        this.optimisation.done = count;
        this.optimisation.history.push(best);
        redraw();
        return this.optimisation.running;
      });
      redraw.cancel();
      this.optimisation = { ...this.optimisation, running: false, result };
      if (result) this.app.setStatus(`Optimiser finished after ${result.evaluations} candidates`);
    } catch (error) {
      this.optimisation = { ...this.optimisation, running: false, error: error instanceof Error ? error.message : String(error) };
    }
    this.renderDock();
    this.renderStudies();
  }

  stopOptimise() {
    this.optimisation = { ...this.optimisation, running: false };
    this.app.setStatus('Optimiser stopped');
    this.renderDock();
  }

  applyOptimised() {
    const r = this.optimisation.result;
    if (!r) return;
    this.edit('Apply optimised values', d => r.variables.forEach((v, i) => setPath(d, v.path, r.best.values[i])));
    this.optimisation = { ...this.optimisation, revision: this.store.revision };
  }

  // ---------- Rendering ----------

  renderPanels() {
    if (!this.isActive) return;
    this.inspector.render();
    this.renderResults();
  }

  renderResults() {
    if (!this.isActive) return;
    this.renderStudies();
    this.renderDock();
    this.renderTraceState();
    byId('statusRays').textContent = this.analysis ? `${fmt(this.traced.rays / 1e6, 1)} million rays in ${fmt(this.traced.ms / 1000, 2)} s on ${this.app.pool.size} ${this.app.pool.size === 1 ? 'core' : 'cores'}` : '';
  }

  renderDock() {
    if (!this.isActive) return;
    const dock = byId('dock');
    const width = dock.clientWidth - 36;
    const design = this.design;
    const scroll = dock.scrollTop;
    /** @type {HTMLElement} */
    let view;
    if (this.study === 'budget') view = budgetView({ design, analysis: this.analysis, running: this.running, width });
    else if (this.study === 'road') view = roadPanel({ design, analysis: this.analysis, running: this.running, width });
    else if (this.study === 'optimise') view = optimiseView({
      design, setup: this.optimiseSetup, state: this.optimisation, width: window.innerWidth > 720 ? width - 338 : width, revision: this.store.revision,
      onSetup: setup => { this.optimiseSetups[design.optics.type] = setup; this.renderDock(); },
      onRun: () => this.runOptimise(), onStop: () => this.stopOptimise(), onApply: () => this.applyOptimised(),
    });
    else view = complianceView({
      title: 'Compliance', subtitle: `${this.analysis?.evaluation.source.title ?? 'UN Regulation No. 149'}, ${CLASS_NAMES[design.beamClass]}, ${design.traffic}-hand traffic`,
      evaluation: this.analysis?.evaluation ?? null, peak: this.analysis?.peak ?? null, error: this.error, running: this.running, selected: this.selected, onSelect: id => this.select(id),
    });
    dock.replaceChildren(view);
    hydrateIcons(dock);
    dock.scrollTop = scroll;
  }

  /** Picks out a requirement in the beam view. @param {string | null} id */
  select(id) {
    if (this.selected === id) return;
    this.selected = id;
    this.beamView.selected = id;
    this.beamView.request();
    for (const row of document.querySelectorAll('.req-row')) row.setAttribute('aria-selected', String(/** @type {HTMLElement} */ (row).dataset.id === id));
  }

  /** @param {StudyId} study */
  showStudy(study) {
    this.study = study;
    if (study === 'road' && this.view !== 'road') this.app.setView('road');
    if (study === 'compliance' && this.view === 'road') this.app.setView('beam');
    this.renderStudies();
    this.renderDock();
    this.app.ribbon.refresh();
  }

  renderStudies() {
    if (!this.isActive) return;
    const a = this.analysis;
    const e = a?.evaluation;
    const met = e ? e.items.filter(i => i.status === 'pass' || i.status === 'near').length : 0;
    const traceState = this.error ? ['error', 'Needs attention'] : this.running ? ['running', this.progress !== null && this.progress > 0 ? `${Math.round(this.progress * 100)}%` : 'Tracing'] : a ? ['done', this.traced.quality === 'full' ? 'Up to date' : 'Preview'] : ['idle', 'Not run yet'];
    const opt = this.optimisation;
    /** @type {[StudyId, string, string[], (string | Node)[], string][]} */
    const items = [
      ['compliance', 'Compliance', traceState, e ? [`${met}/${e.items.length}`, h('small', { text: 'requirements met' })] : ['–'], e ? (e.pass ? 'Meets UN R149' : `Weakest: ${e.worst?.label ?? '–'}`) : CLASS_NAMES[this.design.beamClass]],
      ['budget', 'Light budget', traceState, a ? [pct(a.ledger.beam / a.emitted, 1), h('small', { text: 'reaches the beam' })] : ['–'], a ? `${fmt(a.ledger.beam, 0)} lm of ${fmt(a.emitted, 0)} lm` : 'Where the lumens go'],
      ['road', 'Road', traceState, a ? [`${fmt(a.road.reach[3], 0)} m`, h('small', { text: 'lit to 3 lx' })] : ['–'], a ? `${fmt(a.road.width3lx20m, 1)} m wide at 20 m` : 'Range and width on the road'],
      ['optimise', 'Optimise', opt.error ? ['error', 'Needs attention'] : opt.running ? ['running', `${Math.round((opt.done / Math.max(1, opt.total)) * 100)}%`] : opt.result ? ['done', 'Finished'] : ['idle', 'Not run yet'],
        opt.result ? [formatShortfall(opt.result.confirmation.best), h('small', { text: 'shortfall' })] : ['–'], opt.result ? `From ${formatShortfall(opt.result.confirmation.start)}` : 'Search for compliant values'],
    ];
    renderStudyList(items, this.study, id => this.showStudy(/** @type {StudyId} */ (id)), ['Traced in your browser', 'Every ray runs on this computer. Nothing is uploaded.']);
  }

  renderTraceState() {
    if (!this.isActive) return;
    const el = byId('traceState');
    if (this.error) { el.dataset.state = 'error'; el.textContent = 'Cannot trace this design'; return; }
    if (this.running) { el.dataset.state = 'running'; el.textContent = this.progress !== null ? `Tracing ${Math.round(this.progress * 100)}%` : 'Refining…'; return; }
    el.dataset.state = '';
    el.textContent = this.analysis ? `${fmt(this.traced.rays / 1e6, 1)}M rays` : '';
  }

  breadcrumb() {
    const d = this.design;
    return [h('strong', { text: OPTICS_NAMES[d.optics.type] }), h('span', { class: 'sep', text: '/' }), CLASS_NAMES[d.beamClass]];
  }

  /** @returns {Legend} */
  legend() {
    if (this.view === 'beam') {
      /** @type {[string, string, boolean?][]} */
      const entries = [['Iso-candela lines', 'rgba(242, 194, 48, .55)']];
      if (isPassing(this.design)) entries.push(['Intended cut-off', '#f2c230', true]);
      entries.push(['Pass', '#51cf66'], ['Near', '#f2c230'], ['Fail', '#ff6b6b']);
      return { entries, hint: 'The beam as the laboratory aims it. Scroll to zoom, drag to pan.' };
    }
    if (this.view === 'road') return { entries: [[`Isolux lines ${ISOLUX.join(', ')} lx`, 'rgba(242, 194, 48, .9)']], hint: 'Light on a target facing the car, from both lamps.' };
    return {
      entries: /** @type {[string, string][]} */ ((/** @type {(keyof typeof RAY_STYLES)[]} */ (['beam', 'shield', 'housing'])).map(k => [RAY_STYLES[k].label, `rgb(${RAY_STYLES[k].colour})`])),
      hint: 'Sections through the LED, with a sample of traced rays.',
    };
  }

  // ---------- Views ----------

  /** The view on the canvas now. */
  get current() { return this.view === 'beam' ? this.beamView : this.view === 'road' ? this.roadView : this.lampView; }

  /** @returns {ViewEntry[]} */
  views() {
    return [
      { id: 'beam', label: 'Beam', icon: 'beam', hint: 'The beam pattern as the laboratory aims it' },
      { id: 'road', label: 'Road', icon: 'road', hint: 'Light on the road from a pair of lamps' },
      { id: 'lamp', label: 'Lamp', icon: 'lamp', hint: 'Sections through the lamp with traced rays' },
    ];
  }

  /** @param {string} view */
  setView(view) {
    this.view = /** @type {ViewId} */ (view);
    writePref('cutline-view', view);
    for (const v of [this.beamView, this.roadView, this.lampView]) v.active = v === this.current;
    this.app.canvas.setAttribute('aria-label', view === 'beam' ? 'Headlamp beam pattern' : view === 'road' ? 'Light on the road' : 'Sections through the lamp');
    this.current.request();
  }

  /** @returns {ScaleUnit | null} */
  scaleUnit() {
    // The beam is marked in degrees and the road in metres along its length; only the lamp needs a scale bar.
    return this.view === 'lamp' ? { unit: 'mm', text: x => `${fmt(x, 0)} mm` } : null;
  }

  /** The hover read-out at a canvas point, as HTML, or null. @param {number} x @param {number} y */
  readout(x, y) {
    if (this.view === 'beam' && this.analysis) {
      const marker = this.beamView.markerAt(x, y);
      const [hh, vv] = this.beamView.toAngles(x, y);
      const cd = this.beamView.candelaAt(hh, vv);
      const pos = `${fmt(Math.abs(hh), 2)}°${hh >= 0 ? 'R' : 'L'}, ${fmt(Math.abs(vv), 2)}°${vv >= 0 ? 'U' : 'D'}`;
      if (marker) {
        const item = this.analysis.evaluation.items.find(i => i.id === marker.id);
        if (item) return `<b>${item.label}</b><br>${formatValue(item)}, needs ${item.requirement}<br>${pos}`;
      }
      return Number.isFinite(cd) ? `<b>${fmt(cd, 0)} cd</b><br>${pos}` : null;
    }
    if (this.view === 'road' && this.analysis) {
      const [rx, rz] = this.roadView.toRoad(x, y);
      const lux = this.roadView.luxAt(rx, rz);
      return Number.isFinite(lux) && rz >= 1 ? `<b>${fmt(lux, lux < 10 ? 1 : 0)} lx</b><br>${fmt(rz, 0)} m ahead, ${fmt(Math.abs(rx), 1)} m ${rx >= 0 ? 'right' : 'left'}` : null;
    }
    return null;
  }

  // ---------- Files ----------

  async save() {
    try {
      await this.persistence.save(this.design);
      this.saveState = 'saved';
    } catch {
      this.saveState = 'error';
      this.app.toasts.show('This browser could not store the design. Download a copy to keep your work.', { kind: 'error', action: { label: 'Download', run: () => this.download() }, ms: 9000 });
    }
    if (this.isActive) this.app.renderSaveState();
  }

  download() {
    const d = this.design;
    downloadBlob(fileName(d.title, '.cutline.json'), new Blob([serializeDesign(d)], { type: 'application/json' }));
    this.app.setStatus('Design downloaded');
  }

  /** @param {File} file */
  accepts(file) { return /\.json$/i.test(file.name) && !/\.(photometry|vehicle)\.json$/i.test(file.name); }

  /** @param {'projector' | 'reflector'} type */
  async newDesign(type) {
    if (!(await this.app.confirmReplace(this))) return;
    const design = defaultDesign();
    switchVariant(design, 'optics', type);
    this.store.replace(design);
  }

  /** @param {File} file */
  async openFile(file) {
    try {
      const design = parseDesign(await file.text());
      if (!(await this.app.confirmReplace(this))) return;
      this.store.replace(design);
      this.app.toasts.show(`Opened “${design.title}”`);
    } catch (error) {
      this.app.toasts.show(`${file.name} could not be opened. ${error instanceof Error ? error.message : error}`, { kind: 'error', ms: 8000 });
    }
  }

  /** The compliance table as CSV, for a test report. */
  exportReport() {
    const a = this.analysis;
    if (!a) return;
    const d = this.design, e = a.evaluation;
    /** @param {unknown} v */
    const q = v => `"${String(v).replace(/"/g, '""')}"`;
    const lines = [
      `${q('Design')},${q(d.title)}`,
      `${q('Regulation')},${q(`${e.source.title}, ${CLASS_NAMES[d.beamClass]}, ${d.traffic}-hand traffic`)}`,
      `${q('Aim')},${q(`${fmt(e.aim.dh, 3)}° horizontal, ${fmt(e.aim.dv, 3)}° vertical, ${e.aim.method}`)}`,
      `${q('Rays')},${this.traced.rays}`,
      '',
      ['Requirement', 'Group', 'Status', 'Measured', 'Unit', 'Statistical error', 'Limit', 'Margin', 'Citation'].map(q).join(','),
      ...e.items.map(i => [i.label, i.group, i.status, Number.isFinite(i.value) ? i.value.toPrecision(5) : '', i.unit, i.error ? i.error.toFixed(3) : '', i.requirement, Number.isFinite(i.margin) ? i.margin.toFixed(4) : '', i.cite].map(q).join(',')),
    ];
    downloadBlob(fileName(d.title, ' compliance.csv'), new Blob([lines.join('\n') + '\n'], { type: 'text/csv' }));
  }

  /** The aimed beam's fine grid as a candela table: one row per vertical angle, one column per horizontal angle. */
  exportCandela() {
    const a = this.analysis;
    if (!a) return;
    const layer = a.layers[1];
    const s = layer.spec;
    const nh = Math.round((s.hMax - s.hMin) / s.step), nv = Math.round((s.vMax - s.vMin) / s.vStep);
    const hs = Array.from({ length: nh }, (_, c) => (s.hMin + (c + 0.5) * s.step).toFixed(3));
    const lines = [`V \\ H (deg),${hs.join(',')}`];
    for (let r = nv - 1; r >= 0; r--) {
      const row = [];
      for (let c = 0; c < nh; c++) row.push(Math.round(layer.candela[r * nh + c]));
      lines.push(`${(s.vMin + (r + 0.5) * s.vStep).toFixed(3)},${row.join(',')}`);
    }
    downloadBlob(fileName(this.design.title, ' candela.csv'), new Blob([lines.join('\n') + '\n'], { type: 'text/csv' }));
  }

  /**
   * The traced beam as an IES file (LM-63-2002, Type A), as built: the laboratory's aim is taken back out, so another
   * tool, or Cutline's photometry workspace, can aim it again.
   */
  iesText() {
    const a = this.analysis;
    if (!a) return null;
    const { dh, dv } = a.evaluation.aim;
    const d = this.design;
    const { horizontal, vertical } = exportGridAngles();
    return writeIesTypeA({
      title: d.title, horizontal, vertical, lumens: d.led.flux,
      keywords: { MANUFAC: 'Cutline simulation', LUMCAT: d.id, LUMINAIRE: `${OPTICS_NAMES[d.optics.type]}, ${CLASS_NAMES[d.beamClass]}, ${d.traffic}-hand traffic`, OTHER: `Traced with ${fmt(this.traced.rays / 1e6, 0)} million rays; Type A, horizontal angles about the vertical axis, positive to the right` },
      candela: (h, v) => layerCandela(a.layers, h + dh, v + dv),
    });
  }

  exportIes() {
    const text = this.iesText();
    if (text) downloadBlob(fileName(this.design.title, '.ies'), new Blob([text], { type: 'text/plain' }));
  }

  async analysePhotometry() {
    const text = this.iesText();
    if (!text) return;
    await this.app.photometry.loadDistribution(text, fileName(this.design.title, '.ies'), { role: isPassing(this.design) ? 'passing' : 'driving', traffic: this.design.traffic });
  }

  // ---------- Commands ----------

  /** @returns {Command[]} */
  commandList() {
    const d = () => this.design;
    /** @param {'projector' | 'reflector'} type */
    const optics = type => ({ id: `optics-${type}`, label: OPTICS_NAMES[type], icon: type, hint: `Make this an ${OPTICS_NAMES[type].toLowerCase()}`, pressed: () => d().optics.type === type, run: () => { if (d().optics.type !== type) this.edit(`Make it a ${type}`, x => switchVariant(x, 'optics', type)); } });
    /** @param {'C' | 'V' | 'B' | 'A'} cls */
    const beamClass = cls => ({ id: `class-${cls}`, label: CLASS_NAMES[cls], icon: cls === 'C' || cls === 'V' ? 'beam' : 'sun', hint: `Check against R149 as a ${CLASS_NAMES[cls].toLowerCase()}`, pressed: () => d().beamClass === cls, run: () => { if (d().beamClass !== cls) this.edit(`Make it a ${CLASS_NAMES[cls].toLowerCase()}`, x => { x.beamClass = cls; }); } });
    /** @param {'right' | 'left'} side */
    const traffic = side => ({ id: `traffic-${side}`, label: `${side === 'right' ? 'Right' : 'Left'}-hand traffic`, icon: 'road', pressed: () => d().traffic === side, run: () => { if (d().traffic !== side) this.edit(`Drive on the ${side}`, x => { x.traffic = side; }); } });
    /** @param {number} rays @param {string} label */
    const quality = (rays, label) => ({ id: `rays-${rays}`, label, icon: 'rays', hint: `${fmt(rays / 1e6, 0)} million rays per full trace`, pressed: () => d().simulation.rays === rays, run: () => this.edit(`Use ${label.toLowerCase()} quality`, x => { x.simulation.rays = rays; }) });
    return [
      { id: 'new-projector', label: 'New projector', icon: 'projector', run: () => this.newDesign('projector') },
      { id: 'new-reflector', label: 'New reflector', icon: 'reflector', run: () => this.newDesign('reflector') },
      { id: 'export-report', label: 'Compliance report', icon: 'table', hint: 'Download the compliance table as CSV', enabled: () => !!this.analysis, run: () => this.exportReport() },
      { id: 'export-candela', label: 'Candela table', icon: 'json', hint: 'Download the aimed beam\'s intensity on a 0.05° grid as CSV', enabled: () => !!this.analysis, run: () => this.exportCandela() },
      { id: 'export-ies', label: 'IES file', icon: 'file', hint: 'Download the traced beam as an IES file (LM-63-2002, Type A)', enabled: () => !!this.analysis, run: () => this.exportIes() },
      { id: 'analyse-photometry', label: 'Check every market', icon: 'globe', hint: 'Open the traced beam in the photometry workspace: market report, isolux and road pictures', enabled: () => !!this.analysis && !this.running, run: () => this.analysePhotometry() },
      optics('projector'), optics('reflector'),
      beamClass('C'), beamClass('V'), beamClass('B'), beamClass('A'),
      traffic('right'), traffic('left'),
      ...(/** @type {[StudyId, string, string][]} */ ([['compliance', 'Compliance', 'pass'], ['budget', 'Light budget', 'layers'], ['road', 'Road', 'road'], ['optimise', 'Optimise', 'optimise']]))
        .map(([id, label, icon]) => ({ id: `study-${id}`, label: `Show ${label.toLowerCase()}`, icon, pressed: () => this.study === id, run: () => this.showStudy(id) })),
      { id: 'trace', label: 'Trace now', icon: 'trace', shortcut: 'T', hint: 'Trace the design again', run: () => this.trace('full') },
      quality(4_000_000, 'Draft'), quality(20_000_000, 'Standard'), quality(50_000_000, 'Fine'),
      { id: 'new-seed', label: 'New random seed', icon: 'refresh', hint: 'Trace with different random rays to see the sampling noise', run: () => this.edit('Use a new random seed', x => { x.simulation.seed = (x.simulation.seed * 1103515245 + 12345) >>> 0; }) },
      { id: 'toggle-contours', label: 'Iso-candela lines', icon: 'layers', hint: `Show lines at ${CONTOUR_LEVELS.map(l => fmt(l, 0)).join(', ')} cd`, pressed: () => this.beamView.showContours, run: () => { this.beamView.showContours = !this.beamView.showContours; this.beamView.request(); } },
      { id: 'toggle-rays', label: 'Rays', icon: 'rays', hint: 'Show traced rays in the lamp view', pressed: () => this.lampView.showRays, run: () => { this.lampView.showRays = !this.lampView.showRays; this.lampView.request(); } },
    ];
  }

  /** @returns {RibbonTab[]} */
  tabs() {
    return [
      { id: 'file', label: 'File', groups: [
        { caption: 'New', items: [{ cmd: 'new-projector', size: 'small', label: 'Projector' }, { cmd: 'new-reflector', size: 'small', label: 'Reflector' }] },
        { caption: 'Design file', items: [{ cmd: 'open', label: 'Open' }, { cmd: 'save', label: 'Download' }] },
        { caption: 'Export', items: [{ cmd: 'export-report', label: 'Compliance' }, { cmd: 'export-candela', label: 'Candela table' }, { cmd: 'export-ies', label: 'IES file' }, { cmd: 'export-png', label: 'Image' }] },
      ] },
      { id: 'design', label: 'Design', groups: [
        { caption: 'Optics', items: [{ cmd: 'optics-projector', label: 'Projector' }, { cmd: 'optics-reflector', label: 'Reflector' }] },
        { caption: 'Beam class', items: [{ cmd: 'class-C', size: 'small', label: 'Passing C' }, { cmd: 'class-V', size: 'small', label: 'Passing V' }, { cmd: 'class-B', size: 'small', label: 'Driving B' }, { cmd: 'class-A', size: 'small', label: 'Driving A' }] },
        { caption: 'Traffic', items: [{ cmd: 'traffic-right', size: 'small', label: 'Right-hand' }, { cmd: 'traffic-left', size: 'small', label: 'Left-hand' }] },
        { caption: 'Edit', items: [{ cmd: 'undo', size: 'small' }, { cmd: 'redo', size: 'small' }, { cmd: 'rename', size: 'small', label: 'Rename' }] },
      ] },
      { id: 'analyse', label: 'Analyse', groups: [
        { caption: 'Studies', items: [{ cmd: 'study-compliance', label: 'Compliance' }, { cmd: 'study-budget', label: 'Light budget' }, { cmd: 'study-road', label: 'Road' }, { cmd: 'study-optimise', label: 'Optimise', className: 'sun' }] },
        { caption: 'Run', items: [{ cmd: 'trace', label: 'Trace now', className: 'sun' }, { cmd: 'new-seed', size: 'small', label: 'New seed' }] },
        { caption: 'Quality', items: [{ cmd: 'rays-4000000', label: 'Draft' }, { cmd: 'rays-20000000', label: 'Standard' }, { cmd: 'rays-50000000', label: 'Fine' }] },
        { caption: 'Markets', items: [{ cmd: 'analyse-photometry', label: 'Check every market' }] },
      ] },
      { id: 'view', label: 'View', groups: [
        { caption: 'Show', items: [{ cmd: 'view-beam', label: 'Beam' }, { cmd: 'view-road', label: 'Road' }, { cmd: 'view-lamp', label: 'Lamp' }] },
        { caption: 'Camera', items: [{ cmd: 'fit', label: 'Fit' }, { cmd: 'zoom-in', size: 'small' }, { cmd: 'zoom-out', size: 'small' }] },
        { caption: 'Overlays', items: [{ cmd: 'toggle-contours', label: 'Iso-candela' }, { cmd: 'toggle-rays', label: 'Rays' }] },
        { caption: 'Panels', items: [{ cmd: 'toggle-studies', size: 'small', label: 'Studies' }, { cmd: 'toggle-inspector', size: 'small', label: 'Design' }, { cmd: 'toggle-theme', label: 'Dark theme' }] },
      ] },
    ];
  }

  /** @param {string} key */
  key(key) { return key === 't' ? 'trace' : null; }

  /** @returns {[string, string][]} */
  shortcuts() {
    return [
      ['Trace again at full quality', 'T'],
      ['Beam, road or lamp view', '1, 2 or 3'],
      ['Change a value', 'Drag its label; Shift ×10, Alt ×0.1'],
      ['Step a value', '↑ / ↓ in the field'],
    ];
  }
}

/**
 * Fills the studies panel: one card per study with its state, headline value and a line under it.
 * @param {[string, string, string[], (string | Node)[], string][]} items @param {string} current
 * @param {(id: string) => void} onPick @param {[string, string]} foot
 */
export function renderStudyList(items, current, onPick, foot) {
  byId('studyList').replaceChildren(...items.map(([id, name, [code, label], value, sub]) => {
    const item = h('button', { class: 'study', type: 'button', 'aria-current': String(current === id), 'data-study': id }, [
      h('span', { class: 'study-name', text: name }),
      h('span', { class: 'study-state', 'data-state': code, text: label }),
      h('span', { class: 'study-value' }, value),
      h('span', { class: 'study-sub', text: sub }),
    ]);
    item.addEventListener('click', () => onPick(id));
    return item;
  }));
  byId('studiesFoot').replaceChildren(h('strong', { text: foot[0] }), foot[1]);
}
