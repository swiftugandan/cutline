# Cutline

Cutline is a browser app for designing car headlamps. It traces light from the LED through the reflector, the shield
and the lens, ray by ray, and checks the beam against UN Regulation No. 149 the way an approval laboratory would: it
aims the beam by its cut-off, then measures every test point, line and zone. You see which requirements pass, by how
much, and where on the beam they sit. There is nothing to install, no account and no server. Your design stays on
your computer.

Cutline designs LED projector modules and multi-facet reflectors, for passing beams (Class C and V) and driving beams
(Class B and A), for right-hand and left-hand traffic.

**Try it:** [swiftugandan.github.io/cutline](https://swiftugandan.github.io/cutline/), or download `Cutline.html` from
the same page and open it offline.

## Run it on your machine

You need Node.js 22 or later.

```sh
npm install          # installs TypeScript, used only for type checking
npm start            # http://127.0.0.1:8766/
```

The app runs straight from `src/` with no build step. `npm run build` writes the single-file app to
`dist/Cutline.html`.

## Using it

**Change the design.** Every value lives in the Design panel on the right: the beam class and traffic side, the
intended cut-off, the LED, the optics and the outer lens. Type a value, use the arrow keys to step it, or drag a
field's label to scrub it (Shift for ×10, Alt for ×0.1). Each change traces a quick preview at once and the full beam
a moment later, using every processor core.

**Read the beam.** The Beam view shows the beam as the laboratory aims it: intensity as light on a dark wall, lines of
equal intensity, the intended cut-off, and every test point, line and zone coloured by its result. Point at the beam
for its intensity. The Road view shows two lamps lighting a straight road from above, and the Lamp view shows
sections through the lamp with a sample of traced rays.

**Check compliance.** The Compliance study lists every R149 requirement for the beam class, grouped by what it
protects: the cut-off, other drivers from glare, overhead signs, the road ahead and the foreground. Each row gives
the measured value, its statistical error, the limit, the margin and the paragraph of the regulation. Point at a row
to find it on the beam.

**Optimise.** The Optimise study searches for values that give every requirement at least 15% headroom, within ranges
you set. It first samples the ranges evenly, then refines the best sample. Every candidate is traced on the same two
sets of random rays and judged by the worse, so differences between candidates are real and no design passes on one
set's luck. The result is confirmed with fresh rays before it offers to apply.

**Find any command** with Ctrl+K.

| Action | Keys |
|---|---|
| Find a command | Ctrl+K |
| Undo, redo | Ctrl+Z, Ctrl+Shift+Z |
| Download the design | Ctrl+S |
| Open a design file | Ctrl+O, or drop a file on the window |
| Trace again at full quality | T |
| Beam, road or lamp view | 1, 2 or 3 |
| Fit the view | F, or double-click |
| Help | F1 or ? |

## Saving and files

The design saves itself in your browser as you work. Browser storage can be cleared, so download the design (Ctrl+S)
to keep a copy. Design files are plain JSON ending in `.cutline.json`, described by a published
[JSON Schema](schema/cutline.design.v1.schema.json) and the rules in [docs/SCHEMA.md](docs/SCHEMA.md). The File tab
also exports the compliance table and the aimed beam's candela table as CSV.

## How it works

- [docs/PHYSICS.md](docs/PHYSICS.md) defines every quantity Cutline computes: the frame, the far-field angles, the LED,
  surfaces and materials, colour and scattering, the energy ledger, both lamp types and the road. It is the
  authority: if the code and that page disagree, the code is wrong.
- [docs/REGULATION.md](docs/REGULATION.md) says which text of R149 Cutline follows, how it aims and measures a beam,
  and where it had to choose. The research behind it, with every source, is in
  [docs/research/r149-notes.md](docs/research/r149-notes.md).
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) explains how the pieces fit together.

## For developers

| If you want to change… | Look in |
|---|---|
| Tracing, materials, the ledger | `src/core/tracer.js`, `src/core/geometry.js`, `src/core/optics.js`, `src/core/spectrum.js` |
| Lamp geometry | `src/core/lamps/` (`projector.js`, `reflector.js`, `cutoff.js`) |
| The design file format, defaults and rules | `src/core/model.js` (the field spec drives the validator, the schema and the inspector) |
| The regulation's requirements | `src/core/regulation/r149.js` |
| Aiming and measuring a beam | `src/core/regulation/evaluate.js` |
| The road | `src/core/road.js` |
| The optimiser | `src/core/optimise.js`, `src/ui/optimise-view.js` |
| Work across cores | `src/worker/` |
| The views | `src/render/` (`beam-view.js`, `road-view.js`, `lamp-view.js`) |
| The dock | `src/ui/compliance-view.js`, `budget-view.js`, `road-panel.js` |
| The design panel | `src/ui/inspector.js` |
| Ribbon, commands, dialogs | `src/app.js`, `src/ui/shell.js` |
| Colours and type | `style.css` (see [docs/BRAND.md](docs/BRAND.md)) |

### Checks and tests

```sh
npm run check        # strict type checking of the JSDoc-typed source (page and worker separately)
npm test             # optics, regulation, features, lamps, schema
python3 tests/browser_test.py   # end-to-end checks in Chromium; needs `npm start` running
```

The browser test needs Python Playwright (`pip install playwright==1.57.0 && playwright install chromium`). Set
`CHROMIUM_PATH` to use a Chromium you already have, and `CUTLINE_URL` to test another address. It writes
screenshots and a report to `test-results/`.

### Generated files

`schema/cutline.design.v1.schema.json` is generated: run `node scripts/build-schema.mjs` after changing the field spec
in `src/core/model.js`. A test fails while it is out of date.

## What it doesn't do

- It checks the type-approval photometry of R149's 01 series. It does not check colour, the run-up time, the
  conformity-of-production allowances, bend lighting or adaptive driving beams.
- It models one optical unit with one LED. A production headlamp often combines several modules.
- The default LED projector meets Class C with headroom on every requirement. The default multi-facet reflector is a
  starting design that does not meet Class C yet: a single faceted reflector struggles to light the overhead signs and
  the wide segments while keeping its hot spot, and it still fails a handful of requirements.
- Mirrors are specular with Gaussian slope errors. Scattering is modelled only as the lens texture and the outer
  lens's haze; dust, ageing and heat are not.
- It is for concept design. A passing result means the simulated design meets the limits, not that a lamp would pass
  at a technical service. Confirm final designs with a production optics tool and a goniophotometer.

## Licence

Apache License 2.0. The Barlow typeface is under the SIL Open Font License (`brand/fonts/OFL.txt`).
