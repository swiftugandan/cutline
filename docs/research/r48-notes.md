# UN Regulation No. 48: installation of lamps on M1 and N1 vehicles, with citations

Prepared 9 October 2026 for `src/core/regulation/data/r48.js`. Scope: where each lighting and light-signalling device
goes on a vehicle (presence, number, arrangement, width, height, length, geometric visibility, orientation) for
categories M1 and N1, with M2, M3, N2, N3 and O noted where the difference is a simple number. Electrical connections,
tell-tales, conspicuity markings, AFS internals, driver assistance projection and reversing projection are left out
except where they change a position or visibility rule.

## Which text applies

The newest series is the **09 series of amendments** (in force 22 September 2024). For M, N1, O1 and O2, Contracting
Parties need not accept approvals to the 08 series first issued after 1 September 2027, and need not accept any 08-series
approval after 1 September 2030 (09 series §12.8.2, Rev.14/Amend.6 p. 17). A new M1 or N1 design should therefore meet
the 09 series, and the data file transcribes it. Supplements 1, 2 and 3 to the 09 series are applied. Supplement 4 is
not (see "Not applied").

No consolidated 09-series text is reachable. The UNECE site blocks scripted downloads (HTTP 403 from Cloudflare), the
Wayback Machine refused with HTTP 429, and ODS holds no Revision 14 base text or Revision 15. ODS does hold the
consolidated **Revision 13** (07 series) and the published amendment slips **Rev.14/Amend.1–6**, so the effective
text was rebuilt by applying each amendment in order:

| Step | Document | What it is | Status |
|---|---|---|---|
| 1 | [E/ECE/324/Rev.1/Add.47/Rev.13](https://documents.un.org/api/symbol/access?s=E/ECE/324/Rev.1/Add.47/Rev.13&l=en&t=pdf) | Consolidated text through the 07 series (123 pp.) | 07 series EIF 25 Sep 2020 |
| 2 | [ECE/TRANS/WP.29/2021/31](https://documents.un.org/api/symbol/access?s=ECE/TRANS/WP.29/2021/31&l=en&t=pdf) | 07 series Suppl. 1 | EIF 30 Sep 2021 |
| 3 | [ECE/TRANS/WP.29/2021/86](https://documents.un.org/api/symbol/access?s=ECE/TRANS/WP.29/2021/86&l=en&t=pdf) | 08 series; dates in §12.7 corrected by [WP.29/1161](https://documents.un.org/api/symbol/access?s=ECE/TRANS/WP.29/1161&l=en&t=pdf) para. 82 | EIF 22 Jun 2022 |
| 4 | [Rev.14/Amend.1](https://documents.un.org/api/symbol/access?s=E/ECE/324/Rev.1/Add.47/Rev.14/Amend.1&l=en&t=pdf) to Amend.5 | 08 series Suppl. 1–5 (authentic: WP.29/2022/91, 2022/114, 2023/30, 2023/96, 2024/21) | EIF 4 Jan 2023 to 22 Sep 2024 |
| 5 | [Rev.14/Amend.6](https://documents.un.org/api/symbol/access?s=E/ECE/324/Rev.1/Add.47/Rev.14/Amend.6&l=en&t=pdf) and [Corr.1](https://documents.un.org/api/symbol/access?s=E/ECE/324/Rev.1/Add.47/Rev.14/Amend.6/Corr.1&l=en&t=pdf) | 09 series (authentic: [WP.29/2024/28](https://documents.un.org/api/symbol/access?s=ECE/TRANS/WP.29/2024/28&l=en&t=pdf) with [WP.29/1177](https://documents.un.org/api/symbol/access?s=ECE/TRANS/WP.29/1177&l=en&t=pdf) para. 96) | EIF 22 Sep 2024 |
| 6 | [ECE/TRANS/WP.29/2025/36](https://documents.un.org/api/symbol/access?s=ECE/TRANS/WP.29/2025/36&l=en&t=pdf) | 09 series Suppl. 1, without its change to §6.2.6.1.2, which WP.29 deleted ([WP.29/1184](https://documents.un.org/api/symbol/access?s=ECE/TRANS/WP.29/1184&l=en&t=pdf) para. 69) | EIF 26 Sep 2025 |
| 7 | [ECE/TRANS/WP.29/2025/117](https://documents.un.org/api/symbol/access?s=ECE/TRANS/WP.29/2025/117&l=en&t=pdf) | 09 series Suppl. 2 (vote 38/0/1, [WP.29/1188](https://documents.un.org/api/symbol/access?s=ECE/TRANS/WP.29/1188&l=en&t=pdf)) | EIF 4 Jun 2026 |
| 8 | [ECE/TRANS/WP.29/2026/33](https://documents.un.org/api/symbol/access?s=ECE/TRANS/WP.29/2026/33&l=en&t=pdf) | 09 series Suppl. 3 (vote 33/0/0, [WP.29/1190](https://documents.un.org/api/symbol/access?s=ECE/TRANS/WP.29/1190&l=en&t=pdf)) | Adopted Mar 2026; EIF not verified |

The amendment chronology and document symbols came from GlobalAutoRegs
(https://globalautoregs.com/rules/59/modifications?series=9 and the pages it links), then each document was fetched
from ODS and read. Three details of this chain matter:

- **Rev.14/Amend.6 page 2 is an error.** It repeats the 08 Suppl. 4 text; Corr.1 deletes it and fixes "item 9.3.2.3"
  to "9.2.2.3" in §6.22.9.1, matching WP.29/1177 para. 96.
- **The 08 series base text was not fetched.** I assume it contains 07 Suppl. 1, which entered into force nine months
  before the 08 series. The 09 slip supports this: its §6.2.6.1.2 diagram labels the 1.2–1.5 m extension "only valid
  for M2G, M3G, N2G, N3G", the off-road set that 07 Suppl. 1 introduced in §6.2.4.2. 07 Suppl. 2 (WP.29/2021/94) was
  adopted with the 08 series, and WP.29/2021/86 carries the same two changes (§3.2.5 and §6.18.4.3).
- **Parallel supplements** to the 07 and 08 series (for example 07 Suppl. 3 and 08 Suppl. 1) mirror each other; only
  the 08 and 09 chains were applied.

### Not applied

- [ECE/TRANS/WP.29/2026/163](https://documents.un.org/api/symbol/access?s=ECE/TRANS/WP.29/2026/163&l=en&t=pdf),
  09 series Suppl. 4, was on the June 2026 agenda ([WP.29/1191](https://documents.un.org/api/symbol/access?s=ECE/TRANS/WP.29/1191&l=en&t=pdf)
  item 4.9.5). The 199th session report (presumably WP.29/1192) is not on ODS, and GlobalAutoRegs records no vote, so
  its adoption is unconfirmed. It adds vehicle categories X and Y and ADS rules. The only change that touches geometry
  is a new §2.3.3.7: devices for ADS (e.g. sensors) are disregarded when finding the extreme outer edge. It also makes
  the main beam "optional for categories X and Y" and lets an end-outline marker on a windscreen-less ADS vehicle sit
  at the maximum practical height. It adds a new §6.29 for direction indicator projection. No M1/N1 number changes.
- [ECE/TRANS/WP.29/GRE/2026/4](https://documents.un.org/api/symbol/access?s=ECE/TRANS/WP.29/GRE/2026/4&l=en&t=pdf):
  OICA draft on manufacturer logos and partial substitution of front position lamps by AFS units. Pending at GRE.
- The November 2026 WP.29 agenda ([WP.29/1193](https://documents.un.org/api/symbol/access?s=ECE/TRANS/WP.29/1193&l=en&t=pdf))
  has no R48 item.

### What each amendment touched

Every cite in the data file names the document that last set the paragraph's wording. A paragraph cited to Rev.13 was
checked against this table and is unchanged through 09 Suppl. 3.

| Document | Paragraphs that bear on installation geometry |
|---|---|
| 07 Suppl. 1 (2021/31) | 2.1.5, 5.7.2.1, 6.2.4.2 (off-road 1,500 mm for N2G, N3G, M2G, M3G), 6.4.4.2 (off-road 1,400 mm), 6.8.2–6.8.6 (plate lamp "according to the type-approval documentation"), 6.11.4.2 (off-road 1,400 mm) |
| 08 series (2021/86) | 3.2.5 (apparent-surface method declared per lamp), 5.26, 6.2.7, 6.18.4.3 (4 m for semi-trailers), 6.19.7 (DRL switching and the 40 mm / 140 cd rule) |
| 08 Suppl. 1 | 5.10 rewritten into 5.10.1–5.10.4.3 with a 0.25 cd fallback, Annex 4, 6.1.2, 6.1.9.2, 6.2.2, 6.26.9.2 |
| 08 Suppl. 2 | 6.26.1 (manoeuvring lamps also on trailers) |
| 08 Suppl. 3 | 5.5.3–5.5.4, 5.21.1, 6.2.9.1, footnote 13 deleted from 6.3.5 and 6.3.6.1.1, tell-tales |
| 08 Suppl. 4, 5 | 5.10.4.3 ("not more than 0.25 cd"), 2.10.8, 6.5.8, 6.19.7.5 (no geometry) |
| 09 series | Device approval lists in every §6.x.2; 6.1.2; 6.2.2; 6.2.6.1–6.2.6.3 (new inclination table); 6.3.2 (Class F3 only); 6.3.6; 6.24–6.24.3 and 6.24.9; 6.26.2 and 6.26.4; new 6.27 (answer-back signal) |
| 09 Suppl. 1 | 6.1.9.1 (reference value 100), 6.2.8.2, 6.2.9.2 |
| 09 Suppl. 2 | 6.12.1 (parking lamp: the 2 m width condition removed), 6.17.4.3 (4 m for semi-trailers), 6.26.2 and 6.26.4.2–6.26.4.3 (rear-mounted manoeuvring lamp), new 6.28 (reversing projection) |
| 09 Suppl. 3 | 5.27.3, 6.5.3.1 (a) ("per side"), 6.5.7 |

None of §2.3.3, §2.10.2–2.10.12, §5.3, §5.8, §5.28 or the width, height and visibility subparagraphs of §6.4–6.20
(other than those listed) changed after Rev.13.

## How the text measures position and visibility

These rules decide how a checker turns a lamp drawing into pass or fail, so they sit in `DEFINITIONS` with their
cites.

**Height** is taken with the vehicle unladen on flat ground (§5.4). The maximum is measured to the highest point and
the minimum to the lowest point of the *apparent surface in the direction of the reference axis* (§5.8). The thresholds
that relax visibility angles ("mounted below 750 mm", "above 2,100 mm") are measured to the **H plane**, the horizontal
plane through the centre of reference (§5.8.1). So a lamp whose lowest edge is at 700 mm but whose centre is at 760 mm
meets the 350 mm minimum but does not earn the 5° downward reduction. For the passing beam the minimum height is to the
lowest point of the apparent surface "independent of its utilization" (§5.8.2), and the inclination limits use the
lower edge of the apparent surface (§6.2.6.1.2). Side direction indicators of categories 5 and 6 and the plate lamp use
the light-emitting surface instead (footnote 2 to §2.4.2; §6.5.4.2.1).

**Width** is measured from the edge of the apparent surface farthest from the median plane when the rule refers to
the overall width, and between the inner edges when it refers to the distance between lamps (§5.8.3). Retro-reflectors
use the illuminating surface for the outer-edge rule (§6.14.4.1, §6.16.4.1). The extreme outer edge ignores mirrors,
side indicators, position, parking and end-outline lamps, retro-reflectors and side markers (§2.3.3.4), so a lamp may
itself stick out past the edge it is measured to.

**Geometric visibility** is the minimum solid angle, centred on the centre of reference and measured from the reference
axis, within which the apparent surface must be seen (§2.10.7). Nothing may block light from any part of the apparent
surface within those angles, observed from infinity (§5.28.1). If the body hides part of the apparent surface once
installed, the unhidden part must still meet the device's photometric values (§5.28.3). Only the M1/N1 alternative
arrangements add a fixed minimum: at least 12.5 cm² of apparent surface unobstructed (§6.5.5.2, §6.9.5.2, §6.10.5.2).

**Orientation** of every signal lamp: reference axis parallel to the road, and parallel to the median plane (side
retro-reflectors and side markers: perpendicular), ±3° in each direction (§5.3).

### Direction names and signs

The regulation uses "inwards" (towards the median plane) and "outwards" for front and rear lamps, "to the left and to
the right" when the two are equal, and "to the front and to the rear" for side lamps. The data keeps `outward` and
`inward` as positive degrees from the reference axis, which matches the brief's h-positive-outward convention, and adds
`forward` and `rearward` for side-facing lamps. "β = 45° to the left and to the right of the longitudinal axis" (stop
lamps) is stored as `outward: 45, inward: 45`.

The reduction "the inward angle of 45° may be reduced to 20° **under the H plane**" applies only to directions below
the horizontal; above it the full inward angle stays. It is stored as `inwardBelowH: 20`.

### Angles read from figures

The horizontal angles of direction indicators appear only in figures, which I read from the rendered pages:

- **Rev.13 p. 45, arrangement A:** front categories 1, 1a, 1b: arcs of 80° outwards and 45° inwards from the
  forward-pointing reference axis. Rear categories 2a, 2b: 80° outwards and 45° inwards from the rearward axis.
  Categories 5 and 6: an arc from the side indicator towards the rear, from 5° to 60° off the line parallel to the
  vehicle side. Footnote (*): the 5° dead angle is an upper limit, with d ≤ 1.80 m (d ≤ 2.50 m for M1 and N1), where d
  is the distance from the front of the vehicle to the side indicator.
- **Rev.13 p. 45, arrangement B (trailers):** rear 2a, 2b, 80° outwards and 45° inwards.
- **Rev.13 p. 46, M1/N1 alternative (§6.5.5.2):** front and rear indicators 45° outwards and 45° inwards; the foremost
  and the amber rearmost side markers 45° towards the vehicle's end and 30° towards its centre; the side indicator
  keeps 5°–60°.

The §6.2.6.1.2 inclination table was also checked on the rendered page (Rev.14/Amend.6 p. 5), because the text
extraction merged its rows: the rows 0.9 < h ≤ 1.2 and 1.2 < h ≤ 1.5 share one cell, and the diagram marks the
1.2–1.5 m band as the off-road extension. The cornering lamp's α and β symbols (Rev.13 p. 65) were checked the same way.

## M1 and N1 at a glance

Heights are mm above the ground; "sep." is the minimum distance between inner edges; "edge" is the maximum distance
from the outermost edge of the apparent surface to the extreme outer edge. Visibility is up/down, outward/inward.

| Device | M1 / N1 presence | Number | Edge | Sep. | Height min–max | Visibility | Main cites |
|---|---|---|---|---|---|---|---|
| Driving beam | Mandatory | 2 (+1 or 2 pairs) | – | – | – | 5° divergent space | 6.1 |
| Passing beam | Mandatory | 2 | 400 | none for M1/N1 | 500–1,200 | 15/10, 45/10 | 6.2.4, 6.2.5 |
| Front fog | Optional | 2 | 400 | – | 250–800, not above passing beam | 5/5, 45/10 | 6.3.4, 6.3.5 |
| Reversing | Mandatory | 1 (+1) | – | – | 250–1,200 | 15/5; 45 each side (one), 45/30 (two) | 6.4 |
| Front indicator 1, 1a, 1b | Mandatory | 2 | 400 | 600 | 350–1,500 | 15/15, 80/45 | 6.5.4, 6.5.5.1 |
| Rear indicator 2a, 2b | Mandatory | 2 | 400 | 600 | 350–1,500 | 15/15, 80/45 | 6.5.4, 6.5.5.1 |
| Side indicator 5 (6) | Mandatory | 2 | – | – | 350–1,500 (light-emitting surface); ≤ 2,500 from the front | 15/15 (cat. 6: 30/5); 5°–60° rearward | 6.5.4, 6.5.5.1 |
| Stop S1, S2 | Mandatory | 2 | 400 | none for M1/N1 | 350–1,500 | 15/15, 45/45 | 6.7.4, 6.7.5 |
| Stop S3, S4 | Mandatory (not chassis-cabs, nor N1 with open cargo space) | 1 | on the median plane (≤ 150 offset) | – | lower edge ≥ 850, or ≤ 150 below the rear-window glazing; above S1/S2 | 10/5, 10/10 | 6.7.4, 6.7.5 |
| Plate lamp | Mandatory | per device approval | – | – | per device approval | per device approval | 6.8 |
| Front position | Mandatory | 2 | 400 | none for M1/N1 | 250–1,500 | 15/15, 80/45 | 6.9 |
| Rear position | Mandatory | 2 | 400 | none for M1/N1 | 350–1,500 | 15/15, 80/45 | 6.10 |
| Rear fog | Mandatory | 1 or 2 | single lamp on the side away from the traffic direction, or centred | – | 250–1,000 (1,200 if grouped) | 5/5, 25/25 | 6.11; ≥ 100 from each stop lamp |
| Parking | Optional (length ≤ 6 m) | 2 or 4 | 400 | – | no requirement for M1/N1 | 15/15, 45 outward | 6.12 |
| End-outline | Width > 2.10 m | 4 (+4) | 400 | – | front: not below the windscreen top | 5/20, 80 outward | 6.13 |
| Rear retro-reflector | Mandatory | 2 | 400 (illum. surface) | none for M1/N1 | 250–900 (1,200 grouped) | 10/10, 30/30 | 6.14 |
| Front retro-reflector | Optional (mandatory if all front lamps with reflectors are concealable) | 2 | 400 | none for M1/N1 | 250–900 | 10/10, 30/30 | 6.16 |
| Side retro-reflector | Optional ≤ 6 m, mandatory > 6 m | per length rules | – | – | 250–900 (1,500 when optional) | 10/10, 45 front/rear | 6.17 |
| Side marker | Mandatory > 6 m or when used for the M1/N1 alternative arrangements | per length rules | – | – | 250–1,500 | 10/10, 45 front/rear (30 when optional) | 6.18 |
| Daytime running lamp | Mandatory | 2 | – | 600 | 250–1,500 | 10/10, 20/20 | 6.19 |
| Cornering | Optional | 2 | one each side | – | 250–900, not above passing beam; ≤ 1,000 from the front | 10/10, 30°–60° outward | 6.20 |
| Exterior courtesy | Optional | 1 or 2 (+ steps, handles, surroundings) | – | – | – | not visible from the 10 m zone, 1–3 m high | 6.24 |
| Manoeuvring | Optional | 1–2 side (≤ 6 m), 1 rear | – | – | side ≤ 1,500 | not visible from the 10 m zone | 6.26 |

Every 400 mm or 20° above has a narrower-vehicle or low-mount relaxation in the data: 400 mm separation where the
overall width is below 1,300 mm; downward angle 15° (10° for retro-reflectors and side markers) reduced to 5° when the
H plane is below 750 mm; inward 45° reduced to 20° under the H plane when below 750 mm; upward 15° reduced to 5° for
optional rear lamps above 2,100 mm. The "if the shape of the bodywork makes it impossible" maxima (2,100 mm for most
signal lamps, 2,300 mm for side indicators, 1,500 mm for retro-reflectors) and the off-road maxima are separate fields
with their conditions.

The **M1/N1 alternative arrangement** lets front and rear direction indicators (§6.5.5.2) and front and rear position
lamps (§6.9.5.2, §6.10.5.2) drop to 45° outwards, provided side-marker lamps cover 45° towards the vehicle end and 30°
towards the centre, and each lamp shows 12.5 cm² of unobstructed apparent surface. It is stored as `alternativeM1N1`.

## Values I am unsure of

- **Scope of the 12.5 cm² rule in §6.5.5.** The sentence follows the §6.5.5.2 vertical angles on p. 46, so I attached
  it to the M1/N1 alternative only. The layout does not make clear whether it also governs §6.5.5.1. In §6.9.5.2 and
  §6.10.5.2 it sits clearly inside the alternative.
- **Parking-lamp inward angle.** §6.12.5 states "45° outwards, forwards and rearwards", then allows "the inward angle
  of 45°" to be reduced to 20° under the H plane. The text states no inward angle itself; the data keeps both as
  printed and does not invent `inward: 45`.
- **Stop lamps S1/S2 on categories other than M1 and N1** have no outer-edge distance in §6.7.4.1, only the 600 mm
  separation. Transcribed as printed.
- **§5.7.2.1 cross-reference.** 07 Suppl. 1 rewrote it to say "single lamps as defined in paragraph 2.16.1.,
  subparagraph (a)". No §2.16.1 exists; Rev.13 had §2.4.11.1. The intent is clearly §2.4.11.1, but the printed text
  says 2.16.1.
- **Side direction indicator sector** (5° to 60°) comes from a drawing with no degree marks other than the two labels;
  the reading of which line each angle is measured from is mine.
- **09 Suppl. 3 entry into force** was not confirmed from a primary source. Its only geometric change is the word
  "per side" in §6.5.3.1 (a), which does not affect M1 or N1.

## What the data format cannot express

These carry a `text` and cite in the data, often with extra fields, but a generic checker would need new code for
them:

- **Heights relative to other features:** S3/S4 lower edge against the rear-window glazing and above the S1/S2 upper
  edge; front fog and cornering lamps not above the passing beam's highest point; front end-outline markers not below
  the top of the windscreen's transparent zone; optional rear lamps at least 600 mm above the mandatory ones.
- **Angles that are not a box around the reference axis:** the driving beam's 5° divergent space from the illuminating
  surface's perimeter; the cornering lamp's 30°–60° outward band; the side indicator's 5°–60° rearward sector;
  forward/rearward angles for side lamps; the reversing lamp's angles changing with the number of devices; the
  side-mounted reversing lamp's "reference axis at most 15° outwards".
- **Half-space reductions:** the inward 20° applies only under the H plane, and the reductions depend on the H-plane
  height, which differs from the apparent-surface height used for the limits.
- **Presence that depends on size or other lamps:** end-outline markers by width (> 2.10 m; optional 1.80–2.10 m),
  side retro-reflectors, side markers and parking lamps by length (6 m), side markers required by the M1/N1 alternative
  arrangement, front indicator category chosen by its distance (20 mm, 40 mm) to the passing beam or front fog lamp.
- **Zone tests:** no direct view of courtesy, manoeuvring and reversing-projector apparent surfaces from a 10 m box
  1–3 m high (Annex 14); no red to the front and no white to the rear from 25 m zones 1–2.2 m high (Annex 4).
- **Area and shape rules:** 12.5 cm² unobstructed; single lamps in parts (60 per cent of the circumscribing
  quadrilateral, or at most 75 mm between parts); bands and strips (within 0.4 m of each edge, at least 0.8 m long);
  50 per cent hiding by movable components.
- **Length rules along the side:** foremost at most 3 m from the front, spacing at most 3 m (4 m), rearmost at most
  1 m from the rear, and the first-third/last-third shortcut for short vehicles.
- **Passing-beam inclination limits** are formulas of mounting height (stored as strings in `orientation.inclination`).
- **Plate lamp geometry** is delegated entirely to the device's type approval under UN R4 or R148.

## Not fetched

- The consolidated Revision 14 base text (08 series) and Revision 15, if it exists; the amendment slips Rev.14/Amend.7
  onwards (09 Suppl. 1–3 were read from their WP.29 documents instead).
- Every unece.org PDF (HTTP 403), including the consolidated texts linked from GlobalAutoRegs, e.g.
  https://unece.org/sites/default/files/2025-04/R048r13e_0.pdf and https://unece.org/sites/default/files/2025-01/R048r14am6e.pdf.
- The 199th WP.29 session report (likely ECE/TRANS/WP.29/1192), which would confirm whether 09 Suppl. 4 was adopted.
- GRE-89-02-Rev.3, the informal consolidated 09-series text on which WP.29/2024/28 was based (unece.org only).
