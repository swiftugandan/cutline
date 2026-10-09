# UN Regulation No. 123: adaptive front-lighting systems (AFS), photometric requirements

Prepared 9 October 2026. The data is in `src/core/regulation/data/r123.js`. Every value there and below was read from
an official UN text fetched on that date; nothing was filled from memory. Page numbers are the ones each document
prints.

## Read this first: R123 is closed to new approvals

R123 is a frozen regulation. UN Regulation No. 149 took over its content, and R123 now serves only replacement parts
and extensions of old approvals.

- **R149 absorbed R123.** The 00 series of R149 "combines the provisions of the individual UN Regulations Nos. 19,
  98, 112, 113, 119 and 123 into a single regulation … through an editorial exercise without changing any of the
  detailed technical requirements already in force up to the date of entry into force of this Regulation"
  (ECE/TRANS/WP.29/2018/158/Rev.1, Introduction, p. 3). Its scope includes "Adaptive front-lighting systems (AFS) for
  vehicles of categories M and N" (§1, p. 3). R149 entered into force on **15 November 2019**
  (E/ECE/TRANS/505/Rev.3/Add.148, cover page).
- **The R123 02 series stops new approvals.** Its only change is §13 (ECE/TRANS/WP.29/2018/119/Rev.1, p. 2; in force
  15 October 2019 per E/ECE/324/Rev.2/Add.122/Rev.2/Amend.6, p. 1):
  - §13.1: "As from 24 months after the official date of entry into force of UN Regulation No. [RID], Contracting
    Parties applying this Regulation shall cease to grant approvals to this Regulation." Footnote 2 identifies RID
    as ECE/TRANS/WP.29/2018/158/Rev.1, which is R149. **Derived:** 15 November 2019 + 24 months = 15 November 2021.
    The text gives the rule, not the date; the date is this note's arithmetic.
  - §13.2: Contracting Parties shall not refuse extensions of approvals to this or any earlier series.
  - §13.3: they shall continue to grant approvals under this or any earlier series for devices intended as
    replacements for vehicles in use.
  - §13.4: they shall continue to allow fitting or use of such replacement devices.
  - The series does not require a change of approval number (footnote 1, citing TRANS/WP.29/815 para. 82).
- **R123 points to R149.** Supplement 1 to the 02 series adds §5.16: "Instead of requirements of this Regulation,
  headlamps may conform with requirements of the latest version of the UN Regulation No. 149 as it relates to the
  adaptive forward-illumination systems" (ECE/TRANS/WP.29/2019/92, p. 2; in force 29 May 2020 per Amend.7, p. 1).
- **What moved into R149.** All of R123's functions. The R149 00 series lists the AFS basic, motorway, town and
  adverse-weather passing beams and the AFS driving beam with the symbols "XC", "XCE", "XCV", "XCW" and "XR" (Table 1,
  pp. 7–8), speaks of "AFS of classes C, E, V, W, R" (§4.5.1.8, p. 18) and carries the AFS technical requirements in
  §5.3 (p. 31) of ECE/TRANS/WP.29/2018/158/Rev.1. The R149 01 series names them **Class AFS-C, AFS-E, AFS-V, AFS-W
  and AFS-R** (ECE/TRANS/WP.29/2022/93, symbol table, pp. 8–9) and keeps the requirements in §5.3 (p. 25). Its transitional provisions (§7.2.1–7.2.7, pp. 47–48) apply to AFS as to
  every R149 device: from 1 September 2026 Contracting Parties need not accept 00-series approvals first issued after
  that date (§7.2.2), and keep accepting those first issued before it (§7.2.3).
- **Pending, R149 only.** Supplement 11 to the R149 00 series (ECE/TRANS/WP.29/2026/214, for the WP.29 vote of
  November 2026) changes R149's AFS tables: for example 50L in Tables 18, 21 and 24 and the driving-beam HV rows of
  Tables 30–31. It does not amend R123, and it was not transcribed.

**Consequence for Cutline.** A new AFS design is approved under R149, not R123. This data file is useful to check a
design against the original AFS values, to reason about replacement parts, or to compare with R149's AFS tables,
which began as an editorial copy of these.

## Sources and version

ODS served every document below. The consolidated UNECE PDFs (`R123r2e.pdf`, `R123r2am9e.pdf` on unece.org) returned
an HTML block page to `curl`, so Revision 2 plus the amendment slips stand in for a consolidated Revision 2
Amendment 9.

| Key | Document | What it is | Use |
|---|---|---|---|
| **Rev.2** | E/ECE/324/Rev.2/Add.122/Rev.2 (21 Oct 2013), [ODS](https://documents.un.org/api/symbol/access?s=E/ECE/324/Rev.2/Add.122/Rev.2&l=en&t=pdf) | Consolidated text, 01 series up to Supplement 4 (in force 15 July 2013) | Base text for every value |
| Amend.1 | …/Rev.2/Amend.1 | 01 Suppl. 5, in force 10 June 2014 | Annex 7 heat test only |
| **Amend.2** | …/Rev.2/Amend.2; authentic text ECE/TRANS/WP.29/2014/25 | 01 Suppl. 6, in force 9 October 2014 | Deletes §6.2.5.2 and Table 1 footnote 6, renumbers; driving beam each side ≥ 16,200 cd at HV; Annex 9 §1.8.1 list |
| Amend.3 | …/Rev.2/Amend.3; ECE/TRANS/WP.29/2015/32 | 01 Suppl. 7, in force 8 October 2015 | Dirt mixture, UV table, LED flux; no photometric values |
| **Amend.4** | …/Rev.2/Amend.4; authentic text ECE/TRANS/WP.29/2017/41 | 01 Suppl. 8, in force 10 October 2017 | New Annex 3 Table 2 (segment Imax; Class V cut-off lower bound), "Emax" renamed "Imax", new Figure 1, §5.7.3, §6.2.5.4, §6.4.3.1, CoP points |
| Amend.5 | …/Rev.2/Amend.5; ECE/TRANS/WP.29/2017/89 | 01 Suppl. 9, in force 10 February 2018 | §5.3.1 wording only |
| Amend.6 | …/Rev.2/Amend.6; ECE/TRANS/WP.29/2018/119/Rev.1 | **02 series**, in force 15 October 2019 | §13 transitional provisions |
| Amend.7 | …/Rev.2/Amend.7; ECE/TRANS/WP.29/2019/92 | 02 Suppl. 1, in force 29 May 2020 | New §5.16 (R149 alternative) |
| Amend.8 | …/Rev.2/Amend.8; ECE/TRANS/WP.29/2021/43 | 01 Suppl. 10, in force 30 September 2021 | Annex 2 example, Annex 4 test points (25LL, 50V, B50L) |
| Amend.9 | …/Rev.2/Amend.9; ECE/TRANS/WP.29/2021/44 | 02 Suppl. 2, in force 30 September 2021 | Same text as Amend.8, for the 02 series |
| R149-00 | ECE/TRANS/WP.29/2018/158/Rev.1 and E/ECE/TRANS/505/Rev.3/Add.148 | R149 original text and its publication | Supersession, entry-into-force date |
| R149-01 | ECE/TRANS/WP.29/2022/93 | R149 01 series | AFS classes, transitional provisions, re-aim comparison |

ODS returned no document for …/Rev.2/Amend.10 or …/Amend.11, and GlobalAutoRegs lists Revision 2 Amendment 9 as
the last R123 text and no R123 working document after 2021 other than a 2025 informal presentation (LUPC-06-02, lamp
test mode). Amend.9 is therefore the latest text, and R123's photometric content has not changed since Supplement 8
(10 October 2017).

Every slip after Amend.2 is labelled "meant purely as documentation tool"; for Supplements 6 and 8 the authentic WP.29
documents were read as well and match the slips. Annex 3 Tables 1–7, the driving-beam table, Annex 8 Figures 1 and
2, Annex 9 §1.2 and Supplement 8's Table 2 and Figure 1 were checked against rendered page images. Table 1 was
transcribed from the image, then the data file was printed back as a table and compared with the image line by line.

## Conventions

| Item | Rule | Cite |
|---|---|---|
| Angles | Degrees up (U) or down (D) from H-H, right (R) or left (L) of V-V. In the data file R and U are positive | Rev.2 Annex 3, p. 38 |
| "Above it" / "below it" | "Vertically above, only" / "vertically below, only" | Rev.2 Annex 3, p. 38 |
| Coordinate system | Sphere of a goniophotometer as defined in R48 (vertical polar axis in the diagram), E(25 m) = I(h,v)·cos γ / r² | Rev.2 Annex 9 §1.5 and Diagram 1, p. 74 |
| Photoreceptor | Within a square of "65 m side", at least 25 m from the centre of reference of each lighting unit; nominal distance 25 m. The rendered page does print "65 m"; it is a misprint for 65 mm, the value R149 Annex 4 §1.1.1 gives | Rev.2 Annex 9 §1.2 and §1.4, p. 74 |
| Left-hand traffic | Paragraph 6 and the annexes apply "with the inversion of right to left and vice versa", and the names swap R and L | Rev.2 §5.1, p. 14 |
| Both-traffic systems | Two distinct settings only; each must meet the requirements for its direction | Rev.2 §5.4, p. 15; §6.2.7, p. 19 |
| **Half sum** | Every requirement at a measuring point applies to **half the sum** of the values from all lighting units of the system for that function or mode (both sides of the vehicle) | Rev.2 Annex 9 §1.8, p. 75 |
| One-side exceptions | Not halved: §6.2.5.2, §6.2.8.1, §6.3.2.1.1, §6.3.2.1.2, §6.3.4.1, §6.4.6 and note 4 of Table 1 | Annex 9 §1.8.1 as amended by Suppl. 6 (WP.29/2014/25, p. 2) |
| Units measured | Individually; two or more units of one installation unit together only if their illuminating surfaces fit in 300 mm × 150 mm and share a centre of reference | Rev.2 Annex 9 §1.9, p. 75 |
| Coordinate tolerance | **None.** R123 has no counterpart of R149 01 §5.1.3 (0.25° at each test point). A search of the whole Rev.2 text for "tolerance" finds only aiming tolerances and CoP tolerances | Rev.2, whole text |
| Light sources | Étalon filament lamps at reference flux (13.2 V), correction F = Φobj/Φ(V); gas discharge 13.2 ± 0.1 V, aged 15 cycles; non-replaceable and LED at 6.3 / 13.2 / 28.0 V or as the applicant specifies | Rev.2 Annex 9 §2.1–2.5, pp. 75–76 |

**Consequence of the half-sum rule.** A single IES file for one side checks R123 correctly only when the other side is
its mirror image. AFS systems often split a beam between units and sides, so a faithful check needs the summed
distribution of all units, divided by two.

## Aiming and how it differs from R149

The system is set to its **neutral state**, a Class C mode at maximum activation with no AFS signal (§1.9, p. 6;
§6.2, p. 18), and aimed by the Class C cut-off (Annex 8, pp. 68–73):

- **Cut-off shape.** A straight horizontal part to the left and a raised elbow-shoulder part to the right with a sharp
  edge (Annex 8 §1.1, p. 68).
- **Vertical aim.** Scan upwards at 2.5° from V-V (on the left for right-hand traffic, Annex 8 Figure 1, p. 71) and
  put the inflection point, d²(log E)/dv² = 0, on **line B, one per cent (0.57°) below H-H** (Annex 8 §2.3, p. 68;
  §3.1, p. 71).
- **Horizontal aim.** The applicant chooses (Annex 8 §3.2, pp. 71–72):
  - (a) the **0.2°D line**: scan 0.2°D from 5°L to 5°R, maximum G ≥ 0.08, put the inflection point on **line A**;
  - (b) the **three lines**: vertical scans 2°D to 2°U at 1°R, 2°R and 3°R, each G ≥ 0.08; the straight line
    through the three inflection points meets line B, and that point goes on V-V.
  Line A is drawn **0.5° right of V-V** in Annex 8 Figures 1 and 2 (pp. 68 and 72); the prose does not state it.
- **Visual aim.** Allowed: shoulder not left of line A above 0.2°D, crossing line A on or below 0.2°D, and the kink
  "basically" within ±0.5° of V-V (Annex 8 §2.4, p. 69). The instrumental method applies when the visual aim cannot
  be repeated within the §2.5 limits (§2.6).
- **Cut-off quality.** Vertical scans in 0.05° steps, detector about 10 mm at 10 m or about 30 mm at 25 m (maximum
  sharpness only at 25 m); G = log Eβ − log E(β + 0.1°) at 2.5°, **0.13 ≤ G ≤ 0.40**; inflection points at 1.5°, 2.5°
  and 3.5° within **0.2°** vertically; only one cut-off visible (Annex 8 §2.7–2.7.3, pp. 69–70).
- **Other modes are not re-aimed.** "For each further mode of passing-beam, the shape and position of the cut-off,
  if any, shall comply automatically with the respective requirements of Table 2 of Annex 3" (Annex 8 §2.11, p. 70).
- **Re-aim allowance.** If the aimed system fails, the beam axis may move up to **0.5° left or 0.75° right of line
  A** and **0.25° up or down from line B** (Annex 8 §2.5, p. 69). Driving beam: **0.5° up or down and/or 1° left or
  right** (§6.3.5, p. 20).

**Cut-off position of each class** (Table 2 item 2.2(b) as amended by Suppl. 8, WP.29/2017/41, p. 4):

| Class | Flat horizontal part of the cut-off |
|---|---|
| C | at 0.57°D |
| V | not above 0.57°D, not below 1.3°D (Rev.2 printed "not below" with no value; Suppl. 8 adds 1.3D) |
| E | not above 0.23°D, not below 0.57°D; data sets E1, E2, E3 replace "not above" with 0.34°D, 0.45°D, 0.57°D (Table 6, p. 41) |
| W | not above 0.23°D, not below 0.57°D |

**Differences from R149 01 (as Cutline applies it in `docs/REGULATION.md`).**

| Point | R123 | R149 01 series |
|---|---|---|
| Vertical aim | Line B, 0.57°D, scan at 2.5° | Same (R149 Annex 5 §3.2.1.1, Annex 6) |
| Horizontal aim | 0.2°D line to line A at 0.5°R, or three lines | Same two methods (R149 Annex 6 §2.3.2.1) |
| Sharpness and linearity | 0.13–0.40; 0.2° | Same values |
| Re-aim allowance, passing beam | 0.5°L or 0.75°R of line A; ±0.25° from line B | 0.75° left or right; ±0.25° (R149 01 Annex 5 §4.1, p. 72) |
| Coordinate tolerance | None | 0.25° in §5.1.3 (driving-beam section) |
| What a value means | Half the sum of both sides of the system | One headlamp; half the sum of a matched pair only on request (R149 Annex 4 §1.5) |
| Classes | C, V, E (E1–E3), W, driving beam, adaptive driving beam | C, V, driving B and A; AFS-C/E/V/W/R in §5.3 |
| Further modes | Not re-aimed; Table 2 positions apply automatically | – |

## Aiming procedure for an evaluator

This section is enough to implement R123's aim without the regulation open. Every function in the data file carries
an `aimRule`:

| `aimRule` | Functions | Meaning |
|---|---|---|
| `r123-passing` | `passing-C` | Aim the Class C passing beam itself, steps 1–6 below |
| `keep-passing-aim` | `passing-V`, `passing-E`, `passing-E1`–`E3`, `passing-W`, the four bending functions, `traffic-change` | Apply the shift found for Class C in the neutral state; do not re-aim (step 7) |
| `driving-max` | `driving` | Centre the area of maximum intensity on HV (step 8) |
| `keep-driving-aim` | the six `driving-adaptive-*` functions | Apply the shift found for the driving beam at maximum activation (step 9) |

Coordinates are for right-hand traffic; for left-hand traffic mirror every h (§5.1, p. 14). G is always
G = log E(β) − log E(β + 0.1°), with β the position along the scan in degrees (Annex 8 §2.7.2, p. 70; §3.2, pp.
71–72). R123 does not say what E is; since E = I·cos γ / r² at a fixed 25 m (Annex 9 §1.5, p. 74), log differences of
intensity and of illuminance agree to within the cos γ term across a 0.1° step (derived).

1. **State.** Use the Class C passing beam in the neutral state: maximum activation, no AFS control signal (§1.9,
   p. 6; §6.2, p. 18; Annex 8 §2.1, p. 68; Annex 9 §1.10, p. 75). Only the lighting units the applicant says are to be
   aimed are aimed; each side must produce a cut-off from at least one unit (§6.2.1, p. 18). Units without a cut-off
   are mounted as the applicant specifies (Annex 9 §1.11, p. 75).
2. **Cut-off shape.** A straight horizontal part to the left and a raised elbow-shoulder to the right with a sharp
   edge (Annex 8 §1.1, p. 68).
3. **Vertical aim.** Scan vertically at h = −2.5° (2.5° left of V-V; the side is shown in Annex 8 Figure 2, p. 72,
   the prose says only "at 2.5° from V-V"), moving upward from below line B, in steps of 0.05° (Annex 8 §2.7, p. 69;
   §3.1, p. 71). Find the inflection point, where d²(log E)/dβ² = 0, and shift the beam vertically so that it lies on
   **line B, v = −0.57°** ("one per cent … below the H-H line", Annex 8 §2.3, p. 68; Figure 1, p. 71). Table 2 item
   2.2(b) states the same position for Class C: "at V = 0.57 D" (Suppl. 8, p. 4).
4. **Cut-off quality** (Annex 8 §2.7–2.7.3, pp. 69–70), on the aimed beam:
   - G on the h = −2.5° scan: at least 0.13 and at most 0.40.
   - Inflection points on vertical scans at h = −1.5°, −2.5° and −3.5° lie within 0.2° of each other vertically.
   - Detector: about 10 mm at 10 m or about 30 mm at 25 m for minimum sharpness; maximum sharpness only at 25 m with
     about 30 mm. Not more than one cut-off visible.
5. **Horizontal aim**, the applicant's choice (Annex 8 §3.2, pp. 71–72):
   - (a) **0.2°D line:** scan v = −0.2° from h = −5° to h = +5°. The maximum G along the scan (β horizontal) must
     be at least 0.08. Shift the beam horizontally so the inflection point lies on **line A, h = +0.5°** (Annex 8
     Figures 1 and 2, pp. 68 and 72; the prose never gives the position).
   - (b) **Three lines:** scan vertically from v = −2° to v = +2° at h = +1°, +2° and +3°; each maximum G at least
     0.08. Fit a straight line through the three inflection points, intersect it with line B (v = −0.57° after step
     3), and shift the beam horizontally so that intersection lies on V-V (h = 0).
   Read literally, G is negative across a rise in intensity along the scan; R149 prints the same formula, so the
   sign convention Cutline already uses for R149 applies unchanged.
6. **Re-aim allowance.** If the aimed beam fails Annex 3, its alignment may change provided the beam axis moves no
   more than **0.5° left or 0.75° right of line A** and **0.25° up or down from line B** (Annex 8 §2.5, p. 69). If the
   vertical aim cannot be repeated within these tolerances visually, the instrumental method above is used (§2.6).
7. **Other passing-beam modes** (`keep-passing-aim`). Do not re-aim: apply the shift found in steps 3 and 5 to the
   mode's distribution (Annex 8 §2.11, p. 70; §6.2.2, p. 18; Annex 9 §1.11, p. 75). Then check where the flat part of
   its cut-off lies against Table 2 item 2.2(b) (table below). The text does not say how that position is measured;
   the natural reading is the inflection point of the same h = −2.5° scan. Exceptions:
   - Category 1 bending modes: re-aim horizontally "in the corresponding opposite direction" before checking Part B
     (Annex 9 §3.1.1.2(b), p. 76), but check §6.2.5.2 (the 2,500 cd turn-radius zones) and §6.2.5.4.1 without that
     re-aim (Annex 9 §3.1.1.1 as amended by Suppl. 6). Category 2 bending modes: no horizontal re-aim.
   - Traffic-change function: adjustment unchanged from the original traffic direction; Annex 8 does not apply
     (§5.8.2, p. 16; §6.2.1.2, p. 18).
8. **Driving beam** (`driving-max`). Neutral state; adjust the units, following the manufacturer's instructions, so
   that the area of maximum illumination is centred on HV (§6.3.1, p. 19). Units that cannot be adjusted on their own,
   or that were aimed for the passing-beam measurements, are tested in their unchanged position (§6.3.1.1, p. 19),
   that is with the passing-beam shift. If the beam fails, it may be re-aimed within 0.5° up or down and/or 1° left or
   right (§6.3.5, p. 20), except for those units.
9. **Adaptive driving beam** (`keep-driving-aim`). Keep the driving-beam aim; the signal generator sets the state
   (§6.3.7, p. 20).

**Differences from R149 01 Annex 6** (ECE/TRANS/WP.29/2022/93, pp. 74–77) and Annex 5:

| Point | R123 | R149 01 |
|---|---|---|
| Side of the 2.5° vertical scan | Shown in Annex 8 Figure 2 (p. 72) only | Stated: left of V-V for right-hand traffic (Annex 6 §2.3.1(a), p. 76) |
| Visual pre-aim before the instrumental method | Not required in words; instrumental used when visual aim cannot be repeated (Annex 8 §2.6) | Required (Annex 6 §2.1, p. 74) |
| Meaning of E | Not defined | "the illumination on the aiming screen" (Annex 6 §2.2.2, p. 75) |
| Scan step and linearity distance | 0.05° steps; no distance set for linearity (Annex 8 §2.7) | Supplement 4 requires linearity at 25 m and Supplement 7 allows 0.05° or smaller, per `docs/REGULATION.md` (not re-read here) |
| Re-aim allowance, passing beam | 0.5°L or 0.75°R of line A; ±0.25° from line B (Annex 8 §2.5) | 0.75° left or right; ±0.25° (Annex 5 §4.1, p. 72) |
| Re-aim allowance, driving beam | 0.5° vertical, 1° horizontal (§6.3.5) | 0.5° and 1° only for a driving beam adjustable independently of the passing beam (Annex 5 §4.1(b)) |
| Modes other than the aimed one | Not re-aimed; Table 2 cut-off positions must follow (Annex 8 §2.11) | No modes |
| Bending | Category 1 re-aimed horizontally for Part B (Annex 9 §3.1.1.2) | R149 headlamps with bend lighting may be re-aimed only within 0.2° vertically (Annex 5 §3.2.2, p. 72) |
| Values identical | Line B 0.57°D; line A 0.5°R; G limits 0.13–0.40 and 0.08; linearity 0.2° at 1.5°, 2.5°, 3.5°; both horizontal methods; detector sizes | Same |

## Passing beam: Table 1 Part A (Rev.2 Annex 3, p. 39)

Required values in cd; "min/max". Coordinates for right-hand traffic.

| No. | Element | Position | C | V | E | W |
|---|---|---|---|---|---|---|
| 1 | B50L | 3.43L, 0.57U | 50⁴ / 350 | 50 / 350 | 50 / 625⁸ | 50 / 625 |
| 2 | HV | V, H | 50⁴ / 625 | 50 / 625 | 50 / – | 50 / – |
| 3 | BR | 2.5R, 1U | 50⁴ / 1,750 | 50 / 880 | 50 / 1,750 | 50 / 2,650 |
| 4 | Segment BRR | 8R to 20R, 0.57U | 50⁴ / 3,550 | – / 880 | – / 3,550 | – / 5,300 |
| 5 | Segment BLL | 8L to 20L, 0.57U | 50⁴ / 625 | – / 880 | – / 880 | – / 880 |
| 6 | P | 7L, H | 63 / – | – | – | 63 / – |
| 7 | Zone III (Table 3) | III a for C, V; III b for E, W | – / 625 | – / 625 | – / 880 | – / 880 |
| 8a | S50 + S50LL + S50RR⁵ | 4U | 190⁷ | – | 190⁷ | 190⁷ |
| 9a | S100 + S100LL + S100RR⁵ | 2U | 375⁷ | – | 375⁷ | 375⁷ |
| 10 | 50R | 1.72R, 0.86D | – | 5,100 | – | – |
| 11 | 75R | 1.15R, 0.57D | 10,100 | – | 15,200 | 20,300 |
| 12 | 50V | V, 0.86D | 5,100 | 5,100 | 10,100 | 10,100 |
| 13 | 50L | 3.43L, 0.86D | 3,550 / 13,200⁹ | 3,550 / 13,200⁹ | 6,800 / – | 6,800 / 26,400⁹ |
| 14 | 25LL | 16L, 1.72D | 1,180 | 845 | 1,180 | 3,400 |
| 15 | 25RR | 11R, 1.72D | 1,180 | 845 | 1,180 | 3,400 |
| 16 | Segment 20 and below it | 3.5L to V, 2D | – | – | – | – / 17,600² |
| 17 | Segment 10 and below it | 4.5L to 2.0R, 4D | – / 12,300¹ | – / 12,300¹ | – / 12,300¹ | – / 7,100² |
| 18 | Imax³ (printed "Emax" in Rev.2; renamed by Suppl. 8, p. 3) | – | 16,900 / 44,100 | 8,400 / 44,100 | 16,900 / 79,300⁸ | 29,530 / 70,500² |

Footnotes as Rev.2 prints them (p. 39). Supplement 6 deleted footnote 6 and renumbered the later ones, so in the
current text 7, 8 and 9 are 6, 7 and 8; Supplement 8's Table 2 still prints "8" for the Table 6 reference. The data
file cites the Rev.2 numbers.

1. "Max 15,900 cd, if the system is designed to provide also a Class W passing-beam."
2. Table 4 applies in addition.
3. Position requirements of Table 2 ("Segment Imax") apply in addition (wording of Suppl. 8, p. 3).
4. "The contribution of each side of the system (for segment BLL and BRR: of at least one point) … shall not be less
   than 50 cd." A one-side rule (Annex 9 §1.8.1).
5. Point positions in Table 5.
6. Deleted by Suppl. 6 (it pointed to the Imax rectangle of former §6.2.5.2).
7. One pair of position lamps may be switched on, as the applicant indicates.
8. Table 6 applies in addition.
9. The maximum "may be multiplied by 1.4, if it is guaranteed according to the manufacturer's description that this
   value will not be exceeded in use, either by means of the system or, if the system's use is confined to vehicles,
   providing a corresponding stabilization/limitation of the system's supply, as indicated in the communication form."
   The data file carries the factor (1.4) and the requirement it scales (50L), not a computed value.

**Table 2 item 2.1, segment Imax** (Suppl. 8, p. 4): "The maximum luminous intensity in 'Segment Imax' as indicated in
this table shall be within the limits as prescribed in Table 1, Line No. 18." Extent: C and W 0.5L to 3R, 0.3D to
1.72D; E 0.5L to 3R, 0.1D to 1.72D; V 0.3D to 1.72D with the horizontal cell blank. Before Supplement 8 the item said
"Emax shall not be positioned outside of the rectangle" (Rev.2, p. 40).

**Table 3, Zone III corners** (p. 40), points 1–8:

| Zone | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|
| III a (C, V) | 8L 1U | 8L 4U | 8R 4U | 8R 2U | 6R 1.5U | 1.5R 1.5U | V-V H-H | 4L H-H |
| III b (W, E) | 8L 1U | 8L 4U | 8R 4U | 8R 2U | 6R 1.5U | 1.5R 1.5U | 0.5L 0.34U | 4L 0.34U |

**Table 4, Class W** (p. 41). 4.1: no more than **175 cd** on segment E (10U from 20L to 20R) and on the vertical
segments F1, F2, F3 at 10L, V and 10R from 10U to 60U. 4.2: if the applicant specifies (§2.2.2(e)) a Class W beam
designed to give no more than **8,800 cd** on segment 20 and below it and no more than **3,550 cd** on segment 10 and
below it, the design value of its Imax shall not exceed **88,100 cd**; this replaces the maxima of lines 16, 17 and 18
in Part A or B.

**Table 5, overhead sign points** (p. 41): S50LL 4U/8L, S50 4U/V-V, S50RR 4U/8R, S100LL 2U/4L, S100 2U/V-V,
S100RR 2U/4R.

**Table 6, Class E data sets** (p. 41). Lines 1 and 18 of Table 1 (Part A or B) and Table 2 item 2.2 are replaced:

| Data set | B50L max (cd) | Imax max (cd) | Cut-off flat part not above |
|---|---|---|---|
| E1 | 530 | 70,500 | 0.34°D |
| E2 | 440 | 61,700 | 0.45°D |
| E3 | 350 | 52,900 | 0.57°D |

## Bending modes: Table 1 Part B (p. 39) and §6.2.5

Part A applies with lines 1, 2, 7, 13 and 18 replaced:

| No. | Element | C | V | E | W |
|---|---|---|---|---|---|
| 1 | B50L | 50⁴ / 530 | – / 530 | – / – | – / 790 |
| 2 | HV⁴ | 50⁴ / 880 | – / 880 | – / – | – / – |
| 7 | Zone III | – / 880 | – / 880 | – / 880 | – / 880 |
| 13 | 50L | 1,700 / – | 1,700 / – | 3,400 / – | 3,400 / – |
| 18 | Imax⁶ | 10,100 / 44,100 | 5,100 / 44,100 | 10,100 / 79,300⁸ | 20,300 / 70,500² |

The rules that go with them (Rev.2 pp. 18–19 as renumbered by Suppl. 6 and amended by Suppl. 8):

- §6.2.5.1: Part B of Table 1 and item 2.2 of Table 2 (cut-off), measured per Annex 9 for the bending category.
- §6.2.5.2 (former 6.2.5.3): at the smallest turn radius to the left (right), the right or left side, all
  contributors added, gives at least 2,500 cd at one or more points between H-H and 2°D, 10° to 45° left (right).
- §6.2.5.3 (former 6.2.5.4): category 1 systems only on vehicles whose kink position meets R48 §6.22.7.4.5(i).
- §6.2.5.4 (former 6.2.5.5, reworded by Suppl. 8, p. 3): category 1 failure leads automatically to §6.2.4
  photometry, or to no more than 1,300 cd in zone III b and at least 3,400 cd at a point of segment Imax.
- §6.2.5.4.1 (former 6.2.5.5.1): not needed if, relative to the system reference axis, 880 cd is never exceeded at
  0.3°U up to 5°L and at 0.57°U beyond 5°L.
- Annex 9 §3.1 (pp. 76–77): test in the neutral state and at the smallest turn radius both ways with the signal
  generator. Category 2: no horizontal re-aim. Category 1 (and a bending driving beam): re-aim the installation unit
  horizontally the opposite way. §6.2.5.2 and §6.2.5.4.1 are checked without re-aim (Annex 9 §3.1.1.1, as amended by
  Suppl. 6). At other radii the light must look substantially uniform without undue glare, or Table 1 is checked.

## Driving beam (§6.3, pp. 19–21)

| Test point | Position | Min (cd) |
|---|---|---|
| Im | – | 40,500 |
| H-5L | 0.0, 5.0L | 5,100 |
| H-2.5L | 0.0, 2.5L | 20,300 |
| H-2.5R | 0.0, 2.5R | 20,300 |
| H-5R | 0.0, 5.0R | 5,100 |

HV lies inside the 80 per cent isolux of Imax (§6.3.2.1); IM never exceeds 215,000 cd (§6.3.2.1.1, one-side rule);
reference mark I′M = IM / 4,300, rounded to 5, 10, 12.5, 17.5, 20, 25, 27.5, 30, 37.5, 40, 45 or 50 (§6.3.2.1.2);
each side gives at least 16,200 cd at HV (§6.3.4.1 as amended by Suppl. 6, WP.29/2014/25 p. 2; before that "at least
half of the minimum … of §6.3.2"). Aim: the area of maximum illumination centred on HV (§6.3.1).

**Adaptive driving beam, Table 7** (pp. 42–43, §6.3.7). Each Part A line is one adaptation state set by the
applicant's signal generator and is measured with the Part B points; Part B is dropped if a compliant passing beam
stays on throughout. Values apply to half the sum of all units for the function.

| Line (right-hand traffic) | Horizontal | Vertical | Max (cd) |
|---|---|---|---|
| 1 Left: oncoming vehicle at 50 m | 4.8L to 2L | 0.57U | 625 |
| 2 Left: oncoming at 100 m | 2.4L to 1L | 0.3U | 1,750 |
| 3 Left: oncoming at 200 m | 1.2L to 0.5L | 0.15U | 5,450 |
| 4: preceding at 50 m | 1.7L to 1.0R / >1.0R to 1.7R | 0.3U | 1,850 / 2,500 |
| 5: preceding at 100 m | 0.9L to 0.5R / >0.5R to 0.9R | 0.15U | 5,300 / 7,000 |
| 6: preceding at 200 m (both traffic directions) | 0.45L to 0.45R | 0.1U | 16,000 |

Part B minima: 50R (1.72R, 0.86D) 5,100; 50V (V, 0.86D) 5,100; 50L (3.43L, 0.86D) 2,550; 25LL (16L, 1.72D) 1,180;
25RR (11R, 1.72D) 1,180. Lines 1–5 Right, for left-hand traffic, are the mirror images.

## Other rules kept as notes

- Each side gives at least 2,500 cd at 50V in every passing-beam mode, Class V exempt (§6.2.8.1, p. 19).
- Traffic-change function (§5.8.2, p. 16): a right-hand beam adapted to left-hand traffic gives at least 2,500 cd at
  0.86D-1.72L and no more than 880 cd at 0.57U-3.43R, measured with the adjustment unchanged; mirrored for a
  left-hand beam (§5.8.2.2). Annex 8 does not apply to it (§6.2.1.2). It is the `traffic-change` function.
- Beam-switch failure: a passing beam, or no more than 1,300 cd in zone III b and at least 3,400 cd at a point of
  segment Imax (§5.7.3 as amended by Suppl. 8, p. 2).
- Light sources: Class C only with replaceable light sources or LED modules (§5.3.3); LED-only basic passing beam at
  least 1,000 lm per side (§5.14, p. 17); over 2,000 lm per side is recorded on the form (§5.13).
- Run-up with a gas-discharge source and separate ballast, after 30 minutes off: 37,500 cd at HV (driving-beam-only
  system) or 3,100 cd at 50V with Class C on, four seconds after switching on (§6.1.4.4, p. 17).
- Adjustable units: repeat at ±2° (or the end of range) after re-aiming the opposite way, checking B50L and 75R (or
  50R) and, for the driving beam, IM and HV as a percentage of IM (§6.4.3–6.4.3.1 as amended by Suppl. 8, p. 3).
- Colour white (§7.1, p. 22).

## Choices made in the data file

- **One function per class and variant**: C, V, E, E1, E2, E3, W, a bending function per class, the traffic-change
  function, the driving beam and six adaptive-driving-beam states. Bending modes and adaptation states are fixed
  points and lines, so they are functions, but each describes a different system state and must be checked against
  the distribution of that state; the user picks which state a file holds.
- **Conditions.** `CONDITIONS` lists the facts a distribution cannot show. A requirement with `when: [ids]` applies
  only while they hold; `replaces: '<id>'` names the requirement it stands in for.
  - `also-class-w`: Segment 10 maximum 15,900 cd instead of 12,300 cd for C, V and E (footnote 1).
  - `stabilised-supply`: a `note` with `factor: 1.4` and `of: '50L'` scales 50L's maximum (footnote 9). No ×1.4
    value is computed in the data.
  - `w-table-4-2`: Class W's Table 4 item 4.2 set (Segment 20 ≤ 8,800, Segment 10 ≤ 3,550, Imax ≤ 88,100, with line
    18's minimum kept), in `passing-W` and `passing-W-bending`.
  - `turn-left-smallest-radius`, `turn-right-smallest-radius`: the §6.2.5.2 zones in the bending functions.
  - `no-continuous-passing-beam`: Table 7 Part B points in the adaptive driving beam functions.
- **Segments "and below it"** are zones from the segment down to v = −90°, because the text sets no lower limit.
- **Imax** is an `imax` requirement with line 18's minimum and maximum, applied to the whole beam. Table 2 item 2.1
  adds a `zone` with `measure: 'brightest'`: the brightest receiver position inside the segment Imax rectangle must
  lie within the same limits. The rectangles are exported as `SEGMENT_IMAX`. For Class V, whose horizontal extent is
  blank, the band runs from 90°L to 90°R; that bound is this transcription's.
- **§6.2.5.2** (2,500 cd at one or more points, H-H to 2°D, 10° to 45° on the turning side) is a `zone` with
  `measure: 'brightest'`, `min: 2500`, the turn condition, and `scope: 'one-side'`, because it applies to one side of
  the system, all its contributors added, without the halving of Annex 9 §1.8.
- **Footnote 4** (Class C, 50 cd from each side) is a note. The table's 50 cd minimum on segments BLL and BRR is
  transcribed as a minimum along the whole segment; the footnote's "of at least one point" suggests the per-side
  contribution need only be met somewhere on the segment. The whole-segment reading is the stricter one.
- **Blank Part B cells** mean no requirement. Part B "replaces" lines, so a blank cell drops Part A's value; the
  other reading (Part A's value still applies) is possible and would be stricter for Class E and W HV and B50L.
- **The Class E data sets** keep line 1's 50 cd minimum and line 18's 16,900 cd minimum, since Table 6 replaces only
  the maxima.
- **Line boundaries in Table 7**: the higher limit applies to points "greater than" 1.0°R (line 4) and 0.5°R (line
  5). Both line entries include the boundary, so the lower limit governs the boundary point, which matches the text.

## Shapes the format cannot express

- Requirements on one side of the system rather than on the half sum: footnote 4, §6.2.8.1 and §6.3.4.1 are notes;
  §6.2.5.2 carries `scope: 'one-side'`; the 215,000 cd ceiling (§6.3.2.1.1) is in the driving `imax` and its one-side
  status is in the notes.
- A cut-off position range for a mode that is not re-aimed (Table 2 item 2.2(b)): in `aim` text only.
- The Class C failure state of §5.7.3 and §6.2.5.4 (≤ 1,300 cd in zone III b and ≥ 3,400 cd at a point of segment
  Imax) and the §6.2.5.4.1 exemption: notes, since they describe a failure state.

## Open questions

- Line A's horizontal position comes from the figures only (0.5°R); the prose never gives it.
- Annex 9 §1.2 prints "65 m"; read as 65 mm.
- Annex 8 §2.7 ends "acceptable if the requirements of paragraph 2.1. to 2.3. above comply with at least one set of
  measurements", which most likely means §2.7.1–2.7.3; transcribed as printed.
- The consolidated UNECE PDF of Revision 2 Amendment 9 could not be fetched, so the current wording was rebuilt from
  Revision 2 and the slips. The slips are documentation tools, so the authentic WP.29 texts were read too: 2014/25,
  2015/32, 2017/41, 2017/89, 2018/119/Rev.1, 2019/92, 2021/43 and 2021/44 match their slips. WP.29/2013/95
  (Supplement 5, Annex 7 heat test) has no text layer and was read only through its slip, Amend.1.
