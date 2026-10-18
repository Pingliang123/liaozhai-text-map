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
const api={build};if(typeof module!=='undefined'){module.exports=api;return;}
const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
function mount(container,chapters,onExport){
 const card=el('section');card.className='card';card.append(el('h2','情节网络'),el('p','情节箭头表示现有标注的先后次序，不表示因果。人物—空间连线表示同一步骤中被标注的关联；人物字段按原表达保留，尚未合并别名。'));
 const picker=el('select');picker.setAttribute('aria-label','选择情节网络篇目');
 for(const c of chapters.filter(c=>c.steps.length)){const o=el('option',c.title+' · '+c.steps.length+'步');o.value=c.id;picker.append(o);}
 const view=el('select');view.setAttribute('aria-label','选择网络类型');for(const [value,label]of [['sequence','情节次序'],['relations','人物—空间']]){const o=el('option',label);o.value=value;view.append(o);}
 const controls=el('div');controls.className='filters';const save=el('button','下载本篇网络 JSON');controls.append(picker,view,save);card.append(controls);container.append(card);
 const summary=el('p'),graphic=el('div'),paging=el('div'),detail=el('section');detail.className='card';detail.setAttribute('aria-live','polite');card.append(summary,graphic,paging);container.append(detail);
 let page=0,graph;const ns='http://www.w3.org/2000/svg';
 function evidence(rows,title){detail.replaceChildren(el('h3',title));if(!rows.length){detail.append(el('p','此标注未附原文引句，请回到文本核对。'));return;}for(const r of rows){detail.append(el('p','《'+r.chapter+'》 · 步骤 '+r.step+' · 原文单位 '+r.unit),el('blockquote',r.text));}}
 function svgNode(tag,attrs,text,parent){const n=document.createElementNS(ns,tag);for(const [key,v]of Object.entries(attrs))n.setAttribute(key,String(v));if(text!==undefined)n.textContent=text;parent.append(n);return n;}
 function clickable(group,fn){group.setAttribute('tabindex','0');group.setAttribute('role','button');group.addEventListener('click',fn);group.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();fn();}});}
 function draw(){
  const chapter=chapters.find(c=>c.id===Number(picker.value));graphic.replaceChildren();paging.replaceChildren();detail.replaceChildren();
  if(!chapter){summary.textContent='当前范围没有情节步骤。';onExport([]);return;}
  graph=build(chapter);const relationMode=view.value==='relations',items=relationMode?graph.relations:graph.nodes,size=12,pages=Math.max(1,Math.ceil(items.length/size));page=Math.min(page,pages-1);const slice=items.slice(page*size,(page+1)*size);
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
