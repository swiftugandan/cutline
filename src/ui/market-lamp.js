/** The words for the two sides of a headlamp check: the lamp that is measured and the test points it is measured on.
 * Every view names both in the engineer's terms ("left-hand lamp", "right-hand test points"), and says that a lamp is
 * the file mirrored only as a fact about it. One module, so the matrix, the dialog, the picture, the design panel and
 * the report all say the same thing. */

import { functionById, isHeadlampRole, lampSideOf } from '../core/regulation/catalog.js';

/** @import { Study } from '../core/study.js' */
/** @import { Market } from '../core/regulation/catalog.js' */

/** @typedef {'right' | 'left'} Side */

/** @param {Side} side */
export const sideWord = side => (side === 'right' ? 'right-hand' : 'left-hand');
/** @param {Side} side */
export const sideShort = side => (side === 'right' ? 'RH' : 'LH');
/** @param {string} s */
const capital = s => s[0].toUpperCase() + s.slice(1);

/**
 * What a headlamp market checks, or null for a signal lamp, which has no traffic side.
 * @param {Study} study @param {Market} market
 * @returns {{ side: Side, mirrored: boolean, crossed: boolean, system: boolean } | null}
 *   side: the lamp's traffic side; mirrored: it is the file's mirror image; crossed: it is checked on the other side's
 *   test points; system: the function fixes the lamp (a traffic-change function), so there is no choice.
 */
export function lampOf(study, market) {
  if (!isHeadlampRole(study.lamp.role)) return null;
  const side = lampSideOf(market);
  const system = functionById(market.pack, market.fn)?.sideMeans === 'system';
  return { side, mirrored: side !== study.lamp.traffic, crossed: !system && side !== market.traffic, system };
}

/** The lamp's name with what it is made from: "Right-hand lamp (your file, mirrored)". @param {Side} side @param {boolean} mirrored */
export const lampName = (side, mirrored) => `${capital(sideWord(side))} lamp (your file${mirrored ? ', mirrored' : ''})`;

/** The market's side in a choice: the test points' traffic, or for a traffic-change function the lamp in the other
 * traffic. @param {Side} side @param {boolean} system */
export const testPointsName = (side, system) => (system ? `${capital(sideWord(side))} lamp in ${sideWord(side === 'right' ? 'left' : 'right')} traffic` : `${capital(sideWord(side))} traffic`);

/**
 * The pair a market checks, as a short phrase: "Left-hand lamp on right-hand test points".
 * @param {Study} study @param {Market} market @returns {string | null}
 */
export function pairPhrase(study, market) {
  const l = lampOf(study, market);
  if (!l) return null;
  if (l.system) return testPointsName(market.traffic, true);
  return `${capital(sideWord(l.side))} lamp on ${sideWord(market.traffic)} test points`;
}

/**
 * The pair a market checks, in a full sentence for a preview or a tooltip.
 * @param {Study} study @param {Market} market @param {string} packName @returns {string | null}
 */
export function pairSentence(study, market, packName) {
  const l = lampOf(study, market);
  if (!l) return null;
  const lamp = `your ${sideWord(l.side)} lamp (${l.mirrored ? `the ${sideWord(study.lamp.traffic)} file mirrored` : 'the file as it is'})`;
  if (l.system) return `Checks ${lamp} used in ${sideWord(l.side === 'right' ? 'left' : 'right')} traffic, on ${packName}'s traffic-change test points.`;
  return `Checks ${lamp} on ${packName}'s ${sideWord(market.traffic)} traffic test points.${l.crossed ? ' A lamp for one side usually fails the other side\'s points.' : ''}`;
}

/** The stored choice for a lamp side under a market's test points. @param {Side} lampSide @param {Side} traffic @returns {Market['lamp']} */
export const lampChoice = (lampSide, traffic) => (lampSide === traffic ? 'matching' : 'other');
