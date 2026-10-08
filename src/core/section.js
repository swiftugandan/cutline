/** Section outlines of a lamp for drawing: where each surface crosses a plane through the LED. A fan of rays in the
 * plane, cast from the LED, meets every surface in order along it, because every surface in a Cutline lamp is in
 * direct view of the LED. Each surface is intersected on its own, so surfaces hidden behind others still show. */

import { compileSurface, newHit } from './geometry.js';

/** @import { LampScene, Surface } from './types.js' */

/**
 * @typedef {'side' | 'top'} SectionView
 *   side: a vertical plane along the axis, drawn as (z, y); top: a horizontal plane, drawn as (z, x). Both sit half a
 *   millimetre off the LED's centre, so they never run exactly along a seam between facets.
 * @typedef {{ id: string, label: string, role: Surface['role'], polylines: number[][] }} SurfaceOutline
 *   polylines in the view's (u, w) coordinates: u along the beam axis (z), w up (side) or to the right (top), in mm.
 */

/** Offset of the section planes from the LED's centre, mm. */
const PLANE_OFFSET = 0.5;

/**
 * @param {LampScene} scene @param {SectionView} view @param {number} [rays] fan density
 * @returns {SurfaceOutline[]}
 */
export function sectionOutlines(scene, view, rays = 2880) {
  const [ox, oy, oz] = scene.source.frame.origin;
  const origin = view === 'side' ? [ox + PLANE_OFFSET, oy, oz] : [ox, oy + PLANE_OFFSET, oz];
  const hit = newHit();
  const tMin = 1e-7 * scene.size;
  /** @type {SurfaceOutline[]} */
  const out = [];
  for (const surface of scene.surfaces) {
    const compiled = compileSurface(surface);
    /** @type {number[][]} */
    const polylines = [];
    /** @type {number[]} */
    let current = [];
    let lastU = NaN, lastW = NaN;
    // A jump much longer than the fan's spacing at that distance starts a new polyline.
    const step = (2 * Math.PI) / rays;
    for (let i = 0; i <= rays; i++) {
      const a = i * step;
      const du = Math.cos(a), dw = Math.sin(a);
      const [dx, dy, dz] = view === 'side' ? [0, dw, du] : [dw, 0, du];
      hit.t = Infinity; hit.index = -1;
      compiled.intersect(origin[0], origin[1], origin[2], dx, dy, dz, tMin, hit, 0);
      if (hit.index < 0) { if (current.length >= 4) polylines.push(current); current = []; lastU = NaN; continue; }
      const u = hit.pz, w = view === 'side' ? hit.py : hit.px;
      const gap = Math.hypot(u - lastU, w - lastW);
      if (current.length && !(gap < Math.max(2, hit.t * step * 8))) { if (current.length >= 4) polylines.push(current); current = []; }
      current.push(u, w);
      lastU = u; lastW = w;
    }
    if (current.length >= 4) polylines.push(current);
    if (polylines.length) out.push({ id: surface.id, label: surface.label, role: surface.role, polylines });
  }
  return out;
}

/**
 * The bounding box of outlines, as [uMin, uMax, wMin, wMax]. Housing parts are left out: a bezel reaches far beyond the
 * optics so that it catches every stray ray, and the view clips it.
 * @param {SurfaceOutline[]} outlines
 */
export function outlineBounds(outlines) {
  let u0 = Infinity, u1 = -Infinity, w0 = Infinity, w1 = -Infinity;
  for (const o of outlines) if (o.role !== 'housing') for (const line of o.polylines) for (let i = 0; i < line.length; i += 2) {
    u0 = Math.min(u0, line[i]); u1 = Math.max(u1, line[i]); w0 = Math.min(w0, line[i + 1]); w1 = Math.max(w1, line[i + 1]);
  }
  return [u0, u1, w0, w1];
}
