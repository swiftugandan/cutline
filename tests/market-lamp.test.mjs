import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeIesTypeA } from '../src/core/distribution/ies.js';
import { defaultStudy, parseStudy, serializeStudy, STUDY_VERSION } from '../src/core/study.js';
import { analyseStudy, beamKeyFor } from '../src/core/study-analysis.js';
import { pairPhrase, pairSentence, lampOf } from '../src/ui/market-lamp.js';

/** @import { Market } from '../src/core/regulation/catalog.js' */

/** @param {number} lo @param {number} hi @param {number} step */
const range = (lo, hi, step) => Array.from({ length: Math.round((hi - lo) / step) + 1 }, (_, i) => +(lo + i * step).toFixed(6));
/** A small beam: what these tests check is which beam each market reads, not the beam's own values. */
const beamText = writeIesTypeA({ title: 'x', horizontal: range(-30, 30, 1), vertical: range(-10, 10, 1), candela: (h, v) => 1000 + 10 * h + v });

/** A study of a left-hand traffic lamp with the given markets. @param {Market[]} markets */
function leftHandStudy(markets) {
  const study = defaultStudy();
  study.source = { name: 'lht.ies', text: beamText };
  study.lamp.traffic = 'left';
  study.markets = markets;
  return study;
}

/** A version 1 study as the app wrote it before markets chose their lamp. @param {'mirror' | 'as-is'} otherTraffic */
function version1(otherTraffic) {
  const raw = /** @type {any} */ (JSON.parse(serializeStudy(leftHandStudy([]))));
  raw.version = 1;
  raw.lamp.otherTraffic = otherTraffic;
  raw.markets = [{ pack: 'r149', fn: 'passing-C', traffic: 'right' }, { pack: 'r149', fn: 'passing-C', traffic: 'left' }];
  return JSON.stringify(raw);
}

test('a version 1 study opens as version 2 and checks the same beams', () => {
  assert.equal(STUDY_VERSION, 2);
  // Version 1, other side on the mirror image: every market checks the lamp for its own side.
  const mirror = parseStudy(version1('mirror'));
  assert.equal(mirror.version, 2);
  assert.equal(/** @type {any} */ (mirror.lamp).otherTraffic, undefined);
  assert.deepEqual(mirror.markets.map(m => m.lamp), ['matching', 'matching']);
  assert.deepEqual(mirror.markets.map(m => beamKeyFor(mirror, m)), ['mirror', 'file']);
  // Version 1, other side as it is: the file everywhere, which for the right-hand points is the other side's lamp.
  const asIs = parseStudy(version1('as-is'));
  assert.deepEqual(asIs.markets.map(m => m.lamp), ['other', 'matching']);
  assert.deepEqual(asIs.markets.map(m => beamKeyFor(asIs, m)), ['file', 'file']);
  assert.throws(() => parseStudy(version1('mirror').replace('"version":1', '"version":7')), /versions 1 to 2/);
});

test('each market checks its own lamp, and one function can be checked on both', () => {
  // The engineer's request: R123's basic passing beam on right-hand points, checked on the left-hand lamp as it is,
  // beside the right-hand lamp for approval.
  const study = leftHandStudy([
    { pack: 'r123', fn: 'passing-C', traffic: 'right', lamp: 'other' },
    { pack: 'r123', fn: 'passing-C', traffic: 'right', lamp: 'matching' },
  ]);
  const { analysis } = analyseStudy(parseStudy(serializeStudy(study)), null);
  assert.deepEqual(analysis.markets.map(m => m.beam), ['file', 'mirror']);
  assert.notEqual(analysis.markets[0].key, analysis.markets[1].key);
  assert.equal(pairPhrase(study, study.markets[0]), 'Left-hand lamp on right-hand test points');
  assert.equal(pairPhrase(study, study.markets[1]), 'Right-hand lamp on right-hand test points');
  assert.match(pairSentence(study, study.markets[0], 'UN R123') ?? '', /^Checks your left-hand lamp \(the file as it is\) on UN R123's right-hand traffic test points\. A lamp for one side usually fails/);
  assert.match(pairSentence(study, study.markets[1], 'UN R123') ?? '', /your right-hand lamp \(the left-hand file mirrored\)/);
});

test('a market keeps its lamp when Made for changes; which beam is that lamp follows the file', () => {
  const study = leftHandStudy([
    { pack: 'r149', fn: 'passing-C', traffic: 'right', lamp: 'matching' },
    { pack: 'r149', fn: 'passing-C', traffic: 'right', lamp: 'other' },
  ]);
  const before = study.markets.map(m => [lampOf(study, m)?.side, beamKeyFor(study, m)]);
  study.lamp.traffic = 'right';
  const after = study.markets.map(m => [lampOf(study, m)?.side, beamKeyFor(study, m)]);
  assert.deepEqual(before, [['right', 'mirror'], ['left', 'file']]);
  assert.deepEqual(after, [['right', 'file'], ['left', 'mirror']]);
});

test('a traffic-change function checks the lamp of its own system, and says so', () => {
  const study = leftHandStudy([{ pack: 'r123', fn: 'traffic-change', traffic: 'left', lamp: 'matching' }]);
  const l = lampOf(study, study.markets[0]);
  assert.deepEqual(l, { side: 'left', mirrored: false, crossed: false, system: true });
  assert.equal(pairPhrase(study, study.markets[0]), 'Left-hand lamp in right-hand traffic');
  assert.equal(beamKeyFor(study, study.markets[0]), 'file');
  study.markets[0].lamp = 'other';
  assert.throws(() => parseStudy(serializeStudy(study)), /own system/);
});

test('a signal lamp has no lamp side to choose', () => {
  const study = leftHandStudy([{ pack: 'r148', fn: 'stop-S1', traffic: 'right', lamp: 'matching' }]);
  study.lamp.role = 'stop';
  assert.equal(lampOf(study, study.markets[0]), null);
  assert.equal(pairPhrase(study, study.markets[0]), null);
  assert.equal(beamKeyFor(study, study.markets[0]), 'file');
});
