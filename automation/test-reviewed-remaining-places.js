'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const M = require('./ghost_map_model');
const {entries, apply} = require('./complete-reviewed-remaining-places');

const pack = require('../data-package.json');
const doc = require('../manual-revisions.json');
const result = apply(pack, doc);
const changed = new Map(result.changes.map(row => [row.word, row]));
for (const word of ['平原','济阳','龙虎山','淮阳','永年','齐河','宛平','真定','陕中']) {
  assert(changed.has(word), `${word} should have a reviewed decision`);
  assert.equal(changed.get(word).location.coordinate_kind, 'approximate');
  assert(Number.isFinite(changed.get(word).location.lon));
}
assert.equal(changed.get('永年').location.parent_id, 'place-广平府', '不能把广平县当成广平府');
assert.notEqual(changed.get('汉水').location.parent_id, 'custom-place-%E6%B1%89%E6%B1%9F', '同一河流的别称不是行政父子');
assert(result.held.some(row => row.word === '金山'), 'ambiguous 金山 should remain held');
const model = M.create(pack.base); model.importDocument(doc);
for (const word of Object.keys(entries)) {
  const location = model.placeInfo(word);
  assert(Number.isFinite(location.lon) && Number.isFinite(location.lat), `${word} should be present in the published place data`);
}
const before = JSON.stringify(doc);
const after = JSON.stringify(apply(pack, doc).revisions);
assert.equal(after, JSON.stringify(apply(pack, doc).revisions), 'review should be idempotent');
assert.equal(JSON.stringify(doc), before, 'review must not mutate the input document');
console.log(`Reviewed remaining place tests passed: ${result.changes.length} promotable, ${result.held.length} held`);
