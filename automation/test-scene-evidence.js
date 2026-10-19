const assert=require('assert/strict');
const P=require('../assets/research-lab/place-spaces');
const chapter={id:1,title:'场景',places:['济南','金陵'],spaces:['寺','室','院'],people:[],steps:[],units:[{id:0,text:'至济南，宿寺。'},{id:1,text:'入室见客。'},{id:2,text:'欲赴金陵，见院。'},{id:3,text:'入室。'}]};
const before=JSON.stringify(chapter),g=P.build([chapter]);
assert(!g.spaces.edges.some(e=>e.source==='place:金陵'));
assert(g.pending.some(r=>r.unit===2)&&g.pending.some(r=>r.unit===3));
const direct=P.spaceView(g.spaces,'place:济南',false);
assert.equal(direct.edges.length,1);assert.equal(direct.edges[0].target,'space:寺');
assert.equal(P.spaceView(g.spaces,'place:济南',false,true).edges.length,2);
assert.equal(P.spaceView(g.spaces,'space:室',true).edges.length,0);
const shifted=P.build([{...chapter,units:chapter.units.map(u=>({...u,id:u.id+10}))}]);
assert.equal(g.spaces.edges[0].evidence[0].evidenceId,shifted.spaces.edges[0].evidence[0].evidenceId);
assert.equal(g.spaces.edges[0].evidence[0].quote,chapter.units[0].text);
for(const text of ['梦见金陵，入室。','听说至金陵有寺。','未至金陵，宿寺。','客曰：“至金陵，宿寺。”']){
 const result=P.build([{...chapter,units:[chapter.units[0],{id:1,text},{id:2,text:'入室。'}]}]);
 assert(!result.spaces.edges.some(e=>e.source==='place:金陵'));
 assert(result.pending.some(r=>r.unit===2));
}
const mixed={nodes:g.spaces.nodes,edges:[{source:'place:济南',target:'space:室',weight:2,evidence:[{chapterId:1,assignment:'context'},{chapterId:2,assignment:'explicit'}]}]};
assert.equal(P.spaceView(mixed,'place:济南',false).edges[0].weight,1);
assert.equal(JSON.stringify(chapter),before);
console.log('PASS conservative scene assignment, evidence identity, filtered weights and immutable annotations');
