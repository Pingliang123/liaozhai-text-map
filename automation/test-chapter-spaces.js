'use strict';
const assert=require('node:assert/strict'),C=require('../assets/research-lab/chapter-spaces');
const chapter={id:0,title:'甲',places:['济南','青州'],spaces:['寺','室','野'],people:[],units:[{id:0,text:'至济南，宿寺。'},{id:1,text:'至青州，入室。'},{id:2,text:'昔年闻说野有鬼。'}],steps:[]};
const before=JSON.stringify(chapter),g=C.build(chapter);
assert(g.nodes.some(n=>n.id==='space:野'&&n.degree===0),'Unattributed space is visible');
assert(g.edges.some(e=>e.source==='place:济南'&&e.target==='space:寺'));
assert(!g.edges.some(e=>e.source==='place:济南'&&e.target==='space:室'),'No chapter-wide Cartesian attribution');
const other=C.build({...chapter,id:1,title:'乙',realm_evidence:[{id:'r',realm:'地界',space:'地府',excerpt:'地府',unit:3}]});
assert(other.nodes.some(n=>n.realm==='otherworld'&&n.label==='地府'));
assert.equal(other.nodes.filter(n=>n.label==='地府').length,1,'Otherworld appears once, not as duplicate place and space nodes');
assert(other.edges.every(e=>e.evidence.every(r=>r.chapterId===1)));
assert.equal(JSON.stringify(chapter),before,'Graph never writes annotations');
const pack=require('../data-package.json'),M=require('./ghost_map_model'),D=require('../assets/research-lab/current-data');
const m=M.create(pack.base);m.importDocument(pack.revisions);
for(const c of D.snapshot(m)){const graph=C.build(c),ids=new Set(graph.nodes.map(n=>n.id));assert.equal(ids.size,graph.nodes.length);for(const e of graph.edges){assert(ids.has(e.source)&&ids.has(e.target));assert(e.evidence.every(r=>r.chapterId===c.id));}}
console.log('PASS all chapter spatial graphs, source attribution, otherworlds and unchanged manual data');
const journey=C.build({...chapter,units:[{id:0,text:'甲至乙。乙还甲。甲复至乙。'}],route_steps:[{from_space:'甲',to_space:'乙',transition_kind:'movement',quote:'甲至乙。',actors:'张生',index:0},{from_space:'乙',to_space:'甲',transition_kind:'movement',quote:'乙还甲。',actors:'张生',index:1},{from_space:'甲',to_space:'乙',transition_kind:'movement',quote:'甲复至乙。',actors:'张生',index:2}]});
assert.deepEqual(journey.itinerary.map(s=>[s.order,s.from,s.to]),[[1,'甲','乙'],[2,'乙','甲'],[3,'甲','乙']],'往返次序不可因边合并丢失');
assert.deepEqual(journey.edges.find(e=>e.directed&&e.source==='scene:甲').evidence.map(e=>e.sequence),[1,3]);
for(const word of ['都','京','京师','燕都']){assert.equal(m.placeName(word),'顺天');assert(!m.places().some(p=>p.name===word));}
const capital=m.places().find(p=>p.name==='顺天');assert(capital.merged_names.includes('都'));assert(capital.merged_names.includes('京'));
console.log('PASS ordered return visits, numbered edges, capital aliases and original forms');
for(const chapter of D.snapshot(m)){
 const graph=C.build(chapter),layout=C.ordered(graph);
 assert.equal(layout.edges.length,graph.itinerary.length,'每条移动保留单独有向边：'+chapter.title);
 assert.equal(layout.nodes.length,graph.itinerary.length*2);
 assert.equal(new Set(layout.nodes.map(n=>n.id)).size,layout.nodes.length,'重访地点使用独立访问节点');
 layout.rows.forEach((r,i)=>{assert.equal(r.order,i+1);assert.equal(r.quote,graph.itinerary[i].quote);assert.equal(r.fromNode.y,r.toNode.y);assert(r.toNode.x>r.fromNode.x);if(i)assert(r.y>=layout.rows[i-1].y+layout.rows[i-1].height);});
}
const ordered=C.ordered(journey);assert.equal(ordered.edges.length,3);assert.equal(ordered.nodes.filter(n=>n.label==='甲').length,3,'往返重访不折叠成一团');
console.log('PASS 全491篇：直接按步骤布局、方向、重复访问、原文证据与无重叠行');
