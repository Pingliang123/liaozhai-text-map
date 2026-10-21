'use strict';
const assert=require('assert/strict'),fs=require('fs'),M=require('./ghost_map_model'),P=require('../assets/place-crosscheck');
const base=JSON.parse(fs.readFileSync('data-package.json')).base;
for(const [title,wrong,place,space]of [['西僧','卓锡泰山','泰山',null],['山市','奂山山市','奂山','山市'],['长清僧','河南界','河南','界'],['叶生','淮阳界','淮阳','界']]){
 const id=base.chapter_overview.find(c=>c.chapter===title).chapter_id,m=M.create(base),d=m.editable(id);
 d.segmentation_note=m.view(id).source_units.map(require('../assets/place-review').unitTokens).join(' / ');
 delete d.lexical_reviews['places:'+wrong];d.places=[{word:wrong,mentions:0},{word:place,mentions:0}];
 m.importDocument({schema_version:2,corpus_id:base.corpus_id,source_sha256:base.source_sha256,overrides:[{chapter_id:id,changes:d}],place_locations:[]});
 const c=m.view(id);assert(!c.places.some(p=>p.word===wrong));assert.equal(c.places.filter(p=>p.word===place).length,1);if(space)assert(c.space_words.includes(space));
 assert.equal(c.segmentation_note.split(/[\s/|]+/u).filter(Boolean).join(''),c.source_units.map(u=>u.text).join('').replace(/\s/gu,''));
 assert(!P.scan(base,m).some(r=>r.chapter_id===id&&r.word===wrong),'Corrected phrase is not pending again');
 // A saved correction remains effective even if a legacy place array still has the old phrase.
 const old=m.editable(id);old.places=[{word:wrong,mentions:0}];old.lexical_reviews['places:'+wrong]={status:'corrected',word:place,kind:'places',note:'人工修订'};m.save(id,old);assert(m.view(id).places.some(p=>p.word===place));
 const round=M.create(base);round.importDocument(m.document());assert(round.view(id).places.some(p=>p.word===place));
}
console.log('PASS 西僧/山市 legacy restore, final decisions, duplicate removal, source-aligned tokens and no pending reappearance');
const actual=M.create(base);actual.importDocument(require('../manual-revisions.json'));
for(const [id,wrong,place]of [[101,'卓锡泰山','泰山'],[248,'奂山山市','奂山'],[15,'河南界','河南'],[30,'淮阳界','淮阳']]){assert(!actual.view(id).places.some(p=>p.word===wrong));assert(actual.view(id).places.some(p=>p.word===place));}
const full=actual.document(),partial={...full,overrides:full.overrides.slice(0,54)};delete partial.complete_snapshot;const merged=M.mergeDocuments(base,full,partial,full);assert.equal(merged.overrides.length,full.overrides.length,'An old partial document cannot erase hundreds of unrelated chapters');
const single={...full,overrides:full.overrides.slice(1)};assert.equal(M.mergeDocuments(base,full,single,full).overrides.length,full.overrides.length-1,'Intentional individual reset remains possible');
console.log('PASS canonical examples and partial-document omission protection without blocking individual reset');
