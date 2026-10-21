const assert=require('node:assert/strict'),H=require('../assets/research-lab/hierarchy-network');
const records={山东:{id:'p1',name:'山东',level:'province'},江苏:{id:'p2',name:'江苏',level:'province'},济南:{id:'c1',name:'济南',level:'county',belongs_to:[{target:'p1',map_current:true},{target:'p1',reference_year:1820}]},金陵:{id:'c2',name:'金陵',level:'county',belongs_to:[{target:'p2',map_current:true},{target:'p1',valid_from:1000,valid_to:1100},{target:'p2',reference_year:1820}]}};
const g={nodes:['济南','金陵'].map(label=>({id:'place:'+label,label,kind:'place'})),edges:[{source:'place:济南',target:'place:金陵',weight:2,evidence:[{chapter:'甲',text:'原文'}]}]};const saved=JSON.stringify(g);
const p=H.project(g,records,'province');assert.equal(p.edges.length,1);assert.equal(p.edges[0].source,'place:山东');assert.equal(p.edges[0].target,'place:江苏');assert.equal(p.edges[0].original_edges[0].source,'place:济南');assert.equal(JSON.stringify(g),saved);
const old=H.project(g,records,'province',1050);assert.equal(old.edges.length,0);assert.equal(old.projection.unresolved,1);
assert.equal(H.project(g,records,'province',1820).edges.length,1);assert(!H.active({reference_year:1820},1800));assert(H.active({valid_from:1000,valid_to:1100},1050));assert(!H.active({reference_year:null},1050));
const internal=H.project({...g,edges:[{...g.edges[0],target:g.edges[0].source}]},records,'province');assert.equal(internal.internal_edges.length,1);assert.equal(internal.internal_edges[0].weight,2);
console.log('PASS descendant projection, evidence provenance, reference years, period bounds, internal links and immutable graph');
