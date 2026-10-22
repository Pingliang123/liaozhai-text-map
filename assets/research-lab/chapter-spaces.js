(function(root){'use strict';
function build(chapter){
 const P=typeof module!=='undefined'?require('./place-spaces'):root.GhostPlaceSpaces;
 const graphs=P.build([chapter],{includeOtherworld:true}),nodes=new Map(),edges=[],aliases=new Map();
 for(const graph of [graphs.placesAll,graphs.spaces])for(const n of graph.nodes){const id=n.realm==='otherworld'?'space:'+n.label:n.id;aliases.set(n.id,id);nodes.set(id,{...n,id,kind:n.realm==='otherworld'?'space':n.kind,degree:0});}
 // Keep every annotated space visible, including spaces with no supported place attribution.
 for(const word of chapter.spaces){const id='space:'+word;if(!nodes.has(id))nodes.set(id,{id,label:word,kind:'space',degree:0,realm:P.otherworld.has(word)?'otherworld':'human'});}
 const pairs=new Map();
 for(const e of [...graphs.placesAll.edges,...graphs.spaces.edges]){const source=aliases.get(e.source)||e.source,target=aliases.get(e.target)||e.target;if(source===target)continue;const key=JSON.stringify([source,target].sort());let edge=pairs.get(key);if(!edge){edge={...e,source,target,evidence:[],weight:1};pairs.set(key,edge);}const seen=new Set(edge.evidence.map(r=>JSON.stringify([r.chapterId,r.unit,r.text])));for(const r of e.evidence){const k=JSON.stringify([r.chapterId,r.unit,r.text]);if(!seen.has(k)){seen.add(k);edge.evidence.push(r);}}}
 for(const e of pairs.values()){edges.push(e);for(const id of [e.source,e.target])nodes.get(id).degree++;}
 const routes=chapter.route_steps||P.uniqueSteps(chapter.steps),moves=new Map();
 const sourceText=chapter.units.map(u=>u.text).join('').replace(/\s/gu,'');
 for(const s of routes){
  const kind=s.transition_kind??s.kind,from=s.from_space??s.from,to=s.to_space??s.to;
  if(kind!=='movement'||!from||!to||!s.quote||!sourceText.includes(s.quote.replace(/\s/gu,'')))continue;
  const ids=[from,to].map(label=>{
   const canonical=chapter.place_aliases?.[label]||label;
   const existing=[...nodes.values()].find(n=>n.label===canonical);
   if(existing)return existing.id;
   const id='scene:'+label;nodes.set(id,{id,label,kind:'space',degree:0,realm:P.otherworld.has(label)||/冥府|地府|阴司|龙宫|幻境/.test(label)?'otherworld':'human'});return id;
  });
  if(ids[0]===ids[1])continue;
  const key=JSON.stringify(ids);if(!moves.has(key))moves.set(key,{source:ids[0],target:ids[1],directed:true,relation:'movement',weight:0,evidence:[]});
  const edge=moves.get(key);edge.weight++;edge.evidence.push({chapter:chapter.title,chapterId:chapter.id,unit:s.unit,source_indices:s.source_indices,sequence:(s.index??s.source_indices?.[0]??0)+1,actors:Array.isArray(s.actors)?s.actors:String(s.actors||'').split(/[、，,]/u).filter(Boolean),text:s.quote,basis:'保存步骤的空间移动；与地图共用端点记录'});
 }
 for(const e of moves.values()){edges.push(e);for(const id of [e.source,e.target])nodes.get(id).degree++;}
 return {nodes:[...nodes.values()],edges,mode:'chapter-spaces',pending:graphs.pending};
}
function mount(container,chapters,options={}){
 const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
 const label=el('label','篇目 '),pick=el('select'),out=el('div');pick.setAttribute('aria-label','选择篇目查看空间网络');
 for(const c of chapters){const o=el('option',c.title);o.value=String(c.id);pick.append(o);}
 const params=new URLSearchParams(root.location?.search||''),requested=params.get('chapter')||params.get('scene'),place=params.get('place');if(chapters.some(c=>String(c.id)===requested))pick.value=requested;else if(place){const c=chapters.find(c=>c.places.some(w=>(c.place_aliases?.[w]||w)===place));if(c)pick.value=String(c.id);}
 label.append(pick);container.append(label,out);
 function draw(){
  out.replaceChildren();const c=chapters.find(c=>String(c.id)===pick.value);if(!c){out.append(el('p','当前筛选范围没有篇目。'));return;}
  const graph=build(c);out.append(el('h3','《'+c.title+'》'));
  if(!graph.nodes.length){out.append(el('p','本篇尚无地点或空间词标注。'));return;}
  root.GhostBookNetwork.mount(out,[c],()=>{},{graph,lexical:true,simple:true,readable:true,allowAll:true,initialView:'all',realmColors:true,levelColors:!!root.GhostPlaceLevelColors,levelRecords:options.placeRecords||{},chapterSpatial:true,networkTitle:'《'+c.title+'》空间网络',kindLegend:'地点按层级配色；绿：空间；朱红：异境。',relationLegend:'箭头：人物移动；无箭头：同篇或归属线索。未定位场景保留在图中。',edgeLabel:e=>(e.directed?'移动 · ':'关联 · ')+'《'+c.title+'》 · '+[...new Set(e.evidence.flatMap(r=>r.actors||[]))].join('、')});
  const read=el('a','原文与修订 ↗');read.href='../../index.html?chapter='+encodeURIComponent(c.id)+'#workspace';container.dataset&&(container.dataset.chapter=String(c.id));out.append(read);
  const unassigned=graph.nodes.filter(n=>n.kind==='space'&&!n.degree);if(unassigned.length){const details=el('details');details.append(el('summary','归属未明的空间 · '+unassigned.length));details.ontoggle=()=>{if(!details.open||details.dataset?.loaded)return;if(details.dataset)details.dataset.loaded='1';details.ontoggle=null;for(const n of unassigned){details.append(el('strong',n.label));for(const u of c.units.filter(u=>u.text.includes(n.label)))details.append(el('blockquote',u.text));}};out.append(details);}
 }
 pick.onchange=()=>{if(root.history){const url=new URL(root.location.href);url.searchParams.set('scene',pick.value);root.history.replaceState(null,'',url);}draw();};draw();
 return {select:pick,refresh(records){options.placeRecords=records;draw();},selectChapter(id){if(chapters.some(c=>String(c.id)===String(id))){pick.value=String(id);draw();}}};
}
const api={build,mount};if(typeof module!=='undefined')module.exports=api;else root.GhostChapterSpaces=api;
})(typeof window==='undefined'?globalThis:window);
