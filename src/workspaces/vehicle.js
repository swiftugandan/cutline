/** The vehicle workspace: open a model of the vehicle, place each lamp on it, and check where the lamps sit against
 * UN R48 and FMVSS 108: presence, number, height, distance from the outer edge, separation and the angles of
 * geometric visibility with bodywork obstruction. */

import { DocumentStore } from '../core/history.js';
import { VEHICLE_SPEC, defaultVehicle, validateVehicle, parseVehicle, serializeVehicle } from '../core/vehicle.js';
import { INSTALL_ROLES, checkInstallation, overallWidth } from '../core/installation.js';
import { readMesh, toVehicleFrame } from '../core/mesh/mesh.js';
import { sampleVehicleStl } from '../core/mesh/sample.js';
import { Bvh } from '../core/mesh/bvh.js';
import { VehicleView } from '../render/vehicle-view.js';
import { Inspector } from '../ui/inspector.js';
import { checksView, lampsView, visibilityView, modelView } from '../ui/vehicle-views.js';
import { vehicleReport } from '../ui/vehicle-report.js';
import { Persistence } from '../ui/persistence.js';
import { renderStudyList } from './design.js';
import { byId, h, fmt, debounce, downloadBlob, fileName } from '../ui/dom.js';
import { hydrateIcons } from '../ui/icons.js';

/** @import { Vehicle, PlacedLamp, Facing } from '../core/vehicle.js' */
/** @import { InstallResult } from '../core/installation.js' */
/** @import { Mesh, Bounds } from '../core/mesh/mesh.js' */
/** @import { ChangeDetail } from '../core/history.js' */
/** @import { RibbonTab, Command } from '../ui/shell.js' */
/** @import { InspectorConfig } from '../ui/inspector.js' */
/** @import { CutlineApp } from '../app.js' */
/** @import { Workspace, ViewEntry, Legend, Interaction } from './workspace.js' */
/** @import { ViewPreset, LampStatus } from '../render/vehicle-view.js' */

/** @typedef {'checks' | 'lamps' | 'visibility' | 'model'} StudyId */

/** @implements {Workspace} */
export class VehicleWorkspace {
  /** @param {CutlineApp} app */
  constructor(app) {
    this.app = app;
    this.id = /** @type {const} */ ('vehicle');
    this.label = 'Vehicle';
    this.icon = 'car';
    this.fileTypes = '.stl,.STL,.obj,.OBJ,.glb,.GLB,.gltf,.json';
    this.persistence = new Persistence({ key: 'vehicle', fallbackKey: 'cutline-vehicle', parse: parseVehicle, serialize: serializeVehicle });
    /** @type {DocumentStore<Vehicle>} */
    this.store = new DocumentStore(defaultVehicle(), validateVehicle);
    this.view = 'vehicle';
    this.current = new VehicleView(app.canvas, /** @type {HTMLCanvasElement} */ (byId('view3d')));
    /** @type {StudyId} */
    this.study = 'checks';
    /** The model file's bytes, its mesh as read, and the mesh in the vehicle frame. */
    /** @type {ArrayBuffer | null} */
    this.bytes = null;
    /** @type {Mesh | null} */
    this.raw = null;
    /** @type {Bounds | null} */
    this.bounds = null;
    /** @type {Bvh | null} */
    this.bvh = null;
    this.frameKey = '';
    /** @type {string | null} */
    this.error = null;
    this.busy = false;
    /** @type {InstallResult[]} */
    this.results = [];
    /** @type {'r48' | 'fmvss108'} the regulation the dock and the lamp colours show */
    this.pack = 'r48';
    /** @type {number | null} */
    this.selected = null;
    /** Placing a lamp by clicking the model: the lamp's index, or a new lamp's role. @type {{ index: number } | { role: string } | null} */
    this.placing = null;
    /** @type {'saved' | 'pending' | 'error'} */
    this.saveState = 'saved';
    /** @type {InspectorConfig<Vehicle>} */
    this.config = {
      spec: VEHICLE_SPEC,
      sections: [
        { id: 'lamp', title: 'Selected lamp', paths: [], visible: () => this.selected !== null, summary: d => (this.selected !== null ? d.lamps[this.selected]?.name ?? '' : ''), extra: () => [this.lampActions()] },
        { id: 'vehicle', title: 'Vehicle', paths: ['vehicle'], summary: d => `${d.vehicle.category}, ${fmt(overallWidthOf(d, this.bounds), 0)} mm wide` },
        { id: 'model', title: 'Model', paths: ['model'], summary: d => d.model.name || 'None', extra: d => [this.modelBlock(d)] },
      ],
    };
    this.inspector = new Inspector(byId('inspectorBody'), { store: this.store, config: this.config, onError: message => app.toasts.show(message, { kind: 'error' }) });
    this.autosave = debounce(() => this.save(), 600);
    this.recheck = debounce(() => this.check(), 120);
    /** @type {{ x: number, y: number, moved: boolean, slide: boolean } | null} */
    this.drag = null;
    /** @type {Interaction} */
    this.interaction = {
      down: (e, x, y) => { this.drag = { x, y, moved: false, slide: e.shiftKey || e.button === 2 || e.button === 1 }; return true; },
      move: (_e, x, y) => {
        if (!this.drag) return false;
        const dx = x - this.drag.x, dy = y - this.drag.y;
        if (!this.drag.moved && Math.hypot(dx, dy) < 3) return true;
        this.drag.moved = true;
        if (this.drag.slide) this.current.slide(dx, dy); else this.current.pan(dx, dy);
        this.drag.x = x; this.drag.y = y;
        this.app.updateScale();
        return true;
      },
      up: (_e, x, y) => {
        const click = this.drag && !this.drag.moved;
        this.drag = null;
        if (click) this.click(x, y);
        return true;
      },
    };
  }

  get doc() { return this.store.doc; }
  get isActive() { return this.app.active === this; }

  async start() {
    try {
      const saved = await this.persistence.load();
      if (saved) this.store.replace(saved);
      const bytes = saved?.model.name ? await this.persistence.loadBlob('model') : null;
      if (bytes && saved) this.loadModel(bytes, saved.model.name);
    } catch (error) {
      this.app.toasts.show(`The saved vehicle could not be opened (${error instanceof Error ? error.message : error}). Starting a new one.`, { kind: 'error', ms: 8000 });
    }
    this.store.addEventListener('change', event => this.onChange(/** @type {CustomEvent<ChangeDetail>} */ (event).detail));
  }

  activate() {
    this.current.active = true;
    this.current.init();
    this.renderOverlays();
    this.current.request();
  }

  deactivate() {
    this.current.active = false;
    this.placing = null;
    byId('viewportEmpty').hidden = true;
  }

  title() { return this.doc.title; }
  /** @param {string} title */
  rename(title) { this.edit('Rename vehicle', d => { d.title = title; }); }

  /** @param {string} label @param {(v: Vehicle) => void} mutate */
  edit(label, mutate) {
    try { this.store.transact(label, mutate); } catch (e) { this.app.toasts.show(e instanceof Error ? e.message : String(e), { kind: 'error' }); }
  }

  /** @param {ChangeDetail} detail */
  onChange(detail) {
    if (this.selected !== null && this.selected >= this.doc.lamps.length) this.selected = this.doc.lamps.length ? this.doc.lamps.length - 1 : null;
    if (detail.kind === 'preview') { this.inspector.refreshValues(); this.refreshFrame(); this.recheck(); return; }
    if (detail.kind === 'rollback') { this.inspector.refreshValues(true); return; }
    this.refreshFrame();
    this.recheck();
    if (this.isActive) {
      this.renderPanels();
      this.app.renderChrome();
      this.app.setStatus(detail.kind === 'undo' ? `Undid ${detail.label.toLowerCase()}` : detail.kind === 'redo' ? `Redid ${detail.label.toLowerCase()}` : detail.kind === 'load' ? 'Vehicle opened' : detail.label);
    }
    this.saveState = 'pending';
    if (this.isActive) this.app.renderSaveState();
    this.autosave();
  }

  // ---------- The model ----------

  /** Reads model bytes and places them in the vehicle frame. @param {ArrayBuffer} bytes @param {string} name */
  loadModel(bytes, name) {
    this.raw = readMesh(bytes, name);
    this.bytes = bytes;
    this.frameKey = '';
    this.error = null;
    this.refreshFrame();
  }

  /** Places the mesh in the vehicle frame again when the model's units, axes or ground change. */
  refreshFrame() {
    if (!this.raw) return;
    const m = this.doc.model;
    const key = JSON.stringify([m.units, m.forward, m.up, m.groundBelow, this.raw.triangles]);
    if (key === this.frameKey) return;
    try {
      const { mesh, bounds } = toVehicleFrame(this.raw, m);
      this.frameKey = key;
      this.bounds = bounds;
      this.bvh = new Bvh(mesh);
      this.current.setMesh(mesh.positions, bounds);
      this.error = null;
      this.app.unfit('vehicle', 'vehicle');
      if (this.isActive) this.app.resizeView();
    } catch (error) {
      this.error = error instanceof Error ? error.message : String(error);
    }
  }

  /** Runs the installation checks of every regulation chosen. */
  check() {
    const v = this.doc;
    if (!this.bounds) { this.results = []; this.showResults(); return; }
    this.busy = true;
    const started = performance.now();
    /** @type {InstallResult[]} */
    const results = [];
    if (v.vehicle.r48 === 'yes') results.push(checkInstallation(v, this.bounds, this.bvh, 'r48'));
    if (v.vehicle.fmvss108 === 'yes') results.push(checkInstallation(v, this.bounds, this.bvh, 'fmvss108'));
    this.results = results;
    if (!results.some(r => r.pack === this.pack) && results[0]) this.pack = results[0].pack;
    this.busy = false;
    if (this.isActive) this.app.setStatus(`Checked ${v.lamps.length} ${v.lamps.length === 1 ? 'lamp' : 'lamps'} in ${fmt((performance.now() - started) / 1000, 2)} s`);
    this.showResults();
  }

  /** The worst result of each lamp under the regulation shown. @returns {LampStatus[]} */
  statuses() {
    const r = this.results.find(x => x.pack === this.pack);
    return this.doc.lamps.map((_, i) => {
      const items = r?.items.filter(it => it.lamp === i && it.status !== 'info') ?? [];
      if (!items.length) return 'none';
      return items.some(it => it.status === 'fail') ? 'fail' : items.some(it => it.status === 'near') ? 'near' : 'pass';
    });
  }

  showResults() {
    const view = this.current;
    view.lamps = this.doc.lamps;
    view.status = this.statuses();
    view.selected = this.selected;
    const r = this.results.find(x => x.pack === this.pack);
    view.map = this.selected !== null ? r?.maps.get(this.selected) ?? null : null;
    view.request();
    if (this.isActive) { this.renderStudies(); this.renderDock(); this.renderStatus(); }
  }

  // ---------- Pointer ----------

  /** A click: places a lamp in placing mode, otherwise selects the lamp under the pointer. @param {number} x @param {number} y */
  click(x, y) {
    if (this.placing) {
      const hit = this.pick(x, y);
      if (!hit) { this.app.toasts.show('Click on the model, where the lamp\'s centre of reference is.'); return; }
      this.place(hit.point, hit.normal);
      return;
    }
    const lamp = this.current.lampAt(x, y);
    this.select(lamp);
  }

  /** The model point under a screen point. @param {number} x @param {number} y */
  pick(x, y) {
    if (!this.bvh) return null;
    const { origin, dir } = this.current.ray(x, y);
    const hit = this.bvh.intersect(origin, dir);
    if (!hit) return null;
    return { point: [origin[0] + dir[0] * hit.t, origin[1] + dir[1] * hit.t, origin[2] + dir[2] * hit.t], normal: hit.normal };
  }

  /** Places the lamp being placed at a model point. @param {number[]} p @param {number[]} normal */
  place(p, normal) {
    const placing = this.placing;
    if (!placing) return;
    this.placing = null;
    this.app.viewport.dataset.cursor = 'grab';
    if ('index' in placing) {
      this.edit('Move a lamp', d => { Object.assign(d.lamps[placing.index], { x: Math.round(p[0]), y: Math.round(p[1]), z: Math.round(p[2]) }); });
      this.select(placing.index);
      return;
    }
    const role = placing.role, def = INSTALL_ROLES[role];
    // A side lamp faces the side it sits on; otherwise the role's own direction, or the surface's for a lamp on a flank.
    /** @type {Facing} */
    const facing = def.facing === 'side' ? (p[1] >= 0 ? 'left' : 'right') : def.facing === 'rear' || (Math.abs(normal[0]) > 0.5 && normal[0] < 0) ? 'rear' : 'front';
    const side = Math.abs(p[1]) < 60 ? '' : p[1] > 0 ? ' left' : ' right';
    /** @type {PlacedLamp} */
    const lamp = { name: `${def.name.replace(/ \(.*\)$/, '')}${side}`, role: /** @type {PlacedLamp['role']} */ (role), facing, x: Math.round(p[0]), y: Math.round(p[1]), z: Math.round(p[2]), width: def.size[0], height: def.size[1] };
    this.edit(`Place ${lamp.name.toLowerCase()}`, d => { d.lamps.push(lamp); });
    this.select(this.doc.lamps.length - 1);
    this.app.setStatus(`Placed ${lamp.name.toLowerCase()}. Set its apparent surface in the design panel.`);
  }

  /** @param {number | null} index */
  select(index) {
    this.selected = index;
    this.config.sections[0].paths = index !== null ? [`lamps.${index}`] : [];
    if (index !== null && this.study === 'model') this.study = 'checks';
    this.showResults();
    if (this.isActive) { this.inspector.render(); this.app.renderChrome(); }
  }

  // ---------- Lamps ----------

  async addLamp() {
    if (!this.bvh) { this.app.toasts.show('Open a vehicle model first.'); return; }
    const role = h('select', { class: 'select', 'aria-label': 'Function' }, Object.entries(INSTALL_ROLES).map(([id, d]) => h('option', { value: id, text: d.name })));
    const body = [h('p', { text: 'Choose the lamp, then click the model where its centre of reference is. Cutline faces it the usual way for its function and gives it a typical apparent surface; set both in the design panel.' }), h('label', { class: 'field wide' }, [h('span', { class: 'field-label', text: 'Function' }), role])];
    const choice = await this.app.dialogs.open({ title: 'Add a lamp', body, actions: [{ label: 'Cancel', value: '' }, { label: 'Place it', value: 'place', primary: true }] });
    if (choice !== 'place') return;
    this.placing = { role: role.value };
    this.app.viewport.dataset.cursor = 'handle';
    this.app.setStatus('Click the model where the lamp\'s centre of reference is. Esc cancels.');
    this.app.renderLegend();
  }

  movePlacing() {
    if (this.selected === null) return;
    this.placing = { index: this.selected };
    this.app.viewport.dataset.cursor = 'handle';
    this.app.setStatus('Click the model where the lamp\'s centre of reference is now.');
    this.app.renderLegend();
  }

  /** Adds the lamp's twin on the other side of the median plane. */
  mirror() {
    const i = this.selected;
    if (i === null) return;
    const l = this.doc.lamps[i];
    const swap = (/** @type {string} */ s) => s.replace(/\b(left|right)\b/g, m => (m === 'left' ? 'right' : 'left'));
    /** @type {PlacedLamp} */
    const twin = { ...l, name: swap(l.name) === l.name ? `${l.name} (mirrored)` : swap(l.name), y: -l.y, facing: l.facing === 'left' ? 'right' : l.facing === 'right' ? 'left' : l.facing };
    this.edit('Mirror a lamp', d => { d.lamps.push(twin); });
    this.select(this.doc.lamps.length - 1);
  }

  remove() {
    const i = this.selected;
    if (i === null) return;
    this.edit('Remove a lamp', d => { d.lamps.splice(i, 1); });
    this.select(null);
  }

  // ---------- Rendering ----------

  renderPanels() {
    if (!this.isActive) return;
    this.config.sections[0].paths = this.selected !== null ? [`lamps.${this.selected}`] : [];
    this.inspector.render();
    this.renderStudies();
    this.renderDock();
    this.renderStatus();
    this.renderOverlays();
  }

  renderStatus() {
    if (!this.isActive) return;
    const el = byId('traceState');
    const r = this.results.find(x => x.pack === this.pack);
    const fails = r ? r.items.filter(i => i.status === 'fail').length : 0;
    el.dataset.state = this.error ? 'error' : '';
    el.textContent = this.error ? 'Cannot read the model' : r ? (fails ? `${fails} ${fails === 1 ? 'check fails' : 'checks fail'}` : 'All checks pass') : '';
    byId('statusRays').textContent = this.raw ? `${fmt(this.raw.triangles, 0)} triangles` : '';
  }

  renderStudies() {
    if (!this.isActive) return;
    const v = this.doc, r = this.results.find(x => x.pack === this.pack);
    const state = this.error ? ['error', 'Needs attention'] : this.bounds ? ['done', 'Up to date'] : ['idle', 'No model'];
    const judged = r ? r.items.filter(i => i.status !== 'info') : [];
    const met = judged.filter(i => i.status !== 'fail').length;
    const sel = this.selected !== null ? v.lamps[this.selected] : null;
    const map = this.selected !== null ? r?.maps.get(this.selected) : undefined;
    /** @type {[string, string, string[], (string | Node)[], string][]} */
    const items = [
      ['checks', 'Installation', state, r ? [`${met}/${judged.length}`, h('small', { text: 'checks pass' })] : ['–'], r ? r.title : 'R48 and FMVSS 108'],
      ['lamps', 'Lamps', state, [String(v.lamps.length), h('small', { text: v.lamps.length === 1 ? 'lamp placed' : 'lamps placed' })], v.lamps.length ? `${new Set(v.lamps.map(l => l.role)).size} functions` : 'Place each lamp on the model'],
      ['visibility', 'Visibility', state, map ? [`${map.sights.filter(s => s.visible >= 1).length}/${map.sights.length}`, h('small', { text: 'directions clear' })] : ['–'], sel ? sel.name : 'Select a lamp'],
      ['model', 'Model', state, this.bounds ? [fmt((this.bounds.max[0] - this.bounds.min[0]) / 1000, 2), h('small', { text: 'm long' })] : ['–'], v.model.name || 'STL, OBJ or glTF'],
    ];
    renderStudyList(items, this.study, id => this.showStudy(/** @type {StudyId} */ (id)), ['Checked in your browser', 'The model is read on this computer. Nothing is uploaded.']);
  }

  /** @param {StudyId} study */
  showStudy(study) {
    this.study = study;
    this.renderStudies();
    this.renderDock();
    this.app.ribbon.refresh();
  }

  renderDock() {
    if (!this.isActive) return;
    const dock = byId('dock');
    const scroll = dock.scrollTop;
    const v = this.doc;
    /** @type {HTMLElement} */
    let view;
    if (this.study === 'lamps') view = lampsView({ vehicle: v, statuses: this.statuses(), selected: this.selected, onSelect: i => this.select(i), onAdd: () => this.addLamp() });
    else if (this.study === 'visibility') view = visibilityView({ vehicle: v, selected: this.selected, map: this.selected !== null ? this.results.find(x => x.pack === this.pack)?.maps.get(this.selected) ?? null : null });
    else if (this.study === 'model') view = modelView({ vehicle: v, bounds: this.bounds, triangles: this.raw?.triangles ?? 0, error: this.error });
    else view = checksView({ vehicle: v, results: this.results, pack: this.pack, hasModel: !!this.bounds, busy: this.busy, selected: this.selected, onPack: p => { this.pack = p; this.showResults(); }, onSelect: i => this.select(i), onAdd: () => this.addLamp(), onReport: () => this.exportReport() });
    dock.replaceChildren(view);
    hydrateIcons(dock);
    dock.scrollTop = scroll;
  }

  renderOverlays() {
    if (!this.isActive) return;
    byId('scalePanel').hidden = true;
    const empty = byId('viewportEmpty');
    empty.hidden = !!this.bounds;
    if (this.bounds) return;
    const open = h('button', { class: 'primary-button', type: 'button', 'data-cmd': 'open' }, [h('span', { 'data-icon': 'open' }), h('span', { text: 'Open a vehicle model' })]);
    const sample = h('button', { class: 'outline-button', type: 'button', 'data-cmd': 'veh-sample' }, [h('span', { 'data-icon': 'car' }), h('span', { text: 'Try the sample vehicle' })]);
    empty.replaceChildren(h('div', { class: 'empty-card' }, [
      h('span', { class: 'empty-icon', 'data-icon': 'car' }),
      h('h3', { text: 'Check where the lamps sit' }),
      h('p', { text: 'Open a model of the vehicle as STL, OBJ or glTF (.glb), place each lamp on it, and Cutline checks heights, widths, separation and the angles of geometric visibility against UN R48 and FMVSS 108, with bodywork that hides a lamp found by ray casting. Export STEP files from your CAD system as STL or glTF first.' }),
      h('div', { class: 'empty-actions' }, [open, sample]),
      this.error ? h('div', { class: 'error-note', text: this.error }) : null,
    ]));
    hydrateIcons(empty);
  }

  breadcrumb() {
    const v = this.doc, sel = this.selected !== null ? v.lamps[this.selected] : null;
    return [h('strong', { text: v.model.name || 'No model' }), h('span', { class: 'sep', text: '/' }), `Category ${v.vehicle.category}`, ...(sel ? [h('span', { class: 'sep', text: '/' }), sel.name] : [])];
  }

  /** @returns {Legend} */
  legend() {
    return {
      entries: this.bounds ? [['Pass', '#51cf66'], ['Near', '#f2c230'], ['Fail', '#ff6b6b'], ['Not checked', '#c3cad6']] : [],
      hint: this.placing ? 'Click the model where the lamp\'s centre of reference is. Esc cancels.' : 'Drag to turn, Shift-drag to move, scroll to zoom. Click a lamp to select it.',
    };
  }

  /** @returns {ViewEntry[]} */
  views() { return [{ id: 'vehicle', label: '3D', icon: 'cube', hint: 'The vehicle and its lamps' }]; }
  setView() { this.current.request(); }
  scaleUnit() { return null; }

  /** @param {number} x @param {number} y */
  readout(x, y) {
    if (!this.bounds) return null;
    const lamp = this.current.lampAt(x, y);
    if (lamp !== null) {
      const l = this.doc.lamps[lamp], s = this.statuses()[lamp];
      return `<b>${l.name}</b><br>${fmt(l.z - l.height / 2, 0)}–${fmt(l.z + l.height / 2, 0)} mm above the ground${s !== 'none' ? `<br>${s === 'pass' ? 'Every check passes' : s === 'near' ? 'Near a limit' : 'A check fails'}` : ''}`;
    }
    const hit = this.pick(x, y);
    return hit ? `${fmt(hit.point[0], 0)}, ${fmt(hit.point[1], 0)}, ${fmt(hit.point[2], 0)} mm` : null;
  }

  /** The selected lamp's actions, under its fields. */
  lampActions() {
    /** @param {string} cmd @param {string} icon @param {string} text */
    const b = (cmd, icon, text) => h('button', { class: 'outline-button', type: 'button', 'data-cmd': cmd }, [h('span', { 'data-icon': icon }), h('span', { text })]);
    return h('div', { class: 'lamp-actions' }, [b('veh-move', 'pin', 'Place again'), b('veh-mirror', 'refresh', 'Mirror'), b('veh-remove', 'close', 'Remove')]);
  }

  /** The model file block in the design panel. @param {Vehicle} v */
  modelBlock(v) {
    const open = h('button', { class: 'outline-button', type: 'button', 'data-cmd': 'open' }, [h('span', { 'data-icon': 'open' }), h('span', { text: v.model.name ? 'Replace the model' : 'Open a model' })]);
    return h('div', { class: 'file-block' }, [h('span', { class: 'file-name', text: v.model.name || 'No model open', 'data-tip': v.model.name }), open]);
  }

  // ---------- Files ----------

  async save() {
    try {
      await this.persistence.save(this.doc);
      this.saveState = 'saved';
    } catch {
      this.saveState = 'error';
      this.app.toasts.show('This browser could not store the vehicle. Download a copy to keep your work.', { kind: 'error', action: { label: 'Download', run: () => this.download() }, ms: 9000 });
    }
    if (this.isActive) this.app.renderSaveState();
  }

  download() {
    downloadBlob(fileName(this.doc.title, '.vehicle.json'), new Blob([serializeVehicle(this.doc)], { type: 'application/json' }));
    this.app.setStatus('Vehicle downloaded. The model file is not inside it: keep it beside the download.');
  }

  /** @param {File} file */
  accepts(file) { return /\.(stl|obj|glb|gltf|stp|step|igs|iges)$/i.test(file.name) || /\.vehicle\.json$/i.test(file.name); }

  /** @param {File} file */
  async openFile(file) {
    try {
      if (/\.json$/i.test(file.name)) {
        const vehicle = parseVehicle(await file.text());
        if (!(await this.app.confirmReplace(this))) return;
        this.store.replace(vehicle);
        if (vehicle.model.name && vehicle.model.name !== this.doc.model.name) this.app.toasts.show(`Open the model ${vehicle.model.name} as well: it is not inside the vehicle file.`, { ms: 8000 });
        return;
      }
      await this.useModel(await file.arrayBuffer(), file.name);
    } catch (error) {
      this.error = error instanceof Error ? error.message : String(error);
      this.renderOverlays();
      this.app.toasts.show(`${file.name} could not be opened. ${this.error}`, { kind: 'error', ms: 9000 });
    }
  }

  /** Uses model bytes for this vehicle: read, keep in the browser, and record the name. @param {ArrayBuffer} bytes @param {string} name @param {Partial<Vehicle['model']>} [frame] */
  async useModel(bytes, name, frame = {}) {
    this.app.setStatus(`Reading ${name}…`);
    this.loadModel(bytes, name);
    this.edit(`Open ${name}`, d => { d.model = { ...d.model, ...frame, name }; if (/^Untitled/.test(d.title)) d.title = name.replace(/\.[a-z0-9]+$/i, ''); });
    this.persistence.saveBlob('model', bytes).catch(error => this.app.toasts.show(error instanceof Error ? error.message : String(error), { kind: 'error' }));
    this.renderPanels();
    this.app.fitView();
  }

  async useSample() {
    await this.useModel(sampleVehicleStl(), 'Sample vehicle.stl', { units: 'mm', forward: '+x', up: '+z', groundBelow: 0 });
    this.edit('Set the sample\'s width', d => { d.vehicle.overallWidth = 1760; });
  }

  /** Images of the vehicle from the front, the rear and above, for the report. */
  reportImages() {
    const view = this.current;
    const saved = { ...view.camera, target: [...view.camera.target] };
    /** @type {Record<string, string>} */
    const out = {};
    for (const preset of /** @type {ViewPreset[]} */ (['front', 'rear', 'iso'])) {
      view.preset(preset);
      view.draw();
      const c = document.createElement('canvas');
      c.width = view.glCanvas.width; c.height = view.glCanvas.height;
      const ctx = /** @type {CanvasRenderingContext2D} */ (c.getContext('2d'));
      ctx.drawImage(view.glCanvas, 0, 0); ctx.drawImage(view.canvas, 0, 0);
      out[preset] = c.toDataURL('image/png');
    }
    view.camera = saved;
    view.request();
    return out;
  }

  exportReport() {
    if (!this.results.length || !this.bounds) return;
    const html = vehicleReport(this.doc, this.results, { width: overallWidth(this.doc, this.bounds), images: this.reportImages(), generated: new Date() });
    downloadBlob(fileName(this.doc.title, ' installation.html'), new Blob([html], { type: 'text/html' }));
    this.app.setStatus('Report downloaded. Open it in a browser and print to PDF to share it.');
  }

  // ---------- Commands ----------

  /** @returns {Command[]} */
  commandList() {
    const has = () => !!this.bounds, sel = () => this.selected !== null;
    /** @param {ViewPreset} p @param {string} label */
    const preset = (p, label) => ({ id: `veh-view-${p}`, label: `${label} view`, icon: 'cube', enabled: has, run: () => { this.current.preset(p); this.app.updateScale(); } });
    /** @param {StudyId} id @param {string} label @param {string} icon */
    const study = (id, label, icon) => ({ id: `veh-study-${id}`, label: `Show ${label.toLowerCase()}`, icon, pressed: () => this.study === id, run: () => this.showStudy(id) });
    return [
      { id: 'veh-new', label: 'New vehicle', icon: 'new', run: async () => { if (await this.app.confirmReplace(this)) { this.raw = null; this.bounds = null; this.bvh = null; this.current.clearMesh(); this.store.replace(defaultVehicle()); this.renderPanels(); } } },
      { id: 'veh-sample', label: 'Sample vehicle', icon: 'car', hint: 'Try the workspace on a simple sample car', run: () => this.useSample() },
      { id: 'veh-report', label: 'Installation report', icon: 'table', hint: 'Download every check, with pictures, ready to print to PDF', enabled: () => this.results.length > 0, run: () => this.exportReport() },
      { id: 'veh-add', label: 'Add a lamp', icon: 'plus', enabled: has, run: () => this.addLamp() },
      { id: 'veh-move', label: 'Place the lamp again', icon: 'pin', enabled: sel, run: () => this.movePlacing() },
      { id: 'veh-mirror', label: 'Mirror the lamp', icon: 'refresh', hint: 'Add its twin on the other side of the median plane', enabled: sel, run: () => this.mirror() },
      { id: 'veh-remove', label: 'Remove the lamp', icon: 'close', enabled: sel, run: () => this.remove() },
      study('checks', 'Installation', 'pass'), study('lamps', 'Lamps', 'lamp'), study('visibility', 'Visibility', 'eye'), study('model', 'Model', 'cube'),
      { id: 'veh-r48', label: 'UN R48', icon: 'globe', enabled: () => this.results.some(r => r.pack === 'r48'), pressed: () => this.pack === 'r48', run: () => { this.pack = 'r48'; this.showResults(); } },
      { id: 'veh-fmvss', label: 'FMVSS 108', icon: 'globe', enabled: () => this.results.some(r => r.pack === 'fmvss108'), pressed: () => this.pack === 'fmvss108', run: () => { this.pack = 'fmvss108'; this.showResults(); } },
      preset('front', 'Front'), preset('rear', 'Rear'), preset('left', 'Left'), preset('right', 'Right'), preset('top', 'Top'), preset('iso', '3D'),
      { id: 'veh-ortho', label: 'Orthographic', icon: 'cube', hint: 'Draw without perspective, for reading heights and widths', pressed: () => this.current.camera.ortho, run: () => { this.current.camera.ortho = !this.current.camera.ortho; this.current.request(); } },
      { id: 'veh-fields', label: 'Visibility fields', icon: 'eye', hint: 'Show the selected lamp\'s field of geometric visibility', pressed: () => this.current.showFields, run: () => { this.current.showFields = !this.current.showFields; this.current.request(); } },
    ];
  }

  /** @returns {RibbonTab[]} */
  tabs() {
    return [
      { id: 'file', label: 'File', groups: [
        { caption: 'Vehicle model', items: [{ cmd: 'open', label: 'Open' }, { cmd: 'veh-sample', label: 'Sample' }] },
        { caption: 'Vehicle', items: [{ cmd: 'veh-new', size: 'small', label: 'New' }, { cmd: 'save', size: 'small', label: 'Download' }, { cmd: 'rename', size: 'small', label: 'Rename' }] },
        { caption: 'Export', items: [{ cmd: 'veh-report', label: 'Report', className: 'sun' }, { cmd: 'export-png', label: 'Image' }] },
      ] },
      { id: 'lamps', label: 'Lamps', groups: [
        { caption: 'Lamps', items: [{ cmd: 'veh-add', label: 'Add a lamp', className: 'sun' }, { cmd: 'veh-move', size: 'small', label: 'Place again' }, { cmd: 'veh-mirror', size: 'small', label: 'Mirror' }, { cmd: 'veh-remove', size: 'small', label: 'Remove' }] },
        { caption: 'Edit', items: [{ cmd: 'undo', size: 'small' }, { cmd: 'redo', size: 'small' }] },
      ] },
      { id: 'check', label: 'Check', groups: [
        { caption: 'Studies', items: [{ cmd: 'veh-study-checks', label: 'Installation' }, { cmd: 'veh-study-lamps', label: 'Lamps' }, { cmd: 'veh-study-visibility', label: 'Visibility' }, { cmd: 'veh-study-model', label: 'Model' }] },
        { caption: 'Regulation', items: [{ cmd: 'veh-r48', size: 'small', label: 'UN R48' }, { cmd: 'veh-fmvss', size: 'small', label: 'FMVSS 108' }] },
      ] },
      { id: 'view', label: 'View', groups: [
        { caption: 'Look from', items: [{ cmd: 'veh-view-front', size: 'small', label: 'Front' }, { cmd: 'veh-view-rear', size: 'small', label: 'Rear' }, { cmd: 'veh-view-left', size: 'small', label: 'Left' }, { cmd: 'veh-view-right', size: 'small', label: 'Right' }, { cmd: 'veh-view-top', size: 'small', label: 'Top' }, { cmd: 'veh-view-iso', size: 'small', label: '3D' }] },
        { caption: 'Show', items: [{ cmd: 'veh-ortho', label: 'Orthographic' }, { cmd: 'veh-fields', label: 'Fields' }] },
        { caption: 'Camera', items: [{ cmd: 'fit', label: 'Fit' }, { cmd: 'zoom-in', size: 'small' }, { cmd: 'zoom-out', size: 'small' }] },
        { caption: 'Panels', items: [{ cmd: 'toggle-studies', size: 'small', label: 'Studies' }, { cmd: 'toggle-inspector', size: 'small', label: 'Design' }, { cmd: 'toggle-theme', label: 'Dark theme' }] },
      ] },
    ];
  }

  /** @param {string} key @param {KeyboardEvent} e */
  key(key, e) {
    if (key === 'escape' && this.placing) { e.preventDefault(); this.placing = null; this.app.viewport.dataset.cursor = 'grab'; this.app.renderLegend(); return null; }
    return key === 'a' ? 'veh-add' : key === 'm' ? 'veh-mirror' : key === 'delete' || key === 'backspace' ? 'veh-remove' : null;
  }

  /** @returns {[string, string][]} */
  shortcuts() {
    return [['Add a lamp', 'A'], ['Mirror the selected lamp', 'M'], ['Remove the selected lamp', 'Delete'], ['Turn the view', 'Drag; Shift-drag moves it'], ['Cancel placing a lamp', 'Esc']];
  }
}

/** The overall width a vehicle uses, before its model is open. @param {Vehicle} v @param {Bounds | null} bounds */
function overallWidthOf(v, bounds) {
  return bounds ? overallWidth(v, bounds) : v.vehicle.overallWidth;
}
