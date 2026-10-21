'use strict';
const assert = require('node:assert/strict');
const pack = require('../data-package.json');
const doc = require('../manual-revisions.json');
const {apply} = require('./review-remaining-place-boundaries');
const byId = new Map(doc.overrides.map(row => [row.chapter_id, row.changes]));

assert(!byId.get(68).places.some(row => row.word === '徐城'));
assert.equal(byId.get(68).lexical_reviews['places:徐城'].status, 'rejected');
assert(!byId.get(71).places.some(row => row.word === '遵化道'));
assert(byId.get(71).places.some(row => row.word === '遵化'));
assert(byId.get(71).segmentation_note.includes('遵化 / 道 / 。'));
assert(!byId.get(285).places.some(row => row.word === '云南军'));
assert(!byId.get(285).places.some(row => row.word === '河南道'));
assert(byId.get(285).places.some(row => row.word === '云南'));
assert(byId.get(285).places.some(row => row.word === '河南'));
assert(byId.get(285).segmentation_note.includes('河南 / 道 / 篆'));
assert.equal(apply(pack, doc).changes.length, 0, 'boundary review should be idempotent');
console.log('PASS remaining place boundary corrections and idempotence');
