# UN Regulation No. 149, original (00) series: headlamp photometry

Prepared 9 October 2026 for `src/core/regulation/data/r149-00.js`. The file transcribes the photometric requirements of
the **original (00) series** of R149, as amended up to Supplement 10, for every headlamp class the series defines: the
asymmetric passing beams of Classes A, B and D, their driving beams, and the symmetric passing and driving beams of the
L- and T-category Classes AS, BS, CS, DS and ES. AFS, front fog lamps and cornering lamps are notes only. Every value
was read from an official UN document fetched on 9 October 2026; none comes from memory or from the 01-series file
`src/core/regulation/r149.js`.

## Which text applies

The 01 series has been in force since 4 January 2023 and rewrote the classes. From 1 September 2026, Contracting
Parties need not accept 00-series approvals first issued after that date, and they keep accepting those issued before it
(01 series §7.2.2–7.2.3, p. 48). New UN approvals should therefore meet the 01 series, which Cutline already checks.

Two national schemes still point at the 00 series, which is why this file exists (see [national-notes.md](national-notes.md)):

- **Taiwan**, VSTD item 92 (道路照明裝置, new types from 1 January 2025), tests to "UN R149 00 series and its later
  amendments". Item 92-1 moves new types to the 01 series from 1 January 2028. Taiwan drives on the right, so the data
  apply without mirroring, with every supplement listed below.
- **India**, draft AIS-199 (August 2024, not yet notified), cites "UN R 149 (Supplement 5 to the original version of
  the Regulation) Date of entry into force: 8 October 2022". Supplements 1 to 3, which change values here, are inside
  Supplement 5. Supplements 6 to 10 change no value transcribed here, so the data hold for AIS-199 too, mirrored for
  left-hand traffic.

**Symbol trap.** In the 00 series the symbol "C" marks a *Class A* passing beam ("C", "HC" and "DC" are Classes A, B
and D, §5.2 title, p. 28). In the 01 series "C" marks Class C. A lamp marked "HC" or "HCR" is a 00-series Class B
headlamp.

## Sources

| Key | Document | What it is | Status | Used for |
|---|---|---|---|---|
| S00 | [ECE/TRANS/WP.29/2018/158/Rev.1](https://documents.un.org/api/symbol/access?s=ECE/TRANS/WP.29/2018/158/Rev.1&l=en&t=pdf) | Original text, the authentic version (based on 2018/158 and Corr.1) | Adopted March 2019; in force 15 November 2019 | Every value; page numbers cited |
| Add148 | [E/ECE/TRANS/505/Rev.3/Add.148](https://documents.un.org/api/symbol/access?s=E/ECE/TRANS/505/Rev.3/Add.148&l=en&t=pdf) | Published original text; names S00 as the authentic text | Documentation copy | Entry-into-force date |
| Sup1 | [ECE/TRANS/WP.29/2019/82](https://documents.un.org/api/symbol/access?s=ECE/TRANS/WP.29/2019/82&l=en&t=pdf) and [ECE/TRANS/WP.29/2019/125](https://documents.un.org/api/symbol/access?s=ECE/TRANS/WP.29/2019/125&l=en&t=pdf), the latter retitled by [ECE/TRANS/WP.29/1149](https://documents.un.org/api/symbol/access?s=ECE/TRANS/WP.29/1149&l=en&t=pdf) para. 69; slip [Add.148/Amend.1](https://documents.un.org/api/symbol/access?s=E/ECE/TRANS/505/Rev.3/Add.148/Amend.1&l=en&t=pdf) | R48 definitions; deletes the 50L minima in Table 8; Table 13 point names; CoP realignment renumbered | In force 29 May 2020 | 50L row of Table 8 |
| Sup2 | [ECE/TRANS/WP.29/2020/33](https://documents.un.org/api/symbol/access?s=ECE/TRANS/WP.29/2020/33&l=en&t=pdf); slip [Add.148/Amend.2](https://documents.un.org/api/symbol/access?s=E/ECE/TRANS/505/Rev.3/Add.148/Amend.2&l=en&t=pdf) | Run-up values for gas-discharge Classes D and ES (§5.1.3.7, §5.2.2.1, §5.4.4.3.1) | In force 25 September 2020 | Run-up notes |
| Sup3 | [ECE/TRANS/WP.29/2021/46](https://documents.un.org/api/symbol/access?s=ECE/TRANS/WP.29/2021/46&l=en&t=pdf); slip [Add.148/Amend.3](https://documents.un.org/api/symbol/access?s=E/ECE/TRANS/505/Rev.3/Add.148/Amend.3&l=en&t=pdf) | Replaces Table 8 Part A; Table 9 Part B (AFS); Figure A4-IX title; Annex 7 points; Annex 13 | In force 30 September 2021 | Table 8 Part A |
| Sup4 | [ECE/TRANS/WP.29/2021/95](https://documents.un.org/api/symbol/access?s=ECE/TRANS/WP.29/2021/95&l=en&t=pdf); slip Add.148/Amend.4 | New §3.2.5 on cornering lamps in assemblies | In force 22 June 2022 | No photometric change |
| Sup5 | [ECE/TRANS/WP.29/2022/38](https://documents.un.org/api/symbol/access?s=ECE/TRANS/WP.29/2022/38&l=en&t=pdf); slip Add.148/Amend.5 | Markings; §4.5.2.6 wording; Figure A4-V caption ("mirrored about the VV line"); Figure A4-VII | In force 8 October 2022 | Left-hand traffic rule |
| Sup6 | [ECE/TRANS/WP.29/2022/115](https://documents.un.org/api/symbol/access?s=ECE/TRANS/WP.29/2022/115&l=en&t=pdf); slip Add.148/Amend.7 | §3.3.2.4.2 marking; communication form | In force 5 June 2023 | No photometric change |
| Sup7 | [ECE/TRANS/WP.29/2023/37](https://documents.un.org/api/symbol/access?s=ECE/TRANS/WP.29/2023/37&l=en&t=pdf); slip Add.148/Amend.8 | Unique Identifier; AFS CoP Tables 26–29 | In force 24 September 2023 | No headlamp-class change |
| Sup8 | [ECE/TRANS/WP.29/2024/24](https://documents.un.org/api/symbol/access?s=ECE/TRANS/WP.29/2024/24&l=en&t=pdf); slip Add.148/Amend.9 | §3.2.2 approval numbers | In force 22 September 2024 | No photometric change |
| Sup9 | [ECE/TRANS/WP.29/2025/38](https://documents.un.org/api/symbol/access?s=ECE/TRANS/WP.29/2025/38&l=en&t=pdf) | Annex 8 §3.7.1.2.1, points checked after the mechanical deterioration test of plastic lenses | In force 26 September 2025 (GlobalAutoRegs) | No limit in the tables |
| Sup10 | [ECE/TRANS/WP.29/2025/118](https://documents.un.org/api/symbol/access?s=ECE/TRANS/WP.29/2025/118&l=en&t=pdf) | Renumbers §4.11; AFS §5.3.1.4.4.2 | In force 4 June 2026 (GlobalAutoRegs) | Citation of §4.11 |
| Sup11 | [ECE/TRANS/WP.29/2026/214](https://documents.un.org/api/symbol/access?s=ECE/TRANS/WP.29/2026/214&l=en&t=pdf) | AFS Tables 18, 21, 23, 24 and their notes | Pending, for the November 2026 WP.29 vote | Not applied (AFS only) |
| S01 | [ECE/TRANS/WP.29/2022/93](https://documents.un.org/api/symbol/access?s=ECE/TRANS/WP.29/2022/93&l=en&t=pdf) | 01 series | In force 4 January 2023 | Comparison only |

**Supplement numbering.** The published slips name the authentic text of each supplement, and they settle two
confusions. First, two WP.29 documents were drafted as "Supplement 2": WP.29/2019/125 (the 50L correction) and
WP.29/2020/33 (run-up values). WP.29 retitled 2019/125 as part of Supplement 1 when it adopted it (WP.29/1149
para. 69), and Add.148/Amend.1 lists both 2019/82 and 2019/125 as Supplement 1. So the **50L minima were deleted by
Supplement 1**, not Supplement 2 as `docs/research/r149-notes.md` §2c says. Second, slip Add.148/Amend.3 names
"ECE/TRANS/WP.29/2020/46" as the authentic text of Supplement 3; that symbol is a GTR document, and the slip's Table 8
is word for word the Table 8 of ECE/TRANS/WP.29/2021/46, so the slip's symbol is a misprint. Add.148/Amend.6 is the 01
series, which is why Supplement 6 is Amend.7. The entry-into-force dates of Supplements 1 to 8 are printed on their
slips; those of Supplements 9 and 10 come from GlobalAutoRegs (<https://globalautoregs.com/rules/218/modifications?series=original>),
a secondary source, which also gave the supplement list.

**Not fetched.** No consolidated 00 text exists on ODS, and unece.org answered 403 to scripted downloads of the
consolidated PDFs (<https://unece.org/sites/default/files/2025-01/R149am9e_0.pdf>, Amendment 9 of the original text). The slips for Supplements 9 and 10 (Add.148/Amend.10 and
later) are not on ODS. Supplement 10 prints only the start of its renumbered §4.11 ("…"), so the new numbers of the
failure paragraphs cited below (§4.11.2.1 and §4.11.3.1 in S00) are unknown.

**How the text was checked.** §4, §5.1, §5.2, §5.4 and Annexes 2, 4, 5 and 6 were read from text extraction of S00,
and every supplement was read in full. Tables 5, 6, 7, 8 (Parts B and C and the original Part A), 33, 34 and 35, the
Supplement 3 Table 8 Part A, Figures A4-IV to A4-VI and A4-VIII to A4-X, and Figures A5-I to A5-III were then read
again from rendered page images. Page numbers in the citations are S00's own; they equal its PDF page numbers.

## Functions in the file

| id | Class and symbol | Table | Traffic | Aim | Tolerance |
|---|---|---|---|---|---|
| `passing-A` | Class A passing beam, "C" | 8 (Fig. A4-V) | right | `r149` | none |
| `passing-B` | Class B passing beam, "HC" | 8 (Fig. A4-V) | right | `r149` | none |
| `passing-D` | Class D passing beam, gas discharge, "DC" | 8 (Fig. A4-VI) | right | `r149` | none |
| `driving-A`, `driving-B`, `driving-D` | Driving beams "R", "HR", "DR" | 5 | both | `driving-max` | none |
| `passing-AS`, `passing-BS` | Symmetric passing beams "C-AS", "C-BS" | 33, 34 | both | symmetric cut-off | 0.25° |
| `passing-CS`, `passing-DS`, `passing-ES` | Symmetric passing beams "WC-CS", "WC-DS", "WC-ES" | 35 | both | symmetric cut-off | 0.25° |
| `driving-BS`, `driving-CS`, `driving-DS`, `driving-ES` | Symmetric driving beams "R-BS", "WR-CS", "WR-DS", "WR-ES" | 6 (primary), 7 (secondary) | both | `driving-max` | 0.25° |

Table 5 prints three driving-beam classes with different minima, so the file has one function per class
(`driving-A`, `driving-B`, `driving-D`) instead of a single `driving`. Classes DS and ES share one column in Tables 6, 7
and 35 but are separate functions, because their symbols, light sources and run-up rules differ.

The module also exports `RULES` (receiver, aiming and cut-off numbers of the 00 series, shaped like `RULES` in
`r149.js` so the two can be compared), `CONDITIONS`, `ZONE_III`, `ZONE_1_CS_DS_ES` and `GENERAL` (colour, adjustable
reflector, and the pointer to AFS, fog and cornering lamps).

## Measurement and aiming

**Receiver.** A photoreceptor within a 65 mm square, at least 25 m forward of the centre of reference, perpendicular to
the measurement axis; angles on a sphere with a vertical polar axis (Annex 4 §1.1.1–1.1.2, p. 74). This is about
0.149° across, the same as the 01 series.

**Coordinate tolerance.** Tables 6, 7, 33, 34 and 35 each carry the note "0.25° tolerance allowed independently at each
test point for photometry unless indicated otherwise" (pp. 28, 51, 52). Tables 5 and 8 do not, and the 00 series has no
general tolerance sentence: the 01 series §5.1.3 sentence that grants 0.25° to driving beams has no 00 counterpart
(the only other quarter-degree rule, Annex 4 §1.6.2.3, is for cornering lamps). The file therefore gives a 0.25°
tolerance to the symmetric classes and none to Classes A, B and D, passing or driving. This differs from Cutline's
01-series evaluator, which applies 0.25° to every driving beam.

**Classes A, B and D passing beam.** The 00 series aims the beam visually first (Annex 5 §1.2, pp. 86–87) and uses the
instrumental method only if the vertical aim cannot be repeated within the tolerances (§1.2.4, p. 88), as the 01 series
does (01 Annex 5 §4.2 and Annex 6 §1.2). Paragraph by paragraph, the instrumental method is the same:

| Step | 00 series (S00 Annex 5) | 01 series (S01 Annex 6) | Same? |
|---|---|---|---|
| Scan step and detector | 0.05°; 10 m with ~10 mm or 25 m with ~30 mm; maximum sharpness only at 25 m (§2.2, p. 88) | Same text (§2.2, p. 74); Supplement 4 adds "and linearity" to the 25 m-only rule; Supplement 7 allows "0.05° or smaller" | Yes, apart from the later 01 supplements |
| Sharpness | G = log E(β) − log E(β + 0.1°) at 2.5° from V-V, 0.13 ≤ G ≤ 0.40 (§2.2.2, pp. 88–89) | Same (§2.2.2, pp. 74–75) | Yes |
| Linearity | Inflection points at 1.5°, 2.5°, 3.5° within 0.2° (§2.2.3, p. 89) | Same (§2.2.3.1, p. 75) | Yes |
| Vertical aim | Scan up at 2.5° from V-V, inflection point on line B, 1 % below H-H (§2.3.1, p. 89). The text does not name the side; Figure A5-III (p. 90) draws the scan line 2.5° left of V-V | Same, and the text says "on the left side of V-V line for right hand traffic" (§2.3.1, p. 76) | Yes, by the figure |
| Horizontal aim | Applicant's choice: 0.2°D line from 5°L to 5°R, G ≥ 0.08, inflection on line A; or three vertical scans 2°D–2°U at 1°R, 2°R, 3°R, G ≥ 0.08, line through the inflections meets line B on V-V (§2.3.2, pp. 89–90) | Same (§2.3.2.1, pp. 76–77) | Yes |
| Line A | Drawn 0.5° right of V-V in Figures A5-I and A5-III (pp. 87, 90); not stated in the text | Same in Figure A5-I | Yes |

That is why the three functions carry `aimRule: 'r149'`. The differences are elsewhere:

- **Realignment after a failed first measurement.** The 00 series allows 0.5° to the left or 0.75° to the right of
  line A (right-hand traffic, mirrored for left-hand traffic) and 0.25° up or down from line B (Annex 5 §1.2.3,
  pp. 87–88). The 01 series allows 0.75° either way and 0.25° vertically (01 Annex 5 §4.1, p. 72). Cutline does not
  search for a better aim within these allowances in either series.
- **Visual aim for left-hand traffic.** The 00 text asks that the kink of the elbow "should be primarily on the V-V
  line", where the right-hand-traffic text says "basically located within ±0.5°" (Annex 5 §1.2.2, p. 87). The 01 series
  uses ±0.5° for both.

**Driving beams.** A headlamp with both beams is measured with the passing-beam aim; a driving-beam-only headlamp is
adjusted so that its area of maximum intensity is centred on H-V (§5.1.1, pp. 26–27). The file gives the driving
functions `aimRule: 'driving-max'`, the vocabulary `r123.js` uses for the driving-only case, and says in the notes that
a combined headlamp keeps the passing aim.

**Symmetric classes.** These aim by Annex 6 (§5.4.1.2, p. 50): the pattern looks approximately symmetrical about V-V,
and the cut-off is moved up from below until it lies on V-V at 0.57° below H-H (Annex 6 §3.1–3.2, p. 93). The
instrumental check scans vertically from 3° to 1.5° either side of V-V, needs G ≥ 0.13 (BS) or ≥ 0.08 (AS, CS, DS, ES)
on the ±2.5° lines, and needs the inflection points at 3°L and 3°R within 0.2° (BS) or 0.3° (others) of the nominal
position (Annex 6 §4.1–4.1.3, p. 94); the inflection point on V-V is then placed at the nominal position (§5, p. 94).
The 01 series uses G ≥ 0.08 and 0.5° for every symmetric class. Cutline has no aim rule for symmetric beams, so these
functions carry no `aimRule`; the method is in `aim` and the notes.

## How the tables become requirements

- **Points, segments and zones** keep the table's names. "Segment" rows are `line` requirements; zones with a minimum
  must meet it everywhere, zones with a maximum must not exceed it anywhere.
- **Zone III** (all three classes) uses the eight-vertex polygon of Part C (p. 30), the same polygon as the 01 series.
- **Part B** (B1 to B8, overhead signs and the left verge) has no class columns and appears in Figure A4-V (Classes A
  and B) and Figure A4-VI (Class D), so every class carries it. B1+B2+B3 and B4+B5+B6 are `sum` requirements.
- **50L with LED modules.** Note * to Table 8 raises the Class A and B 50L maximum from 13,200 cd to 18,500 cd when LED
  modules produce the beam with an electronic light source control gear. The file carries the 18,500 cd point with
  `when: ['led-module-ecg']` and `replaces: '50L'`. Class D's 18,480 cd has no note.
- **Zone I, Class B**, "< 2I**", is a `relative` maximum of twice the value at 50R (note **: "Actual measured value at
  points 50R / 50L respectively"; for left-hand traffic the mirrored 50R, which the engine handles). The table's "<" is
  strict; Cutline treats it as "at most".
- **Class D open zones.** "Segment III and under" (9.37 L to 8.50 R at 4.29 D and below), "Imax R" ("Vertical above
  1.72D, right of V-V line") and "Imax L" ("Left of V-V line") bound only one side each. The file closes them at
  Cutline's wide grid, 60° horizontally and 30° vertically, as `r149.js` does for "Segment 10 and below". Imax R and
  Imax L share the V-V edge, and the engine counts a reading on the edge in both.
- **Symmetric classes.** "Any point in Zone 1" and "Any point on line …" become zones and lines. Table 35 rows that
  name two directions ("1.50°L and 1.50°R", "15°L and 15°R", and so on) become two points each. Points 8 to 10 and 11
  to 13 have both a sum minimum and individual maxima. Zone 1 of Classes CS, DS and ES is the ten-vertex polygon
  printed in the table; Zone 2 (">4U to <15U, 8°L to 8°R") has open edges in the text and is closed in the file.
- **Primary and secondary driving beams** (Classes BS, CS, DS, ES). Table 7 is Table 6 without test points 4
  (H-9°R and 9°L) and 5 (H-12°R and 12°L). The file defaults to the primary beam, the stricter case, and a declared
  `secondary-driving-beam` condition replaces those four points by notes. Class BS has no requirement at points 4, 5
  or 6 in either table.
- **Run-up values** (Supplement 2) and the LED flux rules (§4.5.3.2.3–4.5.3.2.5) are `note` requirements with a `when`,
  because they depend on time after switch-on or on the light source, not on the steady distribution.

## Choices and discrepancies in the official text

1. **Imax R, table against figure.** Table 8 says Imax R lies "Vertical above 1.72D, right of V-V line". Figure A4-VI
   (p. 78) shades the Imax R zone only from about 1.7° *up* to the top of the figure. Read the figure's way, a 43,800 cd
   cap would sit above the cut-off, where Zone III already limits light to 625 cd, so it would do nothing useful. Read
   the table's way, it caps the hot spot below the cut-off, which is what an "Imax" limit is for. The file follows the
   table.
2. **Zone IV extent.** Table 8 gives 5.15 L to 5.15 R; Figure A4-V (p. 77) draws the zone ending near 4°R. The file
   follows the table.
3. **Figure A4-IX "B50".** The Class BS figure (p. 81) draws a point "B50" at 0.57°U on V-V that Table 34 does not
   list. It carries no requirement.
4. **Annex 2 §1.2.1.3** gives a conformity-of-production allowance for "zone I" of Classes BS to ES; the symmetric
   tables call it Zone 1. Recorded in the notes; Cutline does not apply CoP allowances.
5. **AIS-199.** Its Table 8 note ** reads "Actual measured value at points 50R respectively" in a left-hand traffic
   table, where the mirrored UN note would name 50L (see national-notes.md). The UN text here names both.

## Differences from the 01 series

| Topic | 00 series (this file) | 01 series (`r149.js`) |
|---|---|---|
| Passing-beam classes | A, B, D (gas discharge) for cars; AS–ES symmetric for L and T | C and V; AS–DS symmetric |
| Car low beam, main road points | Class B: 50R ≥ 10,100, 75R ≥ 10,100, 50V ≥ 5,100, 25L2/25R1 (9°, 1.72D) ≥ 1,700, Zone IV ≥ 2,500 | Class C: 50R ≥ 10,100, 75R ≥ 12,100, 50V ≥ 5,100, Segment 25 (9L–9R, 1.72D) ≥ 1,700, plus Segments 50, 40, 15, 10 |
| 50L | Maximum only: 13,200 cd (A, B; 18,500 with LED modules and control gear), 18,480 cd (D) | Class C: 5,000 to 37,000 cd |
| Glare above the cut-off | B50L ≤ 350, BR ≤ 1,750, 75L ≤ 10,600 (A, B), Zone III ≤ 625 | B50L ≤ 350, BR ≤ 1,750, Segment BLL ≤ 625, Zone III ≤ 625 |
| Foreground | Zone I (9L–9R, 1.72D–4D) ≤ 17,600 (A) or < 2 × 50R (B); Class D Segment III and under ≤ 12,500 | Segment 10 and below ≤ 0.8 × 50R (C) or 0.8 × 25V (V) |
| Left verge | B7 (0, 8L) ≥ 65, B8 (0, 4L) ≥ 125 | P (0, 7L) ≥ 63 |
| Hot-spot cap | Class D only: Imax R ≤ 43,800, Imax L ≤ 31,300 | Class V only: Imax ≤ 44,100 |
| Driving-beam points | IM, H-5L/R, H-2.5L/R (Table 5) | IM, H-V, 2U-V, H-3, H-6, H-9, H-12 L/R (Table 5) |
| Driving-beam IM minimum | 27,000 (A), 40,500 (B), 43,800 (D) | 27,000 (A), 40,000 (B) |
| Reference mark values | 5 to 50 | 2.5 to 50 |
| Coordinate tolerance | 0.25° only in Tables 6, 7, 33–35 | 0.25° for driving beams (§5.1.3) |
| Realignment (passing beam) | 0.5° left / 0.75° right of line A, 0.25° vertical | 0.75° either way, 0.25° vertical |
| Minimum LED flux (A, B, D) | ≥ 1,000 lm objective flux (§4.5.3.2.3) | 1,000 lm, or the Zone I/II flux alternative (Tables 3a/3b) |
| Instrumental aim (asymmetric) | Same method | Same method; side named in the text; later step and linearity wording |

## AFS, front fog lamps and cornering lamps

Not transcribed. The 00 series sets AFS photometry in §5.3 (Tables 9 to 32, pp. 31–50), Class F3 front fog lamps in
§5.5 (Table 36, p. 53; CoP Table 37, p. 55) and cornering lamps in §5.6 (pp. 56–58). Supplements 3, 7, 10 and the
pending Supplement 11 change AFS values; none changes the fog or cornering values.

## Open questions

1. Whether laboratories apply any coordinate tolerance to 00-series Class A, B and D points. The text grants none.
2. The new numbers of §4.11.2.1 and §4.11.3.1 after Supplement 10.
3. Whether the consolidated UNECE text of the 00 series (with Supplements 1 to 10) prints anything that differs from
   the supplements as read here.
4. The Imax R zone: the table and Figure A4-VI disagree (see above). A technical service could settle which one
   laboratories use.
