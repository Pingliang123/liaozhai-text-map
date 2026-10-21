const fs=require('fs'),crypto=require('crypto'),M=require('./ghost_map_model');
const source=JSON.parse(fs.readFileSync('data-package.json')),revision=fs.readFileSync('manual-revisions.json'),model=M.create(source.base);model.importDocument(JSON.parse(revision));
const places=Object.fromEntries(model.places().map(p=>[p.name,{level:p.admin_level||'unknown',label:p.scale_label||p.level_label||'',parent:p.parent_id||null,located:Number.isFinite(p.lon)&&Number.isFinite(p.lat),coordinate_kind:p.coordinate_kind||null}]));
for(const [alias,target] of Object.entries(source.base.name_aliases||{})){if(!places[alias]&&places[target])places[alias]={...places[target],canonical:target};}
const current=model.places(),byId=new Map(current.map(p=>[p.id,p]));
for(const p of current){const r=places[p.name];r.id=p.id;r.name=p.name;r.names=[{name:p.name,valid_from:null,valid_to:null,basis:'文本名称'}];r.belongs_to=[];
 const historical=(source.base.place_hierarchy?.edges||[]).filter(e=>e.child_id===p.id);
 for(const e of historical)r.belongs_to.push({relation:'belongs-to',source:p.id,target:e.parent_id,reference_year:e.year??null,valid_from:e.valid_from??null,valid_to:e.valid_to??null,source_url:e.source_url||'',note:e.note||'',map_current:false});
 if(p.parent_id)r.belongs_to.push({relation:'belongs-to',source:p.id,target:p.parent_id,reference_year:null,valid_from:null,valid_to:null,note:'现有地图归属；年代未定',source_url:p.source_url||'',map_current:true});
}
for(const eq of source.base.place_equivalences||[]){const r=places[eq.word],target=places[eq.target];if(r&&target){r.reference_place=eq.target;r.reference_relation=eq.relation;r.names=[...r.names,{name:eq.target,valid_from:null,valid_to:null,basis:eq.note}];for(const parent of target.belongs_to||[])if(!r.belongs_to.some(p=>p.target===parent.target&&p.reference_year===parent.reference_year&&p.map_current===parent.map_current))r.belongs_to.push({...parent,source:r.id,note:eq.note+'；归属采用对应区域资料。'});}}
for(const [alias,target] of Object.entries(source.base.name_aliases||{}))if(places[target]&&places[alias])places[alias]={...places[target],canonical:target};
fs.writeFileSync('assets/research-lab/place-levels.json',JSON.stringify({revision_hash:crypto.createHash('sha256').update(revision).digest('hex'),places}));console.log('Exported map levels:',Object.keys(places).length);
