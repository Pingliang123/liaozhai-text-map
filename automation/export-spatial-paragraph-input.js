'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const M=require('./ghost_map_model'),R=require('../assets/spatial-routes');
const root=path.resolve(__dirname,'..'),rawPath=process.argv[2];
if(!rawPath)throw new Error('Usage: node automation/export-spatial-paragraph-input.js <original.txt>');
const bytes=fs.readFileSync(path.join(root,'data-package.json')),p=JSON.parse(bytes),m=M.create(p.base);m.importDocument(p.revisions);
const marker=JSON.parse(fs.readFileSync(path.join(root,'.network-runtime/tutorial-topic-chapter-markers.json')));
const raw=fs.readFileSync(rawPath),rawHash=crypto.createHash('sha256').update(raw).digest('hex');
if(rawHash!==marker.raw_sha256)throw new Error('Raw text does not match chapter-marker source');
const lines=raw.toString('utf8').replace(/^\uFEFF/,'').split('\n');
const chapters=m.ids.map(id=>{
 const c=m.view(id),i=marker.markers.findIndex(mark=>mark.id===id),start=marker.markers[i].line;
 const end=marker.markers[i+1]?.line||lines.length+1,rows=R.tokenUnits(c,R.lexicon(c));
 return {id,title:c.chapter,events:Object.keys(c.event_types||{}).filter(t=>c.event_types[t]),spaces:c.space_words,
   evidence:c.source_units.map((u,j)=>({unit:u.unit,text:u.text||u.original,original:u.original||u.text,tokens:rows[j]})),
   paragraphs:lines.slice(start,end-1).map((text,k)=>({line:start+k+1,text})).filter(p=>p.text.trim())};
});
const output={source_sha256:crypto.createHash('sha256').update(bytes).digest('hex'),raw_sha256:rawHash,chapters};
fs.writeFileSync(path.join(root,'.network-runtime/spatial-paragraph-input.json'),JSON.stringify(output));
console.log(JSON.stringify({chapters:chapters.length,original_lines:chapters.reduce((n,c)=>n+c.paragraphs.length,0)}));
