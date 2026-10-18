'use strict';

const assert = require('assert');
const { classify, effectiveTokens, audit } = require('./audit-place-token-boundaries');

const chapter = {
  source_units: [{
    text: '赴金陵。长山人。',
    tokens: [[0, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8]],
  }],
  places: [{ word: '金陵' }, { word: '长山' }],
};

const baseTokens = effectiveTokens(chapter);
assert.deepStrictEqual(baseTokens.map(token => token.text), ['赴金陵', '。', '长', '山', '人', '。']);
assert.strictEqual(classify(baseTokens, 1, 3).kind, 'embedded');
assert.strictEqual(classify(baseTokens, 4, 6).kind, 'fragmented');

const revised = {
  ...chapter,
  segmentation_note: '赴 / 金陵 / 。 / 长山 / 人 / 。',
};
const revisedTokens = effectiveTokens(revised);
assert.deepStrictEqual(revisedTokens.map(token => token.text), ['赴', '金陵', '。', '长山', '人', '。']);
assert.strictEqual(classify(revisedTokens, 1, 3).kind, 'exact');
assert.strictEqual(classify(revisedTokens, 4, 6).kind, 'exact');

const report = audit({
  base: { corpus_id: 'test', chapter_overview: [chapter] },
  revisions: { overrides: [] },
});
assert.deepStrictEqual(report.counts, { exact: 0, embedded: 1, fragmented: 1, unreconciled: 0 });
assert.strictEqual(report.rows[0].suggested_split.join('/'), '赴/金陵');

console.log('place-token boundary audit tests passed');
