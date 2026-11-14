const test=require('node:test'),a=require('node:assert/strict');
const r=require('../reports/chapter-spatial-types-visualization.json'),s=require('../reports/spatial-topics-five-results.json');
test('all modeled chapters retain probabilities and reproducible PCA coordinates',()=>{
 a.equal(r.points.length,443);a.equal(new Set(r.points.map(p=>p.id)).size,443);
 for(const p of r.points){a.deepEqual(p.weights,s.chapter_topics.find(c=>c.id===p.id).weights);for(let k=0;k<2;k++){const v=p.weights.reduce((n,w,i)=>n+(w-r.mean[i])*r.components[k][i],0);a.ok(Math.abs(v-p[k?'y':'x'])<1e-8);}a.ok(p.events.every(e=>Object.hasOwn(r.colors,e)));}
 a.deepEqual(r.unassigned,s.input.empty_documents);
 a.ok(r.explained_variance_ratio.reduce((a,b)=>a+b,0)<=1.00000001);
});
