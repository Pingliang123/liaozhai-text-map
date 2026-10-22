(function(root){'use strict';
// Derived views only: annotations and manual revisions remain in the corpus store.
function build(chapters){
 const P=typeof module!=='undefined'?require('./place-spaces'):root.GhostPlaceSpaces;
 const base=P.build(chapters,{includeOtherworld:true}),nodes=new Map(),ties=new Map(),incidence=[],records=[],unresolved=[];
 const placeIds=new Set(base.placesAll.nodes.map(n=>n.id));
 const put=n=>{if(!nodes.has(n.id))nodes.set(n.id,{...n,degree:0});return n.id;};
 for(const n of base.placesAll.nodes)put(n);
 const placeLabels=base.placesAll.nodes.map(n=>n.label);
 for(const c of chapters){
  const chapter='chapter:'+c.id;put({id:chapter,label:'《'+c.title+'》',kind:'chapter'});
  const present=new Set(c.units.flatMap(u=>P.hits(u.text,c.places).map(h=>'place:'+h.word)).filter(id=>placeIds.has(id)));
  for(const id of present)incidence.push({source:chapter,target:id,weight:1,relation:'chapter-place',directed:false,evidence:[{chapter:c.title,chapterId:c.id,actors:[],text:c.units.filter(u=>P.hits(u.text,c.places).some(h=>'place:'+h.word===id)).map(u=>u.text).join('\n'),basis:'篇目提及地点'}]});
  const source=c.units.map(u=>u.text).join('').replace(/\s/gu,'');
  for(const [index,raw]of (c.route_steps||P.uniqueSteps(c.steps)).entries()){
   const s=c.route_steps?{...raw,from:raw.from_space,to:raw.to_space,kind:raw.transition_kind,realm:raw.space_realm,access:raw.space_access}:raw;
   if(!s.quote||!source.includes(s.quote.replace(/\s/gu,''))){unresolved.push({chapter:c.title,index,reason:'缺少可核对引句'});continue;}
   const actors=Array.isArray(s.actors)?s.actors:(s.actors||'').split(/[、，,]/u).filter(Boolean);
   const people=actors.map(word=>({word,types:(c.people||[]).find(p=>p.word===word)?.types||[]}));
   const record={chapter:c.title,chapterId:c.id,unit:s.unit,sequence:(s.source_indices?.[0]??index)+1,source_indices:s.source_indices,from:s.from||'',to:s.to||'',kind:s.kind,actors,people,events:c.events||[],realm:s.realm||'',access:s.access||'',text:s.quote,basis:'已保存步骤；引句存在于原文'};
   records.push(record);
   if(s.kind!=='movement'||!s.from||!s.to)continue;
   const resolve=text=>P.hits(text,placeLabels);
   const a=c.route_steps?(raw.from?[{word:raw.from.name}]:[]):resolve(s.from),b=c.route_steps?(raw.to?[{word:raw.to.name}]:[]):resolve(s.to);
   if(a.length!==1||b.length!==1){unresolved.push({...record,reason:'移动端点尚不能唯一对应地名'});continue;}
   const from='place:'+a[0].word,to='place:'+b[0].word,key=JSON.stringify([from,to]);
   if(from===to)continue;
   for(const [id,label]of [[from,a[0].word],[to,b[0].word]])put({id,label,kind:'place'});
   if(!ties.has(key))ties.set(key,{source:from,target:to,weight:0,directed:true,relation:'movement',evidence:[]});
   const e=ties.get(key);e.evidence.push(record);e.weight++;
  }
 }
 const graph=edges=>{const ids=new Set(edges.flatMap(e=>[e.source,e.target]));return {nodes:[...nodes.values()].filter(n=>ids.has(n.id)).map(n=>({...n,degree:edges.filter(e=>e.source===n.id||e.target===n.id).length})),edges};};
 return {incidence:graph(incidence),cooccurrence:base.places,movement:graph([...ties.values()]),spaces:base.spaces,records,unresolved};
}
const api={build};if(typeof module!=='undefined'){module.exports=api;return;}
const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
function mount(container,chapters,onExport){
 const data=build(chapters),intro=el('section');intro.className='card';intro.append(el('h2','异与空间'),el('p','从人物的停留与穿梭，考察环境、人物和事件如何构成“异”。篇目异事类型与人物身份分别列出。'));container.append(intro);
 const mode=el('select');mode.setAttribute('aria-label','选择关系类型');
 for(const [v,t]of [['movement','人物穿梭 · 有向'],['incidence','篇目与地点 · 二模']]){const o=el('option',t);o.value=v;mode.append(o);}
 const area=el('div');intro.append(mode);container.append(area);
 function draw(){area.replaceChildren();const g=data[mode.value];root.GhostBookNetwork.mount(area,chapters,()=>{},{graph:g,simple:true,readable:true,allowAll:true,initialView:'all',spreadLayout:true,weightedDirected:mode.value==='movement',realmColors:true,networkTitle:mode.selectedOptions[0].textContent,kindLegend:'朱红：异境。节点保留各自的地点或篇目身份。',relationLegend:mode.value==='movement'?'箭头：保存路径的起点 → 终点；线宽：步骤数。':'线宽：同篇篇数或篇目与地点的一次关联。线长不表示地理距离。',edgeLabel:e=>{const r=e.evidence[0];return '《'+r.chapter+'》'+(r.actors?.length?' · '+r.actors.join('、'):'');}});}
 mode.onchange=draw;draw();
 const evidence=el('section');evidence.className='card';evidence.append(el('h3','停留与穿梭的证据'));
 const search=el('input');search.placeholder='篇名、人物、地点、空间或原文';search.setAttribute('aria-label','检索异与空间证据');
 const kind=el('select');kind.setAttribute('aria-label','筛选停留或穿梭');for(const [v,t]of [['all','全部步骤'],['movement','穿梭'],['stay','停留及其他事件']]){const o=el('option',t);o.value=v;kind.append(o);}
 const list=el('div'),count=el('p'),more=el('button','再看30条');let limit=30;
 const headers=['篇目／顺序','人物及身份','篇目异事','起点 → 终点','空间标注','原文'];
 function render(){list.replaceChildren();const q=search.value.trim(),rows=data.records.filter(r=>(!q||[r.chapter,r.from,r.to,r.text,...r.actors].join(' ').includes(q))&&(kind.value==='all'||(kind.value==='movement'?r.kind==='movement':r.kind!=='movement')));count.textContent=rows.length+' 条；当前资料 '+data.records.length+' 条有原文引句的步骤。';
  const wrap=el('div');wrap.className='scroll';const table=el('table'),head=el('tr');for(const h of headers)head.append(el('th',h));const thead=el('thead');thead.append(head);table.append(thead);const body=el('tbody');
  for(const r of rows.slice(0,limit)){const tr=el('tr');for(const t of ['《'+r.chapter+'》／'+r.sequence,r.people.map(p=>p.word+'〔'+(p.types.join('、')||'身份未标')+'〕').join('、')||'未标人物',r.events.join('、')||'未定',(r.from||'未标')+' → '+(r.to||'未标'),[r.realm,r.access].filter(Boolean).join('／')||'未标',r.text])tr.append(el('td',t));body.append(tr);}table.append(body);wrap.append(table);list.append(wrap);more.hidden=rows.length<=limit;
  onExport([headers,...rows.map(r=>[r.chapter+'／'+r.sequence,r.people.map(p=>p.word+'〔'+p.types.join('、')+'〕').join('、'),r.events.join('、'),r.from+' → '+r.to,[r.realm,r.access].join('／'),r.text])]);
 }
 for(const input of [search,kind])input[input===search?'oninput':'onchange']=()=>{limit=30;render();};more.onclick=()=>{limit+=30;render();};evidence.append(search,kind,count,list,more);container.append(evidence);render();
 const method=el('details');method.append(el('summary','关系与证据范围'),el('p','同篇关联用于比较故事的地点组合；有向移动只采用保存步骤、原文引句和唯一可识别的地名端点。停留栏包含其他已标事件，不能一概当作居住。人物身份沿用人物标注，异事类型沿用篇目标注。'),el('p','未能进入地名移动图的线索：'+data.unresolved.length+' 条，可在证据表或统一修订页继续核对。异境使用文本关系，不赋予虚构经纬度。'));
 const download=el('button','下载关系与全部证据');download.onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(data)],{type:'application/json'})),a=el('a');a.href=url;a.download='聊斋-异与空间关系.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};method.append(download);container.append(method);
}
root.GhostYiNetwork={...api,mount};
})(typeof window==='undefined'?globalThis:window);
