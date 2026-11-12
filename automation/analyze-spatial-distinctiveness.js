'use strict';
// Read-only analysis of effective saved revisions; never writes source data.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const M=require('./ghost_map_model'),R=require('../assets/spatial-routes');
const p=require('../data-package.json'),m=M.create(p.base);m.importDocument(p.revisions);
const chapters=[];
for(const id of m.ids){
 const c=m.view(id),rows=R.tokenUnits(c,R.lexicon(c)),counts=new Map();
 for(const w of rows.flat())counts.set(w,(counts.get(w)||0)+1);
 const spaces=[...new Set(c.space_words||[])];
 chapters.push({id,title:c.chapter,events:Object.keys(c.event_types||{}).filter(k=>c.event_types[k]),
  token_count:rows.flat().length,spaces:spaces.filter(w=>counts.has(w)),
  unmatched:spaces.filter(w=>!counts.has(w)),counts:Object.fromEntries(spaces.filter(w=>counts.has(w)).map(w=>[w,counts.get(w)])),
  evidence:(c.source_units||[]).map((u,i)=>({unit:u.unit,text:u.text||u.original,tokens:rows[i]}))});
}
const out=path.join(__dirname,'../.network-runtime/spatial-distinctiveness-source.json');
fs.mkdirSync(path.dirname(out),{recursive:true});
fs.writeFileSync(out,JSON.stringify({source_sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'../data-package.json'))).digest('hex'),basis:'effective canonical revisions; exact saved tokens; chapter presence',chapters}));
console.log(JSON.stringify({chapters:chapters.length,output:out}));
