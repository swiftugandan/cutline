/** Where lamps sit on a vehicle, checked against UN R48 and FMVSS 108: presence and number for the vehicle's
 * category, height above the ground, distance from the outer edge, separation of a pair, and the angles of geometric
 * visibility, with bodywork obstruction found by casting rays from the apparent surface. The rules are data in
 * ./regulation/data/r48.js and ./regulation/data/fmvss108-installation.js. See docs/REGULATION.md, "Installation". */

import { DEVICES as R48_DEVICES, SOURCE as R48_SOURCE } from './regulation/data/r48.js';
import { DEVICES as FMVSS_DEVICES, SOURCE as FMVSS_SOURCE } from './regulation/data/fmvss108-installation.js';

/** @import { Vehicle, PlacedLamp } from './vehicle.js' */
/** @import { Bvh } from './mesh/bvh.js' */
/** @import { Bounds } from './mesh/mesh.js' */

/**
 * The lamp functions a vehicle carries, with the device each regulation's installation data calls them, the way
 * the lamp usually faces, and a typical apparent surface (mm) to start from.
 * @type {Record<string, { name: string, r48?: string, fmvss?: string, facing: 'front' | 'rear' | 'side', size: [number, number], pair: boolean }>}
 */
export const INSTALL_ROLES = {
  passing: { name: 'Passing beam (low beam)', r48: 'passing-beam', fmvss: 'lower-beam-headlamp', facing: 'front', size: [150, 60], pair: true },
  driving: { name: 'Driving beam (high beam)', r48: 'driving-beam', fmvss: 'upper-beam-headlamp', facing: 'front', size: [150, 60], pair: true },
  'front-fog': { name: 'Front fog lamp', r48: 'front-fog', facing: 'front', size: [90, 50], pair: true },
  drl: { name: 'Daytime running lamp', r48: 'daytime-running-lamp', fmvss: 'daytime-running-lamp', facing: 'front', size: [200, 25], pair: true },
  'front-position': { name: 'Front position lamp', r48: 'front-position-lamp', fmvss: 'parking-lamp', facing: 'front', size: [120, 25], pair: true },
  'turn-front': { name: 'Front direction indicator', r48: 'front-direction-indicator', fmvss: 'front-turn-signal-lamp', facing: 'front', size: [100, 40], pair: true },
  'turn-side-5': { name: 'Side direction indicator (category 5)', r48: 'side-direction-indicator-5', facing: 'side', size: [50, 20], pair: true },
  'turn-side-6': { name: 'Side direction indicator (category 6)', r48: 'side-direction-indicator-6', facing: 'side', size: [80, 30], pair: true },
  // FMVSS 108 sets front and rear side markers apart; R48 has one side marker lamp for both.
  'side-marker': { name: 'Side marker lamp, front', r48: 'side-marker', fmvss: 'side-marker-lamp-front', facing: 'side', size: [60, 25], pair: true },
  'side-marker-rear': { name: 'Side marker lamp, rear', r48: 'side-marker', fmvss: 'side-marker-lamp-rear', facing: 'side', size: [60, 25], pair: true },
  'end-outline': { name: 'End-outline marker lamp', r48: 'end-outline-marker', fmvss: 'clearance-lamp-front', facing: 'front', size: [60, 25], pair: true },
  cornering: { name: 'Cornering lamp', r48: 'cornering-lamp', facing: 'side', size: [60, 40], pair: true },
  'rear-position': { name: 'Rear position lamp (tail lamp)', r48: 'rear-position-lamp', fmvss: 'taillamp', facing: 'rear', size: [150, 40], pair: true },
  stop: { name: 'Stop lamp', r48: 'stop-lamp-s1-s2', fmvss: 'stop-lamp', facing: 'rear', size: [150, 50], pair: true },
  'high-mounted-stop': { name: 'High-mounted stop lamp', r48: 'stop-lamp-s3-s4', fmvss: 'high-mounted-stop-lamp', facing: 'rear', size: [300, 20], pair: false },
  'turn-rear': { name: 'Rear direction indicator', r48: 'rear-direction-indicator', fmvss: 'rear-turn-signal-lamp', facing: 'rear', size: [100, 40], pair: true },
  reversing: { name: 'Reversing lamp', r48: 'reversing', fmvss: 'backup-lamp', facing: 'rear', size: [80, 40], pair: true },
  'rear-fog': { name: 'Rear fog lamp', r48: 'rear-fog', facing: 'rear', size: [80, 40], pair: false },
  parking: { name: 'Parking lamp', r48: 'parking-lamp', facing: 'front', size: [80, 30], pair: true },
  'registration-plate': { name: 'Rear registration plate lamp', r48: 'rear-registration-plate-lamp', fmvss: 'licence-plate-lamp', facing: 'rear', size: [40, 20], pair: false },
};

/**
 * @typedef {'pass' | 'near' | 'fail' | 'info'} CheckStatus
 * @typedef {{ id: string, lamp: number | null, role: string, check: 'presence' | 'count' | 'height' | 'width' | 'separation' | 'visibility' | 'rule',
 *   label: string, requirement: string, value: number, unit: string, margin: number, status: CheckStatus, cite: string, note?: string }} InstallItem
 *   lamp: the lamp's index in the document, or null for a vehicle-level check.
 * @typedef {{ beta: number, alpha: number, visible: number }} Sight
 *   A direction (β across, positive outwards or forwards; α up) and the share of the apparent surface seen from it.
 * @typedef {{ sights: Sight[], field: { up: number, down: number, out: number, in: number, inBelowH?: number }, side: boolean }} VisibilityMap
 * @typedef {{ pack: 'r48' | 'fmvss108', title: string, source: { title: string, document: string, url?: string }, items: InstallItem[], maps: Map<number, VisibilityMap> }} InstallResult
 */

/** @param {number} value @param {number | undefined} min @param {number | undefined} max */
function margin(value, min, max) {
  const a = min !== undefined ? (value - min) / Math.max(1, Math.abs(min)) : Infinity;
  const b = max !== undefined ? (max - value) / Math.max(1, Math.abs(max)) : Infinity;
  return Math.min(a, b);
}

/** A status from a margin: within 5% of a length limit is near it. @param {number} m @returns {CheckStatus} */
const statusOf = m => (m < 0 ? 'fail' : m < 0.05 ? 'near' : 'pass');

/** @param {number} x */
const mm = x => `${Math.round(x).toLocaleString('en-GB')} mm`;

/** A lamp's frame: its reference axis, the horizontal direction across its apparent surface (outwards, or forwards
 * for a lamp facing sideways) and up. @param {PlacedLamp} lamp */
export function lampFrame(lamp) {
  const side = lamp.facing === 'left' || lamp.facing === 'right';
  /** @type {[number, number, number]} */
  const axis = lamp.facing === 'front' ? [1, 0, 0] : lamp.facing === 'rear' ? [-1, 0, 0] : lamp.facing === 'left' ? [0, 1, 0] : [0, -1, 0];
  // Across: outwards (away from the median plane) for a front or rear lamp, forwards for a side lamp.
  /** @type {[number, number, number]} */
  const across = side ? [1, 0, 0] : [0, lamp.y >= 0 ? 1 : -1, 0];
  return { axis, across, up: /** @type {[number, number, number]} */ ([0, 0, 1]), side };
}

/** The overall width: the document's, or the model's when it gives none. @param {Vehicle} v @param {Bounds} bounds */
export function overallWidth(v, bounds) {
  return v.vehicle.overallWidth > 0 ? v.vehicle.overallWidth : bounds.max[1] - bounds.min[1];
}

/**
 * The share of the apparent surface seen from each direction of a field. Each sample point of the apparent surface
 * is first moved out to the exterior of the lens (the outermost model surface along the reference axis within 80 mm),
 * then a ray is cast towards the observer. Hits inside the lamp's own footprint (the prism the apparent surface
 * sweeps along its axis) are the lamp itself and do not count.
 * @param {PlacedLamp} lamp @param {Bvh | null} bvh
 * @param {{ up: number, down: number, out: number, in: number, inBelowH?: number }} field degrees
 * @returns {VisibilityMap}
 */
export function visibilityMap(lamp, bvh, field) {
  const { axis, across, up, side } = lampFrame(lamp);
  const c = [lamp.x, lamp.y, lamp.z];
  const nu = Math.max(3, Math.min(9, Math.round(lamp.width / 25) + 1)), nv = Math.max(2, Math.min(5, Math.round(lamp.height / 20) + 1));
  /** @type {[number, number, number][]} */
  const samples = [];
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
    const u = (i / (nu - 1) - 0.5) * lamp.width * 0.96, w = (j / (nv - 1) - 0.5) * lamp.height * 0.96;
    /** @type {[number, number, number]} */
    let s = [c[0] + u * across[0] + w * up[0], c[1] + u * across[1] + w * up[1], c[2] + u * across[2] + w * up[2]];
    if (bvh) {
      const from = /** @type {[number, number, number]} */ ([s[0] + 80 * axis[0], s[1] + 80 * axis[1], s[2] + 80 * axis[2]]);
      const hit = bvh.intersect(from, [-axis[0], -axis[1], -axis[2]], 0, 160);
      if (hit) s = [from[0] - hit.t * axis[0], from[1] - hit.t * axis[1], from[2] - hit.t * axis[2]];
    }
    samples.push(s);
  }
  /** Whether a point lies in the lamp's own footprint prism. @param {number[]} p */
  const own = p => {
    const d = [p[0] - c[0], p[1] - c[1], p[2] - c[2]];
    const a = d[0] * axis[0] + d[1] * axis[1] + d[2] * axis[2];
    const u = d[0] * across[0] + d[1] * across[1] + d[2] * across[2];
    const w = d[2];
    return Math.abs(u) <= lamp.width / 2 + 3 && Math.abs(w) <= lamp.height / 2 + 3 && a > -300 && a < 120;
  };
  /** @type {Sight[]} */
  const sights = [];
  const steps = (/** @type {number} */ lo, /** @type {number} */ hi) => {
    const out = [];
    for (let x = lo; x < hi - 1e-9; x += 5) out.push(x);
    out.push(hi);
    return out;
  };
  for (const alpha of steps(-field.down, field.up)) {
    const inward = alpha < 0 && field.inBelowH !== undefined ? field.inBelowH : field.in;
    for (const beta of steps(-inward, field.out)) {
      const a = (alpha * Math.PI) / 180, b = (beta * Math.PI) / 180;
      /** @type {[number, number, number]} */
      const d = [
        Math.cos(a) * (Math.cos(b) * axis[0] + Math.sin(b) * across[0]) + Math.sin(a) * up[0],
        Math.cos(a) * (Math.cos(b) * axis[1] + Math.sin(b) * across[1]) + Math.sin(a) * up[1],
        Math.cos(a) * (Math.cos(b) * axis[2] + Math.sin(b) * across[2]) + Math.sin(a) * up[2],
      ];
      let seen = 0;
      for (const s of samples) {
        if (!bvh) { seen++; continue; }
        let t = 0.5, blocked = false;
        // Walk past hits inside the lamp's own footprint.
        for (let k = 0; k < 8; k++) {
          const hit = bvh.intersect(s, d, t, 20000);
          if (!hit) break;
          const p = [s[0] + hit.t * d[0], s[1] + hit.t * d[1], s[2] + hit.t * d[2]];
          if (!own(p)) { blocked = true; break; }
          t = hit.t + 0.5;
        }
        if (!blocked) seen++;
      }
      sights.push({ beta, alpha, visible: seen / samples.length });
    }
  }
  return { sights, field, side };
}

/** Lamps of one role on one side of the vehicle. @param {Vehicle} v @param {string} role */
function lampsOf(v, role) {
  return v.lamps.map((l, i) => ({ l, i })).filter(x => x.l.role === role);
}

/**
 * Checks a vehicle against one regulation.
 * @param {Vehicle} v @param {Bounds} bounds @param {Bvh | null} bvh @param {'r48' | 'fmvss108'} pack
 * @returns {InstallResult}
 */
export function checkInstallation(v, bounds, bvh, pack) {
  const r48 = pack === 'r48';
  /** @type {InstallItem[]} */
  const items = [];
  /** @type {Map<number, VisibilityMap>} */
  const maps = new Map();
  const width = overallWidth(v, bounds);
  const cat = v.vehicle.category, type = v.vehicle.fmvssType;
  for (const [role, def] of Object.entries(INSTALL_ROLES)) {
    const deviceId = r48 ? def.r48 : def.fmvss;
    if (!deviceId) continue;
    /** @type {any} */
    const device = (r48 ? R48_DEVICES : FMVSS_DEVICES).find(d => d.id === deviceId);
    if (!device) continue;
    const placed = lampsOf(v, role);
    const presence = String(device.presence?.[r48 ? cat : type] ?? '');
    if (!placed.length) {
      if (/^mandatory/.test(presence)) items.push({ id: `${role}:presence`, lamp: null, role, check: 'presence', label: 'Not placed', requirement: `mandatory on ${r48 ? `category ${cat}` : 'this vehicle type'}`, value: 0, unit: '', margin: NaN, status: 'fail', cite: device.presence.cite });
      continue;
    }
    // Number of lamps.
    const count = device.count ?? {};
    const maxCount = count.maxByCategory?.[cat] ?? count.max, minCount = count.minByCategory?.[cat] ?? count.min;
    if (minCount !== undefined || maxCount !== undefined) {
      const m = margin(placed.length, minCount, maxCount);
      items.push({ id: `${role}:count`, lamp: null, role, check: 'count', label: 'Number of lamps', requirement: minCount === maxCount ? `${minCount}` : `${minCount ?? 0} to ${maxCount ?? 'any'}`, value: placed.length, unit: '', margin: m < 0 ? m : NaN, status: m < 0 ? 'fail' : 'pass', cite: count.cite ?? device.presence?.cite ?? '', note: count.text });
    }
    for (const { l, i } of placed) {
      const top = l.z + l.height / 2, bottom = l.z - l.height / 2;
      // Height: R48 measures the apparent surface's lowest and highest points (§5.8); FMVSS the centre (S6.1.4).
      const h = device.height ?? {};
      const centre = /center|centre of the item/i.test(String(h.measuredTo ?? '')) && !r48;
      const hMin = h.minByCategory?.[cat] ?? h.min, hMax = h.maxByCategory?.[cat] ?? h.max;
      if (hMin !== undefined) {
        const value = centre ? l.z : bottom, m = margin(value, hMin, undefined);
        items.push({ id: `${role}:${i}:height-min`, lamp: i, role, check: 'height', label: `${l.name}: ${centre ? 'centre' : 'lowest edge'} above the ground`, requirement: `at least ${mm(hMin)}`, value, unit: 'mm', margin: m, status: statusOf(m), cite: h.cite ?? '' });
      }
      if (hMax !== undefined) {
        const value = centre ? l.z : top, m = margin(value, undefined, hMax);
        const alt = h.maxIfBodyworkDoesNotPermit ?? h.maxIfStructureDoesNotPermit;
        const allowed = m < 0 && alt && value <= alt.value;
        items.push({
          id: `${role}:${i}:height-max`, lamp: i, role, check: 'height', label: `${l.name}: ${centre ? 'centre' : 'highest edge'} above the ground`,
          requirement: `at most ${mm(hMax)}${alt ? `, or ${mm(alt.value)} if ${String(alt.condition).replace(/^If /, '').replace(/\.$/, '').toLowerCase()}` : ''}`,
          value, unit: 'mm', margin: m, status: allowed ? 'near' : statusOf(m), cite: h.cite ?? '', note: allowed ? `Allowed only ${String(alt.condition).toLowerCase()}` : undefined,
        });
      }
      for (const k of ['relativeTo', 'aboveS1S2', 'notAbove', 'optionalLampsAboveMandatory', 'maxIfGroupedWithLamp', 'maxIfGroupedWithRearLamp']) {
        if (h[k] !== undefined) { items.push({ id: `${role}:${i}:height-rule`, lamp: i, role, check: 'rule', label: `${l.name}: height relative to other parts`, requirement: String(h.text ?? ''), value: NaN, unit: '', margin: NaN, status: 'info', cite: h.cite ?? '', note: 'Check by hand: it depends on parts Cutline does not identify on the model.' }); break; }
      }
      // Width: the outer edge of the apparent surface against the vehicle's outer edge (§5.8.3).
      const w = device.width ?? {};
      if (!lampFrame(l).side) {
        const outer = Math.abs(l.y) + l.width / 2;
        const onlyFor = w.maxFromOuterEdgeOnlyFor;
        if (w.maxFromOuterEdge !== undefined && (!Array.isArray(onlyFor) || onlyFor.includes(cat))) {
          const value = width / 2 - outer, m = margin(value, undefined, w.maxFromOuterEdge);
          items.push({ id: `${role}:${i}:outer-edge`, lamp: i, role, check: 'width', label: `${l.name}: outer edge to the vehicle's outer edge`, requirement: `at most ${mm(w.maxFromOuterEdge)}`, value, unit: 'mm', margin: m, status: statusOf(m), cite: w.cite ?? '', note: v.vehicle.overallWidth > 0 ? undefined : 'Overall width taken from the model, mirrors included; set it in the design panel.' });
        }
        if (w.maxOffsetFromMedianPlane !== undefined) {
          const value = Math.abs(l.y), m = margin(value, undefined, w.maxOffsetFromMedianPlane);
          items.push({ id: `${role}:${i}:median`, lamp: i, role, check: 'width', label: `${l.name}: centre from the median plane`, requirement: `at most ${mm(w.maxOffsetFromMedianPlane)}`, value, unit: 'mm', margin: m, status: statusOf(m), cite: w.cite ?? '' });
        }
      }
      // Visibility.
      const vis = device.visibility;
      if (vis && typeof vis.up === 'number' && typeof vis.down === 'number') {
        const hPlane = l.z;
        let down = vis.down, upAngle = vis.up, inBelowH;
        for (const r of vis.reductions ?? []) {
          const when = String(r.when ?? '');
          const applies = /below 750 mm/.test(when) ? hPlane < 750 : /above 2,?100 mm/.test(when) ? hPlane > 2100 : false;
          if (!applies) continue;
          if (r.down !== undefined) down = r.down;
          if (r.up !== undefined) upAngle = r.up;
          if (r.inwardBelowH !== undefined) inBelowH = r.inwardBelowH;
        }
        const side = lampFrame(l).side;
        let out = side ? vis.forward : vis.outward, inward = side ? vis.rearward : vis.inward;
        if (side && vis.rearwardSector) { out = -(90 - vis.rearwardSector.to); inward = 90 - vis.rearwardSector.from; }
        if (typeof out === 'number' && typeof inward === 'number') {
          const field = { up: upAngle, down, out, in: inward, ...(inBelowH !== undefined ? { inBelowH } : {}) };
          const map = visibilityMap(l, bvh, field);
          maps.set(i, map);
          const worst = map.sights.reduce((a, b) => (b.visible < a.visible ? b : a), map.sights[0]);
          const area = l.width * l.height;
          const needArea = vis.unobstructedAreaMm2 ?? (vis.minVisibleApparentArea?.cm2 ? vis.minVisibleApparentArea.cm2 * 100 : undefined);
          const fieldText = side && vis.rearwardSector ? `${vis.rearwardSector.from}° to ${vis.rearwardSector.to}° rearwards, ${upAngle}° up, ${down}° down` : `${upAngle}° up, ${down}° down, ${side ? `${out}° forwards, ${inward}° rearwards` : `${out}° outwards, ${inward}°${inBelowH !== undefined ? ` (${inBelowH}° below H)` : ''} inwards`}`;
          const where = worst ? ` (worst ${Math.abs(worst.beta)}° ${worst.beta >= 0 ? (side ? 'forwards' : 'outwards') : (side ? 'rearwards' : 'inwards')}, ${Math.abs(worst.alpha)}° ${worst.alpha >= 0 ? 'up' : 'down'})` : '';
          if (needArea !== undefined && !r48) {
            const value = worst.visible * area, m = margin(value, needArea, undefined);
            items.push({ id: `${role}:${i}:visibility`, lamp: i, role, check: 'visibility', label: `${l.name}: visible area within ${fieldText}`, requirement: `at least ${mm(needArea).replace(' mm', ' mm²')} unobstructed`, value, unit: 'mm²', margin: m, status: statusOf(m), cite: vis.cite ?? '', note: `Least visible area${where}.` });
          } else {
            // R48 §5.28.1: no obstacle to any part of the apparent surface within the angles.
            const value = 1 - worst.visible;
            items.push({ id: `${role}:${i}:visibility`, lamp: i, role, check: 'visibility', label: `${l.name}: geometric visibility, ${fieldText}`, requirement: 'no part of the apparent surface hidden', value: value * 100, unit: '% hidden', margin: value > 0 ? -value : 1, status: value > 0 ? 'fail' : 'pass', cite: `${vis.cite ?? ''}; R48 §5.28.1`, note: value > 0 ? `Up to ${Math.round(value * 100)}% of the apparent surface hidden${where}. §5.28.3 accepts a hidden part only with proof that the visible part meets the photometric values.` : undefined });
          }
        }
      } else if (vis?.text) {
        items.push({ id: `${role}:${i}:visibility-rule`, lamp: i, role, check: 'rule', label: `${l.name}: visibility`, requirement: String(vis.text), value: NaN, unit: '', margin: NaN, status: 'info', cite: vis.cite ?? '', note: 'Check by hand: the field is not a simple set of angles.' });
      }
    }
    // Separation of a pair: the inner edges of the two apparent surfaces (§5.8.3).
    const w = device.width ?? {};
    const exempt = Array.isArray(w.minSeparationNotFor) && w.minSeparationNotFor.includes(cat);
    const left = placed.find(p => p.l.y > 0 && !lampFrame(p.l).side), right = placed.find(p => p.l.y < 0 && !lampFrame(p.l).side);
    if (w.minSeparation !== undefined && !exempt && left && right) {
      const required = w.minSeparationNarrow && width < w.minSeparationNarrow.ifOverallWidthBelow ? w.minSeparationNarrow.value : w.minSeparation;
      const value = (left.l.y - left.l.width / 2) - (right.l.y + right.l.width / 2), m = margin(value, required, undefined);
      items.push({ id: `${role}:separation`, lamp: null, role, check: 'separation', label: `${def.name}: inner edges apart`, requirement: `at least ${mm(required)}`, value, unit: 'mm', margin: m, status: statusOf(m), cite: w.cite ?? '' });
    }
  }
  const source = r48 ? R48_SOURCE : FMVSS_SOURCE;
  return { pack, title: r48 ? 'UN R48' : 'FMVSS 108', source: { title: String(source.title ?? ''), document: String(source.document ?? ''), url: /** @type {any} */ (source).url }, items, maps };
}
