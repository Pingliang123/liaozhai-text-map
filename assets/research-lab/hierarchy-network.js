(function(root){'use strict';
// Reference-year relations never imply a continuous historical jurisdiction.
function active(r,year){if(year==null)return r.map_current===true;return r.reference_year!=null?r.reference_year===year:(r.valid_from!=null||r.valid_to!=null)&&(r.valid_from==null||year>=r.valid_from)&&(r.valid_to==null||year<=r.valid_to);}
function mergeEvidence(rows){
 const groups=new Map();
 for(const row of rows){
  const key=JSON.stringify([row.chapterId??row.chapter,row.unit??null,row.id||'',row.text||row.quote||'',row.assignment||'',row.basis||'']);
  if(!groups.has(key))groups.set(key,{...row,original_relations:[]});
  const group=groups.get(key),relations=[...(row.original_relations||[]),...(row.original_source&&row.original_target?[{source:row.original_source,target:row.original_target}]:[])];
  for(const relation of relations)if(!group.original_relations.some(r=>r.source===relation.source&&r.target===relation.target))group.original_relations.push({...relation});
 }
 return [...groups.values()];
}
function project(graph,records,level,year=null){
 const byId=new Map(Object.values(records).filter(r=>r.id).map(r=>[r.id,r]));
 const resolve=n=>{if(n.kind!=='place'||n.realm==='otherworld')return n;let r=records[n.label],seen=new Set();while(r){if(r.level===level||(level==='town'&&r.level==='village'))return {...n,id:'place:'+r.name,label:r.name,degree:0};if(seen.has(r.id))return null;seen.add(r.id);const timed=(r.belongs_to||[]).filter(x=>active(x,year));const parents=[...new Set(timed.map(x=>x.target))];if(parents.length!==1)return null;r=byId.get(parents[0]);}return null;};
 const nodes=new Map(),mapped=new Map(),edges=new Map();let unresolved=0,internal=0;
 for(const n of graph.nodes){const p=resolve(n);if(p){nodes.set(p.id,p);mapped.set(n.id,p.id);}else unresolved++;}
 for(const e of graph.edges){const a=mapped.get(e.source),b=mapped.get(e.target);if(!a||!b)continue;const key=e.directed?JSON.stringify([a,b,e.relation]):JSON.stringify([[a,b].sort(),e.relation]);if(!edges.has(key))edges.set(key,{...e,source:a,target:b,weight:0,evidence:[],original_edges:[],internal:a===b});const row=edges.get(key);row.original_edges.push({source:e.source,target:e.target,weight:e.weight});row.evidence.push(...(e.evidence||[]).map(x=>({...x,original_source:e.source,original_target:e.target})));row.weight+=e.weight||1;if(a===b)internal++;}
 const result=[...edges.values()];
 for(const e of result){
  // Chapter co-presence is counted once per chapter after region projection.
  // Directed movement still counts distinct saved steps, even with one quote.
  if(['places','place-otherworld','located-space','located-otherworld'].includes(e.relation)&&!e.directed){
   e.evidence=mergeEvidence(e.evidence);
   const chapters=e.evidence.map(r=>r.chapterId??r.chapter);
   if(chapters.length&&chapters.every(id=>id!==undefined))e.weight=new Set(chapters).size;
  }
 }
 for(const n of nodes.values())n.degree=result.filter(e=>e.source===n.id||e.target===n.id).length;
 return {...graph,nodes:[...nodes.values()],edges:result.filter(e=>!e.internal),internal_edges:result.filter(e=>e.internal),projection:{level,year,unresolved,internal}};
}
const api={active,project,mergeEvidence};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.GhostHierarchyNetwork=api;
})(typeof window==='undefined'?globalThis:window);
