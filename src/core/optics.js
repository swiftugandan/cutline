/** Building blocks for lamps: reflectors as quadrics, a plano-convex aspheric lens, and flat parts. Lengths in mm. */

/** @import { Surface, Clip, Frame, MirrorMaterial, Medium, SignLightZone } from './types.js' */

/**
 * Triaxial ellipsoid reflector, mirrored on the inside, centred at `centre` with semi-axes (a, b, c) along x, y, z.
 * @param {string} id @param {[number, number, number]} centre @param {number} a @param {number} b @param {number} c
 * @param {Clip[]} clips half-spaces kept, in coordinates relative to the centre @param {MirrorMaterial} material
 * @returns {Surface}
 */
export function ellipsoidReflector(id, centre, a, b, c, clips, material) {
  return {
    id, label: 'Ellipsoidal reflector', role: 'reflector', material,
    frame: { origin: centre },
    // ∇F points outwards, so the mirrored inside is the negative side.
    shape: { kind: 'quadric', a: [1 / (a * a), 1 / (b * b), 1 / (c * c)], b: [0, 0, 0], c: -1, clips, frontSign: -1 },
  };
}

/**
 * Foci of an ellipsoid of revolution about z with semi-major axis c along z and semi-minor axis b: (0, 0, ±√(c² − b²))
 * relative to its centre.
 * @param {number} b @param {number} c
 */
export function focalHalfDistance(b, c) {
  return Math.sqrt(Math.max(0, c * c - b * b));
}

/**
 * Paraboloid reflector with its focus at the frame origin and its axis along the frame's +z, opening forwards:
 * x² + y² = 4f(z + f), plus optional extra curvature (kx, ky) that spreads the beam: F = (1 + 4f kx) x² + … .
 * @param {string} id @param {Frame} frame @param {number} f @param {Clip[]} clips @param {MirrorMaterial} material
 * @param {{ kx?: number, xc?: number, label?: string }} [extra] extra sideways curvature kx centred on local x = xc,
 *   which widens the beam reflected near xc without turning it
 * @returns {Surface}
 */
export function paraboloidReflector(id, frame, f, clips, material, extra = {}) {
  const kx = extra.kx ?? 0, xc = extra.xc ?? 0;
  return {
    id, label: extra.label ?? 'Paraboloid reflector', role: 'reflector', material, frame,
    // F = x²/4f + kx (x − xc)² + y²/4f − z − f; ∇F points away from the focus at the vertex.
    shape: { kind: 'quadric', a: [1 / (4 * f) + kx, 1 / (4 * f), 0], b: [-2 * kx * xc, 0, -1], c: -f + kx * xc * xc, clips, frontSign: -1 },
  };
}

/**
 * Plano-convex aspheric lens on the z axis: a flat back face at z = zBack facing the source, glass of centre
 * thickness t, and an aspheric front face, optionally textured. An opaque rim stops light that would leave through the edge.
 * @param {{ zBack: number, thickness: number, radius: number, aperture: number, conic: number, a4: number, glass: Medium, textureDeg?: number, signLight?: SignLightZone }} lens
 * @returns {Surface[]}
 */
export function planoConvexLens({ zBack, thickness, radius, aperture, conic, a4, glass, textureDeg = 0, signLight }) {
  const air = { n: 1, k: 0 };
  const zFront = zBack + thickness;
  const curvature = -1 / radius;
  return [
    {
      id: 'lens-back', label: 'Lens back face', role: 'lens', frame: { origin: [0, 0, zBack] },
      shape: { kind: 'annulus', inner: 0, outer: aperture },
      // The face looks towards the source (−z); its front side, +z, is the glass.
      material: { kind: 'dielectric', front: glass, back: air },
    },
    {
      id: 'lens-front', label: 'Lens front face', role: 'lens',
      // A convex front bulging towards +z: the vertex sits at zFront and the sag curves back towards the source.
      frame: { origin: [0, 0, zFront] },
      shape: { kind: 'asphere', curvature, conic, a4, a6: 0, aperture },
      material: { kind: 'dielectric', front: air, back: glass, textureDeg, ...(signLight ? { signLight } : {}) },
    },
    {
      id: 'lens-rim', label: 'Lens rim', role: 'lens', frame: { origin: [0, 0, 0] },
      shape: { kind: 'quadric', a: [1, 1, 0], b: [0, 0, 0], c: -aperture * aperture, clips: [{ n: [0, 0, -1], d: -zBack }, { n: [0, 0, 1], d: zFront }], frontSign: 1 },
      material: { kind: 'opaque', bucket: 'lensLoss' },
    },
  ];
}

/** Paraxial focal length of a plano-convex lens: R / (n − 1). @param {number} radius @param {number} n */
export function lensFocalLength(radius, n) {
  return radius / (n - 1);
}

/** Back focal distance with the flat face towards the focus: f − t / n. @param {number} radius @param {number} thickness @param {number} n */
export function lensBackFocus(radius, thickness, n) {
  return lensFocalLength(radius, n) - thickness / n;
}
