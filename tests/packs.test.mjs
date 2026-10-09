import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PACKS, NOT_CHECKED, functionById, defaultMarkets, ROLES } from '../src/core/regulation/catalog.js';
import { applicable } from '../src/core/regulation/engine.js';

test('every requirement of every pack cites its source, and its references hold together', () => {
  for (const pack of PACKS) {
    const conditions = new Set(pack.conditions.map(c => c.id));
    for (const fn of pack.functions) {
      const ids = new Set();
      for (const r of fn.requirements) {
        const where = `${pack.id} ${fn.id} ${r.id}`;
        assert.ok(typeof r.cite === 'string' && r.cite.length > 8, `${where} cites its source`);
        assert.ok(!ids.has(r.id), `${where} is unique in its function`);
        ids.add(r.id);
        for (const c of r.when ?? []) assert.ok(conditions.has(c), `${where} depends on a declared condition (${c})`);
        if (r.kind !== 'note' && r.kind !== 'imax' && r.kind !== 'relative' && r.kind !== 'distribution') assert.ok(r.min !== undefined || r.max !== undefined, `${where} has a limit`);
      }
      for (const r of fn.requirements) if (r.replaces) assert.ok(ids.has(r.replaces), `${pack.id} ${fn.id} ${r.id} replaces a requirement that exists`);
    }
  }
});

test('transcribed values stay as the official texts print them', () => {
  /** @param {string} pack @param {string} fn @param {string} id */
  const req = (pack, fn, id) => functionById(pack, fn)?.requirements.find(r => r.id === id);
  // UN R148 01 series Table 8 (as replaced by Supplement 2) and Table 7: axis minima.
  assert.equal(req('r148', 'direction-indicator-1', 'HV')?.min, 175);
  assert.equal(req('r148', 'stop-S1', 'HV')?.min, 60);
  // UN R123 Annex 3 Table 1 Part A, line 11: 75R for Class C.
  assert.equal(req('r123', 'passing-C', '75R')?.min, 10100);
  // FMVSS 108 Table XIX-a, LB1V, 0.6D-1.3R; Table XVIII, UB1, H-V.
  assert.equal(req('fmvss108', 'lower-LB1V', '0.6D-1.3R')?.min, 10000);
  assert.deepEqual([req('fmvss108', 'upper-UB1', 'H-V')?.min, req('fmvss108', 'upper-UB1', 'H-V')?.max], [40000, 70000]);
  // FMVSS 108 Table VI-a, front turn signal, one section, base values: the group totals.
  assert.deepEqual(['Group 1', 'Group 2', 'Group 3'].map(id => req('fmvss108', 'front-turn-1-x1', id)?.min), [130, 250, 950]);
});

test('a condition brings in its variants and drops what they replace', () => {
  const fn = functionById('r148', 'direction-indicator-1');
  assert.ok(fn);
  const ids = (/** @type {string[]} */ c) => applicable(fn.requirements, c).map(r => r.id);
  assert.ok(ids([]).includes('field') && !ids([]).includes('field, low mounting'));
  assert.ok(ids(['low-mounting']).includes('field, low mounting') && !ids(['low-mounting']).includes('field'));
});

test('adopted national packs stand on data Cutline holds, and the rest say why they are not checked', () => {
  for (const pack of PACKS.filter(p => p.provenance === 'adopted')) {
    assert.ok(pack.basis && PACKS.some(p => p.id === pack.basis), `${pack.id} names the pack it checks`);
    assert.ok(pack.statement.length > 20, `${pack.id} explains its provenance`);
  }
  for (const n of NOT_CHECKED) assert.ok(n.reason.length > 20, `${n.jurisdiction} ${n.document} says why`);
});

test('every lamp role has at least one market', () => {
  for (const role of /** @type {(keyof typeof ROLES)[]} */ (Object.keys(ROLES))) assert.ok(defaultMarkets(role).length > 0, role);
});
