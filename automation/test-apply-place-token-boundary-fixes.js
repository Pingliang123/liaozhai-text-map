'use strict';

const assert = require('assert');
const { reviseChapter } = require('./apply-place-token-boundary-fixes');

const chapter = {
  chapter_id: 40,
  chapter: '测试',
  source_units: [{ text: '达金陵。长山人。', tokens: [[0, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8]] }],
  places: [{ word: '金陵' }, { word: '长山' }],
};
const result = reviseChapter(chapter, 'high-and-medium');
assert.ok(result);
assert.strictEqual(result.note, '达 / 金陵 / 。 / 长山 / 人 / 。');
assert.strictEqual(result.candidates.length, 2);

const protectedChapter = { ...chapter, chapter_id: 32 };
assert.ok(reviseChapter(protectedChapter));

console.log('place-token boundary application tests passed');
