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
for(const [alias,target] of Object.entries(source.base.name_aliases||{}))if(places[target]&&places[alias])places[alias]={...places[target],canonical:target};
fs.writeFileSync('assets/research-lab/place-levels.json',JSON.stringify({revision_hash:crypto.createHash('sha256').update(revision).digest('hex'),places}));console.log('Exported map levels:',Object.keys(places).length);
