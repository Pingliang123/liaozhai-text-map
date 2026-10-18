(function(root){'use strict';
function components(graph,removed){const adj=new Map(graph.nodes.filter(n=>n.id!==removed).map(n=>[n.id,[]]));for(const e of graph.edges)if(adj.has(e.source)&&adj.has(e.target)){adj.get(e.source).push(e.target);adj.get(e.target).push(e.source);}const seen=new Set(),sizes=[];for(const id of adj.keys()){if(seen.has(id))continue;let size=0,stack=[id];seen.add(id);while(stack.length){const n=stack.pop();size++;for(const next of adj.get(n))if(!seen.has(next)){seen.add(next);stack.push(next);}}sizes.push(size);}return sizes.sort((a,b)=>b-a);}
function compare(chapters,id,kind='both'){const terms=c=>new Set([...(kind==='space'?[]:c.places.map(w=>'地点：'+w)),...(kind==='place'?[]:c.spaces.map(w=>'空间：'+w))]);const source=chapters.find(c=>String(c.id)===String(id));if(!source)return [];const a=terms(source),df=new Map();for(const c of chapters)for(const t of terms(c))df.set(t,(df.get(t)||0)+1);return chapters.filter(c=>c!==source).map(c=>{const b=terms(c),shared=[...a].filter(t=>b.has(t)),union=new Set([...a,...b]);let numerator=0,denominator=0;for(const t of union){const w=Math.log(1+chapters.length/df.get(t));denominator+=w;if(a.has(t)&&b.has(t))numerator+=w;}return {id:c.id,title:c.title,shared,score:denominator?numerator/denominator:0};}).filter(r=>r.shared.length).sort((a,b)=>b.score-a.score||b.shared.length-a.shared.length);}
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
const api={components,compare,layout};if(typeof module!=='undefined')module.exports=api;else root.GhostNetworkAnalysis=api;
})(typeof window==='undefined'?globalThis:window);
