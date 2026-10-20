'use strict';
const fs=require('node:fs'),crypto=require('node:crypto');
const M=require('./ghost_map_model'),P=require('./ghost_map_package');
function merge(current,incoming){
 const rows=new Map(current.overrides.map(r=>[r.chapter_id,r]));
 for(const row of incoming.overrides)rows.set(row.chapter_id,row);
 const locations=new Map((current.place_locations||[]).map(r=>[r.name,r]));
 for(const row of incoming.place_locations||[])locations.set(row.name,row);
 return {...current,overrides:[...rows.values()].sort((a,b)=>a.chapter_id-b.chapter_id),place_locations:[...locations.values()]};
}
function restore(input){
 const bytes=fs.readFileSync(input),bundle=JSON.parse(bytes),currentBundle=JSON.parse(fs.readFileSync('data-package.json'));
 const checked=P.validate(bundle,currentBundle.base),current=JSON.parse(fs.readFileSync('manual-revisions.json'));
 const result=merge(current,checked.revisions),model=M.create(currentBundle.base);model.importDocument(result);
 const canonical=model.document(),before=new Map(current.overrides.map(r=>[r.chapter_id,r.changes])),titles=new Map(currentBundle.base.chapter_overview.map(c=>[c.chapter_id,c.chapter]));
 const fields={},changed=[];
 for(const row of checked.revisions.overrides){const old=before.get(row.chapter_id)||{},keys=Object.keys(row.changes).filter(k=>JSON.stringify(old[k])!==JSON.stringify(row.changes[k]));for(const k of keys)fields[k]=(fields[k]||0)+1;if(keys.length)changed.push({chapter_id:row.chapter_id,chapter:titles.get(row.chapter_id),fields:keys,event_before:old.event_types||{},event_after:row.changes.event_types});}
 const report={source_file:require('node:path').basename(input),source_sha256:crypto.createHash('sha256').update(bytes).digest('hex'),exported_at:bundle.exported_at,policy:'包内篇目修订优先；包外篇目及包外定位保留；不从 CSV 或自动分类覆盖包内值。',imported_chapters:checked.revisions.overrides.length,preserved_chapters:current.overrides.filter(r=>!checked.revisions.overrides.some(x=>x.chapter_id===r.chapter_id)).length,total_chapters:canonical.overrides.length,locations:canonical.place_locations.length,changed_fields:fields,changes:changed};
 fs.writeFileSync('manual-revisions.json',JSON.stringify(canonical));
 fs.writeFileSync('reports/user-package-restoration-20261020.json',JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({imported:report.imported_chapters,preserved:report.preserved_chapters,total:report.total_chapters,locations:report.locations,fields}));
}
module.exports={merge,restore};if(require.main===module){if(!process.argv[2])throw Error('请提供资料包路径');restore(process.argv[2]);}
