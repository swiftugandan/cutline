/** LED projector module: an upward-facing LED at the first focus of an ellipsoidal reflector, a cut-off shield at
 * the second focus, and a plano-convex aspheric lens focused on the shield edge. The lens inverts the image at the
 * shield, so light passing just above the edge leaves just below the cut-off. */

import { ellipsoidReflector, planoConvexLens, lensFocalLength, lensBackFocus } from '../optics.js';
import { cutoffAt } from './cutoff.js';
import { isPassing } from '../model.js';

/** @import { LampScene, Surface } from '../types.js' */
/** @import { Design, ProjectorOptics } from '../model.js' */

/** LED frame: emitting up (+y), its width along x and its length along the beam axis z. */
export const LED_UP = /** @type {const} */ ([1, 0, 0, 0, 0, 1, 0, -1, 0]);

/**
 * The shield's top edge, as points (x, y) in mm at the second focus, from the far-field cut-off. A point at (x, y)
 * leaves the lens at about (−atan(x/f), −atan(y/f)), so the edge sits at y = −f·tan(cut-off at h = −atan(x/f)).
 * @param {Design} design @param {ProjectorOptics} o @param {number} samples
 */
export function shieldEdge(design, o, samples = 161) {
  const f = lensFocalLength(o.lens.radius, o.lens.refractiveIndex);
  const half = o.shield.width / 2;
  const out = [];
  for (let i = 0; i < samples; i++) {
    const x = -half + (2 * half * i) / (samples - 1);
    const h = (-Math.atan(x / f) * 180) / Math.PI;
    out.push(x, -f * Math.tan((cutoffAt(design, h) * Math.PI) / 180) + o.shield.lowering);
  }
  return out;
}

/** @param {Design} design @returns {LampScene & { lensBack: number, focalDistance: number }} */
export function buildProjector(design) {
  const o = /** @type {ProjectorOptics} */ (design.optics);
  const r = o.reflector, d = r.focalDistance;
  const b = Math.sqrt(r.semiMajor ** 2 - (d / 2) ** 2);
  /** @type {Surface[]} */
  const surfaces = [
    ellipsoidReflector('reflector', [0, 0, d / 2], b * r.widthRatio, b, r.semiMajor,
      // Keep the upper half, and end the reflector at its front edge.
      [{ n: [0, -1, 0], d: 0 }, { n: [0, 0, 1], d: r.frontCut - d / 2 }],
      { kind: 'mirror', reflectance: r.reflectance, slopeErrorMrad: r.slopeErrorMrad }),
  ];
  if (isPassing(design)) {
    surfaces.push(...shieldSurfaces(design, o, d));
  }
  const n = o.lens.refractiveIndex;
  const lensBack = d + lensBackFocus(o.lens.radius, o.lens.thickness, n) + o.lens.defocus;
  const aperture = o.lens.diameter / 2;
  surfaces.push(...planoConvexLens({ zBack: lensBack, thickness: o.lens.thickness, radius: o.lens.radius, aperture, conic: o.lens.conic, a4: o.lens.a4, glass: { n, k: 0.0005, abbe: o.lens.abbe }, textureDeg: o.lens.textureDeg,
    signLight: o.lens.signLightHeight > 0 ? { yMax: -aperture + o.lens.signLightHeight, upMinDeg: o.lens.signLightMinDeg, upMaxDeg: o.lens.signLightMaxDeg } : undefined }));
  // A bezel around the lens stops light that would leave the module without passing through it.
  surfaces.push({ id: 'bezel', label: 'Lens holder', role: 'housing', frame: { origin: [0, 0, lensBack - 0.01] }, shape: { kind: 'annulus', inner: aperture, outer: 10 * aperture + 200 }, material: { kind: 'opaque', bucket: 'housing' } });
  return {
    surfaces,
    source: { kind: 'led', frame: { origin: [0, 0, design.led.offset], axes: [...LED_UP] }, width: design.led.width, height: design.led.height, flux: design.led.flux },
    cover: design.cover,
    size: Math.max(lensBack + o.lens.thickness, o.lens.diameter, 2 * r.semiMajor) * 1.5,
    lensBack,
    focalDistance: d,
  };
}

/**
 * The shield as vertical strips across x. Each strip stands at z = d + κx² (κ is the curvature, bending the ends
 * towards the lens), carries its piece of the edge profile, and may have the overhead window cut from it.
 * @param {Design} design @param {ProjectorOptics} o @param {number} d
 * @returns {Surface[]}
 */
export function shieldSurfaces(design, o, d) {
  const sh = o.shield;
  const edge = shieldEdge(design, o);
  const half = sh.width / 2, bottom = -Math.max(half, 20);
  const strips = sh.curvature === 0 ? 1 : 16;
  const points = edge.length / 2;
  /** @type {Surface[]} */
  const out = [];
  for (let k = 0; k < strips; k++) {
    const x0 = -half + (sh.width * k) / strips, x1 = x0 + sh.width / strips, xc = (x0 + x1) / 2;
    // The edge points inside this strip, in order from left to right, plus its two ends.
    const top = [];
    for (let i = 0; i < points; i++) { const x = edge[2 * i]; if (x >= x0 - 1e-9 && x <= x1 + 1e-9) top.push(x, edge[2 * i + 1]); }
    const z = d + sh.curvature * xc * xc;
    /** @type {number[][]} */
    const holes = [];
    const wx0 = Math.max(x0, -sh.windowWidth / 2), wx1 = Math.min(x1, sh.windowWidth / 2);
    if (sh.windowWidth > 0 && sh.windowHeight > 0 && wx1 > wx0) {
      // The window's top sits windowDepth below the edge at the centre, so its light leaves above the cut-off.
      const yTop = edgeAt(edge, 0) - sh.windowDepth, yBottom = yTop - sh.windowHeight;
      holes.push([wx0, yBottom, wx1, yBottom, wx1, yTop, wx0, yTop]);
    }
    out.push({
      id: strips === 1 ? 'shield' : `shield-${k + 1}`, label: 'Cut-off shield', role: 'shield', frame: { origin: [0, 0, z] },
      shape: { kind: 'polygon', points: [x0, bottom, x1, bottom, ...pairsReversed(top)], holes },
      material: { kind: 'opaque', bucket: 'shield' },
    });
  }
  return out;
}

/** Height of the edge profile at x, by linear interpolation. @param {number[]} edge @param {number} x */
function edgeAt(edge, x) {
  for (let i = 2; i < edge.length; i += 2) if (edge[i] >= x) { const f = (x - edge[i - 2]) / (edge[i] - edge[i - 2]); return edge[i - 1] + f * (edge[i + 1] - edge[i - 1]); }
  return edge[edge.length - 1];
}

/** Reverses a flat [x, y, …] list point by point, so the polygon runs right to left along its top. @param {number[]} pts */
function pairsReversed(pts) {
  const out = [];
  for (let i = pts.length - 2; i >= 0; i -= 2) out.push(pts[i], pts[i + 1]);
  return out;
}
