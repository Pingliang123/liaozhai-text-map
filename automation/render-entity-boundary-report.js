const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const inputPath = path.join(root, 'reports', 'entity-boundary-application.json');
const outputPath = path.join(root, 'reports', 'entity-boundary-application.md');
const report = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

const labels = { people: '人物', spaces: '空间', times: '时间', places: '地点' };
const rows = report.chapters.flatMap((chapter) =>
  chapter.applied.map((item) => ({ ...item, chapter: chapter.chapter, chapter_id: chapter.chapter_id }))
);
const escape = (value) => String(value ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
const countBy = (items, key) => items.reduce((map, item) => {
  const value = item[key] || '未分类';
  map[value] = (map[value] || 0) + 1;
  return map;
}, {});

const chapterTotals = report.chapters
  .map((chapter) => ({ chapter: chapter.chapter, count: chapter.applied.length }))
  .sort((a, b) => b.count - a.count || a.chapter.localeCompare(b.chapter, 'zh'));
const heldByReason = countBy(report.held, 'reason');
const heldByKind = {};
for (const item of report.held) for (const kind of item.kinds || []) heldByKind[kind] = (heldByKind[kind] || 0) + 1;

const lines = [
  '# 人物、空間、時間、地點詞分詞修訂報告',
  '',
  `- 來源：\`entity-boundary-application.json\``,
  `- 覆蓋篇目：${report.chapters.length} 篇`,
  `- 自動套用修訂：${rows.length} 處`,
  `- 保留待核：${report.held.length} 處`,
  `- 原文基線 SHA-256：\`${report.source_sha256}\``,
  '',
  '## 修訂總量',
  '',
  '| 類別 | 修訂處數 |',
  '| --- | ---: |',
  ...Object.entries(report.counts).map(([kind, count]) => `| ${labels[kind] || kind} | ${count} |`),
  `| 合計 | ${rows.length} |`,
  '',
  '## 修改最多的篇目',
  '',
  '| 篇目 | 修訂處數 |',
  '| --- | ---: |',
  ...chapterTotals.slice(0, 30).map((item) => `| ${escape(item.chapter)} | ${item.count} |`),
  '',
  '## 代表性修訂（前 120 條）',
  '',
  '下表列出實際套用的詞、類別與原文引句；完整逐條資料仍保留在 JSON 報告中。',
  '',
  '| 篇目 | 類別 | 詞 | 修訂類型 | 原文引句 |',
  '| --- | --- | --- | --- | --- |',
  ...rows.slice(0, 120).map((item) => `| ${escape(item.chapter)} | ${(item.kinds || []).map((kind) => labels[kind] || kind).join('、')} | ${escape(item.word)} | ${escape(item.kind)} | ${escape(item.quote)} |`),
  '',
  '## 保留待核',
  '',
  '這些項目沒有被強行改動，原因按原始報告統計如下。',
  '',
  '| 原因 | 數量 |',
  '| --- | ---: |',
  ...Object.entries(heldByReason).map(([reason, count]) => `| ${escape(reason)} | ${count} |`),
  '',
  '| 類別 | 待核數 |',
  '| --- | ---: |',
  ...Object.entries(heldByKind).map(([kind, count]) => `| ${labels[kind] || kind} | ${count} |`),
  '',
  '完整逐條報告：[entity-boundary-application.json](./entity-boundary-application.json)',
  '',
  '> 说明：本报告只整理已经生成的修订结果，不改变数据。需要撤回时，以 JSON 中的 `source_sha256`、篇目和 `start/end` 作为稳定核对依据。',
  ''
];

fs.writeFileSync(outputPath, lines.join('\n'), 'utf8');
console.log(`wrote ${outputPath}`);
