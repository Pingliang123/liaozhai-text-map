(function(root){'use strict';
const R=typeof module!=='undefined'?require('./relation-network'):root.GhostRelationNetwork;
function hits(text,words){const found=[],occupied=[];for(const word of [...new Set(words)].filter(Boolean).sort((a,b)=>b.length-a.length||a.localeCompare(b))){let at=-1;while((at=text.indexOf(word,at+1))>=0){const end=at+word.length;if(occupied.some(([a,b])=>at<b&&end>a))continue;occupied.push([at,end]);found.push({word,at,end});}}return found.sort((a,b)=>a.at-b.at);}
function build(chapters){
 const places=new Map(),pairs=new Map(),spaces=new Map(),pending=[];
 const node=word=>{const id='place:'+word;if(!places.has(id))places.set(id,{id,label:word,kind:'place',degree:0});return id;};
 for(const c of chapters){
  for(const p of c.places)node(p);
  const units=c.units.map(u=>({...u,ps:hits(u.text,c.places),ss:hits(u.text,c.spaces.filter(s=>!c.places.includes(s)))})),present=[...new Set(units.flatMap(u=>u.ps.map(p=>p.word)))].sort();
  for(let i=0;i<present.length;i++)for(let j=i+1;j<present.length;j++){const source=node(present[i]),target=node(present[j]),key=JSON.stringify([source,target]);if(!pairs.has(key))pairs.set(key,{source,target,weight:0,relation:'places',chapter:'同篇地点',evidence:[]});const e=pairs.get(key);e.weight++;const excerpts=units.filter(u=>u.ps.some(p=>p.word===present[i]||p.word===present[j]));e.evidence.push({chapter:c.title,chapterId:c.id,actors:[],text:excerpts.map(u=>u.text).join('\n…\n'),basis:'同篇地点关系，每篇计1次；不表示人物移动',units:excerpts.map(u=>u.id)});}
  let current=null;
  for(const u of units){
   if(/追述|忆及|昔年|闻说|听说|梦见/.test(u.text))current=null;
   const anchors=u.ps.filter(p=>!/^人/.test(u.text.slice(p.end))&&(/[在于至到抵赴往如游寓居归入过自从]$/.test(u.text.slice(0,p.at))||/^(?:城中|境内|境中)/.test(u.text.slice(p.end))));
   if(u.ps.length&&!anchors.length)current=null;
   for(const s of u.ss){
    const preceding=anchors.filter(p=>p.end<=s.at).at(-1),intervening=u.ps.some(p=>p.end<=s.at&&(!preceding||p.at>preceding.at)),anchor=preceding?{place:preceding.word,unit:u.id,text:u.text}:(!u.ps.length?current:null);
    if(!anchor||intervening){pending.push({chapter:c.title,chapterId:c.id,space:s.word,unit:u.id,text:u.text});continue;}
    const source=node(anchor.place),target='space:'+s.word,key=JSON.stringify([source,target]);if(!spaces.has(key))spaces.set(key,{source,target,weight:0,relation:'located-space',chapter:'地点与空间',evidence:[]});const e=spaces.get(key),same=anchor.unit===u.id;
    if(!e.evidence.some(r=>r.chapterId===c.id))e.weight++;
    if(!e.evidence.some(r=>r.chapterId===c.id&&r.unit===u.id))e.evidence.push({chapter:c.title,chapterId:c.id,unit:u.id,anchorUnit:anchor.unit,actors:R.presentPeople(c,u.text),text:same?u.text:anchor.text+'\n…\n'+u.text,basis:same?'定位语句同单位线索':'延续前文场景的线索，需结合上下文核对',assignment:same?'explicit':'context'});
   }
   if(anchors.length){const last=anchors.at(-1);current={place:last.word,unit:u.id,text:u.text};if(u.ps.some(p=>p.at>last.at))current=null;}
  }
 }
 const pp={nodes:[...places.values()].map(n=>({...n})),edges:[...pairs.values()],mode:'places'},psNodes=new Map([...places].map(([id,n])=>[id,{...n}]));for(const e of spaces.values())if(!psNodes.has(e.target))psNodes.set(e.target,{id:e.target,label:e.target.slice(6),kind:'space',degree:0});const ps={nodes:[...psNodes.values()],edges:[...spaces.values()],mode:'located-spaces'};
 for(const g of [pp,ps]){const byId=new Map(g.nodes.map(n=>[n.id,n]));for(const e of g.edges){byId.get(e.source).degree++;byId.get(e.target).degree++;}}
 const isolatedPlaces=pp.nodes.filter(n=>n.degree===0);pp.nodes=pp.nodes.filter(n=>n.degree>0);return {places:pp,spaces:ps,pending,isolatedPlaces};
}
const api={build,hits};if(typeof module!=='undefined'){module.exports=api;return;}
const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
function mount(container,chapters,onExport){
 const graphs=build(chapters),intro=el('section');intro.className='card';intro.append(el('h2','地点网络'),el('p','① 全书地点相互关联　② 地点内部的空间'));container.append(intro);
 const first=el('section'),second=el('section');first.className=second.className='card';first.append(el('h2','一、全书地点网络'),el('p','全书地名共用一张图。同篇出现的地点相连；线宽表示共同出现的篇数。不显示没有地点连线的孤立地名。'));second.append(el('h2','二、地点与空间'),el('p','选择地点，查看由定位语句及其后续场景关联的空间。点线核对篇目、人物和原文；延续场景属于检索线索。'));container.append(first,second);
 const allOut=el('div'),spaceOut=el('div'),pick=el('select');pick.setAttribute('aria-label','选择地点查看内部空间');for(const n of graphs.spaces.nodes.filter(n=>n.kind==='place').sort((a,b)=>a.label.localeCompare(b.label))){const o=el('option',n.label);o.value=n.id;pick.append(o);}if(graphs.places.nodes.some(n=>n.id==='place:济南'))pick.value='place:济南';first.append(allOut);second.append(pick,spaceOut);
 let prepared=null;
 const label=e=>{const r=e.evidence[0];return (r?'《'+r.chapter+'》':'')+(r?.actors?.length?' · '+r.actors.join('、'):'')+(e.evidence.length>1?' 等':'');};
 const drawAll=()=>{allOut.replaceChildren();const exact=prepared?.graphs['places:full'],matched=exact?.signature===root.GhostTutorialNetwork.signature(graphs.places)?exact:null;root.GhostBookNetwork.mount(allOut,chapters,()=>{},{graph:graphs.places,lexical:true,scope:'chapter',simple:true,readable:true,allowAll:true,kindLegend:'紫：地点。',relationLegend:'— 表示两地同篇出现，不代表实际移动。',initialView:'all',edgeLabel:label,tutorial:!!matched,partition:matched?.partition,metrics:matched?.metrics,positions:matched?.positions,networkTitle:'全书地点网络'});};
 const drawSpaces=()=>{spaceOut.replaceChildren();const id=pick.value,edges=graphs.spaces.edges.filter(e=>e.source===id),ids=new Set([id,...edges.map(e=>e.target)]),g={nodes:graphs.spaces.nodes.filter(n=>ids.has(n.id)),edges,mode:'located-spaces'};root.GhostBookNetwork.mount(spaceOut,chapters,()=>{},{graph:g,lexical:true,scope:'chapter',simple:true,readable:true,initialFocus:id,fixedCenter:true,kindLegend:'紫：地点；绿：空间。',relationLegend:'— 表示地点与场景空间的归属线索，不是移动路线。',edgeLabel:label,initialView:'local',networkTitle:'地点与空间'});if(!edges.length)spaceOut.append(el('p','现有定位语句尚未关联到这个地点的空间；不把同篇全部空间自动归入。'));};
 onExport([['网络','地点','关联地点／空间','涉及篇数','原文'],...graphs.places.edges.map(e=>['地点—地点',e.source.slice(6),e.target.slice(6),e.weight,e.evidence.map(r=>'《'+r.chapter+'》'+r.text).join('\n')]),...graphs.spaces.edges.map(e=>['地点—空间',e.source.slice(6),e.target.slice(6),e.weight,e.evidence.map(r=>'《'+r.chapter+'》'+r.basis+'：'+r.text).join('\n')])]);pick.onchange=drawSpaces;drawAll();drawSpaces();fetch('networkx-analysis.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error();return r.json();}).then(d=>{prepared=d;drawAll();}).catch(()=>{});
 const pending=el('details');pending.append(el('summary','全书尚未归属地点的空间线索（'+graphs.pending.length+'处）'));let loaded=false;pending.ontoggle=()=>{if(!pending.open||loaded)return;loaded=true;const list=el('div'),more=el('button','再看50条');let offset=0;const add=()=>{for(const r of graphs.pending.slice(offset,offset+50))list.append(el('strong','《'+r.chapter+'》 · '+r.space),el('blockquote',r.text));offset+=50;more.hidden=offset>=graphs.pending.length;};more.onclick=add;pending.append(list,more);add();};second.append(pending);
 const old=el('details');old.append(el('summary','其他网络分析：人物移动、词汇共现与教程'));let opened=false;old.ontoggle=()=>{if(old.open&&!opened){opened=true;root.GhostRelationNetwork.mount(old,chapters,onExport);}};container.append(old);
 const method=el('details');method.append(el('summary','关系定义与资料下载'),el('p','地名按现有地点词表保留，未自动合并别名。同篇关系没有方向，不表示两个地点间发生移动。地点—空间只在定位语句或其后续场景建立线索；遇到其他地名、追述或梦见等提示会中断场景继承，人物籍贯不作为所在场所。仍需逐条核对；没有定位依据的空间不连线。'),el('p','第一图仅显示与其他地点有连线的地名；教程统计仅在整图指纹匹配时使用。空间词同名合并为词汇节点，不表示各篇中的宅院是同一建筑。'));const save=el('button','下载两个网络及未归属线索');save.onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(graphs)],{type:'application/json'})),a=el('a');a.href=url;a.download='聊斋-地点与空间网络.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};method.append(save);container.append(method);
}
root.GhostPlaceSpaces={...api,mount};
})(typeof window==='undefined'?globalThis:window);
