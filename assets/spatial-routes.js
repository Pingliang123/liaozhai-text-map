(function(root){'use strict';
const compact=s=>String(s||'').replace(/\s/gu,'');
const legacy=new Map([
 ['公力疾乘马从去，路甚生疎，至一城郭，如王者都。',['路（具体地名未明）','陌生城郭']],
 ['至安丘，遇雨，避身逆旅。',['出发地未明','安丘逆旅']],
 ['马欣动，即刻治装，从客至金陵。',['家（具体地名未明）','金陵']],
 ['于间壁开扉通南第，日过课其仆。',['马宅','南第']]
]);
// Derived records only. Keep the original indices so every view opens the same saved step.
function normalize(steps){
 const out=[],groups=new Map();
 for(const [index,input] of (steps||[]).entries()){
  const s={...input},actors=(Array.isArray(s.actors)?s.actors:String(s.actors||'').split(/[、，,；;]/u)).map(x=>x.trim()).filter(Boolean).sort();
  if(s.transition_kind===undefined&&s.kind===undefined&&legacy.has(s.quote)){const pair=legacy.get(s.quote);s.transition_kind='movement';s.from_space=pair[0];s.to_space=pair[1];}
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
 return normalize(chapter.narrative_events||chapter.steps).map(row=>{
  const fromLabel=row.from_space??row.from??'',toLabel=row.to_space??row.to??'';
  let from=endpoint(fromLabel,row.from_place_id,places,model),to=endpoint(toLabel,row.to_place_id,places,model);
  if(from&&!row.from_place_id&&row.quote?.includes(from.name+'人')&&row.quote.split(from.name).length===2)from=null;
  if(from&&!row.from_place_id&&row.quote?.startsWith(from.name)&&/^[\p{Script=Han}]{1,4}(?:生|者)[，。]/u.test(row.quote.slice(from.name.length))&&!/至|往|来|去|归|渡|抵|出发|进入|离开/.test(row.quote))from=null;
  const source_valid=!!compact(row.quote)&&source.includes(compact(row.quote));
  const realm=row.space_realm??row.realm;
  const local=label=>/^(?:郊郭|墓地|街头|门外|门内|室内|室外|内室|院中|院外|村中|村外|书斋|公堂|官署|寺内|寺外|庙内|庙外|宅内|宅外|家中|家门|宅院|府邸|王邸)$/u.test(label);
  const distant=/远行|远涉|出境|越境|渡海|浮海|出海|数日|千里|百里|飞|飘|梦|鬼引/.test(row.quote||'');
  const mentionedElsewhere=known=>(chapter.places||[]).some(p=>{const w=typeof p==='string'?p:p.word;return w&&row.quote?.includes(w)&&(model.placeName||model.name)(w)!==(model.placeName||model.name)(known.name);});
  if(source_valid&&realm==='人间'&&!distant){
   if(from&&!to&&!row.to_place_id&&local(toLabel)&&!mentionedElsewhere(from))to={...from,route_binding:'local-context',route_basis:'起点已定位；到达端为同一场景的近旁空间，按区域参考展示'};
  }
  return {...row,from_space:fromLabel,to_space:toLabel,transition_kind:row.transition_kind??row.kind,from,to,source_valid,
   geographic_status:!source_valid?'引句未核对':from&&to?(from.id===to.id?'同一地点内':'两端已定位'):from||to?'一端未定位':'两端未定位'};
 });
}
function shape(a,b,index=0){
 const local=Math.hypot(a[0]-b[0],a[1]-b[1])<1;
 if(local){const r=30+(index%4)*8;return {local,d:'M'+[a[0]+6,a[1]].join(',')+' C'+[a[0]+r*2,a[1]-r*2,a[0]-r*2,a[1]-r*2,a[0]-6,a[1]].join(','),control:[a[0],a[1]-r*2],anchor:[a[0],a[1]-r*1.5]};}
 const control=[(a[0]+b[0])/2,(a[1]+b[1])/2-12-(index%4)*6];return {local,d:'M'+a.join(',')+' Q'+control.join(',')+' '+b.join(','),control,anchor:[(a[0]+2*control[0]+b[0])/4,(a[1]+2*control[1]+b[1])/4]};
}
const api={normalize,endpoint,project,shape};if(typeof module!=='undefined')module.exports=api;else root.GhostSpatialRoutes=api;
})(globalThis);
