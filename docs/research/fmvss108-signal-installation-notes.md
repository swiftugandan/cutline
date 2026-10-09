# FMVSS No. 108: signal lamp photometry and lamp installation

Prepared 9 October 2026. These notes explain how the US Federal Motor Vehicle Safety Standard No. 108 (49 CFR 571.108)
was turned into two data files:

- `src/core/regulation/data/fmvss108-signal.js`: the photometric tables for turn signal lamps, taillamps, stop lamps,
  high-mounted stop lamps, parking lamps, side marker lamps, clearance and identification lamps, backup lamps and
  daytime running lamps, with the motorcycle alternatives.
- `src/core/regulation/data/fmvss108-installation.js`: which lamps each vehicle must carry, and their number, colour,
  location, mounting height, lens area and visibility.

Every value in both files was read from the official text fetched on 9 October 2026. Nothing was filled from memory.
Headlamp photometry (Tables XVIII to XXI) and reflector photometry (Table XVI) are not in these files.

## Sources

The current text is the eCFR. The section's source note lists 87 FR 10021 (22 February 2022) as its last amendment.
The eCFR version list also shows a version dated 5 December 2023; its text, with the markup stripped, is word for word
the same as the version before it, so that change was to table markup only. The text in force on 1 October 2026 is
therefore the same as in the annual edition of 1 October 2025.

| Key | Document | Used for | URL |
|---|---|---|---|
| eCFR | 49 CFR 571.108, XML, point in time 2026-10-01 | All paragraph text and the tables the CFR prints as text (I, III, IV, V, X, XI) | https://www.ecfr.gov/api/versioner/v1/full/2026-10-01/title-49.xml?part=571&section=571.108 |
| eCFR versions | Version list for Part 571 | Versions of § 571.108; the 2023-12-05 version was compared with 2023-12-04 | https://www.ecfr.gov/api/versioner/v1/versions/title-49.json?part=571 |
| CFR 2025 | 49 CFR Chapter V (10-1-25 Edition), § 571.108, pp. 390–514 | Page numbers for every citation; the tables printed as images (II-a, VI-a to IX, XII to XV) | https://www.govinfo.gov/content/pkg/CFR-2025-title49-vol6/pdf/CFR-2025-title49-vol6-sec571-108.pdf |
| 72 FR 68234 | Final rule, 4 December 2007 (the rewrite of FMVSS 108) | Original graphics ER04DE07.000 to .039; the complete footnotes of the 2007 Table IX (72 FR 68319) | https://www.govinfo.gov/content/pkg/FR-2007-12-04/pdf/07-5644.pdf |
| 76 FR 48009 | Final rule, response to petitions, 8 August 2011 | Graphics ER08AU11.161 to .169 (Tables VIII, IX, X, XII, XV and others); the reason for the Table IX footnote 6 wording (76 FR 48011, 48016) | https://www.govinfo.gov/content/pkg/FR-2011-08-08/pdf/2011-19595.pdf |

Each citation in the data reads, for example, `49 CFR 571.108 (10-1-25 ed.), Table VII (p. 467)`. The page is the one
printed in the annual edition.

The eCFR serves its table graphics from `/graphics/*.gif`, but those requests returned an access page meant for
browsers, not the image. The same graphics are embedded in the annual-edition PDF, so the tables were read from there:
each page was rendered rotated (the tables are printed sideways) at three to four times normal size, in strips, and
read cell by cell. Every table was read twice, once while transcribing and once against a dump of the finished data.
Two internal checks support the transcription: the multiplied columns of Tables VI-a and VI-b equal the base values
times 1.5, 2 and 2.5 at every cell, and the motorcycle Table XIII-a is exactly half of Tables VI-a and VII at every
point and group minimum, including the groups whose printed minimum differs from the sum of their points.

| Table | What it holds | Page |
|---|---|---|
| I-a | Required lamps: passenger cars, MPVs, trucks and buses | 450–453 |
| I-b | Required lamps: trailers | 454–456 |
| I-c | Required lamps: motorcycles | 456–458 |
| II-a to II-d | Headlighting systems | 459–461 |
| IV-a, IV-b, IV-c | Effective projected luminous lens area | 462 |
| V-a | Visibility of backup lamps, HMSL, school bus signal lamps | 462 |
| V-b, V-c | Visibility options: lens area, luminous intensity | 463–464 |
| V-d | Legacy visibility alternative | 464 |
| VI-a | Front turn signal lamps, base and 2.5× | 465 |
| VI-b | Front turn signal lamps, 2× and 1.5× | 466 |
| VII | Rear turn signal lamps | 467 |
| VIII | Taillamps | 468 |
| IX | Stop lamps (footnotes 4 to 6 on p. 470) | 469–470 |
| X | Side marker lamps | 470 |
| XI | Clearance and identification lamps | 471 |
| XII | Backup lamps | 472 |
| XIII-a | Motorcycle turn signal lamps (alternative) | 473 |
| XIII-b | Motor driven cycle stop lamps (alternative) | 474 |
| XIV | Parking lamps | 475 |
| XV | High-mounted stop lamps | 476 |

The task asked for "Table II (number, colour, location and mounting height)". In FMVSS 108 those columns are in
Table I. Table II lists headlighting systems (sealed beam types, combination, integral beam, replaceable bulb) and their
photometry references, so the installation file draws everything from Table I.

## Coordinates and names

S14.2.1.4 (p. 424) defines the test points. V and H are the vertical and horizontal planes through the lamp's light
source, normal to the test screen. Angles to the right (R) and left (L) are "to the right and left of the V line when
the observer stands behind the lamp and looks in the direction of its light beam". U and D are up and down. The data
uses h positive to the right and v positive upwards, as the brief asks.

Every photometric grid in Tables VI to XV is symmetric left to right, so the values are transcribed as printed, and
they read the same with h positive outwards. Three places name a side:

- Table VII prints, for each point, whether it applies to a double-faced turn signal lamp on a truck tractor mounted on
  the left or the right side (footnote 6, S6.1.1.3). Seen from behind a rear-facing lamp, R points to the vehicle's
  left, so the left-side lamp needs V and the R points, both of which are outboard. The data expresses the NO marks
  as conditional notes (see "Conditions" below).
- Table X footnote 1 and S7.4.13.2 let a side marker lamp on a vehicle under 30 feet meet its inboard 45° points
  (towards the other side marker lamp on the same side) at a reduced angle, measured 15 feet from the vehicle.
- Table XI footnote 4 lets a clearance lamp placed off the front or rear skip any point 45° inboard.

Point ids follow the CFR's own pattern in Table XV footnote 4: vertical first, then horizontal, so `5U-20L`, `H-V`,
`10D-5R`.

## How the tables combine their points

The tables print a minimum at each test point and a minimum for each group of points, but the footnotes combine them
in three different ways. The data keeps every printed point minimum in `min`, every group minimum in a `sum`, and
names the rule in each function's `pointRule`.

**`floor-60`** (Tables VI-a, VI-b, VII, IX, XIII-a and XV). Footnote 1 of Tables VI, VII, IX and XIII-a says "The
measured values at each test point must not be less than 60% of the minimum value." Table XV footnote 2 says the same
"when considering overall group photometry tables". Read with the group columns, a lamp passes when each group sum
meets the group minimum and no point falls below 60% of its printed minimum. The group minimum is often a little below
the sum of its point minimums: for example Table VII, red, one section, group 1 prints 50 against points adding to 52;
Table VI-a, two sections, group 1 prints 155 against 156; Table VIII, two sections, group 3 prints 16.8 against 16.7
(here above the sum). The data keeps the printed values; a script lists every such group.

**`group-alternative`** (Tables VIII, XII and XIV). Footnote 2 of Tables VIII and XIV, and footnote 4 of Table XII,
say: "If the sum of intensity values for all points in the group is not less than the specified total value for the
group, the measured intensity value for each individual test point is not required to meet the minimum value." So a
lamp passes a point either on its own minimum or through its group, and no floor applies.

**`group-only`** (Table XIII-b). The motor driven cycle stop lamp table prints group minimums only.

All the grid tables also carry the rule "The photometric intensity values between test points must not be less than
the lower specified minimum value of the two closest adjacent test points on a horizontal or vertical line." It sits in
each function's `between` field. Read literally it uses the printed minimum, not 60% of it, so between two points it
can be stricter than at the points themselves. Cutline does not yet check it.

## Front turn signal lamps

Table VI-a prints the base values and 2.5× the base; Table VI-b prints 2× and 1.5×. A script compared every printed
point and group value of the multiplied columns with the base times the multiplier, for one, two and three lighted
sections, and found no difference. The data therefore stores the base values once and builds the twelve functions
(`front-turn-<sections>-x<multiplier>`) by multiplying, and each function cites the table that prints its column.

The multiplier comes from the lamp's spacing to other lamps (S7.1.1.10.4, pp. 399–400):

| Spacing from the turn signal lamp to the lighted edge of | Multiplier |
|---|---|
| any lower beam headlamp, less than 100 mm | 2.5 |
| an auxiliary lower beam headlamp or fog lamp, at least 75 mm but less than 100 mm | 1.5 |
| the same, at least 60 mm but less than 75 mm | 2.0 |
| the same, less than 60 mm | 2.5 |
| none of the above | 1 (base) |

Where more than one relationship exists, the highest multiplier applies (S7.1.1.10.1). Spacing is measured from the
light source for a lamp without a reflector, and from the centroid of the effective projected luminous lens area for a
lamp with one (S7.1.1.10.2, S7.1.1.10.3). A DRL closer than 100 mm also forces 2.5× unless the DRL switches off while
the turn signal operates (S7.10.10.1, p. 406). The exported `FRONT_TURN_MULTIPLIERS` carries these rules with their
citations.

Table VI sets no maximum for front turn signal lamps.

## Lighted sections

Turn signal lamps, stop lamps and taillamps have 1-, 2- and 3-section columns. On a passenger car or a vehicle under
2032 mm wide, two compartments or lamps no more than 560 mm apart, or three no more than 410 mm apart, are measured
together against the 2- or 3-section column; farther apart, each meets the 1-section column (S7.1.1.11, S7.1.2.11,
S7.2.11, S7.3.11). The distance is between adjacent light sources for turn signal and stop lamps, and between optical
axes for taillamps. On MPVs, trucks and buses 2032 mm or more wide, a multiple compartment turn signal or stop lamp is
measured as a whole, and at most two taillamps or compartments per side may be closer than 560 mm, each then meeting the
1-section values (S7.2.11.4).

## Ratios to combined lamps

When a parking lamp or clearance lamp is combined with a front turn signal lamp, or a taillamp or clearance lamp with a
rear turn signal or stop lamp, the signal at each marked point must be at least 3 or 5 times the combined lamp's value
at the same point (S7.1.1.12.1, S7.1.2.12.1, S7.3.12.1). A "-" in the parking lamp column means no ratio at that
point. The clearance lamp ratios apply only on vehicles 2032 mm or more wide. These are `relative` entries with
`of: 'reference'` and the combined lamp named in `reference`; they need a second measured distribution, which an IES
file of the signal function alone does not hold.

Where the combined lamp's own maximum lies below horizontal and near a test point, the ratio there may use the
combined lamp's lowest value within that area. The radius is 1.0° for a clearance lamp combined with a front turn
signal lamp (S7.1.1.12.4), and 0.5° for a taillamp combined with a rear turn signal or stop lamp, 1.0° on vehicles
2032 mm or more wide (S7.1.2.12.4, S7.3.12.4). The text grants no such allowance for a parking lamp combined with a
front turn signal lamp.

## Slashed values

Two tables print pairs such as "26/27", and their footnotes read in opposite directions.

- Table VII footnote 5 (unchanged since 2007): "Values preceded by a slash (/) apply only to multipurpose passenger
  vehicles, trucks, trailers, and buses of 2032 mm or more in overall width." So in 26/27, 130/120, 80/84 and 610/590
  the second value is for wide vehicles.
- Table IX footnote 6, as amended in 2011: "Values followed by a slash (/) apply only to lamps installed on
  multipurpose passenger vehicles, trucks, trailers, and buses of 2032 mm or more in overall width." So in the stop
  lamp's taillamp ratio "3/5" at H-5L, 3 is for wide vehicles and 5 for the rest. The 2007 text said "preceded by";
  the 2011 final rule changed it on a petition and states that "the photometric ratio for the H–5L test point for wide
  vehicles is 3:1" (76 FR 48016).

The data keeps the narrow-vehicle value as the unconditional entry and adds a `(wide)` entry that replaces it under the condition `wide` (see "Conditions" below).

In the annual-edition image of Table IX on p. 469, the footnotes stop after footnote 3. Footnotes 4 to 6 are printed as
a separate image at the top of p. 470, before Table X. The 2011 Federal Register image of Table IX has the same split.

## Maximums

| Table | Maximum | Where |
|---|---|---|
| VI | None | |
| VII | Red 300, 360, 420 cd; amber 750, 900, 900 cd (1, 2, 3 sections) | Footnote 4: "must not occur over any area larger than that generated by a 0.5° radius within a solid angle defined by the test point range" |
| VIII | 18, 20, 25 cd | At each U and H point; "-" at D points; footnote 4: "A taillamp shall not exceed the maximum intensity at H or above" |
| IX | 300, 360, 420 cd | Footnote 3, as Table VII |
| X | None | |
| XI | Red 15 cd | Footnote 3: when optically combined with a stop or turn signal lamp, the maximum applies on or above the horizontal |
| XII | 300 cd each lamp of a multiple lamp system, 600 cd a single lamp system | At each U and H point; "-" at 5D points |
| XIII-a | Rear red 300, 360, 420 cd; rear amber 750, 900, 900 cd; front none | Footnote 3, as Table VII |
| XIII-b | 300, 360, 420 cd | Footnote 1, as Table VII |
| XIV | 125 cd at U and H points, 250 cd at D points | Per point |
| XV | 160 cd | Footnote 4: not over any area larger than a 0.25° radius cone, within the rectangle 10U-10L, 10U-10R, 5D-10L, 5D-10R |
| DRL | 3,000 cd | "at any location in the beam" (S7.10.13) |

Cutline reads the "area larger than a 0.5° radius" wording as allowing a brighter spot smaller than that cone, so the
maximum should be judged on the intensity averaged over a 0.5° (or 0.25°) radius. The entries carry `spotRadiusDeg`.
The text does not define "the solid angle defined by the test point range"; the natural reading is the rectangle from
20L to 20R and 10U to 10D that the test points span.

## Measurement distances and aim

Side marker, clearance, identification and parking lamps are measured at 1.2 m or more; turn signal, stop, tail,
backup and school bus signal lamps at 3 m or more (S14.2.1.3, p. 424). The lamp is mounted in its normal operating
position (S14.2.1.1). Compartments photometered together have the H-V axis at the midpoint between their optical axes
(S14.2.1.5.1), and are measured together only if each optical axis is within 0.6° of the H-V axis; otherwise each is
aligned in turn and the values added (S14.2.1.5.2). Wide vehicles must use the second method (S14.2.1.5.3).

The DRL is tested by the headlamp procedure (S14.2.4.1 refers to S14.2.5), at 18.3 m or more, or 3 m when combined with
another required lamp that is not a headlamp (S14.2.4.2, p. 426).

No coordinate tolerance is granted for signal lamps. The "1/4° reaim ... at any test point" of S14.2.5.5 (p. 426)
applies to headlamps. Whether it extends to a DRL tested "to the procedure of S14.2.5" is not stated; the data gives
the DRL no tolerance.

Where a lamp's axis of reference is less than 750 mm above the road, the downward points below 5° down may be met at
5° down. The data gives each such point a variant at 5° down that replaces it under the condition `low-mounting`
(see "Conditions" below).

## Installation

The installation file lists twenty devices from Table I-a with their presence on each vehicle group. Table I-a names
three groups: all passenger cars, MPVs, trucks and buses; those less than 2032 mm in overall width (parking lamps, and,
with GVWR of 10,000 lb or less, the high-mounted stop lamp); and those 2032 mm or more wide (clearance and
identification lamps). Vehicles 30 feet or longer add intermediate side marker lamps and reflectors. Trailers (Table
I-b) and motorcycles (Table I-c) appear in `presence` with their main differences.

Heights are printed in inches except the headlamps (centimetres) and the DRL (metres). The data keeps the printed text
and gives millimetres at 25.4 mm per inch: 15 in = 381 mm, 34 in = 863.6 mm, 60 in = 1524 mm, 72 in = 1828.8 mm and
83 in = 2108.2 mm. Mounting height is measured from the centre of the item, on the vehicle at curb weight, to the road
(S6.1.4, p. 396).

In Table I-a the rear turn signal row and the rear side marker row leave the height column blank, because each shares a
cell with the front row above it. The data gives them the front row's limits, which Table I-b repeats for trailers.

Table I sets no distance from the vehicle's outer edge for any lamp. It says "as far apart as practicable", and for
clearance lamps "to indicate the overall width". The numeric spacings it does set are identification lamp centres 6 to
12 inches apart, school bus signal lamps at least 40 inches apart, and motorcycle turn signal lamps at least 16 inches
(front) and 9 inches (rear) apart, with 4 inches edge to edge to the headlamp, or to a centre stop and taillamp when the
turn signals are red.

The S4 definition of identification lamps prints "not less than [6 in] 15.2 mm nor more than [12 in] 30.4 mm apart".
The millimetre figures are a factor of ten too small for the inches beside them. Table I-a says 6 and 12 inches, and
the data uses those.

**Visibility.** The manufacturer certifies each lamp function to one of two options and keeps to it (S6.4.3, p. 397).
Vehicles made on or before 1 September 2011 (1 September 2014 for MPVs, trucks, trailers and buses 2032 mm or more
wide) may use the legacy Table V-d instead (S6.4.4).

| Lamp | Lens area option (Table V-b): at least 1250 mm² unobstructed | Intensity option (Table V-c) |
|---|---|---|
| Turn signal | 15° up to 15° down, 45° IB to 45° OB | 0.3 cd, 15° up to 15° down, 45° IB to 80° OB |
| Stop | 15° up to 15° down, 45° IB to 45° OB | 0.3 cd, 15° up to 15° down, 45° IB to 45° OB |
| Taillamp | 15° up to 15° down, 45° IB to 45° OB | 0.05 cd, 15° up to 15° down, 45° IB to 80° OB |
| Parking | 15° up to 15° down, 45° IB to 45° OB | 0.05 cd, 15° up to 15° down, 45° IB to 80° OB |

These are the "All other" columns; motorcycles have their own corner points, recorded in the device text. Below 750 mm
mounting height the downward corners may be reduced to 5° down. The high-mounted stop lamp must be visible from 45° left
to 45° right (Table V-a), the backup lamp's optical centre from eye points 610 mm to 1828 mm high anywhere behind a
plane 914 mm to the rear and out to 914 mm beyond each side, and school bus signal lamps unobstructed from 5° up to 10°
down and 30° left to 30° right. The legacy alternative of Table V-d, for older vehicles, is in the notes.

**Lens area.** Table IV-a sets the effective projected luminous lens area of turn signal and stop lamps by vehicle
width and number of compartments; Table IV-b sets the high-mounted stop lamp at 2903 mm² (single) or 1452 mm² each (a
pair); Table IV-c sets school bus signal lamps at 12,258 mm² each.

## Open questions

- **The 60% floor and the group sums.** The text does not say in one sentence how the printed point minimums, the
  60% floor and the group minimums combine for Tables VI, VII, IX and XIII-a. The reading above (groups must pass,
  points at least 60%) is the one the columns suggest; NHTSA's interpretation letters were not consulted.
- **Between points.** Read literally, the between-points rule uses the full printed minimum, which is stricter than the
  60% floor at the points.
- **Taillamp maximum between points.** Table VIII prints its maximum only at the U and H points. Whether it binds
  between them, anywhere at or above H, is not stated.
- **Clearance lamp maximum.** Table XI gives 15 cd for red lamps and says that when combined with a stop or turn
  signal lamp it applies on or above the horizontal; it does not say where it applies otherwise. The data treats it as
  a maximum anywhere in the beam.
- **"Solid angle defined by the test point range".** Read as the rectangle the test points span.
- **DRL aim.** S14.2.4 refers to the headlamp procedure but does not say how a separate DRL is aimed; the data assumes
  its normal operating position.

## Conditions

The signal file exports `CONDITIONS`, the condition atoms that requirements name in `when`, in the same form as the
R148 data. A requirement applies when every atom in its `when` is declared, and a requirement with `replaces` stands in
for the named requirement of the same function when it applies (`applicable()` in `src/core/regulation/engine.js`).

| Atom | Set | Meaning |
|---|---|---|
| `narrow` | width | Passenger car, or MPV, truck, trailer or bus under 2032 mm wide. The default: no entry needs it declared |
| `wide` | width | MPV, truck, trailer or bus 2032 mm or more wide |
| `low-mounting` | | Axis of reference less than 750 mm above the road |
| `combined-parking` | | Parking lamp combined with the front turn signal lamp |
| `combined-clearance` | | Clearance lamp combined with the turn signal lamp (its ratios also need `wide`) |
| `combined-taillamp` | | Taillamp combined with the rear turn signal or stop lamp |
| `double-faced-left`, `double-faced-right` | side | Double-faced front turn signal lamp on a truck tractor serving as the rear turn signal (S6.1.1.3) |

How the table rules map onto them:

- **Slashed values.** The narrow value is the unconditional entry (for example `10U-5L`, 26 cd) and the wide value an
  entry `10U-5L (wide)` with `when: ['wide']` that replaces it. Sums and the stop lamp's H-5L ratio work the same way.
- **750 mm relief.** Each point below 5° down (the 10D points of the 19-point grid and of Tables X and XI) has a
  variant `… at 5D (low mounting)` at v = −5 with `when: ['low-mounting']`, the same minimum and the relief footnote
  added to its cite. Group sums that include those points get the same variant, with the 10D points moved to 5D. When
  both `wide` and `low-mounting` are declared on Table VII amber with one section, the narrow and wide variants at 5D
  both remain (26 and 27 cd, and groups 80 and 84 cd), because one requirement can replace only one other; the wide
  value is the higher in each case, so it governs and the result is correct.
- **Ratios.** Each ratio has `when: ['combined-parking']`, `['combined-taillamp']` or `['combined-clearance', 'wide']`.
  Ratios keep their printed points under `low-mounting`.
- **Double-faced lamps.** Every point, ratio and variant at a point marked NO for a side has a `note` variant with
  `when: [..., 'double-faced-left']` (or right) that replaces it, so the point drops out. A group sum drops out the same
  way only when every point of the group is marked NO for that side (groups 1 and 2 for a left-side lamp, 4 and 5 for a
  right-side lamp); group 3 keeps its printed minimum, because the text does not say how a group with some points
  excused should be judged.

Every point that carries `fmvssGroup` N has an unconditional sum `Group N` in the same function. Its variants
(`Group N (wide)`, `Group N at 5D (low mounting)`) carry the same `fmvssGroup`, so an evaluator applying `pointRule`
should find the group among the applicable sums by `fmvssGroup`, and take the highest minimum if two remain.

## Shapes the data format cannot express

- The `floor-60` and `group-alternative` rules: a point's pass depends on its group sum. The data keeps the parts
  (`point`, `sum`, `pointRule`) and an evaluator must combine them.
- Ratios to a combined lamp (`relative` with `of: 'reference'`): they need the combined lamp's distribution and allow
  the lowest value within 0.5° or 1.0° when its maximum lies near a point.
- Maximums that ignore spots smaller than a 0.5° or 0.25° radius cone (`spotRadiusDeg`).
- The between-points rule (`between`): expressible only as many `line` entries between adjacent points, each with the
  lower of the two printed minimums.
- Backup lamp footnotes 2 and 3: a symmetric pair of lamps is judged on one lamp's centre values and the average of its
  left and right values; differing lamps are added and judged against twice the values.
- Table XV footnote 3 and S6.1.1.2: a required pair of high-mounted stop lamps is judged together.
- Visibility by lens area: an unobstructed projected area in every direction of a pattern, which needs the lamp's
  geometry and the vehicle body, not its intensity.
