# Cutline: notes for agents

Cutline is a browser app for car lamp engineers, in three workspaces: lamp design (a custom 3D Monte Carlo ray tracer
and a UN R149 checker), photometry (IES and EULUMDAT files checked against every market and the engineer's targets)
and vehicle (lamp positions on a vehicle model checked against UN R48 and FMVSS 108). Read README.md for the layout,
docs/ARCHITECTURE.md for how it fits together and docs/design/workbench.md for why the newer workspaces are built as
they are.

## Commands

- `npm start`: dev server at http://127.0.0.1:8766/ (modular source, no build step).
- `npm run check`: strict type checking with `tsc --checkJs`. There are two configs, because the page uses DOM types
  and `src/worker/` uses Web Worker types.
- `npm test`: Node test runner. Covers optics, the regulation evaluator and packs, imported files, uniformity, the
  vehicle checks, features, lamps and the schemas.
- `python3 tests/browser_test.py`: end-to-end checks; needs `npm start` running.
- `npm run build`: writes `dist/Cutline.html`. `npm run build:pages` writes `_site/`.

## Rules

- `docs/PHYSICS.md` is the authority on what every number means, and `docs/REGULATION.md` on how a beam is aimed and
  measured and a vehicle checked. Change the doc and the code together, and add a test that pins the behaviour.
- Every regulation number lives in a data module with its citation (table or paragraph, and the page as the document
  prints it): R149 01 in `src/core/regulation/r149.js`, every other text in `src/core/regulation/data/`. Never fill a
  regulation value from memory: take it from the official text, record the source in the pack's
  `docs/research/*-notes.md`, and list the pack in `docs/REGULATION.md`. A market whose basis cannot be established
  from an official source is listed as not checked, never filled in.
- A new market goes into `src/core/regulation/catalog.js` with its provenance, the lamp roles it serves and its
  aiming rule. Requirement kinds are those `engine.js` measures; extend the engine rather than bending data to fit.
- `src/core/` has no DOM access. Keep it that way so Node tests and the workers can use it.
- Add document fields only through the specs (`DESIGN_SPEC` in `src/core/model.js`, `STUDY_SPEC` in
  `src/core/study.js`, `VEHICLE_SPEC` in `src/core/vehicle.js`), then run `node scripts/build-schema.mjs`. Never
  hand-edit `schema/`.
- Each workspace owns its document and renders into the shared regions only while it is active (the contract is in
  `src/workspaces/workspace.js`). Its commands are registered with its id, so they run only while it is active.
- The bundler (`build.mjs`) supports only single-line `import { … } from '…'` and `export function|class|const|let`.
  Don't use default exports, `export { … }` lists or dynamic `import()` in `src/`. Keep the one
  `new Worker(new URL('./worker/trace.worker.js', import.meta.url), { type: 'module' })` in `main.js` as written; the
  bundler rewrites it.
- Buttons get behaviour from `data-cmd` plus a registered command. Never attach click handlers to individual command
  buttons. A delegated listener handles them, because the ribbon is rebuilt on every tab switch.
- Every user-visible edit goes through the workspace's `DocumentStore` transactions so undo and validation work.
- Monte Carlo values carry statistical error. Judge a design change with enough rays (the app's full trace, 20
  million by default), and compare candidates on the same seed.
- UI copy: British English, plain verbs, sentence case, no all-caps labels.

## Browser testing locally

- The dev server's Content Security Policy blocks Playwright's string evaluation. Create the context with
  `bypass_csp=True`, as `tests/browser_test.py` does.
- If Playwright's expected Chromium build isn't installed, point `CHROMIUM_PATH` at a cached one, for example
  `~/Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell`.
- Look at the screenshots in `test-results/` after UI changes; the app is held to a pixel-perfect standard. The test
  covers all three workspaces, including a phone layout.
- The vehicle view needs WebGL 2; Chromium's headless shell provides it through SwiftShader.
