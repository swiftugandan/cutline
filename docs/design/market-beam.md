# Design: which lamp each market checks

Status: built.

## What engineers asked for

> So yesterday it would update the measurement points for left hand and right hand traffic. Now it has a LHT beam and
> rht measurement points.

> Could I pick the beam measurements to switch on, including the hand of traffic? Like ECE R123 country mode beam,
> right-hand traffic, left-hand lamp.

Both messages come from the same confusion. A headlamp check pairs two things, each of which has a traffic side:

- **the lamp**: the beam that is measured, either the file or its mirror image;
- **the test points**: the regulation's points, lines and zones, drawn for right-hand or left-hand traffic.

Cutline shows the test points' side in the market name ("UN R149, RHT"). The lamp's side follows from two settings in
another panel, and the screen never states it. The first engineer saw a left-hand lamp under right-hand points and
could not tell why. The second wants to choose that pairing on purpose, and cannot see how.

## Principle

**Name both sides, everywhere a check is shown, and let the engineer set them where they look.** Use the engineer's own
words: a "left-hand lamp", "right-hand test points". Avoid the program's words: "for-side", "as-is", "mirror". The
mirror image is how Cutline makes the other lamp. It is shown as a fact about that lamp ("your file, mirrored"), never
as the name of the choice.

The engineer's request should take three choices in one dialog, and the result should explain itself on screen.

## The model

A market gains the lamp it checks:

```
Market = { pack, fn, traffic, lamp: 'matching' | 'other' }
```

- `traffic` is the side of the **test points**, as before.
- `lamp: 'matching'` (the default) checks the lamp for the test points' side. This is what an approval tests.
- `lamp: 'other'` checks the lamp for the other side on these points.

The market stores the lamp by its side, relative to its own test points. It does not store "the file" or "the
mirror image". Which of those two the lamp is follows from **Made for**: the file is the lamp for the side it is made
for, and its mirror image is the lamp for the other side. When the engineer corrects Made for (by hand, or with the
fix in the traffic-side note), every market keeps the lamp it was set to check. Only the beam that stands for that lamp
changes. Storing "file" or "mirror" would have tied the choice to whichever way round the file happened to be labelled.
An early draft used `'matching' | 'file'`, but that could not express the mirrored lamp on the file's own side, so it
was replaced.

The interface never shows these two words. It works out and shows the concrete pair: **Left-hand lamp (your file)** or
**Right-hand lamp (your file, mirrored)**, against **right-hand** or **left-hand test points**.

The study-wide **For the other traffic side** setting is removed. One setting per market means a reader never has to
work out which of two settings wins.

## Interface

### 1. The picture says what it shows

The beam view's breadcrumb names the pair for the market on screen. The pair comes straight after the file, as a chip
that never shrinks, and the legend hint repeats it:

```
JLR_L460_LDW_LHT.ies / [Left-hand lamp on right-hand test points] / UN R123, RHT, Class C passing beam (basic)
```

When the two sides differ, the chip is shown in the warning colour, and hovering over it gives the full sentence:
"Checks your left-hand lamp (the file as it is) on UN R123's right-hand traffic test points. A lamp for one side
usually fails the other side's points." This alone would have answered the first message. On a phone, the chip takes
the file name's place, in the matrix's short form: "LH lamp · RHT".

### 2. The matrix: a Lamp column you can switch

The market table gets a **Lamp** column with a two-way switch in every headlamp row. The switch names the sides
concretely, and the side of the test points sits right next to it:

```
Result      Market                 Lamp                  Function                         Met
✓ Meets     UN R149, RHT           [ LH │ RH▪ ]           Class C passing beam             26 of 26
✓ Meets     UN R149, LHT           [ LH▪│ RH  ]           Class C passing beam             26 of 26
✗ 4 fail    UN R123, RHT           [ LH▪│ RH  ] ⚠         Class C passing beam (basic)     15 of 19
```

- The pressed half is the lamp being checked. The half that matches the test points is the default.
- A pressed half that differs from the test points shows ⚠. Hovering over it says: "Your left-hand lamp on right-hand
  test points. A lamp for one side usually fails the other side's points."
- Hovering over **RH** when the file is left-hand says: "Right-hand lamp: your file, mirrored".
- A click is a labelled edit ("Check UN R123, RHT on the left-hand lamp"), so undo takes it back. The click also
  picks that market, so the picture shows the pair just chosen.
- The switch is a control of its row, like the row's remove button, not a command button. The ribbon refreshes the
  pressed state of every `data-cmd` button from its command, and one command cannot hold every row's state. The
  commands `ph-lamp-left` and `ph-lamp-right` act on the picked market, for the command palette.
- For signal lamps, which have no traffic side, the column is not shown.

The engineer's request, starting from the default study: **Add a market** → UN R123, Class C (basic), Right-hand
traffic → in the new row, press **LH**. Or choose the lamp in the dialog directly (see 3).

### 3. Add a market: say what will be checked

```
┌ Add a market ──────────────────────────────────────────────┐
│ Regulation    [ UN R123                              ▾ ]   │
│ Function      [ Class C passing beam (basic)         ▾ ]   │
│ Test points   [ Right-hand traffic                   ▾ ]   │
│ Lamp          [ Right-hand lamp (your file, mirrored) ▾ ]  │
│                                                            │
│ ⓘ Checks your right-hand lamp (the left-hand file          │
│   mirrored) on UN R123's right-hand traffic test points.   │
│                                          [ Cancel ] [ Add ]│
└────────────────────────────────────────────────────────────┘
```

- **Lamp** follows **Test points** until the engineer touches it. After that it stays where they put it.
- The sentence below restates the pair in full and changes with every control. When the sides differ, it adds: "A lamp
  for one side usually fails the other side's points."
- Choosing the same pack, function, test points and lamp twice is refused, as today. The same function with both lamps
  is allowed, so the two can be compared side by side.

### 4. Traffic-change functions

R123's traffic-change function (§5.8) checks a lamp of one system while it is used in the other traffic. Its side is
the lamp's own, so the dialog relabels it rather than asking two questions:

```
Test points   [ Left-hand lamp in right-hand traffic │ Right-hand lamp in left-hand traffic ]
```

The Lamp choice is not shown, because the function fixes it. Its matrix row has no switch and reads "Left-hand lamp in
right-hand traffic". This needs one catalogue field, `PackFunction.sideMeans: 'system'`, recorded with its citation
(R123 §5.8.2.1 and §5.8.2.2, p. 16). No regulation values change.

### 5. Design panel

**Made for** stays. Below it, a quiet line counts the markets (for example, "6 of 10 markets check the right-hand lamp,
your file mirrored"), so the panel and the matrix tell the same story. When Made for disagrees with the file's cut-off,
the warning says that every lamp checked is the wrong way round, because each market's lamp is read from the wrong
beam.

### 6. Report and results table

Each market's header names the pair: "Left-hand lamp on right-hand test points". The results table gains a **Lamp**
column (`left-hand` or `right-hand`, with "mirrored" where it applies).

## Data, schema and migration

- `STUDY_SPEC.markets` gains `lamp`. `lamp.otherTraffic` is removed. `STUDY_VERSION` goes from 1 to 2, and
  `node scripts/build-schema.mjs` regenerates `schema/`.
- `parseStudy` migrates a version 1 study before validating it. Each market for the other side than Made for gets
  `lamp = otherTraffic === 'as-is' ? 'other' : 'matching'`, and the rest get `matching`. Every old study then reads
  exactly the beams, and gets the results, it did before. Studies saved in the browser go through the same path.
- `defaultMarkets` and `setRole` create `matching` markets.
- A market's key becomes `pack:fn:traffic:lamp`.
- `beamKeyFor` reads the lamp's side (`lampSideOf` in the catalogue): the file when that side is Made for, otherwise
  its mirror image. Aiming, measurement and packs are untouched.

## Tests

- **Migration:** version 1 studies with either setting give identical results after migration.
- **Mixed study:** markets on both lamps read file and mirror as shown. The same function on both lamps is two markets.
- **Made for:** changing it keeps every market's lamp side, and swaps which beam stands for it.
- **Traffic-change:** the system labels, and no Lamp switch.
- **Browser, the two engineers' cases:**
  - An LHT file on RHT points says so in the breadcrumb.
  - The R123 request takes three dialog choices, and the new row shows ⚠ on **LH**.
  - The switch is an undoable edit and does not pick the row.
  - The dialog sentence follows each control.
  - Screenshots on desktop, in dark mode and at phone width. On a phone the switch keeps its two labels.

## Out of scope

- **Plain-English names for beam classes.** R123's names already carry its own words: basic, town, motorway, adverse
  weather. "Country" is not R123's word for Class C.
- **A second measurement file**, for example a separately measured right-hand lamp. That is a second source per
  study, a larger change.
