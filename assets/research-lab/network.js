(function(root){'use strict';
const known=s=>s&&!/未明|不详|未知|待核|未定/.test(s);
function build(chapter){
 const nodes=[],edges=[],relations=new Map();
 for(const [i,s]of chapter.steps.entries()){
  const quote=String(s.quote||''),evidence=quote?[{chapter:chapter.title,text:quote,step:i+1,unit:s.unit}]:[];
  nodes.push({id:'step:'+i,label:'步骤 '+(i+1),from:s.from,to:s.to,actors:s.actors,kind:s.kind,quote,unit:s.unit,order:i+1});
  if(i)edges.push({source:'step:'+(i-1),target:'step:'+i,type:'sequence',evidence});
  // Actor fields are expressions in the annotation, not resolved character identities.
  const actor=String(s.actors||'').trim();if(!known(actor))continue;
  const spaces=[...new Set([s.from,s.to].filter(known))];
  for(const space of spaces){const key=JSON.stringify([actor,space]);if(!relations.has(key))relations.set(key,{actor,space,steps:[],evidence:[]});const r=relations.get(key);r.steps.push(i+1);r.evidence.push(...evidence);}
 }
 return {chapter:chapter.title,chapter_id:chapter.id,nodes,edges,relations:[...relations.values()]};
}
function connected(graph){const nodes=new Map(),edges=new Map();const add=(kind,label)=>{const id=kind+':'+label;if(!nodes.has(id))nodes.set(id,{id,label,kind});return id;};
 for(const r of graph.relations){const source=add('actor',r.actor),target=add('space',r.space);edges.set(JSON.stringify([source,target,'presence']),{source,target,kind:'presence',weight:r.steps.length,evidence:r.evidence});}
 for(const n of graph.nodes)if(n.kind==='movement'&&known(n.from)&&known(n.to)){const source=add('space',n.from),target=add('space',n.to),key=JSON.stringify([source,target,'movement']);if(!edges.has(key))edges.set(key,{source,target,kind:'movement',weight:0,evidence:[]});const e=edges.get(key);e.weight++;if(n.quote)e.evidence.push({chapter:graph.chapter,text:n.quote,step:n.order,unit:n.unit});}
 return {nodes:[...nodes.values()],edges:[...edges.values()]};}
const api={build,connected};if(typeof module!=='undefined'){module.exports=api;return;}
const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
function mount(container,chapters,onExport){
 const card=el('section');card.className='card';card.append(el('h2','情节网络'),el('p','情节箭头表示现有标注的先后次序，不表示因果。人物—空间连线表示同一步骤中被标注的关联；人物字段按原表达保留，尚未合并别名。'));
 const picker=el('select');picker.setAttribute('aria-label','选择情节网络篇目');
 for(const c of chapters.filter(c=>c.steps.length)){const o=el('option',c.title+' · '+c.steps.length+'步');o.value=c.id;picker.append(o);}
 const view=el('select');view.setAttribute('aria-label','选择网络类型');for(const [value,label]of [['graph','节点网络'],['sequence','情节次序'],['relations','关联列表']]){const o=el('option',label);o.value=value;view.append(o);}
 const controls=el('div');controls.className='filters';const save=el('button','下载本篇网络 JSON');controls.append(picker,view,save);card.append(controls);container.append(card);
 const summary=el('p'),graphic=el('div'),paging=el('div'),detail=el('section');detail.className='card';detail.setAttribute('aria-live','polite');card.append(summary,graphic,paging);container.append(detail);
 let page=0,graph;const ns='http://www.w3.org/2000/svg';
 function evidence(rows,title){detail.replaceChildren(el('h3',title));if(!rows.length){detail.append(el('p','此标注未附原文引句，请回到文本核对。'));return;}for(const r of rows){detail.append(el('p','《'+r.chapter+'》 · 步骤 '+r.step+' · 原文单位 '+r.unit),el('blockquote',r.text));}}
 function svgNode(tag,attrs,text,parent){const n=document.createElementNS(ns,tag);for(const [key,v]of Object.entries(attrs))n.setAttribute(key,String(v));if(text!==undefined)n.textContent=text;parent.append(n);return n;}
 function clickable(group,fn){group.setAttribute('tabindex','0');group.setAttribute('role','button');group.addEventListener('click',fn);group.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();fn();}});}
 function drawGraph(){
  const net=connected(graph),nodes=net.nodes,edges=net.edges,byId=new Map(nodes.map((n,i)=>{n.x=490+260*Math.cos(i*2*Math.PI/Math.max(1,nodes.length));n.y=350+230*Math.sin(i*2*Math.PI/Math.max(1,nodes.length));return[n.id,n];}));
  for(let iter=0;iter<130;iter++){for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){const a=nodes[i],b=nodes[j],dx=a.x-b.x||.1,dy=a.y-b.y||.1,d2=Math.max(100,dx*dx+dy*dy),f=1900/d2;a.x+=dx*f;b.x-=dx*f;a.y+=dy*f;b.y-=dy*f;}for(const e of edges){const a=byId.get(e.source),b=byId.get(e.target),dx=b.x-a.x,dy=b.y-a.y,f=.018;a.x+=dx*f;a.y+=dy*f;b.x-=dx*f;b.y-=dy*f;}for(const n of nodes){n.x=Math.min(900,Math.max(85,n.x+(490-n.x)*.01));n.y=Math.min(630,Math.max(60,n.y+(350-n.y)*.01));}}
  summary.textContent=nodes.length+' 个共享节点 · '+edges.length+' 条关联。橙色为人物表达，绿色为空间；灰线表示同一步骤关联，红色箭头表示移动。点选查看证据，拖动节点或背景，滚轮缩放。布局距离不代表地理距离。';
  const reset=el('button','复位'),zoomIn=el('button','放大'),zoomOut=el('button','缩小');paging.append(reset,zoomIn,zoomOut);
  const svg=svgNode('svg',{viewBox:'0 0 980 700',role:'group','aria-label':'人物与空间节点网络'},undefined,graphic);svg.style.touchAction='none';svg.style.background='#fffdf7';const defs=svgNode('defs',{},undefined,svg),marker=svgNode('marker',{id:'movement-arrow',viewBox:'0 0 10 10',refX:24,refY:5,markerWidth:7,markerHeight:7,orient:'auto'},undefined,defs);svgNode('path',{d:'M0 0 L10 5 L0 10 Z',fill:'#a35c42'},undefined,marker);const layer=svgNode('g',{},undefined,svg);let scale=1,tx=0,ty=0;const transform=()=>layer.setAttribute('transform','translate('+tx+' '+ty+') scale('+scale+')');zoomIn.onclick=()=>{scale=Math.min(5,scale*1.25);transform();};zoomOut.onclick=()=>{scale=Math.max(.35,scale/1.25);transform();};reset.onclick=()=>{scale=1;tx=ty=0;transform();};
  const lines=edges.map(e=>{const line=svgNode('path',{stroke:e.kind==='movement'?'#a35c42':'#aab6ae','stroke-width':Math.min(7,1+Math.sqrt(e.weight)),fill:'none',...(e.kind==='movement'?{'marker-end':'url(#movement-arrow)'}:{})},undefined,layer);line.style.cursor='pointer';clickable(line,()=>evidence(e.evidence,byId.get(e.source).label+' → '+byId.get(e.target).label));return {e,line};});
  const groups=nodes.map(n=>{const g=svgNode('g',{'aria-label':n.label},undefined,layer);g.style.cursor='grab';svgNode('circle',{r:n.kind==='actor'?17:13,fill:n.kind==='actor'?'#bc7952':'#367a70',stroke:'white','stroke-width':2},undefined,g);const text=svgNode('text',{x:21,y:5,'font-size':14,stroke:'#fffdf7','stroke-width':4,'paint-order':'stroke'},n.label.length>16?n.label.slice(0,16)+'…':n.label,g);svgNode('title',{},n.label,g);clickable(g,()=>{const neighbors=edges.filter(e=>e.source===n.id||e.target===n.id);evidence(neighbors.flatMap(e=>e.evidence).filter((r,i,a)=>a.findIndex(x=>x.step===r.step)===i),n.label);for(const {e,line}of lines)line.setAttribute('opacity',e.source===n.id||e.target===n.id?1:.15);});g.addEventListener('pointerdown',e=>{e.stopPropagation();drag={node:n,x:e.clientX,y:e.clientY};svg.setPointerCapture(e.pointerId);});return {n,g};});
  const redraw=()=>{for(const {n,g}of groups)g.setAttribute('transform','translate('+n.x+' '+n.y+')');for(const {e,line}of lines){const a=byId.get(e.source),b=byId.get(e.target);line.setAttribute('d',a===b?'M'+a.x+' '+a.y+' c-55 -65 55 -65 0 0':'M'+a.x+' '+a.y+' L'+b.x+' '+b.y);}};let drag=null;redraw();svg.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY};svg.setPointerCapture(e.pointerId);});svg.addEventListener('pointermove',e=>{if(!drag)return;const ratio=980/svg.getBoundingClientRect().width,dx=(e.clientX-drag.x)*ratio,dy=(e.clientY-drag.y)*ratio;if(drag.node){drag.node.x+=dx/scale;drag.node.y+=dy/scale;redraw();}else{tx+=dx;ty+=dy;transform();}drag.x=e.clientX;drag.y=e.clientY;});svg.addEventListener('pointerup',()=>{drag=null;});svg.addEventListener('pointercancel',()=>{drag=null;});svg.addEventListener('wheel',e=>{e.preventDefault();scale=Math.max(.35,Math.min(5,scale*(e.deltaY<0?1.1:1/1.1)));transform();},{passive:false});
  if(!nodes.length)graphic.append(el('p','本篇没有双端明确的移动或人物—空间关联。'));
 }
 function draw(){
  const chapter=chapters.find(c=>c.id===Number(picker.value));graphic.replaceChildren();paging.replaceChildren();detail.replaceChildren();
  if(!chapter){summary.textContent='当前范围没有情节步骤。';onExport([]);return;}
  graph=build(chapter);if(view.value==='graph'){drawGraph();onExport([['篇名','人物表达','空间','步骤'],...graph.relations.map(r=>[chapter.title,r.actor,r.space,r.steps.join('、')])]);return;}const relationMode=view.value==='relations',items=relationMode?graph.relations:graph.nodes,size=12,pages=Math.max(1,Math.ceil(items.length/size));page=Math.min(page,pages-1);const slice=items.slice(page*size,(page+1)*size);
  summary.textContent=graph.nodes.length+' 个步骤 · '+graph.edges.length+' 条顺序连线 · '+graph.relations.length+' 组人物表达—空间关联。图中每页最多显示12项；可翻页或下载完整网络。';
  const prev=el('button','上一页'),next=el('button','下一页');prev.disabled=page===0;next.disabled=page>=pages-1;prev.onclick=()=>{page--;draw();};next.onclick=()=>{page++;draw();};paging.append(prev,el('span',' 第'+(page+1)+' / '+pages+'页 '),next);
  const height=Math.max(140,slice.length*(relationMode?94:128)+35),svg=svgNode('svg',{viewBox:'0 0 980 '+height,role:'group','aria-label':relationMode?'人物表达与空间关联图':'情节顺序图'},undefined,graphic);
  if(relationMode){for(const [i,r]of slice.entries()){const y=30+i*94;svgNode('line',{x1:360,y1:y+24,x2:615,y2:y+24,stroke:'#73998d','stroke-width':Math.min(9,1+r.steps.length)},undefined,svg);svgNode('text',{x:450,y:y+15,'font-size':12},r.steps.length+'步',svg);for(const [x,label,fill]of [[5,r.actor,'#ebdfcf'],[615,r.space,'#e0ebe3']]){const g=svgNode('g',{'aria-label':label},undefined,svg);svgNode('rect',{x,y,width:355,height:55,rx:9,fill,stroke:'#849d8e'},undefined,g);svgNode('text',{x:x+12,y:y+33,'font-size':15},label.length>20?label.slice(0,20)+'…':label,g);svgNode('title',{},label,g);clickable(g,()=>evidence(r.evidence,r.actor+' — '+r.space));}}}
  else{for(const [i,n]of slice.entries()){const y=15+i*128;if(i){svgNode('path',{d:'M55 '+(y-38)+' V'+(y-3)+' l-6 -9 m6 9 l6 -9',stroke:'#367a70','stroke-width':2,fill:'none'},undefined,svg);}const g=svgNode('g',{'aria-label':n.label+' '+n.actors},undefined,svg);svgNode('rect',{x:5,y,width:965,height:90,rx:10,fill:'#e6eee4',stroke:'#849d8e'},undefined,g);svgNode('text',{x:22,y:y+27,'font-size':16},n.label+' · '+(n.actors||'人物未明')+' · '+(n.kind==='movement'?'移动':'情节标注'),g);const location=(n.from||'未明')+' → '+(n.to||'未明');svgNode('text',{x:22,y:y+51,'font-size':14},location.length>55?location.slice(0,55)+'…':location,g);svgNode('text',{x:22,y:y+75,'font-size':13},n.quote.slice(0,62)+(n.quote.length>62?'…':''),g);svgNode('title',{},n.quote,g);clickable(g,()=>evidence(n.quote?[{chapter:chapter.title,text:n.quote,step:n.order,unit:n.unit}]:[],n.label+' · '+location));}}
  if(!items.length)graphic.append(el('p','本篇没有可用的人物—空间关联。'));
  onExport([['篇名','人物表达','空间','步骤','原文'],...graph.relations.map(r=>[chapter.title,r.actor,r.space,r.steps.join('、'),r.evidence.map(e=>e.text).join('\n')])]);
 }
 picker.onchange=view.onchange=()=>{page=0;draw();};save.onclick=()=>{if(!graph)return;const url=URL.createObjectURL(new Blob([JSON.stringify(graph,null,2)],{type:'application/json'})),a=el('a');a.href=url;a.download='情节网络-'+graph.chapter+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};draw();
}
root.GhostPlotNetwork={...api,mount};
})(typeof window==='undefined'?globalThis:window);
