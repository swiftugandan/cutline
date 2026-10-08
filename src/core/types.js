/** Shared types for the 3D optics core. This module has no runtime code.
 * Lamp frame: x to the driver's right, y up, z forward along the vehicle axis. Geometry in millimetres. */

/**
 * A local frame: origin and a rotation whose columns are the local x, y and z axes in the lamp frame.
 * @typedef {{ origin: [number, number, number], axes?: [number, number, number, number, number, number, number, number, number] }} Frame
 *   axes is row-major: [xx, yx, zx, xy, yy, zy, xz, yz, zz], so column j holds local axis j. Omitted means identity.
 */

/**
 * Half-space n · p ≤ d in the surface's local frame.
 * @typedef {{ n: [number, number, number], d: number }} Clip
 */

/**
 * @typedef {{ kind: 'quadric', a: [number, number, number], b: [number, number, number], c: number, clips: Clip[], frontSign: 1 | -1 }} QuadricShape
 *   F(p) = a·p² + b·p + c = 0 (diagonal quadric). The front side is where frontSign · ∇F points.
 * @typedef {{ kind: 'polygon', points: number[], holes?: number[][] }} PolygonShape
 *   Flat [x0, y0, x1, y1, …] in the local z = 0 plane, minus any holes; the front faces local +z.
 * @typedef {{ kind: 'annulus', inner: number, outer: number }} AnnulusShape
 *   Ring in the local z = 0 plane centred on the origin; the front faces local +z.
 * @typedef {{ kind: 'asphere', curvature: number, conic: number, a4: number, a6: number, aperture: number }} AsphereShape
 *   Sag z(r) = c r² / (1 + √(1 − (1 + k) c² r²)) + a4 r⁴ + a6 r⁶ for r ≤ aperture; the front faces local +z.
 * @typedef {QuadricShape | PolygonShape | AnnulusShape | AsphereShape} Shape
 */

/**
 * @typedef {{ n: number, k: number, abbe?: number }} Medium
 *   Refractive index at the d line (587.6 nm), absorption coefficient (1/mm), and Abbe number for dispersion; no Abbe
 *   number means the index does not depend on wavelength.
 * @typedef {{ kind: 'mirror', reflectance: number, slopeErrorMrad: number }} MirrorMaterial
 * @typedef {{ kind: 'opaque', bucket: Bucket }} OpaqueMaterial
 * @typedef {{ kind: 'dielectric', front: Medium, back: Medium, textureDeg?: number, signLight?: SignLightZone }} DielectricMaterial
 *   textureDeg: the scale of a fine surface texture that scatters each transmitted ray, with power-law wings (see
 *   textureScatter in tracer.js).
 *   signLight: a strip of the face below lamp-frame height yMax whose transmitted light is turned upwards by an angle
 *   spread evenly from upMinDeg to upMaxDeg, lighting overhead signs.
 * @typedef {{ yMax: number, upMinDeg: number, upMaxDeg: number }} SignLightZone
 * @typedef {MirrorMaterial | OpaqueMaterial | DielectricMaterial} Material
 */

/**
 * Faceted surfaces share a base surface; a hit counts for a facet only when the hit, seen in the lamp frame, lies in
 * that facet's cell of the projected (x, y) grid. Cells tile without gaps however facets are aimed.
 * @typedef {{ x0: number, x1: number, y0: number, y1: number, z1?: number }} Cell
 *   z1 bounds the facet's depth: a turned facet's surface can stretch far forward inside its (x, y) cell.
 * @typedef {{ id: string, label: string, role: 'reflector' | 'shield' | 'lens' | 'housing', shape: Shape, frame: Frame, material: Material, cell?: Cell }} Surface
 */

/**
 * LED emitter: a Lambertian rectangle, w by h millimetres, centred at the frame origin and emitting along local +z.
 * @typedef {{ kind: 'led', frame: Frame, width: number, height: number, flux: number }} Source
 */

/**
 * @typedef {'beam' | 'reflectorAbsorption' | 'shield' | 'lensLoss' | 'housing' | 'coverLoss' | 'backward' | 'trapped'} Bucket
 *   Every emitted lumen ends in exactly one bucket. 'beam' is light that leaves the lamp forwards into the far field.
 */

/**
 * @typedef {{ hMin: number, hMax: number, vMin: number, vMax: number, step: number, vStep: number }} GridSpec
 *   Far-field grid in degrees. Bins are [h, h + step) × [v, v + vStep).
 * @typedef {'screen' | 'goniometer'} AngleConvention
 */

/**
 * @typedef {{ transmittance: number, haze: number, hazeAngleDeg: number }} CoverLens
 * @typedef {{ surfaces: Surface[], source: Source, cover: CoverLens, size: number }} LampScene
 *   size is a length scale (mm) for tolerances and drawing.
 */

/**
 * @typedef {{ rays: number, seed: number, convention: AngleConvention, grids: GridSpec[], pathCount?: number }} TraceOptions
 * @typedef {{ spec: GridSpec, flux: Float64Array, count: Float64Array }} Histogram
 *   lm and number of rays per bin, row-major by v then h. The ray count sets the statistical error of a bin: about 1/√n.
 * @typedef {{ points: number[], bucket: Bucket }} RayPath  Flat [x, y, z, …] in mm.
 * @typedef {{ emitted: number, ledger: Record<Bucket, number>, histograms: Histogram[], paths: RayPath[], rays: number }} TraceResult
 */

export {};
