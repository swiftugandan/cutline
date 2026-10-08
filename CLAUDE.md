# Cutline: notes for agents

Cutline is a browser app for designing car headlamps with a custom 3D Monte Carlo ray tracer and a UN R149 checker.
Read README.md for the layout and docs/ARCHITECTURE.md for how it fits together.

## Commands

- `npm start`: dev server at http://127.0.0.1:8766/ (modular source, no build step).
- `npm run check`: strict type checking with `tsc --checkJs`. There are two configs, because the page uses DOM types
  and `src/worker/` uses Web Worker types.
- `npm test`: Node test runner. Covers optics, the regulation evaluator, features, lamps and the schema.
- `python3 tests/browser_test.py`: end-to-end checks; needs `npm start` running.
- `npm run build`: writes `dist/Cutline.html`. `npm run build:pages` writes `_site/`.

## Rules

- `docs/PHYSICS.md` is the authority on what every number means, and `docs/REGULATION.md` on how a beam is aimed and
  measured. Change the doc and the code together, and add a test that pins the behaviour.
- Every R149 number lives in `src/core/regulation/r149.js` with its citation (table or paragraph, and the page as the
  document prints it). Never fill a regulation value from memory: take it from the official text, and record the
  source in `docs/REGULATION.md`.
- `src/core/` has no DOM access. Keep it that way so Node tests and the workers can use it.
- Add design fields only through `DESIGN_SPEC` in `src/core/model.js`, then run `node scripts/build-schema.mjs`. Never
  hand-edit `schema/`.
- The bundler (`build.mjs`) supports only single-line `import { … } from '…'` and `export function|class|const|let`.
  Don't use default exports, `export { … }` lists or dynamic `import()` in `src/`. Keep the one
  `new Worker(new URL('./worker/trace.worker.js', import.meta.url), { type: 'module' })` in `main.js` as written; the
  bundler rewrites it.
- Buttons get behaviour from `data-cmd` plus a registered command. Never attach click handlers to individual command
  buttons. A delegated listener handles them, because the ribbon is rebuilt on every tab switch.
- Every user-visible edit goes through `DesignStore` transactions so undo and validation work.
- Monte Carlo values carry statistical error. Judge a design change with enough rays (the app's full trace, 20
  million by default), and compare candidates on the same seed.
- UI copy: British English, plain verbs, sentence case, no all-caps labels.

## Browser testing locally

- The dev server's Content Security Policy blocks Playwright's string evaluation. Create the context with
  `bypass_csp=True`, as `tests/browser_test.py` does.
- If Playwright's expected Chromium build isn't installed, point `CHROMIUM_PATH` at a cached one, for example
  `~/Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell`.
- Look at the screenshots in `test-results/` after UI changes; the app is held to a pixel-perfect standard.
