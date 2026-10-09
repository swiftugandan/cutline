# File formats

Cutline keeps three kinds of document, one per workspace: the lamp design, the photometry study and the vehicle.

## Lamp design

A Cutline design is one JSON document, saved with the extension `.cutline.json`. It holds only the designer's
intent: the beam class, the cut-off, the LED, the optics, the outer lens, the mounting and the simulation settings.
Everything else is derived and never saved: the lamp's surfaces, traces, the compliance check, the views and the panel
state.

The structure is published as a JSON Schema, [schema/cutline.design.v1.schema.json](../schema/cutline.design.v1.schema.json),
generated from the field spec in `src/core/model.js`. The loader validates against the same spec, so a file that
loads is a file the schema accepts. Unknown fields are refused.

### Units

| Quantity | Unit |
|---|---|
| Lengths in the lamp | millimetres |
| Mounting height | metres |
| Angles | degrees |
| Luminous flux | lumens |
| Shares (reflectance, transmittance, haze) | fractions from 0 to 1 |
| Slope error | milliradians |

### Top level

| Field | Meaning |
|---|---|
| `format`, `version` | Always `"cutline.design"` and `1` |
| `id`, `title`, `notes` | Identity and free text |
| `beamClass` | `"C"` or `"V"` for a passing beam, `"B"` or `"A"` for a driving beam (UN R149 01 series) |
| `traffic` | `"right"` or `"left"` |
| `cutoff` | The intended cut-off: its horizontal part, elbow, rise and rise height, and the laboratory's horizontal aiming method |
| `led` | Flux, emitter size and offset along the axis |
| `optics` | A union on `type`: `"projector"` (ellipsoidal reflector, shield and lens) or `"reflector"` (multi-facet paraboloid) |
| `cover` | The outer lens: transmittance, haze and haze spread |
| `mounting` | Height above the road and downward aim, for the road view |
| `simulation` | Rays per full trace and the random seed |

### Rules the schema cannot express

The loader also checks these, and refuses a design that breaks one:

- The projector reflector's semi-major axis must exceed half the distance between its foci.
- The projector lens must stay at least 0.5 mm thick at its edge.
- The lens surface must be defined across its whole diameter: (1 + k)(r/R)² < 1.
- The sign light's smallest turn cannot exceed its largest, and the sign-light strip must be shorter than the lens
  diameter.
- A reflector cannot have more kick-side columns or overhead facets than it has columns.

## Photometry study

A photometry study is one JSON document, downloaded as `.photometry.json` and described by
[schema/cutline.photometry.v1.schema.json](../schema/cutline.photometry.v1.schema.json), generated from `STUDY_SPEC` in
`src/core/study.js`. It holds the light distribution file's text, so a study travels whole.

| Field | Meaning |
|---|---|
| `source` | The file's name and its full text (IES or EULUMDAT, up to 48 MB) |
| `mapping` | How the file's angles map to Cutline's frame: the photometry type (`"file"` takes the file's own), the Type C axis plane and direction, and a left–right mirror |
| `lamp` | The lamp's role, the traffic side it is made for, how to treat the other side, which side is outwards for a signal lamp, the aim (laboratory or as measured, with shifts in degrees), R149's horizontal aiming method and the source flux |
| `conditions` | Facts declared about the lamp, as `"pack:condition"`, such as `"r148:low-mounting"` |
| `markets` | The markets to check: a pack id, one of its function ids and a traffic side |
| `targets` | The engineer's own requirements: a name, a point, line or area in degrees, a limit and its unit (cd, or lx at 25 m) |
| `road` | Light on the road surface or on a target, which lamps, mounting height and spacing (m), aim (%), and the road's length and width (m) |
| `display` | The beam and road pictures' colour scales: log or linear, fitted or fixed range, palette and contour levels; the beam's quantity (cd or lx at 25 m), colouring (light or uniformity), feature size and dark-patch depth |

The loader also refuses a study whose markets name a pack, function or traffic side the catalogue does not hold, a
target whose range has its minimum above its maximum, and a fixed colour scale whose top is not above its bottom (or
whose bottom is not above zero on a log scale).

## Vehicle

A vehicle is one JSON document, downloaded as `.vehicle.json` and described by
[schema/cutline.vehicle.v1.schema.json](../schema/cutline.vehicle.v1.schema.json), generated from `VEHICLE_SPEC` in
`src/core/vehicle.js`. The model file is **not** inside it: the browser keeps it beside the document, and a downloaded
vehicle names the model file to open with it.

| Field | Meaning |
|---|---|
| `model` | The model file's name, its units and its forward and up axes, and the ground's distance below its lowest point (mm) |
| `vehicle` | The UN category, the FMVSS vehicle type, the overall width between the extreme outer edges (mm, 0 to take the model's) and which regulations to check |
| `lamps` | Each lamp's name, function, the direction its reference axis faces, its centre of reference (x forwards, y left, z up, mm) and its apparent surface's width and height (mm) |

The loader also refuses a model whose forward and up axes are the same axis.

## Changing the formats

Add or change fields only in the specs (`DESIGN_SPEC`, `STUDY_SPEC`, `VEHICLE_SPEC`), then run
`node scripts/build-schema.mjs`. A test fails while a committed schema is out of date. The project has not been
released, so there are no older versions to migrate.
