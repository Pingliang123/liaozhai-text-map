'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const M=require('./ghost_map_model'),D=require('../assets/research-lab/current-data'),R=require('../assets/research-lab/place-records');
const pack=require('../data-package.json'),doc=require('../manual-revisions.json');
assert.deepEqual(pack.revisions,doc,'发布总资料包与人工修订一致');
const hash=require('node:crypto').createHash('sha256').update(fs.readFileSync('manual-revisions.json')).digest('hex');
for(const file of ['data.json','topics.json','place-levels.json'])assert.equal(require('../assets/research-lab/'+file).revision_hash,hash,file+'应来自当前修订');
const model=M.create(pack.base);model.importDocument(doc);
// Added administrative parents need not have the obsolete chapter_ids field.
for(const p of model.places()){
 const direct=model.atPlace(p).map(c=>c.chapter_id);
 assert.deepEqual(direct,model.ids.filter(id=>model.view(id).places.some(x=>(pack.base.name_aliases?.[x.word]||x.word)===p.name)),p.name);
 const aggregate=model.atPlace(p,true).map(c=>c.chapter_id);
 assert.equal(aggregate.length,new Set(aggregate).size,p.name+'汇总去重');
}
const records=R.build(model,pack.base);
assert.deepEqual(records,require('../assets/research-lab/place-levels.json').places,'导出层级与实时层级一致');
const location=model.placeInfo('齐河');model.saveLocation({...location,lon:116.77,lat:36.80,parent_id:'place-山东'});
const local=model.document();
(async()=>{
 let calls=0;
 const data=await D.load({GhostMapModel:M,GhostMapPackage:{},localStorage:{getItem:k=>k.endsWith('-backend')?null:JSON.stringify(local)},fetch:async url=>{if(url==='../../release-manifest.json')return {ok:false};calls++;assert.equal(url,'../../data-package.json');return {ok:true,json:async()=>pack};}});
 assert.equal(calls,1,'篇目与层级仅使用一次资料包加载');
 assert.deepEqual(data.chapters,D.snapshot(model));
 assert.equal(data.placeRecords['齐河'].parent,'place-山东','本机上级修订立即用于层级网络');
 assert(data.placeRecords['齐河'].belongs_to.some(r=>r.target==='place-山东'&&r.map_current));
 assert.equal(data.placeRecords['齐河'].located,true);
 assert.deepEqual(require('../manual-revisions.json'),doc,'核查不改写人工资料');
 console.log('PASS canonical agreement, live chapter membership, descendant deduplication, local hierarchy and single source');
})().catch(e=>{console.error(e);process.exitCode=1;});
