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
 if(binding)return places.find(p=>p.id===binding)||null;
 const term=model.name(model.simplify(String(label||'').trim()));
 const exact=places.filter(p=>model.name(p.name)===term);
 if(exact.length===1)return {...exact[0],route_binding:'exact'};
 const candidates=places.filter(p=>{const word=model.name(p.name),suffix=term.slice(word.length);return word.length>=2&&term.startsWith(word)&&!/^(?:至|去|往|赴|离|出|自)/.test(suffix)&&/^(?:逆旅|野外|界|之|府|县|城|家|宅|村|北郭|南郭|东郭|西郭|境内|故里|寓所|客店|旅舍|官署|寺|庙|山中|城外|城中|（|\(|[\p{Script=Han}]{1,4}(?:家|宅))/u.test(suffix);}).sort((a,b)=>b.name.length-a.name.length);
 return candidates.length&&(!candidates[1]||candidates[0].name.length>candidates[1].name.length)?{...candidates[0],route_binding:'region'}:null;
}
function project(chapter,places,model){
 const units=chapter.source_units||chapter.units||[],source=compact(units.map(u=>u.text||u.original||'').join(''));
 return normalize(chapter.narrative_events||chapter.steps).map(row=>{
  const fromLabel=row.from_space??row.from??'',toLabel=row.to_space??row.to??'';
  let from=endpoint(fromLabel,row.from_place_id,places,model),to=endpoint(toLabel,row.to_place_id,places,model);
  if(from&&!row.from_place_id&&row.quote?.includes(from.name+'人')&&row.quote.split(from.name).length===2)from=null;
  const source_valid=!!compact(row.quote)&&source.includes(compact(row.quote));
  return {...row,from_space:fromLabel,to_space:toLabel,transition_kind:row.transition_kind??row.kind,from,to,source_valid,
   geographic_status:!source_valid?'引句未核对':from&&to?(from.id===to.id?'同一地点内':'两端已定位'):from||to?'一端未定位':'两端未定位'};
 });
}
const api={normalize,endpoint,project};if(typeof module!=='undefined')module.exports=api;else root.GhostSpatialRoutes=api;
})(globalThis);
