/** Everything the photometry workspace shows about a study: the file resampled into Cutline's frame, every market's
 * evaluation after that market's own aim, the user's targets, and the road. It runs in the analysis worker. A file is
 * resampled once and kept while only the study's other settings change. */

import { parseDistribution, intensityFunction, toHistograms, describe, FILE_GRIDS } from './distribution/distribution.js';
import { Beam, evaluateBeam, aimR149, verticalScan } from './regulation/evaluate.js';
import { measureRequirements, applicable, meets, weakest, status } from './regulation/engine.js';
import { packById, functionById, isHeadlampRole, conditionPack } from './regulation/catalog.js';
import { AIMING as FMVSS_AIMING } from './regulation/data/fmvss108-headlamps.js';
import { RULES } from './regulation/r149.js';
import { roadIlluminance } from './road.js';
import { gridSize } from './tracer.js';
import { binSolidAngle, SCREEN_DISTANCE } from './photometry.js';

/** @import { Study, Target } from './study.js' */
/** @import { Histogram } from './types.js' */
/** @import { Market, Pack, PackFunction, Provenance } from './regulation/catalog.js' */
/** @import { Item, Requirement } from './regulation/engine.js' */
/** @import { Aim } from './regulation/evaluate.js' */
/** @import { RoadResult } from './road.js' */
/** @import { CandelaLayer } from './analysis.js' */

/**
 * @typedef {'file' | 'mirror'} BeamKey  The file as it is, or its mirror image (the lamp for the other traffic side).
 * @typedef {{ market: Market, key: string, pack: { id: string, title: string, short: string, provenance: Provenance, statement: string, region: string, notes: string[], source: { title: string, document: string, url: string } },
 *   fn: { id: string, name: string, aimText: string, notes: string[] }, beam: BeamKey, aim: Aim, items: Item[], pass: boolean, worst: Item | null }} MarketResult
 * @typedef {{ file: ReturnType<typeof describe>, layers: Partial<Record<BeamKey, CandelaLayer[]>>, markets: MarketResult[],
 *   reference: { beam: BeamKey, aim: Aim, label: string, lift: number }, targets: Item[], road: RoadResult | null,
 *   peak: { value: number, h: number, v: number } }} StudyAnalysis
 *   layers are candela per bin in the file's own frame (NaN outside the file); the page moves them by a market's aim.
 *   reference: the frame the pictures, the targets and the road use, the first market's aim. lift: degrees the beam is
 *   raised on the road so a laboratory-aimed cut-off sits level before the vehicle's own aim.
 * @typedef {{ key: string, histograms: Partial<Record<BeamKey, Histogram[]>>, description: ReturnType<typeof describe>, mirror?: () => Histogram[] }} StudyCache
 *   mirror resamples the file's mirror image, on first need.
 */

/** A key that changes whenever the file or its mapping does. @param {Study} s */
function cacheKey(s) {
  const t = s.source.text;
  return `${s.source.name}|${t.length}|${t.slice(0, 2000)}|${t.slice(-2000)}|${JSON.stringify(s.mapping)}`;
}

/**
 * The resampled beams a study needs, reusing a cache while the file and mapping are unchanged.
 * @param {Study} study @param {StudyCache | null} cache @param {boolean} needMirror
 * @returns {StudyCache}
 */
export function prepare(study, cache, needMirror) {
  const key = cacheKey(study);
  if (!cache || cache.key !== key) {
    const d = parseDistribution(study.source.text, study.source.name || 'The file');
    const mapping = { ...study.mapping, mirror: study.mapping.mirror === 'yes' };
    const histograms = toHistograms(intensityFunction(d, mapping), FILE_GRIDS);
    cache = { key, histograms: { file: histograms }, description: describe(d, histograms) };
    cache.mirror = () => toHistograms(intensityFunction(d, { ...mapping, mirror: !mapping.mirror }), FILE_GRIDS);
  }
  const c = cache;
  if (needMirror && !c.histograms.mirror && c.mirror) c.histograms.mirror = c.mirror();
  return c;
}

/** The beam a market reads: the lamp for the other traffic side is the file's mirror image, unless told otherwise. @param {Study} study @param {Market} market @returns {BeamKey} */
export function beamKeyFor(study, market) {
  return isHeadlampRole(study.lamp.role) && market.traffic !== study.lamp.traffic && study.lamp.otherTraffic === 'mirror' ? 'mirror' : 'file';
}

/** The study's conditions that belong to a pack, without the prefix. An adopted pack shares its basis's conditions.
 * @param {Study} study @param {string} packId */
export function conditionsFor(study, packId) {
  const pack = packById(packId);
  const key = pack ? conditionPack(pack) : packId;
  return study.conditions.filter(c => c.startsWith(`${key}:`)).map(c => c.slice(key.length + 1));
}

/**
 * Aims a beam for one market and measures its requirements.
 * @param {Beam} beam @param {Study} study @param {Market} market @param {Pack} pack @param {PackFunction} fn
 * @returns {{ aim: Aim, items: Item[] }}
 */
function evaluateFunction(beam, study, market, pack, fn) {
  const laboratory = study.lamp.aim === 'laboratory';
  const shift = { dh: study.lamp.shiftH, dv: study.lamp.shiftV };
  const conditions = conditionsFor(study, pack.id);
  const headlamp = fn.kind === 'headlamp';
  // Pack data is written for right-hand traffic (headlamps) or with H outwards (signal lamps).
  const mirror = headlamp ? market.traffic === 'left' : study.lamp.outward === 'left';
  beam.receiverDeg = pack.receiverDeg;
  if (fn.beamClass) {
    const e = evaluateBeam(beam, { beamClass: fn.beamClass, traffic: market.traffic, ledFlux: study.lamp.sourceFlux, aimMethod: study.lamp.aimMethod }, { aim: laboratory ? 'laboratory' : 'measured', shift });
    return { aim: e.aim, items: e.items };
  }
  /** @type {Item[]} */
  const extra = [];
  /** @type {Aim} */
  let aim = { dh: shift.dh, dv: shift.dv, method: 'as measured', notes: [] };
  beam.dh = shift.dh; beam.dv = shift.dv;
  if (laboratory && fn.aimRule === 'unece-cutoff') {
    // R123 and R149 00 aim a passing beam by the same instrumental method as R149 01; only the citations differ.
    const cites = fn.cutoffCites ?? { sharpness: '', linearity: '', method: '' };
    const r = aimR149(beam, { beamClass: 'C', traffic: market.traffic, ledFlux: 0, aimMethod: study.lamp.aimMethod });
    aim = { ...r.aim, method: r.aim.method.replace(/Annex 6 §2\.3\.2\.1/, cites.method) };
    extra.push(...r.items.map(i => ({ ...i, cite: i.id === 'Sharpness' ? cites.sharpness : cites.linearity })));
  } else if (laboratory && fn.aimRule === 'driving-max') {
    const m = beam.maximum();
    beam.dh = -m.h; beam.dv = -m.v;
    aim = { dh: beam.dh, dv: beam.dv, method: 'maximum centred on H-V', notes: [] };
  } else if (laboratory && fn.aimRule === 'fmvss-visual-lower') {
    const right = conditions.includes('vor');
    const check = FMVSS_AIMING.visualLower.cutoffCheck;
    const h = right ? check.scanH.VOR : check.scanH.VOL;
    const scan = verticalScan(beam, h, check.scanToV, check.scanFromV);
    const target = right ? FMVSS_AIMING.visualLower.photometryCutoffV.VOR : FMVSS_AIMING.visualLower.photometryCutoffV.VOL;
    if (Number.isFinite(scan.inflection)) beam.dv = target - scan.inflection;
    beam.dh = 0;
    aim = { dh: 0, dv: beam.dv, method: `cut-off at ${Math.abs(target)}°${target < 0 ? 'D' : ''} (${right ? 'VOR' : 'VOL'}), no horizontal aim`, notes: Number.isFinite(scan.inflection) ? [] : ['No cut-off was found on the aiming scan; the beam was not aimed vertically.'] };
    const g = verticalScan(beam, h, check.scanToV, check.scanFromV).g;
    const m = (g - check.minGradient) / check.minGradient;
    extra.push({ id: 'Cut-off gradient', group: 'cutoff', label: `Cut-off gradient at ${Math.abs(h)}°${h < 0 ? 'L' : 'R'}`, requirement: `G at least ${check.minGradient}`, value: g, unit: 'G', margin: Number.isFinite(m) ? m : -1, error: 0, status: status(Number.isFinite(m) ? m : -1), cite: check.cite, h, v: target });
  } else if (laboratory && fn.aimRule === 'as-measured' && headlamp) {
    aim.notes.push(fn.aimText.length > 200 ? 'This function is measured without re-aiming; the file is taken as it is.' : fn.aimText);
  }
  const requirements = applicable(fn.requirements, conditions);
  const items = [...extra, ...measureRequirements(beam, requirements, { mirror, tolerance: fn.tolerance, passing: fn.roles.includes('passing'), pointRule: fn.pointRule, between: fn.between })];
  return { aim, items };
}

/**
 * The user's targets as requirements. A value in lx is converted at the target's centre: I = E d² / cos³ψ on a flat
 * screen 25 m away.
 * @param {Target[]} targets @returns {Requirement[]}
 */
export function targetRequirements(targets) {
  return targets.map((t, i) => {
    const hc = t.shape === 'point' ? t.h0 : (t.h0 + t.h1) / 2, vc = t.shape === 'point' ? t.v0 : (t.v0 + t.v1) / 2;
    const c = Math.cos((hc * Math.PI) / 180) * Math.cos((vc * Math.PI) / 180);
    const k = t.unit === 'lx' ? (SCREEN_DISTANCE * SCREEN_DISTANCE) / Math.max(1e-6, c * c * c) : 1;
    const limits = { ...(t.limit !== 'max' ? { min: t.min * k } : {}), ...(t.limit !== 'min' ? { max: t.max * k } : {}) };
    const base = { id: `target-${i + 1}`, label: t.name || `Target ${i + 1}`, group: /** @type {const} */ ('target'), cite: 'Your target', ...limits };
    if (t.shape === 'point') return { kind: 'point', ...base, h: t.h0, v: t.v0 };
    if (t.shape === 'line') return { kind: 'line', ...base, h0: t.h0, v0: t.v0, h1: t.h1, v1: t.v1 };
    return { kind: 'zone', ...base, polygon: [t.h0, t.v0, t.h1, t.v0, t.h1, t.v1, t.h0, t.v1] };
  });
}

/**
 * Candela per bin for drawing, in the file's own frame; NaN outside the file.
 * @param {Histogram[]} histograms @returns {CandelaLayer[]}
 */
export function fileLayers(histograms) {
  return histograms.map(hist => {
    const s = hist.spec, { nh, nv } = gridSize(s);
    const candela = new Float64Array(nh * nv);
    for (let r = 0; r < nv; r++) {
      const v0 = s.vMin + r * s.vStep;
      for (let c = 0; c < nh; c++) {
        const i = r * nh + c, h0 = s.hMin + c * s.step;
        candela[i] = hist.count[i] > 0 ? hist.flux[i] / binSolidAngle(h0, h0 + s.step, v0, v0 + s.vStep, 'goniometer') : NaN;
      }
    }
    return { spec: s, candela };
  });
}

/**
 * The whole analysis of a study.
 * @param {Study} study @param {StudyCache | null} cache
 * @returns {{ analysis: StudyAnalysis, cache: StudyCache }}
 */
export function analyseStudy(study, cache) {
  const markets = study.markets.filter(m => functionById(m.pack, m.fn));
  const needMirror = markets.some(m => beamKeyFor(study, m) === 'mirror');
  const c = prepare(study, cache, needMirror);
  /** @param {BeamKey} key */
  const beamOf = key => new Beam(/** @type {Histogram[]} */ (c.histograms[key]), 'goniometer', { exact: true });
  /** @type {MarketResult[]} */
  const results = markets.map(market => {
    const pack = /** @type {Pack} */ (packById(market.pack)), fn = /** @type {PackFunction} */ (functionById(market.pack, market.fn));
    const key = beamKeyFor(study, market);
    const { aim, items } = evaluateFunction(beamOf(key), study, market, pack, fn);
    return {
      market, key: `${market.pack}:${market.fn}:${market.traffic}`,
      pack: { id: pack.id, title: pack.title, short: pack.short, provenance: pack.provenance, statement: pack.statement, region: pack.region, notes: pack.notes, source: pack.source },
      fn: { id: fn.id, name: fn.name, aimText: fn.aimText, notes: fn.notes },
      beam: key, aim, items, pass: meets(items), worst: weakest(items),
    };
  });
  const first = results[0];
  const reference = first
    ? { beam: first.beam, aim: first.aim, label: `${first.pack.short}, ${first.market.traffic}-hand traffic` }
    : { beam: /** @type {BeamKey} */ ('file'), aim: { dh: study.lamp.shiftH, dv: study.lamp.shiftV, method: 'as measured', notes: [] }, label: 'As measured' };
  const beam = beamOf(reference.beam);
  beam.dh = reference.aim.dh; beam.dv = reference.aim.dv;
  const targets = measureRequirements(beam, targetRequirements(study.targets), { mirror: false, tolerance: 0 });
  // On the road a laboratory-aimed cut-off is first raised to the horizon; the vehicle's own aim then tilts it down.
  const fnRef = first ? functionById(first.market.pack, first.market.fn) : null;
  const lift = study.lamp.aim !== 'laboratory' || !fnRef || !fnRef.roles.includes('passing') ? 0
    : fnRef.aimRule === 'r149' || fnRef.aimRule === 'unece-cutoff' ? -RULES.lineB
    : fnRef.aimRule === 'fmvss-visual-lower' ? -(conditionsFor(study, first.market.pack).includes('vor') ? FMVSS_AIMING.visualLower.photometryCutoffV.VOR : FMVSS_AIMING.visualLower.photometryCutoffV.VOL) : 0;
  const road = isHeadlampRole(study.lamp.role) ? roadIlluminance(study.road, (h, v) => beam.at(h, v - lift, 0, 0)) : null;
  const peak = beam.maximum();
  /** @type {Partial<Record<BeamKey, CandelaLayer[]>>} */
  const layers = {};
  for (const key of /** @type {BeamKey[]} */ (['file', 'mirror'])) { const h = c.histograms[key]; if (h) layers[key] = fileLayers(h); }
  return { analysis: { file: c.description, layers, markets: results, reference: { ...reference, lift }, targets, road, peak }, cache: c };
}
