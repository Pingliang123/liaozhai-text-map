'use strict';

const assert = require('assert');
const { reviseChapter, apply } = require('./apply-place-token-boundary-fixes');

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

const fs = require('fs');
const os = require('os');
const path = require('path');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'place-boundary-'));
const revisionsFile = path.join(temp, 'revisions.json');
const packageFile = path.join(temp, 'package.json');
const receiptFile = path.join(temp, 'receipt.json');
fs.writeFileSync(revisionsFile, JSON.stringify({schema_version: 2, corpus_id: 'test', source_sha256: 'test', overrides: [], place_locations: []}));
fs.writeFileSync(packageFile, JSON.stringify({base: {corpus_id: 'test', chapter_overview: [chapter]}}));
const applied = apply(revisionsFile, packageFile, receiptFile, {mode: 'high-and-medium', protectBefore: 0});
assert.strictEqual(applied.changed_chapters, 1);
assert.strictEqual(JSON.parse(fs.readFileSync(receiptFile)).protected_chapters, 0);
fs.rmSync(temp, {recursive: true, force: true});

console.log('place-token boundary application tests passed');
