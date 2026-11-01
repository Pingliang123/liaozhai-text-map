'use strict';
const assert=require('node:assert/strict'),A=require('./apply-deepseek-space-review');
for(const [word,type]of [['城隍庙','built'],['簷下','relative'],['村外','relative'],['奈河','otherworld'],['黄泉','otherworld'],['城门','boundary'],['山谷','natural'],['何处','relation']])assert(A.candidateIsSpatial({word,type}),word+' should pass spatial screen');
for(const [word,type]of [['启扉','built'],['呻吟','built'],['遁去','relative'],['入室','built'],['魂魄','otherworld'],['如王者都','relative'],['人语','built'],['设','built']])assert(!A.candidateIsSpatial({word,type}),word+' should not be auto-applied');
for(const [word,type]of [['躇阶','built'],['创殿','built'],['堕足下','relative']])assert(!A.candidateIsSpatial({word,type}),word+' is an action phrase, not a spatial term');
assert.deepEqual(A.difference(['先','金','陵','后'],['先','赴','金陵','后']),{before:['金','陵'],after:['赴','金陵']});
assert.deepEqual(A.sequenceStarts(['至','奈','河','边'],['奈','河']),[1]);
const report=require('../reports/deepseek-space-application-20261101.json'),pkg=require('../data-package.json'),doc=require('../manual-revisions.json'),M=require('./ghost_map_model'),model=M.create(pkg.base);model.importDocument(doc);
assert.equal(report.application.applied_segmentation,0,'unverified segmentation must stay untouched');
assert(report.applied_terms.length>0);
for(const row of report.applied_terms){const c=model.view(row.chapter_id);assert(c.space_words.includes(row.word),row.chapter+': missing applied space '+row.word);assert(c.source_units.some(u=>u.unit===row.unit_id&&u.text===row.quote&&u.text.includes(row.word)),row.chapter+': evidence must match source');}
for(const row of report.segmentation_candidates_not_applied)assert.equal(row.before.join(''),row.after.join(''),'held token proposal must preserve source characters');
console.log('PASS source-preserving space vocabulary screening and segmentation targeting');
