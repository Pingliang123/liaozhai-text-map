'use strict';
const assert = require('node:assert/strict');
const doc = require('../manual-revisions.json');
const byId = new Map(doc.overrides.map(row => [row.chapter_id, row]));
assert.deepEqual(byId.get(274).changes.event_types, {人: 1}, '《颠道人》必须保留人工判断：人');
assert.deepEqual(byId.get(402).changes.event_types, {人: 1}, '《曹操冢》必须保留人工判断：人');
console.log('PASS explicit manual event-type cases are preserved');
