(function(root){'use strict';
function build(chapters){const nodes=new Map(),edges=new Map();const put=(kind,word)=>{const id=kind+':'+word;if(!nodes.has(id))nodes.set(id,{id,label:word,kind,degree:0});return id;};
 for(const c of chapters){const places=[...new Set(c.places)],spaces=[...new Set(c.spaces)],actors=[...new Set(c.people.map(p=>p.word))];
  const add=(source,target)=>{const pair=[source,target].sort(),key=JSON.stringify(pair);if(!edges.has(key))edges.set(key,{source:pair[0],target:pair[1],weight:0,chapter:'同篇关联',evidence:[]});const e=edges.get(key),a=nodes.get(source).label,b=nodes.get(target).label,units=c.units.filter(u=>u.text.includes(a)||u.text.includes(b));e.weight++;e.evidence.push({chapter:c.title,chapterId:c.id,actors,text:units.map(u=>u.text).join('\n'),basis:'同篇标注'});};
  for(const p of places)put('place',p);for(const s of spaces)put('space',s);
  for(let i=0;i<places.length;i++){for(let j=i+1;j<places.length;j++)add(put('place',places[i]),put('place',places[j]));for(const s of spaces)add(put('place',places[i]),put('space',s));}
 }
 for(const e of edges.values()){nodes.get(e.source).degree++;nodes.get(e.target).degree++;}
 return {nodes:[...nodes.values()],edges:[...edges.values()]};
}
function edgeLabel(edge){const r=edge.evidence[0];if(!r)return '';const names=r.actors||[],people=names.slice(0,2).join('、')+(names.length>2?'等'+names.length+'人':'');return '《'+r.chapter+'》'+(people?' · '+people:' · 人物未标')+(edge.evidence.length>1?' ＋'+(edge.evidence.length-1)+'篇':'');}
function neighborhood(graph,focus,limit){const chapters=new Set(graph.edges.filter(e=>e.source===focus||e.target===focus).flatMap(e=>e.evidence.map(r=>r.chapterId))),edges=graph.edges.map(e=>({...e,evidence:e.evidence.filter(r=>chapters.has(r.chapterId))})).filter(e=>e.evidence.length).map(e=>({...e,weight:e.evidence.length})),ids=new Set([focus,...edges.flatMap(e=>[e.source,e.target])]);const nodes=graph.nodes.filter(n=>ids.has(n.id)).sort((a,b)=>(b.id===focus)-(a.id===focus)||(a.kind==='space')-(b.kind==='space')||b.degree-a.degree).slice(0,limit),shown=new Set(nodes.map(n=>n.id));return {nodes,edges:edges.filter(e=>shown.has(e.source)&&shown.has(e.target)),total:ids.size,neighbors:[]};}
const api={build,edgeLabel,neighborhood};if(typeof module!=='undefined'){module.exports=api;return;}
function mount(container,chapters,onExport){const note=document.createElement('p');note.className='note';note.textContent='地点连接同篇的其他地点，并延伸至该篇空间词。线旁列篇名与篇中人物；点击查看全部人物和原文。同篇关系不代表人物实际往返。';container.append(note);root.GhostBookNetwork.mount(container,chapters,onExport,{graph:build(chapters),lexical:true,placeNetwork:true,scope:'chapter',edgeLabel,neighborhood});}
root.GhostPlaceNetwork={...api,mount};
})(typeof window==='undefined'?globalThis:window);
