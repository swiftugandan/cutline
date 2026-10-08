/** A pool of trace workers. A trace is split into block-aligned chunks that the workers take in turn; the results
 * merge into exactly the trace one worker would have produced. A newer trace on the same channel cancels the chunks
 * an older one has not started. */

import { mergeTraces, RAY_BLOCK } from '../core/tracer.js';

/** @import { Design } from '../core/model.js' */
/** @import { TraceResult } from '../core/types.js' */
/** @import { ChunkRequest, ChunkResponse } from './protocol.js' */

/**
 * @typedef {{ channel: string, design: Design, rays: number, pathCount: number, chunks: { from: number, to: number }[], next: number,
 *   parts: (TraceResult | null)[], done: number, resolve: (r: TraceResult | null) => void, reject: (e: Error) => void,
 *   onProgress?: (done: number, total: number) => void, cancelled: boolean }} Job
 */

export class TracePool {
  /** @param {() => Worker} create @param {number} size */
  constructor(create, size) {
    /** @type {{ worker: Worker, busy: { job: Job, index: number } | null }[]} */
    this.workers = Array.from({ length: Math.max(1, size) }, () => ({ worker: create(), busy: null }));
    /** @type {Job[]} */
    this.queue = [];
    this.nextId = 1;
    /** @type {Map<number, { slot: { worker: Worker, busy: { job: Job, index: number } | null } }>} */
    this.inFlight = new Map();
    for (const slot of this.workers) {
      slot.worker.onmessage = event => this.receive(slot, /** @type {ChunkResponse} */ (event.data));
      slot.worker.onerror = event => this.fail(slot, new Error(event.message || 'A trace worker stopped unexpectedly.'));
    }
  }

  get size() { return this.workers.length; }

  /**
   * Traces a design. Resolves to null when a newer trace on the same channel replaced this one.
   * @param {string} channel @param {Design} design @param {{ rays: number, pathCount?: number, onProgress?: (done: number, total: number) => void }} options
   * @returns {Promise<TraceResult | null>}
   */
  trace(channel, design, { rays, pathCount = 0, onProgress }) {
    for (const job of this.queue) if (job.channel === channel && !job.cancelled) { job.cancelled = true; job.resolve(null); }
    this.queue = this.queue.filter(j => !j.cancelled);
    // Chunks small enough to share out, rounded to whole random-number blocks.
    const per = Math.max(RAY_BLOCK, Math.ceil(rays / (this.size * 3) / RAY_BLOCK) * RAY_BLOCK);
    /** @type {{ from: number, to: number }[]} */
    const chunks = [];
    for (let from = 0; from < rays; from += per) chunks.push({ from, to: Math.min(rays, from + per) });
    return new Promise((resolve, reject) => {
      /** @type {Job} */
      const job = { channel, design, rays, pathCount, chunks, next: 0, parts: chunks.map(() => null), done: 0, resolve, reject, onProgress, cancelled: false };
      this.queue.push(job);
      this.pump();
    });
  }

  pump() {
    for (const slot of this.workers) {
      if (slot.busy) continue;
      const job = this.queue.find(j => !j.cancelled && j.next < j.chunks.length);
      if (!job) return;
      const index = job.next++;
      const { from, to } = job.chunks[index];
      const id = this.nextId++;
      slot.busy = { job, index };
      this.inFlight.set(id, { slot });
      /** @type {ChunkRequest} */
      const request = { kind: 'chunk', id, design: job.design, rays: job.rays, pathCount: job.pathCount, from, to };
      slot.worker.postMessage(request);
    }
  }

  /** @param {{ worker: Worker, busy: { job: Job, index: number } | null }} slot @param {ChunkResponse} message */
  receive(slot, message) {
    this.inFlight.delete(message.id);
    const busy = slot.busy;
    slot.busy = null;
    if (busy && !busy.job.cancelled) {
      const job = busy.job;
      if (!message.ok) { job.cancelled = true; job.reject(new Error(message.error)); }
      else {
        job.parts[busy.index] = message.result;
        job.done++;
        job.onProgress?.(job.done, job.chunks.length);
        if (job.done === job.chunks.length) {
          this.queue = this.queue.filter(j => j !== job);
          job.resolve(mergeTraces(/** @type {TraceResult[]} */ (job.parts)));
        }
      }
    }
    this.queue = this.queue.filter(j => !j.cancelled);
    this.pump();
  }

  /** @param {{ worker: Worker, busy: { job: Job, index: number } | null }} slot @param {Error} error */
  fail(slot, error) {
    const busy = slot.busy;
    slot.busy = null;
    if (busy && !busy.job.cancelled) { busy.job.cancelled = true; busy.job.reject(error); }
    this.pump();
  }
}
