(function(root){'use strict';
// Live display and the downloadable registry use the same effective model.
function build(model,base){
 const places={},merged=model.places(),ids=new Map(merged.flatMap(p=>(p.merged_ids||[p.id]).map(id=>[id,p.id])));
 for(const p of model.places()){
  const belongs_to=(base.place_hierarchy?.edges||[]).filter(e=>(ids.get(e.child_id)||e.child_id)===p.id&&(ids.get(e.parent_id)||e.parent_id)!==p.id).map(e=>({relation:'belongs-to',source:p.id,target:ids.get(e.parent_id)||e.parent_id,reference_year:e.year??null,valid_from:e.valid_from??null,valid_to:e.valid_to??null,source_url:e.source_url||'',note:e.note||'',map_current:false}));
  if(p.parent_id)belongs_to.push({relation:'belongs-to',source:p.id,target:p.parent_id,reference_year:null,valid_from:null,valid_to:null,note:'现有地图归属；年代未定',source_url:p.source_url||'',map_current:true});
  places[p.name]={level:p.admin_level||'unknown',label:p.scale_label||p.level_label||'',parent:p.parent_id||null,located:Number.isFinite(p.lon)&&Number.isFinite(p.lat),coordinate_kind:p.coordinate_kind||null,id:p.id,name:p.name,names:[{name:p.name,valid_from:null,valid_to:null,basis:'文本名称'}],belongs_to};
 }
 for(const eq of base.place_equivalences||[]){const r=places[eq.word],target=places[eq.target];if(r&&target&&eq.relation==='same-reference-area'){
  r.reference_place=eq.target;r.reference_relation=eq.relation;r.names.push({name:eq.target,valid_from:null,valid_to:null,basis:eq.note});
  for(const parent of target.belongs_to)if(!r.belongs_to.some(p=>p.target===parent.target&&p.reference_year===parent.reference_year&&p.map_current===parent.map_current))r.belongs_to.push({...parent,source:r.id,note:eq.note+'；归属采用对应区域资料。'});
 }}
 for(const [alias,target]of Object.entries(base.name_aliases||{}))if(places[target])places[alias]={...places[target],canonical:target};
 for(const [alias,target]of Object.entries(base.place_node_aliases||{}))if(places[target])places[alias]={...places[target],canonical:target,names:[...places[target].names,{name:alias,valid_from:null,valid_to:null,basis:'原文异名；节点合并不外推历代行政疆界'}]};
 return places;
}
const api={build};if(typeof module!=='undefined')module.exports=api;else root.GhostPlaceRecords=api;
})(globalThis);
