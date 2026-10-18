const assert=require('assert/strict'),B=require('../assets/research-lab/vocabulary-network'),A=require('../assets/research-lab/network-analysis');
const c=(id)=>({id,title:'篇'+id,places:['济南'],spaces:['寺','室'],people:[{word:'宋公'},{word:'公'}],times:['一日'],units:[{id:0,text:'一日宋公入寺。'},{id:1,text:'宋公在寺。'},{id:2,text:'济南有室。'}]});
const unit=B.build([c(0),c(1)]),chapter=B.build([c(0),c(1)],'chapter');
assert(!unit.nodes.some(n=>n.label==='公'));assert.equal(unit.nodes.filter(n=>n.label==='宋公').length,2);assert.equal(unit.nodes.filter(n=>n.label==='寺').length,1);assert(unit.nodes.some(n=>n.kind==='time'));
const pair=(g,a,b)=>g.edges.find(e=>[e.source,e.target].includes(a)&&[e.source,e.target].includes(b));
assert.equal(pair(unit,'person:0:宋公','space:寺').weight,2);assert.equal(pair(chapter,'person:0:宋公','space:寺').weight,1);assert(!pair(unit,'place:济南','space:寺'));assert.equal(pair(chapter,'place:济南','space:寺').weight,2);assert(pair(unit,'time:一日','space:寺').evidence.every(e=>e.text.includes('一日')&&e.text.includes('寺')));
const data=require('../assets/research-lab/data.json'),times=require('../assets/research-lab/time-terms.json'),cs=data.chapters.map(c=>({...c,times:times[c.id]}));
assert.equal(Object.keys(times).length,491);for(const mode of ['unit','chapter']){const g=B.build(cs,mode),ids=new Set(g.nodes.map(n=>n.id));assert(g.edges.every(e=>e.weight===e.evidence.length&&ids.has(e.source)&&ids.has(e.target)));const start=Date.now(),groups=A.communities(g);assert.equal(Object.keys(groups).length,g.nodes.length);console.log(mode,g.nodes.length,g.edges.length,'edges; groups',new Set(Object.values(groups)).size,'in',Date.now()-start,'ms');}
console.log('PASS lexical weights, scope separation, longest matches, people identity, time coverage and whole-corpus grouping');
