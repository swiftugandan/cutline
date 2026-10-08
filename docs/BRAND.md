# Brand

Cutline has its own identity, drawn from what it designs: a beam of light at night, with a sharp cut-off line that
keeps it out of other drivers' eyes.

## Colour

| Token | Value | Role |
|---|---|---|
| `--ink` | `#15181e` | Title bar and headings. Night asphalt |
| `--sun` | `#f2c230` | Road-marking yellow. Reserved for light itself, the cut-off and the one main action on a page |
| `--accent` | `#1d6f8b` | Interface state: selected tabs, focus rings, links |
| `--canvas` | `#0b0d11` | The night behind every view, so traced light reads as light |
| `--ok`, `--warn`, `--danger` | green, amber, red | Pass, near the limit and fail. Used for results only, always with an icon and a word |
| neutrals | `#eceef1` to `#ffffff` | Cool greys for panels and lines |

The beam view draws intensity as light on a dark wall, from night blue through to white on a log scale, with
iso-candela lines in marking yellow. The road view draws light on asphalt. Ray colours in the lamp view say where
each ray ended: yellow into the beam, orange stopped by the shield, grey stopped by the housing. Dark mode keeps the
same roles with its own values (`:root[data-theme="dark"]` in `style.css`); the canvas stays dark in both.

## Type

One family: [Barlow](https://github.com/jpt/barlow), a grotesque with the plain, slightly rounded shapes of road signs,
under the SIL Open Font License (`brand/fonts/`), in weights 400, 500 and 600. Columns of numbers use tabular
figures. Labels are in sentence case.

## Mark

A lamp lens as a circle, with a marking-yellow cut-off line beside it that runs level and then rises towards the
kerb (`favicon.svg` and the `#mark` symbol in `index.html`).
