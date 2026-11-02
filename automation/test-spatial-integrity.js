'use strict';
const assert=require('node:assert/strict'),R=require('../assets/spatial-routes'),M=require('./ghost_map_model'),pkg=require('../data-package.json'),report=require('../reports/spatial-integrity-review-20261102.json');
const unit={text:'遭𫓧钺之诛。',tokens:[[0,1],[1,2],[2,3],[3,4],[4,5]]},chapter={source_units:[unit]};assert.deepEqual(R.tokenUnits(chapter)[0],['遭','𫓧','钺','之','诛']);assert(R.lexicon(chapter).words.has('𫓧'));
const m=M.create(pkg.base);m.importDocument(pkg.revisions);for(const id of [112,412]){const c=m.view(id);assert.equal(c.segmentation_note.split(/[\s/|]+/u).filter(Boolean).join(''),c.source_units.map(u=>u.text).join('').replace(/\s/gu,''));}
assert.equal(report.omissions.length,551);assert.equal(report.isolated.length,497);assert.equal(report.endpoints.length,report.summary.unmapped_endpoint_sides);assert(report.omissions.every(r=>r.evidence.length&&r.decision));assert(report.isolated.every(r=>r.evidence.length&&r.diagnosis));assert(report.endpoints.every(r=>r.quote&&r.diagnosis));
console.log('PASS Unicode offsets, source characters and exhaustive per-record audit coverage');
