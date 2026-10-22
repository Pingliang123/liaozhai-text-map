(function(root){'use strict';
function canonical(word,aliases={}){const seen=new Set();while(aliases[word]&&aliases[word]!==word&&!seen.has(word)){seen.add(word);word=aliases[word];}return word;}
function graph(input,aliases={}){
 const nodes=new Map(),ids=new Map(),pairs=new Map();
 for(const n of input.nodes){const label=n.kind==='place'?canonical(n.label,aliases):n.label,id=n.kind==='place'?'place:'+label:n.id;ids.set(n.id,id);if(!nodes.has(id))nodes.set(id,{...n,id,label,degree:0,original_names:[]});const row=nodes.get(id);if(!row.original_names.includes(n.label))row.original_names.push(n.label);}
 for(const e of input.edges){const source=ids.get(e.source),target=ids.get(e.target);if(source===target)continue;const pair=e.directed?[source,target]:[source,target].sort(),key=JSON.stringify([pair,e.relation||'',!!e.directed]);if(!pairs.has(key))pairs.set(key,{...e,source:pair[0],target:pair[1],weight:0,evidence:[],original_edges:[]});const row=pairs.get(key);row.original_edges.push({source:e.source,target:e.target,weight:e.weight});row.evidence.push(...(e.evidence||[]));}
 for(const e of pairs.values()){
  const seen=new Set();e.evidence=e.evidence.filter(r=>{const key=JSON.stringify([r.chapterId??r.chapter,r.unit??null,r.id||'',r.text||r.quote||'',r.assignment||'',r.sequence??null]);if(seen.has(key))return false;seen.add(key);return true;});
  e.weight=e.relation==='places'||e.relation==='place-otherworld'||e.relation==='located-space'||e.relation==='located-otherworld'||input.mode==='chapter'?new Set(e.evidence.map(r=>r.chapterId??r.chapter)).size:e.directed||input.mode==='unit'?e.evidence.length:e.original_edges.reduce((n,x)=>n+x.weight,0);
  for(const id of [e.source,e.target])nodes.get(id).degree++;
 }
 return {...input,nodes:[...nodes.values()],edges:[...pairs.values()]};
}
const api={canonical,graph};if(typeof module!=='undefined')module.exports=api;else root.GhostPlaceNodeMerges=api;
})(globalThis);
