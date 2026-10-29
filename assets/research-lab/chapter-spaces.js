(function(root){'use strict';
function build(chapter,options={}){
 const P=typeof module!=='undefined'?require('./place-spaces'):root.GhostPlaceSpaces;
 const graphs=P.build([chapter],{includeOtherworld:true}),nodes=new Map(),edges=[],aliases=new Map();
 for(const graph of [graphs.placesAll,graphs.spaces])for(const n of graph.nodes){const id=n.realm==='otherworld'?'space:'+n.label:n.id;aliases.set(n.id,id);nodes.set(id,{...n,id,kind:n.realm==='otherworld'?'space':n.kind,degree:0});}
 // Keep every annotated space visible, including spaces with no supported place attribution.
 for(const word of chapter.spaces){const id='space:'+word;if(!nodes.has(id))nodes.set(id,{id,label:word,kind:'space',degree:0,realm:P.otherworld.has(word)?'otherworld':'human'});}
 const pairs=new Map();
 for(const e of [...graphs.placesAll.edges,...graphs.spaces.edges]){const source=aliases.get(e.source)||e.source,target=aliases.get(e.target)||e.target;if(source===target)continue;const key=JSON.stringify([source,target].sort());let edge=pairs.get(key);if(!edge){edge={...e,source,target,evidence:[],weight:1};pairs.set(key,edge);}const seen=new Set(edge.evidence.map(r=>JSON.stringify([r.chapterId,r.unit,r.text])));for(const r of e.evidence){const k=JSON.stringify([r.chapterId,r.unit,r.text]);if(!seen.has(k)){seen.add(k);edge.evidence.push(r);}}}
 for(const e of pairs.values()){edges.push(e);for(const id of [e.source,e.target])nodes.get(id).degree++;}
 if(!options.paths){
  const R=typeof module!=='undefined'?require('./relation-network'):root.GhostRelationNetwork;
  const Merge=typeof module!=='undefined'?require('../place-node-merges'):root.GhostPlaceNodeMerges;
  const related=Merge.graph(R.build([chapter],'chapter'),chapter.place_aliases||{});
  for(const n of related.nodes)if(!nodes.has(n.id))nodes.set(n.id,n);
  for(const e of related.edges){const key=JSON.stringify([e.source,e.target].sort());if(!pairs.has(key)){pairs.set(key,e);edges.push({...e,relation:'chapter',directed:false});}}
  return {nodes:[...nodes.values()],edges,itinerary:[],mode:'chapter-spaces',pending:graphs.pending};
 }
 const routes=chapter.route_steps||P.uniqueSteps(chapter.steps),moves=new Map(),itinerary=[];
 const sourceText=chapter.units.map(u=>u.text).join('').replace(/\s/gu,'');
 for(const s of routes){
  const kind=s.transition_kind??s.kind,from=s.from_space??s.from,to=s.to_space??s.to;
  const structural=kind==='plot'&&s.narrative_role==='转换';
  if(kind!=='movement'&&!structural||!from||!to||!s.quote||!sourceText.includes(s.quote.replace(/\s/gu,'')))continue;
  const ids=[from,to].map(label=>{
   const canonical=chapter.place_aliases?.[label]||label;
   const existing=[...nodes.values()].find(n=>n.label===canonical);
   if(existing)return existing.id;
   const id='scene:'+label;nodes.set(id,{id,label,kind:'space',degree:0,realm:P.otherworld.has(label)||/冥府|地府|阴司|龙宫|幻境/.test(label)?'otherworld':'human'});return id;
  });
  const actors=Array.isArray(s.actors)?s.actors:String(s.actors||'').split(/[、，,]/u).filter(Boolean);
  itinerary.push({order:itinerary.length+1,source_index:s.index??s.source_indices?.[0]??0,from:nodes.get(ids[0]).label,to:nodes.get(ids[1]).label,actors,quote:s.quote,kind:structural?'spatial-change':'movement'});
  if(ids[0]===ids[1])continue;
  const relation=structural?'spatial-change':'movement';
  const key=JSON.stringify([relation,...ids]);if(!moves.has(key))moves.set(key,{source:ids[0],target:ids[1],directed:true,relation,weight:0,evidence:[]});
  const edge=moves.get(key);edge.weight++;edge.evidence.push({chapter:chapter.title,chapterId:chapter.id,unit:s.unit,source_indices:s.source_indices,sequence:itinerary.length,actors,text:s.quote,basis:structural?'保存步骤的改建或形态变化；不是人物移动':'保存步骤的空间移动；与地图共用端点记录'});
 }
 for(const e of moves.values()){edges.push(e);for(const id of [e.source,e.target])nodes.get(id).degree++;}
 return {nodes:[...nodes.values()],edges,itinerary,mode:'chapter-spaces',pending:graphs.pending};
}
function mount(container,chapters,options={}){
 const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
 const label=el('label','篇目 '),pick=el('select'),out=el('div');pick.setAttribute('aria-label',options.paths?'选择篇目查看人物路径':'选择篇目查看空间网络');
 for(const c of chapters){const o=el('option',c.title);o.value=String(c.id);pick.append(o);}
 const params=new URLSearchParams(root.location?.search||''),requested=params.get('chapter')||params.get('scene'),place=params.get('place');if(chapters.some(c=>String(c.id)===requested))pick.value=requested;else if(place){const c=chapters.find(c=>c.places.some(w=>(c.place_aliases?.[w]||w)===place));if(c)pick.value=String(c.id);}
 label.append(pick);container.append(label,out);
 function draw(){
  out.replaceChildren();const c=chapters.find(c=>String(c.id)===pick.value);if(!c){out.append(el('p','当前筛选范围没有篇目。'));return;}
  const graph=build(c,options);out.append(el('h3','《'+c.title+'》'+(options.paths?'人物路径':'空间网络')));
  if(options.paths){const all=el('a','查看本篇全部空间词（'+c.spaces.length+'）');const url=new URL(root.location?.href||'https://pingliang123.github.io/liaozhai-text-map/assets/research-lab/');url.searchParams.set('mode','places');url.searchParams.set('chapter',String(c.id));url.searchParams.delete('scene');all.href=url.href;out.append(all);}
  if(c.token_basis?.includes('未全文对齐'))out.append(el('p','本篇修订分词未与全文对齐，暂用原典词位分词；修订记录保留。'));
  if(c.lexical_omissions?.length){const note=el('details');note.append(el('summary','未对齐分词的词项 · '+c.lexical_omissions.length),el('p',c.lexical_omissions.map(r=>r.word).join('、')),el('p','保留在修订资料中；请在文本与修订中核对分词边界后再进入网络。'));out.append(note);}
  if(options.paths){const pending=(c.route_steps||[]).filter(s=>s.transition_kind==='movement'&&(!s.from_space||!s.to_space));if(pending.length)out.append(el('p',pending.length+'条移动端点未对齐分词，暂不绘线。'));}
  if(!graph.nodes.length){out.append(el('p','本篇尚无地点或空间词标注。'));return;}
  if(options.paths){
   const complete=el('section');complete.className='chapter-complete-spaces';complete.append(el('h4','全部空间词 · '+c.spaces.length));out.append(complete);
   root.GhostBookNetwork.mount(complete,[c],()=>{},{graph:build(c),lexical:true,simple:true,readable:true,allowAll:true,initialView:'all',realmColors:true,chapterSpatial:true,levelColors:!!root.GhostPlaceLevelColors,levelRecords:options.placeRecords||{},networkTitle:'《'+c.title+'》地点与空间网络',relationLegend:'线表示文本关联；下方另列人物移动顺序。'});
   renderOrdered(out,graph,c,options);
  }
  else root.GhostBookNetwork.mount(out,[c],()=>{},{graph,lexical:true,simple:true,readable:true,allowAll:true,initialView:'all',realmColors:true,levelColors:!!root.GhostPlaceLevelColors,levelRecords:options.placeRecords||{},chapterSpatial:true,networkTitle:'《'+c.title+'》地点与空间网络',relationLegend:'节点取自原典分词；线表示同篇关联或场景归属，不表示移动顺序。点线查看原文。'});
  const read=el('a','原文与修订 ↗');read.href='../../index.html?chapter='+encodeURIComponent(c.id)+'#workspace';container.dataset&&(container.dataset.chapter=String(c.id));out.append(read);
  const unassigned=graph.nodes.filter(n=>n.kind==='space'&&!n.degree);if(unassigned.length){const details=el('details');details.append(el('summary','归属未明的空间 · '+unassigned.length));details.ontoggle=()=>{if(!details.open||details.dataset?.loaded)return;if(details.dataset)details.dataset.loaded='1';details.ontoggle=null;for(const n of unassigned){details.append(el('strong',n.label));for(const u of c.units.filter(u=>u.text.includes(n.label)))details.append(el('blockquote',u.text));}};out.append(details);}
 }
 pick.onchange=()=>{if(root.history){const url=new URL(root.location.href);url.searchParams.set('scene',pick.value);root.history.replaceState(null,'',url);}draw();};draw();
 return {select:pick,refresh(records){options.placeRecords=records;draw();},selectChapter(id){if(chapters.some(c=>String(c.id)===String(id))){pick.value=String(id);draw();}}};
}
function ordered(graph){
 const nodes=[],edges=[],rows=[];let y=48;
 for(const step of graph.itinerary){const height=Math.max(100,48+Math.ceil((step.actors.join('、').length||6)/18)*20,48+Math.ceil(Math.max(step.from.length,step.to.length)/12)*20),a={id:'visit:'+step.order+':from',label:step.from,x:210,y:y+height/2},b={id:'visit:'+step.order+':to',label:step.to,x:690,y:y+height/2};
  nodes.push(a,b);edges.push({source:a.id,target:b.id,directed:true,order:step.order});rows.push({...step,y,height,fromNode:a,toNode:b});y+=height;
 }
 return {nodes,edges,rows,width:900,height:Math.max(160,y+20)};
}
function renderOrdered(container,graph,chapter,options){
 const doc=container.ownerDocument,el=(tag,text)=>{const n=doc.createElement(tag);if(text!==undefined)n.textContent=text;return n;},svgEl=(tag,attrs={})=>{const n=doc.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,String(v));return n;};
 const frame=el('section');frame.className='chapter-ordered-network';container.append(frame);
 const explanation=el('p',graph.itinerary.length?'自上而下读步骤，箭头由起点指向终点；重复到访另列节点。点选一行查看原文。':'本篇没有已标注的移动步骤。下图只显示已有地点与空间关联，不推断先后。');frame.append(explanation);
 const scroll=el('div');scroll.style.cssText='overflow:auto;max-height:680px;border:1px solid #cdd8d0;border-radius:8px;background:#fafcf9';frame.append(scroll);
 const layout=ordered(graph),svg=svgEl('svg',{viewBox:'0 0 '+layout.width+' '+layout.height,width:'100%',role:'img','aria-label':'《'+chapter.title+'》按次序排列的空间网络'});svg.style.cssText='display:block;min-width:760px';scroll.append(svg);
 const evidence=el('section');evidence.className='chapter-step-evidence';evidence.setAttribute('aria-live','polite');frame.append(evidence);
 const write=(parent,text,x,y,color='#203e36',size=15)=>{const n=svgEl('text',{x,y,fill:color,'font-size':size,'text-anchor':'middle'});n.textContent=text;parent.append(n);return n;};
 const lines=(parent,text,x,y,max=12)=>{const chars=Array.from(text);for(let i=0;i<chars.length;i+=max)write(parent,chars.slice(i,i+max).join(''),x,y+(i/max)*20);};
 const color=label=>{const node=graph.nodes.find(n=>n.label===label);return node?.realm==='otherworld'?'#a33b32':node?.kind==='place'?(root.GhostPlaceLevelColors?.style(node,options.placeRecords||{}).color||'#316d9c'):'#33725a';};
 const defs=svgEl('defs'),marker=svgEl('marker',{id:'chapter-sequence-arrow-'+chapter.id,viewBox:'0 0 10 10',refX:9,refY:5,markerWidth:8,markerHeight:8,orient:'auto-start-reverse'});marker.append(svgEl('path',{d:'M0 0 L10 5 L0 10 Z',fill:'#365f52'}));defs.append(marker);svg.append(defs);
 if(layout.rows.length){write(svg,'起点',210,28);write(svg,'步骤／人物',450,28);write(svg,'终点',690,28);
  const groups=[];
  for(const row of layout.rows){const g=svgEl('g',{'data-step':row.order,tabindex:0,role:'button','aria-label':'第'+row.order+'步 '+row.from+'到'+row.to});g.style.cursor='pointer';const bg=svgEl('rect',{x:6,y:row.y,width:888,height:row.height-4,rx:6,fill:row.order%2?'#f0f5ef':'#fff'});g.append(bg);
   const cy=row.fromNode.y;
   g.append(svgEl('line',{x1:335,y1:cy+18,x2:562,y2:cy+18,stroke:'#365f52','stroke-width':row.kind==='spatial-change'?2:3,'stroke-dasharray':row.kind==='spatial-change'?'6 4':'none','marker-end':'url(#chapter-sequence-arrow-'+chapter.id+')'}));
   for(const n of [row.fromNode,row.toNode]){const height=Math.max(46,Math.ceil(n.label.length/12)*20+20);g.append(svgEl('rect',{x:n.x-120,y:cy-height/2,width:240,height,rx:8,fill:'#fff',stroke:color(n.label),'stroke-width':2}));lines(g,n.label,n.x,cy-((Math.ceil(n.label.length/12)-1)*10)+5);}
   write(g,String(row.order),42,cy+5,'#365f52',22);const actors=row.actors.join('、')||'人物未标注';lines(g,actors,450,cy-20,18);if(row.kind==='spatial-change')write(g,'空间变化',450,cy+42,'#755332',12);
   const select=()=>{for(const item of groups)item.bg.setAttribute('stroke',item===entry?'#365f52':'none');evidence.replaceChildren(el('h4','第'+row.order+'步：'+row.from+' → '+row.to),el('p',actors),el('blockquote',row.quote));};
   const entry={bg,select};groups.push(entry);g.addEventListener('click',select);g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select();}});svg.append(g);
  }groups[0].select();
 }else{
  // No invented movement: retain the original evidence-backed association graph.
  scroll.remove();root.GhostBookNetwork.mount(frame,[chapter],()=>{},{graph,lexical:true,simple:true,readable:true,allowAll:true,initialView:'all',realmColors:true,chapterSpatial:true,levelColors:!!root.GhostPlaceLevelColors,levelRecords:options.placeRecords||{},networkTitle:'《'+chapter.title+'》地点与空间关联'});
 }
}
const api={build,mount,ordered};if(typeof module!=='undefined')module.exports=api;else root.GhostChapterSpaces=api;
})(typeof window==='undefined'?globalThis:window);
