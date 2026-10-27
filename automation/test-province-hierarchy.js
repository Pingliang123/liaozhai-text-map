'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),M=require('./ghost_map_model'),Review=require('./review-province-hierarchy');
const S=require('../assets/corpus-store'),R=require('../assets/research-lab/place-records'),H=require('../assets/research-lab/hierarchy-network');
const pack=require('../data-package.json'),doc=require('../manual-revisions.json'),model=M.create(pack.base);model.importDocument(doc);
const records=R.build(model,pack.base),saved=require('../assets/research-lab/place-levels.json').places;
function province(word,year=null){const p=H.project({nodes:[{id:'place:'+word,label:word,kind:'place'}],edges:[]},records,'province',year);return p.nodes[0]?.label;}
for(const [provinceName,names]of Object.entries({江苏:['苏州','松江','常州','镇江','江宁','金陵','徐州','彭城','吴江','吴江府','宿迁','睢宁','邳','木渎镇','瓜州'],浙江:['湖州','绍兴','会稽','金华','衢州','上虞','钱塘','苕溪'],直隶:['滦州','河间','天津','京','燕都','无极','海岱门'],湖北:['云梦'],湖南:['沅江','武陵']})){
 const root=model.places().find(p=>p.name===provinceName),members=new Set(model.descendants(root).map(p=>p.name));
 for(const name of names){assert(members.has(model.placeName(name)),provinceName+'应包含'+name);assert.equal(province(name),provinceName,'地图与网络必须使用相同省域：'+name);}
}
assert.equal(province('松江',1820),'江苏','清代松江府不能按今上海直辖市处理');
assert.equal(province('湖州',1820),'浙江');assert.equal(province('瓜州'),'江苏');
assert(!model.descendants(model.places().find(p=>p.name==='河南')).some(p=>p.name==='瓜州'));
assert(!model.descendants(model.places().find(p=>p.name==='江西')).some(p=>['武陵','沅江','岳州','长沙'].includes(p.name)));
assert.equal(model.placeInfo('都').parent_id,null,'用户核定的泛称不固定成历代北京下辖地');
for(const [name,r]of Object.entries(records)){assert.deepEqual(r,saved[name],'导出注册表与实时网络一致：'+name);const current=r.belongs_to.filter(e=>e.map_current);assert(new Set(current.map(e=>e.target)).size<=1,'同名参考不得产生两个当前上级：'+name);}
const before=JSON.stringify(pack),again=Review.apply(pack);assert.equal(JSON.stringify(pack),before);assert.deepEqual(again.pack,pack,'审核重复执行不改写或复原人工值');
// A later manual correction always wins over the six frozen generated rows.
const edited=structuredClone(pack),row=edited.revisions.place_locations.find(x=>x.name==='武陵');row.parent_id='place-湖北';row.note='我的新判断';
assert.deepEqual(Review.apply(edited).pack.revisions.place_locations.find(x=>x.name==='武陵'),row);
const old=structuredClone(doc),oldRow=old.place_locations.find(x=>x.name==='徐州');oldRow.parent_id=null;
(async()=>{
 const result=await S.rebasePublished(old,doc);assert.equal(result.document.place_locations.find(x=>x.name==='徐州').parent_id,'place-江苏');assert.equal(oldRow.parent_id,null,'迁移不得破坏原备份');assert.deepEqual(result.document.overrides,doc.overrides,'篇目与分词不变');
 const manual=structuredClone(old);manual.place_locations.find(x=>x.name==='徐州').note='人工重新核查';
 assert.equal((await S.rebasePublished(manual,doc)).document.place_locations.find(x=>x.name==='徐州').parent_id,null,'不覆盖人工分歧');
 const localBase={...pack.base,places:[],place_hierarchy:{edges:[]}},live=S.effectiveBase(pack.base,localBase);
 assert.strictEqual(live.places,pack.base.places);assert.strictEqual(live.place_hierarchy,pack.base.place_hierarchy);
 assert.strictEqual(S.effectiveBase(pack.base,{source_sha256:'different'}).source_sha256,'different');
 const report=require('../reports/province-hierarchy-20261027.json');assert.equal(report.changes.length,31);
 console.log('PASS 31 reviewed links, map/network/export agreement, Jiangsu/Zhejiang/Zhili/Hunan/Hubei, old-package upgrade, manual preservation and idempotence');
})().catch(e=>{console.error(e);process.exitCode=1;});
