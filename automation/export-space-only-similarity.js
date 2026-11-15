'use strict';
const fs=require('fs');const s=JSON.parse(fs.readFileSync('.network-runtime/place-space-topic-input.json','utf8'));for(const c of s.chapters){const allowed=new Set(c.space_words);c.tokens=c.tokens.filter(w=>allowed.has(w));}fs.writeFileSync('.network-runtime/space-only-similarity-input.json',JSON.stringify(s));
