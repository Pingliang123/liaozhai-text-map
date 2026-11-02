'use strict';
const assert=require('node:assert/strict'),report=require('../reports/semantic-spatial-review-20261102.json'),pkg=require('../data-package.json'),M=require('./ghost_map_model');const m=M.create(pkg.base);m.importDocument(pkg.revisions);
assert.equal(report.rows.length,45);for(const r of report.rows){const c=m.view(r.chapter_id);assert(r.evidence.length);for(const e of r.evidence)assert(c.source_units.some(u=>u.unit===e.unit&&u.text===e.quote));if(r.status==='已排除非空间词'){assert(!c.space_words.includes(r.word));assert.equal(c.lexical_reviews['spaces:'+r.word].status,'rejected');}else assert.deepEqual(c.lexical_reviews['spaces:'+r.word],r.prior_review);}
for(const id of [15,131,395])assert(!m.view(id).space_words.includes(id===131?'田':id===15?'谷':'肆'));
assert(m.view(395).space_words.includes('狱门'));console.log('PASS contextual exclusions, original quotes, protected reviews and retained real spaces');
