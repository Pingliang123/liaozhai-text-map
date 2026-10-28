(function(root){'use strict';
// Keep the network readable: hierarchy is a display filter, not a data deletion.
const initialParams=new URLSearchParams(root.location?.search||'');
const hierarchyState={level:['province','prefecture','county','town','natural','unknown'].includes(initialParams.get('level'))?initialParams.get('level'):'all',records:{},year:initialParams.get('year')==='1820'?1820:null};
function remember(name,value){const url=new URL(location.href);if(value)url.searchParams.set(name,value);else url.searchParams.delete(name);history.replaceState(null,'',url);}
const hierarchyBookMount=root.GhostBookNetwork&&root.GhostBookNetwork.mount;
if(hierarchyBookMount)root.GhostBookNetwork.mount=function(out,chapters,exporter,options={}){
 const summary=!options.chapterSpatial&&options.graph&&hierarchyState.level!=='all'&&root.GhostHierarchyNetwork?root.GhostHierarchyNetwork.project(options.graph,hierarchyState.records,hierarchyState.level,hierarchyState.year):null;
 if(summary)options={...options,graph:summary,tutorial:false,positions:undefined,partition:undefined,metrics:undefined};
 const selected=options.onNodeSelect;const info=document.createElement('div');options={...options,onNodeSelect:id=>{selected?.(id);info.replaceChildren();if(!id.startsWith('place:'))return;const word=id.slice(6),a=document.createElement('a');a.textContent='在地图查看 '+word;a.href='../../index.html?place='+encodeURIComponent(word)+'#map-section';info.append(a);const record=hierarchyState.records[word];for(const r of record?.belongs_to||[]){const p=document.createElement('p');p.textContent=word+' → '+(Object.values(hierarchyState.records).find(x=>x.id===r.target)?.name||r.target)+' · '+(r.reference_year||'年代未定');info.append(p);}}};
 const result=hierarchyBookMount(out,chapters,exporter,options);out.append(info);
 if(summary){const details=document.createElement('details'),title=document.createElement('summary');title.textContent='下辖地点原始关联（含区域内关联）';details.append(title);let expanded=false;details.ontoggle=()=>{if(!details.open||expanded)return;expanded=true;for(const e of [...summary.edges,...summary.internal_edges]){const p=document.createElement('p');p.textContent=e.source.slice(6)+' → '+e.target.slice(6)+' · '+e.original_edges.length+' 组原始关联';details.append(p);for(const original of e.original_edges){const line=document.createElement('p');line.textContent=original.source.slice(6)+' → '+original.target.slice(6);details.append(line);}for(const r of e.evidence||[]){const quote=document.createElement('blockquote');quote.textContent='《'+(r.chapter||'')+'》'+(r.text||'');details.append(quote);}}};const note=document.createElement('p');note.textContent='下辖关联已汇总；同一区域内部关联见明细。未能对应本层级的节点：'+summary.projection.unresolved+'。';out.append(note,details);}
 return result;
};
const hierarchyPlacesMount=root.GhostPlaceSpaces&&root.GhostPlaceSpaces.mount;
if(hierarchyPlacesMount)root.GhostPlaceSpaces.mount=function(container,chapters,onExport){const result=hierarchyPlacesMount(container,chapters,onExport,{placeRecords:hierarchyState.records}),first=container.querySelector('.card');if(!first)return result;const label=document.createElement('label');label.textContent='显示层级 ';const select=document.createElement('select');select.setAttribute('aria-label','地点网络层级');[['all','全部层级'],['province','省域'],['prefecture','府／州／地市'],['county','县域'],['town','乡镇／村落'],['natural','山川水域'],['unknown','层级待核']].forEach(([v,t])=>{const o=document.createElement('option');o.value=v;o.textContent=t;select.append(o);});select.onchange=()=>{hierarchyState.level=select.value;container.querySelector('select[aria-label="地点网络范围"]')?.dispatchEvent(new Event('change'));};select.value=hierarchyState.level;label.append(select);first.insertBefore(label,first.children[1]||null);return result;};
const verbs=['入','出','归','宿','居','游','过','至','梦','死','生','见','遇','惧','爱','婚','救','杀','审','逃'];
const boundaries=['门','墙','壁','窗','洞','桥','梦'];
const known=s=>s&&!/未明|不详|未知|待核|未定/.test(s);
function wordRows(chapters,word){const rows=[];for(const c of chapters)for(const u of c.units)if(u.text.includes(word))rows.push({chapter:c.title,id:c.id,unit:u.id,text:u.text,verbs:verbs.filter(v=>u.text.includes(v)),people:c.people.filter(p=>u.text.includes(p.word)).map(p=>p.word)});return rows;}
function boundaryRows(chapters,word){const bins=Array(10).fill(0),rows=[];for(const c of chapters){const text=c.units.map(u=>u.text).join('');let pos=-1;while((pos=text.indexOf(word,pos+word.length))>=0){const bin=Math.min(9,Math.floor(pos/Math.max(text.length,1)*10));bins[bin]++;rows.push({id:c.id,chapter:c.title,position:pos,bin:bin+1,text:text.slice(Math.max(0,pos-35),pos+word.length+65)});}}return {bins,rows};}
function routeRows(chapters){const map=new Map();for(const c of chapters)for(const s of c.steps)if(s.kind==='movement'&&known(s.from)&&known(s.to)){const key=s.from+' → '+s.to;if(!map.has(key))map.set(key,{key,rows:[],chapters:new Set()});const g=map.get(key);g.rows.push({...s,chapter:c.title,id:c.id});g.chapters.add(c.id);}return [...map.values()].sort((a,b)=>b.chapters.size-a.chapters.size||b.rows.length-a.rows.length);}
function similarity(chapters,id){const c=chapters.find(c=>c.id===id);if(!c)return [];const a=new Set(c.spaces);return chapters.filter(x=>x.id!==id).map(x=>{const b=new Set(x.spaces),common=[...a].filter(w=>b.has(w)),union=new Set([...a,...b]).size;return {chapter:x.title,id:x.id,score:union?common.length/union:0,common,events:x.events};}).filter(x=>x.common.length>=2).sort((a,b)=>b.score-a.score).slice(0,15);}
const api={wordRows,boundaryRows,routeRows,similarity};if(typeof module!=='undefined'){module.exports=api;return;}
const $=id=>document.getElementById(id),el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
const requestedTab=typeof location!=='undefined'?new URLSearchParams(location.search).get('tab'):null;
const legacyTabs={layers:'relations',book:'relations',network:'relations',routes:'relations',yi:'relations',boundary:'words'};
let relationMode=(new URLSearchParams(location.search).get('mode')==='paths'||['yi','routes','network'].includes(requestedTab))?'paths':'places';
let data,tab=legacyTabs[requestedTab]||(['topics','words','relations'].includes(requestedTab)?requestedTab:'relations'),exportRows=[];
let renderVersion=0,loading=null,refreshAgain=false;
function saveFilters(){const url=new URL(location.href);for(const id of ['chapter','event']){const value=$(id).value;if(value)url.searchParams.set(id,value);else url.searchParams.delete(id);}history.replaceState(null,'',url);}
const filtered=()=>data.chapters.filter(c=>(!$('chapter').value||c.id===Number($('chapter').value))&&(!$('event').value||($('event').value==='未定'?!c.events.length:c.events.includes($('event').value))));
function table(headers,rows){const wrap=el('div',undefined,'scroll'),t=el('table'),head=el('tr');for(const h of headers)head.append(el('th',h));const thead=el('thead');thead.append(head);t.append(thead);const body=el('tbody');for(const row of rows){const tr=el('tr');for(const value of row){const td=el('td');value instanceof Node?td.append(value):td.textContent=String(value);tr.append(td);}body.append(tr);}t.append(body);wrap.append(t);return wrap;}
function bars(rows,onClick){const div=el('div'),max=Math.max(1,...rows.map(r=>r[1]));for(const [word,count]of rows){const line=el('div',undefined,'bar'),b=el(onClick?'button':'span',word);if(onClick)b.onclick=()=>onClick(word);const track=el('div'),ink=el('i');ink.style.display='block';ink.style.width=(100*count/max)+'%';track.append(ink);line.append(b,track,el('span',count));div.append(line);}return div;}
function diagram(from,to){const ns='http://www.w3.org/2000/svg',s=document.createElementNS(ns,'svg');s.setAttribute('viewBox','0 0 780 150');s.setAttribute('role','img');s.setAttribute('aria-label',from+'到'+to);const shape=(tag,attrs,text)=>{const n=document.createElementNS(ns,tag);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,v);if(text)n.textContent=text;s.append(n);};shape('path',{d:'M285 70 L485 70 M470 60 L485 70 L470 80',stroke:'#367a70','stroke-width':3,fill:'none'});for(const [x,label]of [[10,from],[490,to]]){shape('rect',{x,y:35,width:275,height:70,rx:10,fill:'#e6eee4',stroke:'#749a89'});shape('text',{x:x+12,y:77,'font-size':16},label.length>15?label.slice(0,15)+'…':label);}return s;}
function evidence(rows,heading='原文证据'){const box=el('section',undefined,'card');box.append(el('h3',heading+' · '+rows.length+' 条'));if(rows[0]?.from&&rows[0]?.to)box.append(diagram(rows[0].from,rows[0].to));const search=el('input');search.placeholder='在证据中搜索篇名或文字';search.setAttribute('aria-label','筛选原文证据');const list=el('div',undefined,'evidence'),more=el('button','再显示50条');let limit=50;const render=()=>{const q=search.value.trim(),matches=rows.filter(r=>(r.chapter+r.text).includes(q));list.replaceChildren();for(const r of matches.slice(0,limit)){list.append(el('strong','《'+r.chapter+'》'+(r.bin?' · 第'+r.bin+'段':'')),el('blockquote',r.text));}more.hidden=limit>=matches.length;};search.oninput=()=>{limit=50;render();};more.onclick=()=>{limit+=50;render();};box.append(search,list,more);render();return box;}
function render(){if(!data)return;exportRows=[];const version=++renderVersion,setExport=rows=>{if(version===renderVersion){exportRows=rows;$('export').disabled=rows.length<2;}};$('export').disabled=true;document.querySelectorAll('[data-tab]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.tab===tab)));const cs=filtered(),out=el('div');$('view').replaceChildren(out);$('status').textContent='当前范围：'+cs.length+' 篇 · '+(data.origin||'发布快照');
 if(!cs.length){const clear=el('button','清除筛选');clear.onclick=()=>{$('chapter').value='';$('event').value='';saveFilters();render();};out.append(el('p','没有符合条件的篇目。'),clear);return;}
 if(tab==='relations'){
 const controls=el('div',undefined,'filters'),mode=el('select');mode.setAttribute('aria-label','关系网络类型');
 for(const [v,t]of [['places','地点与空间'],['paths','人物与路径']]){const o=el('option',t);o.value=v;mode.append(o);}mode.value=relationMode;
 mode.onchange=()=>{relationMode=mode.value;const url=new URL(location.href);url.searchParams.set('mode',relationMode);url.searchParams.set('tab','relations');history.replaceState(null,'',url);render();};
 const label=el('label','关系 ');label.append(mode);controls.append(label);out.append(controls);
 if(relationMode==='paths'){GhostChapterSpaces.mount(out,cs,{paths:true,placeRecords:hierarchyState.records});const whole=el('details');whole.append(el('summary','全书人物路径汇总'));let loaded=false;whole.ontoggle=()=>{if(whole.open&&!loaded){loaded=true;GhostYiNetwork.mount(whole,cs,setExport);}};out.append(whole);}
 else{
 GhostPlaceSpaces.mount(out,cs,setExport);
 const period=el('label','归属依据 '),year=el('select');year.setAttribute('aria-label','历史归属年份');
 for(const [v,t]of [['','现有地图归属（年代未定）'],['1820','1820 年资料']]){const option=el('option',t);option.value=v;year.append(option);}
 year.value=hierarchyState.year?String(hierarchyState.year):'';year.onchange=()=>{hierarchyState.year=year.value?Number(year.value):null;out.querySelector('select[aria-label="地点网络范围"]')?.dispatchEvent(new Event('change'));};period.append(year);out.querySelector('.card')?.append(period);
 }
 }else if(tab==='words'){
 const freq=new Map();for(const c of cs)for(const w of new Set(c.spaces))freq.set(w,(freq.get(w)||0)+1);const terms=[...freq].sort((a,b)=>b[1]-a[1]);const card=el('section',undefined,'card'),select=el('select');select.setAttribute('aria-label','选择空间词');for(const [w,n]of terms){const o=el('option',w+' · '+n+'篇');o.value=w;select.append(o);}card.append(el('h2','空间与动作'),el('p','空间词涉及篇数；点击柱形标签或选择词语，查看原文单位中的搭配。'),select);out.append(card);const results=el('div');out.append(results);
 const load=()=>{results.replaceChildren();const w=select.value,rows=wordRows(cs,w),counts=verbs.map(v=>[v,rows.filter(r=>r.verbs.includes(v)).length]).filter(r=>r[1]).sort((a,b)=>b[1]-a[1]);const g=el('div',undefined,'grid'),a=el('section',undefined,'card'),b=el('section',undefined,'card');a.append(el('h3','空间词 · 涉及篇数'),bars(terms.slice(0,18),word=>{select.value=word;load();}));b.append(el('h3','「'+w+'」同单位动作 · 单位数'),bars(counts),el('p','固定词表字串匹配，包含多义与嵌套用法，须查看引句。','small'));g.append(a,b);results.append(g,evidence(rows));exportRows=[['篇名','空间词','同单位人物表达','动作','原文'],...rows.map(r=>[r.chapter,w,r.people.join('、'),r.verbs.join('、'),r.text])];};select.onchange=load;if(terms.length)load();else out.append(el('p','当前范围没有空间词。'));
 }else if(tab==='topics'){
 GhostTopicPlaces.mount(out,cs,setExport,{chapters:data.chapters,placeRecords:data.placeRecords});

 }

 if(tab==='words'){
  const details=el('details');details.append(el('summary','边界词在篇章中的位置'));let opened=false;details.ontoggle=()=>{if(!details.open||opened)return;opened=true;const pick=el('select');pick.setAttribute('aria-label','选择边界词');for(const word of boundaries)pick.append(el('option',word));const result=el('div');const draw=()=>{const r=boundaryRows(cs,pick.value);result.replaceChildren(bars(r.bins.map((n,i)=>['第'+(i+1)+'段',n])),evidence(r.rows));};pick.onchange=draw;details.append(pick,result);draw();};out.append(details);
 }
 if(tab==='words')$('export').disabled=!exportRows.length;
}
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;const url=new URL(location.href);url.searchParams.set('tab',tab);history.replaceState(null,'',url);document.querySelectorAll('[data-tab]').forEach(x=>x.setAttribute('aria-selected',String(x===b)));render();});for(const id of ['chapter','event'])$(id).onchange=()=>{saveFilters();render();};
$('export').onclick=()=>{if(!exportRows.length)return;const cell=s=>'"'+String(s??'').replace(/^[=+@-]/,"'$&").replace(/"/g,'""')+'"',blob=new Blob(['\ufeff'+exportRows.map(r=>r.map(cell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download='聊斋空间实验-'+tab+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
async function refreshData(){
 if(loading){refreshAgain=true;return loading;}
 loading=(async()=>{try{const d=await GhostLabData.load();const params=new URLSearchParams(location.search),chapter=data?$('chapter').value:params.get('chapter')||'';
 const unchanged=data&&d.revision_hash&&d.revision_hash===data.revision_hash;
 data=d;hierarchyState.records=d.placeRecords;$('snapshot').textContent=d.origin+' · '+d.chapters.length+'篇';
 if(unchanged){$('status').textContent='当前范围：'+filtered().length+' 篇 · '+d.origin;return;}
 $('chapter').replaceChildren(el('option','全书'));$('chapter').children[0].value='';for(const c of data.chapters){const o=el('option',c.title);o.value=c.id;$('chapter').append(o);}
 $('chapter').value=d.chapters.some(c=>String(c.id)===chapter)?chapter:'';
 if(params.has('event'))$('event').value=params.get('event');render();
 }catch(e){$('status').textContent='读取最新修订失败：'+e.message+'。现有资料仍保留。';}
 finally{loading=null;if(refreshAgain){refreshAgain=false;scheduleRefresh();}}})();return loading;
}
const refresh=el('button','更新资料');refresh.onclick=refreshData;$('snapshot').after(refresh);let reloadTimer;const scheduleRefresh=()=>{clearTimeout(reloadTimer);reloadTimer=setTimeout(refreshData,400);};globalThis.addEventListener('storage',event=>{if([data?.storageKey,data?.storageKey+'-changed',data?.storageKey+'-backend'].includes(event.key))scheduleRefresh();});globalThis.addEventListener('focus',scheduleRefresh);refreshData();
document.addEventListener('change',event=>{const key={'地点网络层级':'level','历史归属年份':'year','地点网络范围':'range'}[event.target.getAttribute('aria-label')];if(key)remember(key,event.target.value);});
})(typeof window==='undefined'?globalThis:window);
