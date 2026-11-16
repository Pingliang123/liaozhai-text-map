'use strict';
const input=require('../.network-runtime/latest-place-space-input.json');
const fs=require('fs'),M=require('./ghost_map_model'),R=require('../assets/spatial-routes'),crypto=require('crypto');
const raw=fs.readFileSync('.network-runtime/latest-live-package.json'),p=JSON.parse(raw),d=JSON.parse(fs.readFileSync(process.argv[2]||'reports/最新五主題_類型對照.json','utf8')),m=M.create(p.base);m.importDocument(p.revisions);
if(crypto.createHash('sha256').update(raw).digest('hex')!==d.source_sha256)throw Error('来源版本不一致');
for(const t of d.topics)for(const r of t.representatives){
 const c=m.view(r.id),words=new Set(t.words.map(x=>x.word)),units=R.tokenUnits(c,R.lexicon(c));
 let candidates=c.source_units.map((u,i)=>({unit:u.unit,quote:u.text||u.original||'',matched:[...new Set((units[i]||[]).filter(w=>words.has(w)))]})).filter(u=>u.matched.length).sort((a,b)=>b.matched.length-a.matched.length).slice(0,2);
 r.evidence_basis='主題前十五詞';
 if(!candidates.length){
  const allowed=new Set(input.chapters.find(x=>x.id===r.id).tokens);
  candidates=c.source_units.map((u,i)=>({unit:u.unit,quote:u.text||u.original||'',matched:[...new Set((units[i]||[]).filter(w=>allowed.has(w)))]})).filter(u=>u.matched.length).sort((a,b)=>b.matched.length-a.matched.length).slice(0,2);
  r.evidence_basis='本篇已入模空間詞（非主題前十五詞）';
 }
 r.evidence=candidates;
}
fs.writeFileSync(process.argv[2]||'reports/最新五主題_類型對照.json',JSON.stringify(d,null,2));
console.log('Representative chapters',d.topics.reduce((n,t)=>n+t.representatives.length,0));
