'use strict';
const assert=require('node:assert/strict'),M=require('./ghost_map_model'),pkg=require('../data-package.json'),r=require('../reports/spatial-compound-consolidation-20261102.json'),m=M.create(pkg.base);m.importDocument(pkg.revisions);
assert(r.changes.length>0);for(const x of r.changes){const c=m.view(x.chapter_id);assert(!c.space_words.includes(x.word));assert(x.replacement_terms.every(w=>c.space_words.includes(w)));assert.equal(x.protected_review.note,'附件空间叙事框架审核通过；保留原文词形，纳入空间词。');for(const e of x.evidence)assert(c.source_units.some(u=>u.unit===e.unit&&u.text===e.quote));}
assert(m.view(411).space_words.includes('房'),'retain explicitly reviewed single-character annotation');console.log('PASS compound coverage, source evidence and explicit review preservation');
