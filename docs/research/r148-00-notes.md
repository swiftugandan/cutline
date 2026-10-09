# UN Regulation No. 148, original (00) series: light-signalling lamps, photometry

Prepared 9 October 2026 for `src/core/regulation/data/r148-00.js`. The file transcribes the photometric requirements of
the **original (00) series** of R148, as amended up to Supplement 6, for the same functions as
`src/core/regulation/data/r148.js` (the 01 series). Every value was read from an official UN document fetched on
9 October 2026; none comes from memory or from the 01-series file. Where a 00 value equals the 01 value, the 00 file
still carries it in full so that it stands alone.

## Which text applies

The 01 series has been in force since 4 January 2023, and new UN approvals should meet it. Two national schemes still
point at the 00 series. Taiwan's VSTD item 91 (燈光訊號裝置, new types from 1 January 2025) tests to "UN R148 00 series
and its later amendments", and item 91-1 moves new types to the 01 series from 1 January 2028. India's draft AIS-198
(August 2024) is "based on UN R 148" and cites "Supplement 4 to the original version of the Regulation", in force
8 October 2022. See [national-notes.md](national-notes.md). A designer working to either scheme needs the 00 values,
because they differ from the 01 series in a few places: lower direction indicator maxima, fewer lamps that may form a
"D" assembly, no option to verify some distributions from V-V outboard only, and a category 6 field. The table under
"Differences from the 01 series" lists them.

AIS-198 stops at Supplement 4, so for India the Supplement 6 reduced-DRL limit (140 cd) does not apply; Supplement 5
changes only marking wording. Taiwan follows later amendments, so all six supplements apply.

## Sources

| Key | Document | What it is | Status | Used for |
|---|---|---|---|---|
| S00 | [ECE/TRANS/WP.29/2018/157](https://documents.un.org/api/symbol/access?s=ECE/TRANS/WP.29/2018/157&l=en&t=pdf) | Original text, the authentic version | Adopted Nov 2018; in force 15 Nov 2019 (Add.147 header) | Every value; page numbers cited |
| Add147 | [E/ECE/TRANS/505/Rev.3/Add.147](https://documents.un.org/api/symbol/access?s=E/ECE/TRANS/505/Rev.3/Add.147&l=en&t=pdf) | Published original text | Documentation copy | Word diff against S00 over §4 to Annex 3: same content, only page-break shifts and "No.[LSD]" read as "No. 148" |
| Sup1 | [ECE/TRANS/WP.29/2019/81](https://documents.un.org/api/symbol/access?s=ECE/TRANS/WP.29/2019/81&l=en&t=pdf), amended by [ECE/TRANS/WP.29/1149](https://documents.un.org/api/symbol/access?s=ECE/TRANS/WP.29/1149&l=en&t=pdf) para. 69; slip [Add.147/Amend.1](https://documents.un.org/api/symbol/access?s=E/ECE/TRANS/505/Rev.3/Add.147/Amend.1&l=en&t=pdf) | R48 definitions, LED substitute sources, DRL 700 cd CoP rule, Table A2-1 MR pair row | In force 29 May 2020 | MR pair field; §4.7.7; §3.5.1.1.1 |
| Sup2 | [ECE/TRANS/WP.29/2020/32](https://documents.un.org/api/symbol/access?s=ECE/TRANS/WP.29/2020/32&l=en&t=pdf); slip Add.147/Amend.2 | Module marking; sequential indicators for 11–12; deletes Table 9 footnote 1; restates Figures A3-I and A3-X | In force 25 Sep 2020 | Figure A3-I (values unchanged) |
| Sup3 | [ECE/TRANS/WP.29/2021/45](https://documents.un.org/api/symbol/access?s=ECE/TRANS/WP.29/2021/45&l=en&t=pdf); slip Add.147/Amend.3 | §4.6.1 failure rules; Annex 3 §1.2 reversing-lamp 50 % rule | In force 30 Sep 2021 | Between-points rule, failure notes |
| Sup4 | [ECE/TRANS/WP.29/2022/37](https://documents.un.org/api/symbol/access?s=ECE/TRANS/WP.29/2022/37&l=en&t=pdf); slip Add.147/Amend.4 | DRL failure wording; manoeuvring lamp formula; plate categories; marking examples | In force 8 Oct 2022 | §5.4.4.2, §5.10.2, §5.11.3 |
| Sup5 | [ECE/TRANS/WP.29/2023/35](https://documents.un.org/api/symbol/access?s=ECE/TRANS/WP.29/2023/35&l=en&t=pdf); slip Add.147/Amend.6 | Unique Identifier wording in the introduction | In force 24 Sep 2023 | No photometric change |
| Sup6 | [ECE/TRANS/WP.29/2024/94](https://documents.un.org/api/symbol/access?s=ECE/TRANS/WP.29/2024/94&l=en&t=pdf) | Adds §5.4.1.1 (reduced DRL ≤ 140 cd); communication form | Adopted Nov 2024; in force 12 Jun 2025 per GlobalAutoRegs | DRL reduced-mode maximum |
| S01 | [ECE/TRANS/WP.29/2022/92](https://documents.un.org/api/symbol/access?s=ECE/TRANS/WP.29/2022/92&l=en&t=pdf) | 01 series | In force 4 Jan 2023 | Comparison only |

Add.147/Amend.5 is the 01 series, not a 00 supplement, which is why Supplement 5 is Amend.6. The supplement numbering
and the documents behind each number come from the published slips, which name the authentic text; the list of
supplements and the Supplement 6 entry-into-force date come from GlobalAutoRegs
(<https://globalautoregs.com/rules/219/modifications?series=original>), a secondary source.

**Not fetched.** No consolidated 00 text exists on ODS, and the published slip for Supplement 6 (Add.147/Amend.7) is
not on ODS. GlobalAutoRegs lists a "Supplement 7" to the original series, but its only document is the informal
GRE-92-13 (April 2025, delete the Unique Identifier marking), with no WP.29 document found; it would not change a
photometric value. The pending ECE/TRANS/WP.29/GRE/2026/25 (no logo in side marker lamps) applies to both series and
changes no value.

**How the text was checked.** §4 to §6 and Annexes 2 to 5 were read from text extraction of S00. Tables 3 to 11,
Tables A2-1 to A2-3, Figures A2-II and A2-III and Figures A3-I to A3-VIII were then read again from page images of
S00, and the Supplement 2 Figure A3-I from its page image. Each supplement was read in full. Page numbers in the
citations are S00's own, which match its PDF page numbers.

## How the 00 series states a requirement

The 00 tables have only two columns, the minimum "in H-V" and the maximum "in any direction" (single lamp and lamp
marked "D"). The other two rules sit in the text of each function:

1. **Standard light distribution** (§4.8.3.1, p. 18, and each §5.x.2). In each grid direction the intensity is at
   least the table minimum times the Annex 3 percentage. There is no rounding rule; the 01 series added one in its
   Supplement 6.
2. **Field minimum.** A paragraph per function (for example §5.1.3, §5.5.3, §5.6.5) sets a small minimum "throughout
   the fields defined in the diagrams in Part A of Annex 2".
3. **Maximum** "in no direction within the space from which the light-signalling lamp is visible" (§4.8.3.2).
4. **"D" assemblies** meet the maximum with both lamps lit and the minimum with either failed (§4.8.4). §4.4.1 allows
   "D" only for position lamps except MA and MR, stop lamps except MS, end-outline marker lamps, and direction
   indicators except categories 11, 11a, 11b, 11c and 12.

**Between grid points** (Annex 3 §1.2, p. 41): the lowest minimum on the surrounding grid lines. Supplement 3 added
the reversing-lamp rule (no value between two directions below 50 % of the lower minimum, on visual evidence of local
variation). The rear fog lamp rhombus rule (75 cd) is in Annex 3 §2.6 from the start.

**Low-mounted lamps** (Annex 3 §1.3, p. 41, the same list as 01 §1.1): direction indicators, position, end-outline
marker, parking, S1/S2/MS stop and side marker lamps at or below 750 mm are verified only down to 5° below H. Table
A2-1 note 1 reduces the inboard angle below H, note 2 the downward angle, and note 3 gives 5°/15° for optional lamps
above 2,100 mm. The file uses `when` and `replaces` exactly as the 01 file does.

**Coordinate tolerance** (§4.8.1.2.3, p. 17): when results are challenged, a direction passes within a quarter of a
degree; receiver aperture 10′ to 1° (§4.8.1.2.2).

**Directions** follow the 01 file: h positive outboard for front and rear lamps (Annex 2 draws a lamp on the right
of the vehicle), h measured outwards from the rearward direction for categories 5 and 6 (direction A at h = 5, Annex 3
§2.4), and h positive towards the front for side marker lamps.

## Differences from the 01 series

Values for 01 are those in `r148.js`, checked against S01 Tables 3 to 8 for this comparison.

| Function | 00 series | 01 series | 00 cite |
|---|---|---|---|
| Direction indicator 1 | max 1,000 cd, "D" 500 cd | 1,200 / 600 cd | Table 8, p. 24 |
| Direction indicator 11 | max 1,000 cd, no "D" | 1,200 / 600 cd | Table 8; §4.4.1 |
| Direction indicator 11a | max 1,000 cd, no "D" | 1,200 / 600 cd (as corrected by 01 Supplement 2) | Table 8 |
| Direction indicators 11b, 11c | max 1,200 cd, no "D" | 1,200 / 600 cd | Table 8 |
| Direction indicator 12 | max 500 cd, no "D" | 500 / 250 cd | Table 8 |
| Front position MA, rear position MR, stop MS | no "D" ("N.A.") | "D" 70, 8.5 and 130 cd | Tables 3, 4, 7; §4.4.1 |
| Front position A incorporated in a headlamp or front fog lamp | separate row, no "D" | one row for A, MA, AM | Table 3, p. 20 |
| Daytime running lamp | no "D" column | "D" 600 cd, apparent surface ≤ 100 cm² for "D" | Table 6, p. 22 |
| AM, RM1, RM2, parking lamps, MS pair | no option | distribution may be verified from V-V outboard only | §5.1–5.5 |
| Side direction indicator 6 | Table A2-2 row 5°/55°, 30°/5°, no minimum stated | no field ("N.A.") | Table A2-2, p. 38 |
| Rear position pair MR field | 20°/80°, 15°/10°, 15°/5° after Supplement 1 (original: 45°/80° with 20°/80° below H for low lamps) | same as amended 00 | Table A2-1, Sup1 |
| Distribution rounding | none | rounded down to three significant digits (01 Sup6) | Annex 3 §1.1 |
| Red to the front, white to the rear | no optional test | optional 165°–180° test, ≤ 0.25 cd | — |
| Timing for non-filament lamps | 1 min and 30 min (reversing and manoeuvring 1 and 10 min) | Annex 8, with extra times in Table A8-1 | §4.8.2.3, p. 18 |
| Category 2b night limit | "under reference conditions as demonstrated by the manufacturer" for systems not based on day and night | "standard conditions" | §5.6.8, pp. 25–26 |
| Failure tell-tale option | also needs the axis at ≥ 50 % of the minimum | tell-tale alone | §4.6.1.2 (b), p. 15 |
| Test conditions | standard filament source at reference flux; LED sources at 6.75/13.5/28.0 V with flux correction | R.E.5 standard sources, operating rules in §4.8.2 | §4.7.1, pp. 16–17 |

Everything else in the file matches the 01 series: the axis minima and the other maxima of Tables 3 to 11, the field
minima (0.05, 0.3, 0.7, 0.07, 1.0, 0.6 cd), Table A2-1 to A2-3 angles, Figures A3-I to A3-VIII, the 60 cd allowance
below 5° down, the 5:1 stop-to-position ratio, the side marker 0.25 cd limit for red lamps, the reversing lamp maxima
and pair rule, the rear fog lamp axes and rhombus, the manoeuvring lamp limits and the plate luminance minima.

## Choices

- **Direction indicators 11 to 12 without "D".** Table 8 prints "N.A." and §4.4.1 excludes them, so these functions
  have no "D" maximum. The same applies to MA, MR, MS and the daytime running lamp.
- **Category 5 field.** §5.6.4 (p. 25) sets 0.6 cd "throughout the fields specified in Part A of Annex 2", but the
  category 5 row is in Part B (Table A2-2). The file uses Table A2-2 and keeps the 01 file's reading of "5°/55°" as a
  field from 5° to 60° (Figure A2-II draws angle B from the edge at angle A). The 60° edge is derived.
- **Category 6 field.** Table A2-2 gives category 6 a field (5°/55°, 30° up, 5° down) but no paragraph gives a minimum
  for it. The file carries only the Figure A3-IV grid, which spans the same area, with its between-points rule.
- **Parking lamp field.** §5.3.4 points the 0.05 cd field minimum at Part B of Annex 2 (side parking), while Table
  A2-1 in Part A has a front/rear parking row with the same angles (0°/45°, 15°/15°, 15°/5° low). The file uses
  Table A2-1; the result is the same either way.
- **60 cd below 5° down** (§5.2.3) is written for rear position lamps reciprocally incorporated with stop lamps, so it
  is on R1, R2 and MR and not on RM1 or RM2, as in the 01 file; §5.3.2 gives the same allowance to rearward facing
  parking lamps "incorporated with" stop lamps.
- **Side marker grids, reversing lamp zones, manoeuvring and plate lamps** are carried as in the 01 file: zones over
  the grid for SM1 and SM2, maximum zones bounded at ±90° for reversing lamps, the height-dependent manoeuvring glare
  field and the plate luminance rules as notes.
- **Format.** The same extensions as the 01 file: `when`, `replaces`, `overrides`, `between` and a `ratio` field on a
  `note`. `GENERAL` holds the Annex 4 conformity-of-production table (20 % and 30 % values).

## What the format cannot express

- The 5:1 ratio between two lamps lit together and one lit alone (a `note` with a `ratio` field).
- The manoeuvring lamp's glare field, whose vertical limits depend on mounting height.
- Rear registration plate requirements, which are luminance on a surface in cd/m², with a gradient rule.
- The "D" rule that the minimum must hold with either lamp failed, which needs a separate failed-lamp evaluation.
- Failure rules (tell-tale or 50 % / 80 % of minima with one source failed) and the 1 min / 30 min timing.

## Open questions

1. **Category 5 outer edge, 55° or 60°**, as for the 01 series.
2. **Category 6 field minimum.** The 00 series gives the field but no minimum; a technical service may read the
   Figure A3-IV percentages as covering it, as the file does.
3. **Supplement 6 entry into force** (12 June 2025) is from GlobalAutoRegs; the published slip was not on ODS.
4. **Taiwan and India supplements.** Taiwan item 91 follows later amendments; AIS-198 names Supplement 4, so whether
   it takes the Supplement 6 reduced-DRL limit should be checked against the final AIS-198 text.
