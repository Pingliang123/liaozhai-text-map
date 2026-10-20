const assert=require('assert/strict');
const P=require('../assets/research-lab/place-spaces');

const chapter={
  id:7,
  title:'异境测试',
  places:['济南'],
  spaces:['室'],
  reviews:{},
  units:[{id:1,text:'济南人入室，后诉之冥府。'}],
  steps:[],
  realm_evidence:[{id:'e-1',realm:'地界',space:'冥府',unit:1,excerpt:'后诉之冥府。'}],
  evidence_review:{}
};

const baseline=P.build([chapter]);
assert(!baseline.placesAll.nodes.some(n=>n.label==='冥府'),'默认网络不应自动加入异境节点');
assert(!baseline.spaces.nodes.some(n=>n.label==='冥府'),'默认地点—空间网络不应自动加入异境节点');

const graph=P.build([chapter],{includeOtherworld:true});
const other=graph.placesAll.nodes.find(n=>n.label==='冥府');
assert(other,'开启异境视图后应保留异境节点');
assert.equal(other.realm,'otherworld');
assert.equal(other.otherworldRealm,'地界');
const placeEdge=graph.placesAll.edges.find(e=>e.source==='place:济南'&&e.target==='place:冥府');
assert(placeEdge,'异境应与同篇人间地点建立关联');
assert.equal(placeEdge.evidence[0].text,'后诉之冥府。');
const spaceNode=graph.spaces.nodes.find(n=>n.id==='space:冥府');
assert(spaceNode,'异境空间应出现在地点—空间网络');
assert.equal(spaceNode.realm,'otherworld');
const spaceEdge=graph.spaces.edges.find(e=>e.source==='place:济南'&&e.target==='space:冥府');
assert(spaceEdge,'地点—异境空间应保留证据线');
assert.equal(spaceEdge.evidence[0].assignment,'otherworld');
console.log('PASS otherworld evidence is opt-in, connected, colored, and source-backed');
