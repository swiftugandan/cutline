/** Entry point: starts the workers and the app. */

import { CutlineApp } from './app.js';

const createWorker = () => new Worker(new URL('./worker/trace.worker.js', import.meta.url), { type: 'module' });
const app = new CutlineApp(createWorker);
/** @type {any} */ (window).cutline = app;
app.start().catch(error => {
  console.error(error);
  document.body.dataset.bootError = error instanceof Error ? error.message : String(error);
});
