(function(root){'use strict';
function scan(base,model){
 const known=[...new Set(model.ids.flatMap(id=>model.view(id).places.map(p=>p.word)))].filter(w=>w.length>1).sort((a,b)=>b.length-a.length||a.localeCompare(b));const rows=[];
 for(const id of model.ids){const c=model.view(id),active=new Set(c.places.map(p=>p.word)),spaces=new Set(c.space_words||[]),pool=new Set();
  const tokens=c.segmentation_note?c.segmentation_note.split(/[\s/|]+/u).filter(Boolean):c.source_units.flatMap(u=>(u.tokens||[]).map(([a,b])=>(u.text||u.original||'').slice(a,b)));for(const t of tokens)pool.add(t);
  for(const row of base.candidate_review?.places?.rows||[])if(row.chapter_ids?.includes(id))pool.add(row.word);
  // Exact place names in the source may be missing from both token and candidate lists.
  const source=c.source_units.map(u=>u.text||u.original||'').join('');for(const w of known)if(source.includes(w))pool.add(w);
  for(const word of pool){if(active.has(word)||spaces.has(word)||c.lexical_reviews?.['places:'+word])continue;const matches=known.filter(w=>word.includes(w));if(!matches.length)continue;const evidence=c.source_units.filter(u=>(u.text||u.original||'').includes(word));if(!evidence.length)continue;rows.push({word,chapter:c.chapter,chapter_id:id,kind:'places',key:'places:'+word,status:'pending',present:false,matches,issue:known.includes(word)?'同名漏标':'包含已知地名的分词',evidence:evidence.map(u=>({unit:u.unit,text:u.text||u.original}))});}
 }
 return rows;
}
const api={scan};if(typeof module!=='undefined')module.exports=api;else root.GhostPlaceCrosscheck=api;
})(globalThis);
