'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');
const Routes=require('../assets/spatial-routes'),M=require('./ghost_map_model'),D=require('../assets/research-lab/current-data'),Y=require('../assets/research-lab/yi-network'),C=require('../assets/research-lab/chapter-spaces');
const html=fs.readFileSync('index.html','utf8'),context={GhostSpatialRoutes:Routes};vm.createContext(context);
const script=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]).find(s=>s.includes('else root.GhostMapNarrative=api'));
vm.runInContext(script,context);const N=context.GhostMapNarrative;
const pack=require('../data-package.json'),model=M.create(pack.base);model.importDocument(pack.revisions);
const before=JSON.stringify(model.document()),chapters=D.snapshot(model),places=model.places(),keys=[];
for(const c of chapters){
 const map=N.rows(model,[model.view(c.id)],places),lab=c.route_steps;
 assert.deepEqual(map.map(r=>[r.index,r.source_indices,r.from_space,r.to_space,r.from?.id||null,r.to?.id||null,r.source_valid]),lab.map(r=>[r.index,r.source_indices,r.from_space,r.to_space,r.from?.id||null,r.to?.id||null,r.source_valid]),c.title+'两端、方向与步骤必须一致');
 const graph=C.build(c);
 for(const r of map.filter(r=>r.transition_kind==='movement'&&r.source_valid&&r.from_space&&r.to_space&&r.from_space!==r.to_space)){
  assert(graph.edges.some(e=>e.directed&&e.evidence.some(q=>q.source_indices?.includes(r.index))),c.title+'空间图漏掉移动');
  if(r.from&&r.to&&r.from.id!==r.to.id)keys.push(JSON.stringify([c.id,r.index,r.from.name,r.to.name]));
 }
}
const network=Y.build(chapters),actual=network.movement.edges.flatMap(e=>e.evidence.map(r=>JSON.stringify([r.chapterId,r.source_indices[0],e.source.slice(6),e.target.slice(6)])));
assert.deepEqual(actual.sort(),keys.sort(),'全书地理移动网络必须与地图逐条相同');
const c=chapters.find(c=>c.title==='王十');assert.equal(c.route_steps.filter(r=>r.from_space==='官署'&&r.to_space==='奈河边').length,1);
assert.equal(JSON.stringify(model.document()),before,'保留全部人工修订');
const fakePlaces=[{id:'j',name:'济南'},{id:'n',name:'金陵'}];
assert.equal(Routes.endpoint('未至金陵',null,fakePlaces),null,'禁止子串误绑');
assert.equal(Routes.endpoint('济南寺',null,fakePlaces).id,'j');
assert.equal(Routes.endpoint('室','n',fakePlaces).id,'n','保留人工端点绑定');
const source={units:[{text:'王生自济南至金陵。'}],steps:[{kind:'movement',from:'济南',to:'金陵',quote:'不存在',unit:1}]};
assert.equal(Routes.project(source,fakePlaces)[0].source_valid,false);
console.log('PASS 全书 '+chapters.length+'篇：地图/空间图/移动网络一致；'+keys.length+'条跨地点路线；人工修订未改变');
