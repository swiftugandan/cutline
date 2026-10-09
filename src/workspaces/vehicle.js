/** The vehicle workspace: open a model of the vehicle, place each lamp on it, and check where the lamps sit against
 * UN R48 and FMVSS 108: presence, number, height, distance from the outer edge, separation and the angles of
 * geometric visibility with bodywork obstruction. */

import { DocumentStore } from '../core/history.js';
import { VEHICLE_SPEC, defaultVehicle, validateVehicle, parseVehicle, serializeVehicle } from '../core/vehicle.js';
import { INSTALL_ROLES, checkInstallation, overallWidth } from '../core/installation.js';
import { readMesh, toVehicleFrame } from '../core/mesh/mesh.js';
import { sampleVehicleStl } from '../core/mesh/sample.js';
import { Bvh } from '../core/mesh/bvh.js';
import { VehicleView, dimensionsFor } from '../render/vehicle-view.js';
import { frame, dot } from '../render/camera.js';
import { Inspector } from '../ui/inspector.js';
import { checksView, lampsView, visibilityView, modelView } from '../ui/vehicle-views.js';
import { vehicleReport } from '../ui/vehicle-report.js';
import { Persistence } from '../ui/persistence.js';
import { renderStudyList } from './design.js';
import { byId, h, fmt, debounce, downloadBlob, fileName } from '../ui/dom.js';
import { hydrateIcons } from '../ui/icons.js';
import { readPref, writePref } from '../ui/prefs.js';

/** @import { Vehicle, PlacedLamp, Facing } from '../core/vehicle.js' */
/** @import { InstallResult } from '../core/installation.js' */
/** @import { Mesh, Bounds } from '../core/mesh/mesh.js' */
/** @import { ChangeDetail } from '../core/history.js' */
/** @import { RibbonTab, Command, MenuEntry } from '../ui/shell.js' */
/** @import { MeasureAdapter } from '../ui/measure.js' */
/** @import { InspectorConfig } from '../ui/inspector.js' */
/** @import { CutlineApp } from '../app.js' */
/** @import { Workspace, ViewEntry, Legend, Interaction } from './workspace.js' */
/** @import { ViewPreset, LampStatus } from '../render/vehicle-view.js' */

/** @typedef {'checks' | 'lamps' | 'visibility' | 'model'} StudyId */
/**
 * @typedef {{ kind: 'placing', target: { index: number } | { role: string } }} Mode
 *   Placing a lamp by clicking the model: the lamp's index, or a new lamp's role.
 * @typedef {{ kind: 'camera', x: number, y: number, moved: boolean, slide: boolean, pivot: number[] | null, depth?: number }
 *   | { kind: 'lamp', index: number, twin: number | null, x: number, y: number, moved: boolean, began: boolean }
 *   | { kind: 'cube', x: number, y: number, moved: boolean }} Drag
 *   A gesture on the canvas: turning or sliding the camera, moving a lamp, or a click on the view cube.
 */

/** The standard views, for the menu and the ribbon. */
const LOOK_FROM = /** @type {[ViewPreset, string][]} */ ([['front', 'Front'], ['rear', 'Rear'], ['left', 'Left'], ['right', 'Right'], ['top', 'Top'], ['iso', '3D']]);

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
    /** @type {Mode | null} */
    this.mode = null;
    /** A run of arrow-key nudges in progress, recorded as one undo step when the key comes up. */
    this.nudging = false;
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
    // How the vehicle is looked at is a preference of this browser, not part of the document.
    this.current.camera.ortho = readPref('cutline-vehicle-ortho') === 'yes';
    this.current.showFields = readPref('cutline-vehicle-fields') !== 'no';
    this.current.showDims = readPref('cutline-vehicle-dimensions') !== 'no';
    this.current.xray = readPref('cutline-vehicle-xray') === 'yes';
    this.current.surface = (origin, dir) => this.bvh?.intersect(/** @type {[number, number, number]} */ (origin), /** @type {[number, number, number]} */ (dir))?.t ?? null;
    /** @type {Drag | null} */
    this.drag = null;
    /** @type {Interaction} */
    this.interaction = {
      down: (e, x, y) => this.pointerDown(e, x, y),
      move: (e, x, y) => this.pointerMove(e, x, y),
      up: (e, x, y) => this.pointerUp(e, x, y),
      cancel: () => this.cancelDrag(),
    };
    window.addEventListener('keyup', e => { if (e.key.startsWith('Arrow')) this.endNudge(); });
    window.addEventListener('blur', () => this.endNudge());
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
    this.cancelDrag();
    this.endNudge();
    this.current.active = false;
    this.current.hover = null;
    this.mode = null;
    byId('viewportEmpty').hidden = true;
  }

  title() { return this.doc.title; }
  /** @param {string} title */
  rename(title) { this.edit('Rename vehicle', d => { d.title = title; }); }

  /** @param {string} label @param {(v: Vehicle) => void} mutate */
  edit(label, mutate) {
    this.endNudge();
    try { this.store.transact(label, mutate); } catch (e) { this.app.toasts.show(e instanceof Error ? e.message : String(e), { kind: 'error' }); }
  }

  /** @param {ChangeDetail} detail */
  onChange(detail) {
    if (this.selected !== null && this.selected >= this.doc.lamps.length) this.selected = this.doc.lamps.length ? this.doc.lamps.length - 1 : null;
    if (detail.kind === 'preview') { this.inspector.refreshValues(); this.refreshFrame(); this.recheck(); return; }
    if (detail.kind === 'rollback') { this.inspector.refreshValues(true); this.recheck(); return; }
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
    view.dims = this.selected !== null && r && this.bounds ? dimensionsFor(this.selected, this.doc.lamps, r.items, overallWidth(this.doc, this.bounds)) : [];
    view.request();
    if (this.isActive) { this.renderStudies(); this.renderDock(); this.renderStatus(); }
  }

  // ---------- Pointer ----------

  /** A press on the canvas: the view cube, a lamp to move, or the camera to turn or slide.
   * @param {PointerEvent} e @param {number} x @param {number} y */
  pointerDown(e, x, y) {
    this.endNudge();
    this.current.stop();
    if (e.button === 0 && !e.ctrlKey) {
      if (this.current.cubeAt(x, y)) { this.drag = { kind: 'cube', x, y, moved: false }; return true; }
      const lamp = !this.mode && !this.app.measure.active ? this.current.lampAt(x, y) : null;
      if (lamp !== null) {
        if (lamp !== this.selected) this.select(lamp);
        this.drag = { kind: 'lamp', index: lamp, twin: this.twinOf(lamp), x, y, moved: false, began: false };
        return true;
      }
    }
    const slide = e.shiftKey || e.button === 1 || e.button === 2;
    const hit = this.pick(x, y)?.point ?? null;
    // Turn about the model point under the pointer, or the target when the pointer is off the model.
    this.drag = { kind: 'camera', x, y, moved: false, slide, pivot: slide ? null : hit ?? [...this.current.camera.target], depth: hit ? this.current.depthOf(hit) : undefined };
    return true;
  }

  /** @param {PointerEvent} e @param {number} x @param {number} y */
  pointerMove(e, x, y) {
    const d = this.drag;
    if (!d) { this.hoverAt(x, y); return false; }
    const dx = x - d.x, dy = y - d.y;
    if (!d.moved && Math.hypot(dx, dy) < 3) return true;
    d.moved = true;
    if (d.kind === 'camera') {
      if (d.slide) this.current.slide(dx, dy, d.depth);
      else { this.current.pivot = d.pivot; this.current.orbit(dx, dy, d.pivot ?? undefined); }
      d.x = x; d.y = y;
      this.app.updateScale();
    } else if (d.kind === 'lamp') this.dragLamp(d, x, y, e);
    return true;
  }

  /** @param {PointerEvent} e @param {number} x @param {number} y */
  pointerUp(e, x, y) {
    const d = this.drag;
    this.drag = null;
    this.current.pivot = null;
    this.current.snap = null;
    if (!d) return true;
    if (d.kind === 'cube') { const face = this.current.cubeAt(x, y); if (!d.moved && face) { this.current.preset(face); this.app.updateScale(); } }
    else if (d.kind === 'lamp') { if (d.began) this.commitDrag(); }
    else if (!d.moved && e.button === 0) this.click(x, y);
    this.current.request();
    this.hoverAt(x, y);
    return true;
  }

  /** Ends a gesture without its click, putting back a lamp that was being moved. */
  cancelDrag() {
    const d = this.drag;
    this.drag = null;
    this.current.pivot = null;
    this.current.snap = null;
    if (d?.kind === 'lamp' && d.began) this.store.cancel();
    this.current.request();
  }

  /** The lamp and view cube face under the pointer, lit and given a cursor. @param {number} x @param {number} y */
  hoverAt(x, y) {
    const view = this.current;
    const face = view.cubeAt(x, y);
    const lamp = face || !this.bounds ? null : view.lampAt(x, y);
    if (lamp !== view.hover || face !== view.cubeHover) { view.hover = lamp; view.cubeHover = face; view.request(); }
    this.app.viewport.dataset.cursor = face ? 'handle' : this.app.measure.active ? 'crosshair' : this.mode ? 'place' : lamp !== null ? 'move' : 'grab';
  }

  /** Moves the dragged lamp to the model point under the pointer, snapping to its twin's mirror image unless Alt is
   * held; with Shift its twin moves too, mirrored. @param {Extract<Drag, { kind: 'lamp' }>} d @param {number} x @param {number} y @param {PointerEvent} e */
  dragLamp(d, x, y, e) {
    const hit = this.pick(x, y);
    if (!hit) return;
    if (!d.began) { this.store.begin('Move a lamp'); d.began = true; }
    const lamps = this.store.doc.lamps, l = lamps[d.index], twin = d.twin !== null ? lamps[d.twin] : null;
    let p = hit.point.map(Math.round);
    this.current.snap = null;
    if (twin && !e.altKey && !e.shiftKey) {
      const mirror = [twin.x, -twin.y, twin.z];
      const a = this.current.project(mirror), b = this.current.project(hit.point);
      if (a && b && Math.hypot(a[0] - b[0], a[1] - b[1]) < 10) {
        p = mirror;
        this.current.snap = { a: [twin.x, twin.y, twin.z], b: mirror, text: `Mirrors ${twin.name.toLowerCase()}` };
      }
    }
    Object.assign(l, { x: p[0], y: p[1], z: p[2] });
    // A side lamp faces the side it is on.
    if (INSTALL_ROLES[l.role].facing === 'side') l.facing = p[1] >= 0 ? 'left' : 'right';
    if (twin && e.shiftKey) {
      Object.assign(twin, { x: p[0], y: -p[1], z: p[2] });
      if (INSTALL_ROLES[twin.role].facing === 'side') twin.facing = -p[1] >= 0 ? 'left' : 'right';
    }
    this.store.preview();
    this.app.setStatus(this.current.snap ? `${l.name}: ${this.current.snap.text.toLowerCase()}` : `${l.name}: x ${fmt(p[0], 0)}, y ${fmt(p[1], 0)}, z ${fmt(p[2], 0)} mm`);
  }

  commitDrag() {
    try { this.store.commit(); } catch (error) { this.app.toasts.show(error instanceof Error ? error.message : String(error), { kind: 'error' }); }
  }

  /** The other lamp of a pair: the same function on the other side, facing the same way (or the other side, for a
   * side lamp), nearest the mirror image. @param {number} index */
  twinOf(index) {
    const lamps = this.doc.lamps, l = lamps[index];
    if (!l || Math.abs(l.y) < 1) return null;
    const side = INSTALL_ROLES[l.role].facing === 'side';
    let best = null, bestD = Infinity;
    lamps.forEach((o, j) => {
      if (j === index || o.role !== l.role || Math.sign(o.y) !== -Math.sign(l.y)) return;
      if (side ? o.facing === l.facing : o.facing !== l.facing) return;
      const d = Math.hypot(o.x - l.x, o.y + l.y, o.z - l.z);
      if (d < bestD) { bestD = d; best = j; }
    });
    return best;
  }

  /** Moves the selected lamp by 1 mm (10 mm with Shift) along the vehicle axis nearest an arrow's direction on the
   * screen. A run of nudges is one undo step. @param {string} key @param {boolean} big */
  nudge(key, big) {
    const i = this.selected;
    if (i === null) return;
    const { side, up } = frame(this.current.camera.yaw, this.current.camera.pitch);
    const want = key === 'arrowright' ? [1, 0] : key === 'arrowleft' ? [-1, 0] : key === 'arrowup' ? [0, 1] : [0, -1];
    let axis = [1, 0, 0], best = -Infinity;
    for (const a of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
      const score = dot(a, side) * want[0] + dot(a, up) * want[1];
      if (score > best) { best = score; axis = a; }
    }
    if (!this.nudging) { this.store.begin('Nudge a lamp'); this.nudging = true; }
    const l = this.store.doc.lamps[i], step = big ? 10 : 1;
    l.x += axis[0] * step; l.y += axis[1] * step; l.z += axis[2] * step;
    if (INSTALL_ROLES[l.role].facing === 'side') l.facing = l.y >= 0 ? 'left' : 'right';
    this.store.preview();
    this.app.setStatus(`${l.name}: x ${fmt(l.x, 0)}, y ${fmt(l.y, 0)}, z ${fmt(l.z, 0)} mm`);
  }

  endNudge() {
    if (!this.nudging) return;
    this.nudging = false;
    this.commitDrag();
  }

  /** A click: places a lamp in placing mode, otherwise selects the lamp under the pointer, or nothing.
   * @param {number} x @param {number} y */
  click(x, y) {
    if (this.mode?.kind === 'placing') {
      const hit = this.pick(x, y);
      if (!hit) { this.app.toasts.show('Click on the model, where the lamp\'s centre of reference is.'); return; }
      this.place(hit.point, hit.normal);
      return;
    }
    this.select(this.current.lampAt(x, y));
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
    const placing = this.mode?.kind === 'placing' ? this.mode.target : null;
    if (!placing) return;
    this.mode = null;
    this.app.viewport.dataset.cursor = 'grab';
    this.app.renderLegend();
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
    this.current.hover = null;
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
    this.startPlacing({ role: role.value });
  }

  /** Adds a lamp of a function: at the point the context menu was opened at, or else by a click on the model.
   * @param {string} role */
  placeRole(role) {
    const at = this.app.menuPoint, hit = at ? this.pick(at[0], at[1]) : null;
    if (hit) { this.mode = { kind: 'placing', target: { role } }; this.place(hit.point, hit.normal); return; }
    this.startPlacing({ role });
  }

  movePlacing() {
    if (this.selected === null) return;
    this.startPlacing({ index: this.selected });
  }

  /** @param {{ index: number } | { role: string }} target */
  startPlacing(target) {
    this.app.measure.stop();
    this.mode = { kind: 'placing', target };
    this.app.viewport.dataset.cursor = 'place';
    this.app.setStatus('index' in target ? 'Click the model where the lamp\'s centre of reference is now. Esc cancels.' : 'Click the model where the lamp\'s centre of reference is. Esc cancels.');
    this.app.renderLegend();
  }

  cancelMode() {
    if (!this.mode) return;
    this.mode = null;
    this.app.viewport.dataset.cursor = 'grab';
    this.app.renderLegend();
  }

  cursor() { return this.mode ? 'place' : null; }

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
      hint: this.mode ? 'Click the model where the lamp\'s centre of reference is. Esc cancels.' : this.bounds ? 'Drag to turn, right-drag to move, scroll to zoom. Drag a lamp to move it; right-click for more.' : '',
    };
  }

  /** @returns {ViewEntry[]} */
  views() { return [{ id: 'vehicle', label: '3D', icon: 'cube', hint: 'The vehicle and its lamps' }]; }
  setView() { this.current.request(); }
  /** Lengths read true only without perspective, so the scale bar shows in the orthographic view. */
  scaleUnit() { return this.current.camera.ortho && this.bounds ? { unit: 'mm', text: (/** @type {number} */ x) => `${fmt(x, 0)} mm` } : null; }

  /** @param {number} x @param {number} y */
  readout(x, y) {
    if (!this.bounds) return null;
    if (this.current.cubeAt(x, y)) return null;
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
    view.plain = true;
    for (const preset of /** @type {ViewPreset[]} */ (['front', 'rear', 'iso'])) {
      view.preset(preset, false);
      view.draw();
      out[preset] = view.snapshot().toDataURL('image/png');
    }
    view.plain = false;
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
    /** A view setting kept as a preference of this browser. @param {string} id @param {string} label @param {string} icon @param {string} hint @param {'showFields' | 'showDims' | 'xray'} key @param {string} pref @param {string} [shortcut] */
    const show = (id, label, icon, hint, key, pref, shortcut) => ({ id, label, icon, hint, shortcut, pressed: () => this.current[key], run: () => { this.current[key] = !this.current[key]; writePref(pref, this.current[key] ? 'yes' : 'no'); this.current.request(); } });
    const lamp = () => (this.selected !== null ? this.doc.lamps[this.selected] : null);
    /** @param {StudyId} id @param {string} label @param {string} icon */
    const study = (id, label, icon) => ({ id: `veh-study-${id}`, label: `Show ${label.toLowerCase()}`, icon, pressed: () => this.study === id, run: () => this.showStudy(id) });
    return [
      { id: 'veh-new', label: 'New vehicle', icon: 'new', run: async () => { if (await this.app.confirmReplace(this)) { this.raw = null; this.bounds = null; this.bvh = null; this.current.clearMesh(); this.store.replace(defaultVehicle()); this.renderPanels(); } } },
      { id: 'veh-sample', label: 'Sample vehicle', icon: 'car', hint: 'Try the workspace on a simple sample car', run: () => this.useSample() },
      { id: 'veh-report', label: 'Installation report', icon: 'table', hint: 'Download every check, with pictures, ready to print to PDF', enabled: () => this.results.length > 0, run: () => this.exportReport() },
      { id: 'veh-add', label: 'Add a lamp', icon: 'plus', enabled: has, run: () => this.addLamp() },
      { id: 'veh-move', label: 'Place the lamp again', icon: 'pin', enabled: sel, run: () => this.movePlacing() },
      { id: 'veh-mirror', label: 'Mirror the lamp', icon: 'refresh', hint: 'Add its twin on the other side of the median plane', enabled: () => sel() && this.twinOf(/** @type {number} */ (this.selected)) === null, run: () => this.mirror() },
      { id: 'veh-remove', label: 'Remove the lamp', icon: 'close', shortcut: 'Delete', enabled: sel, run: () => this.remove() },
      { id: 'veh-frame', label: 'Zoom to the lamp', icon: 'fit', shortcut: 'Z', enabled: sel, run: () => { const l = lamp(); if (l) this.current.frameLamp(l); } },
      { id: 'veh-look', label: 'Look along its axis', icon: 'eye', hint: 'See the lamp as an observer in front of it does', enabled: sel, run: () => { const l = lamp(); if (l) this.current.lookAlong(l); } },
      { id: 'veh-copy-lamp', label: 'Copy its position', icon: 'pin', palette: false, enabled: sel, run: () => { const l = lamp(); if (l) this.app.copyText(`x ${fmt(l.x, 0)}, y ${fmt(l.y, 0)}, z ${fmt(l.z, 0)} mm`); } },
      // One command per lamp function, so the menu can add one where it was opened; from the palette it starts placing.
      ...Object.entries(INSTALL_ROLES).map(([role, def]) => ({ id: `veh-place-${role}`, label: `Add a lamp: ${def.name}`, icon: 'plus', enabled: has, run: () => this.placeRole(role) })),
      study('checks', 'Installation', 'pass'), study('lamps', 'Lamps', 'lamp'), study('visibility', 'Visibility', 'eye'), study('model', 'Model', 'cube'),
      { id: 'veh-r48', label: 'UN R48', icon: 'globe', enabled: () => this.results.some(r => r.pack === 'r48'), pressed: () => this.pack === 'r48', run: () => { this.pack = 'r48'; this.showResults(); } },
      { id: 'veh-fmvss', label: 'FMVSS 108', icon: 'globe', enabled: () => this.results.some(r => r.pack === 'fmvss108'), pressed: () => this.pack === 'fmvss108', run: () => { this.pack = 'fmvss108'; this.showResults(); } },
      preset('front', 'Front'), preset('rear', 'Rear'), preset('left', 'Left'), preset('right', 'Right'), preset('top', 'Top'), preset('iso', '3D'),
      { id: 'veh-ortho', label: 'Orthographic', icon: 'cube', hint: 'Draw without perspective, for reading heights and widths', pressed: () => this.current.camera.ortho, run: () => { this.current.camera.ortho = !this.current.camera.ortho; writePref('cutline-vehicle-ortho', this.current.camera.ortho ? 'yes' : 'no'); this.current.request(); this.app.renderLegend(); } },
      show('veh-fields', 'Visibility fields', 'eye', 'Show the selected lamp\'s field of geometric visibility', 'showFields', 'cutline-vehicle-fields'),
      show('veh-dims', 'Dimensions', 'ruler', 'Draw the selected lamp\'s heights, widths and separation on the model', 'showDims', 'cutline-vehicle-dimensions'),
      show('veh-xray', 'See-through body', 'layers', 'Draw the body translucent, to see and pick lamps behind it', 'xray', 'cutline-vehicle-xray', 'X'),
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
        { caption: 'Look', items: [{ cmd: 'veh-frame', size: 'small', label: 'Zoom to it' }, { cmd: 'veh-look', size: 'small', label: 'Along its axis' }] },
        { caption: 'Edit', items: [{ cmd: 'undo', size: 'small' }, { cmd: 'redo', size: 'small' }] },
      ] },
      { id: 'check', label: 'Check', groups: [
        { caption: 'Studies', items: [{ cmd: 'veh-study-checks', label: 'Installation' }, { cmd: 'veh-study-lamps', label: 'Lamps' }, { cmd: 'veh-study-visibility', label: 'Visibility' }, { cmd: 'veh-study-model', label: 'Model' }] },
        { caption: 'Regulation', items: [{ cmd: 'veh-r48', size: 'small', label: 'UN R48' }, { cmd: 'veh-fmvss', size: 'small', label: 'FMVSS 108' }] },
      ] },
      { id: 'view', label: 'View', groups: [
        { caption: 'Look from', items: [{ cmd: 'veh-view-front', size: 'small', label: 'Front' }, { cmd: 'veh-view-rear', size: 'small', label: 'Rear' }, { cmd: 'veh-view-left', size: 'small', label: 'Left' }, { cmd: 'veh-view-right', size: 'small', label: 'Right' }, { cmd: 'veh-view-top', size: 'small', label: 'Top' }, { cmd: 'veh-view-iso', size: 'small', label: '3D' }] },
        { caption: 'Show', items: [{ cmd: 'veh-ortho', label: 'Orthographic' }, { cmd: 'veh-xray', label: 'See-through' }, { cmd: 'veh-dims', size: 'small', label: 'Dimensions' }, { cmd: 'veh-fields', size: 'small', label: 'Fields' }] },
        { caption: 'Tools', items: [{ cmd: 'measure', label: 'Measure' }] },
        { caption: 'Camera', items: [{ cmd: 'fit', label: 'Fit' }, { cmd: 'zoom-in', size: 'small' }, { cmd: 'zoom-out', size: 'small' }] },
        { caption: 'Panels', items: [{ cmd: 'toggle-studies', size: 'small', label: 'Studies' }, { cmd: 'toggle-inspector', size: 'small', label: 'Design' }, { cmd: 'toggle-theme', label: 'Dark theme' }] },
      ] },
    ];
  }

  /** @param {string} key @param {KeyboardEvent} e */
  key(key, e) {
    if (!key.startsWith('arrow')) this.endNudge();
    if (key === 'escape') {
      e.preventDefault();
      if (this.drag?.kind === 'lamp') this.cancelDrag();
      else if (this.mode) this.cancelMode();
      else if (this.selected !== null) this.select(null);
      return null;
    }
    // Arrows nudge the selected lamp while nothing else has the keyboard.
    if (key.startsWith('arrow') && this.selected !== null && this.bounds && (e.target === document.body || e.target instanceof HTMLCanvasElement)) {
      e.preventDefault();
      this.nudge(key, e.shiftKey);
      return null;
    }
    return ({ a: 'veh-add', m: 'veh-mirror', z: 'veh-frame', x: 'veh-xray', delete: 'veh-remove', backspace: 'veh-remove' })[key] ?? null;
  }

  /** @returns {[string, string][]} */
  shortcuts() {
    return [
      ['Add a lamp', 'A, or right-click the model'], ['Move a lamp', 'Drag it; Shift moves its twin too, Alt stops snapping'], ['Nudge the selected lamp', 'Arrow keys; Shift for 10 mm'],
      ['Mirror the selected lamp', 'M'], ['Remove the selected lamp', 'Delete'], ['Zoom to the selected lamp', 'Z, or double-click it'], ['See through the body', 'X'],
      ['Turn the view', 'Drag; it turns about the point under the pointer'], ['Move the view', 'Right-drag, middle-drag or Shift-drag'], ['Standard views', 'Click the view cube'],
      ['Cancel placing, or clear the selection', 'Esc'],
    ];
  }

  // ---------- Canvas menu, position and measuring ----------

  /** The context menu for a canvas point: the lamp under it, the model under it, or the view.
   * @param {number} x @param {number} y @returns {MenuEntry[]} */
  menu(x, y) {
    this.cancelMode();
    if (!this.bounds) return [{ cmd: 'open', label: 'Open a vehicle model' }, { cmd: 'veh-sample' }];
    /** @type {MenuEntry[]} */
    const view = [
      { cmd: 'fit' }, { label: 'Look from', icon: 'cube', items: LOOK_FROM.map(([p, label]) => ({ cmd: `veh-view-${p}`, label })) }, '-',
      { cmd: 'veh-ortho' }, { cmd: 'veh-xray' }, { cmd: 'veh-dims' }, { cmd: 'veh-fields' },
    ];
    const lamp = this.current.lampAt(x, y);
    if (lamp !== null) {
      if (lamp !== this.selected) this.select(lamp);
      return [
        { heading: this.doc.lamps[lamp].name }, { cmd: 'veh-frame' }, { cmd: 'veh-look' }, { cmd: 'veh-study-visibility', label: 'Show its visibility' }, '-',
        { cmd: 'veh-move' }, { cmd: 'veh-mirror' }, { cmd: 'veh-remove' }, '-', { cmd: 'veh-copy-lamp' }, { cmd: 'measure-here', label: 'Measure from its centre' },
      ];
    }
    if (this.pick(x, y)) {
      /** @type {MenuEntry[]} */
      const roles = [];
      for (const [facing, heading] of /** @type {const} */ ([['front', 'Front'], ['side', 'Side'], ['rear', 'Rear']])) {
        roles.push({ heading }, ...Object.entries(INSTALL_ROLES).filter(([, d]) => d.facing === facing).map(([role, d]) => ({ cmd: `veh-place-${role}`, label: d.name })));
      }
      return [{ label: 'Add a lamp here', icon: 'plus', items: roles }, { cmd: 'centre-here' }, { cmd: 'measure-here' }, { cmd: 'copy-position' }, '-', ...view];
    }
    return [...view, '-', { cmd: 'veh-add' }];
  }

  /** The menu opens from the keyboard at the selected lamp. @returns {[number, number] | null} */
  menuAnchor() {
    const l = this.selected !== null ? this.doc.lamps[this.selected] : null;
    const p = l ? this.current.project([l.x, l.y, l.z]) : null;
    return p ? [p[0], p[1]] : null;
  }

  /** The model point under the pointer. @param {number} x @param {number} y */
  position(x, y) {
    if (!this.bounds || this.current.cubeAt(x, y)) return null;
    const hit = this.pick(x, y);
    return hit ? `x ${fmt(hit.point[0], 0)}, y ${fmt(hit.point[1], 0)}, z ${fmt(hit.point[2], 0)} mm` : null;
  }

  /** Measuring between model points, snapped to a lamp's centre of reference. @returns {MeasureAdapter | null} */
  measure() {
    if (!this.bounds) return null;
    return {
      point: (x, y) => {
        const lamp = this.current.lampAt(x, y);
        if (lamp !== null) { const l = this.doc.lamps[lamp]; return { p: [l.x, l.y, l.z], label: l.name }; }
        const hit = this.pick(x, y);
        return hit ? { p: hit.point } : null;
      },
      screen: m => this.current.project(m.p),
      describe: (a, b) => {
        const d = [0, 1, 2].map(k => b.p[k] - a.p[k]);
        return [`${fmt(Math.hypot(d[0], d[1], d[2]), 0)} mm`, `x ${fmt(d[0], 0)}, y ${fmt(d[1], 0)}, z ${fmt(d[2], 0)} mm`];
      },
    };
  }

  /** A double-click on a lamp zooms to it. @param {number} x @param {number} y */
  dblclick(x, y) {
    if (this.current.cubeAt(x, y)) return true;
    const lamp = this.current.lampAt(x, y);
    if (lamp === null) return false;
    this.select(lamp);
    this.current.frameLamp(this.doc.lamps[lamp]);
    return true;
  }
}

/** The overall width a vehicle uses, before its model is open. @param {Vehicle} v @param {Bounds | null} bounds */
function overallWidthOf(v, bounds) {
  return bounds ? overallWidth(v, bounds) : v.vehicle.overallWidth;
}
