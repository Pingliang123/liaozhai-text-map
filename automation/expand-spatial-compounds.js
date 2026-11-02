'use strict';

const fs = require('node:fs');
const Model = require('./ghost_map_model');
const Audit = require('./audit-spatial-integrity');

// 只收錄可由原文直接核對、且本身表示場域／方位場景的完整詞。
// 地名、人物名、器物名與成語不在此輪自動擴充。
const SPATIAL_COMPOUNDS = new Set([
  '房中', '郊郭', '田庐', '庭中', '园中', '田宅', '东郊', '室中',
  '市廛', '肆中', '良田', '廊下', '涧谷', '南郊', '斋中', '庐舍',
  '厅事', '市肆', '岩谷', '北渡', '幽谷', '乡井', '殿上', '廛间',
  '临街', '山市', '山谷', '洞房', '寺中', '第宅', '墙外', '青庐',
  '竹桥', '谷底', '庭下', '邑中', '荒园', '居宅', '园中', '庭中',
  '廊中', '门内', '门外', '狱门', '簷下', '檐下'
]);

const BULK_NOTE = '附件空间叙事框架审核通过；保留原文词形，纳入空间词。';

function apply() {
  const pkg = JSON.parse(fs.readFileSync('data-package.json', 'utf8'));
  const original = JSON.parse(fs.readFileSync('manual-revisions.json', 'utf8'));
  const doc = structuredClone(original);
  const model = Model.create(pkg.base);
  model.importDocument(original);
  const audit = Audit.review({ ...pkg, revisions: original }).report;
  const changes = [];
  const skipped = [];

  for (const item of audit.omissions) {
    const review = item.protected_review;
    if (!review || review.note !== BULK_NOTE) continue;
    const full = [...new Set((item.evidence || []).flatMap(e => e.containing || []))]
      .filter(term => SPATIAL_COMPOUNDS.has(term));
    if (!full.length) continue;
    const chapter = model.view(item.chapter_id);
    const sourceText = (chapter.source_units || []).map(unit => unit.text || unit.original || '').join('');
    if (!full.every(term => sourceText.includes(term))) {
      skipped.push({ ...item, action: 'skipped', reason: '完整詞未能在原文核對' });
      continue;
    }
    const row = doc.overrides.find(x => x.chapter_id === item.chapter_id);
    if (!row || !row.changes) throw new Error(`missing override ${item.chapter_id}`);
    const oldWords = row.changes.space_words || [];
    for (const term of full) if (!oldWords.includes(term)) oldWords.push(term);
    row.changes.space_words = oldWords;
    row.changes.lexical_reviews[`spaces:${item.word}`] = {
      status: 'corrected',
      word: full[0],
      kind: 'spaces',
      note: `按原文完整词扩充空间标注：${full.join('、')}；未删除原短词，以保留可追溯性。`
    };
    changes.push({
      chapter_id: item.chapter_id,
      chapter: item.chapter,
      omitted_word: item.word,
      spatial_compounds: full,
      evidence: item.evidence,
      action: 'add_complete_spatial_compound'
    });
  }

  const before = Model.create(pkg.base);
  before.importDocument(original);
  const after = Model.create(pkg.base);
  after.importDocument(doc);
  const beforeSnapshot = before.ids.map(id => { const c = before.view(id); return { id, source_units: c.source_units, place_words: c.place_words, space_words: c.space_words }; });
  const afterSnapshot = after.ids.map(id => { const c = after.view(id); return { id, source_units: c.source_units, place_words: c.place_words, space_words: c.space_words }; });
  for (const oldChapter of beforeSnapshot) {
    const next = afterSnapshot.find(x => x.id === oldChapter.id);
    if (JSON.stringify(oldChapter.source_units) !== JSON.stringify(next.source_units) || JSON.stringify(oldChapter.place_words) !== JSON.stringify(next.place_words)) {
      throw new Error(`unexpected source/place change in chapter ${oldChapter.id}`);
    }
  }

  fs.writeFileSync('manual-revisions.json', JSON.stringify(doc));
  const nextPkg = { ...pkg, revisions: doc };
  const remaining = Audit.review(nextPkg).report.omissions.length;
  const report = {
    source_sha256: pkg.base.source_sha256,
    policy: '只扩充原文可核对的明确空间组合；保留原短词与人工修订，不自动处理地名、人物名、器物名、成语。',
    summary: {
      changed_annotations: changes.length,
      changed_chapters: new Set(changes.map(x => x.chapter_id)).size,
      skipped_candidates: skipped.length,
      remaining_omissions: remaining
    },
    changes,
    skipped
  };
  fs.writeFileSync('reports/spatial-compound-expansion-20261102.json', JSON.stringify(report, null, 2) + '\n');
  fs.writeFileSync('reports/spatial-compound-expansion-20261102.md', [
    '# 空间完整词扩充审核（2026-11-02）', '',
    `本轮新增完整空间组合 ${changes.length} 项，涉及 ${report.summary.changed_chapters} 篇；剩余未通过词项筛选 ${remaining} 项。`,
    '', report.policy, '',
    '本报告保留每一项原文证据；未列入白名单的候选词不作自动判断，避免把地名、人物名或成语误归为空间词。', ''
  ].join('\n'));
  console.log(JSON.stringify(report.summary));
  return report;
}

if (require.main === module) apply();
module.exports = { apply };
