(function(root){'use strict';
function build(chapters,mode='unit'){
 const nodes=new Map(),edges=new Map();
 for(const c of chapters){
  const terms=[];for(const [kind,words]of [['place',c.places],['space',c.spaces],['time',c.times||[]],['person',c.people.map(p=>p.word)]])for(const word of new Set(words||[])){if(!word)continue;const id=kind+':'+(kind==='person'?c.id+':':'')+word;terms.push({id,label:word,kind,chapter:kind==='person'?c.title:undefined});}
  // Match longer expressions first so 宋公 does not also count as 公 at that position.
  terms.sort((a,b)=>b.label.length-a.label.length);const units=c.units.map(u=>{const hits=[],occupied=[];for(const t of terms){let at=-1,found=false;while((at=u.text.indexOf(t.label,at+1))!==-1){const end=at+t.label.length;if(occupied.some(([a,b])=>at<b&&end>a))continue;occupied.push([at,end]);found=true;}if(found)hits.push(t);}return {u,hits};});
  const present=new Map();for(const {hits}of units)for(const t of hits){present.set(t.id,t);if(!nodes.has(t.id))nodes.set(t.id,{...t,degree:0});}
  const scopes=mode==='chapter'?[{hits:[...present.values()],u:null}]:units;
  for(const {hits,u}of scopes)for(let i=0;i<hits.length;i++)for(let j=i+1;j<hits.length;j++){const pair=[hits[i].id,hits[j].id].sort();if(pair[0]===pair[1])continue;const key=JSON.stringify(pair);if(!edges.has(key))edges.set(key,{source:pair[0],target:pair[1],weight:0,evidence:[],chapter:'词汇共现'});const e=edges.get(key);e.weight++;e.evidence.push({chapter:c.title,unit:u?.id,text:u?u.text:units.filter(r=>r.hits.some(t=>t.id===pair[0]||t.id===pair[1])).map(r=>r.u.text).join('\n')});}
 }
 for(const e of edges.values()){nodes.get(e.source).degree++;nodes.get(e.target).degree++;}return {nodes:[...nodes.values()],edges:[...edges.values()],mode};
}
const api={build};if(typeof module!=='undefined'){module.exports=api;return;}
const el=(tag,text)=>{const n=document.createElement(tag);if(text)n.textContent=text;return n;};
function mount(container,chapters,onExport){const bar=el('section');bar.className='card';bar.append(el('h2','全书词汇关系'));const mode=el('select');mode.setAttribute('aria-label','词汇共现范围');for(const [v,t]of [['unit','同原文单位'],['chapter','同篇']]){const o=el('option',t);o.value=v;mode.append(o);}const threshold=el('select');threshold.setAttribute('aria-label','最少共现次数');for(const v of [1,2,3,5]){const o=el('option','至少'+v+'次');o.value=v;threshold.append(o);}bar.append(mode,threshold,el('p','线表示两词共现，粗细表示共现单位数或篇数。人物按篇区分。点击连线查看原文。'));container.append(bar);const out=el('div');container.append(out);let times={},timer,cache={};const draw=()=>{out.replaceChildren();const key=mode.value;const full=cache[key]||(cache[key]=build(chapters.map(c=>({...c,times:times[c.id]||[]})),key));const edges=full.edges.filter(e=>e.weight>=Number(threshold.value)),ids=new Set(edges.flatMap(e=>[e.source,e.target])),graph={nodes:full.nodes.filter(n=>ids.has(n.id)).map(n=>({...n,degree:0})),edges};const byId=new Map(graph.nodes.map(n=>[n.id,n]));for(const e of edges){byId.get(e.source).degree++;byId.get(e.target).degree++;}root.GhostBookNetwork.mount(out,chapters,onExport,{graph,lexical:true,scope:key});};
 const load=()=>{clearTimeout(timer);out.replaceChildren(el('p','正在计算词汇关系…'));timer=setTimeout(draw,30);};mode.onchange=threshold.onchange=load;fetch('time-terms.json').then(r=>{if(!r.ok)throw Error();return r.json();}).then(d=>{times=d;load();}).catch(()=>{out.append(el('p','时间词未能载入，请刷新重试。'));});
}root.GhostVocabularyNetwork={...api,mount};
})(typeof window==='undefined'?globalThis:window);
