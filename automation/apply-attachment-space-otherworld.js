'use strict';

// Apply only after the researcher explicitly approves the audit report.
// Existing place/person/time/event edits are retained; this script only adds
// approved space terms and source-backed otherworld evidence.
const fs = require('node:fs');
const crypto = require('node:crypto');
const M = require('./ghost_map_model');

const pkg = JSON.parse(fs.readFileSync('data-package.json', 'utf8'));
const audit = JSON.parse(fs.readFileSync('reports/attachment-space-otherworld-audit-20261021.json', 'utf8'));
const document = JSON.parse(fs.readFileSync('manual-revisions.json', 'utf8'));
const model = M.create(pkg.base);
model.importDocument(document);
const nextDocument = model.document();
const drafts = new Map(nextDocument.overrides.map(row => [row.chapter_id, row.changes]));
function draftFor(id) {
  if (!drafts.has(id)) drafts.set(id, model.editable(id));
  return drafts.get(id);
}
const approvedSpaces = new Set(audit.rows.filter(row => row.kind === 'space').map(row => row.term));
const approvedOtherworld = new Map(audit.rows.filter(row => row.kind === 'otherworld').map(row => [row.term, row.framework_group]));
const stats = {space_terms: [...approvedSpaces], chapters_with_space_additions: 0, space_additions: 0, evidence_additions: 0, evidence_terms: new Set()};

function realm(group, term) {
  if (term === '天堂') return '天界';
  return group === 'underworld' ? '地界' : '天界';
}
function sourceFingerprint(text) { return crypto.createHash('sha256').update(text).digest('hex'); }

for (const id of model.ids) {
  const view = model.view(id), draft = draftFor(id), source = view.source_units || [];
  let spaceChanged = false;
  for (const term of approvedSpaces) {
    if (!source.some(unit => (unit.text || '').includes(term))) continue;
    if (!draft.space_words.includes(term)) { draft.space_words.push(term); stats.space_additions++; spaceChanged = true; }
    const key = 'spaces:' + term;
    if (!draft.lexical_reviews[key]) draft.lexical_reviews[key] = {status: 'corrected', word: term, kind: 'spaces', note: '附件空间叙事框架审核通过；保留原文词形，纳入空间词。'};
  }
  if (spaceChanged) stats.chapters_with_space_additions++;
}

const byId = new Map(pkg.base.chapter_overview.map(chapter => [chapter.chapter_id, chapter]));
for (const [term, group] of approvedOtherworld) {
  for (const chapter of byId.values()) {
    const units = (chapter.source_units || []).filter(unit => (unit.text || '').includes(term));
    if (!units.length) continue;
    if (!chapter.realms_present.includes(realm(group, term))) chapter.realms_present.push(realm(group, term));
    for (const unit of units) {
      let start = -1;
      while ((start = unit.text.indexOf(term, start + 1)) >= 0) {
        const id = `attachment-${chapter.chapter_id}-${unit.unit}-${start}-${term.length}`;
        if (chapter.realm_evidence.some(row => row.id === id || (row.unit === unit.unit && row.space === term && row.start === start))) continue;
        chapter.realm_evidence.push({id, realm: realm(group, term), space: term, unit: unit.unit, start, end: start + term.length,
          excerpt: unit.text, kind: 'mention', status: 'source_checked', source_fingerprint: sourceFingerprint(unit.text),
          relation: '附件框架审核通过；异境词证据，不自动解释为人物移动。'});
        stats.evidence_additions++; stats.evidence_terms.add(term);
      }
    }
  }
}

stats.evidence_terms = [...stats.evidence_terms].sort();
nextDocument.overrides = [...drafts.entries()].sort((a, b) => a[0] - b[0]).map(([chapter_id, changes]) => ({chapter_id, changes}));
// Validate the complete candidate document before writing it. This preserves
// the existing source segmentation exactly; adding a space label must never
// silently rewrite tokens.
const validation = M.create(pkg.base);
validation.importDocument(nextDocument);
fs.writeFileSync('manual-revisions.json', JSON.stringify(nextDocument));
fs.writeFileSync('data-package.json', JSON.stringify(pkg));
fs.writeFileSync('reports/attachment-space-otherworld-application-20261021.json', JSON.stringify({
  source_sha256: pkg.base.source_sha256, audit_generated_at: audit.generated_at, approved: true, ...stats
}, null, 2));
console.log(JSON.stringify({...stats, evidence_terms: stats.evidence_terms}));
