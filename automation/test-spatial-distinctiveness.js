'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),crypto=require('crypto');
const r=require('../reports/spatial-distinctiveness-results.json');
test('analysis is bound to the exact current canonical package',()=>{
 assert.equal(r.source_sha256,crypto.createHash('sha256').update(fs.readFileSync(require.resolve('../data-package.json'))).digest('hex'));
 assert.equal(r.chapters,491);
 assert.equal(r.unmatched_inventory.reduce((n,c)=>n+c.words.length,0),r.unmatched_chapter_terms);
});
test('all reported prevalences and grouped evidence have consistent denominators',()=>{
 for(const a of [r.rows,r.room_context_audit.rows,r.group_rows,r.global_dictionary_sensitivity,r.ghost_fox_exclusive_sensitivity])for(const row of a){
  assert.equal(row.inside/row.inside_n,row.prevalence);
  assert.equal(row.outside/row.outside_n,row.reference);
  assert.ok(row.q>=row.p-1e-10&&row.q<=1);
 }
 for(const [group,chapters] of Object.entries(r.group_evidence)){
  assert.equal(new Set(chapters.map(c=>c.id)).size,chapters.length);
  for(const c of chapters){assert.ok(c.quotes.length);assert.ok(c.words.every(w=>r.word_groups[group].includes(w)));}
  for(const type of Object.keys(r.events)){
   const row=r.group_rows.find(x=>x.event===type&&x.word===group);
   assert.equal(row.inside,chapters.filter(c=>c.events.includes(type)).length);
  }
 }
});
test('semantic exclusions affect analysis without changing source classifications',()=>{
 const room=r.room_context_audit.rows.find(x=>x.event==='狐'&&x.word==='室');
 assert.equal(room.inside,31);assert.equal(room.outside,68);
 const caves=r.group_evidence['山穴词群'];
 assert.ok(!caves.some(c=>c.title==='象'||c.title==='邵女'));
 assert.equal(r.hole_context_audit.chapter_hits_read,27);
});
