const fs=require('fs'),crypto=require('crypto'),M=require('./ghost_map_model');
const source=JSON.parse(fs.readFileSync('data-package.json')),revision=fs.readFileSync('manual-revisions.json'),model=M.create(source.base);model.importDocument(JSON.parse(revision));
const places=Object.fromEntries(model.places().map(p=>[p.name,{level:p.admin_level||'unknown',label:p.scale_label||p.level_label||'',parent:p.parent_id||null,located:Number.isFinite(p.lon)&&Number.isFinite(p.lat),coordinate_kind:p.coordinate_kind||null}]));
for(const [alias,target] of Object.entries(source.base.name_aliases||{})){if(!places[alias]&&places[target])places[alias]={...places[target],canonical:target};}
fs.writeFileSync('assets/research-lab/place-levels.json',JSON.stringify({revision_hash:crypto.createHash('sha256').update(revision).digest('hex'),places}));console.log('Exported map levels:',Object.keys(places).length);
