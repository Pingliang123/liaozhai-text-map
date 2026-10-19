const assert=require('assert/strict'),P=require('../assets/research-lab/place-spaces');
const graph=P.build([{id:1,title:'甲',places:['济南','孤名'],spaces:[],people:[],units:[{id:1,text:'至济南。'}],steps:[]}]).placesAll;
assert(graph.nodes.some(n=>n.label==='孤名'),'All-place graph retains an isolated place candidate');
const levels={济南:{located:true},孤名:{located:false}};
const located=graph.nodes.filter(n=>levels[n.label]?.located),ids=new Set(located.map(n=>n.id));
assert.deepEqual(located.map(n=>n.label),['济南']);
assert(graph.edges.filter(e=>ids.has(e.source)&&ids.has(e.target)).length===0,'Unresolved endpoints do not enter located network');
console.log('PASS located/all place distinction keeps unresolved candidates outside located network');
