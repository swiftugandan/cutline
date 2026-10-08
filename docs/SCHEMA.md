# Design file format

A Cutline design is one JSON document, saved with the extension `.cutline.json`. It holds only the designer's
intent: the beam class, the cut-off, the LED, the optics, the outer lens, the mounting and the simulation settings.
Everything else is derived and never saved: the lamp's surfaces, traces, the compliance check, the views and the panel
state.

The structure is published as a JSON Schema, [schema/cutline.design.v1.schema.json](../schema/cutline.design.v1.schema.json),
generated from the field spec in `src/core/model.js`. The loader validates against the same spec, so a file that
loads is a file the schema accepts. Unknown fields are refused.

## Units

| Quantity | Unit |
|---|---|
| Lengths in the lamp | millimetres |
| Mounting height | metres |
| Angles | degrees |
| Luminous flux | lumens |
| Shares (reflectance, transmittance, haze) | fractions from 0 to 1 |
| Slope error | milliradians |

## Top level

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

## Rules the schema cannot express

The loader also checks these, and refuses a design that breaks one:

- The projector reflector's semi-major axis must exceed half the distance between its foci.
- The projector lens must stay at least 0.5 mm thick at its edge.
- The lens surface must be defined across its whole diameter: (1 + k)(r/R)² < 1.
- The sign light's smallest turn cannot exceed its largest, and the sign-light strip must be shorter than the lens
  diameter.
- A reflector cannot have more kick-side columns or overhead facets than it has columns.

## Changing the format

Add or change fields only in `DESIGN_SPEC` in `src/core/model.js`, then run `node scripts/build-schema.mjs`. A test
fails while the committed schema is out of date. The project has not been released, so there are no older versions
to migrate.
