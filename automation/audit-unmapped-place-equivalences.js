'use strict';

/*
 * Audit the 287 textual place candidates that have no independent map point.
 * Only transparent lexical variants are merged.  Directional descriptions,
 * buildings, villages and ambiguous historical regions remain unresolved.
 */
const fs = require('node:fs');
const path = require('node:path');

const ALIASES = {
  '京都': { target: '都', reason: '首都的同义表达；“都”按当时首都保留为语义地点。' },
  '都中': { target: '都', reason: '“都中”表示首都之中，不另造新地点。' },
  '都城': { target: '都', reason: '“都城”表示首都，不另造新地点。' },
  '卓锡泰山': { target: '泰山', reason: '“卓锡”是行迹动词，核心地名为泰山。' },
  '吴江府': { target: '吴江', reason: '府级行政后缀，核心地名为吴江。' },
  '太行山': { target: '太行', reason: '山名后缀，核心地名为太行。' },
  '官汾州': { target: '汾州', reason: '“官”是叙事动词，核心地名为汾州。' },
  '客金陵': { target: '金陵', reason: '“客”是人物状态，核心地名为金陵。' },
  '山东长清县': { target: '长清县', reason: '省域前缀与县名合写，核心地名为长清县。' },
  '平阴人': { target: '平阴', reason: '“人”是籍贯后缀，核心地名为平阴。' },
  '德州道': { target: '德州', reason: '道路／辖区表达，归入德州区域而非独立点。' },
  '戎衢州': { target: '衢州', reason: '“戎”是人物姓氏，核心地名为衢州。' },
  '故晋': { target: '晋', reason: '历史区域前缀，核心地名为晋。' },
  '梓潼府': { target: '梓潼', reason: '府级行政后缀，核心地名为梓潼。' },
  '河南界': { target: '河南', reason: '“界”表示边界，不另造河南的子点。' },
  '河间人': { target: '河间', reason: '“人”是籍贯后缀，核心地名为河间。' },
  '泰山人': { target: '泰山', reason: '“人”是籍贯后缀，核心地名为泰山。' },
  '洛下': { target: '洛', reason: '方位后缀，归入洛的区域表达。' },
  '洛城': { target: '洛', reason: '城郭后缀，归入洛的区域表达。' },
  '海州界': { target: '海州', reason: '“界”表示边界，不另造海州的子点。' },
  '盖陵阳': { target: '陵阳', reason: '“盖”是叙述副词，核心地名为陵阳。' },
  '试金陵': { target: '金陵', reason: '“试”是赴试动词，核心地名为金陵。' },
  '辽阳人': { target: '辽阳', reason: '“人”是籍贯后缀，核心地名为辽阳。' },
  '达金陵': { target: '金陵', reason: '“达”是到达动词，核心地名为金陵。' },
  '陕西延安': { target: '延安', reason: '省域前缀与府名合写，核心地名为延安。' },
  '青州城': { target: '青州', reason: '城郭表达归入青州行政区域。' },
  '青州市': { target: '青州', reason: '市级表达归入青州行政区域。' },
  '青州道': { target: '青州', reason: '道路／辖区表达归入青州行政区域。' },
  '顺天府': { target: '顺天', reason: '府级行政后缀，核心地名为顺天。' },
  '顺天府市': { target: '顺天', reason: '府市合写，归入顺天区域。' },
  '长安市': { target: '长安', reason: '城市后缀，核心地名为长安。' },
};

function read(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function write(file, value) { fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n'); }

function classify(word) {
  if (ALIASES[word]) return { category: 'equivalent', ...ALIASES[word] };
  if (/寺|祠|庙|宫|阁|堂|府|殿|园|关帝|衙|门|巷/.test(word)) return { category: 'space-or-building', reason: '专名建筑或篇内空间，不能仅凭检索结果当作行政地点。' };
  if (/村|庄|里|沟|岭|山|湖|河|江|海|岛|关|界|城|市|道|中|东|西|南|北/.test(word)) return { category: 'context-needed', reason: '可能是下级地点、自然地貌或方位区域，需按篇目上下文决定，不能统一定位。' };
  return { category: 'unresolved', reason: '当前没有足够的原文边界或历史地理证据，保留待人工核查。' };
}

function run(root = path.join(__dirname, '..')) {
  const packageFile = path.join(root, 'data-package.json');
  const revisionsFile = path.join(root, 'manual-revisions.json');
  const pack = read(packageFile);
  const base = pack.base;
  const known = new Set(base.places.map(row => row.name));
  known.add('都');
  // Rebuild from the original candidates so the audit remains idempotent.
  const prior = read(path.join(root, 'reports', 'unmapped-place-equivalence-audit-20261019.json'));
  const revisions = read(revisionsFile);
  const unmapped = [...(base.unmapped_textual_places || []), ...(prior.merged_rows || [])]
    .reduce((all, row) => all.some(existing => existing.place === (row.place || row.word)) ? all : [...all, { place: row.place || row.word, chapter_ids: row.chapter_ids || row.chapters || [] }], []);
  const rows = unmapped.map(row => ({ word: row.place, chapters: row.chapter_ids || [], ...classify(row.place) }));
  const chapterWords = new Map((base.chapter_overview || []).map(chapter => [chapter.chapter_id, new Set((chapter.places || []).map(row => row.word))]));
  for (const override of revisions.overrides || []) {
    const words = chapterWords.get(override.chapter_id) || new Set();
    for (const row of override.changes?.places || []) words.add(row.word);
    chapterWords.set(override.chapter_id, words);
  }
  const candidates = rows.filter(row => row.category === 'equivalent' && known.has(row.target));
  const unsafeAliasWords = new Set();
  for (const override of revisions.overrides || []) {
    const groups = new Map();
    for (const row of override.changes?.places || []) {
      const target = ALIASES[row.word]?.target || row.word;
      if (ALIASES[row.word]) groups.set(target, [...(groups.get(target) || []), row.word]);
    }
    for (const words of groups.values()) if (words.length > 1 || (words.length && (override.changes?.places || []).some(row => row.word === (ALIASES[words[0]]?.target)))) {
      for (const word of words) unsafeAliasWords.add(word);
    }
  }
  const targetSources = new Map();
  for (const row of candidates) for (const id of row.chapters) {
    const key = `${id}\u0000${row.target}`;
    targetSources.set(key, (targetSources.get(key) || 0) + 1);
  }
  const accepted = candidates.filter(row => !unsafeAliasWords.has(row.word) && !row.chapters.some(id => chapterWords.get(id)?.has(row.target) || targetSources.get(`${id}\u0000${row.target}`) > 1));
  const conflicts = rows.filter(row => row.category === 'equivalent' && known.has(row.target) && !accepted.includes(row));
  const covered = conflicts.filter(row => row.chapters.some(id => chapterWords.get(id)?.has(row.target)));
  base.name_aliases = Object.fromEntries(Object.entries(base.name_aliases || {}).filter(([word]) => !Object.hasOwn(ALIASES, word)));
  for (const row of accepted) base.name_aliases[row.word] = row.target;
  base.unmapped_textual_places = unmapped.filter(row => !accepted.some(done => done.word === row.place) && !covered.some(done => done.word === row.place));

  const location = revisions.place_locations.find(row => row.name === '都');
  if (!location) revisions.place_locations.push({
    name: '都', admin_level: 'prefecture', parent_id: null,
    modern_name: '当时首都（北京参考点）',
    region_description: '“都”是原文的泛称，按篇目时代指当时首都；地图采用北京参考点，不等同于每一篇的精确故事地点。',
    modern_level: '首都语义地点（参考点）',
    source_url: 'https://chgis.hudci.org/tgw/',
    note: '用户核定：都指当时首都。该记录用于合并京都、都中、都城等词，不把泛称误写成固定现代地名。',
    coordinate_kind: 'approximate', lon: 116.4074, lat: 39.9042,
  });

  const report = {
    generated_at: '2026-10-19', total_checked: rows.length,
    merged: accepted.length,
    covered_by_existing: covered.length,
    alias_conflicts: conflicts,
    remaining: base.unmapped_textual_places.length,
    counts: Object.fromEntries([...new Set(rows.map(row => row.category))].map(category => [category, rows.filter(row => row.category === category).length])),
    merged_rows: accepted,
    remaining_rows: rows.filter(row => !accepted.includes(row) && !covered.includes(row)),
    covered_rows: covered.map(row => ({ ...row, category: 'covered-by-existing', reason: `本篇已有“${row.target}”，不另建地点节点。` })),
    policy: '只合并有明确词法边界的同区表达；建筑、方位、村落、自然地貌、异境和多义历史区域保留逐篇核查。',
  };
  write(packageFile, pack);
  write(revisionsFile, revisions);
  write(path.join(root, 'reports', 'unmapped-place-equivalence-audit-20261019.json'), report);
  const markdown = [
    '# 未定位地点同区核查（2026-10-19）', '',
    `共检查 ${report.total_checked} 个未定位候选：合并 ${report.merged} 个，已有同篇地点覆盖 ${report.covered_by_existing} 个，保留 ${report.remaining} 个。`, '',
    '## 处理原则', '', report.policy, '',
    '“都”已作为语义地点加入：指篇目语境中的当时首都，地图用北京参考点表示，不等同于每篇的精确故事地点。', '',
    '## 已合并的同区表达', '',
    '| 原词 | 归入 | 理由 |', '| --- | --- | --- |',
    ...report.merged_rows.map(row => `| ${row.word} | ${row.target} | ${row.reason} |`), '',
    '## 仍需人工核查', '',
    `建筑／空间 ${report.counts['space-or-building'] || 0}，语境相关 ${report.counts['context-needed'] || 0}，未有充分证据 ${report.counts.unresolved || 0}；另有 ${report.alias_conflicts.length} 个同篇别名冲突未自动合并。`, '',
    '这些词仍保留在候选清单中，避免把“村外、祠、界、山村”等空间或方位表达误当成可精确定位的行政地名。', '',
  ].join('\n') + '\n';
  fs.writeFileSync(path.join(root, 'reports', 'unmapped-place-equivalence-audit-20261019.md'), markdown);
  return report;
}

if (require.main === module) console.log(JSON.stringify(run(), null, 2));
module.exports = { ALIASES, classify, run };
