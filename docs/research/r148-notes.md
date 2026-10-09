# UN Regulation No. 148: light-signalling lamps, photometry

Prepared 9 October 2026 for `src/core/regulation/data/r148.js`. R148 sets the type-approval photometry for the signal
lamps on cars, trucks, trailers and L-category vehicles. It replaced Regulations 4, 6, 7, 23, 38, 50, 77, 87 and 91 in
2019. The data file transcribes the **01 series of amendments** as amended up to Supplement 7. Every value in it was read
from an official UN document fetched on 9 October 2026; none comes from memory.

## Which text applies

The 01 series entered into force on 4 January 2023. From 1 September 2026, Contracting Parties need not accept
approvals to the original (00) series first issued after that date (01 series §7.2.2, p. 30). New designs should
therefore meet the 01 series, and the 00 series is not transcribed.

| Key | Document | What it is | Status | Used for |
|---|---|---|---|---|
| S01 | [ECE/TRANS/WP.29/2022/92](https://documents.un.org/api/symbol/access?s=ECE/TRANS/WP.29/2022/92&l=en&t=pdf) | 01 series, full text | Adopted June 2022, in force 4 Jan 2023 | Every value; page numbers cited |
| C187 | [ECE/TRANS/WP.29/1166](https://documents.un.org/api/symbol/access?s=ECE/TRANS/WP.29/1166&l=en&t=pdf), para. 142 | Corrections at adoption | Adopted | Only change: the "D" column reference reads §3.3.2.5.2. No photometric value changed |
| Am5 | [E/ECE/TRANS/505/Rev.3/Add.147/Amend.5](https://documents.un.org/api/symbol/access?s=E/ECE/TRANS/505/Rev.3/Add.147/Amend.5&l=en&t=pdf) | 01 series as published, with C187 applied | Documentation text | Second reading of every table and figure |
| Sup1 | [ECE/TRANS/WP.29/2023/36](https://documents.un.org/api/symbol/access?s=ECE/TRANS/WP.29/2023/36&l=en&t=pdf) (slip: Add.147/Rev.1/Amend.1) | Unique Identifier wording | In force 24 Sep 2023 | No photometric change |
| Sup2 | [ECE/TRANS/WP.29/2024/23](https://documents.un.org/api/symbol/access?s=ECE/TRANS/WP.29/2024/23&l=en&t=pdf) (slip: [Add.147/Rev.1/Amend.2](https://documents.un.org/api/symbol/access?s=E/ECE/TRANS/505/Rev.3/Add.147/Rev.1/Amend.2&l=en&t=pdf)) | Replaces Table 8; red side markers; Annex 8 timing | In force 22 Sep 2024 | Table 8 |
| Sup3 | [ECE/TRANS/WP.29/2024/95](https://documents.un.org/api/symbol/access?s=ECE/TRANS/WP.29/2024/95&l=en&t=pdf) | Adds §5.4.1.1, DRL reduced mode ≤ 140 cd | In force 12 Jun 2025 | DRL reduced-mode maximum |
| Sup4 | [ECE/TRANS/WP.29/2025/37](https://documents.un.org/api/symbol/access?s=ECE/TRANS/WP.29/2025/37&l=en&t=pdf) | Approval mark size | In force 26 Sep 2025 | No photometric change |
| Sup5 | [ECE/TRANS/WP.29/2025/112](https://documents.un.org/api/symbol/access?s=ECE/TRANS/WP.29/2025/112&l=en&t=pdf) | Adds reversing projectors (§5.12) | In force 4 Jun 2026 | Not transcribed (projector, not a lamp in scope) |
| Sup6 | [ECE/TRANS/WP.29/2026/34](https://documents.un.org/api/symbol/access?s=ECE/TRANS/WP.29/2026/34&l=en&t=pdf) | Restates §3.3 markings; Annex 3 §1.1 rounding rule | Adopted Mar 2026; entry-into-force date not confirmed | Rounding rule for percentages |
| Sup7 | [ECE/TRANS/WP.29/2026/164](https://documents.un.org/api/symbol/access?s=ECE/TRANS/WP.29/2026/164&l=en&t=pdf) | Adds direction indicator projectors (§5.13) | Adopted Jun 2026; entry-into-force date not confirmed | Not transcribed (projector) |
| Sup8 | [ECE/TRANS/WP.29/2026/184](https://documents.un.org/api/symbol/access?s=ECE/TRANS/WP.29/2026/184&l=en&t=pdf) | Approval mark size, labels | Pending, WP.29 vote Nov 2026 | No photometric change |
| GRE21 | [ECE/TRANS/WP.29/GRE/2026/21](https://documents.un.org/api/symbol/access?s=ECE/TRANS/WP.29/GRE/2026/21&l=en&t=pdf) | New §4.7.3 (a pair spanning left to right needs a light source on each side); §4.8.1.3 wording | Pending at GRE, Oct 2026 | No photometric value changes |
| GRE25 | [ECE/TRANS/WP.29/GRE/2026/25](https://documents.un.org/api/symbol/access?s=ECE/TRANS/WP.29/GRE/2026/25&l=en&t=pdf) | No logo in side marker lamps (§4.5.5 (d)) | Pending at GRE, Oct 2026 | No photometric change |

The supplement list and the entry-into-force dates for Supplements 1 to 5 come from GlobalAutoRegs
(<https://globalautoregs.com/rules/219/modifications?series=1>), a secondary source. The supplement texts themselves
were read on ODS.

**Not fetched.** The consolidated Revision 1 (01 series) is not on ODS (`E/ECE/TRANS/505/Rev.3/Add.147/Rev.1` returns
no document), and unece.org answered 403 to scripted downloads of the consolidated PDFs
(<https://unece.org/sites/default/files/2023-06/R148am5e.pdf>,
<https://unece.org/sites/default/files/2024-03/R148rev.1am1e.pdf>,
<https://unece.org/sites/default/files/2025-02/R148r1am2E.pdf>). The published amendment slip for Supplement 3
(`Add.147/Rev.1/Amend.3`) is not on ODS either. Before relying on a result, compare against a current consolidated
text from UNECE.

**How the text was checked.** The whole of §§4–7 and Annexes 2, 3 and 8 was read from text extraction of S01. A
whitespace-insensitive diff of S01 against Am5 over pp. 12–46 found only the C187 reference fix and page-break shifts.
Tables 3, 4, 5, 7, 9, 10 and 11, Table A2-1 and Figures A3-I to A3-VIII were read again from page images of S01, and
Table A2-1 and Figures A3-I to A3-VI a third time from Am5 page images; the Sup2 Table 8 was read from its page image
and its published slip. Page numbers in citations are S01's own. Am5 has the same page numbers for these pages, with
a few paragraphs moved across page breaks (for example the 60 cd allowance in §5.2.1 sits on p. 19 of S01 and p. 20
of Am5).

## How R148 states a requirement

Each function has a table in §5 with the same columns, and §4.8.3.1 (p. 17) says what each column means:

1. **(a) Reference axis.** At H = 0°, V = 0° the intensity is at least the table minimum.
2. **(b) Maximum.** "In no direction where the lamp is visible" may the intensity exceed the table maximum. There are
   two maxima: one for a single lamp and one for a lamp marked "D". A "D" assembly of two independent lamps meets the
   maximum with both lit and the minimum with either failed (§4.8.3.2).
3. **(c) Standard light distribution.** Outside the axis, the intensity is at least the table minimum times the
   percentage the Annex 3 figure gives for that direction, or at least the cd value the figure gives (the reversing
   lamp figure is in cd). Supplement 6 adds that the product is "mathematically rounded down to three significant
   digits" (Annex 3 §1.1).
4. **(d) Field of geometric visibility.** Within the angles of Annex 2, the intensity is at least the small value in
   the table's last column. R148 states these angles itself (Tables A2-1 to A2-3), so no reference to R48 is needed.

**Between grid points** (Annex 3 §1.2, p. 39). In each cell of the grid the intensity must meet at least the lowest
minimum shown on the grid lines around it. Reversing lamps have their own rule: if visual examination suggests
substantial local variation, no value between two measuring directions may be below 50 % of the lower of the two
minima. Rear fog lamps: on the same condition, nothing inside the rhombus, off the axes, may be below 75 cd (Annex 3
§2.6).

**Low-mounted lamps** (Annex 3 §1.1). For direction indicators, position, end-outline marker, parking, S1/S2/MS stop
and side marker lamps installed with the H-plane at or below 750 mm, the distribution is verified only down to 5°
below H. Table A2-1 note a reduces the inboard angle below H for such lamps (for example 45° to 20°), note b reduces
the downward angle to 5°, and note c gives 5° up / 15° down for optional lamps above 2,100 mm. The data file carries
the default field and these variants as separate zones; each variant names its condition in `when` and the field it replaces in `replaces`.

**Ratios.** If a rear position or rear end-outline marker lamp is reciprocally incorporated with a stop lamp, the
intensity with both lit over the intensity of the position function alone "should be at least 5:1" between ±5° V and
±10° H (§4.8.3.5, p. 18). This is a direction-by-direction ratio between two functions, so the file records it as a
`note` with a structured `ratio` field.

**Variable intensity.** Categories R2, RM2, S2, S4, 2b and F2 have higher maxima, but under night-time (or standard)
conditions the control may not exceed the maximum of the steady category (§4.8.3.4.2, p. 18), and if the control fails
the steady requirements apply (§4.6.2, p. 14). S2, S4 and 2b also have separate day (0.3 cd) and night (0.07 cd) field
minima. The file gives each variable category a night-time `imax` set to the steady category's maximum.

**Coordinate tolerance.** When results are challenged, a direction passes if the requirement is met within 0.25° of
it, with a receiver aperture between 10′ and 1° (§4.8.1.8.2–3, p. 16). The file records this as `tolerance`.

## How directions are named

- **Front and rear lamps.** Annex 2 draws its angles for a lamp "mounted on the right side of the vehicle" and names
  the horizontal angles *inboard* and *outboard*, the vertical angles *above* and *below*. The file uses h positive
  outboard, so a field written "45°/80°" becomes h from −45 to +80. The Annex 3 figures for these lamps (A3-I, A3-II,
  A3-III, A3-V) are symmetric about V-V and are transcribed as printed.
- **Side direction indicators (categories 5 and 6).** Figure A2-II measures from a reference axis parallel to the
  vehicle side, pointing rearwards ("direction A"). Annex 8 Table A8-1 gives the reference coordinate of categories 5
  and 6 as H5, V0, and Annex 3 §2.4 puts the category 6 minimum at H = 5°, V = 0°. The file takes h as the angle
  outwards from the rearward direction, so direction A is h = 5. Figure A3-IV labels positive H as the "outer side of
  the vehicle".
- **Side marker lamps.** The reference axis is perpendicular to the vehicle side; angle A is towards the front and
  angle B towards the rear (Figure A2-III). The grids are symmetric. The file takes h positive towards the front, which
  only matters for the red side marker's 0.25 cd limit from 60° to 90° towards the front (§5.7.1).

## Choices

- **Table 8 from Supplement 2.** The 01 series as adopted prints the single-lamp maximum of categories 11a, 11b and 11c
  as 1.20·10² cd, below their own minima and inconsistent with the 6.00·10² cd "D" value. Supplement 2 replaced the
  table and reads 1.20·10³ cd. The file uses Supplement 2.
- **Category 5 field.** Table A2-2 prints "5°/55°" as angles A/B. Figure A2-II draws angle B as the width of the field
  measured from the edge at angle A, which puts the outer edge at 60°, the same extent as the category 6 grid in
  Figure A3-IV. The file uses 5° to 60° and marks the 60° as derived. See the open questions.
- **Category 5 distribution.** Table 8 names "Table A2-2" as the standard light distribution for category 5, and there
  is no category 5 figure in Annex 3. The file treats the 0.6 cd minimum as applying across the field.
- **Side marker grids.** Figures A3-VII and A3-VIII are grids without percentages; Table 9 gives one minimum (0.6 cd)
  "within the standard light distribution". The file uses a zone over the grid (±45° or ±30° H, ±10° V).
- **Reversing lamp maxima.** Table 10 splits the maximum by direction (300 cd at or above H, 600 cd to 5° down, 8,000
  cd below). These are zones bounded at ±90° H to stand for "every direction in which the lamp is visible".
- **Rear position lamps incorporated with stop lamps.** §5.2.1 and §5.3.1 allow 60 cd below 5° down. The file models
  this as a zone with `overrides: 'imax'`.
- **Manoeuvring lamps** (§5.10) were not in the brief but R148 sets their photometry, so the file includes the 500 cd
  maximum and records the height-dependent glare field as a note.
- **Rear registration plate lamps** are specified by luminance on the plate (cd/m²), not by intensity, so the file
  carries them as notes. The measuring-point figures (A3-IX to A3-XV) are not transcribed.
- **Projectors** (reversing projectors, Supplement 5, and direction indicator projectors, Supplement 7) are not
  transcribed. Both cap intensity at 1.20·10⁴ cd inside a projection area that R48 defines.
- **Format extensions.** Beyond the shared brief, requirements may carry `when` (a list of `CONDITIONS` ids that must
  all hold), `replaces` (the id of the requirement in the same function that a conditional one stands in for, used for
  the low- and high-mounting fields and the "D" maximum), `overrides` (an allowance replacing the general maximum in a
  zone), `between` (the rule between grid points) and, on a `note`, `ratio`. `CONDITIONS` lists each condition atom
  with its text; atoms with the same `set` are mutually exclusive (`period`: day or night; `arrangement`: singular or
  pair), and atoms without a set are facts the user declares about the lamp. `GENERAL` holds two requirements that apply across functions: the optional 165°–180° test for red to the
  front and white to the rear (§4.8.3.1.1) and the conformity-of-production table.

## Open questions

1. **Category 5 outer edge, 55° or 60°.** The printed "5°/55°" and the figure can be read two ways. A technical service
   or the UNECE consolidated text with its figure should settle it; until then, a lamp that passes only because of the
   55°–60° strip, or fails only in it, needs a second look.
2. **Entry into force of Supplements 6 and 7.** Both were adopted in 2026; the dates were not found. Supplement 6's
   rounding rule only affects how a percentage minimum is rounded.
3. **Consolidated text.** Revision 1 and its Amendment 3 (Supplement 3) could not be fetched. The Supplement 3 values
   were taken from its WP.29 working document.
4. **Interpretation of "D" minima.** §4.8.3.2 says a "D" assembly meets the minimum "if either lamp has failed". The
   file states this in the `marked-d` condition text; an evaluator must model the failed state separately.
