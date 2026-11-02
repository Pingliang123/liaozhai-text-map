'use strict';

const fs = require('node:fs');
const assert = require('node:assert/strict');
const Model = require('./ghost_map_model');
const report = JSON.parse(fs.readFileSync('reports/spatial-compound-expansion-20261102.json', 'utf8'));
const pkg = JSON.parse(fs.readFileSync('data-package.json', 'utf8'));
const revisions = JSON.parse(fs.readFileSync('manual-revisions.json', 'utf8'));
const model = Model.create(pkg.base);
model.importDocument(revisions);

assert.ok(report.summary.changed_annotations > 0, 'no spatial compound was expanded');
assert.equal(report.source_sha256, pkg.base.source_sha256);
for (const change of report.changes) {
  const chapter = model.view(change.chapter_id);
  for (const term of change.spatial_compounds) {
    assert.ok(chapter.space_words.includes(term), `${change.chapter_id} missing ${term}`);
    const sourceText = (chapter.source_units || []).map(unit => unit.text || unit.original || '').join('');
    assert.ok(sourceText.includes(term), `${change.chapter_id} source missing ${term}`);
  }
}
const seatfang = model.view(411);
assert.ok((seatfang.source_units || []).some(unit => (unit.text || unit.original || '').includes('三四椽')), '席方平 source disappeared');
console.log(`spatial compound expansion ok: ${report.summary.changed_annotations} annotations`);
