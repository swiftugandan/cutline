import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { designJsonSchema } from '../src/core/schema.js';
import { defaultDesign, switchVariant, parseDesign, serializeDesign } from '../src/core/model.js';
import { schemaErrors } from './json-schema.mjs';

const committed = JSON.parse(readFileSync(new URL('../schema/cutline.design.v1.schema.json', import.meta.url), 'utf8'));

test('the committed schema matches the design spec (run node scripts/build-schema.mjs)', () => {
  assert.deepEqual(designJsonSchema(), committed);
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
