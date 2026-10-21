'use strict';
const fs = require('node:fs');

const path = 'manual-revisions.json';
const doc = JSON.parse(fs.readFileSync(path, 'utf8'));
const target = doc.overrides.find(row => row.chapter_id === 274);
if (!target) throw new Error('找不到《颠道人》修订记录');
target.changes.event_types = {人: 1};
fs.writeFileSync(path, JSON.stringify(doc));
console.log('Restored explicit manual event type: 颠道人=人');
