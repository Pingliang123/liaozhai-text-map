'use strict';

const fs = require('node:fs');
const assert = require('node:assert/strict');
const out = JSON.parse(fs.readFileSync('reports/spatial-compound-finalization-20261103.json', 'utf8'));
const pkg = JSON.parse(fs.readFileSync('data-package.json', 'utf8'));
const revisions = JSON.parse(fs.readFileSync('manual-revisions.json', 'utf8'));

assert.equal(out.source_sha256, pkg.base.source_sha256);
assert.ok(out.summary.removed_redundant_short_indexes > 0);
for (const item of out.changes) {
  const row = revisions.overrides.find(x => x.chapter_id === item.chapter_id);
  assert.ok(!row.changes.space_words.includes(item.omitted_word), `${item.chapter_id} retained ${item.omitted_word}`);
  for (const term of item.spatial_compounds) assert.ok(row.changes.space_words.includes(term), `${item.chapter_id} missing ${term}`);
}
console.log(`spatial compound finalization ok: ${out.summary.removed_redundant_short_indexes} indexes`);
