'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const report = require('../reports/attachment-space-otherworld-audit-20261021.json');
assert.equal(report.attachment.title, '《聊斋志异》空间的书写与内在意蕴');
assert.equal(report.chapters, 491);
assert(report.summary.high_priority_gaps > 0);
for (const row of report.high_priority_gaps) { assert(row.examples.length > 0, row.term + ' 缺少原文证据'); assert(['space', 'otherworld'].includes(row.kind)); }
assert.equal(report.summary.untouched_annotations, true);
assert(fs.existsSync('reports/attachment-space-otherworld-audit-20261021.md'));
console.log('PASS attachment framework audit keeps source evidence and does not overwrite annotations');
