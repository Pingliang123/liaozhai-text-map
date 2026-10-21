'use strict';
const fs=require('fs'),assert=require('assert/strict'),M=require('./ghost_map_model');
const base=JSON.parse(fs.readFileSync('data-package.json')).base;
for(const word of ['北村','南村','郡城']){
 const source=base.chapter_overview.find(c=>c.source_units.some(u=>u.text.includes(word)));assert(source,word);
 const m=M.create(base),id=source.chapter_id,d=m.editable(id);d.places=d.places.filter(p=>p.word!==word);d.places.push({word,mentions:0});d.space_words=d.space_words.filter(w=>w!==word);
 d.lexical_reviews={...d.lexical_reviews,['places:'+word]:{status:'accepted',word,kind:'places',note:'人工核定测试'}};m.save(id,d);
 assert(m.view(id).places.some(p=>p.word===word),'Manual accepted place survives relative-space rule');
 const restored=M.create(base);restored.importDocument(m.document());assert(restored.view(id).places.some(p=>p.word===word),'Import preserves explicit choice');
 const reject=restored.editable(id);reject.places=reject.places.filter(p=>p.word!==word);reject.lexical_reviews['places:'+word]={status:'rejected',word,kind:'places',note:'人工排除测试'};restored.save(id,reject);assert(!restored.view(id).places.some(p=>p.word===word));
 const automatic=M.create(base),unreviewed=automatic.editable(id);delete unreviewed.lexical_reviews['places:'+word];unreviewed.places=unreviewed.places.filter(p=>p.word!==word);unreviewed.places.push({word,mentions:0});automatic.save(id,unreviewed);assert(!automatic.view(id).places.some(p=>p.word===word));assert(automatic.view(id).space_words.includes(word),'Unreviewed relative term transfers, not disappears');
}
const model=fs.readFileSync('automation/ghost_map_model.js','utf8'),hash=s=>require('crypto').createHash('sha256').update(s).digest('hex');
assert.equal(hash(model),hash(fs.readFileSync('auth-backend/model.cjs','utf8')),'云端后台模型与 automation/ghost_map_model.js 不一致，须同步模型副本');
for(const file of ['index.html','assets/research-lab/map-runtime.js'])assert(fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n').includes(model.trim().replace(/\r\n/g,'\n')),file+' 使用过期模型');
console.log('PASS explicit manual place choices survive save/import; relative scenes transfer without disappearing; backend model agrees');
