# FMVSS No. 108 and CMVSS 108: headlamp photometry, with citations

Prepared 9 October 2026. Scope: the lower and upper beams of every US headlighting system (sealed beam, integral
beam, replaceable bulb, combination), how each is aimed before photometry, and what Canada changes. Motorcycle
headlamps (Table XX) and the adaptive driving beam table (Table XXI) are out of scope and only noted.

The data is in `src/core/regulation/data/fmvss108-headlamps.js` (US) and `src/core/regulation/data/cmvss108.js`
(Canada).

## Read this first

The US standard is unlike R149 in three ways that matter to a checker.

1. **A headlamp is checked against one column, chosen by its system.** Tables II-a to II-d name the headlighting
   systems; each points to one upper-beam column of Table XVIII (UB1–UB6) and one lower-beam column of Table XIX
   (LB1M–LB5M for mechanical aim, LB1V–LB4V for visual/optical aim). Several systems offer a choice, for example a
   2-lamp replaceable bulb system with dual-filament bulbs may meet UB2 or UB3, LB2M or LB3M, LB2V or LB3V.
2. **Most lamps are not aimed by their beam.** A mechanically aimable headlamp (external aimer or VHAD) is measured
   with its mechanical axis on the photometer axis; H-V is the lamp's own axis, set by its aiming pads, fiducial marks
   or VHAD. Only a visually/optically aimable lower beam (marked VOL or VOR) is aimed by its cut-off, and a separate
   visually aimed upper beam by its maximum.
3. **There are no sums, no Imax limit, no flux rule and no interpolation between points.** The tables have points,
   short horizontal lines ("1R to 3R"), open-ended lines ("1R to R", "1.5L to L") and one boundary region (10°U to
   90°U, 90°L to 90°R).

Canada adopts the US text through TSD 108 with no change to any photometric value, and separately accepts several
UN headlamp regulations.

## Sources and version

| Key | Document | Status | URL |
|---|---|---|---|
| **CFR25** | 49 CFR 571.108, CFR annual edition revised as of 1 October 2025, Title 49 vol. 6 (pp. 390–514) | Official; printed page numbers used in every cite | https://www.govinfo.gov/content/pkg/CFR-2025-title49-vol6/pdf/CFR-2025-title49-vol6-sec571-108.pdf |
| **eCFR** | 49 CFR 571.108, eCFR XML, current to 7 October 2026 | Used for the text of S-paragraphs; no page numbers | https://www.ecfr.gov/api/versioner/v1/full/2026-10-07/title-49.xml?part=571&section=571.108 |
| eCFR-2022 | Same section as of 22 February 2022 | For comparison | same API, date 2022-02-22 |
| **MVSR** | Motor Vehicle Safety Regulations, C.R.C., c. 1038, Schedule IV, s. 108 | Current to 21 September 2026, last amended 1 January 2025 | https://laws-lois.justice.gc.ca/eng/regulations/C.R.C.,_c._1038/FullText.html |
| **TSD8** | Technical Standards Document No. 108, Revision 8 | Published and effective 1 April 2025; mandatory 1 October 2025 | https://tc.canada.ca/sites/default/files/2025-05/108_tsd_rev_r8_en-web.pdf |
| WP29-89/90/91/92 | ECE/TRANS/WP.29/2019/89, /90, /91, /92: Supplement 1 to R98 02, R112 02, R113 03, R123 02 series | Adopted November 2019 | https://documents.un.org/api/symbol/access?s=ECE/TRANS/WP.29/2019/90&l=en&t=pdf (and /89, /91, /92) |
| WP29-1149 | ECE/TRANS/WP.29/1149, report of the 179th session | Voting record, p. 23 | https://documents.un.org/api/symbol/access?s=ECE/TRANS/WP.29/1149&l=en&t=pdf |

**Which FMVSS text.** The eCFR lists the last substantive change to § 571.108 as 5 December 2023. A word-by-word
comparison of the eCFR text of 22 February 2022 with the current text found only layout changes (spacing in
re-converted tables), and every numbered paragraph is identical. The CFR25 amendment history for the section ends
with 87 FR 10021 of 22 February 2022 (p. 514), which agrees: the 2023 eCFR entry changed no wording. The headlamp tables in the current eCFR XML are
still the graphics `er04de07.012` (Table XVIII), `er08au11.167`, `.168`, `.169` (Tables XIX-a, -b, -c) and
`er04de07.016` (Table XX): they date from the rules of 4 December 2007 and 8 August 2011 and have not been replaced.
The eCFR serves its graphics only to browsers, so the tables were read from the CFR25 PDF, which embeds them as page
images at about 4,000 × 6,000 pixels.

**Label legend.** "V: CFR25 p. 426" = read in that document at that printed page. "V-img" = read from a table image.
"V-img×2" = read from the CFR25 image and again, independently, from the TSD8 copy of the same table. "Derived" =
arithmetic on the text. "Reading" = this transcription's interpretation where the text is silent. "Unverified" = not
confirmed from a primary source.

## 1. Measurement conventions (S14.2.5)

| Item | Requirement | Label |
|---|---|---|
| Mounting | Sample headlamp in its normal operating position | V: CFR25 S14.2.5.1, p. 426 |
| High angles | Test points from 10°U to 90°U measured from the normally exposed surface of the lens face | V: CFR25 S14.2.5.2, p. 426 |
| Distance | Light source to photometer sensor at least 18.3 m | V: CFR25 S14.2.5.3, p. 426 |
| Seasoning, voltage | Seasoned at design voltage for 1% of average design life or 10 h, whichever is less; tested at 12.8 V ±20 mV DC at the lamp terminals | V: CFR25 S14.2.5.4, p. 426 |
| Reaim tolerance | "A 1/4° reaim is permitted in any direction at any test point to allow for variations in readings between laboratories for all headlamps except a Type F upper beam unit not equipped with a VHAD" | V: CFR25 S14.2.5.5, p. 426 |
| Goniometer | Horizontal rotation over elevation; vertical axis = design vertical of the lamp | V: CFR25 S14.2.5.6, p. 427 |
| Sensor | Effective area within a circle of diameter 0.009 × test distance; must intercept all direct light from the lamp's largest illuminated dimension | V: CFR25 S14.2.5.7.2.1–3, p. 427 |
| Sensor angle | 2·atan(0.0045) ≈ 0.516° across | Derived |
| Directions | U, D, L, R "designate the angular position from the H and V planes to the photometer as viewed from the headlamp"; L/R angles are plan-view angles; U/D angles are true angles from the horizontal plane; H-V is parallel to the vehicle's longitudinal axis | V: CFR25 S14.2.5.8.1.1–4, p. 428 |
| Beam contributors | Each contributor meets 2 × (table value) / (number of contributors for that beam on the vehicle) | V: CFR25 S14.2.5.9, p. 428 |
| Moveable reflectors | Requirements apply at any lens/reflector position over the vehicle's full vertical pitch range and ±2.5° horizontally (unless visually aimed with fixed horizontal aim) | V: CFR25 S10.18.6, p. 418; S14.2.5.10, p. 428 |
| Interpolation | S14.2.1's rule on values between test points is for "all lamps except license plate lamps, headlamps, and DRLs"; none applies to headlamps | V: CFR25 S14.2.1, p. 423 |

The angle definitions give the same sphere as R149 Annex 4: azimuth about the vertical axis, then elevation. The
data uses h positive to the right and v positive up, so "3L" is h = −3.

## 2. Aiming before photometry

| Lamp | Aim | Label |
|---|---|---|
| Mechanically aimable, external aimer | Aiming plane at the design angle(s) to the photometer axis; mechanical axis on the photometer axis | V: CFR25 S14.2.5.5.1, p. 426 |
| Mechanically aimable, VHAD | Aimed by the VHAD per the manufacturer's instructions for the vehicle | V: CFR25 S14.2.5.5.2, p. 426 |
| Visual lower beam, vertical | VOL: cut-off maximum gradient at 0.4°D. VOR: at H-H | V: CFR25 S14.2.5.5.3.1–2, p. 426; S10.18.9.1.1, p. 420 |
| Visual lower beam, horizontal | No adjustment unless the lamp has a horizontal VHAD, then set to zero | V: CFR25 S14.2.5.5.4, p. 426; S10.18.9.2, p. 421 |
| Visual upper beam combined with a lower beam | Keep the lower-beam aim, vertically and horizontally | V: CFR25 S14.2.5.5.5.1, S14.2.5.5.6.1, p. 426 |
| Visual upper beam, separate | Maximum intensity on H-H. Horizontally: no adjustment if fixed or VHAD (set to zero); otherwise maximum intensity on V-V | V: CFR25 S14.2.5.5.5.2, S14.2.5.5.6.2–3, pp. 426–427 |
| Simultaneous aim (Type F, contributors) | Lower beam unit (or centre of the lower contributors) centred on the photometer axis with the aiming plane perpendicular; then the assembly moves parallel to that plane until the upper beam unit (or centre of the upper contributors) is centred | V: CFR25 S14.2.5.5.7.1–2, p. 427 |

**The cut-off check of a visual lower beam** comes before the photometry aim and is measured with the cut-off on H-H
for both VOL and VOR:

| Item | Requirement | Label |
|---|---|---|
| Set-up | Lamp on a fixture that simulates its design location, fixture axes on the goniometer axes; 10 m from a 10 mm photosensor (≈0.057°, derived) | V: CFR25 S10.18.9.1.5.1, p. 421 |
| Aim for the check | Cut-off at the H-H axis; no horizontal adjustment unless VHAD, then zero | V: CFR25 S10.18.9.1.5.2, p. 421 |
| Scan | Vertical scan from 1.5°U to 1.5°D on the line 2.5°L (left-side cut-off) or 2.0°R (right-side) | V: CFR25 S10.18.9.1.5.3, p. 421 |
| Gradient | G = log E(a) − log E(a + 0.1); the maximum G locates the cut-off | V: CFR25 S10.18.9.1.5.4, p. 421 |
| Limit | G not less than 0.13 at 2.5°L or 2.0°R | V: CFR25 S10.18.9.1.2, p. 420 |
| Width | Not less than 2°, with at least 2° of it centred at 2.5°L or 2.0°R | V: CFR25 S10.18.9.1.3, p. 420 |
| Inclination | Highest gradient at the ends of the minimum width within ±0.2° vertically of the maximum gradient on the measuring line; scans at 1.0°L and R of that point | V: CFR25 S10.18.9.1.4, S10.18.9.1.5.4, p. 421 |
| Direction of a | The text does not say whether "a + 0.1" is above or below "a" | Unverified |
| Scan step | Not stated | Unverified |

## 3. Upper beam, Table XVIII (p. 479)

Values in cd. "–" = no requirement. Rows with "xL & xR" apply at both points.

| Test point | UB1 max | UB1 min | UB2 max | UB2 min | UB3 max | UB3 min | UB4 max | UB4 min | UB5 max | UB5 min | UB6 max | UB6 min |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2U V | – | 1,500 | – | 1,500 | – | 1,000 | – | 750 | – | 750 | – | 1,500 |
| 1U 3L & 3R | – | 5,000 | – | 5,000 | – | 2,000 | – | 3,000 | – | 2,000 | – | 5,000 |
| H V | 70,000 | 40,000 | 75,000 | 40,000 | 75,000 | 20,000 | 60,000 | 18,000 | 15,000 | 7,000 | 70,000 | 40,000 |
| H 3L & 3R | – | 15,000 | – | 15,000 | – | 10,000 | – | 12,000 | – | 3,000 | – | 15,000 |
| H 6L & 6R | – | 5,000 | – | 5,000 | – | 3,250 | – | 3,000 | – | 2,000 | – | 5,000 |
| H 9L & 9R | – | 3,000 | – | 3,000 | – | 1,500 | – | 2,000 | – | 1,000 | – | 3,000 |
| H 12L & 12R | – | 1,500 | – | 1,500 | – | 750 | – | 750 | – | 750 | – | 1,500 |
| 1.5D V | – | 5,000 | – | 5,000 | – | 5,000 | – | 3,000 | – | 2,000 | – | 5,000 |
| 1.5D 9L & 9R | – | 2,000 | – | 2,000 | – | 1,500 | – | 1,250 | – | 750 | – | 1,000 |
| 2.5D V | – | 2,500 | – | 2,500 | – | 2,500 | – | 1,500 | – | 1,000 | – | – |
| 2.5D 12L & 12R | – | 1,000 | – | 1,000 | – | 750 | – | 600 | – | 400 | – | – |
| 4D V | 5,000 | – | 12,000 | – | 5,000 | – | 5,000 | – | 2,500 | – | 5,000 | – |

Label: V-img×2 (CFR25 p. 479; TSD8 p. 165).

## 4. Lower beam, Tables XIX-a, XIX-b, XIX-c (pp. 480–482)

Values in cd, written max / min; "–" = no requirement. Columns: XIX-a = LB1M, LB1V, LB2M, LB2V; XIX-b = LB3M, LB3V,
LB4M, LB5M; XIX-c = LB4V.

| Test point | LB1M | LB1V | LB2M | LB2V | LB3M | LB3V | LB4M | LB5M | LB4V |
|---|---|---|---|---|---|---|---|---|---|
| 10U–90U × 90L–90R ⁽¹⁾ | 125 / – | 125 / – | 125 / – | 125 / – | 125 / – | 125 / – | 125 / – | 125 / – | 125 / – |
| 4U 8L & 8R | – / 64 | – / 64 | – / 64 | – / 64 | – / 64 | – / 64 | – / 64 | – / 64 | – / 64 |
| 2U 4L | – / 135 | – / 135 | – / 135 | – / 135 | – / 135 | – / 135 | – / 135 | – / 135 | – / 135 |
| 1.5U 1R to 3R | – / 200 | – / 200 | – / 200 | – / 200 | – / 200 | – / 200 | – / 200 | – / 200 | – / 200 |
| 1.5U 1R to R | 1,400 / – | 1,400 / – | 1,400 / – | 1,400 / – | 1,400 / – | 1,400 / – | 1,400 / – | 1,400 / – | 1,400 / – |
| 1U 1.5L to L | 700 / – | 700 / – | 700 / – | 700 / – | 700 / – | 700 / – | 700 / – | 700 / – | 700 / – |
| 0.5U 1.5L to L | 1,000 / – | 1,000 / – | 1,000 / – | 1,000 / – | 1,000 / – | 1,000 / – | 1,000 / – | 1,000 / – | 1,000 / – |
| 0.5U 1R to 3R | 2,700 / 500 | 2,700 / 500 | 2,700 / 500 | 2,700 / 500 | 2,700 / 500 | 2,700 / 500 | 2,700 / 500 | 2,700 / 500 | 2,700 / 500 |
| H V | 5,000 / – | 5,000 / – | – | – | – | – | – | 5,000 / – | 5,000 / – |
| H 4L | – / 135 | – / 135 | – / 135 | – / 135 | – / 135 | – / 135 | – / 135 | – / 135 | – / 135 |
| H 8L | – / 64 | – / 64 | – / 64 | – / 64 | – / 64 | – / 64 | – / 64 | – / 64 | – / 64 |
| 0.5D 1.5L to L | 3,000 / – | – | 3,000 / – | – | 2,500 / – | – | 2,500 / – | 3,000 / – | – |
| 0.5D 1.5R | 20,000 / 10,000 | – | 20,000 / 10,000 | – | 20,000 / 8,000 | – | 20,000 / 8,000 | 20,000 / 10,000 | – |
| 0.6D 1.3R | – | – / 10,000 | – | – / 10,000 | – | – / 10,000 | – | – | – / 10,000 |
| 0.86D V | – | – / 4,500 | – | – / 4,500 | – | – / 4,500 | – | – | – / 4,500 |
| 0.86D 3.5L | – | 12,000 / 1,800 | – | 12,000 / 1,800 | – | 12,000 / 1,800 | – | – | 12,000 / 1,800 |
| 1D 6L | – / 1,000 | – | – / 1,000 | – | – / 750 | – | – / 750 | – / 1,000 | – |
| 1.5D 2R | – / 15,000 | – / 15,000 | – / 15,000 | – / 15,000 | – / 15,000 | – / 15,000 | – / 15,000 | – / 15,000 | – / 15,000 |
| 1.5D 9L & 9R | – / 1,000 | – | – / 1,000 | – | – / 750 | – | – / 750 | – / 1,000 | – |
| 2D 9L & 9R | – | – / 1,250 | – | – / 1,250 | – | – / 1,250 | – | – | – / 1,250 |
| 2D 15L & 15R | – / 850 | – / 1,000 | – / 850 | – / 1,000 | – / 700 | – / 1,000 | – / 700 | – / 850 | – / 1,000 |
| 2.5D V | – | – | – | – | – | – | – | – / 2,500 | – / 2,500 |
| 2.5D 12L & 12R | – | – | – | – | – | – | – | – / 1,000 | – / 1,000 |
| 4D V | 7,000 / – | 10,000 / – | – | – | – | – | – | 7,000 / – | 10,000 / – |
| 4D 4R | 12,500 / – | 12,500 / – | 12,500 / – | 12,500 / – | 12,500 / – | 12,500 / – | 12,500 / – | 12,500 / – | 12,500 / – |
| 4D 20L & 20R | – | – / 300 | – | – / 300 | – | – / 300 | – | – | – / 300 |

⁽¹⁾ "These test points are boundaries, intensity values within this boundary must meet the listed photometry
requirement." Label for the whole table: V-img×2 (CFR25 pp. 480–482; TSD8 pp. 166–168). A few cells print "--"
instead of "-" (LB2V 4U max, LB5M 1.5U 1R-to-R min, LB3M 0.86D V min, LB4V 1.5D 9L & 9R max); they are read as
empty. LB3M 0.6D 1.3R min is blank in the image and read as empty. LB4M 0.5D 1.5L-to-L prints "2500" without a comma.

## 5. Systems, Tables II-a to II-d (pp. 459–461)

| System | Unit | Upper | Lower, mechanical | Lower, visual |
|---|---|---|---|---|
| Sealed beam Type A (100 × 165 mm) | 1A1 / 2A1 | UB4 / UB5 | – / LB4M | – / LB2V |
| Sealed beam Type B (142 × 200 mm) | 2B1 | UB3 | LB3M | LB3V |
| Sealed beam Type C (146 mm dia.) | 1C1 / 2C1 | UB4 / UB5 | – / LB4M | – / LB2V |
| Sealed beam Type D (178 mm dia.) | 2D1 | UB3 | LB3M | LB3V |
| Sealed beam Type E (100 × 165 mm) | 2E1 | UB3 | LB3M | LB3V |
| Sealed beam Type F (92 × 150 mm) | UF / LF | UB1 / – | – / LB1M | – / LB1V |
| Sealed beam Type G | 1G1 / 2G1 | UB4 / UB5 | – / LB4M | – / LB2V |
| Sealed beam Type H | 2H1 | UB3 | LB3M | LB3V |
| Combination, 2-lamp | Two different headlamps from Type F, integral beam, replaceable bulb | UB2 | LB2M | LB2V |
| Combination, 4-lamp | Four different headlamps from the same | UB1 | LB1M | LB1V |
| Integral beam, 2-lamp | Upper & lower | UB2 or UB3 | LB2M or LB3M | LB2V or LB3V |
| Integral beam, 4-lamp | Upper / upper & lower | UB4 / UB5 | – / LB4M | – / LB2V |
| Integral beam, 4-lamp | U / L | UB1 / – | – / LB1M | – / LB1V |
| Integral beam, 4-lamp | Upper / lower | UB6 / – | – / LB5M | – / LB4V |
| Integral beam, contributor | Upper & lower | UB1 | LB1M | LB1V |
| Replaceable bulb, 2-lamp | Dual filament other than HB2 | UB2 or UB3 | LB2M or LB3M | LB2V or LB3V |
| Replaceable bulb, 2-lamp | HB2 or single filament | UB2 or UB3 | LB2M | LB2V |
| Replaceable bulb, 4-lamp | Dual filament other than HB2 | UB1 or UB3 | LB1M or LB3M | LB1V or LB3V |
| Replaceable bulb, 4-lamp | HB2 or single filament (U & L) | UB1 | LB1M | LB1V |

Label: V-img×2 for II-a (CFR25 p. 459; TSD8 p. 139); V for II-b to II-d (eCFR text; CFR25 pp. 460–461; TSD8 pp.
140–142). The upper-beam column is headed "mechanical and visual aim": the same UB column applies to both.

Activation footnotes that bear on photometry, all recorded in the data as notes:

- UB1 with LB1M/LB1V: lower beams (lamps "L" or "LF") may stay on with the upper beams (S6.1.5.2.1, p. 396).
- UB2 with LB2M/LB2V: a lower beam light source may stay on if it contributes to upper beam compliance (S6.1.5.2.3,
  p. 396).
- UB6 with LB5M/LB4V: the lower beams must stay on with the upper beams (S6.1.5.2.2, p. 396; Table II-c note 3). The
  standard does not say whether the Table XVIII values are then measured with the lower beam lit. Not resolved.
- Beam contributors: the S14.2.5.9 formula applies (Table II-c note 4) or may apply (Table II-b note 3).

## 6. How the tables became data

- One function per column: `upper-UB1` … `upper-UB6`, `lower-LB1M` … `lower-LB5M`. `traffic: 'right'`.
- "xL & xR" becomes two `point`s (ids such as `1.5D-9L`, `1.5D-9R`).
- "aR to bR" becomes a `line` along the row's elevation.
- **Open-ended rows** ("1.5U 1R to R", "1U 1.5L to L", "0.5U 1.5L to L", "0.5D 1.5L to L") give no far end. They
  are transcribed as lines to 90° on the named side, the widest field the same table names, with `openEnd: 'right'`
  or `'left'` and a note on each entry. Label: Reading. The NHTSA laboratory test procedure (TP-108) might say how
  the contract laboratories scan these rows, but nhtsa.gov refused automated requests (HTTP 403), so this is
  unconfirmed.
- The 10U–90U, 90L–90R row becomes a `zone` (rectangle) with footnote (1) and S14.2.5.2 in its note.
- `tolerance: { deg: 0.25 }` on every function, from S14.2.5.5. UB1's notes record that the reaim does not apply to a
  Type F upper beam unit without a VHAD.
- The `group` labels (glare, road, signs, foreground, axis) are this transcription's; the standard does not group
  its test points.
- `TABLE_XVIII` and `TABLE_XIX` export the printed cells in printed row order, so the data can be checked against
  the images directly. `fromTable` refuses a column whose length does not match the rows.
- `AIMING` holds the numbers of sections 1 and 2; `SYSTEMS` holds Tables II-a to II-d; `OTHER_RULES` holds beam
  switching (S9.4), semiautomatic beam switching (S9.4.1), aimability (S10.18) and the S14.2.1 exclusion, as text.

**Second pass.** After writing, a script imported the module and printed every requirement of every function in
printed row order; each line was compared with the CFR25 images and the TSD8 images. No difference was found.

## 7. Non-photometric rules (notes only)

- **Beam switching (S9.4, p. 410).** A switch operable by a simple movement of the driver's hand or foot, no dead
  point; lower and upper beams not on together except under S6.1.5.2, momentarily for signalling, or while
  switching.
- **Semiautomatic beam switching (S9.4.1, pp. 410–412).** Allowed as an alternative to S9.4: operating instructions,
  manual override, fail-safe manual control, an indicator when automatic. Option 1 (not ADB): lens cleanable in
  place, lens centre at least 24 in above the road, tests of S14.9.3.11. Option 2 (ADB): malfunction detection and
  warning; lower beams only below 32 km/h; Table XXI photometry; Table XIX in reduced-intensity areas and Table XVIII
  in unreduced areas, with a transition zone up to 1.0° exempt except that the Table XVIII H-V maximum may not be
  exceeded there (S9.4.1.6.4.3–5, p. 411).
- **Aimability (S10.18, pp. 417–422).** Each headlamp aimable on the vehicle by external aimer (SAE J602), VHAD or
  visual/optical means; adjusting one axis may not move the other more than ±0.76° (S10.18.3, p. 418); a visually
  aimed lower beam may have no horizontal adjuster unless it meets the VHAD rules (S10.18.4, p. 418). VHAD
  graduations no larger than 0.19° vertically and 0.38° horizontally (S10.18.8.1.1.1, S10.18.8.1.2.1).
- **Markings.** VOL / VOR / VO on the lens of visually aimed lamps (S10.18.9.6.1, p. 422).

## 8. Canada: CMVSS 108

**What is incorporated.** MVSR Schedule IV s. 108(1): every passenger car, multi-purpose passenger vehicle, truck,
trailer and bus "shall conform to Technical Standards Document No. 108, Lamps, Reflective Devices, and Associated
Equipment (TSD 108), as amended from time to time." TSD 108 Revision 8 states on its title page that it is based on
FMVSS 108 "as it read on February 22, 2022"; its Change Log (p. 197) gives the reason as alignment with the US ADB
rule of 22 February 2022 and an update to school bus signal lamps. Revision 8 was effective 1 April 2025 with
mandatory compliance from 1 October 2025; until then the previous revision could be followed. Because the FMVSS text
has not changed in substance since 22 February 2022 (section "Sources and version"), TSD 108 Revision 8 and the
current FMVSS 108 have the same headlamp requirements. No later revision of TSD 108 was found.

**Photometry is identical.** TSD 108 reproduces Tables II-a to II-d (pp. 139–142), XVIII (p. 165) and XIX-a/b/c
(pp. 166–168) as images. Each was read and compared cell by cell with the CFR images: all agree. Canada has no
headlamp photometric value of its own, so `cmvss108.js` holds no values beyond those in `fmvss108-headlamps.js`.

**How the Canadian edits were found.** TSD 108 marks Canadian additions by underlining and deletions by striking
through. The headlamp pages (S6.1.5.2, S9.4, S10.13–S10.18.9, S14.2.5, Tables II and XVIII–XIX) were scanned for
drawn lines crossing or underlining text, and the hits were checked on rendered pages. Yellow highlights mark changes
from Revision 7 to 8 (the ADB text), not Canadian edits. Table rules in Tables II and XVII produced false hits and
were discarded after viewing the page. The edits that touch headlamps:

| TSD provision | Edit | Effect | Label |
|---|---|---|---|
| S10.18.9.1 (p. 76) | Struck: "but once chosen for a particular headlamp system's design, the side chosen for the cutoff must not be changed for any headlamps intended to be used as replacements for those system's headlamps" | The cut-off side of replacements need not match | V-img: TSD8 p. 76 |
| S10.18.9.1.5.4 (p. 77) | "illumination" struck, "illuminance" added | Wording | V-img: TSD8 p. 77 |
| S10.18.9.4.2 (p. 77) | "12.8 V ±0.20 mV" ("V" added) | Wording | V-img: TSD8 p. 77 |
| S10.18.7.1.1 to S10.18.8.1.2.4 (pp. 74–75) | Metric equivalents added ("[25 mm at 7.6 m]", "323 lux") | Wording | V: TSD8 pp. 74–75 |
| S10.15.3 (p. 67), S13 (p. 80), S3 | Not reproduced | Replacement lens units, replaceable lenses | V: TSD8 |
| S10.15.4, S10.17.2, S11.1–S11.2 (pp. 67, 70, 78) | Struck | Lens and light-source markings | V: TSD8 |
| S10.18.1 footnote (p. 71) | S10.18.1 also applies to motorcycles and motor tricycles per MVSR 108(10)(b), (11)(b) | Motorcycle aim | V: TSD8 p. 71 |
| Elsewhere | "standard" → "TSD"; "(incorporated by reference, see § 571.5)" struck | Wording | V: TSD8 |

**MVSR s. 108 rules that differ from FMVSS 108** (all in `DIFFERENCES`):

| Rule | Text in short | Cite |
|---|---|---|
| UN headlamps: traffic side | Beam pattern for right-hand traffic only; a left-hand mechanism must be inoperative | 108(5)(c), 108(7)(a)(ii) |
| UN headlamps: physical tests | TSD 108 S10.13.4, S10.14.7, S10.15.7 apply as applicable | 108(5)(d) |
| UN headlamps: approval | Type-approval process, approval marking, conformity of production and its penalties, modification and extension do not apply | 108(8), 108(14) |
| R123 installation | Per R48 §6.22; automatic levelling mandatory in all cases despite R48 §6.22.6.2 | 108(7)(a)(i), 108(9) |
| R123 above 850 mm | Mounted above 850 mm (to the centre of the highest lamp): maximum intensity not above the TSD 108 upper-beam intensity requirements | 108(7)(b) |
| ADB to SAE J3069 | If formed by an upper or lower beam, that beam also meets TSD 108, with horizontal aim adjustment allowed despite S10.18 | 108(3), 108(4) |
| Upper beam activation | Only with the master switch at "headlamps on", or "AUTO" when automatic lower-beam conditions exist, except brief flashing | 108(17) |
| Automatic lower beams | From 1 September 2021: if certain displays are lit with the DRLs on, lower beams switch on within 2 s below 1,000 lux (vehicle moving), or tail lamps are lit | 108(19), 108(20) |
| Motorcycles | S10.18.1 read as "the vertical aim" only | 108(10)(b), 108(11)(b) |
| Terms | "Passing/dipped beam" = lower beam; "driving/main beam" = upper beam in the UN Regulations named | 108(33) |

The 850 mm rule says "the intensity requirements under TSD 108 for upper beam headlamps" without naming a column or a
test point. The H-V maxima of UB1–UB6 range from 15,000 cd to 75,000 cd, so a checker must choose; the data records
the rule and the ambiguity and does not choose.

**Accepted UN alternatives.** MVSR s. 108(5) lets passenger cars, MPVs, trucks and buses use headlamps that conform
to R8, R20, R31, R98 or R112; three-wheeled vehicles R8, R20 or R112, or R31 or R98 as if a passenger car. s. 108(6)
allows R123 AFS. s. 108(13) allows motorcycles any s. 108(5) headlamp or R57, R72 or R113, installed per R53. Each
UN Regulation applies "as amended from time to time"; no series is named.

**R149 is reached only indirectly.** The MVSR never names R149. In November 2019 WP.29 adopted Supplement 1 to the
02 series of R98 (new §5.13), Supplement 1 to the 02 series of R112 (new §5.12), Supplement 1 to the 03 series of
R113 (new §5.11) and Supplement 1 to the 02 series of R123 (new §5.16). Each reads "Instead of requirements of this
Regulation, headlamps may conform with requirements of the latest version of UN Regulation No. [149] as it relates
to …" (WP.29/2019/89–92, p. 2 of each). AC.1 adopted them at the 179th session, votes 37/0/0 (R98), 39/0/0 (R112,
R113, R123) (WP.29/1149, p. 23); WP.29's modifications in para. 69 do not touch them. The GRE proposal behind them
(GRE/2018/32, submitted by SAE) said its purpose was to keep UN headlamps acceptable in Canada after R149 replaced
the older regulations (GlobalAutoRegs summary; the GRE document itself was not fetched). Because the MVSR applies
R98, R112 and R123 "as amended from time to time", a headlamp meeting the latest R149 (now the 01 series) appears to
qualify. That is a reading of a cross-reference, recorded with a `via` field in `ALTERNATIVES`; Transport Canada has
not confirmed it. Label: Reading.

## 9. Open items

- **Open-ended lines.** The far end of "1R to R" and "1.5L to L" is a reading (90°), not text. TP-108 could not be
  fetched.
- **Gradient direction and scan step** for the VOL/VOR cut-off are not stated.
- **UB6 with the lower beam on.** Whether the obligatory lower beam counts towards Table XVIII is not stated.
- **R149 brackets.** The adopted documents print "[149]" in square brackets; the published amendment slips (for
  example E/ECE/TRANS/505/Rev.2/Add.111/Rev.N/Amend.1 for R112) were not fetched to confirm the final wording.
- **R8, R20, R31** were not checked for a similar R149 clause.
- **850 mm R123 rule.** Which Table XVIII maximum applies is not stated.
- **Motorcycle Table XX and ADB Table XXI** are out of scope and not transcribed.
