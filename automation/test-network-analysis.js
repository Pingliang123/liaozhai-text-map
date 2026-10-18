const assert=require('assert/strict'),A=require('../assets/research-lab/network-analysis');
const graph={nodes:['a','b','c','d'].map(id=>({id})),edges:[{source:'a',target:'b'},{source:'b',target:'c'}]};
assert.deepEqual(A.components(graph),[3,1]);assert.deepEqual(A.components(graph,'b'),[1,1,1]);assert.deepEqual(A.components({nodes:[],edges:[]}),[]);
const cs=[{id:1,title:'甲',places:['济南'],spaces:['寺','室']},{id:2,title:'乙',places:['济南'],spaces:['寺','室']},{id:3,title:'丙',places:['青州'],spaces:['寺']}];
assert.equal(A.compare(cs,1)[0].score,1);assert.equal(A.compare(cs,1)[0].id,2);assert.equal(A.compare(cs,1,'place').length,1);assert.equal(A.compare(cs,1,'space').length,2);assert.deepEqual(A.compare(cs,'missing'),[]);
console.log('PASS components, removed bridge, weighted similarity and category filtering');
