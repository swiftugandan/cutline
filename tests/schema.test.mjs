import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { designJsonSchema, SCHEMAS, jsonSchemaFor, schemaFileName } from '../src/core/schema.js';
import { defaultDesign, switchVariant, parseDesign, serializeDesign } from '../src/core/model.js';
import { defaultStudy, parseStudy, serializeStudy, setRole } from '../src/core/study.js';
import { defaultVehicle, parseVehicle, serializeVehicle } from '../src/core/vehicle.js';
import { schemaErrors } from './json-schema.mjs';

/** @param {string} file */
const read = file => JSON.parse(readFileSync(new URL(`../schema/${file}`, import.meta.url), 'utf8'));
const committed = read('cutline.design.v1.schema.json');

test('every committed schema matches its spec (run node scripts/build-schema.mjs)', () => {
  assert.deepEqual(designJsonSchema(), committed);
  for (const entry of SCHEMAS) assert.deepEqual(jsonSchemaFor(entry), read(schemaFileName(entry)), entry.name);
});

test('the photometry schema accepts the studies the app writes and rejects what the loader rejects', () => {
  const schema = read('cutline.photometry.v1.schema.json');
  const signal = defaultStudy();
  setRole(signal, 'turn-front');
  signal.targets.push({ name: 'Wide', shape: 'zone', h0: -20, v0: -5, h1: 20, v1: 5, limit: 'min', min: 1, max: 0, unit: 'cd' });
  signal.conditions.push('r148:low-mounting');
  for (const study of [defaultStudy(), signal]) {
    assert.deepEqual(schemaErrors(schema, study), []);
    assert.deepEqual(parseStudy(serializeStudy(study)), study);
  }
  const bad = [
    (/** @type {any} */ s) => { s.lamp.role = 'laser'; },
    (/** @type {any} */ s) => { s.targets.push({ name: 'x' }); },
    (/** @type {any} */ s) => { s.display.beam.contours = 'many'; },
  ];
  for (const mutate of bad) {
    const study = defaultStudy(); mutate(study);
    assert.notDeepEqual(schemaErrors(schema, study), []);
    assert.throws(() => parseStudy(JSON.stringify(study)));
  }
  // A market the catalogue does not hold passes the schema but not the loader's rules.
  const unknown = defaultStudy();
  unknown.markets.push({ pack: 'nowhere', fn: 'x', traffic: 'right' });
  assert.throws(() => parseStudy(JSON.stringify(unknown)), /no regulation/);
});

test('the vehicle schema accepts the vehicles the app writes and rejects what the loader rejects', () => {
  const schema = read('cutline.vehicle.v1.schema.json');
  const v = defaultVehicle();
  v.lamps.push({ name: 'Stop left', role: 'stop', facing: 'rear', x: -4450, y: 600, z: 700, width: 150, height: 50 });
  assert.deepEqual(schemaErrors(schema, v), []);
  assert.deepEqual(parseVehicle(serializeVehicle(v)), v);
  for (const mutate of [(/** @type {any} */ d) => { d.lamps[0].role = 'laser'; }, (/** @type {any} */ d) => { d.lamps[0].width = 0; }, (/** @type {any} */ d) => { d.model.units = 'ft'; }]) {
    const bad = structuredClone(v); mutate(bad);
    assert.notDeepEqual(schemaErrors(schema, bad), []);
    assert.throws(() => parseVehicle(JSON.stringify(bad)));
  }
});

test('the schema accepts every design variant the app can write', () => {
  const reflector = defaultDesign();
  switchVariant(reflector, 'optics', 'reflector');
  const designs = [defaultDesign(), reflector, { ...defaultDesign(), beamClass: 'B', traffic: 'left' }];
  for (const design of designs) assert.deepEqual(schemaErrors(committed, design), []);
});

test('the schema rejects the structural errors the loader rejects', () => {
  const bad = [
    d => { d.led.flux = -1; },
    d => { d.cutoff.extra = 1; },
    d => { delete d.cover.haze; },
    d => { d.simulation.rays = 1.5; },
    d => { d.beamClass = 'D'; },
    d => { d.optics.type = 'laser'; },
  ];
  for (const mutate of bad) {
    const design = defaultDesign(); mutate(design);
    assert.notDeepEqual(schemaErrors(committed, design), []);
    assert.throws(() => parseDesign(JSON.stringify(design)));
  }
});

test('a design survives a round trip through its file format', () => {
  const d = defaultDesign();
  switchVariant(d, 'optics', 'reflector');
  assert.deepEqual(parseDesign(serializeDesign(d)), d);
});
