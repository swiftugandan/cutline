/** The photometry workspace: open a light distribution (an IES or EULUMDAT file, or the traced design), see it as an
 * isolux picture and on the road with a colour scale you control, find dark patches, and check it against every
 * market's regulation and your own targets. */

import { DocumentStore } from '../core/history.js';
import { STUDY_SPEC, defaultStudy, validateStudy, parseStudy, serializeStudy, setRole } from '../core/study.js';
import { ROLES, isHeadlampRole, packById, NOT_CHECKED } from '../core/regulation/catalog.js';
import { localRatio, findDips } from '../core/uniformity.js';
import { photometricTypeOf } from '../core/distribution/distribution.js';
import { gridSize } from '../core/tracer.js';
import { screenLux, SCREEN_DISTANCE } from '../core/photometry.js';
import { BeamView } from '../render/beam-view.js';
import { RoadView } from '../render/road-view.js';
import { Inspector } from '../ui/inspector.js';
import { scalePanel } from '../ui/scale-panel.js';
import { itemMarks, formatValue } from '../ui/compliance-view.js';
import { marketsView, marketForm, targetsView, uniformityView, roadView, fileView, marketName } from '../ui/photometry-views.js';
import { studyReport, studyCsv } from '../ui/report.js';
import { Persistence } from '../ui/persistence.js';
import { readPref, writePref } from '../ui/prefs.js';
import { renderStudyList } from './design.js';
import { byId, h, fmt, debounce, downloadBlob, fileName } from '../ui/dom.js';
import { hydrateIcons } from '../ui/icons.js';

/** @import { Study, Target } from '../core/study.js' */
/** @import { StudyAnalysis, MarketResult } from '../core/study-analysis.js' */
/** @import { ChangeDetail } from '../core/history.js' */
/** @import { RibbonTab, Command } from '../ui/shell.js' */
/** @import { InspectorConfig } from '../ui/inspector.js' */
/** @import { Role } from '../core/regulation/catalog.js' */
/** @import { Dip } from '../core/uniformity.js' */
/** @import { BeamDisplay, BeamLayer } from '../render/beam-view.js' */
/** @import { RoadDisplay } from '../render/road-view.js' */
/** @import { CutlineApp } from '../app.js' */
/** @import { Workspace, ViewEntry, Legend, Interaction } from './workspace.js' */
/** @import { ScalePatch } from '../ui/scale-panel.js' */

/** @typedef {'markets' | 'targets' | 'uniformity' | 'road' | 'file'} StudyId */

const headlamp = (/** @type {Study} */ s) => isHeadlampRole(s.lamp.role);
/** Whether a study reads its file as Type C, where the lamp's axis plane matters. @param {Study} s */
const readsAsTypeC = s => s.mapping.system === 'C' || (s.mapping.system === 'file' && photometricTypeOf(s.source.text, s.source.name) === 'C');

/** The design panel for a study. @type {InspectorConfig<Study>} */
const INSPECTOR = {
  spec: STUDY_SPEC,
  sections: [
    { id: 'lamp', title: 'Lamp', paths: ['lamp'], summary: s => ROLES[s.lamp.role].replace(/ \(.*\)$/, '') },
    { id: 'angles', title: 'Angles', paths: ['mapping'], summary: s => (s.mapping.system === 'file' ? 'As the file says' : `Type ${s.mapping.system}`) },
    { id: 'road', title: 'Road', paths: ['road'], summary: s => `${fmt(s.road.height, 2)} m, ${fmt(s.road.aimPercent, 1)}%`, visible: headlamp },
    { id: 'beam-picture', title: 'Beam picture', paths: ['display.beam'], summary: s => (s.display.beam.mode === 'uniformity' ? 'Uniformity' : s.display.beam.quantity === 'intensity' ? 'cd' : 'lx at 25 m') },
    { id: 'road-picture', title: 'Road picture', paths: ['display.road'], summary: s => (s.display.road.auto === 'yes' ? 'Fitted' : `${fmt(s.display.road.min, 1)}–${fmt(s.display.road.max, 0)} lx`), visible: headlamp },
  ],
  visible: {
    'lamp.traffic': headlamp,
    'lamp.otherTraffic': headlamp,
    'lamp.outward': s => !headlamp(s),
    'lamp.aim': headlamp,
    'lamp.shiftH': s => s.lamp.aim === 'measured',
    'lamp.shiftV': s => s.lamp.aim === 'measured',
    'lamp.aimMethod': s => s.lamp.role === 'passing' && s.lamp.aim === 'laboratory',
    'lamp.sourceFlux': s => s.lamp.role === 'passing',
    'mapping.axisC': s => readsAsTypeC(s),
    'mapping.cTurn': s => readsAsTypeC(s),
    'display.beam.min': s => s.display.beam.auto === 'no',
    'display.beam.max': s => s.display.beam.auto === 'no',
    'display.beam.featureDeg': s => s.display.beam.mode === 'uniformity',
    'display.beam.depth': s => s.display.beam.mode === 'uniformity',
    'display.road.min': s => s.display.road.auto === 'no',
    'display.road.max': s => s.display.road.auto === 'no',
  },
  setters: { 'lamp.role': (s, value) => setRole(s, /** @type {Role} */ (value)) },
};

/** @param {Study} s @returns {BeamDisplay} */
const beamDisplay = s => ({ ...s.display.beam, auto: s.display.beam.auto === 'yes' });
/** @param {Study} s @returns {RoadDisplay} */
const roadDisplay = s => ({ ...s.display.road, auto: s.display.road.auto === 'yes' });

/** Layers moved into an aimed frame. @param {BeamLayer[]} layers @param {{ dh: number, dv: number }} aim @returns {BeamLayer[]} */
function aimed(layers, aim) {
  return layers.map(l => ({ spec: { ...l.spec, hMin: l.spec.hMin + aim.dh, hMax: l.spec.hMax + aim.dh, vMin: l.spec.vMin + aim.dv, vMax: l.spec.vMax + aim.dv }, candela: l.candela }));
}

/** @implements {Workspace} */
export class PhotometryWorkspace {
  /** @param {CutlineApp} app */
  constructor(app) {
    this.app = app;
    this.id = /** @type {const} */ ('photometry');
    this.label = 'Photometry';
    this.icon = 'globe';
    this.fileTypes = '.ies,.IES,.ldt,.LDT,.json';
    this.persistence = new Persistence({ key: 'photometry', fallbackKey: 'cutline-photometry', parse: parseStudy, serialize: serializeStudy });
    /** @type {DocumentStore<Study>} */
    this.store = new DocumentStore(defaultStudy(), validateStudy);
    this.beamView = new BeamView(app.canvas);
    this.roadView = new RoadView(app.canvas);
    this.view = readPref('cutline-photometry-view') === 'ph-road' ? 'ph-road' : 'ph-beam';
    /** @type {StudyId} */
    this.study = 'markets';
    /** @type {StudyAnalysis | null} */
    this.analysis = null;
    /** @type {string | null} */
    this.error = null;
    this.running = false;
    /** The market whose aim and requirements the beam view shows. @type {string | null} */
    this.picked = null;
    /** The requirement picked in a table. @type {string | null} */
    this.selected = null;
    /** Adding a target by clicking the beam. */
    this.picking = false;
    /** @type {Dip[]} */
    this.dips = [];
    // On a phone the scale would cover most of the picture, so it starts folded there.
    const pref = readPref('cutline-scale');
    this.scaleCollapsed = pref ? pref === 'collapsed' : window.innerWidth <= 720;
    /** @type {'saved' | 'pending' | 'error'} */
    this.saveState = 'saved';
    /** What the analysis on screen was run on, and what the latest request was for. A change runs the analysis again
     * only when it differs from the latest request, so changes to the pictures alone do not, and an edit undone while
     * its analysis is in flight still gets the analysis of the document as it now is. */
    this.analysed = '';
    this.requested = '';
    this.inspector = new Inspector(byId('inspectorBody'), { store: this.store, config: INSPECTOR, onError: message => app.toasts.show(message, { kind: 'error' }) });
    this.inspector.config.sections[1].extra = s => [this.fileBlock(s)];
    this.autosave = debounce(() => this.save(), 600);
    this.reanalyse = debounce(() => this.analyse(), 120);
    /** @type {Interaction} */
    this.interaction = {
      down: (_e, x, y) => {
        if (!this.picking || this.view !== 'ph-beam' || !this.analysis) return false;
        const [hh, vv] = this.beamView.toAngles(x, y);
        this.addTargetAt(hh, vv);
        return true;
      },
    };
  }

  get doc() { return this.store.doc; }
  get isActive() { return this.app.active === this; }
  get hasFile() { return this.doc.source.text.length > 0; }

  async start() {
    try {
      const saved = await this.persistence.load();
      if (saved) this.store.replace(saved);
    } catch (error) {
      this.app.toasts.show(`The saved photometry study could not be opened (${error instanceof Error ? error.message : error}). Starting a new one.`, { kind: 'error', ms: 8000 });
    }
    this.store.addEventListener('change', event => this.onChange(/** @type {CustomEvent<ChangeDetail>} */ (event).detail));
  }

  activate() {
    for (const v of [this.beamView, this.roadView]) v.active = v === this.current;
    this.beamView.setDisplay(beamDisplay(this.doc));
    this.roadView.setDisplay(roadDisplay(this.doc));
    if (this.hasFile && !this.analysis && !this.running) this.analyse();
    this.renderOverlays();
  }

  deactivate() {
    for (const v of [this.beamView, this.roadView]) v.active = false;
    byId('scalePanel').hidden = true;
    byId('viewportEmpty').hidden = true;
    this.picking = false;
  }

  title() { return this.doc.title; }
  /** @param {string} title */
  rename(title) { this.edit('Rename study', d => { d.title = title; }); }

  /** @param {string} label @param {(study: Study) => void} mutate */
  edit(label, mutate) {
    try { this.store.transact(label, mutate); } catch (e) { this.app.toasts.show(e instanceof Error ? e.message : String(e), { kind: 'error' }); }
  }

  /** The analysis depends on everything but the pictures' settings and the notes. */
  fingerprint() {
    const s = this.doc;
    return JSON.stringify({ ...s, source: { name: s.source.name, length: s.source.text.length, head: s.source.text.slice(0, 400), tail: s.source.text.slice(-400) }, display: null, title: null, notes: null });
  }

  /** @param {ChangeDetail} detail */
  onChange(detail) {
    if (detail.kind === 'preview') { this.inspector.refreshValues(); this.applyDisplay(); this.maybeAnalyse(); return; }
    if (detail.kind === 'rollback') { this.inspector.refreshValues(true); return; }
    this.applyDisplay();
    this.maybeAnalyse();
    if (this.isActive) {
      this.renderPanels();
      this.app.renderChrome();
      if (detail.kind === 'load') { this.app.unfit('photometry', 'ph-beam'); this.app.unfit('photometry', 'ph-road'); this.app.resizeView(); }
      this.app.setStatus(detail.kind === 'undo' ? `Undid ${detail.label.toLowerCase()}` : detail.kind === 'redo' ? `Redid ${detail.label.toLowerCase()}` : detail.kind === 'load' ? 'Study opened' : detail.label);
    }
    this.saveState = 'pending';
    if (this.isActive) this.app.renderSaveState();
    this.autosave();
  }

  maybeAnalyse() {
    if (!this.hasFile) { this.analysis = null; this.analysed = ''; this.requested = ''; this.showAnalysis(); this.renderPanels(); return; }
    if (this.fingerprint() !== this.requested) this.reanalyse();
  }

  async analyse() {
    if (!this.hasFile) return;
    const study = structuredClone(this.doc);
    const fingerprint = this.fingerprint();
    this.requested = fingerprint;
    this.running = true;
    this.renderStatus();
    try {
      const started = performance.now();
      const analysis = await this.app.analyser.study('photometry', study);
      if (!analysis) return;
      this.analysis = analysis;
      this.analysed = fingerprint;
      this.error = null;
      if (!analysis.markets.some(m => m.key === this.picked)) this.picked = analysis.markets[0]?.key ?? null;
      this.app.setStatus(`Checked ${analysis.markets.length} ${analysis.markets.length === 1 ? 'market' : 'markets'} in ${fmt((performance.now() - started) / 1000, 2)} s`);
    } catch (error) {
      this.analysis = null;
      this.analysed = '';
      this.requested = '';
      this.error = error instanceof Error ? error.message : String(error);
    }
    this.running = false;
    this.showAnalysis();
    this.renderPanels();
    if (this.isActive) this.app.renderChrome();
  }

  /** The market the beam view shows. */
  get market() { return this.analysis?.markets.find(m => m.key === this.picked) ?? this.analysis?.markets[0] ?? null; }

  /** Hands the analysis to the views: the picked market's beam, in its aim, with its requirements marked. */
  showAnalysis() {
    const a = this.analysis;
    if (!a) {
      this.beamView.setBeam([]);
      Object.assign(this.beamView, { markers: [], zones: [], lines: [], dips: [] });
      this.dips = [];
      this.renderOverlays();
      return;
    }
    const targetsShown = this.study === 'targets';
    const market = targetsShown ? null : this.market;
    const key = market?.beam ?? a.reference.beam;
    const aim = market?.aim ?? a.reference.aim;
    const layers = a.layers[key] ?? a.layers.file ?? [];
    this.beamView.frame = headlamp(this.doc) ? { h: 0, v: -3, width: 92, height: 24 } : { h: 0, v: 0, width: 190, height: 70 };
    this.beamView.setBeam(aimed(layers, aim));
    const items = targetsShown ? a.targets : this.study === 'uniformity' ? [] : (market?.items ?? []);
    Object.assign(this.beamView, itemMarks(items));
    this.beamView.selected = this.selected;
    if (a.road) this.roadView.setRoad(a.road, this.doc.lamp.traffic);
    this.findDips();
    this.renderOverlays();
  }

  /** Applies the pictures' settings without analysing again. */
  applyDisplay() {
    this.beamView.setDisplay(beamDisplay(this.doc));
    this.roadView.setDisplay(roadDisplay(this.doc));
    this.findDips();
    this.renderOverlays();
  }

  /** Dark patches in the beam as shown, in the fine grid and in the wide grid outside it. */
  findDips() {
    const v = this.beamView, d = this.doc.display.beam;
    if (!v.layers.length) { this.dips = []; v.dips = []; return; }
    const range = v.range;
    const floor = range.scale === 'log' ? range.min : Math.max(range.min, v.max * 0.01);
    /** @type {Dip[]} */
    let dips = [];
    v.layers.forEach((layer, k) => {
      const s = layer.spec, { nh, nv } = gridSize(s);
      const ratio = v.ratios[k] ?? localRatio(v.values[k], nh, nv, Math.max(1, Math.round(d.featureDeg / s.step)), Math.max(1, Math.round(d.featureDeg / s.vStep)), floor);
      const finer = v.layers.find((l, j) => j !== k && l.spec.step < s.step);
      const found = findDips(ratio, v.values[k], s, { depth: d.depth, minCells: Math.max(4, Math.round((0.05 * d.featureDeg * d.featureDeg) / (s.step * s.vStep))) });
      dips.push(...found.filter(x => !finer || x.h < finer.spec.hMin || x.h > finer.spec.hMax || x.v < finer.spec.vMin || x.v > finer.spec.vMax));
    });
    dips.sort((a, b) => a.ratio - b.ratio);
    dips = dips.slice(0, 30);
    this.dips = dips;
    v.dips = dips;
    v.request();
  }

  // ---------- Rendering ----------

  renderPanels() {
    if (!this.isActive) return;
    this.inspector.render();
    this.renderStudies();
    this.renderDock();
    this.renderStatus();
    this.renderOverlays();
  }

  renderStatus() {
    if (!this.isActive) return;
    const el = byId('traceState');
    const a = this.analysis;
    if (this.error) { el.dataset.state = 'error'; el.textContent = 'Cannot read this file'; }
    else if (this.running) { el.dataset.state = 'running'; el.textContent = 'Checking…'; }
    else { el.dataset.state = ''; el.textContent = a ? `${a.markets.filter(m => m.pass).length} of ${a.markets.length} markets met` : ''; }
    byId('statusRays').textContent = a ? `${a.file.format}, Type ${a.file.type}, ${fmt(a.file.values, 0)} values` : '';
  }

  renderStudies() {
    if (!this.isActive) return;
    const a = this.analysis, s = this.doc;
    const state = this.error ? ['error', 'Needs attention'] : this.running ? ['running', 'Checking'] : a ? ['done', 'Up to date'] : ['idle', 'No file'];
    const met = a ? a.markets.filter(m => m.pass).length : 0;
    const targetsMet = a ? a.targets.filter(i => i.status === 'pass' || i.status === 'near').length : 0;
    /** @type {[string, string, string[], (string | Node)[], string][]} */
    const items = [
      ['markets', 'Markets', state, a ? [`${met}/${a.markets.length}`, h('small', { text: a.markets.length === 1 ? 'market met' : 'markets met' })] : ['–'], a ? (a.markets.find(m => !m.pass) ? `Fails ${marketName(/** @type {MarketResult} */ (a.markets.find(m => !m.pass)), headlamp(s))}` : 'Meets every market') : 'Regulations to check against'],
      ['targets', 'Your targets', state, a && s.targets.length ? [`${targetsMet}/${s.targets.length}`, h('small', { text: 'met' })] : ['–'], s.targets.length ? `${s.targets.length} ${s.targets.length === 1 ? 'target' : 'targets'}` : 'Your own values at chosen points'],
      ['uniformity', 'Uniformity', state, a ? [String(this.dips.length), h('small', { text: this.dips.length === 1 ? 'dark patch' : 'dark patches' })] : ['–'], a && this.dips.length ? `Deepest ${Math.round((1 - this.dips[0].ratio) * 100)}% below its surroundings` : 'Dark patches and stripes'],
      ...(headlamp(s) ? [/** @type {[string, string, string[], (string | Node)[], string]} */ (['road', 'Road', state, a?.road ? [`${fmt(a.road.reach[s.road.surface === 'road' ? 1 : 3] ?? 0, 0)} m`, h('small', { text: `to ${s.road.surface === 'road' ? 1 : 3} lx` })] : ['–'], 'Isolux on the road'])] : []),
      ['file', 'File', this.error ? ['error', 'Cannot read'] : a ? ['done', a.file.format.replace(/ LM-63-/, ' ')] : ['idle', 'None'], a ? [fmt(a.file.peak, 0), h('small', { text: 'cd peak' })] : ['–'], s.source.name || 'Open an IES or EULUMDAT file'],
    ];
    if (!headlamp(s) && this.study === 'road') this.study = 'markets';
    renderStudyList(items, this.study, id => this.showStudy(/** @type {StudyId} */ (id)), ['Measured in your browser', 'The file is read on this computer. Nothing is uploaded.']);
  }

  renderDock() {
    if (!this.isActive) return;
    const dock = byId('dock');
    const scroll = dock.scrollTop;
    const s = this.doc, a = this.analysis;
    /** @type {HTMLElement} */
    let view;
    const onSelect = (/** @type {string | null} */ id) => this.select(id);
    if (this.study === 'targets') {
      view = targetsView({
        study: s, items: a?.targets ?? [], picking: this.picking, selected: this.selected, onSelect, frame: a ? (a.reference.aim.method === 'as measured' ? 'as measured' : `aimed as ${a.reference.label}`) : '–',
        onEdit: (i, patch) => this.edit('Change a target', d => { Object.assign(d.targets[i], patch); }),
        onAdd: () => this.addTargetAt(0, 0),
        onRemove: i => this.edit('Remove a target', d => { d.targets.splice(i, 1); }),
        onPickMode: () => this.togglePicking(),
      });
    } else if (this.study === 'uniformity') {
      view = uniformityView({ dips: this.dips, mode: s.display.beam.mode, featureDeg: s.display.beam.featureDeg, depth: s.display.beam.depth, unit: s.display.beam.quantity === 'intensity' ? 'cd' : 'lx', selected: this.selected, onSelect, onMode: () => this.app.commands.run(s.display.beam.mode === 'uniformity' ? 'ph-mode-light' : 'ph-mode-uniformity') });
    } else if (this.study === 'road') {
      view = roadView({ study: s, analysis: a, running: this.running });
    } else if (this.study === 'file') {
      view = fileView({ study: s, analysis: a, error: this.error });
    } else {
      view = marketsView({
        study: s, analysis: a, error: this.error, running: this.running, selected: this.selected, picked: this.market?.key ?? null,
        onPick: key => { this.picked = key; this.selected = null; this.showAnalysis(); this.renderDock(); this.app.renderChrome(); },
        onSelect, onRemove: i => this.edit('Remove a market', d => { d.markets.splice(i, 1); }), onAdd: () => this.addMarket(),
        onCondition: (pack, id, on, set) => this.edit(on ? 'Declare a condition' : 'Withdraw a condition', d => {
          const key = `${pack}:${id}`;
          const others = set ? (packById(pack)?.conditions ?? []).filter(c => c.set === set && c.id !== id).map(c => `${pack}:${c.id}`) : [];
          d.conditions = d.conditions.filter(c => c !== key && !(on && others.includes(c)));
          if (on) d.conditions.push(key);
        }),
        onReport: () => this.exportReport(),
      });
    }
    dock.replaceChildren(view);
    hydrateIcons(dock);
    dock.scrollTop = scroll;
  }

  /** The colour scale beside the picture, and the empty state when there is no file. */
  renderOverlays() {
    if (!this.isActive) return;
    const panel = byId('scalePanel'), empty = byId('viewportEmpty');
    empty.hidden = this.hasFile;
    if (!this.hasFile) {
      const open = h('button', { class: 'primary-button', type: 'button', 'data-cmd': 'open' }, [h('span', { 'data-icon': 'open' }), h('span', { text: 'Open a light distribution' })]);
      const design = h('button', { class: 'outline-button', type: 'button', 'data-cmd': 'ph-use-design' }, [h('span', { 'data-icon': 'projector' }), h('span', { text: 'Use the traced design' })]);
      empty.replaceChildren(h('div', { class: 'empty-card' }, [
        h('span', { class: 'empty-icon', 'data-icon': 'file' }),
        h('h3', { text: 'Check a lamp against every market' }),
        h('p', { text: 'Open an IES (LM-63) or EULUMDAT file of a headlamp or a signal lamp, or drop it on the window. Cutline shows it as isolux and road pictures, finds dark patches, and checks it against UN R149, R123 and R148, FMVSS and CMVSS 108, Taiwan\'s VSTD and your own targets.' }),
        h('div', { class: 'empty-actions' }, [open, design]),
      ]));
      hydrateIcons(empty);
      panel.hidden = true;
      return;
    }
    panel.hidden = !this.analysis;
    this.beamView.reserveRight = this.analysis && !this.scaleCollapsed ? 212 : 0;
    if (!this.analysis) return;
    const s = this.doc;
    const onCollapse = (/** @type {boolean} */ c) => { this.scaleCollapsed = c; writePref('cutline-scale', c ? 'collapsed' : 'open'); this.renderOverlays(); };
    if (this.view === 'ph-road') {
      const r = this.roadView;
      panel.replaceChildren(scalePanel({ title: s.road.surface === 'road' ? 'On the road' : 'On a target', unit: 'lx', range: r.range, auto: s.display.road.auto === 'yes', palette: s.display.road.palette, contours: s.display.road.contours, collapsed: this.scaleCollapsed, onCollapse, onChange: (patch, label) => this.patchScale('road', patch, label) }));
    } else {
      const b = this.beamView, d = s.display.beam;
      panel.replaceChildren(scalePanel({ title: d.quantity === 'intensity' ? 'Intensity' : 'At 25 m', unit: d.quantity === 'intensity' ? 'cd' : 'lx', range: b.range, auto: d.auto === 'yes', palette: d.palette, contours: d.contours, uniformity: d.mode === 'uniformity', collapsed: this.scaleCollapsed, onCollapse, onChange: (patch, label) => this.patchScale('beam', patch, label) }));
    }
    hydrateIcons(panel);
  }

  /** @param {'beam' | 'road'} which @param {ScalePatch} patch @param {string} label */
  patchScale(which, patch, label) {
    this.edit(label, d => {
      const target = d.display[which];
      // Fixing the range starts from what is on screen, so the other end stays where it was.
      if (patch.auto === 'no' && target.auto === 'yes') {
        const range = which === 'beam' ? this.beamView.range : this.roadView.range;
        target.min = range.min; target.max = range.max;
      }
      Object.assign(target, patch);
      if (target.scale === 'log' && target.min <= 0) target.min = target.max / 1000;
    });
  }

  breadcrumb() {
    const s = this.doc, m = this.market;
    return [
      h('strong', { text: s.source.name || 'No file' }), h('span', { class: 'sep', text: '/' }), ROLES[s.lamp.role],
      ...(m && this.study !== 'targets' ? [h('span', { class: 'sep', text: '/' }), `${marketName(m, headlamp(s))}, ${m.fn.name}`] : []),
    ];
  }

  /** @returns {Legend} */
  legend() {
    const s = this.doc;
    if (this.view === 'ph-road') return { entries: [['Isolux lines', 'rgba(242, 194, 48, .9)']], hint: s.road.surface === 'road' ? 'Horizontal illuminance on the road surface.' : 'Light on a target facing the car.' };
    /** @type {[string, string, boolean?][]} */
    const entries = s.display.beam.mode === 'uniformity' ? [['Dark patches', 'rgba(150, 190, 255, .9)', true]] : [[s.display.beam.quantity === 'intensity' ? 'Iso-candela lines' : 'Isolux lines at 25 m', 'rgba(242, 194, 48, .55)']];
    if (this.beamView.hasNoData) entries.push(['Outside the file', 'rgb(44, 47, 56)']);
    if (this.study !== 'uniformity') entries.push(['Pass', '#51cf66'], ['Near', '#f2c230'], ['Fail', '#ff6b6b']);
    const m = this.market;
    return { entries, hint: this.picking ? 'Click the beam to add a target there.' : m && this.study !== 'targets' ? `${m.aim.method === 'as measured' ? 'As measured' : `Aimed by ${m.aim.method}`}. Scroll to zoom, drag to pan.` : 'Scroll to zoom, drag to pan.' };
  }

  // ---------- Views ----------

  get current() { return this.view === 'ph-road' ? this.roadView : this.beamView; }

  /** @returns {ViewEntry[]} */
  views() {
    return [
      { id: 'ph-beam', label: 'Beam', icon: 'beam', hint: 'Intensity or isolux at 25 m, with the test points of the market shown' },
      { id: 'ph-road', label: 'Road', icon: 'road', hint: 'Isolux on the road' },
    ];
  }

  /** @param {string} view */
  setView(view) {
    this.view = view === 'ph-road' ? 'ph-road' : 'ph-beam';
    writePref('cutline-photometry-view', this.view);
    for (const v of [this.beamView, this.roadView]) v.active = v === this.current && this.isActive;
    this.app.canvas.setAttribute('aria-label', this.view === 'ph-road' ? 'Isolux on the road' : 'Light distribution');
    this.current.request();
    this.renderOverlays();
  }

  /** The road is marked in metres along its length, so neither picture needs a scale bar. */
  scaleUnit() { return null; }

  /** @param {number} x @param {number} y */
  readout(x, y) {
    if (!this.analysis) return null;
    if (this.view === 'ph-road') {
      const [rx, rz] = this.roadView.toRoad(x, y);
      const lux = this.roadView.luxAt(rx, rz);
      return Number.isFinite(lux) && rz >= 1 ? `<b>${fmt(lux, lux < 10 ? 2 : 0)} lx</b><br>${fmt(rz, 0)} m ahead, ${fmt(Math.abs(rx), 1)} m ${rx >= 0 ? 'right' : 'left'}` : null;
    }
    const [hh, vv] = this.beamView.toAngles(x, y);
    const pos = `${fmt(Math.abs(hh), 2)}°${hh >= 0 ? 'R' : 'L'}, ${fmt(Math.abs(vv), 2)}°${vv >= 0 ? 'U' : 'D'}`;
    const marker = this.beamView.markerAt(x, y);
    const items = this.study === 'targets' ? this.analysis.targets : this.market?.items ?? [];
    const item = marker ? items.find(i => i.id === marker.id) : null;
    if (item) return `<b>${item.label}</b><br>${formatValue(item)}, needs ${item.requirement}<br>${pos}`;
    const cd = this.beamView.candelaAt(hh, vv);
    if (!Number.isFinite(cd)) return `Outside the file<br>${pos}`;
    const { ratio } = this.beamView.valueAt(hh, vv);
    const lux = screenLux(cd, hh, vv);
    return `<b>${fmt(cd, cd < 10 ? 2 : 0)} cd</b> · ${fmt(lux, lux < 1 ? 3 : 1)} lx at ${SCREEN_DISTANCE} m${Number.isFinite(ratio) ? `<br>${ratio >= 1 ? '+' : '−'}${Math.abs(Math.round((ratio - 1) * 100))}% against its surroundings` : ''}<br>${pos}`;
  }

  // ---------- Actions ----------

  /** @param {StudyId} study */
  showStudy(study) {
    this.study = study;
    if (study === 'road' && this.view !== 'ph-road') this.app.setView('ph-road');
    if ((study === 'markets' || study === 'targets' || study === 'uniformity') && this.view === 'ph-road') this.app.setView('ph-beam');
    if (study !== 'targets') this.picking = false;
    this.selected = null;
    this.showAnalysis();
    this.renderStudies();
    this.renderDock();
    this.app.renderChrome();
  }

  /** @param {string | null} id */
  select(id) {
    if (this.selected === id) return;
    this.selected = id;
    this.beamView.selected = id;
    this.beamView.request();
    for (const row of document.querySelectorAll('#dock .req-row')) row.setAttribute('aria-selected', String(/** @type {HTMLElement} */ (row).dataset.id === id || /** @type {HTMLElement} */ (row).dataset.key === this.market?.key));
  }

  async addMarket() {
    const form = marketForm(this.doc);
    const choice = await this.app.dialogs.open({ title: 'Add a market', body: [h('p', { text: `The regulations that cover a ${ROLES[this.doc.lamp.role].toLowerCase()}.` }), form.body, ...(NOT_CHECKED.length ? [h('p', { class: 'dialog-note', text: `Not available: ${NOT_CHECKED.filter(n => n.scope === (headlamp(this.doc) ? 'headlamp' : 'signal')).map(n => `${n.jurisdiction} ${n.document}`).join(', ')}. The File study and the report say why.` })] : [])], actions: [{ label: 'Cancel', value: '' }, { label: 'Add', value: 'add', primary: true }] });
    const m = form.value();
    if (choice !== 'add' || !m) return;
    if (this.doc.markets.some(x => x.pack === m.pack && x.fn === m.fn && x.traffic === m.traffic)) { this.app.toasts.show('That market is already in the list.'); return; }
    this.edit('Add a market', d => { d.markets.push(m); });
  }

  /** Adds a point target at a direction, starting from the value there. @param {number} hh @param {number} vv */
  addTargetAt(hh, vv) {
    const s = this.doc;
    const lux = s.display.beam.quantity === 'illuminance';
    const cd = this.beamView.candelaAt(hh, vv);
    const value = Number.isFinite(cd) ? (lux ? screenLux(cd, hh, vv) : cd) : 0;
    const round = (/** @type {number} */ x) => (x >= 100 ? Math.round(x / 10) * 10 : +x.toPrecision(2));
    /** @type {Target} */
    const t = { name: `Point ${s.targets.length + 1}`, shape: 'point', h0: +hh.toFixed(2), v0: +vv.toFixed(2), h1: +hh.toFixed(2), v1: +vv.toFixed(2), limit: 'min', min: round(value * 0.9), max: round(Math.max(value * 1.1, 1)), unit: lux ? 'lx' : 'cd' };
    this.edit('Add a target', d => { d.targets.push(t); });
    if (this.study !== 'targets') this.showStudy('targets');
  }

  togglePicking() {
    this.picking = !this.picking;
    if (this.picking && this.view !== 'ph-beam') this.app.setView('ph-beam');
    this.app.viewport.dataset.cursor = this.picking ? 'handle' : 'grab';
    this.renderDock();
    this.app.renderLegend();
  }

  /** The file block in the design panel: its name and how to replace it. @param {Study} s */
  fileBlock(s) {
    const open = h('button', { class: 'outline-button', type: 'button', 'data-cmd': 'open' }, [h('span', { 'data-icon': 'open' }), h('span', { text: s.source.name ? 'Replace the file' : 'Open a file' })]);
    return h('div', { class: 'file-block' }, [h('span', { class: 'file-name', text: s.source.name || 'No file open', 'data-tip': s.source.name }), open]);
  }

  // ---------- Files ----------

  async save() {
    try {
      await this.persistence.save(this.doc);
      this.saveState = 'saved';
    } catch {
      this.saveState = 'error';
      this.app.toasts.show('This browser could not store the study. Download a copy to keep your work.', { kind: 'error', action: { label: 'Download', run: () => this.download() }, ms: 9000 });
    }
    if (this.isActive) this.app.renderSaveState();
  }

  download() {
    downloadBlob(fileName(this.doc.title, '.photometry.json'), new Blob([serializeStudy(this.doc)], { type: 'application/json' }));
    this.app.setStatus('Study downloaded');
  }

  /** @param {File} file */
  accepts(file) { return /\.(ies|ldt)$/i.test(file.name) || /\.photometry\.json$/i.test(file.name); }

  /** @param {File} file */
  async openFile(file) {
    try {
      if (/\.json$/i.test(file.name)) {
        const study = parseStudy(await file.text());
        if (!(await this.app.confirmReplace(this))) return;
        this.store.replace(study);
        this.app.toasts.show(`Opened “${study.title}”`);
        return;
      }
      if (file.size > 48 * 1024 * 1024) throw new Error('It is larger than 48 MB.');
      await this.loadDistribution(await file.text(), file.name);
    } catch (error) {
      this.app.toasts.show(`${file.name} could not be opened. ${error instanceof Error ? error.message : error}`, { kind: 'error', ms: 8000 });
    }
  }

  /**
   * Puts a light distribution into the study, keeping its markets, targets and pictures, so revisions of a lamp are
   * checked the same way. Undo brings the previous file back.
   * @param {string} text @param {string} name @param {{ role?: Role, traffic?: 'right' | 'left' }} [hints]
   */
  async loadDistribution(text, name, hints = {}) {
    if (this.app.active !== this) this.app.switchTo('photometry');
    this.edit(`Open ${name}`, d => {
      d.source = { name, text };
      if (/^Untitled/.test(d.title)) d.title = name.replace(/\.(ies|ldt)$/i, '');
      if (hints.role && hints.role !== d.lamp.role) setRole(d, hints.role);
      if (hints.traffic) d.lamp.traffic = hints.traffic;
    });
    this.app.unfit('photometry', 'ph-beam');
    this.app.unfit('photometry', 'ph-road');
    this.app.resizeView();
  }

  async useDesign() {
    const design = this.app.design;
    if (!design.analysis || design.running) {
      this.app.toasts.show('The design is still being traced. Try again when the trace has finished.');
      if (!design.started) { this.app.switchTo('design'); }
      return;
    }
    await design.analysePhotometry();
  }

  /** The beam picture and the road picture as images for the report, at the current scales. */
  reportImages() {
    /** @param {BeamView | RoadView} view @param {number} w @param {number} ht */
    const render = (view, w, ht) => {
      const canvas = document.createElement('canvas');
      canvas.width = w * 2; canvas.height = ht * 2;
      const ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
      const saved = { canvas: view.canvas, ctx: view.ctx, width: view.width, height: view.height, camera: { ...view.camera }, active: view.active, dpr: view.dpr };
      Object.assign(view, { canvas, ctx, width: w, height: ht, active: false, dpr: 2 });
      try { view.fit(); view.draw(); } finally { Object.assign(view, saved); }
      return canvas.toDataURL('image/png');
    };
    return { beam: render(this.beamView, 960, 400), road: this.analysis?.road ? render(this.roadView, 960, 360) : null };
  }

  exportReport() {
    const a = this.analysis;
    if (!a) return;
    const html = studyReport(this.doc, a, { images: this.reportImages(), dips: this.dips, notChecked: NOT_CHECKED, generated: new Date() });
    downloadBlob(fileName(this.doc.title, ' report.html'), new Blob([html], { type: 'text/html' }));
    this.app.setStatus('Report downloaded. Open it in a browser and print to PDF to share it.');
  }

  exportCsv() {
    const a = this.analysis;
    if (!a) return;
    downloadBlob(fileName(this.doc.title, ' results.csv'), new Blob([studyCsv(this.doc, a)], { type: 'text/csv' }));
  }

  // ---------- Commands ----------

  /** @returns {Command[]} */
  commandList() {
    const d = () => this.doc;
    const has = () => !!this.analysis;
    /** @param {StudyId} id @param {string} label @param {string} icon */
    const study = (id, label, icon) => ({ id: `ph-study-${id}`, label: `Show ${label.toLowerCase()}`, icon, pressed: () => this.study === id, enabled: () => id !== 'road' || headlamp(d()), run: () => this.showStudy(id) });
    /** @param {string} id @param {string} label @param {string} icon @param {() => boolean} pressed @param {(s: Study) => void} mutate @param {string} [hint] */
    const set = (id, label, icon, pressed, mutate, hint) => ({ id, label, icon, hint, pressed, run: () => { if (!pressed()) this.edit(label, mutate); } });
    return [
      { id: 'ph-new', label: 'New study', icon: 'new', run: async () => { if (await this.app.confirmReplace(this)) this.store.replace(defaultStudy()); } },
      { id: 'ph-use-design', label: 'Use the traced design', icon: 'projector', hint: 'Check the beam traced in the lamp design workspace', run: () => this.useDesign() },
      { id: 'ph-report', label: 'Market report', icon: 'table', hint: 'Download a report of every market, your targets and the pictures, ready to print to PDF', enabled: has, run: () => this.exportReport() },
      { id: 'ph-csv', label: 'Results table', icon: 'json', hint: 'Download every requirement of every market as CSV', enabled: has, run: () => this.exportCsv() },
      study('markets', 'Markets', 'globe'), study('targets', 'Your targets', 'target'), study('uniformity', 'Uniformity', 'contrast'), study('road', 'Road', 'road'), study('file', 'File', 'file'),
      { id: 'ph-add-market', label: 'Add a market', icon: 'plus', run: () => this.addMarket() },
      { id: 'ph-add-target', label: 'Add a target', icon: 'target', enabled: has, run: () => this.addTargetAt(0, 0) },
      { id: 'ph-pick-target', label: 'Pick a target on the beam', icon: 'pin', hint: 'Click the beam to add a target there', enabled: has, pressed: () => this.picking, run: () => { if (this.study !== 'targets') this.showStudy('targets'); this.togglePicking(); } },
      set('ph-aim-laboratory', 'As the laboratory aims it', 'fit', () => d().lamp.aim === 'laboratory', s => { s.lamp.aim = 'laboratory'; }, 'Each market aims the beam by its own method'),
      set('ph-aim-measured', 'As measured', 'pin', () => d().lamp.aim === 'measured', s => { s.lamp.aim = 'measured'; }, 'Take the file\'s own axis'),
      set('ph-traffic-right', 'Made for right-hand traffic', 'road', () => d().lamp.traffic === 'right', s => { s.lamp.traffic = 'right'; }),
      set('ph-traffic-left', 'Made for left-hand traffic', 'road', () => d().lamp.traffic === 'left', s => { s.lamp.traffic = 'left'; }),
      set('ph-quantity-cd', 'Intensity', 'beam', () => d().display.beam.quantity === 'intensity', s => { s.display.beam.quantity = 'intensity'; s.display.beam.auto = 'yes'; s.display.beam.contours = headlamp(s) ? [100, 500, 1000, 5000, 10000, 20000, 40000, 80000] : [0.3, 1, 5, 20, 50, 100, 200, 500]; }, 'Show candela'),
      set('ph-quantity-lx', 'Illuminance at 25 m', 'sun', () => d().display.beam.quantity === 'illuminance', s => { s.display.beam.quantity = 'illuminance'; s.display.beam.auto = 'yes'; s.display.beam.contours = headlamp(s) ? [0.5, 1, 3, 5, 10, 20, 50, 100] : [0.01, 0.05, 0.1, 0.5, 1]; }, 'Show lux on a flat screen 25 m ahead'),
      set('ph-scale-log', 'Log scale', 'layers', () => d().display[this.view === 'ph-road' ? 'road' : 'beam'].scale === 'log', s => { const t = s.display[this.view === 'ph-road' ? 'road' : 'beam']; t.scale = 'log'; t.auto = 'yes'; }),
      set('ph-scale-linear', 'Linear scale', 'layers', () => d().display[this.view === 'ph-road' ? 'road' : 'beam'].scale === 'linear', s => { const t = s.display[this.view === 'ph-road' ? 'road' : 'beam']; t.scale = 'linear'; t.auto = 'yes'; }),
      set('ph-scale-fit', 'Fit the scale', 'fit', () => d().display[this.view === 'ph-road' ? 'road' : 'beam'].auto === 'yes', s => { s.display[this.view === 'ph-road' ? 'road' : 'beam'].auto = 'yes'; }, 'Fit the colour range to the picture'),
      set('ph-mode-light', 'Colour by light', 'beam', () => d().display.beam.mode === 'light', s => { s.display.beam.mode = 'light'; }),
      set('ph-mode-uniformity', 'Colour by uniformity', 'contrast', () => d().display.beam.mode === 'uniformity', s => { s.display.beam.mode = 'uniformity'; }, 'Each direction against the average around it: dark patches show blue'),
      ...(/** @type {['night' | 'heat' | 'spectrum' | 'grey', string][]} */ ([['night', 'Night'], ['heat', 'Heat'], ['spectrum', 'False colour'], ['grey', 'Grey']])).map(([id, label]) => set(`ph-palette-${id}`, `${label} palette`, 'image', () => d().display[this.view === 'ph-road' ? 'road' : 'beam'].palette === id, s => { s.display[this.view === 'ph-road' ? 'road' : 'beam'].palette = id; })),
      { id: 'ph-contours', label: 'Contour lines', icon: 'layers', pressed: () => this.beamView.showContours, run: () => { this.beamView.showContours = !this.beamView.showContours; this.beamView.request(); } },
    ];
  }

  /** @returns {RibbonTab[]} */
  tabs() {
    return [
      { id: 'file', label: 'File', groups: [
        { caption: 'Light distribution', items: [{ cmd: 'open', label: 'Open' }, { cmd: 'ph-use-design', label: 'Traced design' }] },
        { caption: 'Study', items: [{ cmd: 'ph-new', size: 'small', label: 'New' }, { cmd: 'save', size: 'small', label: 'Download' }, { cmd: 'rename', size: 'small', label: 'Rename' }] },
        { caption: 'Export', items: [{ cmd: 'ph-report', label: 'Report', className: 'sun' }, { cmd: 'ph-csv', label: 'Results table' }, { cmd: 'export-png', label: 'Image' }] },
      ] },
      { id: 'check', label: 'Check', groups: [
        { caption: 'Studies', items: [{ cmd: 'ph-study-markets', label: 'Markets' }, { cmd: 'ph-study-targets', label: 'Targets' }, { cmd: 'ph-study-uniformity', label: 'Uniformity' }, { cmd: 'ph-study-road', label: 'Road' }, { cmd: 'ph-study-file', label: 'File' }] },
        { caption: 'Markets', items: [{ cmd: 'ph-add-market', label: 'Add market' }] },
        { caption: 'Targets', items: [{ cmd: 'ph-add-target', size: 'small', label: 'Add target' }, { cmd: 'ph-pick-target', size: 'small', label: 'Pick on beam' }] },
        { caption: 'Aim', items: [{ cmd: 'ph-aim-laboratory', size: 'small', label: 'Laboratory' }, { cmd: 'ph-aim-measured', size: 'small', label: 'As measured' }] },
        { caption: 'Made for', items: [{ cmd: 'ph-traffic-right', size: 'small', label: 'Right-hand' }, { cmd: 'ph-traffic-left', size: 'small', label: 'Left-hand' }] },
        { caption: 'Edit', items: [{ cmd: 'undo', size: 'small' }, { cmd: 'redo', size: 'small' }] },
      ] },
      { id: 'picture', label: 'Picture', groups: [
        { caption: 'Show', items: [{ cmd: 'view-ph-beam', label: 'Beam' }, { cmd: 'view-ph-road', label: 'Road' }] },
        { caption: 'Quantity', items: [{ cmd: 'ph-quantity-cd', size: 'small', label: 'Intensity' }, { cmd: 'ph-quantity-lx', size: 'small', label: 'Lux at 25 m' }] },
        { caption: 'Colour by', items: [{ cmd: 'ph-mode-light', size: 'small', label: 'Light' }, { cmd: 'ph-mode-uniformity', size: 'small', label: 'Uniformity' }] },
        { caption: 'Scale', items: [{ cmd: 'ph-scale-log', size: 'small', label: 'Log' }, { cmd: 'ph-scale-linear', size: 'small', label: 'Linear' }, { cmd: 'ph-scale-fit', label: 'Fit' }] },
        { caption: 'Palette', items: [{ cmd: 'ph-palette-night', size: 'small', label: 'Night' }, { cmd: 'ph-palette-heat', size: 'small', label: 'Heat' }, { cmd: 'ph-palette-spectrum', size: 'small', label: 'False colour' }, { cmd: 'ph-palette-grey', size: 'small', label: 'Grey' }] },
        { caption: 'Overlays', items: [{ cmd: 'ph-contours', label: 'Contours' }] },
      ] },
      { id: 'view', label: 'View', groups: [
        { caption: 'Camera', items: [{ cmd: 'fit', label: 'Fit' }, { cmd: 'zoom-in', size: 'small' }, { cmd: 'zoom-out', size: 'small' }] },
        { caption: 'Panels', items: [{ cmd: 'toggle-studies', size: 'small', label: 'Studies' }, { cmd: 'toggle-inspector', size: 'small', label: 'Design' }, { cmd: 'toggle-theme', label: 'Dark theme' }] },
      ] },
    ];
  }

  /** @param {string} key */
  key(key) { return key === 'u' ? (this.doc.display.beam.mode === 'uniformity' ? 'ph-mode-light' : 'ph-mode-uniformity') : key === 'p' ? 'ph-pick-target' : null; }

  /** @returns {[string, string][]} */
  shortcuts() {
    return [['Beam or road picture', '1 or 2'], ['Colour by uniformity, or by light', 'U'], ['Pick a target on the beam', 'P']];
  }
}

