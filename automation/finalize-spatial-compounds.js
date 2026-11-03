'use strict';

const fs = require('node:fs');
const Audit = require('./audit-spatial-integrity');

const EXPANSION_REPORT = 'reports/spatial-compound-expansion-20261102.json';
const source = JSON.parse(fs.readFileSync('manual-revisions.json', 'utf8'));
const report = JSON.parse(fs.readFileSync(EXPANSION_REPORT, 'utf8'));
const doc = structuredClone(source);
const changes = [];

for (const item of report.changes) {
  const row = doc.overrides.find(x => x.chapter_id === item.chapter_id);
  if (!row?.changes) continue;
  const review = row.changes.lexical_reviews?.[`spaces:${item.omitted_word}`];
  if (!review || review.note !== `按原文完整词扩充空间标注：${item.spatial_compounds.join('、')}；未删除原短词，以保留可追溯性。`) continue;
  if (!(row.changes.space_words || []).includes(item.omitted_word)) continue;
  row.changes.space_words = row.changes.space_words.filter(word => word !== item.omitted_word);
  review.note = `原文完整空间词已纳入索引：${item.spatial_compounds.join('、')}；移除不独立成词的短词，保留原文证据。`;
  changes.push({ ...item, action: 'remove_redundant_short_index' });
}

fs.writeFileSync('manual-revisions.json', JSON.stringify(doc));
const pkg = JSON.parse(fs.readFileSync('data-package.json', 'utf8'));
const remaining = Audit.review({ ...pkg, revisions: doc }).report.omissions.length;
const out = {
  source_sha256: pkg.base.source_sha256,
  policy: '仅移除已经被同一原文完整空间词替代的短词索引；人工接受、人工修订和原文均保留。',
  summary: { removed_redundant_short_indexes: changes.length, remaining_omissions: remaining },
  changes
};
fs.writeFileSync('reports/spatial-compound-finalization-20261103.json', JSON.stringify(out, null, 2) + '\n');
fs.writeFileSync('reports/spatial-compound-finalization-20261103.md', [
  '# 空间完整词索引收束（2026-11-03）', '',
  `本轮移除 ${changes.length} 个已被完整空间词替代的短词索引；剩余未通过词项筛选 ${remaining} 项。`,
  '', out.policy, '',
  '原文、完整空间词与每项修订记录均保留。', ''
].join('\n'));
console.log(JSON.stringify(out.summary));
