# National lamp rules: China, Taiwan and India

Prepared 9 October 2026. Data file: `src/core/regulation/data/national.js`. This note says which documents set headlamp
photometry, signal lamp photometry and lamp installation in each country, which UN Regulation and series each one
stands on, and which national differences could be verified. It does not transcribe photometric tables: where a
national text adopts a UN series, Cutline reuses the UN data already in `src/core/regulation/`.

## Read this first

Taiwan is the easy case. Every item of its vehicle safety test standards (車輛安全檢測基準) names the UN Regulation and
series it is harmonised with and lets the testing agency test to the UN text directly. Today new headlamp types follow
R149 00 series and new signal lamp types R148 00 series; from 1 January 2028 new types move to R149 01 and R148 01.
Installation follows R48 06~07 series now and R48 08 series from 2028 (new M and N types).

India stands on older UN texts and prints its headlamp tables for left-hand traffic. The current published headlamp
standard for four-wheelers, AIS-010 (Part 1) (Rev.1):2010, is based on R112 Supplement 9 to the original version; I
did not find the notification that makes it mandatory. Its successor AIS-199 is based on R149 **00 series** Supplement 5, so its passing-beam classes are A, B and D, not the 01
series Class C and V that Cutline evaluates today. AIS-199, AIS-198 (R148) and AIS-008 (Rev.3) (R48 06 series) were
approved in 2023–2024 but no notification making them mandatory was found. The installation standard in force is
AIS-008 (Rev.1) (R48 03 series).

China could not be established. The current standards are GB 4599-2024 (road illumination), GB 5920-2024 (light
signalling) and GB 4785-2019 (installation), with dates verified, but no foreword could be read, so the UN series and
the relationship are recorded as unknown. The official full texts are free to view at openstd.samr.gov.cn, which is
blocked on the network used for this research.

## Legend

| Label | Meaning |
|---|---|
| V | Read this session in the official text or an official copy, at the cited clause and printed page |
| T | Read in a commercial translator's free preview of the standard (unofficial English wording) |
| S | Secondary source (consultancy or certification body article) |
| U | Unverified lead; not used in the data file |

Dates: Taiwan prints dates in the Republic of China calendar. ROC year + 1911 = Gregorian year (ROC 106 = 2017,
114 = 2025, 115 = 2026, 117 = 2028, 119 = 2030).

## Sources

| Key | Document | Kind | What I read | URL |
|---|---|---|---|---|
| tw-vstd-1150626 | 車輛型式安全審驗管理辦法第十四條附表 車輛安全檢測基準 (1150626版), zip of 343 files, all attachments as PDF and DOCX (220 MB) | Official, VSCC for MOTC | Clause 1 of attachments 3-4, 3-5, 3-6, 30-2, 52-2, 59-1, 91, 91-1, 92, 92-1; the item table; spot checks in 92-1 | Item 5 on https://www.vscc.org.tw/Home/List/10; direct link `https://www.vscc.org.tw/File/Download/9bc8c71a-3d94-4e1f-b1fd-3d7f9e8f9c32?FileName=…(1150626版).zip&cid=3505` (full URL in `national.js`) |
| in-ais199-df | Draft AIS-199/DF, August 2024 | Official copy (MoRTH, via Internet Archive 2025-03-19) | Introduction, scope, 3.1.3.1, 3.3.2, Table 8, 6.0–8.0 | https://morth.nic.in/sites/default/files/ASI/16-AIS-199_DF_August%202024.pdf |
| in-ais198-df | Draft AIS-198/DF, August 2024 | Official copy (MoRTH, via Internet Archive 2025-01-08) | Introduction, contents, 5.11, Annex 3 §3 | https://morth.nic.in/sites/default/files/ASI/15-AIS-198_DF_August%202024.pdf |
| in-ais008r3-df | Draft AIS-008 (Rev.3)/DF, August 2024 | Official copy (MoRTH, via Internet Archive 2025-01-06) | Introduction 0.1–0.4, contents | https://morth.nic.in/sites/default/files/ASI/1-AIS-008%20%28Rev.3%29_DF_August%202024.pdf |
| in-ais008r1 | AIS-008 (Revision 1) with Amendments 1–4 | Official copy (MoRTH, via Internet Archive) | Introduction pp. III–IV, amendment slips | https://morth.nic.in/sites/default/files/ASI/5262017111731AM7_AIS-008_Rev1_amds.pdf |
| in-ais010 | AIS-010 (Part 1), (Part 2), (Part 4) (Rev.1):2010 | Official copies (MoRTH, via Internet Archive) | Introductions; Part 1 scope notes and Annex C | Part 1: https://morth.nic.in/sites/default/files/ASI/PUB_12_29_2010_11_57_59_AM_AIS-010%28Part1%29%28Rev1%29F.pdf |
| in-ais012 | AIS-012 (Rev.1):2011 Parts 1, 2, 3, 4, 5, 6, 8, 9, 10 | Official copies (MoRTH, via Internet Archive) | Clause 0.3 of each part | file names listed in the Internet Archive index of `morth.nic.in/sites/default/files/ASI/` |
| in-cmvrtsc-62 | Minutes of the 62nd CMVR-TSC meeting, 4 April 2024 | Official copy (hosted by ACMA) | Agenda 2.0 items I–VII, Annexure II | https://www.acma.in/uploads/docmanager/MoM_62_CMVR-TSC.pdf |
| in-arai-reckoner | ARAI bus body code ready reckoner, April 2026 | Official (ARAI) | Row 15, lighting installation | https://www.araiindia.com/wp-content/uploads/2026/04/BBC-Ready-Reckoner-With-AIS-153-1.pdf |
| in-ais-list-2019 | MoRTH list of AIS, status 23 May 2019 | Official copy (via Internet Archive) | Rows 13–46 (status only; no notification column) | https://www.morth.nic.in/sites/default/files/ASI/5232019122910PMComplet_List_AIS_23May_2019.pdf |
| cn-mpr-2024 | MPR, "New Standards for Automotive Lighting and Reflective Devices", 11 Oct 2024 | S | Approval and implementation dates, replaced standards | https://www.china-certification.com/en/new-standards-for-automotive-lighting-and-reflective-devices |
| cn-cs-4599, cn-cs-5920, cn-cs-4785 | ChineseStandard.net previews of GB 4599-2024, GB 5920-2024, GB 4785-2019 | T | Covers, contents, parts of clauses 1–11; no forewords | https://www.chinesestandard.net/PDF.aspx/GB4599-2024 (and …GB5920-2024, …GB4785-2019) |
| cn-tuv-1654 | TÜV summary of WTO notification G/TBT/N/CHN/1654 | S | Draft notified 20 Jan 2022, scope | https://www.tuv.com/regulations-and-standards/en/china-draft-national-standard-on-road-illumination-devices-and-systems-for-vehicles.html |

## Taiwan

The legal basis is the table attached to article 14 of 車輛型式安全審驗管理辦法 (law.moj.gov.tw pcode K0040065). The
Vehicle Safety Certification Center (VSCC), supervised by the Ministry of Transportation and Communications, publishes
the consolidated text. Version 1150626 (26 June 2026) was downloaded from VSCC as one zip with every attachment in PDF
and DOCX. Each attachment opens with clause 1, "實施時間及適用範圍" (timing and scope), which gives the dates, the
exemptions and the UN basis in the form "檢測機構得依本項基準調和之聯合國車輛安全法規 (UN Regulations)，UN Rxx yy 系列
及其後續相關修正規範進行測試": the testing agency may test to UN Rxx series yy and its later amendments, with which this
item is harmonised. All page references are page 1 of the attachment.

| Item | Scope | Applies from | UN basis (clause) | Label |
|---|---|---|---|---|
| 附件92 道路照明裝置 | Headlamps (L, M, N), AFS (M, N), symmetric headlamps (L), front fog lamps | New types 2025-01-01 | R149 00 (§1.4) | V |
| 附件92-1 道路照明裝置 | As 92, plus ADB for L3 | New types 2028-01-01 | R149 01 (§1.4) | V |
| 附件52-2 非氣體放電式頭燈 | Non-gas-discharge headlamps | New types 2017-01-01 (M, N) | R5 02~03, R31 02~03, R112 01, R113 00~02 (§1.6) | V |
| 附件30-2 氣體放電式頭燈 | Gas-discharge headlamps | New types 2017-01-01 | R98 01, R113 00~02 (§1.6) | V |
| 附件59-1 適路性前方照明系統 | AFS | New types 2017-01-01 | R123 01 (§1.5) | V |
| 附件91 燈光訊號裝置 | Signal lamps, M, N, O, L | New types 2025-01-01 | R148 00 (§1.6) | V |
| 附件91-1 燈光訊號裝置 | Signal lamps | New types 2028-01-01 | R148 01 (§1.6) | V |
| 附件3-4 車輛燈光與標誌檢驗規定 | Installation | New M, N, O types 2017-01-01 | R48 05~06, R53 01~02, R70 01, R74 01, R104 00 (§1.11) | V |
| 附件3-5 車輛燈光與標誌檢驗規定 | Installation | New M, N types 2026-01-01; all M, N types 2028-01-01 | R48 06~07, R53 01~02, R70 01, R74 01, R104 00 (§1.9) | V |
| 附件3-6 車輛燈光與標誌檢驗規定 | Installation | New M, N types 2028-01-01; all M, N types 2030-01-01 | R48 08, R53 01~02, R70 01, R74 01, R104 00 (§1.8) | V |

Items 52-2, 30-2 and 59-1 stay in the table for types approved under them; from 2025 new types of those devices fall
under item 92 (its §1.1 lists the same devices). The older single-function signal items (31 direction indicators to
40 side marker lamps, 53 rear fog, 73 DRL) are also still listed; I did not read them.

**Verified national differences.** Clause 1 of each item adds administrative rules that the UN text does not carry:

- Items 91 and 91-1 §1.3: for small-volume type approval (少量車型安全審驗) the luminous intensity test values may
  deviate by **20 per cent**, and lamps with LED sources may skip the failure performance test. Items 92 and 92-1
  have no such tolerance; instead §1.2–1.3 exempt small-volume approvals (except buses and school buses for young
  children) and vehicle-by-vehicle small-volume approvals from the whole item.
- Items 91 and 91-1 §1.2: vehicles imported by government bodies or schools for their own use are exempt; vehicles
  imported by groups or individuals only if the importer held them registered abroad for six months or more.
- Items 3-5 and 3-6 §1.4: small-volume runs of up to twenty vehicles may skip horizontal projection (4.2.5.2), AFS
  (6.16) and some power-supply statements.
- Item 52-2 §1.1.1: no sealed-beam halogen headlamps on new M and N types from 2017.

Clause 1 of items 3-5 and 3-6 also sets rules that may only restate R48, because I did not compare them with it; the
data file keeps them in `notes`, out of `differences`: no Class B symmetric headlamps on any L3 type (§1.3);
conspicuity marking to 6.18 on large N2 and N3 vehicles (over 7.5 t, longer than 6 m or wider than 2.1 m, tractors
excepted, fire engines exempt) (§1.6); daytime running lamps on all M and N types from 2026-01-01 (3-5 §1.7); an
emergency stop signal on M and N vehicles.

**Spot check of the photometry.** Item 92-1 prints S50+S50LL+S50RR ≥ 1.90·10² cd and 75R (0.57°D, 1.15°R) ≥
1.21·10⁴ cd, the R149 01 Table 6 values in `src/core/regulation/r149.js`. I did not diff the items line by line.

**What Cutline can reuse.** For a Taiwan pack, reuse the UN data unchanged: R149 01 (as in `r149.js`) for designs that
will be approved after 2028-01-01, R149 00 for item 92 today, and R148 and R48 by the series in the table. Taiwan
drives on the right, so no mirroring. Show the user the item number and its clause-1 sentence, and add the 20 per
cent small-volume tolerance only for signal lamps and only when the user says the approval is small-volume.

## India

**How AIS becomes law.** AIS documents are written by the Automotive Industry Standards Committee (AISC, ARAI as
secretariat), approved by the CMVR Technical Standing Committee, and made mandatory under rule 124 of the Central
Motor Vehicles Rules 1989 by a MoRTH notification. The ARAI ready reckoner of April 2026 (row 15) gives the
installation rule as rule 124(20), AIS-008 (Rev.1)-2010, G.S.R. 436(E) of 15 March 2012, with effect from 1 October
2012. I did not find the notifications that make AIS-010 and AIS-012 mandatory, and could not read the CMVR text.

**Headlamps.**

| Document | Status | UN basis as the document states it | Label |
|---|---|---|---|
| AIS-010 (Part 1) (Rev.1):2010 | Published Dec 2010 | "ECE R 112, Revision 1, Amendment No. 4, (Supplement 9 to the original version of the Regulation - Date of entry into force: 15 October 2008)" (0.3) | V |
| AIS-010 (Part 2) (Rev.1):2010 (symmetric beams) | Published 2010 | "ECE R113, Rev. 1, Amendment 3 (Supplement 8 to the original version …)" (0.3) | V |
| AIS-010 (Part 4) (Rev.1):2010 (gas discharge) | Published 2010 | "ECE R 98, Revision 1, Amendment No. 5, (Supplement 10 to the original version …)" (0.3) | V |
| AIS-199 (finalised draft, Aug 2024) | AISC approved 20 Dec 2023; CMVR-TSC adopted 4 Apr 2024; no notification found | "UN R 149 (Supplement 5 to the original version of the Regulation) Date of entry into force: 8 October 2022" (0.3, p. 4/166) | V |

Each AIS-010 part says "attempts have been made to align with the above ECE regulation. However, certain changes were
necessary in the Indian context" (0.4), hence `modified`. AIS-199 says it combines AIS-010 Parts 1, 2, 4, AIS-012 Parts
1, 3 and AIS-127 "through an editorial exercise without changing any of the detailed technical requirements which are
already implemented" (0.2), hence `based on`.

Verified national differences:

- AIS-010 (Part 1) Scope Note 2 (p. 1/65): headlamps switchable between left-hand and right-hand traffic are not
  permitted; a factory-set lamp may be approved if it meets the left-hand traffic requirements. Annex C gives only the
  left-hand traffic screen; the right-hand one is "Reserved".
- AIS-199 Table 8 (pp. 35–40/166) is titled "Headlamps for LH traffic". I compared every row of Parts A, B and C with
  the R149 00-series Table 8 (as amended by Supplements 2 and 3) in `docs/research/r149-notes.md` §2c, mirrored about
  V-V. Every coordinate and every value matches: for example B50R 3.43°R 0.57°U ≤ 350 cd, 75L 1.15°L 0.57°D ≥ 5,100 /
  10,100 / 12,500 cd (A / B / D), 50R 3.43°R 0.86°D ≤ 13,200 cd (18,480 for D), and the 50L minima deleted by
  Supplement 2 are absent too. This is the UN mirror rule for left-hand traffic, so it is a presentation difference.
- AIS-199 Table 8 footnote ** (p. 36/166) reads "Actual measured value at points 50R respectively", where the UN
  footnote names 50R and 50L. In the mirrored table the Zone I limit for Class B should refer to 50L (the mirror of
  UN 50R). Treat this as a possible misprint in the draft, to be checked against the final text.
- AIS-199 3.3.2 (p. 12/166): approval marking follows AIS-037; UN ECE marking is also accepted. 7.1 (p. 88/166): for
  lamps already "E"/"e" approved, the Indian testing agency repeats the photometric tests of every class and the
  photometric stability test.
- AIS-199 6.2 (p. 88/166): six months after AIS-199 takes effect, no new approvals to AIS-010 (Rev.1) Parts 1–5,
  AIS-012 (Rev.1) Parts 1 and 3 or AIS-127; extensions remain available. 8.1: later UN changes are accepted as AIS-000
  sets out.

**Signal lamps.** AIS-012 (Rev.1):2011 is one part per lamp. Clause 0.3 of each part names the ECE text it drew on
(all V): Part 1 front fog, R19 Revision 5, Corrigendum 3 to the 03 series; Part 2 rear fog, R38 Supplement 14 to the
original version; Part 3 cornering, R119 Supplement 4 to the original version; Part 4 rear registration plate lamps,
R4 Supplement 13 to the original version; Part 5 direction indicators, R6 Supplement 16 to the 01 series; Part 6
position, stop and end-outline marker lamps, R7 Corrigendum 2 to Supplement 12 to the 02 series; Part 8 parking, R77
Supplement 12 to the original version; Part 9 side marker, R91 Supplement 11 to the original version; Part 10 DRL, R87
Supplement 13 to the original version. Part 7 (reversing lamps) was not read.

AIS-198 (finalised draft, Aug 2024; same approval history as AIS-199) is "based on UN R 148" and cites "UN Regulation
No. 148 – Supplement 4 to the original version of the Regulation – Date of entry into force: 8 October 2022" (0.1 and
0.3, p. II). Its 0.3 names two national changes: "India specific registration plate dimensions" — 5.11.3 (p. 30/59)
sets category 1a at least 340 × 200 mm and category 1b at least 500 × 120 mm — and manufacturer logo provisions taken
from a later version of R148. I did not fetch R148 for this note, so I do not state the UN sizes.

**Installation.**

| Document | Status | UN basis | Label |
|---|---|---|---|
| AIS-008 (Rev.1) with Amd. 1–4 | In force: rule 124(20), G.S.R. 436(E) 15.03.2012, w.e.f. 01.10.2012 | "ECE R 48 (Revision 4- Amendment 1- 03 series of amendments)" (Introduction, p. IV) | V |
| AIS-008 (Rev.2), Feb 2019 | Published; notification not found | "UN R 48-05 series Supplement 9" — stated in the Rev.3 draft, Rev.2 itself not read | V (indirect) |
| AIS-008 (Rev.3) (finalised draft, Aug 2024) | AISC approved; CMVR-TSC adopted 4 Apr 2024; no notification found | "UN R 48 Revision 12 – Amendment 12 (Supplement 15 to the 06 series of amendments) Date of entry into force: 22 June 2022" (0.3, p. 3/157) | V |

AIS-008 (Rev.3) 0.2 (pp. 2–3/157) lists its national changes: DRL stays optional "as it was decided to keep DRL
optional historically in India"; it adds the conspicuity marking of CMV rule 104, rear marking tape, and rear marking
plates for heavy and long vehicles (moved from AIS-089); and it absorbs the chromaticity rules of AIS-010 (Part 5).

**What Cutline can reuse.** An India pack for four-wheel headlamps today would most likely mean AIS-010 (Part 1),
that is R112 Supplement 9 (00 series) in left-hand traffic form, which Cutline does not hold; confirm the CMVR
notification first. For AIS-199 it means the R149 00-series tables (Classes A, B, D)
mirrored about V-V, which `docs/research/r149-notes.md` §2c already transcribes; the 01-series Class C tables in
`r149.js` do not apply. Show the user that AIS-199 is not yet notified, and flag the 50R footnote.

## China

**Documents and dates (S and T).** On 29 September 2024 SAMR and SAC approved three lamp standards, all applying from
1 July 2025 (MPR article; the GB 4599 and GB 5920 preview covers show the same dates):

| Standard | Title (as translated) | Replaces |
|---|---|---|
| GB 4599-2024 | Road illumination devices and systems for motor vehicles | GB 4599-2007, GB 21259-2007, GB 25991-2010, GB/T 30036-2013, GB/T 30511-2014, GB 4660-2016 |
| GB 5920-2024 | Light-signalling devices and systems for motor vehicles and their trailers | GB 5920-2019, GB 15235-2007, GB 11554-2008, GB 17509-2008, GB 18408-2015, GB 18409-2013, GB 18099-2013, GB 23255-2019 |
| GB 11564-2024 | Retro-reflective devices for motor vehicles (out of scope) | GB 11564-2008, GB 19151-2003, GB 23254-2009, GB 25990-2010 |

So GB 25991-2010 (LED headlamps) and GB 21259-2007 (gas-discharge headlamps) are both absorbed into GB 4599-2024. The
installation standard is GB 4785-2019 (issued 17 December 2019, implemented 1 July 2020); the preview's version list
shows no newer edition and the title says "including MODIFICATIONS 1, 2", whose dates I did not see.

**Relationship to UN Regulations: unknown.** The forewords, where a GB states "identical", "modified" or no adoption of
a UN Regulation, were not readable: openstd.samr.gov.cn and every other host in China are blocked by the network
proxy used here, and its block page says not to bypass it; the translation previews skip the foreword. What the
previews do show:

- GB 4599-2024 clause 2 lists GB 4785, GB/T 43081-2023 and IEC 60825-1:2014 as normative references, and no UN
  Regulation. Clause 8.2 uses Table 1 Part A and the S50/S100 point groups, the R149 layout, but that does not show
  the series. Clause 6.2.2 allows laser modules in headlamps (with IEC 60825-1:2014 4.4 and IEC 62471-7:2023 BLH-C)
  and bans them in front fog and corner lamps (T).
- GB 5920-2024 clause 2 lists UN R37, UN R128 and R.E.5 (light sources only). Clause 11 phases in reversing and stop
  lamps from the 19th month and already approved types and vehicle models from the 37th month (T).
- U: Baidu Baike says the drafting adjusted the scope of UN R149 and added a driver assistance projection clause. A
  comparison article by Zhejiang ATTC (https://www.zj-attc.com/en/4/13913/2069444, blocked here) is reported by a
  search summary to say the basic passing and driving beam requirements equal R149 01. Neither is in the data file.

**What Cutline can reuse.** Nothing yet. Before building a China pack, read the three forewords on
openstd.samr.gov.cn (search by number; viewing is free) and record the adoption statement and any table of technical
differences.

## What I could not fetch

- openstd.samr.gov.cn, std.samr.gov.cn, chinaautoregs.com, zj-attc.com: blocked by the corporate proxy (country block
  for China). Not retried.
- WTO notification G/TBT/N/CHN/1654 (draft GB 4599) and /1656 (draft GB 5920): docs.wto.org returned "not published"
  to scripts and HTTP 402 to the fetch tool; tbtims.wto.org returned a server error; the ePing page needs a browser.
- ARAI's AIS listing (hmr.araiindia.com API): needs an authorisation header; the request was declined in this session
  and not retried.
- icat.in (hosts the final AIS-199 of June 2025, AIS-008 Rev.3 and AIS-008 Rev.2): the host name does not resolve here
  and the Internet Archive holds no copy.
- morth.nic.in / morth.gov.in: serve only a script shell to non-browser clients; all MoRTH PDFs above came from the
  Internet Archive.
- CMVR 1989 consolidated text and the gazette notifications for AIS-010 and AIS-012: not found.

## Open questions

1. China: the adoption statement in the forewords of GB 4599-2024, GB 5920-2024 and GB 4785-2019, and the dates of
   GB 4785 Modifications 1 and 2.
2. India: whether AIS-199, AIS-198 and AIS-008 (Rev.3) have been notified, and whether the final June 2025 texts
   changed the UN supplement they cite (the drafts cite R149 00 Supplement 5 and R148 Supplement 4).
3. India: the AIS-199 Table 8 footnote ** (50R or 50L).
4. Taiwan: whether items 3-5 and 3-6 clause 1 requirements (DRL, emergency stop signal, conspicuity marking) differ
   from R48 or only restate it.
