const assert=require('assert/strict'),P=require('../assets/research-lab/place-spaces');
const c={id:0,title:'甲',places:['济南','青州','金陵','孤名'],spaces:['寺','室','院'],people:[{word:'王生'}],units:[{id:0,text:'王生，青州人。'},{id:1,text:'如济南，宿寺。'},{id:2,text:'入室见客。'},{id:3,text:'至金陵，游院。'},{id:4,text:'青州人又言寺。'}],steps:[]};
const original=JSON.stringify(c),g=P.build([c,{...c,id:1,title:'乙'}]),pp=g.places,ps=g.spaces,edge=(p,s)=>ps.edges.find(e=>e.source==='place:'+p&&e.target==='space:'+s);
assert.equal(pp.nodes.length,4);assert(pp.nodes.some(n=>n.label==='孤名'&&n.degree===0),'Isolated recorded places remain in the one global graph');assert.equal(pp.edges.length,3);assert(pp.edges.every(e=>e.weight===2&&!e.directed));
assert.equal(edge('济南','寺').weight,2);assert.equal(edge('济南','室').evidence[0].assignment,'context');assert.equal(edge('金陵','院').evidence[0].assignment,'explicit');
assert(!edge('青州','寺'),'Origin does not establish scene location');assert(!edge('济南','院'),'Do not connect every space in the chapter to every place');assert(g.pending.some(r=>r.unit===4));
assert.deepEqual(edge('济南','寺').evidence[0].actors,[],'Do not assign all chapter characters to every connection');assert.equal(JSON.stringify(c),original);
assert.deepEqual(P.hits('济南府', ['济南','济南府']).map(x=>x.word),['济南府']);
const real=P.build(require('../assets/research-lab/data.json').chapters);assert(real.places.nodes.length>700);assert(real.places.nodes.every(n=>n.kind==='place'));assert(real.spaces.edges.every(e=>e.source.startsWith('place:')&&e.target.startsWith('space:')));console.log('PASS one global place graph, isolates, chapter weights, contextual attribution, origin/scene boundary and traceable evidence');
