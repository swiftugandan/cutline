/// <reference lib="webworker" />
/** A Cutline worker. In the trace pool it traces one block-aligned chunk of rays for a design; as the analysis worker
 * it checks a merged beam against the regulation. Results travel back by transfer. */

import { buildLamp, traceOptions } from '../core/lamp.js';
import { trace } from '../core/tracer.js';
import { analyse, evaluateBeam } from '../core/analysis.js';

/** @import { WorkerRequest, ChunkResponse, AnalyseResponse } from './protocol.js' */

const scope = /** @type {DedicatedWorkerGlobalScope} */ (/** @type {unknown} */ (self));

scope.onmessage = event => {
  const job = /** @type {WorkerRequest} */ (event.data);
  try {
    if (job.kind === 'chunk') {
      const result = trace(buildLamp(job.design), traceOptions(job.design, { rays: job.rays, pathCount: job.pathCount }), { from: job.from, to: job.to });
      /** @type {ChunkResponse} */
      const message = { id: job.id, ok: true, result };
      scope.postMessage(message, result.histograms.flatMap(h => [h.flux.buffer, h.count.buffer]));
      return;
    }
    if (job.full) {
      const analysis = analyse(job.design, job.data);
      /** @type {AnalyseResponse} */
      const message = { id: job.id, ok: true, analysis, evaluation: analysis.evaluation };
      scope.postMessage(message, [...analysis.layers.map(l => l.candela.buffer), analysis.road.lux.buffer]);
    } else {
      /** @type {AnalyseResponse} */
      const message = { id: job.id, ok: true, analysis: null, evaluation: evaluateBeam(job.design, job.data) };
      scope.postMessage(message);
    }
  } catch (error) {
    scope.postMessage({ id: job.id, ok: false, error: error instanceof Error ? error.message : String(error) });
  }
};
