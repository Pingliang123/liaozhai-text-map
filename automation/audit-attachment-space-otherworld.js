'use strict';

// The attached thesis is an interpretive framework, not a vocabulary list.
// This audit turns its space types into reviewable lexical candidates while
// preserving the canonical annotations and all prior manual decisions.
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'data-package.json'), 'utf8'));
const chapters = pkg.base.chapter_overview || [];
const source = path.join(process.env.USERPROFILE || '', 'Documents', 'xwechat_files', 'wxid_3mjl00j7owt022_ca95', 'msg', 'file', '2026-10', 'fb261021185536.pdf');
const framework = {
  religious: '寺庙、祠、观、殿等宗教／仪式空间',
  domestic: '宅、庐、室、堂、厅、厢、廊等居所与内部空间',
  public: '市、街、店、驿、桥、渡等公共／行旅空间',
  natural: '山、野、郊、洞、谷、河岸等开放自然与边界空间',
  underworld: '冥府、地府、阴司、地狱及其内部场所',
  immortal: '天宫、月宫、仙岛、仙乡等仙境空间',
  demon: '罗刹国、夜叉国、毒龙国、龙宫等异类／异域空间',
  dream: '梦中、梦境及由梦境触发的空间转换'
};
const spaceGroups = {
  domestic: ['宅', '庐', '厅', '厨', '厢', '客舍', '客店', '驿亭', '楼台'],
  public: ['市', '街', '肆', '廛', '店', '桥', '渡', '舟', '船', '驿'],
  natural: ['郊', '岩', '谷', '井', '田', '庄', '穴', '岸边']
};
const otherworldGroups = {
  underworld: ['黄泉', '天堂', '枉死城', '奈河', '奈何桥'],
  immortal: ['仙乡', '月宫', '广寒宫', '天门', '王母宫', '洞府'],
  demon: ['夜叉国', '毒龙国', '罗刹国', '大罗刹国', '龙宫', '水府', '海市']
};
function allTexts(chapter) { return (chapter.source_units || []).map(unit => ({unit: unit.unit, text: unit.text || unit.original || ''})); }
function evidence(chapter, word) {
  const spaces = new Set(chapter.space_words || []), places = new Set((chapter.places || []).map(row => row.word));
  const realms = (chapter.realm_evidence || []).filter(row => row.space === word);
  return allTexts(chapter).filter(unit => unit.text.includes(word)).map(unit => ({
    chapter_id: chapter.chapter_id, chapter: chapter.chapter, unit: unit.unit, excerpt: unit.text,
    existing_space: spaces.has(word), existing_place: places.has(word),
    existing_otherworld: realms.some(row => row.unit === unit.unit),
    realm_evidence_ids: realms.filter(row => row.unit === unit.unit).map(row => row.id)
  }));
}
function collect(kind, group, terms) { return terms.map(term => {
  const rows = chapters.flatMap(chapter => evidence(chapter, term));
  const annotated = rows.filter(row => kind === 'space' ? row.existing_space : row.existing_otherworld);
  const places = rows.filter(row => row.existing_place);
  return {term, kind, framework_group: group, framework_label: framework[group],
    status: !rows.length ? '未出现' : !annotated.length ? '未标注' : annotated.length < rows.length ? '部分标注' : '已标注',
    occurrences: rows.length, chapters: [...new Set(rows.map(row => row.chapter_id))].length,
    place_overlap: places.length, examples: rows.slice(0, 8)};
}).filter(row => row.occurrences); }
const rows = Object.entries({...spaceGroups, ...otherworldGroups}).flatMap(([group, terms]) => collect(
  ['domestic', 'public', 'natural'].includes(group) ? 'space' : 'otherworld', group, terms));
const missing = rows.filter(row => ['未标注', '部分标注'].includes(row.status));
const confirmedGaps = missing.filter(row => ['宅', '庐', '厅', '厨', '厢', '客舍', '客店', '仙乡', '黄泉'].includes(row.term));
const report = {schema_version: 1, generated_at: new Date().toISOString(), source_sha256: pkg.base.source_sha256, corpus_id: pkg.base.corpus_id,
  attachment: {file: 'fb261021185536.pdf', title: '《聊斋志异》空间的书写与内在意蕴', method: '按附件的宗教、居所、公共／行旅、自然边界、冥界、仙境、梦境框架，将候选词逐篇回查原文；候选不等于自动接受。', source_present: fs.existsSync(source)},
  chapters: chapters.length, framework, summary: {candidates: rows.length, review_rows: missing.length, high_priority_gaps: confirmedGaps.length, untouched_annotations: true}, rows, high_priority_gaps: confirmedGaps};
const reportDir = path.join(root, 'reports'); fs.mkdirSync(reportDir, {recursive: true});
fs.writeFileSync(path.join(reportDir, 'attachment-space-otherworld-audit-20261021.json'), JSON.stringify(report, null, 2));
const md = ['# 附件框架：空间词与异境词遗漏核查', '', `资料源：\`data-package.json\`；${chapters.length}篇。附件：${report.attachment.title}（${report.attachment.file}）。`, '', '本报告只做候选审计，不自动改写原有人工标注。空间词必须回到具体原文语境确认；异境词必须区分实际进入、篇内提及和比喻。', '', `候选${rows.length}项；需核${missing.length}项；优先检查${confirmedGaps.length}项。`, '', '## 优先检查', '', '|词|类别|框架位置|出现篇数|原文次数|当前状态|', '|---|---|---|---:|---:|---|', ...confirmedGaps.map(row => `|${row.term}|${row.kind === 'space' ? '空间词' : '异境词'}|${row.framework_label}|${row.chapters}|${row.occurrences}|${row.status}|`), '', '## 全部待核候选', '', '|词|类别|框架位置|出现篇数|原文次数|当前状态|', '|---|---|---|---:|---:|---|', ...missing.map(row => `|${row.term}|${row.kind === 'space' ? '空间词' : '异境词'}|${row.framework_label}|${row.chapters}|${row.occurrences}|${row.status}|`), '', '## 原文证据', '', ...missing.flatMap(row => [`### ${row.term} · ${row.kind === 'space' ? '空间词' : '异境词'} · ${row.status}`, '', ...row.examples.map(example => `- 《${example.chapter}》第${example.unit}单位：${example.excerpt}`), '']), '## 判读规则', '', '- “宅、庐、厅、厨、厢、客舍、客店”是附件所说的居所／内部空间候选；报告列出原文证据，但不把每次出现自动视为同一种空间功能。', '- “仙乡”“黄泉”有明确异境语义，应优先补入异境词审核；“天堂”“地狱”若处于比喻句，不能直接当作人物到访。', '- “奈河、枉死城、月宫、广寒宫、天门、王母宫、洞府”等若已有证据，报告仍列出其覆盖情况，防止重复添加。', '- 本轮没有覆盖人物、地点、分词、异事类型或既有人工修改。'].join('\n');
fs.writeFileSync(path.join(reportDir, 'attachment-space-otherworld-audit-20261021.md'), md);
console.log(JSON.stringify(report.summary));
module.exports = {report, collect};
