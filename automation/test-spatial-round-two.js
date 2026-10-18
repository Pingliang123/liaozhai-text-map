const assert=require('assert/strict'),fs=require('fs'),M=require('./ghost_map_model');
const {fixes,retained}=require('./review-spatial-round-two');
const p=JSON.parse(fs.readFileSync('data-package.json')),m=M.create(p.base);m.importDocument(JSON.parse(fs.readFileSync('manual-revisions.json')));
for(const [id,kind,old,word,target=kind]of fixes){const c=m.view(id),words=k=>k==='spaces'?c.space_words:c.places.map(x=>x.word);assert(!words(kind).includes(old),id+' retained '+old);if(word)assert(words(target).includes(word),id+' missing '+word);}
for(const {chapter_id,word}of retained){const c=m.view(chapter_id);assert(c.source_units.some(u=>(u.text||u.original||'').includes(word)));}
console.log('PASS corrections, retained contextual abbreviations and bodily spaces have source evidence');
