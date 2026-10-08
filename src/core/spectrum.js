/** Colour for the tracer: each ray carries a wavelength drawn from the luminous spectrum of a white LED, and a lens's
 * refractive index depends on it. Blue bends more than red, so a projector images its shield edge with a coloured
 * blur, which is what keeps a real cut-off from being razor sharp. */

/** CIE 1924 photopic luminous efficiency V(λ), 400–700 nm in 10 nm steps. */
const V = [0.0004, 0.0012, 0.004, 0.0116, 0.023, 0.038, 0.06, 0.091, 0.139, 0.208, 0.323, 0.503, 0.71, 0.862, 0.954, 0.995, 0.995, 0.952, 0.87, 0.757, 0.631, 0.503, 0.381, 0.265, 0.175, 0.107, 0.061, 0.032, 0.017, 0.0082, 0.0041];

/** @param {number} nm */
function luminousEfficiency(nm) {
  const x = (nm - 400) / 10, i = Math.floor(x);
  if (i < 0 || i >= V.length - 1) return 0;
  return V[i] + (V[i + 1] - V[i]) * (x - i);
}

/**
 * Relative spectral power of a cool-white phosphor LED (about 6000 K, typical of headlamp LEDs): a blue pump peak at
 * 450 nm and a broad phosphor band around 560 nm. A model shape, not a measured part.
 * @param {number} nm
 */
export function ledSpectrum(nm) {
  const g = /** @param {number} mu @param {number} sigma */ (mu, sigma) => Math.exp(-0.5 * ((nm - mu) / sigma) ** 2);
  return g(450, 9) + 0.55 * g(560, 50);
}

const LAMBDA_D = 587.6, LAMBDA_F = 486.1, LAMBDA_C = 656.3;

/**
 * Dispersion factor c(λ) of a Cauchy fit through the d, F and C lines: n(λ) = n_d + (n_d − 1)/V_d · c(λ), so c is 0 at
 * the d line and c(F) − c(C) = 1.
 * @param {number} nm
 */
export function dispersionFactor(nm) {
  return (1 / (nm * nm) - 1 / (LAMBDA_D * LAMBDA_D)) / (1 / (LAMBDA_F * LAMBDA_F) - 1 / (LAMBDA_C * LAMBDA_C));
}

/** Refractive index at a wavelength for a material given by n_d and its Abbe number. @param {number} nd @param {number} abbe @param {number} nm */
export function indexAt(nd, abbe, nm) {
  return nd + ((nd - 1) / abbe) * dispersionFactor(nm);
}

const TABLE = 1024;

/** Inverse cumulative distribution of the LED's luminous spectrum, tabulated: u in [0, 1) → wavelength in nm. */
const WAVELENGTHS = (() => {
  const step = 0.5, nms = [], cdf = [0];
  for (let nm = 400; nm <= 700; nm += step) nms.push(nm);
  for (let i = 1; i < nms.length; i++) cdf.push(cdf[i - 1] + 0.5 * step * (ledSpectrum(nms[i - 1]) * luminousEfficiency(nms[i - 1]) + ledSpectrum(nms[i]) * luminousEfficiency(nms[i])));
  const total = cdf[cdf.length - 1];
  const out = new Float64Array(TABLE);
  let j = 0;
  for (let k = 0; k < TABLE; k++) {
    const target = ((k + 0.5) / TABLE) * total;
    while (cdf[j + 1] < target) j++;
    out[k] = nms[j] + ((target - cdf[j]) / (cdf[j + 1] - cdf[j])) * step;
  }
  return out;
})();

/** A wavelength drawn from the luminous spectrum, so every ray carries equal lumens. @param {number} u uniform in [0, 1) */
export function sampleWavelength(u) {
  return WAVELENGTHS[Math.min(TABLE - 1, Math.floor(u * TABLE))];
}
