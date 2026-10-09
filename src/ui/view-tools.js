/** What the 2D views offer the canvas tools: the position under the pointer in each view's own terms, for the status
 * bar and "Copy the position", and the measure tool's adapters. The beam is in degrees, the road in metres and the
 * lamp's sections in millimetres. */

import { fmt } from './dom.js';

/** @import { BeamView } from '../render/beam-view.js' */
/** @import { RoadView } from '../render/road-view.js' */
/** @import { LampView } from '../render/lamp-view.js' */
/** @import { MeasureAdapter } from './measure.js' */

/** A direction as the regulations write it. @param {number} h @param {number} v */
export function direction(h, v) { return `${fmt(Math.abs(h), 2)}°${h >= 0 ? 'R' : 'L'}, ${fmt(Math.abs(v), 2)}°${v >= 0 ? 'U' : 'D'}`; }

/** @param {BeamView} view @param {number} x @param {number} y */
export function beamPosition(view, x, y) { const [h, v] = view.toAngles(x, y); return direction(h, v); }

/** @param {RoadView} view @param {number} x @param {number} y */
export function roadPosition(view, x, y) {
  const [across, ahead] = view.toRoad(x, y);
  return `${fmt(ahead, 1)} m ahead, ${fmt(Math.abs(across), 1)} m ${across >= 0 ? 'right' : 'left'}`;
}

const SECTION = { side: ['Side section', 'up'], top: ['Top section', 'right'] };

/** @param {LampView} view @param {number} x @param {number} y */
export function lampPosition(view, x, y) {
  const s = view.toSection(x, y);
  if (!s) return null;
  const [name, across] = SECTION[s.view];
  return `${name}: ${fmt(s.u, 1)} mm along the axis, ${fmt(s.w, 1)} mm ${across}`;
}

/** The angle between two directions (H, V) in degrees, H turning about the vertical and V the elevation.
 * @param {number[]} a @param {number[]} b */
export function angleBetween(a, b) {
  const r = Math.PI / 180;
  /** @param {number[]} p */
  const vec = p => [Math.cos(p[1] * r) * Math.cos(p[0] * r), Math.cos(p[1] * r) * Math.sin(p[0] * r), Math.sin(p[1] * r)];
  const u = vec(a), w = vec(b);
  return Math.acos(Math.max(-1, Math.min(1, u[0] * w[0] + u[1] * w[1] + u[2] * w[2]))) / r;
}

/** @param {number} cd */
const candela = cd => `${fmt(cd, cd < 10 ? 2 : 0)} cd`;

/** Measuring on the beam: the angle between two directions and the intensity at each, snapped to a test point.
 * @param {BeamView} view @returns {MeasureAdapter} */
export function beamMeasure(view) {
  return {
    point: (x, y) => {
      const m = view.markerAt(x, y);
      return m ? { p: [m.h, m.v], label: m.label } : { p: view.toAngles(x, y) };
    },
    screen: m => view.toScreen(m.p[0], m.p[1]),
    describe: (a, b) => {
      const lines = [`${fmt(angleBetween(a.p, b.p), 2)}° apart`, `H ${fmt(b.p[0] - a.p[0], 2)}°, V ${fmt(b.p[1] - a.p[1], 2)}°`];
      const ca = view.candelaAt(a.p[0], a.p[1]), cb = view.candelaAt(b.p[0], b.p[1]);
      if (Number.isFinite(ca) && Number.isFinite(cb)) lines.push(`${candela(ca)} to ${candela(cb)}${ca > 0 ? `, ×${fmt(cb / ca, 2)}` : ''}`);
      return lines;
    },
  };
}

/** Measuring on the road: the distance between two points and the illuminance at each. @param {RoadView} view @returns {MeasureAdapter} */
export function roadMeasure(view) {
  return {
    point: (x, y) => ({ p: view.toRoad(x, y) }),
    screen: m => view.toScreen(m.p[0], m.p[1]),
    describe: (a, b) => {
      const across = b.p[0] - a.p[0], ahead = b.p[1] - a.p[1];
      const lines = [`${fmt(Math.hypot(across, ahead), 2)} m`, `${fmt(ahead, 2)} m ahead, ${fmt(across, 2)} m across`];
      const la = view.luxAt(a.p[0], a.p[1]), lb = view.luxAt(b.p[0], b.p[1]);
      if (Number.isFinite(la) && Number.isFinite(lb)) lines.push(`${fmt(la, la < 10 ? 2 : 0)} lx to ${fmt(lb, lb < 10 ? 2 : 0)} lx`);
      return lines;
    },
  };
}

/** Measuring in one of the lamp's sections, in millimetres. @param {LampView} view @returns {MeasureAdapter} */
export function lampMeasure(view) {
  return {
    point: (x, y) => { const s = view.toSection(x, y); return s ? { p: [s.u, s.w], pane: s.view } : null; },
    screen: m => view.fromSection(/** @type {'side' | 'top'} */ (m.pane), m.p[0], m.p[1]),
    describe: (a, b) => {
      const du = b.p[0] - a.p[0], dw = b.p[1] - a.p[1];
      return [`${fmt(Math.hypot(du, dw), 2)} mm`, `${fmt(du, 2)} mm along the axis, ${fmt(dw, 2)} mm ${SECTION[/** @type {'side' | 'top'} */ (a.pane)][1]}`];
    },
  };
}

/** Scrolls a requirement's row in the results table into view, focuses it (which picks it out on the beam) and
 * flashes it. @param {string} id */
export function revealRow(id) {
  const row = /** @type {HTMLElement | null} */ (document.querySelector(`#dock .req-row[data-id="${CSS.escape(id)}"]`));
  if (!row) return false;
  row.scrollIntoView({ block: 'center' });
  row.focus({ preventScroll: true });
  row.classList.remove('flash');
  void row.offsetWidth;
  row.classList.add('flash');
  setTimeout(() => row.classList.remove('flash'), 1300);
  return true;
}
