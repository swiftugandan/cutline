/** The Cutline application: wires the design store, the trace pool, the analysis worker, the views, the inspector,
 * the results dock and the shell together. window.cutline exposes it for scripting and browser tests. */

import { DesignStore } from './core/history.js';
import { defaultDesign, parseDesign, serializeDesign, switchVariant, setPath, isPassing, APP_VERSION } from './core/model.js';
import { buildLamp } from './core/lamp.js';
import { cutoffAt } from './core/lamps/cutoff.js';
import { lensFocalLength, lensBackFocus } from './core/optics.js';
import { sectionOutlines } from './core/section.js';
import { optimise } from './core/optimise.js';
import { ISOLUX } from './core/road.js';
import { TracePool } from './worker/pool.js';
import { AnalysisClient } from './worker/analysis-client.js';
import { BeamView, CONTOUR_LEVELS } from './render/beam-view.js';
import { RoadView } from './render/road-view.js';
import { LampView, RAY_STYLES } from './render/lamp-view.js';
import { Inspector } from './ui/inspector.js';
import { complianceView, formatValue } from './ui/compliance-view.js';
import { budgetView } from './ui/budget-view.js';
import { roadPanel } from './ui/road-panel.js';
import { optimiseView, defaultSetup, chosenVariables, formatShortfall } from './ui/optimise-view.js';
import { Persistence } from './ui/persistence.js';
import { Commands, Ribbon, Toasts, Dialogs, installTooltips } from './ui/shell.js';
import { byId, h, fmt, pct, debounce, downloadBlob, fileName } from './ui/dom.js';
import { hydrateIcons } from './ui/icons.js';

/** @import { Design } from './core/model.js' */
/** @import { Analysis } from './core/analysis.js' */
/** @import { RayPath } from './core/types.js' */
/** @import { ChangeDetail } from './core/history.js' */
/** @import { RibbonTab } from './ui/shell.js' */
/** @import { Figure } from './ui/inspector.js' */
/** @import { OptimiseSetup, OptimiseState } from './ui/optimise-view.js' */
/** @import { SurfaceOutline } from './core/section.js' */

/** Rays for the quick trace that follows every edit; the full trace uses the design's own count. */
const PREVIEW_RAYS = 1_000_000;
/** Ray paths kept for the lamp view. */
const PATHS = 360;
const OPTICS_NAMES = { projector: 'LED projector', reflector: 'Multi-facet reflector' };
const CLASS_NAMES = { C: 'Class C passing beam', V: 'Class V passing beam', B: 'Class B driving beam', A: 'Class A driving beam' };

/** @typedef {'beam' | 'road' | 'lamp'} ViewId */
/** @typedef {'compliance' | 'budget' | 'road' | 'optimise'} StudyId */

/** @param {string} key @returns {string | null} */
function readPref(key) { try { return localStorage.getItem(key); } catch { return null; } }
/** @param {string} key @param {string} value */
function writePref(key, value) { try { localStorage.setItem(key, value); } catch { /* preferences are optional */ } }

export class CutlineApp {
  /** @param {() => Worker} createWorker */
  constructor(createWorker) {
    this.ready = false;
    this.version = APP_VERSION;
    const cores = Math.max(1, Math.min(15, (navigator.hardwareConcurrency || 4) - 1));
    this.pool = new TracePool(createWorker, cores);
    this.analyser = new AnalysisClient(createWorker());
    this.persistence = new Persistence();
    this.toasts = new Toasts();
    this.dialogs = new Dialogs();
    this.commands = new Commands();
    this.root = byId('app');
    const canvas = /** @type {HTMLCanvasElement} */ (byId('view'));
    this.beamView = new BeamView(canvas);
    this.roadView = new RoadView(canvas);
    this.lampView = new LampView(canvas);
    /** @type {ViewId} */
    this.view = /** @type {ViewId} */ (readPref('cutline-view') ?? 'beam');
    if (!['beam', 'road', 'lamp'].includes(this.view)) this.view = 'beam';
    /** @type {StudyId} */
    this.study = 'compliance';
    this.store = new DesignStore(defaultDesign());
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
    /** @type {Figure[]} */
    this.figures = [];
    this.saveState = 'saved';
    /** @type {Partial<Record<string, OptimiseSetup>>} */
    this.optimiseSetups = {};
    /** @type {OptimiseState} */
    this.optimisation = { running: false, done: 0, total: 0, history: [], result: null, error: null, revision: -1 };
    this.inspector = new Inspector(byId('inspectorBody'), { store: this.store, onError: message => this.toasts.show(message, { kind: 'error' }), figures: () => this.figures });
    this.ribbon = new Ribbon({ tabs: byId('tabs'), ribbon: byId('ribbon'), commands: this.commands, layout: this.ribbonLayout(), onShow: () => this.setPanel('ribbon', true) });
    this.autosave = debounce(() => this.save(), 450);
    this.fullTrace = debounce(() => this.trace('full'), 220);
    /** The optics type the lamp view was last framed for. @type {string} */
    this.lampType = '';
    /** Store revision of the analysis on screen. */
    this.analysisRevision = -1;
    /** @type {Set<ViewId>} views framed at least once */
    this.fitted = new Set();
    /** @type {Partial<Record<ViewId, number>>} each view's scale when last fitted, for the zoom read-out */
    this.baseScale = {};
  }

  async start() {
    installTooltips();
    this.applyTheme(readPref('cutline-theme'));
    if (window.innerWidth <= 720) { this.root.dataset.studies = 'closed'; this.root.dataset.inspector = 'closed'; }
    else if (window.innerWidth <= 980) this.root.dataset.inspector = 'closed';
    const dock = Number(readPref('cutline-dock'));
    if (dock > 0) this.root.style.setProperty('--dock-height', `${dock}px`);
    this.registerCommands();
    this.commands.onRun = () => this.ribbon.refresh();
    this.ribbon.render();
    hydrateIcons(document.body);
    try {
      const saved = await this.persistence.load();
      if (saved) this.store.replace(saved);
    } catch (error) {
      this.toasts.show(`The saved design could not be opened (${error instanceof Error ? error.message : error}). Starting a new one.`, { kind: 'error', ms: 8000 });
    }
    this.store.addEventListener('change', event => this.onChange(/** @type {CustomEvent<ChangeDetail>} */ (event).detail));
    this.installCanvas();
    this.installKeyboard();
    this.installSplitter();
    this.installFileDrop();
    new ResizeObserver(() => this.resizeView()).observe(byId('viewport'));
    new ResizeObserver(debounce(() => this.renderDock(), 60)).observe(byId('dock'));
    window.addEventListener('beforeunload', e => { if (this.saveState !== 'saved') e.preventDefault(); });
    this.rebuildLamp();
    this.setView(this.view);
    this.renderAll();
    await this.trace('preview');
    await this.trace('full');
    this.ready = true;
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
    this.renderAll();
    if (detail.kind === 'load') { this.fitted.clear(); this.resizeView(); }
    this.saveState = 'pending';
    this.renderSaveState();
    this.autosave();
    this.setStatus(detail.kind === 'undo' ? `Undid ${detail.label.toLowerCase()}` : detail.kind === 'redo' ? `Redid ${detail.label.toLowerCase()}` : detail.kind === 'load' ? 'Design opened' : detail.label);
    this.trace('preview').then(() => this.fullTrace());
  }

  /** Builds the lamp on the main thread for its section drawing and derived figures; errors stop tracing. */
  rebuildLamp() {
    const d = this.store.design;
    try {
      const scene = buildLamp(d);
      /** @type {{ side: SurfaceOutline[], top: SurfaceOutline[] }} */
      const sections = { side: sectionOutlines(scene, 'side'), top: sectionOutlines(scene, 'top') };
      const typeChanged = this.lampView.sections === null || this.lampType !== d.optics.type;
      this.lampType = d.optics.type;
      this.lampView.setLamp(sections, this.paths);
      if (typeChanged && this.view === 'lamp') this.fitView();
      else if (typeChanged) this.fitted.delete('lamp');
      this.figures = this.figuresFor(d);
      this.error = null;
    } catch (error) {
      this.error = error instanceof Error ? error.message : String(error);
      this.figures = [];
    }
    this.beamView.cutoff = this.intendedCutoff();
    this.beamView.request();
  }

  /** @param {Design} d @returns {Figure[]} */
  figuresFor(d) {
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

  /** The design's intended cut-off as drawn on the beam, moved by the laboratory aim. */
  intendedCutoff() {
    const d = this.store.design;
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
    const design = structuredClone(this.store.design);
    const rays = quality === 'preview' ? Math.min(PREVIEW_RAYS, design.simulation.rays) : design.simulation.rays;
    this.running = true;
    this.progress = quality === 'full' ? 0 : null;
    this.renderTraceState();
    const started = performance.now();
    try {
      const result = await this.pool.trace('design', design, {
        rays, pathCount: quality === 'preview' ? PATHS : 0,
        onProgress: (done, total) => { if (quality === 'full') { this.progress = done / total; this.renderTraceState(); } },
      });
      if (!result) return;
      const ms = performance.now() - started;
      if (quality === 'preview') { this.paths = result.paths; this.lampView.paths = result.paths; this.lampView.request(); }
      const analysis = await this.analyser.analyse('design', design, result);
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
    const items = a.evaluation.items;
    /** @param {import('./core/regulation/evaluate.js').Status} s */
    const mark = s => (s === 'blocked' ? 'info' : s);
    this.beamView.markers = items.filter(i => i.h !== undefined && i.v !== undefined).map(i => ({ id: i.id, label: `${i.label}  ${formatValue(i)}`, h: /** @type {number} */ (i.h), v: /** @type {number} */ (i.v), status: mark(i.status) }));
    this.beamView.zones = items.filter(i => i.polygon).map(i => ({ id: i.id, label: i.label, polygon: /** @type {number[]} */ (i.polygon), status: mark(i.status) }));
    this.beamView.segments = items.filter(i => i.segment).map(i => { const [h0, h1, v] = /** @type {[number, number, number]} */ (i.segment); return { id: i.id, label: `${i.label}  ${formatValue(i)}`, h0, h1, v, status: mark(i.status) }; });
    this.beamView.cutoff = this.intendedCutoff();
    this.beamView.request();
    this.roadView.setRoad(a.road, this.store.design.traffic);
  }

  // ---------- Optimiser ----------

  get optimiseSetup() {
    const type = this.store.design.optics.type;
    return (this.optimiseSetups[type] ??= defaultSetup(this.store.design));
  }

  async runOptimise() {
    const design = structuredClone(this.store.design);
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
        const traced = await this.pool.trace('optimise', { ...d, simulation: { ...d.simulation, seed } }, { rays: r });
        if (!traced || !this.optimisation.running) return null;
        return this.analyser.evaluate('optimise', d, traced);
      }, { variables, maxEvaluations, explore, seeds: 2, rays }, async (best, count) => {
        this.optimisation.done = count;
        this.optimisation.history.push(best);
        redraw();
        return this.optimisation.running;
      });
      redraw.cancel();
      this.optimisation = { ...this.optimisation, running: false, result };
      if (result) this.setStatus(`Optimiser finished after ${result.evaluations} candidates`);
    } catch (error) {
      this.optimisation = { ...this.optimisation, running: false, error: error instanceof Error ? error.message : String(error) };
    }
    this.renderDock();
    this.renderStudies();
  }

  stopOptimise() {
    this.optimisation = { ...this.optimisation, running: false };
    this.setStatus('Optimiser stopped');
    this.renderDock();
  }

  applyOptimised() {
    const r = this.optimisation.result;
    if (!r) return;
    try {
      this.store.transact('Apply optimised values', d => r.variables.forEach((v, i) => setPath(d, v.path, r.best.values[i])));
      this.optimisation = { ...this.optimisation, revision: this.store.revision };
    } catch (error) {
      this.toasts.show(error instanceof Error ? error.message : String(error), { kind: 'error' });
    }
  }

  // ---------- Rendering ----------

  renderAll() {
    this.inspector.render();
    this.ribbon.refresh();
    this.renderTitle();
    this.renderBreadcrumb();
    this.renderLegend();
    this.renderResults();
    this.renderSaveState();
    this.updateUndoTips();
  }

  renderResults() {
    this.renderStudies();
    this.renderDock();
    this.renderTraceState();
    byId('statusRays').textContent = this.analysis ? `${fmt(this.traced.rays / 1e6, 1)} million rays in ${fmt(this.traced.ms / 1000, 2)} s on ${this.pool.size} ${this.pool.size === 1 ? 'core' : 'cores'}` : '';
  }

  renderDock() {
    const dock = byId('dock');
    const width = dock.clientWidth - 36;
    const design = this.store.design;
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
    else view = complianceView({ design, analysis: this.analysis, error: this.error, running: this.running, selected: this.selected, onSelect: id => this.select(id) });
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
    if (study === 'road' && this.view !== 'road') this.setView('road');
    if (study === 'compliance' && this.view === 'road') this.setView('beam');
    this.renderStudies();
    this.renderDock();
    this.ribbon.refresh();
  }

  renderStudies() {
    const a = this.analysis;
    const e = a?.evaluation;
    const met = e ? e.items.filter(i => i.status === 'pass' || i.status === 'near').length : 0;
    const traceState = this.error ? ['error', 'Needs attention'] : this.running ? ['running', this.progress !== null && this.progress > 0 ? `${Math.round(this.progress * 100)}%` : 'Tracing'] : a ? ['done', this.traced.quality === 'full' ? 'Up to date' : 'Preview'] : ['idle', 'Not run yet'];
    const opt = this.optimisation;
    /** @type {[StudyId, string, string[], (string | Node)[], string][]} */
    const items = [
      ['compliance', 'Compliance', traceState, e ? [`${met}/${e.items.length}`, h('small', { text: 'requirements met' })] : ['–'], e ? (e.pass ? 'Meets UN R149' : `Weakest: ${e.worst?.label ?? '–'}`) : CLASS_NAMES[this.store.design.beamClass]],
      ['budget', 'Light budget', traceState, a ? [pct(a.ledger.beam / a.emitted, 1), h('small', { text: 'reaches the beam' })] : ['–'], a ? `${fmt(a.ledger.beam, 0)} lm of ${fmt(a.emitted, 0)} lm` : 'Where the lumens go'],
      ['road', 'Road', traceState, a ? [`${fmt(a.road.reach[3], 0)} m`, h('small', { text: 'lit to 3 lx' })] : ['–'], a ? `${fmt(a.road.width3lx20m, 1)} m wide at 20 m` : 'Range and width on the road'],
      ['optimise', 'Optimise', opt.error ? ['error', 'Needs attention'] : opt.running ? ['running', `${Math.round((opt.done / Math.max(1, opt.total)) * 100)}%`] : opt.result ? ['done', 'Finished'] : ['idle', 'Not run yet'],
        opt.result ? [formatShortfall(opt.result.confirmation.best), h('small', { text: 'shortfall' })] : ['–'], opt.result ? `From ${formatShortfall(opt.result.confirmation.start)}` : 'Search for compliant values'],
    ];
    byId('studyList').replaceChildren(...items.map(([id, name, [code, label], value, sub]) => {
      const item = h('button', { class: 'study', type: 'button', 'aria-current': String(this.study === id), 'data-study': id }, [
        h('span', { class: 'study-name', text: name }),
        h('span', { class: 'study-state', 'data-state': code, text: label }),
        h('span', { class: 'study-value' }, value),
        h('span', { class: 'study-sub', text: sub }),
      ]);
      item.addEventListener('click', () => this.showStudy(id));
      return item;
    }));
    byId('studiesFoot').replaceChildren(h('strong', { text: 'Traced in your browser' }), 'Every ray runs on this computer. Nothing is uploaded.');
  }

  renderTraceState() {
    const el = byId('traceState');
    if (this.error) { el.dataset.state = 'error'; el.textContent = 'Cannot trace this design'; return; }
    if (this.running) { el.dataset.state = 'running'; el.textContent = this.progress !== null ? `Tracing ${Math.round(this.progress * 100)}%` : 'Refining…'; return; }
    el.dataset.state = '';
    el.textContent = this.analysis ? `${fmt(this.traced.rays / 1e6, 1)}M rays` : '';
  }

  renderTitle() {
    const title = this.store.design.title || 'Untitled';
    byId('docTitle').textContent = title;
    document.title = `${title} — Cutline`;
  }

  renderBreadcrumb() {
    const d = this.store.design;
    byId('breadcrumb').replaceChildren(h('strong', { text: OPTICS_NAMES[d.optics.type] }), h('span', { class: 'sep', text: '/' }), CLASS_NAMES[d.beamClass]);
  }

  renderLegend() {
    /** @type {[string, string, boolean?][]} */
    let entries;
    let hint;
    if (this.view === 'beam') {
      entries = [['Iso-candela lines', 'rgba(242, 194, 48, .55)']];
      if (isPassing(this.store.design)) entries.push(['Intended cut-off', '#f2c230', true]);
      entries.push(['Pass', '#51cf66'], ['Near', '#f2c230'], ['Fail', '#ff6b6b']);
      hint = 'The beam as the laboratory aims it. Scroll to zoom, drag to pan.';
    } else if (this.view === 'road') {
      entries = [[`Isolux lines ${ISOLUX.join(', ')} lx`, 'rgba(242, 194, 48, .9)']];
      hint = 'Light on a target facing the car, from both lamps.';
    } else {
      entries = /** @type {[string, string][]} */ ((/** @type {(keyof typeof RAY_STYLES)[]} */ (['beam', 'shield', 'housing'])).map(k => [RAY_STYLES[k].label, `rgb(${RAY_STYLES[k].colour})`]));
      hint = 'Sections through the LED, with a sample of traced rays.';
    }
    byId('viewLegend').replaceChildren(...entries.map(([label, colour, dashed]) => h('span', {}, [h('i', { style: dashed ? `background: repeating-linear-gradient(90deg, ${colour} 0 5px, transparent 5px 8px)` : `background: ${colour}` }), label])));
    byId('statusHint').textContent = hint;
    byId('scaleBar').hidden = this.view !== 'lamp';
    this.updateScale();
  }

  renderSaveState() {
    const el = byId('saveState');
    el.dataset.state = this.saveState;
    el.textContent = this.saveState === 'saved' ? 'Saved on this device' : this.saveState === 'pending' ? 'Saving…' : 'Not saved. Download a copy';
  }

  updateUndoTips() {
    const undo = document.querySelector('.titlebar [data-cmd="undo"]'), redo = document.querySelector('.titlebar [data-cmd="redo"]');
    undo?.setAttribute('data-tip', this.store.canUndo ? `Undo ${this.store.undoLabel.toLowerCase()} (Ctrl+Z)` : 'Nothing to undo');
    redo?.setAttribute('data-tip', this.store.canRedo ? `Redo ${this.store.redoLabel.toLowerCase()} (Ctrl+Shift+Z)` : 'Nothing to redo');
  }

  // ---------- Views ----------

  /** The view on the canvas now. */
  get current() { return this.view === 'beam' ? this.beamView : this.view === 'road' ? this.roadView : this.lampView; }

  /** @param {ViewId} view */
  setView(view) {
    this.view = view;
    writePref('cutline-view', view);
    for (const v of [this.beamView, this.roadView, this.lampView]) v.active = v === this.current;
    for (const b of document.querySelectorAll('#viewSwitch [data-cmd]')) b.setAttribute('aria-pressed', String(/** @type {HTMLElement} */ (b).dataset.cmd === `view-${view}`));
    byId('view').setAttribute('aria-label', view === 'beam' ? 'Headlamp beam pattern' : view === 'road' ? 'Light on the road' : 'Sections through the lamp');
    this.resizeView();
    this.renderLegend();
    this.ribbon.refresh();
  }

  resizeView() {
    this.current.resize();
    if (!this.fitted.has(this.view)) { this.fitted.add(this.view); this.fitView(); }
    else this.updateScale();
  }

  fitView() {
    this.current.fit();
    this.baseScale[this.view] = this.current.camera.scale;
    this.updateScale();
  }

  /** A scale bar of a round length near 110 px, in the view's units. */
  updateScale() {
    const v = this.current;
    const scale = v.camera.scale;
    const [unit, toText] = this.view === 'beam' ? ['°', (/** @type {number} */ x) => `${fmt(x, x < 1 ? 1 : 0)}°`] : this.view === 'road' ? ['m', (/** @type {number} */ x) => `${fmt(x, 0)} m`] : ['mm', (/** @type {number} */ x) => `${fmt(x, 0)} mm`];
    const target = 110 / scale;
    const p = 10 ** Math.floor(Math.log10(target));
    const length = [1, 2, 5, 10].map(m => m * p).reduce((best, x) => (Math.abs(x - target) < Math.abs(best - target) ? x : best));
    const bar = byId('scaleBar');
    /** @type {HTMLElement} */ (bar.querySelector('i')).style.width = `${length * scale}px`;
    /** @type {HTMLElement} */ (bar.querySelector('span')).textContent = toText(length);
    bar.dataset.unit = unit;
    const base = this.baseScale[this.view] ?? scale;
    byId('zoomLabel').textContent = `${fmt((scale / base) * 100, 0)}%`;
  }

  /** Pan, zoom, hover read-outs and double-click to fit, for whichever view is showing. */
  installCanvas() {
    const viewport = byId('viewport'), canvas = /** @type {HTMLCanvasElement} */ (byId('view')), tip = byId('viewTooltip');
    /** @type {{ x: number, y: number, id: number } | null} */
    let drag = null;
    const hideTip = () => { tip.hidden = true; };
    canvas.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, id: e.pointerId }; canvas.setPointerCapture(e.pointerId); viewport.dataset.cursor = 'grabbing'; hideTip(); });
    canvas.addEventListener('pointerup', () => { drag = null; viewport.dataset.cursor = 'grab'; });
    canvas.addEventListener('pointercancel', () => { drag = null; viewport.dataset.cursor = 'grab'; });
    canvas.addEventListener('pointerleave', hideTip);
    canvas.addEventListener('pointermove', e => {
      if (drag) { this.current.pan(e.clientX - drag.x, e.clientY - drag.y); drag = { ...drag, x: e.clientX, y: e.clientY }; return; }
      const r = canvas.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      const html = this.readout(x, y);
      if (!html) { hideTip(); return; }
      tip.innerHTML = html;
      tip.hidden = false;
      const w = tip.offsetWidth, ht = tip.offsetHeight;
      tip.style.left = `${Math.min(r.width - w - 8, x + 14)}px`;
      tip.style.top = `${Math.max(8, Math.min(r.height - ht - 8, y + 14))}px`;
    });
    canvas.addEventListener('wheel', e => {
      e.preventDefault();
      const r = canvas.getBoundingClientRect();
      const factor = Math.exp(-e.deltaY * 0.0015);
      const v = this.current;
      if (v === this.lampView) v.zoom(factor); else v.zoom(factor, e.clientX - r.left, e.clientY - r.top);
      this.updateScale();
    }, { passive: false });
    canvas.addEventListener('dblclick', () => this.fitView());
    viewport.dataset.cursor = 'grab';
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

  /** @param {string} message */
  setStatus(message) { byId('statusMessage').textContent = message; }

  /** @param {'ribbon' | 'studies' | 'inspector'} panel @param {boolean} [open] */
  setPanel(panel, open) {
    const next = open ?? this.root.dataset[panel] !== 'open';
    this.root.dataset[panel] = next ? 'open' : 'closed';
    if (panel === 'ribbon') {
      const toggle = document.querySelector('.ribbon-toggle');
      toggle?.setAttribute('aria-pressed', String(next));
      toggle?.setAttribute('data-tip', next ? 'Hide the ribbon' : 'Show the ribbon');
    }
    this.ribbon.refresh();
    requestAnimationFrame(() => this.resizeView());
  }

  /** @param {string | null} theme */
  applyTheme(theme) {
    const dark = theme ? theme === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  }

  // ---------- Files ----------

  async save() {
    try {
      await this.persistence.save(this.store.design);
      this.saveState = 'saved';
    } catch {
      this.saveState = 'error';
      this.toasts.show('This browser could not store the design. Download a copy to keep your work.', { kind: 'error', action: { label: 'Download', run: () => this.download() }, ms: 9000 });
    }
    this.renderSaveState();
  }

  download() {
    const d = this.store.design;
    downloadBlob(fileName(d.title, '.cutline.json'), new Blob([serializeDesign(d)], { type: 'application/json' }));
    this.setStatus('Design downloaded');
  }

  /** Asks before replacing the current design, which is the only one kept in the browser. */
  async confirmReplace() {
    const choice = await this.dialogs.open({
      title: 'Replace the current design?',
      body: [h('p', { text: `“${this.store.design.title}” is kept only in this browser. Download a copy first if you want to keep it.` })],
      actions: [{ label: 'Cancel', value: '' }, { label: 'Download first', value: 'download' }, { label: 'Replace', value: 'replace', primary: true }],
    });
    if (choice === 'download') { this.download(); return true; }
    return choice === 'replace';
  }

  /** @param {'projector' | 'reflector'} type */
  async newDesign(type) {
    if (!(await this.confirmReplace())) return;
    const design = defaultDesign();
    switchVariant(design, 'optics', type);
    this.store.replace(design);
  }

  /** @param {File} file */
  async openFile(file) {
    try {
      const design = parseDesign(await file.text());
      if (!(await this.confirmReplace())) return;
      this.store.replace(design);
      this.toasts.show(`Opened “${design.title}”`);
    } catch (error) {
      this.toasts.show(`${file.name} could not be opened. ${error instanceof Error ? error.message : error}`, { kind: 'error', ms: 8000 });
    }
  }

  /** The compliance table as CSV, for a test report. */
  exportReport() {
    const a = this.analysis;
    if (!a) return;
    const d = this.store.design, e = a.evaluation;
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
    downloadBlob(fileName(this.store.design.title, ' candela.csv'), new Blob([lines.join('\n') + '\n'], { type: 'text/csv' }));
  }

  exportImage() {
    this.current.draw();
    /** @type {HTMLCanvasElement} */ (byId('view')).toBlob(blob => { if (blob) downloadBlob(fileName(this.store.design.title, ` ${this.view}.png`), blob); }, 'image/png');
  }

  // ---------- Commands ----------

  registerCommands() {
    const d = () => this.store.design;
    /** @param {string} label @param {(design: Design) => void} mutate */
    const edit = (label, mutate) => { try { this.store.transact(label, mutate); } catch (e) { this.toasts.show(e instanceof Error ? e.message : String(e), { kind: 'error' }); } };
    /** @param {'projector' | 'reflector'} type */
    const optics = type => ({ id: `optics-${type}`, label: OPTICS_NAMES[type], icon: type, hint: `Make this an ${OPTICS_NAMES[type].toLowerCase()}`, pressed: () => d().optics.type === type, run: () => { if (d().optics.type !== type) edit(`Make it a ${type}`, x => switchVariant(x, 'optics', type)); } });
    /** @param {'C' | 'V' | 'B' | 'A'} cls */
    const beamClass = cls => ({ id: `class-${cls}`, label: CLASS_NAMES[cls], icon: cls === 'C' || cls === 'V' ? 'beam' : 'sun', hint: `Check against R149 as a ${CLASS_NAMES[cls].toLowerCase()}`, pressed: () => d().beamClass === cls, run: () => { if (d().beamClass !== cls) edit(`Make it a ${CLASS_NAMES[cls].toLowerCase()}`, x => { x.beamClass = cls; }); } });
    /** @param {'right' | 'left'} side */
    const traffic = side => ({ id: `traffic-${side}`, label: `${side === 'right' ? 'Right' : 'Left'}-hand traffic`, icon: 'road', pressed: () => d().traffic === side, run: () => { if (d().traffic !== side) edit(`Drive on the ${side}`, x => { x.traffic = side; }); } });
    /** @param {number} rays @param {string} label */
    const quality = (rays, label) => ({ id: `rays-${rays}`, label, icon: 'rays', hint: `${fmt(rays / 1e6, 0)} million rays per full trace`, pressed: () => d().simulation.rays === rays, run: () => edit(`Use ${label.toLowerCase()} quality`, x => { x.simulation.rays = rays; }) });
    /** @param {ViewId} view @param {string} label @param {string} icon */
    const viewCommand = (view, label, icon) => ({ id: `view-${view}`, label: `${label} view`, icon, pressed: () => this.view === view, run: () => this.setView(view) });
    this.commands.register([
      { id: 'new-projector', label: 'New projector', icon: 'projector', run: () => this.newDesign('projector') },
      { id: 'new-reflector', label: 'New reflector', icon: 'reflector', run: () => this.newDesign('reflector') },
      { id: 'open', label: 'Open design', icon: 'open', shortcut: 'Ctrl+O', run: () => byId('fileInput').click() },
      { id: 'save', label: 'Download design', icon: 'download', shortcut: 'Ctrl+S', run: () => this.download() },
      { id: 'rename', label: 'Rename design', icon: 'new', palette: true, run: async () => { const name = await this.dialogs.prompt('Rename design', 'Title', d().title); if (name !== null) edit('Rename design', x => { x.title = name.trim().slice(0, 160) || 'Untitled'; }); } },
      { id: 'export-report', label: 'Compliance report', icon: 'table', hint: 'Download the compliance table as CSV', enabled: () => !!this.analysis, run: () => this.exportReport() },
      { id: 'export-candela', label: 'Candela table', icon: 'json', hint: 'Download the aimed beam\'s intensity on a 0.05° grid as CSV', enabled: () => !!this.analysis, run: () => this.exportCandela() },
      { id: 'export-png', label: 'Image of view', icon: 'image', run: () => this.exportImage() },
      { id: 'undo', label: 'Undo', icon: 'undo', shortcut: 'Ctrl+Z', enabled: () => this.store.canUndo, run: () => this.store.undo() },
      { id: 'redo', label: 'Redo', icon: 'redo', shortcut: 'Ctrl+Shift+Z', enabled: () => this.store.canRedo, run: () => this.store.redo() },
      optics('projector'), optics('reflector'),
      beamClass('C'), beamClass('V'), beamClass('B'), beamClass('A'),
      traffic('right'), traffic('left'),
      ...(/** @type {[StudyId, string, string][]} */ ([['compliance', 'Compliance', 'pass'], ['budget', 'Light budget', 'layers'], ['road', 'Road', 'road'], ['optimise', 'Optimise', 'optimise']]))
        .map(([id, label, icon]) => ({ id: `study-${id}`, label: `Show ${label.toLowerCase()}`, icon, pressed: () => this.study === id, run: () => this.showStudy(id) })),
      { id: 'trace', label: 'Trace now', icon: 'trace', shortcut: 'T', hint: 'Trace the design again', run: () => this.trace('full') },
      quality(4_000_000, 'Draft'), quality(20_000_000, 'Standard'), quality(50_000_000, 'Fine'),
      { id: 'new-seed', label: 'New random seed', icon: 'refresh', hint: 'Trace with different random rays to see the sampling noise', run: () => edit('Use a new random seed', x => { x.simulation.seed = (x.simulation.seed * 1103515245 + 12345) >>> 0; }) },
      viewCommand('beam', 'Beam', 'beam'), viewCommand('road', 'Road', 'road'), viewCommand('lamp', 'Lamp', 'lamp'),
      { id: 'fit', label: 'Fit to view', icon: 'fit', shortcut: 'F', run: () => this.fitView() },
      { id: 'zoom-in', label: 'Zoom in', icon: 'plus', shortcut: '+', run: () => { this.current.zoom(1.25); this.updateScale(); } },
      { id: 'zoom-out', label: 'Zoom out', icon: 'minus', shortcut: '−', run: () => { this.current.zoom(0.8); this.updateScale(); } },
      { id: 'toggle-contours', label: 'Iso-candela lines', icon: 'layers', hint: `Show lines at ${CONTOUR_LEVELS.map(l => fmt(l, 0)).join(', ')} cd`, pressed: () => this.beamView.showContours, run: () => { this.beamView.showContours = !this.beamView.showContours; this.beamView.request(); } },
      { id: 'toggle-rays', label: 'Rays', icon: 'rays', hint: 'Show traced rays in the lamp view', pressed: () => this.lampView.showRays, run: () => { this.lampView.showRays = !this.lampView.showRays; this.lampView.request(); } },
      { id: 'toggle-theme', label: 'Dark theme', icon: 'moon', pressed: () => document.documentElement.dataset.theme === 'dark', run: () => { const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; writePref('cutline-theme', next); this.applyTheme(next); this.ribbon.refresh(); this.renderDock(); } },
      { id: 'toggle-ribbon', label: 'Ribbon', icon: 'chevron', pressed: () => this.root.dataset.ribbon === 'open', run: () => this.setPanel('ribbon') },
      { id: 'toggle-studies', label: 'Studies panel', icon: 'panel-left', pressed: () => this.root.dataset.studies === 'open', run: () => this.setPanel('studies') },
      { id: 'toggle-inspector', label: 'Design panel', icon: 'panel-right', pressed: () => this.root.dataset.inspector === 'open', run: () => this.setPanel('inspector') },
      { id: 'palette', label: 'Find a command', icon: 'search', shortcut: 'Ctrl+K', palette: false, run: () => this.dialogs.palette(this.commands) },
      { id: 'help', label: 'Help and keyboard shortcuts', icon: 'help', shortcut: 'F1', run: () => { this.dialogs.help(SHORTCUTS); } },
    ]);
    // One delegated listener serves every [data-cmd] button, including ribbon buttons rebuilt on each tab switch.
    document.addEventListener('click', event => {
      const button = event.target instanceof Element ? event.target.closest('[data-cmd]') : null;
      if (!(button instanceof HTMLElement) || (button instanceof HTMLButtonElement && button.disabled)) return;
      this.commands.run(button.dataset.cmd ?? '').catch(error => this.toasts.show(error instanceof Error ? error.message : String(error), { kind: 'error' }));
    });
    byId('fileInput').addEventListener('change', e => {
      const input = /** @type {HTMLInputElement} */ (e.target);
      const file = input.files?.[0];
      input.value = '';
      if (file) this.openFile(file);
    });
  }

  /** @returns {RibbonTab[]} */
  ribbonLayout() {
    return [
      { id: 'file', label: 'File', groups: [
        { caption: 'New', items: [{ cmd: 'new-projector', size: 'small', label: 'Projector' }, { cmd: 'new-reflector', size: 'small', label: 'Reflector' }] },
        { caption: 'Design file', items: [{ cmd: 'open', label: 'Open' }, { cmd: 'save', label: 'Download' }] },
        { caption: 'Export', items: [{ cmd: 'export-report', label: 'Compliance' }, { cmd: 'export-candela', label: 'Candela table' }, { cmd: 'export-png', label: 'Image' }] },
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
      ] },
      { id: 'view', label: 'View', groups: [
        { caption: 'Show', items: [{ cmd: 'view-beam', label: 'Beam' }, { cmd: 'view-road', label: 'Road' }, { cmd: 'view-lamp', label: 'Lamp' }] },
        { caption: 'Camera', items: [{ cmd: 'fit', label: 'Fit' }, { cmd: 'zoom-in', size: 'small' }, { cmd: 'zoom-out', size: 'small' }] },
        { caption: 'Overlays', items: [{ cmd: 'toggle-contours', label: 'Iso-candela' }, { cmd: 'toggle-rays', label: 'Rays' }] },
        { caption: 'Panels', items: [{ cmd: 'toggle-studies', size: 'small', label: 'Studies' }, { cmd: 'toggle-inspector', size: 'small', label: 'Design' }, { cmd: 'toggle-theme', label: 'Dark theme' }] },
      ] },
    ];
  }

  installKeyboard() {
    window.addEventListener('keydown', e => {
      const target = /** @type {HTMLElement} */ (e.target);
      const typing = target.matches('input, textarea, select, [contenteditable="true"]');
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      if (byId('dialog').hasAttribute('open')) return;
      /** @param {string} id */
      const run = id => { e.preventDefault(); this.commands.run(id); };
      if (mod && key === 'k') return run('palette');
      if (mod && key === 's') return run('save');
      if (mod && key === 'o') return run('open');
      if (mod && key === 'z' && !typing) return run(e.shiftKey ? 'redo' : 'undo');
      if (mod && key === 'y' && !typing) return run('redo');
      if (e.key === 'F1') return run('help');
      if (typing || mod || e.altKey) return;
      if (key === 'f') return run('fit');
      if (key === 't') return run('trace');
      if (key === '1') return run('view-beam');
      if (key === '2') return run('view-road');
      if (key === '3') return run('view-lamp');
      if (key === '+' || key === '=') return run('zoom-in');
      if (key === '-') return run('zoom-out');
      if (key === '?') return run('help');
    });
  }

  installSplitter() {
    const splitter = byId('dockSplitter');
    const area = /** @type {HTMLElement} */ (splitter.parentElement);
    /** @param {number} height */
    const set = height => {
      const max = area.clientHeight - 44 - 140;
      const value = Math.round(Math.max(150, Math.min(max, height)));
      this.root.style.setProperty('--dock-height', `${value}px`);
      writePref('cutline-dock', String(value));
      this.resizeView();
    };
    splitter.addEventListener('pointerdown', down => {
      splitter.setPointerCapture(down.pointerId);
      const start = byId('dock').clientHeight;
      /** @param {PointerEvent} e */
      const move = e => set(start - (e.clientY - down.clientY));
      const up = () => { splitter.removeEventListener('pointermove', move); splitter.removeEventListener('pointerup', up); };
      splitter.addEventListener('pointermove', move);
      splitter.addEventListener('pointerup', up);
    });
    splitter.addEventListener('keydown', e => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); set(byId('dock').clientHeight + (e.key === 'ArrowUp' ? 24 : -24)); }
    });
  }

  installFileDrop() {
    window.addEventListener('dragover', e => { if (e.dataTransfer?.types.includes('Files')) e.preventDefault(); });
    window.addEventListener('drop', e => {
      const file = e.dataTransfer?.files[0];
      if (!file) return;
      e.preventDefault();
      this.openFile(file);
    });
  }
}

/** @type {[string, string][]} */
const SHORTCUTS = [
  ['Find a command', 'Ctrl+K'],
  ['Undo / redo', 'Ctrl+Z / Ctrl+Shift+Z'],
  ['Download the design', 'Ctrl+S'],
  ['Open a design file', 'Ctrl+O'],
  ['Trace again at full quality', 'T'],
  ['Beam, road or lamp view', '1, 2 or 3'],
  ['Fit the view', 'F or double-click'],
  ['Zoom', 'Scroll, or + and −'],
  ['Pan', 'Drag'],
  ['Change a value', 'Drag its label; Shift ×10, Alt ×0.1'],
  ['Step a value', '↑ / ↓ in the field'],
  ['Help', 'F1 or ?'],
];
