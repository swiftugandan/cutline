/** What the file's own cut-off says about the traffic side, set against the side the study says the lamp is made
 * for. The design panel shows it under Made for, the markets dock and the report show a disagreement, and the File
 * study lists it. */

import { h, fmt } from './dom.js';

/** @import { Study } from '../core/study.js' */
/** @import { TrafficReading } from '../core/traffic-side.js' */

/**
 * @typedef {{ kind: 'match' | 'mismatch' | 'unknown', side: 'right' | 'left' | null, text: string, fact: string }} TrafficVerdict
 *   text: a sentence for a note; fact: a short value for a table of facts.
 */

const NOT_SHOWN = 'so it does not show which traffic side the lamp is for';

/**
 * The reading against the study, or null when there is none to show: the lamp is not a passing beam, or the file has
 * not been read yet.
 * @param {Study} study @param {TrafficReading | null | undefined} reading
 * @returns {TrafficVerdict | null}
 */
export function trafficVerdict(study, reading) {
  if (study.lamp.role !== 'passing' || !reading) return null;
  if (!reading.side) {
    const [text, fact] = reading.reason === 'level' ? [`The file's cut-off sits level on both sides, ${NOT_SHOWN}.`, 'Not shown: the cut-off is level']
      : reading.reason === 'coarse' ? [`The file's vertical angles are too far apart to place the cut-off, ${NOT_SHOWN}.`, 'Not shown: the angles are too far apart']
      : [`The file has no clear cut-off on both sides of V-V, ${NOT_SHOWN}.`, 'Not shown: no clear cut-off'];
    return { kind: 'unknown', side: null, text, fact };
  }
  const higher = reading.side, lower = higher === 'right' ? 'left' : 'right';
  const shape = `The file's cut-off sits ${fmt(Math.abs(reading.rise), 1)}° higher on the ${higher} than on the ${lower}, as on a lamp for ${higher}-hand traffic`;
  const fact = `${higher === 'right' ? 'Right' : 'Left'}-hand: the cut-off sits ${fmt(Math.abs(reading.rise), 1)}° higher on the ${higher}`;
  return reading.side === study.lamp.traffic
    ? { kind: 'match', side: higher, text: `${shape}.`, fact }
    : { kind: 'mismatch', side: higher, text: `${shape}, but the study says it is made for ${study.lamp.traffic}-hand traffic, so every lamp checked is the wrong way round.`, fact };
}

/**
 * The note for a verdict. A disagreement is a warning with the fix one click away; agreement and an unreadable beam are
 * quiet, and left out entirely with onlyMismatch.
 * @param {Study} study @param {TrafficReading | null | undefined} reading @param {{ onlyMismatch?: boolean }} [options]
 * @returns {HTMLElement | null}
 */
export function trafficNote(study, reading, { onlyMismatch = false } = {}) {
  const v = trafficVerdict(study, reading);
  if (!v || (onlyMismatch && v.kind !== 'mismatch')) return null;
  if (v.kind !== 'mismatch') return h('p', { class: 'aim-note subtle traffic-note', 'data-kind': v.kind }, [h('span', { 'data-icon': 'info' }), h('span', { text: v.text })]);
  const fix = h('button', { class: 'outline-button', type: 'button', 'data-cmd': `ph-traffic-${v.side}` }, [h('span', { 'data-icon': 'road' }), h('span', { text: `Set to ${v.side}-hand traffic` })]);
  return h('div', { class: 'aim-note traffic-note', role: 'note', 'data-kind': v.kind }, [h('span', { 'data-icon': 'alert' }), h('div', {}, [h('span', { text: v.text }), fix])]);
}
