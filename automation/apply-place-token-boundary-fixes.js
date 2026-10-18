#!/usr/bin/env node
/* Apply only high-confidence place-boundary fixes after protected chapters. */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { effectiveTokens, sourceOf, findCandidates } = require('./audit-place-token-boundaries');

const PROTECTED_CHAPTERS = 33;

function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function writeJson(file, value) { fs.writeFileSync(file, JSON.stringify(value) + '\n'); }
function digest(value) { return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex'); }

function sourceOffsets(chapter) {
  const offsets = [];
  let offset = 0;
  for (const unit of chapter.source_units || []) {
    const text = unit.text || unit.original || '';
    offsets.push({ start: offset, end: offset + text.length });
    offset += text.length;
  }
  return offsets;
}

function segmentationNote(chapter, boundaries) {
  const source = sourceOf(chapter);
  const offsets = sourceOffsets(chapter);
  return offsets.map(({ start, end }) => {
    const cuts = [...boundaries].filter(value => value >= start && value <= end).sort((a, b) => a - b);
    const points = [start, ...cuts, end].filter((value, index, values) => index === 0 || value !== values[index - 1]);
    return points.slice(0, -1).map((point, index) => source.slice(point, points[index + 1])).filter(Boolean).join(' / ');
  }).join('\n');
}

function editableBase(chapter) {
  return {
    event_types: Object.fromEntries(Object.keys(chapter.event_types || {}).map(type => [type, 1])),
    realms_present: [...(chapter.realms_present || [])],
    people: JSON.parse(JSON.stringify(chapter.people || [])),
    places: JSON.parse(JSON.stringify(chapter.places || [])),
    review_note: chapter.review_note || '',
    segmentation_note: chapter.segmentation_note || '',
    lexical_reviews: JSON.parse(JSON.stringify(chapter.lexical_reviews || {})),
    years: JSON.parse(JSON.stringify(chapter.years || {})),
    space_words: [...(chapter.space_words || [])],
    narrative_events: JSON.parse(JSON.stringify(chapter.narrative_events || [])),
    evidence_review: JSON.parse(JSON.stringify(chapter.evidence_review || {})),
  };
}

function reviseChapter(chapter, mode = 'high') {
  const source = sourceOf(chapter);
  const tokens = effectiveTokens(chapter);
  const candidates = findCandidates(chapter, 2)
    .filter(candidate => mode === 'high' ? candidate.confidence === 'high' : ['high', 'medium'].includes(candidate.confidence))
    .sort((a, b) => (a.start - b.start) || (b.end - b.start) - (a.end - a.start));
  const chosen = [];
  for (const candidate of candidates) {
    if (chosen.some(row => candidate.start < row.end && candidate.end > row.start)) continue;
    chosen.push(candidate);
  }
  if (!chosen.length) return null;

  const boundaries = new Set(tokens.flatMap(token => [token.start, token.end]));
  for (const candidate of chosen) {
    boundaries.add(candidate.start);
    boundaries.add(candidate.end);
    if (candidate.kind === 'fragmented') {
      for (const boundary of [...boundaries]) if (boundary > candidate.start && boundary < candidate.end) boundaries.delete(boundary);
    }
  }
  const note = segmentationNote(chapter, boundaries);
  if (note.replace(/[\s/|]+/gu, '') !== source.replace(/[\s/|]+/gu, '')) throw new Error('生成分词未与原文对齐：' + chapter.chapter);
  return { note, candidates: chosen };
}

function apply(revisionsFile, packageFile, receiptFile, options = {}) {
  const revisions = readJson(revisionsFile);
  const pack = readJson(packageFile);
  const chapters = new Map(pack.base.chapter_overview.map(chapter => [chapter.chapter_id, chapter]));
  const before = digest(revisions);
  const mode = options.mode || 'high';
  const protectBefore = options.protectBefore ?? PROTECTED_CHAPTERS;
  const changes = [];
  const overrides = new Map((revisions.overrides || []).map(row => [row.chapter_id, { ...row, changes: { ...(row.changes || {}) } }]));
  for (const [id, original] of chapters) {
    if (id < protectBefore) continue;
    const current = { ...original, ...(overrides.get(id)?.changes || {}) };
    const result = reviseChapter(current, mode);
    if (!result) continue;
    const row = overrides.get(id) || { chapter_id: id, changes: editableBase(original) };
    if (row.changes.segmentation_note === result.note) continue;
    row.changes.segmentation_note = result.note;
    overrides.set(id, row);
    changes.push({ chapter_id: id, chapter: original.chapter, mode, candidates: result.candidates });
  }
  const next = { ...revisions, overrides: [...overrides.values()].sort((a, b) => a.chapter_id - b.chapter_id) };
  if (changes.length) writeJson(revisionsFile, next);
  writeJson(receiptFile, { schema_version: 1, protected_chapters: protectBefore, mode, before_sha256: before, after_sha256: digest(next), changed_chapters: changes });
  return { changed_chapters: changes.length, candidates: changes.reduce((sum, row) => sum + row.candidates.length, 0), receipt: receiptFile };
}

if (require.main === module) {
  const root = path.join(__dirname, '..');
  const result = apply(
    path.join(root, 'manual-revisions.json'),
    path.join(root, 'data-package.json'),
    path.join(root, 'reports', 'place-token-boundary-application.json'),
    {
      mode: process.argv.includes('--include-fragmented') ? 'high-and-medium' : 'high',
      protectBefore: process.argv.includes('--all-chapters') ? 0 : PROTECTED_CHAPTERS,
    },
  );
  console.log(JSON.stringify(result));
}

module.exports = { apply, reviseChapter, segmentationNote };
