'use strict';
const fs=require('fs'),crypto=require('crypto');
const {effectiveTokens,sourceOf,classify}=require('./audit-place-token-boundaries');
const {segmentationNote}=require('./apply-place-token-boundary-fixes');
const M=require('./ghost_map_model');
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
function revise(c){
 const text=sourceOf(c),tokens=effectiveTokens(c),entries=new Map();
 const add=(kind,word)=>{if(typeof word==='string'&&word.length>=2&&!/[\s/|，。；：、（）]/u.test(word)){if(!entries.has(word))entries.set(word,new Set());entries.get(word).add(kind);}};
 for(const p of c.people||[])add('people',p.word);
 for(const p of c.places||[])add('places',p.word);
 for(const w of c.space_words||[])add('spaces',w);
 for(const w of Object.keys(c.years||{}))add('times',w);
 const occurrences=[],held=[];
 let offset=0;const units=(c.source_units||[]).map(u=>{const s=offset;offset+=(u.text||u.original||'').length;return [s,offset];});
 for(const [word,kinds] of entries){let start=0;while((start=text.indexOf(word,start))!==-1){const end=start+word.length;const result=classify(tokens,start,end);const row={word,kinds:[...kinds],start,end,kind:result.kind,quote:text.slice(Math.max(0,start-18),end+18)};
 if(!units.some(([s,e])=>start>=s&&end<=e)){held.push({...row,reason:'跨原文单位'});}else occurrences.push(row);start=end;}}
 // Exact longer entities participate too, so a short place cannot split a person's title.
 occurrences.sort((a,b)=>(b.end-b.start)-(a.end-a.start)||a.start-b.start);
 const chosen=[];for(const row of occurrences){if(chosen.some(x=>row.start<x.end&&row.end>x.start)){if(row.kind!=='exact')held.push({...row,reason:'与较长词重叠'});continue;}chosen.push(row);}
 const cuts=new Set(tokens.flatMap(t=>[t.start,t.end])),applied=[];
 for(const row of chosen){if(row.kind==='exact')continue;
 // Crossed boundaries can cut unrelated names or words; retain their context for review.
 if(row.kind==='unreconciled'){held.push({...row,reason:'跨词边界需核对'});continue;}
 const review=row.kinds.map(k=>c.lexical_reviews?.[k+':'+row.word]);
 if(review.some(r=>r?.status==='rejected')){held.push({...row,reason:'已有排除判断'});continue;}
 cuts.add(row.start);cuts.add(row.end);for(const cut of [...cuts])if(cut>row.start&&cut<row.end)cuts.delete(cut);applied.push(row);
 }
 const note=segmentationNote(c,cuts);
 if(note.replace(/[\s/|]+/gu,'')!==text.replace(/[\s/|]+/gu,''))throw Error('原文不对齐');
 return {note,applied,held};
}
function run(){
 const p=JSON.parse(fs.readFileSync('data-package.json')),before=JSON.parse(fs.readFileSync('manual-revisions.json'));
 const model=M.create(p.base);model.importDocument(before);const receipt={source_sha256:p.base.source_sha256,chapters:[],held:[],counts:{people:0,spaces:0,times:0,places:0}};
 for(const id of model.ids){const c=model.view(id),r=revise(c);receipt.held.push(...r.held.map(x=>({...x,chapter_id:id,chapter:c.chapter})));if(!r.applied.length)continue;
 const old=model.editable(id);model.save(id,{...old,segmentation_note:r.note});
 receipt.chapters.push({chapter_id:id,chapter:c.chapter,source_sha256:hash(sourceOf(c)),before:old.segmentation_note,after:model.editable(id).segmentation_note,applied:r.applied});
 for(const x of r.applied)for(const k of x.kinds)receipt.counts[k]++;
 }
 const after=model.document();
 // A boundary repair may change segmentation only, including for newly materialized overrides.
 const check=M.create(p.base);check.importDocument(before);
 for(const id of model.ids){if(receipt.chapters.some(x=>x.chapter_id===id))check.save(id,check.editable(id));const a=check.editable(id),b=model.editable(id);delete a.segmentation_note;delete b.segmentation_note;if(JSON.stringify(a)!==JSON.stringify(b))throw Error('非分词字段变化 '+id);}
 fs.writeFileSync('manual-revisions.json',JSON.stringify(after));fs.writeFileSync('reports/entity-boundary-application.json',JSON.stringify(receipt));
 console.log(JSON.stringify({chapters:receipt.chapters.length,counts:receipt.counts,held:receipt.held.length}));
}
if(require.main===module)run();module.exports={revise};
