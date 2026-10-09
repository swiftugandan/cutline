# Cutline

Cutline is a browser app for car lamp engineers. It has three workspaces:

- **Lamp design** traces light through an LED projector or a multi-facet reflector, ray by ray, and checks the beam
  against UN Regulation No. 149 the way an approval laboratory would: it aims the beam by its cut-off, then measures
  every test point, line and zone.
- **Photometry** opens a light distribution, an IES or EULUMDAT file of a headlamp or a signal lamp, and shows it as
  isolux and road pictures with a colour scale you control, finds dark patches, and checks it against every market:
  UN R149 for right- and left-hand traffic, UN R123 (AFS), UN R148 for signal lamps, FMVSS 108, CMVSS 108, Taiwan's
  VSTD and India's AIS-199 and AIS-198, plus your own targets. It writes a report to share.
- **Vehicle** opens a model of the vehicle, lets you place each lamp on it, and checks where the lamps sit against
  UN R48 and FMVSS 108: heights, distance from the outer edge, separation, and the angles of geometric visibility
  with any bodywork that hides a lamp.

There is nothing to install, no account and no server. Your files stay on your computer.

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

Switch workspace at the top left. **Find any command** with Ctrl+K, and press F1 for each workspace's shortcuts.

**Work on the canvas.** Right-click anything in a view (or press and hold on a touch screen, or press Shift+F10) for
the commands that apply to it: a test point on the beam finds its row in the table, a point on the beam becomes a
target, a lamp on the vehicle zooms to it or mirrors, and a point on the model takes a new lamp. The status bar shows
the position under the pointer in the view's own terms; "Copy the position" puts it on the clipboard. **Measure**
(D) gives the angle and intensities between two directions on the beam, the distance between two points on the road
or in the lamp's sections, and the distance between two points on the vehicle, snapping to test points and lamp
centres.

### Lamp design

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
to find it on the beam. **Check every market** (Analyse tab) sends the traced beam to the photometry workspace.

**Optimise.** The Optimise study searches for values that give every requirement at least 15% headroom, within ranges
you set. It first samples the ranges evenly, then refines the best sample. Every candidate is traced on the same two
sets of random rays and judged by the worse, so differences between candidates are real and no design passes on one
set's luck. The result is confirmed with fresh rays before it offers to apply.

### Photometry

**Open a light distribution**: an IES file (LM-63, any edition) or a EULUMDAT file, or the beam traced in the lamp
design workspace. Tell Cutline what the lamp is (its function, and the traffic side it is made for or which side
faces outwards); the markets that cover that function are chosen for you, and you can add or remove any.

**See it.** The Beam picture shows intensity, or illuminance on a screen 25 m ahead, in false colour, heat, night or
grey. The colour scale beside it sets the top and bottom of the range (type a value; Fit returns to the data), log or
linear, and the contour levels. **Colour by uniformity** shows each direction against its surroundings, so dark
patches and stripes stand out while the cut-off and the beam's gentle edges read as even; the Uniformity study lists
every dark patch with its depth and size. The Road picture shows isolux on the road surface or on a target facing the
car, for one lamp or a pair, at the height, spacing and aim you set.

**Check it.** The Markets study shows every market as a row: met or not, the least headroom, and whether its data is
the official text or adopted by a national rule. Pick a row for its requirements, each with its measured value,
limit, margin and citation, and its test points marked on the beam. Each market aims the beam by its own laboratory
method (R149's cut-off scans, FMVSS's VOL or VOR aim), or you can check the file as measured. Tick the conditions that
hold for your lamp (mounted below 750 mm, marked "D", and so on). **Your targets** holds your own points, lines and
areas, as minima, maxima or ranges in cd or lx; pick a point on the beam to add one there.

**Report.** The report is one HTML file with the summary, the pictures at your scales, every requirement of every
market with its source, your targets, the dark patches and the markets Cutline could not check and why. Open it in a
browser and print to PDF. The results table downloads the same as CSV.

### Vehicle

**Open a model** of the vehicle as STL, OBJ or glTF (.glb), or try the sample vehicle. STEP and other CAD files must
first be exported as one of these from your CAD system. Set the model's units and its forward and up axes, the ground,
and the vehicle's overall width (which R48 measures without the mirrors).

**Place the lamps.** Right-click the model where a lamp's centre of reference is and choose its function, or use Add
a lamp and click the model. Set the size of its apparent surface; Mirror adds its twin on the other side, if it has none yet. Drag a lamp
to move it across the model: it snaps to its twin's mirror image (Alt stops that), and with Shift held its twin moves
too. The arrow keys nudge the selected lamp 1 mm at a time (10 mm with Shift). The selected lamp's heights, distance
from the outer edge and separation are drawn on the model, in the colour of their result.

**Look around.** Drag to turn the view about the point under the pointer, right-drag (or Shift-drag) to move it, and
scroll to zoom towards the pointer. Click a face of the cube at the top right for a standard view, double-click a lamp
or press Z to zoom to it, and press X to see through the body to lamps behind it. Orthographic view shows a scale bar.

**Check it.** The Installation study lists every check of UN R48 and FMVSS 108 for each lamp: presence and number for
the vehicle's category, height, distance from the outer edge, separation, and visibility. Visibility is found by
casting rays from the lamp's apparent surface across its field: the Visibility study maps which directions see all of
it, and the 3D view draws the field, with hidden directions in red. The report holds every check with pictures.

| Action | Keys |
|---|---|
| Find a command | Ctrl+K |
| Undo, redo | Ctrl+Z, Ctrl+Shift+Z |
| Download the workspace's document | Ctrl+S |
| Open a file | Ctrl+O, or drop it on the window |
| Switch view | 1, 2 or 3 |
| Fit the view | F, or double-click |
| Menu of what is under the pointer | Right-click, a long press, or Shift+F10 |
| Measure between two points | D; Esc ends |
| Help and each workspace's shortcuts | F1 or ? |

## Saving and files

Each workspace's document saves itself in your browser as you work. Browser storage can be cleared, so download a copy
(Ctrl+S) to keep it. The documents are plain JSON, each described by a published JSON Schema and the rules in
[docs/SCHEMA.md](docs/SCHEMA.md):

| Workspace | File | Schema |
|---|---|---|
| Lamp design | `.cutline.json` | [cutline.design.v1](schema/cutline.design.v1.schema.json) |
| Photometry | `.photometry.json`, with the light distribution inside | [cutline.photometry.v1](schema/cutline.photometry.v1.schema.json) |
| Vehicle | `.vehicle.json`; the model file stays beside it | [cutline.vehicle.v1](schema/cutline.vehicle.v1.schema.json) |

The lamp design also exports the compliance table and the aimed beam's candela table as CSV, and the traced beam as
an IES file.

## How it works

- [docs/PHYSICS.md](docs/PHYSICS.md) defines every quantity Cutline computes: the frame, the far-field angles, the LED,
  surfaces and materials, colour and scattering, the energy ledger, both lamp types and the road. It is the
  authority: if the code and that page disagree, the code is wrong.
- [docs/REGULATION.md](docs/REGULATION.md) says which text of each regulation Cutline follows, how it aims and
  measures a beam, how it checks a vehicle, and where it had to choose. The research behind each, with every source,
  is in [docs/research/](docs/research/).
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) explains how the pieces fit together, and
  [docs/design/workbench.md](docs/design/workbench.md) why the photometry and vehicle workspaces are built as they are,
  and [docs/design/canvas.md](docs/design/canvas.md) how the canvas menus, camera and tools work.

## For developers

| If you want to change… | Look in |
|---|---|
| Tracing, materials, the ledger | `src/core/tracer.js`, `src/core/geometry.js`, `src/core/optics.js`, `src/core/spectrum.js` |
| Lamp geometry | `src/core/lamps/` (`projector.js`, `reflector.js`, `cutoff.js`) |
| The design file format, defaults and rules | `src/core/model.js` (the field spec drives the validator, the schema and the inspector) |
| The regulations' requirements | `src/core/regulation/r149.js` and `src/core/regulation/data/` |
| Markets: packs, provenance, roles, aiming rules | `src/core/regulation/catalog.js` |
| Measuring any requirement | `src/core/regulation/engine.js` |
| Aiming and measuring a beam by R149 | `src/core/regulation/evaluate.js` |
| Reading IES and EULUMDAT files, angle systems | `src/core/distribution/` |
| The photometry study and its analysis | `src/core/study.js`, `src/core/study-analysis.js` |
| Uniformity and dark patches | `src/core/uniformity.js` |
| Vehicle models, the ray index, installation checks | `src/core/mesh/`, `src/core/vehicle.js`, `src/core/installation.js` |
| The workspaces and the shell | `src/workspaces/`, `src/app.js` |
| The road | `src/core/road.js` |
| The optimiser | `src/core/optimise.js`, `src/ui/optimise-view.js` |
| Work across cores | `src/worker/` |
| The views | `src/render/` (`beam-view.js`, `road-view.js`, `lamp-view.js`, `vehicle-view.js`, `palettes.js`); the 3D camera in `camera.js` |
| Canvas menus, the measure tool, positions | `src/ui/shell.js` (`Menu`), `src/ui/measure.js`, `src/ui/view-tools.js`, each workspace's `menu()` |
| The dock | `src/ui/compliance-view.js`, `budget-view.js`, `road-panel.js`, `photometry-views.js`, `vehicle-views.js` |
| Reports | `src/ui/report.js`, `src/ui/vehicle-report.js` |
| The design panel | `src/ui/inspector.js` |
| Ribbon, commands, dialogs | `src/app.js`, `src/ui/shell.js` |
| Colours and type | `style.css` (see [docs/BRAND.md](docs/BRAND.md)) |

### Checks and tests

```sh
npm run check        # strict type checking of the JSDoc-typed source (page and worker separately)
npm test             # optics, regulation, packs, imported files, uniformity, vehicle, 3D camera, features, lamps, schemas
python3 tests/browser_test.py   # end-to-end checks in Chromium; needs `npm start` running
```

The browser test needs Python Playwright (`pip install playwright==1.57.0 && playwright install chromium`). Set
`CHROMIUM_PATH` to use a Chromium you already have, and `CUTLINE_URL` to test another address. It writes
screenshots and a report to `test-results/`.

### Generated files

The files in `schema/` are generated: run `node scripts/build-schema.mjs` after changing a spec (`DESIGN_SPEC` in
`src/core/model.js`, `STUDY_SPEC` in `src/core/study.js`, `VEHICLE_SPEC` in `src/core/vehicle.js`). A test fails while
one is out of date.

## What it doesn't do

- The lamp design workspace checks the type-approval photometry of R149's 01 series. It does not check colour, the
  run-up time, the conformity-of-production allowances, bend lighting or adaptive driving beams. It models one optical
  unit with one LED; a production headlamp often combines several modules.
- The default LED projector meets Class C with headroom on every requirement. The default multi-facet reflector is a
  starting design that does not meet Class C yet.
- Mirrors are specular with Gaussian slope errors. Scattering is modelled only as the lens texture and the outer
  lens's haze; dust, ageing and heat are not.
- The photometry workspace judges one light distribution at a time: rules that compare two states of a lamp (stop to
  rear position ratios, a "D" lamp with one source failed, AFS modes measured with another mode's aim) are listed for
  you to check. It does not check China's GB 4599-2024 or GB 5920-2024, whose UN basis could not be established from
  an official source, or India's AIS-010 and AIS-012, which stand on UN texts Cutline does not hold.
- The vehicle workspace reads triangle meshes, not STEP: export STEP from your CAD system as STL, OBJ or glTF. Each
  lamp's apparent surface is a rectangle you size. Rules that depend on parts Cutline does not recognise on the model
  (the rear window, other lamps above or below) are listed to check by hand.
- It is for concept design. A passing result means the design, the file or the installation meets the transcribed
  limits, not that a lamp or a vehicle would pass at a technical service. Confirm final designs with a production
  optics tool, a goniophotometer and the technical service.

## Licence

Apache License 2.0. The Barlow typeface is under the SIL Open Font License (`brand/fonts/OFL.txt`).
