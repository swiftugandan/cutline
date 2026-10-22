import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeIesTypeA } from '../src/core/distribution/ies.js';
import { defaultStudy } from '../src/core/study.js';
import { analyseStudy } from '../src/core/study-analysis.js';
import { DEAD_BAND } from '../src/core/traffic-side.js';
import { trafficVerdict } from '../src/ui/traffic-note.js';

/** @import { Study } from '../src/core/study.js' */

/** @param {number} lo @param {number} hi @param {number} step */
const range = (lo, hi, step) => Array.from({ length: Math.round((hi - lo) / step) + 1 }, (_, i) => +(lo + i * step).toFixed(6));

/**
 * A passing beam whose cut-off lies at 0.57°D on the side of oncoming traffic and, past an elbow, rises at `rise` degrees
 * to a shoulder 1.5° higher on the kerb side: the right for right-hand traffic (side 1), the left for left-hand (−1).
 * @param {1 | -1} side @param {{ elbow?: number, up?: number, rise?: number, soft?: number }} [o]
 */
function passing(side, { elbow = 0, up = 0, rise = 15, soft = 0.08 } = {}) {
  const cut = (/** @type {number} */ h) => -0.57 + up + Math.min(1.5, Math.max(0, side * h - elbow) * Math.tan(rise * Math.PI / 180));
  return (/** @type {number} */ h, /** @type {number} */ v) => 15000 * Math.exp(-((h / 12) ** 2)) * 10 ** (-2 / (1 + Math.exp(-(v - cut(h)) / soft))) + 20;
}

/** A study of a passing beam given by a function, with angles `step` degrees apart vertically. @param {(h: number, v: number) => number} f */
function studyOf(f, step = 0.1) {
  const study = defaultStudy();
  study.source = { name: 'low.ies', text: writeIesTypeA({ title: 'x', horizontal: range(-40, 40, 0.5), vertical: range(-20, 20, step), candela: f }) };
  // The side is read on the file, before any market.
  study.markets = [];
  return study;
}

/** @param {Study} study */
const readingOf = study => analyseStudy(study, null).analysis.traffic;

test('a passing beam shows its traffic side by the side its cut-off rises on', () => {
  const right = readingOf(studyOf(passing(1))), left = readingOf(studyOf(passing(-1)));
  assert.equal(right?.side, 'right'); assert.equal(right?.reason, 'rise');
  assert.equal(left?.side, 'left');
  // The scans at 1.5°, 2.5° and 3.5° meet a 15° rise from V-V at 0.40°, 0.67° and 0.94° above the level part.
  assert.ok(Math.abs((right?.rise ?? 0) - 0.67) < 0.1, `rise ${right?.rise}`);
  assert.ok(Math.abs((right?.rise ?? 0) + (left?.rise ?? 0)) < 0.02, 'the two sides mirror each other');
});

test('the side is read on the file as measured, aimed or not', () => {
  // Elbow 1° to the right of V-V and the whole beam 2° high: a file straight off the goniometer.
  assert.equal(readingOf(studyOf(passing(1, { elbow: 1, up: 2 })))?.side, 'right');
  // A soft 45° cut-off.
  assert.equal(readingOf(studyOf(passing(-1, { rise: 45, soft: 0.2 })))?.side, 'left');
});

test('a level cut-off, no cut-off or a coarse file does not show a side', () => {
  const level = readingOf(studyOf((h, v) => 15000 * Math.exp(-((h / 10) ** 2)) * 10 ** (-2 / (1 + Math.exp(-(v + 1) / 0.08))) + 20));
  assert.equal(level?.side, null); assert.equal(level?.reason, 'level');
  assert.ok(Math.abs(level?.rise ?? 1) <= DEAD_BAND);
  const smooth = readingOf(studyOf((h, v) => 20000 * Math.exp(-((h / 8) ** 2) - ((v / 4) ** 2)) + 20));
  assert.equal(smooth?.side, null); assert.equal(smooth?.reason, 'no-cutoff');
  const coarse = readingOf(studyOf(passing(1), 1));
  assert.equal(coarse?.side, null); assert.equal(coarse?.reason, 'coarse');
});

test('the side follows the mapping, and only a passing beam is read', () => {
  const study = studyOf(passing(-1));
  study.mapping.mirror = 'yes';
  assert.equal(readingOf(study)?.side, 'right', 'a mirrored file is the lamp for the other side');
  study.mapping.mirror = 'no';
  study.lamp.role = 'driving';
  study.markets = [{ pack: 'r149', fn: 'driving-B', traffic: 'right', lamp: 'matching' }];
  assert.equal(readingOf(study), null);
});

test('a study made for the side its file is not for says so, and how to put it right', () => {
  // The report from the field: a left-hand traffic file in a study made for right-hand traffic, checked for a
  // right-hand traffic market, puts the file's own beam under right-hand traffic test points.
  const study = studyOf(passing(-1));
  study.lamp.traffic = 'right';
  study.markets = [{ pack: 'r149', fn: 'passing-C', traffic: 'right', lamp: 'matching' }];
  const { analysis } = analyseStudy(study, null);
  assert.equal(analysis.markets[0].beam, 'file');
  // The three-line aim finds no rise on the right of this beam, so it leaves the beam where it is across rather than
  // sending it wherever a level line happens to meet line B.
  assert.equal(analysis.markets[0].aim.dh, 0);
  assert.ok(analysis.markets[0].aim.notes.some(n => /does not rise across the scans/.test(n)), analysis.markets[0].aim.notes.join(' '));
  const v = trafficVerdict(study, analysis.traffic);
  assert.equal(v?.kind, 'mismatch'); assert.equal(v?.side, 'left');
  assert.match(v?.text ?? '', /higher on the left than on the right, as on a lamp for left-hand traffic, but the study says it is made for right-hand traffic/);
  study.lamp.traffic = 'left';
  assert.equal(trafficVerdict(study, analysis.traffic)?.kind, 'match');
  // A signal lamp has no traffic side to read.
  study.lamp.role = 'stop';
  assert.equal(trafficVerdict(study, analysis.traffic), null);
});
