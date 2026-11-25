'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),M=require('./ghost_map_model'),Store=require('../assets/corpus-store');
const [priorPath,publishedPath,csvPath]=process.argv.slice(2);
if(!csvPath)throw Error('Usage: node automation/verify-report-snapshot-recovery.js PRIOR_PACKAGE PUBLISHED_PACKAGE CSV');
const prior=JSON.parse(fs.readFileSync(priorPath,'utf8')),published=JSON.parse(fs.readFileSync(publishedPath,'utf8'));
const html=fs.readFileSync('index.html','utf8'),context={GhostMapModel:M};vm.createContext(context);
vm.runInContext([...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gu)].map(m=>m[1]).find(s=>s.includes('root.GhostMapReports=api')),context);
const R=context.GhostMapReports,make=doc=>{const m=M.create(published.base);m.importDocument(doc);return m;};
const oldModel=make(prior.revisions),old=oldModel.document(),original=JSON.stringify(old);
const csv=fs.readFileSync(csvPath,'utf8').replace(/^\uFEFF/,'').trim().split(/\r?\n/).slice(1).map(l=>l.slice(1,-1).split('\",\"'));
const categories=new Set(csv.map(row=>row[1]));
const aggregate=m=>R.aggregate(R.rows(published.base,m).filter(r=>categories.has(R.KINDS[r.kind])&&r.present));
const oldStats=aggregate(oldModel),by=new Map(oldStats.map(r=>[R.KINDS[r.kind]+':'+r.word,r]));
assert.equal(csv.length,oldStats.length);
for(const [word,kind,n,freq,mentions]of csv){const r=by.get(kind+':'+word);assert(r,kind+':'+word);assert.deepEqual([r.chapters,r.frequency,r.mentions],[+n,+freq,+mentions]);}
(async()=>{
 const update=await Store.rebasePublished(old,published.revisions),recovered=make(update.document),target=make(published.revisions);
 assert(update.applied.length>0);assert.equal(JSON.stringify(old),original,'input untouched');
 for(const id of target.ids)assert.deepEqual(recovered.editable(id),target.editable(id),'chapter '+id);
 assert.equal(JSON.stringify(aggregate(recovered)),JSON.stringify(aggregate(target)),'all report rows match publication');
 for(const kind of categories){
  const summarize=rows=>{const subset=rows.filter(r=>R.KINDS[r.kind]===kind);return {rows:subset.length,frequency:subset.reduce((n,r)=>n+r.frequency,0)};};
  console.log(kind,JSON.stringify({before:summarize(oldStats),after:summarize(aggregate(target))}));
 }
 const edited=structuredClone(old),row=edited.overrides.find(r=>update.applied.some(x=>x.chapter_id===r.chapter_id&&x.field==='space_words'));
 row.changes.space_words=[...row.changes.space_words,'人工新增待核詞'];
 row.changes.review_note='後來的人工修訂應保留';
 row.changes.lexical_reviews={...row.changes.lexical_reviews,'spaces:人工新增待核詞':{status:'accepted',word:'人工新增待核詞',kind:'spaces',note:'人工保留'}};
 const kept=await Store.rebasePublished(edited,published.revisions),keptRow=kept.document.overrides.find(r=>r.chapter_id===row.chapter_id);
 assert.deepEqual(keptRow.changes.space_words,row.changes.space_words);assert.equal(keptRow.changes.review_note,row.changes.review_note);
 assert.deepEqual(keptRow.changes.lexical_reviews['spaces:人工新增待核詞'],row.changes.lexical_reviews['spaces:人工新增待核詞']);
 const again=await Store.rebasePublished(update.document,published.revisions);assert.equal(again.applied.length,0,'idempotent');
 const reset=structuredClone(old);reset.overrides=reset.overrides.filter(r=>r.chapter_id!==row.chapter_id);
 assert(!(await Store.rebasePublished(reset,published.revisions)).document.overrides.some(r=>r.chapter_id===row.chapter_id),'intentional reset preserved');
 const state=new Map(),env={localStorage:{getItem:k=>state.get(k)??null,setItem:(k,v)=>state.set(k,v)}};
 const key=await Store.backupBeforeUpdate(env,'snapshot-test',original,update.version);
 await Store.backupBeforeUpdate(env,'snapshot-test','later',update.version);assert.equal(state.get(key),original,'original backup preserved');
 const wrong={...old,source_sha256:'different-source'};assert.strictEqual((await Store.rebasePublished(wrong,published.revisions)).document,wrong);
 console.log(JSON.stringify({csv_rows_verified:csv.length,before_types:oldStats.length,before_frequency:oldStats.reduce((s,r)=>s+r.frequency,0),after_types:aggregate(recovered).length,after_frequency:aggregate(recovered).reduce((s,r)=>s+r.frequency,0),updated_fields:update.applied.length,all_491_chapters_equal:true,new_manual_changes_preserved:true,idempotent:true}));
})().catch(e=>{console.error(e);process.exitCode=1;});
