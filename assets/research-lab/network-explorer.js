(function(root){'use strict';
// View selection only: never rewrite the analytical graph or its metrics.
function neighborhood(graph,focus,limit=60,hops=1,direction='both'){
 const byId=new Map(graph.nodes.map(n=>[n.id,n])),adj=new Map(graph.nodes.map(n=>[n.id,[]]));
 for(const e of graph.edges){if(!e.directed||direction!=='in'||e.source===e.target)adj.get(e.source).push({id:e.target,e});if(e.source!==e.target&&(!e.directed||direction!=='out'))adj.get(e.target).push({id:e.source,e});}
 if(!byId.has(focus))return {nodes:[],edges:[]};
 const chosen=new Set([focus]),traversed=new Set();let frontier=[focus];
 for(let level=0;level<hops&&frontier.length;level++){
  const candidates=frontier.flatMap(id=>adj.get(id)).sort((a,b)=>b.e.weight-a.e.weight||a.id.localeCompare(b.id)),next=[];
  for(const {id,e} of candidates){if(!chosen.has(id)&&chosen.size<limit){chosen.add(id);next.push(id);}if(chosen.has(id))traversed.add(e);}
  frontier=next;
 }
 return {nodes:graph.nodes.filter(n=>chosen.has(n.id)),edges:graph.edges.filter(e=>traversed.has(e)),neighbors:[...new Set(adj.get(focus).map(r=>r.id))]};
}
function groups(graph,partition){const grouped=new Map(),strength=new Map(graph.nodes.map(n=>[n.id,0]));for(const e of graph.edges){strength.set(e.source,strength.get(e.source)+e.weight);strength.set(e.target,strength.get(e.target)+e.weight);}for(const n of graph.nodes){const id=partition[n.id];if(!grouped.has(id))grouped.set(id,[]);grouped.get(id).push(n);}return [...grouped].map(([id,nodes])=>({id,nodes:nodes.sort((a,b)=>strength.get(b.id)-strength.get(a.id)||a.id.localeCompare(b.id))})).sort((a,b)=>b.nodes.length-a.nodes.length||a.id-b.id);}
function groupView(graph,partition,id,limit=120){const group=groups(graph,partition).find(g=>String(g.id)===String(id)),members=group?.nodes||[],keep=new Set(members.slice(0,limit).map(n=>n.id));return {nodes:members.filter(n=>keep.has(n.id)),edges:graph.edges.filter(e=>keep.has(e.source)&&keep.has(e.target)),total:members.length};}
function radius(n,metrics){return metrics?Math.max(3,Math.sqrt((metrics[n.id]?.degree||0)*4000/Math.PI)):Math.min(28,7+Math.sqrt(n.strength||1)*1.4);}
function arrow(a,b,ra,rb){
 if(a.id===b.id){const r=ra+4;return `M${a.x+r} ${a.y} C${a.x+r+65} ${a.y-r-75} ${a.x-r-65} ${a.y-r-75} ${a.x-r} ${a.y}`;}
 const dx=b.x-a.x,dy=b.y-a.y,len=Math.max(.001,Math.hypot(dx,dy)),bend=Math.min(22,len*.2),cx=(a.x+b.x)/2-dy/len*bend,cy=(a.y+b.y)/2+dx/len*bend,from=Math.max(.001,Math.hypot(cx-a.x,cy-a.y)),to=Math.max(.001,Math.hypot(b.x-cx,b.y-cy)),r1=Math.min(ra+3,from*.8),r2=Math.min(rb+4,to*.8);
 return `M${a.x+(cx-a.x)/from*r1} ${a.y+(cy-a.y)/from*r1} Q${cx} ${cy} ${b.x-(b.x-cx)/to*r2} ${b.y-(b.y-cy)/to*r2}`;
}
const api={neighborhood,groups,groupView,radius,arrow};if(typeof module!=='undefined')module.exports=api;else root.GhostNetworkExplorer=api;
})(typeof window==='undefined'?globalThis:window);
