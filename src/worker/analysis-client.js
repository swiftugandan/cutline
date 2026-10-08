/** The page's handle on the analysis worker. Requests on one channel replace each other: when a newer request is sent,
 * an older one still in the worker resolves to null when it returns. */

/** @import { Design } from '../core/model.js' */
/** @import { Analysis, BeamData } from '../core/analysis.js' */
/** @import { Evaluation } from '../core/regulation/evaluate.js' */
/** @import { AnalyseRequest, AnalyseResponse } from './protocol.js' */

export class AnalysisClient {
  /** @param {Worker} worker */
  constructor(worker) {
    this.worker = worker;
    this.nextId = 1;
    /** @type {Map<number, { channel: string, resolve: (r: AnalyseResponse) => void, reject: (e: Error) => void }>} */
    this.pending = new Map();
    /** @type {Map<string, number>} latest request id per channel */
    this.latest = new Map();
    worker.onmessage = event => {
      const message = /** @type {AnalyseResponse} */ (event.data);
      const entry = this.pending.get(message.id);
      if (!entry) return;
      this.pending.delete(message.id);
      entry.resolve(message);
    };
    worker.onerror = event => {
      const error = new Error(event.message || 'The analysis worker stopped unexpectedly.');
      for (const entry of this.pending.values()) entry.reject(error);
      this.pending.clear();
    };
  }

  /**
   * @param {string} channel @param {Design} design @param {BeamData} data @param {boolean} full
   * @returns {Promise<AnalyseResponse | null>}
   */
  async send(channel, design, data, full) {
    const id = this.nextId++;
    this.latest.set(channel, id);
    /** @type {AnalyseRequest} */
    const request = { kind: 'analyse', id, design, data: { histograms: data.histograms, emitted: data.emitted, ledger: data.ledger, rays: data.rays }, full };
    const response = await new Promise((resolve, reject) => { this.pending.set(id, { channel, resolve, reject }); this.worker.postMessage(request); });
    if (this.latest.get(channel) !== id) return null;
    if (!response.ok) throw new Error(response.error);
    return response;
  }

  /** The full analysis of a beam. @param {string} channel @param {Design} design @param {BeamData} data @returns {Promise<Analysis | null>} */
  async analyse(channel, design, data) {
    const r = await this.send(channel, design, data, true);
    return r && r.ok ? r.analysis : null;
  }

  /** The evaluation alone. @param {string} channel @param {Design} design @param {BeamData} data @returns {Promise<Evaluation | null>} */
  async evaluate(channel, design, data) {
    const r = await this.send(channel, design, data, false);
    return r && r.ok ? r.evaluation : null;
  }
}
