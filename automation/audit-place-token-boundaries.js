#!/usr/bin/env node
/*
 * Compare the current place vocabulary with the effective token stream.
 * This is an audit only: it never rewrites corpus data.
 *
 * It catches both directions of boundary errors:
 *   - embedded: 赴金陵 is one token although 金陵 is a place word;
 *   - fragmented: 长／山 is split although 长山 is a place word.
 *
 * A place occurrence is reported with its chapter and source context so a
 * human can decide whether a split is linguistically appropriate.
 */
'use strict';

const fs = require('fs');
const path = require('path');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function sourceOf(chapter) {
  return (chapter.source_units || []).map(unit => unit.text || unit.original || '').join('');
}

function rawTokens(chapter) {
  const result = [];
  let offset = 0;
  for (const unit of chapter.source_units || []) {
    const text = unit.text || unit.original || '';
    for (const range of unit.tokens || []) {
      const start = Array.isArray(range) ? range[0] : range.start;
      const end = Array.isArray(range) ? range[1] : range.end;
      result.push({ start: offset + start, end: offset + end, text: text.slice(start, end), source: 'base' });
    }
    offset += text.length;
  }
  return result;
}

function effectiveTokens(chapter) {
  const source = sourceOf(chapter);
  const note = chapter.segmentation_note || '';
  const pieces = note.split(/[\s/|]+/u).map(token => token.trim()).filter(Boolean);
  const strip = value => value.replace(/[\s/|]+/gu, '');
  if (!note || strip(note) !== strip(source)) return rawTokens(chapter);

  const result = [];
  let cursor = 0;
  for (const token of pieces) {
    if (source.slice(cursor, cursor + token.length) !== token) return rawTokens(chapter);
    result.push({ start: cursor, end: cursor + token.length, text: token, source: 'revision' });
    cursor += token.length;
  }
  return cursor === source.length ? result : rawTokens(chapter);
}

function classify(tokens, start, end) {
  const exact = tokens.find(token => token.start === start && token.end === end);
  if (exact) return { kind: 'exact', covering: [exact] };
  const cover = tokens.find(token => token.start <= start && token.end >= end);
  if (cover) return { kind: 'embedded', covering: [cover] };
  const starts = tokens.find(token => token.start === start);
  const ends = tokens.find(token => token.end === end);
  if (starts && ends) {
    return {
      kind: 'fragmented',
      covering: tokens.filter(token => token.end > start && token.start < end),
    };
  }
  return {
    kind: 'unreconciled',
    covering: tokens.filter(token => token.end > start && token.start < end),
  };
}

function confidence(kind, word) {
  if (kind === 'embedded') return word.length >= 2 ? 'high' : 'review';
  if (kind === 'fragmented') return word.length >= 2 ? 'medium' : 'review';
  return 'review';
}

function findCandidates(chapter, minimumLength = 1, includeExact = false) {
  const source = sourceOf(chapter);
  const tokens = effectiveTokens(chapter);
  const result = [];
  for (const place of chapter.places || []) {
    const word = String(place.word || '').trim();
    if (!word || word.length < minimumLength) continue;
    let start = 0;
    while ((start = source.indexOf(word, start)) !== -1) {
      const end = start + word.length;
      const classified = classify(tokens, start, end);
      if (includeExact || classified.kind !== 'exact') result.push({
        word, start, end, kind: classified.kind,
        confidence: confidence(classified.kind, word),
      });
      start = end;
    }
  }
  return result;
}

function audit(packageFile = path.join(__dirname, '..', 'data-package.json'), options = {}) {
  const pack = typeof packageFile === 'string' ? readJson(packageFile) : packageFile;
  const base = pack.base;
  const revisions = pack.revisions || {};
  const overrides = new Map((revisions.overrides || []).map(row => [row.chapter_id, row.changes || {}]));
  const rows = [];
  const counts = { exact: 0, embedded: 0, fragmented: 0, unreconciled: 0 };
  const chapters = new Set();

  for (const original of base.chapter_overview || []) {
    const chapter = { ...original, ...(overrides.get(original.chapter_id) || {}) };
    const source = sourceOf(chapter);
    const tokens = effectiveTokens(chapter);
    for (const candidate of findCandidates(chapter, 1, true)) {
        const { word, start, end } = candidate;
        const result = classify(tokens, start, end);
        counts[result.kind] += 1;
        if (result.kind !== 'exact') {
          chapters.add(chapter.chapter_id);
          const contextStart = Math.max(0, start - (options.context ?? 14));
          const contextEnd = Math.min(source.length, end + (options.context ?? 14));
          rows.push({
            chapter_id: chapter.chapter_id,
            chapter: chapter.chapter,
            place: word,
            kind: result.kind,
            confidence: candidate.confidence,
            context: source.slice(contextStart, contextEnd),
            tokens: result.covering.map(token => token.text),
            suggested_split: result.kind === 'embedded'
              ? [result.covering[0].text.slice(0, start - result.covering[0].start), word,
                result.covering[0].text.slice(end - result.covering[0].start)].filter(Boolean)
              : result.kind === 'fragmented' ? [word] : null,
            source: result.covering.some(token => token.source === 'revision') ? 'revision' : 'base',
          });
        }
    }
  }

  return {
    generated_from: typeof packageFile === 'string' ? path.basename(packageFile) : 'in-memory',
    corpus_id: base.corpus_id,
    occurrence_count: Object.values(counts).reduce((sum, count) => sum + count, 0),
    counts,
    non_exact_chapters: chapters.size,
    rows,
  };
}

function main() {
  const args = process.argv.slice(2);
  const packageFile = args[0] || path.join(__dirname, '..', 'data-package.json');
  const outputFile = args[1];
  const report = audit(packageFile);
  const rendered = JSON.stringify(report, null, 2) + '\n';
  if (outputFile) fs.writeFileSync(outputFile, rendered);
  else process.stdout.write(rendered);
}

if (require.main === module) main();

module.exports = { audit, effectiveTokens, classify, sourceOf, findCandidates };
