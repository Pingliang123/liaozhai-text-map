(function(root){'use strict';
const compact=s=>String(s||'').replace(/\s/gu,'');
const lexiconCache=new WeakMap();
function lexicon(chapter){
 if(lexiconCache.has(chapter))return lexiconCache.get(chapter);
 const remember=value=>(lexiconCache.set(chapter,value),value);
 if(Array.isArray(chapter.source_tokens))return remember({words:new Set(chapter.source_tokens),basis:chapter.token_basis||'已保存分词',strict:true});
 const units=chapter.source_units||chapter.units||[],source=compact(units.map(u=>u.text||u.original||'').join(''));
 const revised=String(chapter.segmentation_note||'').split(/[\s/|]+/u).filter(Boolean);
 if(revised.length&&revised.join('')===source)return remember({words:new Set(revised),basis:'与原文逐字对齐的已保存分词',strict:true});
 const words=units.flatMap(u=>(u.tokens||[]).map(t=>typeof t==='string'?t:(u.text||u.original||'').slice(t[0],t[1]))).filter(Boolean);
 return remember({words:new Set(words),basis:words.length?'原典词位分词（修订分词未全文对齐）':'无分词资料',strict:words.length>0});
}
function lexicalEndpoint(label,chapter,index=lexicon(chapter)){
 if(!index.strict)return label||'';
 const allowed=[...(chapter.places||[]).map(p=>typeof p==='string'?p:p.word),...(chapter.space_words||chapter.spaces||[]),(chapter.realm_evidence||[]).map(e=>e.space)].flat().filter(w=>index.words.has(w));
 if(allowed.includes(label))return label;
 const hits=[...new Set(allowed)].filter(w=>String(label||'').includes(w));
 const longest=hits.filter(w=>!hits.some(other=>other!==w&&other.includes(w)));
 return longest.length===1?longest[0]:'';
}
function tokenUnits(chapter,index=lexicon(chapter)){
 const units=chapter.source_units||chapter.units||[];
 if(!index.strict)return units.map(()=>null);
 const source=compact(units.map(u=>u.text||u.original||'').join('')),revised=String(chapter.segmentation_note||'').split(/[\s/|]+/u).filter(Boolean);
 if(revised.join('')!==source)return units.map(u=>u.token_words||(u.tokens||[]).map(t=>typeof t==='string'?t:(u.text||u.original||'').slice(t[0],t[1])));
 let offset=0,tokenIndex=0,tokenEnd=0;const ends=revised.map(w=>(tokenEnd+=w.length));
 return units.map(u=>{const start=offset,end=start+compact(u.text||u.original||'').length,words=[];while(tokenIndex<revised.length&&ends[tokenIndex]<=end){if(ends[tokenIndex]-revised[tokenIndex].length>=start)words.push(revised[tokenIndex]);tokenIndex++;}offset=end;return words;});
}
// Derived records only. Keep the original indices so every view opens the same saved step.
function normalize(steps){
 const out=[],groups=new Map();
 for(const [index,input] of (steps||[]).entries()){
  const s={...input},actors=(Array.isArray(s.actors)?s.actors:String(s.actors||'').split(/[、，,；;]/u)).map(x=>x.trim()).filter(Boolean).sort();
  const kind=s.transition_kind??s.kind,from=s.from_space??s.from,to=s.to_space??s.to;
  const key=JSON.stringify([s.unit,kind,from,to,actors,s.space_realm??s.realm??'',s.space_access??s.access??'',s.from_place_id||'',s.to_place_id||'']);
  const matches=groups.get(key)||[],quote=compact(s.quote);
  const old=kind==='movement'&&s.unit!=null&&quote?matches.find(r=>{const q=compact(r.quote);return q&&(q.startsWith(quote)||quote.startsWith(q));}):null;
  if(old){old.source_indices.push(index);if(quote.length>compact(old.quote).length)old.quote=s.quote;continue;}
  const row={...s,index,source_indices:[index]};out.push(row);matches.push(row);groups.set(key,matches);
 }
 return out;
}
function endpoint(label,binding,places,model={name:s=>s,simplify:s=>s}){
 if(binding)return places.find(p=>p.id===binding||p.merged_ids?.includes(binding))||null;
 if(!String(label||'').trim())return null;
 const normalize=model.placeName||model.name;
 const term=normalize(model.simplify(String(label||'').trim()));
 const exact=places.filter(p=>normalize(p.name)===term);
 if(exact.length===1)return {...exact[0],route_binding:'exact'};
 const rawTerm=model.name(model.simplify(String(label||'').trim()));
 if(/异境|幻境|梦境|途中|归途|未明|未定|一带/.test(rawTerm))return null;
 if(!/未至|未到|欲往|欲赴|欲至|往返|至.+至/.test(rawTerm)){
  const hits=places.filter(p=>(p.merged_names||[p.name]).some(w=>w.length>=2&&rawTerm.includes(model.name(w))));
  const byId=new Map(places.map(p=>[p.id,p]));
  const ancestor=(a,b)=>{let p=b,seen=new Set();while(p&&!seen.has(p.id)){if(p.id===a.id)return true;seen.add(p.id);p=byId.get(p.parent_id);}return false;};
  const mostSpecific=hits.filter(p=>hits.every(other=>ancestor(other,p)));
  const bracketed=hits.filter(p=>(p.merged_names||[p.name]).some(w=>rawTerm.includes('（'+w+'）')||rawTerm.includes('('+w+')')));
  if(hits.length>1&&mostSpecific.length===1)return {...mostSpecific[0],route_binding:'region',route_basis:'端点中的上下级地名取最具体地点'};
  if(hits.length===1&&bracketed.length===1)return {...bracketed[0],route_binding:'region',route_basis:'端点括注的地点'};
 }
 const candidates=places.flatMap(p=>(p.merged_names||[p.name]).map(raw=>({p,word:model.name(raw)}))).filter(({word})=>{const suffix=rawTerm.slice(word.length);return word.length>=2&&rawTerm.startsWith(word)&&!/^(?:至|去|往|赴|离|出|自)/.test(suffix)&&/^(?:观宇|观|任所|乡里|[/／]监|上$|边|富室|山下|山半|道中|旅店|街市|药肆|舟中|下院|间驿亭|郊野|氏第|衡府|观察公署|口|育婴堂|[\p{Script=Han}]{1,6}居所|山谷|水路|岸|别业|道观|民舍|某邑|狱|学宫|学署|道路|祖墓|典肆|试场|藩邸|郡|境江舟|逆旅|野外|界|之|府|县|城|家|宅|村|北郭|南郭|东郭|西郭|境内|故里|寓所|客店|旅舍|官署|寺|庙|山中|城外|城中|（|\(|[\p{Script=Han}]{1,4}(?:家|宅))/u.test(suffix);}).sort((a,b)=>b.word.length-a.word.length);
 return candidates.length&&(!candidates[1]||candidates[0].word.length>candidates[1].word.length||candidates[0].p.id===candidates[1].p.id)?{...candidates[0].p,route_binding:'region'}:null;
}
function project(chapter,places,model){
 const units=chapter.source_units||chapter.units||[],source=compact(units.map(u=>u.text||u.original||'').join(''));
 const vocabulary=lexicon(chapter);
 return normalize(chapter.narrative_events||chapter.steps).map(row=>{
  const rawFrom=row.from_space??row.from??'',rawTo=row.to_space??row.to??'',fromLabel=lexicalEndpoint(rawFrom,chapter,vocabulary),toLabel=lexicalEndpoint(rawTo,chapter,vocabulary);
  let from=endpoint(fromLabel,row.from_place_id,places,model),to=endpoint(toLabel,row.to_place_id,places,model);
  if(!fromLabel)from=null;if(!toLabel)to=null;
  if(vocabulary.strict){const placeWord=label=>(chapter.places||[]).some(p=>(typeof p==='string'?p:p.word)===label);if(!row.from_place_id&&(from?.route_binding!=='exact'||!placeWord(fromLabel)))from=null;if(!row.to_place_id&&(to?.route_binding!=='exact'||!placeWord(toLabel)))to=null;}
  if(from&&!row.from_place_id&&row.quote?.includes(from.name+'人')&&row.quote.split(from.name).length===2)from=null;
  if(from&&!row.from_place_id&&row.quote?.startsWith(from.name)&&/^[\p{Script=Han}]{1,4}(?:生|者)[，。]/u.test(row.quote.slice(from.name.length))&&!/至|往|来|去|归|渡|抵|出发|进入|离开/.test(row.quote))from=null;
  const source_valid=!!compact(row.quote)&&source.includes(compact(row.quote));
  const realm=row.space_realm??row.realm;
  const local=label=>/^(?:郊郭|墓地|街头|门外|门内|室内|室外|内室|院中|院外|村中|村外|书斋|公堂|官署|寺内|寺外|庙内|庙外|宅内|宅外|家中|家门|宅院|府邸|王邸)$/u.test(label);
  const distant=/远行|远涉|出境|越境|渡海|浮海|出海|数日|千里|百里|飞|飘|梦|鬼引/.test(row.quote||'');
  const mentionedElsewhere=known=>(chapter.places||[]).some(p=>{const w=typeof p==='string'?p:p.word;return w&&row.quote?.includes(w)&&(model.placeName||model.name)(w)!==(model.placeName||model.name)(known.name);});
  if(!vocabulary.strict&&source_valid&&realm==='人间'&&!distant){
   if(from&&!to&&!row.to_place_id&&local(toLabel)&&!mentionedElsewhere(from))to={...from,route_binding:'local-context',route_basis:'起点已定位；到达端为同一场景的近旁空间，按区域参考展示'};
  }
  const actorWords=(Array.isArray(row.actors)?row.actors:String(row.actors||'').split(/[、，,；;]/u)).filter(w=>!vocabulary.strict||vocabulary.words.has(w.trim()));
  return {...row,actors:actorWords.join('、'),original_actors:row.actors,from_space:fromLabel,to_space:toLabel,original_from_space:rawFrom,original_to_space:rawTo,token_basis:vocabulary.basis,lexical_status:fromLabel&&toLabel?'分词词项':'端点待核',transition_kind:row.transition_kind??row.kind,from,to,source_valid,
   geographic_status:!source_valid?'引句未核对':from&&to?(from.id===to.id?'同一地点内':'两端已定位'):from||to?'一端未定位':'两端未定位'};
 }).sort((a,b)=>{
  const position=row=>{const index=units.findIndex(u=>(u.unit??u.id)===row.unit);return index>=0?index:units.length;};
  return position(a)-position(b)||a.index-b.index;
 });
}
function shape(a,b,index=0,local=a[0]===b[0]&&a[1]===b[1]){
 if(local){const r=30+(index%4)*8;return {local,d:'M'+[a[0]+6,a[1]].join(',')+' C'+[a[0]+r*2,a[1]-r*2,a[0]-r*2,a[1]-r*2,a[0]-6,a[1]].join(','),control:[a[0],a[1]-r*2],anchor:[a[0],a[1]-r*1.5]};}
 const control=[(a[0]+b[0])/2,(a[1]+b[1])/2-12-(index%4)*6];return {local,d:'M'+a.join(',')+' Q'+control.join(',')+' '+b.join(','),control,anchor:[(a[0]+2*control[0]+b[0])/4,(a[1]+2*control[1]+b[1])/4]};
}
const api={normalize,endpoint,project,shape,lexicon,lexicalEndpoint,tokenUnits};if(typeof module!=='undefined')module.exports=api;else root.GhostSpatialRoutes=api;
})(globalThis);
