/** 3D Monte Carlo tracer for headlamps. Light leaves a Lambertian LED, meets reflectors, the cut-off shield, lenses and
 * the housing, and whatever leaves forwards is binned by direction into far-field histograms. Definitions are in
 * docs/PHYSICS.md. Every emitted lumen ends in exactly one ledger bucket. */

import { Rng } from './rng.js';
import { compileSurface, newHit } from './geometry.js';
import { dispersionFactor, sampleWavelength } from './spectrum.js';

/** @import { Bucket, LampScene, TraceOptions, TraceResult, Histogram, RayPath, GridSpec, AngleConvention, MirrorMaterial, DielectricMaterial, Medium } from './types.js' */

export const MAX_INTERACTIONS = 64;
/** Rays per random-number block; a trace split on block boundaries equals an uninterrupted one. */
export const RAY_BLOCK = 8192;

/** @type {Bucket[]} */
export const BUCKETS = ['beam', 'reflectorAbsorption', 'shield', 'lensLoss', 'housing', 'coverLoss', 'backward', 'trapped'];

/** @returns {Record<Bucket, number>} */
export function emptyLedger() {
  return /** @type {Record<Bucket, number>} */ (Object.fromEntries(BUCKETS.map(b => [b, 0])));
}

/** @param {number} seed @param {number} block */
function blockSeed(seed, block) {
  return (Math.imul(seed ^ 0x2c1b3c6d, 0x297a2d39) + Math.imul(block + 1, 0x9e3779b1)) >>> 0;
}

const DEG = 180 / Math.PI;

/**
 * Far-field angles in degrees for a forward unit direction, under the chosen convention. 'screen' projects onto a
 * plane ahead (H = atan(dx/dz), V = atan(dy/dz)); 'goniometer' uses elevation and azimuth (V = asin dy, H = atan2(dx, dz)).
 * @param {number} dx @param {number} dy @param {number} dz @param {AngleConvention} convention
 */
export function directionToAngles(dx, dy, dz, convention) {
  if (convention === 'screen') return [Math.atan(dx / dz) * DEG, Math.atan(dy / dz) * DEG];
  return [Math.atan2(dx, dz) * DEG, Math.asin(Math.max(-1, Math.min(1, dy))) * DEG];
}

/** @param {GridSpec} spec */
export function gridSize(spec) {
  return { nh: Math.round((spec.hMax - spec.hMin) / spec.step), nv: Math.round((spec.vMax - spec.vMin) / spec.vStep) };
}

/** Unpolarised Fresnel reflectance. @param {number} n1 @param {number} n2 @param {number} cosI */
export function fresnelReflectance(n1, n2, cosI) {
  const eta = n1 / n2, sin2T = eta * eta * (1 - cosI * cosI);
  if (sin2T >= 1) return 1;
  const cosT = Math.sqrt(1 - sin2T);
  const rs = (n1 * cosI - n2 * cosT) / (n1 * cosI + n2 * cosT);
  const rp = (n1 * cosT - n2 * cosI) / (n1 * cosT + n2 * cosI);
  return 0.5 * (rs * rs + rp * rp);
}

/**
 * Traces rays [from, to) of the full set. `from` must sit on a RAY_BLOCK boundary; merge parts with mergeTraces.
 * @param {LampScene} scene @param {TraceOptions} options @param {{ from: number, to: number }} [range]
 * @returns {TraceResult}
 */
export function trace(scene, options, range) {
  const rays = Math.max(1, Math.floor(options.rays));
  const from = range?.from ?? 0, to = Math.min(rays, range?.to ?? rays);
  if (from % RAY_BLOCK !== 0) throw new Error('A partial trace must start on a ray block boundary.');
  const compiled = scene.surfaces.map(compileSurface);
  const ledger = emptyLedger();
  const src = scene.source;
  const w0 = src.flux / rays;
  const tau = scene.cover.transmittance, haze = scene.cover.haze, hazeSigma = (scene.cover.hazeAngleDeg * Math.PI) / 180;
  const tMin = 1e-7 * scene.size;
  const grids = options.grids.map(spec => ({ spec, ...gridSize(spec), flux: new Float64Array(gridSize(spec).nh * gridSize(spec).nv), count: new Float64Array(gridSize(spec).nh * gridSize(spec).nv) }));
  const m = src.frame.axes ?? [1, 0, 0, 0, 1, 0, 0, 0, 1];
  const [sx, sy, sz] = src.frame.origin;
  const pathCount = Math.min(rays, options.pathCount ?? 0);
  const stride = pathCount > 0 ? rays / pathCount : Infinity;
  /** @type {RayPath[]} */
  const paths = [];
  const hit = newHit();
  // Rays carry a wavelength only when some material disperses.
  const spectral = scene.surfaces.some(s => s.material.kind === 'dielectric' && (s.material.front.abbe || s.material.back.abbe));
  let rng = new Rng(blockSeed(options.seed, 0));

  for (let i = from; i < to; i++) {
    if (i % RAY_BLOCK === 0) rng = new Rng(blockSeed(options.seed, i / RAY_BLOCK));
    // A point on the emitter and a Lambertian direction about its normal (local +z).
    const u = (rng.next() - 0.5) * src.width, v = (rng.next() - 0.5) * src.height;
    const sinT = Math.sqrt(rng.next()), cosT = Math.sqrt(1 - sinT * sinT), phi = 2 * Math.PI * rng.next();
    const lx = sinT * Math.cos(phi), ly = sinT * Math.sin(phi), lz = cosT;
    let px = sx + m[0] * u + m[1] * v, py = sy + m[3] * u + m[4] * v, pz = sz + m[6] * u + m[7] * v;
    let dx = m[0] * lx + m[1] * ly + m[2] * lz, dy = m[3] * lx + m[4] * ly + m[5] * lz, dz = m[6] * lx + m[7] * ly + m[8] * lz;
    let w = w0, mediumK = 0, glassReflected = false;
    const chroma = spectral ? dispersionFactor(sampleWavelength(rng.next())) : 0;
    /** @type {number[] | null} */
    const path = pathCount > 0 && (i === 0 || Math.floor(i / stride) !== Math.floor((i - 1) / stride)) ? [px, py, pz] : null;
    /** @type {Bucket | null} */
    let ended = null;

    for (let step = 0; step < MAX_INTERACTIONS; step++) {
      hit.t = Infinity; hit.index = -1;
      for (let k = 0; k < compiled.length; k++) compiled[k].intersect(px, py, pz, dx, dy, dz, tMin, hit, k);
      if (hit.index < 0) {
        if (path) path.push(px + dx * scene.size, py + dy * scene.size, pz + dz * scene.size);
        if (dz > 0) {
          // The outer lens scatters a small share of the light by a Gaussian of the haze angle per axis.
          if (haze > 0 && rng.next() < haze) {
            const [ax, ay, az, bx, by, bz] = basis(dx, dy, dz);
            const a = Math.tan(hazeSigma * rng.normal()), b = Math.tan(hazeSigma * rng.normal());
            dx += a * ax + b * bx; dy += a * ay + b * by; dz += a * az + b * bz;
            const len = Math.hypot(dx, dy, dz); dx /= len; dy /= len; dz /= len;
          }
          ledger.coverLoss += w * (1 - tau);
          const out = w * tau;
          ledger.beam += out;
          const [h, vv] = directionToAngles(dx, dy, dz, options.convention);
          for (const g of grids) {
            const col = Math.floor((h - g.spec.hMin) / g.spec.step), row = Math.floor((vv - g.spec.vMin) / g.spec.vStep);
            if (col >= 0 && col < g.nh && row >= 0 && row < g.nv) { g.flux[row * g.nh + col] += out; g.count[row * g.nh + col] += 1; }
          }
          ended = 'beam';
        } else {
          ended = glassReflected ? 'lensLoss' : 'backward';
          ledger[ended] += w;
        }
        w = 0;
        break;
      }
      const t = hit.t;
      if (mediumK > 0) { const lost = w * (1 - Math.exp(-mediumK * t)); ledger.lensLoss += lost; w -= lost; }
      px = hit.px; py = hit.py; pz = hit.pz;
      if (path) path.push(px, py, pz);
      const surface = compiled[hit.index].surface, material = surface.material;
      const nx = hit.nx, ny = hit.ny, nz = hit.nz;
      const front = dx * nx + dy * ny + dz * nz < 0;
      if (material.kind === 'opaque') { ended = glassReflected && material.bucket === 'housing' ? 'lensLoss' : material.bucket; break; }
      if (material.kind === 'mirror') {
        if (!front) { ended = 'housing'; break; }
        const lost = w * (1 - material.reflectance);
        ledger.reflectorAbsorption += lost; w -= lost;
        [dx, dy, dz] = reflect(dx, dy, dz, nx, ny, nz, material, rng);
        glassReflected = false;
        continue;
      }
      const out = refractOrReflect(dx, dy, dz, nx, ny, nz, front, material, rng, chroma);
      dx = out[0]; dy = out[1]; dz = out[2]; mediumK = out[3]; glassReflected = out[4] === 1;
      const zone = material.signLight;
      if (zone && !glassReflected && py < zone.yMax) {
        // Turn the ray upwards about the lamp's x axis.
        const a = ((zone.upMinDeg + (zone.upMaxDeg - zone.upMinDeg) * rng.next()) * Math.PI) / 180;
        const c = Math.cos(a), sn = Math.sin(a);
        const ny2 = dy * c + dz * sn, nz2 = dz * c - dy * sn;
        dy = ny2; dz = nz2;
      }
    }
    if (ended === null) ended = 'trapped';
    if (w > 0) ledger[ended] += w;
    if (path) paths.push({ points: path, bucket: ended });
  }

  /** @type {Histogram[]} */
  const histograms = grids.map(g => ({ spec: g.spec, flux: g.flux, count: g.count }));
  return { emitted: w0 * Math.max(0, to - from), ledger, histograms, paths, rays: Math.max(0, to - from) };
}

/**
 * Specular reflection with a Gaussian slope error on the normal (σ per axis).
 * @param {number} dx @param {number} dy @param {number} dz @param {number} nx @param {number} ny @param {number} nz
 * @param {MirrorMaterial} mat @param {Rng} rng
 * @returns {[number, number, number]}
 */
export function reflect(dx, dy, dz, nx, ny, nz, mat, rng) {
  const sigma = mat.slopeErrorMrad * 1e-3;
  for (let attempt = 0; attempt < 8; attempt++) {
    let mx = nx, my = ny, mz = nz;
    if (sigma > 0) {
      const [ax, ay, az, bx, by, bz] = basis(nx, ny, nz);
      const a = Math.tan(sigma * rng.normal()), b = Math.tan(sigma * rng.normal());
      mx += a * ax + b * bx; my += a * ay + b * by; mz += a * az + b * bz;
      const len = Math.hypot(mx, my, mz); mx /= len; my /= len; mz /= len;
    }
    const dot = dx * mx + dy * my + dz * mz;
    const rx = dx - 2 * dot * mx, ry = dy - 2 * dot * my, rz = dz - 2 * dot * mz;
    if (rx * nx + ry * ny + rz * nz > 0) return [rx, ry, rz];
  }
  const dot = dx * nx + dy * ny + dz * nz;
  return [dx - 2 * dot * nx, dy - 2 * dot * ny, dz - 2 * dot * nz];
}

/**
 * Fresnel reflection or refraction at a dielectric boundary, chosen with probability R.
 * @param {number} dx @param {number} dy @param {number} dz @param {number} nx @param {number} ny @param {number} nz
 * @param {boolean} front @param {DielectricMaterial} m @param {Rng} rng
 * @param {number} [chroma] the ray's dispersion factor (see spectrum.js); 0 is the d line
 * @returns {[number, number, number, number, number]} new direction, the absorption coefficient of the medium the ray is now in, and 1 if it reflected
 */
export function refractOrReflect(dx, dy, dz, nx, ny, nz, front, m, rng, chroma = 0) {
  const from = front ? m.front : m.back, to = front ? m.back : m.front;
  const mx = front ? nx : -nx, my = front ? ny : -ny, mz = front ? nz : -nz;
  const cosI = -(dx * mx + dy * my + dz * mz);
  const n1 = indexOf(from, chroma), n2 = indexOf(to, chroma);
  const r = fresnelReflectance(n1, n2, cosI);
  if (r >= 1 || rng.next() < r) return [dx + 2 * cosI * mx, dy + 2 * cosI * my, dz + 2 * cosI * mz, from.k, 1];
  const eta = n1 / n2;
  const cosT = Math.sqrt(1 - eta * eta * (1 - cosI * cosI));
  const f = eta * cosI - cosT;
  let tx = eta * dx + f * mx, ty = eta * dy + f * my, tz = eta * dz + f * mz;
  if (m.textureDeg) [tx, ty, tz] = textureScatter(tx, ty, tz, m.textureDeg, rng);
  return [tx, ty, tz, to.k, 0];
}

/** Tail exponent of the texture scatter: the deflection density falls as (1 + θ²/a²)^−TEXTURE_K. */
export const TEXTURE_K = 2.5;
/** Largest texture deflection, in multiples of its scale; rays beyond are drawn again. */
const TEXTURE_CAP = 40;

/**
 * Deflects a direction by the scatter of a fine surface texture. Surface scatter has power-law wings (the ABg model of
 * optical surfaces), so the deflection θ, in a direction picked at random, has density ∝ (1 + θ²/a²)^−k about the
 * texture scale a. Drawn by inverting P(θ < t) = 1 − (1 + t²/a²)^(1 − k).
 * @param {number} dx @param {number} dy @param {number} dz @param {number} scaleDeg @param {Rng} rng
 * @returns {[number, number, number]}
 */
export function textureScatter(dx, dy, dz, scaleDeg, rng) {
  const a = (scaleDeg * Math.PI) / 180;
  let t;
  do t = a * Math.sqrt(rng.open() ** (1 / (1 - TEXTURE_K)) - 1); while (t > TEXTURE_CAP * a);
  const phi = 2 * Math.PI * rng.next(), c = Math.cos(t), s = Math.sin(t);
  const [ax, ay, az, bx, by, bz] = basis(dx, dy, dz);
  const ux = Math.cos(phi) * ax + Math.sin(phi) * bx, uy = Math.cos(phi) * ay + Math.sin(phi) * by, uz = Math.cos(phi) * az + Math.sin(phi) * bz;
  return [dx * c + ux * s, dy * c + uy * s, dz * c + uz * s];
}

/** A medium's index for a ray of the given dispersion factor. @param {Medium} medium @param {number} chroma */
function indexOf(medium, chroma) {
  return medium.abbe ? medium.n + ((medium.n - 1) / medium.abbe) * chroma : medium.n;
}

/** Two unit vectors perpendicular to a unit vector and each other. @param {number} x @param {number} y @param {number} z */
export function basis(x, y, z) {
  const ax = Math.abs(x), ay = Math.abs(y), az = Math.abs(z);
  let ux, uy, uz;
  if (ax <= ay && ax <= az) { ux = 0; uy = -z; uz = y; } else if (ay <= az) { ux = z; uy = 0; uz = -x; } else { ux = -y; uy = x; uz = 0; }
  const ul = Math.hypot(ux, uy, uz); ux /= ul; uy /= ul; uz /= ul;
  return [ux, uy, uz, y * uz - z * uy, z * ux - x * uz, x * uy - y * ux];
}

/** Combines partial traces of one scene. @param {TraceResult[]} parts @returns {TraceResult} */
export function mergeTraces(parts) {
  if (!parts.length) throw new Error('Nothing to merge.');
  const ledger = emptyLedger();
  const histograms = parts[0].histograms.map(h => ({ spec: h.spec, flux: new Float64Array(h.flux.length), count: new Float64Array(h.count.length) }));
  let emitted = 0, rays = 0;
  /** @type {RayPath[]} */
  const paths = [];
  for (const p of parts) {
    for (const b of BUCKETS) ledger[b] += p.ledger[b];
    p.histograms.forEach((h, k) => {
      const into = histograms[k];
      for (let i = 0; i < into.flux.length; i++) { into.flux[i] += h.flux[i]; into.count[i] += h.count[i]; }
    });
    emitted += p.emitted; rays += p.rays; paths.push(...p.paths);
  }
  return { emitted, ledger, histograms, paths, rays };
}
