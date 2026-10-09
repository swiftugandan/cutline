/** The catalogue of regulation packs Cutline checks a light distribution against. A pack is one regulation's data (from
 * ./r149.js and ./data/) with its provenance, the generic lamp roles each of its functions serves, and the aiming rule
 * each function is measured after. A market is one pack function under one traffic side. See docs/design/workbench.md
 * and docs/REGULATION.md. */

import { passingRequirements, drivingRequirements, SOURCE as R149_SOURCE, RULES as R149_RULES } from './r149.js';
import { FUNCTIONS as R123_FUNCTIONS, SOURCE as R123_SOURCE, CONDITIONS as R123_CONDITIONS } from './data/r123.js';
import { FUNCTIONS as R148_FUNCTIONS, SOURCE as R148_SOURCE, CONDITIONS as R148_CONDITIONS } from './data/r148.js';
import { FUNCTIONS as R149_00_FUNCTIONS, SOURCE as R149_00_SOURCE, CONDITIONS as R149_00_CONDITIONS, RULES as R149_00_RULES } from './data/r149-00.js';
import { FUNCTIONS as R148_00_FUNCTIONS, SOURCE as R148_00_SOURCE, CONDITIONS as R148_00_CONDITIONS } from './data/r148-00.js';
import { FUNCTIONS as FMVSS_HEADLAMPS, SOURCE as FMVSS_SOURCE } from './data/fmvss108-headlamps.js';
import { FUNCTIONS as FMVSS_SIGNALS, CONDITIONS as FMVSS_SIGNAL_CONDITIONS } from './data/fmvss108-signal.js';
import { JURISDICTIONS } from './data/national.js';
import { SOURCE as CMVSS_SOURCE, BASIS as CMVSS_BASIS, ALTERNATIVES as CMVSS_ALTERNATIVES, DIFFERENCES as CMVSS_DIFFERENCES } from './data/cmvss108.js';

/** @import { Requirement, PointRule } from './engine.js' */

/**
 * @typedef {'passing' | 'driving' | 'front-position' | 'rear-position' | 'end-outline' | 'parking' | 'drl' | 'stop' |
 *   'high-mounted-stop' | 'turn-front' | 'turn-rear' | 'turn-side' | 'side-marker' | 'reversing' | 'rear-fog'} Role
 * @typedef {'r149' | 'unece-cutoff' | 'fmvss-visual-lower' | 'driving-max' | 'as-measured'} AimRule
 *   How the laboratory positions the lamp before measuring. 'r149': R149 01's own evaluator. 'unece-cutoff': the same
 *   instrumental cut-off method in another UN text (R123, R149 00), with that text's citations. 'as-measured' takes
 *   the file's own axis: a signal lamp's reference axis, a mechanically aimed headlamp's mechanical axis, or a mode
 *   measured with the aim of another.
 * @typedef {{ id: string, text: string, set?: string }} Condition
 *   A fact about the lamp that decides which requirements apply. Conditions in the same set exclude each other.
 * @typedef {{ id: string, name: string, roles: Role[], kind: 'headlamp' | 'signal', aimRule: AimRule, aimText: string,
 *   tolerance: number, requirements: Requirement[], notes: string[], beamClass?: 'C' | 'V' | 'B' | 'A', pointRule?: PointRule, between?: string,
 *   cutoffCites?: { sharpness: string, linearity: string, method: string } }} PackFunction
 *   tolerance: degrees around each test point within which the most favourable value counts. beamClass: an R149
 *   function, evaluated by R149's own evaluator. pointRule and between: see MeasureOptions in engine.js. cutoffCites:
 *   where the text states the cut-off rules, for 'unece-cutoff'.
 * @typedef {'official' | 'adopted' | 'incomplete'} Provenance
 * @typedef {{ id: string, title: string, short: string, region: string, provenance: Provenance, statement: string,
 *   source: { title: string, document: string, url: string }, traffics: ('right' | 'left')[], receiverDeg: number,
 *   conditions: Condition[], functions: PackFunction[], notes: string[], basis?: string, secondary?: boolean }} Pack
 *   statement: what the provenance means for this pack, shown with every result. traffics: the traffic sides the pack
 *   covers. receiverDeg: the photometer's angular size. basis: the pack whose data an adopted pack checks. secondary:
 *   an earlier series, offered when asked for but not checked by default.
 */

/** Names of the roles, as the user sees them. */
export const ROLES = /** @type {Record<Role, string>} */ ({
  passing: 'Passing beam (low beam)',
  driving: 'Driving beam (high beam)',
  'front-position': 'Front position lamp',
  'rear-position': 'Rear position lamp (tail lamp)',
  'end-outline': 'End-outline marker or clearance lamp',
  parking: 'Parking lamp',
  drl: 'Daytime running lamp',
  stop: 'Stop lamp',
  'high-mounted-stop': 'High-mounted stop lamp',
  'turn-front': 'Front direction indicator',
  'turn-rear': 'Rear direction indicator',
  'turn-side': 'Side direction indicator',
  'side-marker': 'Side marker lamp',
  reversing: 'Reversing lamp',
  'rear-fog': 'Rear fog lamp',
});

/** Whether a role is a headlamp beam. @param {Role} role */
export const isHeadlampRole = role => role === 'passing' || role === 'driving';

/** @param {{ tolerance?: { deg: number } | null }} f */
const toleranceOf = f => f.tolerance?.deg ?? 0;
/** @param {{ notes?: string[] }} f */
const notesOf = f => f.notes ?? [];

/** The roles an R148 function serves, from its id. @param {string} id @returns {Role[]} */
function r148Roles(id) {
  if (id.startsWith('front-position') || id.startsWith('front-end-outline')) return id.includes('end-outline') ? ['end-outline'] : ['front-position'];
  if (id.startsWith('rear-position')) return ['rear-position'];
  if (id.startsWith('rear-end-outline')) return ['end-outline'];
  if (id.startsWith('parking')) return ['parking'];
  if (id.startsWith('daytime-running')) return ['drl'];
  if (id === 'stop-S3' || id === 'stop-S4') return ['high-mounted-stop'];
  if (id.startsWith('stop')) return ['stop'];
  if (/^direction-indicator-1[ab]?$/.test(id)) return ['turn-front'];
  if (/^direction-indicator-2[ab]$/.test(id)) return ['turn-rear'];
  if (/^direction-indicator-[56]$/.test(id)) return ['turn-side'];
  if (/^direction-indicator-1[12]/.test(id)) return ['turn-front', 'turn-rear'];
  if (id.startsWith('side-marker')) return ['side-marker'];
  if (id.startsWith('reversing')) return ['reversing'];
  if (id.startsWith('rear-fog')) return ['rear-fog'];
  return [];
}

/** The roles an FMVSS 108 signal function serves, from its id. @param {string} id @returns {Role[]} */
function fmvssSignalRoles(id) {
  if (id.startsWith('motorcycle') || id.startsWith('motor-driven')) return [];
  if (id.startsWith('front-turn')) return ['turn-front'];
  if (id.startsWith('rear-turn')) return ['turn-rear'];
  if (id.startsWith('taillamp')) return ['rear-position'];
  if (id.startsWith('stop')) return ['stop'];
  if (id === 'parking') return ['parking'];
  if (id === 'high-mounted-stop') return ['high-mounted-stop'];
  if (id.startsWith('side-marker')) return ['side-marker'];
  if (id.startsWith('clearance')) return ['end-outline'];
  if (id.startsWith('backup')) return ['reversing'];
  if (id.startsWith('drl')) return ['drl'];
  return [];
}

/** R149 01 series: the four beam classes, evaluated by R149's own aim and cut-off rules. @type {Pack} */
const R149 = {
  id: 'r149', title: 'UN Regulation No. 149, 01 series', short: 'UN R149', region: 'UNECE: EU, UK, Japan and other contracting parties',
  provenance: 'official', statement: 'Transcribed from the official text; every value is cited.',
  source: R149_SOURCE, traffics: ['right', 'left'], receiverDeg: R149_RULES.receiverDeg, conditions: [],
  functions: (/** @type {['C' | 'V' | 'B' | 'A', string, Role][]} */ ([['C', 'Class C passing beam', 'passing'], ['V', 'Class V passing beam', 'passing'], ['B', 'Class B driving beam', 'driving'], ['A', 'Class A driving beam', 'driving']])).map(([cls, name, role]) => ({
    id: `${role}-${cls}`, name, roles: [role], kind: 'headlamp', aimRule: 'r149', beamClass: cls,
    aimText: role === 'passing' ? 'Aimed by its cut-off (Annex 6): the inflection at 2.5° on the driver\'s side goes to line B, 0.57°D, and the horizontal aim follows the applicant\'s method.' : 'The area of maximum intensity is centred on H-V (Annex 5 §3.1.2).',
    tolerance: role === 'driving' ? R149_RULES.drivingTolerance : 0,
    requirements: role === 'passing' ? passingRequirements(/** @type {'C' | 'V'} */ (cls)) : drivingRequirements(/** @type {'B' | 'A'} */ (cls)),
    notes: [],
  })),
  notes: ['Passing beams are also checked for cut-off sharpness, linearity and minimum flux (Annex 6, §4.5.3.2).'],
};

/** UN R123: every AFS class and state as a function; the user picks the one a file holds. @type {Pack} */
const R123 = {
  id: 'r123', title: 'UN Regulation No. 123 (AFS), 01 and 02 series', short: 'UN R123', region: 'UNECE, for replacement parts and extensions of existing approvals',
  provenance: 'official', statement: 'Transcribed from the official text; every value is cited. R123 grants no new approvals: UN R149 took over its AFS classes in 2019.',
  source: R123_SOURCE, traffics: ['right', 'left'], receiverDeg: R149_RULES.receiverDeg, conditions: R123_CONDITIONS,
  functions: R123_FUNCTIONS.map(f => {
    const driving = f.id.startsWith('driving');
    // Modes that keep the Class C or driving-beam aim cannot be re-aimed from their own file: they are taken as measured.
    /** @type {AimRule} */
    const aimRule = f.aimRule === 'r123-passing' ? 'unece-cutoff' : f.aimRule === 'driving-max' ? 'driving-max' : 'as-measured';
    return {
      id: f.id, name: f.name, roles: driving ? ['driving'] : ['passing'], kind: 'headlamp', aimRule, aimText: f.aim, tolerance: toleranceOf(f), requirements: /** @type {Requirement[]} */ (f.requirements), notes: notesOf(f),
      // R123 aims its Class C passing beam exactly as R149 01 does (Annex 8 §2.3, §2.7, §3.1–3.2).
      cutoffCites: { sharpness: 'R123 Rev.2, Annex 8 §2.7.2 (p. 70)', linearity: 'R123 Rev.2, Annex 8 §2.7.3 (p. 70)', method: 'R123 Annex 8 §3.2' },
    };
  }),
  notes: ['Values apply to half the sum of both sides of the system unless a rule names one side (Annex 9 §1.8). Cutline treats the file as that half-sum.'],
};

/** UN R148 01 series: light-signalling lamps. @type {Pack} */
const R148 = {
  id: 'r148', title: 'UN Regulation No. 148, 01 series', short: 'UN R148', region: 'UNECE: EU, UK, Japan and other contracting parties',
  provenance: 'official', statement: 'Transcribed from the official text; every value is cited.',
  source: R148_SOURCE, traffics: ['right'], receiverDeg: R149_RULES.receiverDeg, conditions: R148_CONDITIONS,
  functions: R148_FUNCTIONS.map(f => ({ id: f.id, name: f.name, roles: r148Roles(f.id), kind: 'signal', aimRule: 'as-measured', aimText: f.aim, tolerance: toleranceOf(f), requirements: /** @type {Requirement[]} */ (f.requirements), notes: notesOf(f) })),
  notes: [],
};

/** UN R149 00 series: the earlier series, still the basis of national rules such as Taiwan's VSTD item 92. @type {Pack} */
const R149_00 = {
  id: 'r149-00', title: 'UN Regulation No. 149, 00 series', short: 'UN R149 00', region: 'UNECE, approvals first issued before 1 September 2026',
  provenance: 'official', statement: 'Transcribed from the official text; every value is cited.', secondary: true,
  source: R149_00_SOURCE, traffics: ['right', 'left'], receiverDeg: R149_00_RULES.receiverDeg, conditions: R149_00_CONDITIONS,
  functions: R149_00_FUNCTIONS.map(f => {
    const symmetric = /S$/.test(f.id);
    /** @type {AimRule} */
    const aimRule = f.aimRule === 'r149' ? 'unece-cutoff' : f.aimRule === 'driving-max' ? 'driving-max' : 'as-measured';
    return {
      id: f.id, name: f.name, roles: /** @type {Role[]} */ (symmetric ? [] : f.id.startsWith('driving') ? ['driving'] : ['passing']), kind: /** @type {const} */ ('headlamp'), aimRule, aimText: f.aim,
      tolerance: toleranceOf(f), requirements: /** @type {Requirement[]} */ (f.requirements), notes: notesOf(f),
      cutoffCites: { sharpness: R149_00_RULES.sharpnessCite, linearity: R149_00_RULES.linearityCite, method: 'R149 00 Annex 5 §2.3.2' },
    };
  }),
  notes: ['Since 1 September 2026 contracting parties need not accept 00-series approvals first issued after that date (R149 01 series §7.2.2). New designs are approved to the 01 series.'],
};

/** UN R148 00 series: the earlier series, the basis of Taiwan's VSTD item 91 and India's AIS-198. @type {Pack} */
const R148_00 = {
  id: 'r148-00', title: 'UN Regulation No. 148, 00 series', short: 'UN R148 00', region: 'UNECE, approvals under the original series',
  provenance: 'official', statement: 'Transcribed from the official text; every value is cited.', secondary: true,
  source: R148_00_SOURCE, traffics: ['right'], receiverDeg: R149_RULES.receiverDeg, conditions: R148_00_CONDITIONS,
  functions: R148_00_FUNCTIONS.map(f => ({ id: f.id, name: f.name, roles: r148Roles(f.id), kind: /** @type {const} */ ('signal'), aimRule: /** @type {AimRule} */ ('as-measured'), aimText: f.aim, tolerance: toleranceOf(f), requirements: /** @type {Requirement[]} */ (f.requirements), notes: notesOf(f) })),
  notes: [],
};

/** The aiming rule of an FMVSS 108 headlamp function, from its id. @param {string} id @returns {AimRule} */
const fmvssAim = id => (/^lower-LB\dV/.test(id) ? 'fmvss-visual-lower' : 'as-measured');

/** FMVSS 108: headlamp beams and signal lamps. @type {Pack} */
const FMVSS108 = {
  id: 'fmvss108', title: 'FMVSS No. 108 (49 CFR 571.108)', short: 'FMVSS 108', region: 'United States',
  provenance: 'official', statement: 'Transcribed from the Code of Federal Regulations; every value is cited.',
  // FMVSS allows a sensor up to about 0.52° across (S14.2.5.4); a smaller one is within the rule, and Cutline reads
  // every pack through R149's 0.149° receiver so values from an imported file stay close to the file's own.
  source: FMVSS_SOURCE, traffics: ['right'], receiverDeg: R149_RULES.receiverDeg,
  conditions: [{ id: 'vol', text: 'Visually aimed lower beam with a left cut-off (VOL)', set: 'cut-off' }, { id: 'vor', text: 'Visually aimed lower beam with a right cut-off (VOR)', set: 'cut-off' }, ...FMVSS_SIGNAL_CONDITIONS],
  functions: [
    ...FMVSS_HEADLAMPS.map(f => ({ id: f.id, name: f.name, roles: /** @type {Role[]} */ ([f.id.startsWith('upper') ? 'driving' : 'passing']), kind: /** @type {const} */ ('headlamp'), aimRule: fmvssAim(f.id), aimText: f.aim, tolerance: toleranceOf(f), requirements: /** @type {Requirement[]} */ (f.requirements), notes: notesOf(f) })),
    ...FMVSS_SIGNALS.map(f => ({
      id: f.id, name: f.name, roles: fmvssSignalRoles(f.id), kind: /** @type {const} */ ('signal'), aimRule: /** @type {AimRule} */ ('as-measured'), aimText: f.aim, tolerance: toleranceOf(f),
      // A point in an FMVSS group belongs to the group's sum; the table's footnotes say how the two combine.
      requirements: /** @type {Requirement[]} */ (f.requirements.map(r => (!('fmvssGroup' in r) || r.fmvssGroup === undefined ? r : r.kind === 'point' ? { ...r, inSum: `g${r.fmvssGroup}` } : r.kind === 'sum' ? { ...r, sumKey: `g${r.fmvssGroup}` } : r))),
      notes: notesOf(f),
      ...(f.pointRule === 'floor-60' ? { pointRule: /** @type {PointRule} */ ({ kind: 'floor', factor: 0.6 }) } : f.pointRule === 'group-alternative' ? { pointRule: /** @type {PointRule} */ ({ kind: 'sum-alternative' }) } : f.pointRule === 'group-only' ? { pointRule: /** @type {PointRule} */ ({ kind: 'sum-only' }) } : {}),
      ...(typeof f.between === 'string' ? { between: f.between } : {}),
    })),
  ],
  notes: [],
};

/** CMVSS 108: Canada incorporates FMVSS 108 through TSD 108 and accepts several UN regulations for headlamps. @type {Pack} */
const CMVSS108 = {
  ...FMVSS108,
  id: 'cmvss108', title: 'CMVSS 108 (TSD 108)', short: 'CMVSS 108', region: 'Canada',
  provenance: 'adopted', basis: 'fmvss108',
  statement: `Canada adopts FMVSS 108 through Technical Standards Document 108 Revision 8, which reproduces FMVSS 108 as it read on ${CMVSS_BASIS.fmvssAsOf}. Cutline checks the FMVSS 108 data; Canada's differences and the UN regulations it accepts instead are listed with the result.`,
  source: CMVSS_SOURCE,
  notes: [
    ...CMVSS_DIFFERENCES.map(d => `${d.text} (${d.cite})`),
    ...CMVSS_ALTERNATIVES.map(a => `Accepted alternative for ${a.functions.join(' and ')}: ${a.regulation}${a.series && !/none named/.test(a.series) ? `, ${a.series}` : ''} (${a.cite}).`),
  ],
};

/** The packs Cutline holds data for, by the UN regulation and series a national text adopts. */
const BASES = /** @type {Record<string, Pack>} */ ({ 'R149:01': R149, 'R149:00': R149_00, 'R148:01': R148, 'R148:00': R148_00, 'R123:01': R123 });

/**
 * @typedef {{ jurisdiction: string, document: string, title: string, scope: string, status: string, reason: string }} NotChecked
 *   A national document Cutline lists but cannot check, and why.
 */

/** @type {NotChecked[]} */
export const NOT_CHECKED = [];

/**
 * A pack for each national document whose UN basis Cutline holds: the basis's functions, under the jurisdiction's
 * traffic side, with the document's own differences listed. Documents that are superseded for new types, or whose
 * basis Cutline does not hold, go to NOT_CHECKED instead.
 * @returns {Pack[]}
 */
function nationalPacks() {
  /** @type {Pack[]} */
  const out = [];
  for (const j of JURISDICTIONS) {
    for (const d of j.documents) {
      if (d.scope === 'installation') continue;
      const basis = d.basis;
      const base = basis?.regulation && basis.series ? BASES[`${basis.regulation}:${basis.series}`] : undefined;
      const earlier = /earlier item|superseded|replaced/i.test(d.status);
      if (earlier) continue;
      if (!base || !basis) {
        NOT_CHECKED.push({
          jurisdiction: j.name, document: d.id, title: d.title, scope: d.scope, status: d.status,
          reason: !basis?.regulation ? 'The UN regulation it follows could not be established from an official source.' : `It follows UN ${basis.regulation}${basis.series ? ` ${basis.series} series` : ''}, which Cutline does not hold.`,
        });
        continue;
      }
      const traffic = /** @type {'right' | 'left'} */ (j.traffic === 'left' ? 'left' : 'right');
      out.push({
        ...base,
        id: `${j.id}-${d.id.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`,
        title: `${j.name}: ${d.id}`, short: `${j.name} ${d.id.replace(/^VSTD /, 'item ')}`, region: `${j.name}${d.inForce ? `, ${/adopted/.test(d.status) ? 'from' : 'since'} ${d.inForce}` : ''}`,
        provenance: 'adopted', basis: base.id, secondary: false,
        statement: `${d.id} ${basis.relation === 'identical' ? 'adopts' : basis.relation === 'modified' ? 'adopts with changes' : 'is based on'} UN ${basis.regulation} ${basis.series} series. Cutline checks the UN data and lists the national differences it knows.`,
        source: { title: d.title, document: `${d.id}; basis: ${basis.cite}`, url: d.url ?? base.source.url },
        traffics: base.traffics.includes(traffic) ? [traffic] : base.traffics,
        notes: [`Status: ${d.status}.`, ...(d.differences ?? []).map(x => `${x.text} (${x.cite})`), ...base.notes],
      });
    }
  }
  return out;
}

/** Every pack Cutline holds, in the order the report lists them. */
export const PACKS = /** @type {Pack[]} */ ([R149, R149_00, R123, R148, R148_00, FMVSS108, CMVSS108, ...nationalPacks()]);

/** @param {string} id */
export function packById(id) { return PACKS.find(p => p.id === id) ?? null; }

/** @param {string} packId @param {string} fnId */
export function functionById(packId, fnId) { return packById(packId)?.functions.find(f => f.id === fnId) ?? null; }

/** The pack whose conditions a pack shares: an adopted pack uses its basis's data, and so the same facts about the lamp.
 * @param {Pack} pack */
export const conditionPack = pack => pack.basis ?? pack.id;

/** The functions of a pack that serve a role. @param {Pack} pack @param {Role} role */
export function functionsFor(pack, role) { return pack.functions.filter(f => f.roles.includes(role)); }

/**
 * @typedef {{ pack: string, fn: string, traffic: 'right' | 'left' }} Market  One pack function under one traffic side.
 */

/**
 * The markets a new study checks for a role: the most common function of every pack that serves it, under each
 * traffic side the pack covers.
 * @param {Role} role @returns {Market[]}
 */
export function defaultMarkets(role) {
  /** @type {Record<string, string[]>} preferred function ids per pack, most usual first */
  const preferred = {
    r149: ['passing-C', 'driving-B'], 'r149-00': ['passing-B', 'driving-B'], r123: ['passing-C', 'driving'], 'r148-00': ['direction-indicator-1', 'direction-indicator-2a', 'direction-indicator-6', 'front-position-A', 'rear-position-R1', 'stop-S1', 'stop-S3', 'daytime-running-RL', 'parking-front', 'side-marker-SM1', 'reversing-AR', 'rear-fog-F1', 'front-end-outline-AM'],
    r148: ['direction-indicator-1', 'direction-indicator-2a', 'direction-indicator-6', 'front-position-A', 'rear-position-R1', 'stop-S1', 'stop-S3', 'daytime-running-RL', 'parking-front', 'side-marker-SM1', 'reversing-AR', 'rear-fog-F1', 'front-end-outline-AM'],
    fmvss108: ['lower-LB1V', 'upper-UB1', 'front-turn-1-x1', 'rear-turn-amber-1', 'taillamp-1', 'stop-1', 'high-mounted-stop', 'parking', 'side-marker-amber', 'backup-single', 'drl', 'clearance-identification-amber'],
  };

  /** @type {Market[]} */
  const out = [];
  for (const pack of PACKS) {
    if (pack.secondary) continue;
    const fns = functionsFor(pack, role);
    if (!fns.length) continue;
    const fn = (preferred[pack.basis ?? pack.id] ?? []).map(id => fns.find(f => f.id === id)).find(Boolean) ?? fns[0];
    const traffics = isHeadlampRole(role) ? pack.traffics : /** @type {('right' | 'left')[]} */ (['right']);
    for (const traffic of traffics) out.push({ pack: pack.id, fn: fn.id, traffic });
  }
  return out;
}
