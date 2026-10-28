'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),M=require('./ghost_map_model'),D=require('../assets/research-lab/current-data'),P=require('../assets/research-lab/place-spaces'),Merge=require('../assets/place-node-merges'),Routes=require('../assets/spatial-routes');
const pack=require('../data-package.json'),m=M.create(pack.base);m.importDocument(pack.revisions);
const old=M.create({...pack.base,place_node_aliases:{}});old.importDocument(pack.revisions);
assert.deepEqual(m.document(),old.document(),'所有人工修改与原定位记录完整保留');
for(const id of m.ids)assert.deepEqual(m.view(id),old.view(id),'原文、分词、词表不变');
const ps=m.places();assert.equal(new Set(ps.map(p=>p.name)).size,ps.length);
for(const [alias,target]of Object.entries(pack.base.place_node_aliases)){
 assert(!ps.some(p=>p.name===alias),alias+'应合并');assert(ps.some(p=>p.name===target));
 const p=ps.find(p=>p.name===target),expected=m.ids.filter(id=>{const c=m.view(id),tokens=Routes.lexicon(c).words;return c.places.some(w=>m.placeName(w.word)===target&&tokens.has(w.word));});assert.deepEqual(m.atPlace(p).map(c=>c.chapter_id),expected);
 const prior=old.places().find(p=>p.name===alias);if(prior)assert.equal(Routes.endpoint(alias,prior.id,ps,m)?.name,target,'旧地图绑定仍可使用');
}
for(const names of [['千佛山','济南府'],['蔡店','阳信'],['历城','济南府'],['蒙山','蒙阴']])assert(names.every(w=>ps.some(p=>p.name===w)),'上下级和共坐标地点保留');
const chapters=D.snapshot(m),graphs=P.build(chapters,{includeOtherworld:true});
for(const n of graphs.placesAll.nodes)assert.equal(Merge.canonical(n.label,pack.base.place_node_aliases),n.label,'网络只显示统一地名');
assert(graphs.placesAll.edges.every(e=>e.source!==e.target));
const g=Merge.graph({mode:'chapter',nodes:[{id:'place:汴',label:'汴',kind:'place'},{id:'place:开封',label:'开封',kind:'place'},{id:'place:济南',label:'济南',kind:'place'}],edges:[{source:'place:汴',target:'place:济南',weight:1,evidence:[{chapterId:1,text:'汴'}]},{source:'place:开封',target:'place:济南',weight:1,evidence:[{chapterId:1,text:'开封'}]},{source:'place:汴',target:'place:开封',weight:1,evidence:[{chapterId:1,text:'汴开封'}]}]},{汴:'开封'});
assert.equal(g.edges.length,1);assert.equal(g.edges[0].weight,1,'同篇异名不重复增加篇数');assert.equal(g.edges[0].evidence.length,2,'两种原文证据都保留');
assert.equal(JSON.stringify(require('../manual-revisions.json')),JSON.stringify(pack.revisions));
const html=fs.readFileSync('assets/research-lab/index.html','utf8');assert(html.indexOf('../place-node-merges.js')<html.indexOf('yi-network.js'));
const Store=require('../assets/corpus-store'),oldBase={...pack.base,place_node_aliases:{},custom:'保留'};
const installed=Store.effectiveBase(pack.base,oldBase);assert.equal(installed.custom,'保留');assert.deepEqual(installed.place_node_aliases,pack.base.place_node_aliases);assert.deepEqual(oldBase.place_node_aliases,{},'旧资料包不能原地改写');
assert(require('../assets/map-network-link').matchesPlace({value:'place-扬州',dataset:{placeName:'扬州',placeAliases:'["扬州","广陵"]'}},'广陵'),'旧地名网址仍找到合并节点');
assert(fs.readFileSync('assets/research-lab/book-network.js','utf8').includes('(n.original_names||[]).some(word=>word.includes(q))'),'网络检索同时检索原词');
console.log('PASS 21组29个异名合并；地图和网络同名；旧绑定、上下级、原文、人工修订均保留');
