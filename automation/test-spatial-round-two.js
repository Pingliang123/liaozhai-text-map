const assert=require('assert/strict'),fs=require('fs'),M=require('./ghost_map_model');
const {fixes,retained}=require('./review-spatial-round-two');
const {revise}=require('./review-place-space-contexts');
const p=JSON.parse(fs.readFileSync('data-package.json')),m=M.create(p.base);m.importDocument(JSON.parse(fs.readFileSync('manual-revisions.json')));
for(const row of fixes){const [id,kind,old,word,target=kind]=row,c=m.view(id),d=m.editable(id);
 // Replay each historical rule in isolation. Later human choices are authoritative.
 if(kind==='spaces')d.space_words=[...new Set([...d.space_words,old])];else d.places.push({word:old,mentions:0});
 assert(revise(c,d,row));const words=k=>k==='spaces'?d.space_words:d.places.map(x=>x.word);assert(!words(kind).includes(old),id+' retained '+old);if(word)assert(words(target).includes(word),id+' missing '+word);
}
for(const {chapter_id,word}of retained){const c=m.view(chapter_id);assert(c.source_units.some(u=>(u.text||u.original||'').includes(word)));}
console.log('PASS corrections, retained contextual abbreviations and bodily spaces have source evidence');
