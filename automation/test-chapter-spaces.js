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
