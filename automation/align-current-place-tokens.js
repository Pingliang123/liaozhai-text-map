'use strict';
const fs=require('fs'),crypto=require('crypto');
const {effectiveTokens,sourceOf}=require('./audit-place-token-boundaries');
const {segmentationNote}=require('./apply-place-token-boundary-fixes');
function align(c){
 const source=sourceOf(c),tokens=effectiveTokens(c),exact=new Set(tokens.map(t=>t.text)),cuts=new Set(tokens.flatMap(t=>[t.start,t.end]));
 const applied=[],held=[],spans=[];
 for(const p of c.places){if(exact.has(p.word))continue;let at=0,found=false;
  while((at=source.indexOf(p.word,at))>=0){found=true;spans.push({word:p.word,start:at,end:at+p.word.length});at+=p.word.length;}
  if(!found)held.push({word:p.word,reason:'原文未找到该词'});
 }
 spans.sort((a,b)=>b.word.length-a.word.length||a.start-b.start);const chosen=tokens.filter(t=>c.places.some(p=>p.word===t.text));
 for(const s of spans){if(chosen.some(t=>s.start<t.end&&s.end>t.start)){held.push({...s,reason:'与较长地点词重叠'});continue;}chosen.push(s);cuts.add(s.start);cuts.add(s.end);for(const n of [...cuts])if(n>s.start&&n<s.end)cuts.delete(n);applied.push(s);}
 const note=segmentationNote(c,cuts);
 if(note.replace(/[\s/|]+/gu,'')!==source.replace(/[\s/|]+/gu,''))throw Error('原文对齐失败');
 return {note,applied,held};
}
function run(){
 const pack=JSON.parse(fs.readFileSync('data-package.json')),M=require('./ghost_map_model'),model=M.create(pack.base),before=fs.readFileSync('manual-revisions.json','utf8'),doc=JSON.parse(before);model.importDocument(doc);
 const overrides=new Map(doc.overrides.map(r=>[r.chapter_id,r])),report={before_sha256:crypto.createHash('sha256').update(before).digest('hex'),chapters:[],held:[]};
 for(const id of model.ids){const c=model.view(id),r=align(c);report.held.push(...r.held.map(v=>({...v,chapter_id:id,chapter:c.chapter})));if(!r.applied.length)continue;
  const changes=model.editable(id);changes.segmentation_note=r.note;overrides.set(id,{chapter_id:id,changes});report.chapters.push({chapter_id:id,chapter:c.chapter,applied:r.applied});
 }
 const next={...doc,overrides:[...overrides.values()]};const check=M.create(pack.base);check.importDocument(next);
 for(const id of model.ids){const a=model.editable(id),b=check.editable(id);delete a.segmentation_note;delete b.segmentation_note;if(JSON.stringify(a)!==JSON.stringify(b))throw Error('非分词字段发生改变');}
 fs.writeFileSync('manual-revisions.json',JSON.stringify(next));fs.writeFileSync('reports/current-place-token-alignment.json',JSON.stringify(report,null,2));console.log(JSON.stringify({chapters:report.chapters.length,occurrences:report.chapters.reduce((n,c)=>n+c.applied.length,0),held:report.held.length}));
}
if(require.main===module)run();module.exports={align};
