(function(root){'use strict';
function components(graph,removed){const adj=new Map(graph.nodes.filter(n=>n.id!==removed).map(n=>[n.id,[]]));for(const e of graph.edges)if(adj.has(e.source)&&adj.has(e.target)){adj.get(e.source).push(e.target);adj.get(e.target).push(e.source);}const seen=new Set(),sizes=[];for(const id of adj.keys()){if(seen.has(id))continue;let size=0,stack=[id];seen.add(id);while(stack.length){const n=stack.pop();size++;for(const next of adj.get(n))if(!seen.has(next)){seen.add(next);stack.push(next);}}sizes.push(size);}return sizes.sort((a,b)=>b-a);}
function compare(chapters,id,kind='both'){const terms=c=>new Set([...(kind==='space'?[]:c.places.map(w=>'地点：'+w)),...(kind==='place'?[]:c.spaces.map(w=>'空间：'+w))]);const source=chapters.find(c=>String(c.id)===String(id));if(!source)return [];const a=terms(source),df=new Map();for(const c of chapters)for(const t of terms(c))df.set(t,(df.get(t)||0)+1);return chapters.filter(c=>c!==source).map(c=>{const b=terms(c),shared=[...a].filter(t=>b.has(t)),union=new Set([...a,...b]);let numerator=0,denominator=0;for(const t of union){const w=Math.log(1+chapters.length/df.get(t));denominator+=w;if(a.has(t)&&b.has(t))numerator+=w;}return {id:c.id,title:c.title,shared,score:denominator?numerator/denominator:0};}).filter(r=>r.shared.length).sort((a,b)=>b.score-a.score||b.shared.length-a.shared.length);}
function communities(graph){
 const nodeIndex=new Map(graph.nodes.map((n,i)=>[n.id,i]));let members=graph.nodes.map(n=>[n.id]),edges=graph.edges.map(e=>({source:nodeIndex.get(e.source),target:nodeIndex.get(e.target),weight:e.weight||1}));
 while(members.length){
  const adj=members.map(()=>new Map()),degree=members.map(()=>0);let total=0;
  for(const e of edges){const {source:a,target:b,weight:w}=e;degree[a]+=w;degree[b]+=w;total+=2*w;adj[a].set(b,(adj[a].get(b)||0)+w);if(a!==b)adj[b].set(a,(adj[b].get(a)||0)+w);}
  if(!total)break;const group=members.map((_,i)=>i),sums=[...degree];
  for(let pass=0;pass<40;pass++){let moved=false;for(let i=0;i<members.length;i++){const current=group[i],weights=new Map();for(const [j,w]of adj[i])if(j!==i)weights.set(group[j],(weights.get(group[j])||0)+w);sums[current]-=degree[i];let best=current,score=(weights.get(current)||0)-degree[i]*sums[current]/total;for(const [c,w]of weights){const gain=w-degree[i]*sums[c]/total;if(gain>score+1e-9){score=gain;best=c;}}group[i]=best;sums[best]+=degree[i];if(best!==current)moved=true;}if(!moved)break;}
  const unique=[...new Set(group)],index=new Map(unique.map((g,i)=>[g,i]));if(unique.length===members.length)break;
  const next=unique.map(()=>[]);members.forEach((ids,i)=>next[index.get(group[i])].push(...ids));const merged=new Map();for(const e of edges){let a=index.get(group[e.source]),b=index.get(group[e.target]);if(a>b)[a,b]=[b,a];const key=a+':'+b;if(!merged.has(key))merged.set(key,{source:a,target:b,weight:0});merged.get(key).weight+=e.weight;}members=next;edges=[...merged.values()];
 }
 members.sort((a,b)=>b.length-a.length||a[0].localeCompare(b[0]));return Object.fromEntries(members.flatMap((ids,i)=>ids.map(id=>[id,i])));
}
function layout(graph){
 const nodes=graph.nodes.map((n,i)=>({...n,x:Math.sqrt(i+1)*24*Math.cos(i*2.399963),y:Math.sqrt(i+1)*24*Math.sin(i*2.399963),vx:0,vy:0})),byId=new Map(nodes.map(n=>[n.id,n]));
 for(let k=0;k<280;k++){
  for(const n of nodes){n.vx-=n.x*.0015;n.vy-=n.y*.0015;}
  for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){const a=nodes[i],b=nodes[j],dx=a.x-b.x,dy=a.y-b.y,d=Math.max(1,Math.hypot(dx,dy)),f=1800/(d*d);a.vx+=dx/d*f;a.vy+=dy/d*f;b.vx-=dx/d*f;b.vy-=dy/d*f;}
  for(const e of graph.edges){const a=byId.get(e.source),b=byId.get(e.target);if(!a||!b)continue;const dx=b.x-a.x,dy=b.y-a.y,d=Math.max(1,Math.hypot(dx,dy)),f=(d-105)*.012;a.vx+=dx/d*f;a.vy+=dy/d*f;b.vx-=dx/d*f;b.vy-=dy/d*f;}
  for(const n of nodes){n.vx*=.72;n.vy*=.72;const speed=Math.max(1,Math.hypot(n.vx,n.vy)/12);n.x+=n.vx/speed;n.y+=n.vy/speed;}
 }
 if(!nodes.length)return nodes;
 const xs=nodes.map(n=>n.x),ys=nodes.map(n=>n.y),left=Math.min(...xs),top=Math.min(...ys),width=Math.max(...xs)-left,height=Math.max(...ys)-top,scale=Math.min(1.8,740/Math.max(1,width),580/Math.max(1,height));
 return nodes.map(({vx,vy,...n})=>({...n,x:410+(n.x-left-width/2)*scale,y:350+(n.y-top-height/2)*scale}));
}
function directionStats(graph){const stats=Object.fromEntries(graph.nodes.map(n=>[n.id,{inDegree:0,outDegree:0,inStrength:0,outStrength:0}]));for(const e of graph.edges){const a=stats[e.source],b=stats[e.target];a.outDegree++;b.inDegree++;a.outStrength+=e.weight;b.inStrength+=e.weight;}return stats;}
function communitySample(graph,partition,perGroup=10,maxGroups=12){const groups=new Map(),strength=new Map(graph.nodes.map(n=>[n.id,0]));for(const e of graph.edges){strength.set(e.source,strength.get(e.source)+e.weight);strength.set(e.target,strength.get(e.target)+e.weight);}for(const n of graph.nodes){const key=partition[n.id];if(!groups.has(key))groups.set(key,[]);groups.get(key).push(n);}const selected=[...groups.values()].sort((a,b)=>b.reduce((s,n)=>s+strength.get(n.id),0)-a.reduce((s,n)=>s+strength.get(n.id),0)).slice(0,maxGroups),nodes=selected.flatMap(g=>[...g].sort((a,b)=>strength.get(b.id)-strength.get(a.id)||a.id.localeCompare(b.id)).slice(0,perGroup)),ids=new Set(nodes.map(n=>n.id));return {nodes,edges:graph.edges.filter(e=>ids.has(e.source)&&ids.has(e.target)),groups:selected.length,totalGroups:groups.size};}
const api={components,compare,layout,communities,directionStats,communitySample};if(typeof module!=='undefined')module.exports=api;else root.GhostNetworkAnalysis=api;
})(typeof window==='undefined'?globalThis:window);
