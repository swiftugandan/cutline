/** Messages between the page and the workers. One worker script serves two roles: pool workers trace chunks of rays,
 * and an analysis worker checks a merged beam against the regulation. This module has no runtime code. */

/** @import { Design } from '../core/model.js' */
/** @import { TraceResult } from '../core/types.js' */
/** @import { Analysis, BeamData } from '../core/analysis.js' */
/** @import { Evaluation } from '../core/regulation/evaluate.js' */

/**
 * @typedef {{ kind: 'chunk', id: number, design: Design, rays: number, pathCount: number, from: number, to: number }} ChunkRequest
 * @typedef {{ id: number, ok: true, result: TraceResult } | { id: number, ok: false, error: string }} ChunkResponse
 * @typedef {{ kind: 'analyse', id: number, design: Design, data: BeamData, full: boolean }} AnalyseRequest
 *   full: the whole analysis (evaluation, candela layers, road); otherwise the evaluation alone.
 * @typedef {{ id: number, ok: true, analysis: Analysis | null, evaluation: Evaluation } | { id: number, ok: false, error: string }} AnalyseResponse
 * @typedef {ChunkRequest | AnalyseRequest} WorkerRequest
 */

export {};
