'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const M = require('./ghost_map_model');
const pkg = JSON.parse(fs.readFileSync('data-package.json', 'utf8'));
const doc = JSON.parse(fs.readFileSync('manual-revisions.json', 'utf8'));
const applied = JSON.parse(fs.readFileSync('reports/attachment-space-otherworld-application-20261021.json'));
const audit = JSON.parse(fs.readFileSync('reports/attachment-space-otherworld-audit-20261021.json'));
const model = M.create(pkg.base); model.importDocument(doc);
assert.equal(applied.approved, true);
assert(applied.space_additions > 0);
assert(applied.evidence_additions > 0);
for (const row of audit.high_priority_gaps) {
  const seen = pkg.base.chapter_overview.some(chapter => (chapter.source_units || []).some(unit => unit.text.includes(row.term)) && (
    row.kind === 'space' ? model.view(chapter.chapter_id).space_words.includes(row.term) : chapter.realm_evidence.some(e => e.space === row.term)
  ));
  assert(seen, `${row.kind}:${row.term} 未写入统一资料`);
}
assert(model.view(2).places.some(row => row.word === '阳信'), '既有人工地点数据不应被覆盖');
console.log('PASS approved attachment candidates are in canonical data and prior edits remain');
