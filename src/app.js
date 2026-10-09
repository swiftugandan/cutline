/** The Cutline application shell: the window around the workspaces. It owns the title bar, ribbon, panels, dialogs,
 * keyboard, file handling and the viewport's pan and zoom, and hands the shared regions to the active workspace: the
 * lamp design, the photometry study or the vehicle. window.cutline exposes it for scripting and browser tests. */

import { TracePool } from './worker/pool.js';
import { AnalysisClient } from './worker/analysis-client.js';
import { DesignWorkspace } from './workspaces/design.js';
import { PhotometryWorkspace } from './workspaces/photometry.js';
import { VehicleWorkspace } from './workspaces/vehicle.js';
import { Commands, Ribbon, Toasts, Dialogs, installTooltips } from './ui/shell.js';
import { byId, h, fmt, debounce, downloadBlob, fileName } from './ui/dom.js';
import { hydrateIcons } from './ui/icons.js';
import { readPref, writePref } from './ui/prefs.js';

/** @import { Workspace, WorkspaceId } from './workspaces/workspace.js' */

const WORKSPACE_IDS = /** @type {WorkspaceId[]} */ (['design', 'photometry', 'vehicle']);

export class CutlineApp {
  /** @param {() => Worker} createWorker */
  constructor(createWorker) {
    this.ready = false;
    const cores = Math.max(1, Math.min(15, (navigator.hardwareConcurrency || 4) - 1));
    this.pool = new TracePool(createWorker, cores);
    this.analyser = new AnalysisClient(createWorker());
    this.toasts = new Toasts();
    this.dialogs = new Dialogs();
    this.commands = new Commands();
    this.root = byId('app');
    this.canvas = /** @type {HTMLCanvasElement} */ (byId('view'));
    this.viewport = byId('viewport');
    this.design = new DesignWorkspace(this);
    this.photometry = new PhotometryWorkspace(this);
    this.vehicle = new VehicleWorkspace(this);
    /** @type {Record<WorkspaceId, Workspace>} */
    this.workspaces = { design: this.design, photometry: this.photometry, vehicle: this.vehicle };
    const saved = /** @type {WorkspaceId} */ (readPref('cutline-workspace'));
    /** @type {Workspace} */
    this.active = this.workspaces[WORKSPACE_IDS.includes(saved) ? saved : 'design'];
    /** @type {Partial<Record<WorkspaceId, string>>} the ribbon tab last shown in each workspace */
    this.tabs = {};
    this.ribbon = new Ribbon({ tabs: byId('tabs'), ribbon: byId('ribbon'), commands: this.commands, layout: this.active.tabs(), onShow: () => this.setPanel('ribbon', true) });
    /** @type {Set<string>} views framed at least once, as workspace:view */
    this.fitted = new Set();
    /** @type {Record<string, number>} each view's scale when last fitted, for the zoom read-out */
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
    hydrateIcons(document.body);
    this.installCanvas();
    this.installKeyboard();
    this.installSplitter();
    this.installFileDrop();
    new ResizeObserver(() => this.resizeView()).observe(this.viewport);
    new ResizeObserver(debounce(() => this.active.renderDock(), 60)).observe(byId('dock'));
    window.addEventListener('beforeunload', e => { if (Object.values(this.workspaces).some(w => w.saveState !== 'saved')) e.preventDefault(); });
    await Promise.all(Object.values(this.workspaces).map(w => w.start()));
    this.switchTo(this.active.id, true);
    this.ready = true;
  }

  // ---------- Workspaces ----------

  /** @param {WorkspaceId} id @param {boolean} [force] */
  switchTo(id, force = false) {
    const next = this.workspaces[id];
    if (next === this.active && !force) return;
    if (next !== this.active) {
      this.tabs[this.active.id] = this.ribbon.active;
      this.active.deactivate();
    }
    this.active = next;
    writePref('cutline-workspace', id);
    this.root.dataset.workspace = id;
    this.ribbon.layout = next.tabs();
    this.ribbon.active = this.tabs[id] ?? this.ribbon.layout[Math.min(1, this.ribbon.layout.length - 1)].id;
    this.ribbon.render();
    /** @type {HTMLInputElement} */ (byId('fileInput')).accept = next.fileTypes;
    next.activate();
    this.renderViewSwitch();
    next.renderPanels();
    this.renderChrome();
    this.setView(next.view);
  }

  /** The title bar, save state, breadcrumb and legend of the active workspace. */
  renderChrome() {
    const w = this.active;
    const title = w.title() || 'Untitled';
    byId('docTitle').textContent = title;
    document.title = `${title} — Cutline`;
    for (const b of document.querySelectorAll('#workspaceSwitch [data-cmd]')) b.setAttribute('aria-pressed', String(/** @type {HTMLElement} */ (b).dataset.cmd === `workspace-${w.id}`));
    byId('breadcrumb').replaceChildren(...w.breadcrumb());
    this.renderSaveState();
    this.renderLegend();
    this.updateUndoTips();
    this.ribbon.refresh();
  }

  renderSaveState() {
    const el = byId('saveState');
    const state = this.active.saveState;
    el.dataset.state = state;
    el.textContent = state === 'saved' ? 'Saved on this device' : state === 'pending' ? 'Saving…' : 'Not saved. Download a copy';
  }

  renderLegend() {
    const { entries, hint } = this.active.legend();
    byId('viewLegend').replaceChildren(...entries.map(([label, colour, dashed]) => h('span', {}, [h('i', { style: dashed ? `background: repeating-linear-gradient(90deg, ${colour} 0 5px, transparent 5px 8px)` : `background: ${colour}` }), label])));
    byId('viewLegend').hidden = entries.length === 0;
    byId('statusHint').textContent = hint;
    this.updateScale();
  }

  renderViewSwitch() {
    const w = this.active;
    byId('viewSwitch').replaceChildren(...w.views().map(v => h('button', { type: 'button', role: 'tab', 'data-cmd': `view-${v.id}`, 'aria-pressed': String(w.view === v.id), text: v.label })));
  }

  updateUndoTips() {
    const store = this.active.store;
    const undo = document.querySelector('.titlebar [data-cmd="undo"]'), redo = document.querySelector('.titlebar [data-cmd="redo"]');
    undo?.setAttribute('data-tip', store.canUndo ? `Undo ${store.undoLabel.toLowerCase()} (Ctrl+Z)` : 'Nothing to undo');
    redo?.setAttribute('data-tip', store.canRedo ? `Redo ${store.redoLabel.toLowerCase()} (Ctrl+Shift+Z)` : 'Nothing to redo');
  }

  // ---------- Views ----------

  /** @param {string} view */
  setView(view) {
    const w = this.active;
    w.setView(view);
    for (const b of document.querySelectorAll('#viewSwitch [data-cmd]')) b.setAttribute('aria-pressed', String(/** @type {HTMLElement} */ (b).dataset.cmd === `view-${w.view}`));
    // Only the active workspace's canvases are shown.
    for (const c of this.viewport.querySelectorAll('canvas')) /** @type {HTMLElement} */ (c).hidden = c !== w.current.canvas && c !== w.current.glCanvas;
    this.resizeView();
    this.renderLegend();
    this.ribbon.refresh();
  }

  get viewKey() { return `${this.active.id}:${this.active.view}`; }

  resizeView() {
    const view = this.active.current;
    view.resize();
    if (!this.fitted.has(this.viewKey)) { this.fitted.add(this.viewKey); this.fitView(); }
    else this.updateScale();
  }

  fitView() {
    const view = this.active.current;
    view.fit();
    this.baseScale[this.viewKey] = view.camera.scale;
    this.updateScale();
  }

  /** Forgets that a view was framed, so it is fitted when next shown. @param {string} workspace @param {string} view */
  unfit(workspace, view) { this.fitted.delete(`${workspace}:${view}`); }

  /** A scale bar of a round length near 110 px, in the view's units. */
  updateScale() {
    const view = this.active.current, unit = this.active.scaleUnit();
    const bar = byId('scaleBar');
    bar.hidden = !unit;
    const scale = view.camera.scale;
    if (unit) {
      const target = 110 / scale;
      const p = 10 ** Math.floor(Math.log10(target));
      const length = [1, 2, 5, 10].map(m => m * p).reduce((best, x) => (Math.abs(x - target) < Math.abs(best - target) ? x : best));
      /** @type {HTMLElement} */ (bar.querySelector('i')).style.width = `${length * scale}px`;
      /** @type {HTMLElement} */ (bar.querySelector('span')).textContent = unit.text(length);
      bar.dataset.unit = unit.unit;
    }
    const base = this.baseScale[this.viewKey] ?? scale;
    byId('zoomLabel').textContent = `${fmt((scale / base) * 100, 0)}%`;
  }

  /** Pan, zoom, hover read-outs and double-click to fit, for whichever view is showing. */
  installCanvas() {
    const viewport = this.viewport, tip = byId('viewTooltip');
    /** @type {{ x: number, y: number, id: number, custom: boolean } | null} */
    let drag = null;
    const hideTip = () => { tip.hidden = true; };
    /** @param {PointerEvent} e */
    const local = e => { const r = this.active.current.canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    viewport.addEventListener('pointerdown', e => {
      if (!(e.target instanceof HTMLCanvasElement)) return;
      const [x, y] = local(e);
      const custom = !!this.active.interaction?.down?.(e, x, y);
      drag = { x: e.clientX, y: e.clientY, id: e.pointerId, custom };
      e.target.setPointerCapture(e.pointerId);
      if (!custom) viewport.dataset.cursor = 'grabbing';
      hideTip();
    });
    /** @param {PointerEvent} e */
    const end = e => {
      if (drag?.custom) { const [x, y] = local(e); this.active.interaction?.up?.(e, x, y); }
      drag = null; viewport.dataset.cursor = 'grab';
    };
    viewport.addEventListener('pointerup', end);
    viewport.addEventListener('pointercancel', end);
    viewport.addEventListener('pointerleave', hideTip);
    viewport.addEventListener('pointermove', e => {
      if (!(e.target instanceof HTMLCanvasElement)) return;
      const [x, y] = local(e);
      if (drag) {
        if (drag.custom) { this.active.interaction?.move?.(e, x, y); return; }
        this.active.current.pan(e.clientX - drag.x, e.clientY - drag.y);
        drag = { ...drag, x: e.clientX, y: e.clientY };
        this.updateScale();
        return;
      }
      if (this.active.interaction?.move?.(e, x, y)) { hideTip(); return; }
      const html = this.active.readout(x, y);
      if (!html) { hideTip(); return; }
      tip.innerHTML = html;
      tip.hidden = false;
      const r = viewport.getBoundingClientRect();
      const w = tip.offsetWidth, ht = tip.offsetHeight;
      tip.style.left = `${Math.min(r.width - w - 8, x + 14)}px`;
      tip.style.top = `${Math.max(8, Math.min(r.height - ht - 8, y + 14))}px`;
    });
    viewport.addEventListener('wheel', e => {
      if (!(e.target instanceof HTMLCanvasElement)) return;
      e.preventDefault();
      const [x, y] = local(/** @type {PointerEvent} */ (/** @type {unknown} */ (e)));
      this.active.current.zoom(Math.exp(-e.deltaY * 0.0015), x, y);
      this.updateScale();
    }, { passive: false });
    viewport.addEventListener('dblclick', e => { if (e.target instanceof HTMLCanvasElement) this.fitView(); });
    viewport.dataset.cursor = 'grab';
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

  /**
   * Opens a file in the workspace that reads it, switching to that workspace.
   * @param {File} file
   */
  async openFile(file) {
    const target = this.active.accepts(file) ? this.active : WORKSPACE_IDS.map(id => this.workspaces[id]).find(w => w.accepts(file));
    if (!target) { this.toasts.show(`${file.name} is not a file Cutline opens. It reads designs (.cutline.json), light distributions (.ies, .ldt) and vehicle models (.stl, .obj, .glb).`, { kind: 'error', ms: 8000 }); return; }
    if (target !== this.active) this.switchTo(target.id);
    await target.openFile(file);
  }

  /**
   * Asks before replacing a workspace's document, which is the only one kept in the browser.
   * @param {Workspace} w
   */
  async confirmReplace(w) {
    const choice = await this.dialogs.open({
      title: `Replace the current ${w.id === 'design' ? 'design' : w.id === 'photometry' ? 'study' : 'vehicle'}?`,
      body: [h('p', { text: `“${w.title()}” is kept only in this browser. Download a copy first if you want to keep it.` })],
      actions: [{ label: 'Cancel', value: '' }, { label: 'Download first', value: 'download' }, { label: 'Replace', value: 'replace', primary: true }],
    });
    if (choice === 'download') { w.download(); return true; }
    return choice === 'replace';
  }

  exportImage() {
    const view = this.active.current;
    view.draw();
    view.canvas.toBlob(blob => { if (blob) downloadBlob(fileName(this.active.title(), ` ${this.active.view}.png`), blob); }, 'image/png');
  }

  // ---------- Commands ----------

  registerCommands() {
    const store = () => this.active.store;
    /** @param {WorkspaceId} id @param {string} label */
    const workspace = (id, label) => ({ id: `workspace-${id}`, label, icon: this.workspaces[id].icon, hint: `Switch to ${label.toLowerCase()}`, pressed: () => this.active.id === id, run: () => this.switchTo(id) });
    this.commands.register([
      workspace('design', 'Lamp design'), workspace('photometry', 'Photometry'), workspace('vehicle', 'Vehicle'),
      { id: 'open', label: 'Open a file', icon: 'open', shortcut: 'Ctrl+O', run: () => byId('fileInput').click() },
      { id: 'save', label: 'Download', icon: 'download', shortcut: 'Ctrl+S', hint: 'Download this workspace\'s document', run: () => this.active.download() },
      { id: 'rename', label: 'Rename', icon: 'new', run: async () => { const name = await this.dialogs.prompt('Rename', 'Title', this.active.title()); if (name !== null) this.active.rename(name.trim().slice(0, 160) || 'Untitled'); } },
      { id: 'export-png', label: 'Image of view', icon: 'image', run: () => this.exportImage() },
      { id: 'undo', label: 'Undo', icon: 'undo', shortcut: 'Ctrl+Z', enabled: () => store().canUndo, run: () => store().undo() },
      { id: 'redo', label: 'Redo', icon: 'redo', shortcut: 'Ctrl+Shift+Z', enabled: () => store().canRedo, run: () => store().redo() },
      { id: 'fit', label: 'Fit to view', icon: 'fit', shortcut: 'F', run: () => this.fitView() },
      { id: 'zoom-in', label: 'Zoom in', icon: 'plus', shortcut: '+', run: () => { this.active.current.zoom(1.25); this.updateScale(); } },
      { id: 'zoom-out', label: 'Zoom out', icon: 'minus', shortcut: '−', run: () => { this.active.current.zoom(0.8); this.updateScale(); } },
      { id: 'toggle-theme', label: 'Dark theme', icon: 'moon', pressed: () => document.documentElement.dataset.theme === 'dark', run: () => { const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; writePref('cutline-theme', next); this.applyTheme(next); this.ribbon.refresh(); this.active.renderDock(); } },
      { id: 'toggle-ribbon', label: 'Ribbon', icon: 'chevron', pressed: () => this.root.dataset.ribbon === 'open', run: () => this.setPanel('ribbon') },
      { id: 'toggle-studies', label: 'Studies panel', icon: 'panel-left', pressed: () => this.root.dataset.studies === 'open', run: () => this.setPanel('studies') },
      { id: 'toggle-inspector', label: 'Design panel', icon: 'panel-right', pressed: () => this.root.dataset.inspector === 'open', run: () => this.setPanel('inspector') },
      { id: 'palette', label: 'Find a command', icon: 'search', shortcut: 'Ctrl+K', palette: false, run: () => this.dialogs.palette(this.commands, id => this.available(id)) },
      { id: 'help', label: 'Help and keyboard shortcuts', icon: 'help', shortcut: 'F1', run: () => { this.dialogs.help(this.shortcuts(), this.active.label); } },
    ]);
    for (const w of Object.values(this.workspaces)) {
      this.commands.register(w.commandList().map(c => ({ ...c, workspace: w.id })));
      // Each workspace's views get a command; it applies only while that workspace is active.
      this.commands.register(w.views().map(v => ({ id: `view-${v.id}`, label: `${v.label} view`, icon: v.icon, hint: v.hint, workspace: w.id, pressed: () => this.active.view === v.id, run: () => this.setView(v.id) })));
    }
    this.commands.allowed = id => this.available(id);
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

  /** Whether a command applies now: shell commands always, a workspace's only while it is active. @param {string} id */
  available(id) {
    const c = this.commands.get(id);
    return !!c && (!c.workspace || c.workspace === this.active.id);
  }

  /** @returns {[string, string][]} */
  shortcuts() {
    return [
      ['Find a command', 'Ctrl+K'],
      ['Undo / redo', 'Ctrl+Z / Ctrl+Shift+Z'],
      ['Download', 'Ctrl+S'],
      ['Open a file', 'Ctrl+O, or drop it on the window'],
      ...this.active.shortcuts(),
      ['Fit the view', 'F or double-click'],
      ['Zoom', 'Scroll, or + and −'],
      ['Pan', 'Drag'],
      ['Help', 'F1 or ?'],
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
      const views = this.active.views();
      if (/^[1-9]$/.test(key) && views[Number(key) - 1]) return run(`view-${views[Number(key) - 1].id}`);
      if (key === '+' || key === '=') return run('zoom-in');
      if (key === '-') return run('zoom-out');
      if (key === '?') return run('help');
      const own = this.active.key?.(key, e);
      if (own) return run(own);
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
