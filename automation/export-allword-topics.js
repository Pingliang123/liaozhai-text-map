'use strict';
const fs=require('node:fs'),crypto=require('node:crypto'),M=require('./ghost_map_model'),R=require('../assets/spatial-routes');
const bytes=fs.readFileSync('data-package.json'),p=JSON.parse(bytes),m=M.create(p.base);m.importDocument(p.revisions);
const stopBytes=fs.readFileSync('automation/topic-stopwords.txt'),stop=new Set(stopBytes.toString('utf8').split(/\r?\n/).filter(s=>!s.trim().startsWith('#')).join(' ').split(/\s+/).filter(Boolean));
const chapters=p.base.chapter_overview.map(row=>{
 const c=m.view(row.chapter_id??row.id),units=R.tokenUnits(c,R.lexicon(c));
 const tokens=units.flat().filter(w=>typeof w==='string'&&/^\p{Script=Han}+$/u.test(w)&&!stop.has(w));
 return {id:c.chapter_id,title:c.chapter,events:Object.keys(c.event_types||{}).filter(k=>c.event_types[k]),tokens};
});
const out={source_sha256:crypto.createHash('sha256').update(bytes).digest('hex'),stopwords_sha256:crypto.createHash('sha256').update(stopBytes).digest('hex'),stopwords:[...stop],chapters};
fs.mkdirSync('.network-runtime',{recursive:true});fs.writeFileSync('.network-runtime/allword-topic-input.json',JSON.stringify(out));
console.log(JSON.stringify({chapters:chapters.length,tokens:chapters.reduce((n,c)=>n+c.tokens.length,0),empty:chapters.filter(c=>!c.tokens.length).length}));
