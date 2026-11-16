const assert=require('node:assert/strict'),fs=require('fs'),crypto=require('crypto'),M=require('./ghost_map_model'),R=require('../assets/spatial-routes');
const d=require('../reports/最新五主題_類型對照.json'),raw=fs.readFileSync('.network-runtime/latest-live-package.json'),p=JSON.parse(raw),src=require('../.network-runtime/latest-place-space-input.json'),m=M.create(p.base);m.importDocument(p.revisions);
assert.equal(d.source_sha256,crypto.createHash('sha256').update(raw).digest('hex'));
assert.equal(d.points.length,471);assert.equal(d.unmodeled.length,20);assert.equal(d.topics.length,5);
assert.equal(d.topic_associations.length+d.group_associations.length,50);
for(const point of d.points){
 assert.equal(point.weights.length,5);assert(Math.abs(point.weights.reduce((a,b)=>a+b)-1)<1e-8);
 assert.deepEqual(point.events,src.chapters.find(c=>c.id===point.id).events);
 assert(Number.isFinite(point.x)&&Number.isFinite(point.y));
}
for(const row of d.group_associations){
 const yes=src.chapters.filter(c=>c.events.includes(row.type)),no=src.chapters.filter(c=>!c.events.includes(row.type));
 const hit=c=>c.space_words.some(w=>d.groups[row.group].includes(w));
 assert.equal(yes.filter(hit).length,row.inside);assert.equal(no.filter(hit).length,row.outside);
 assert.equal(row.inside_n,yes.length);assert.equal(row.outside_n,no.length);
}
for(const topic of d.topics)for(const r of topic.representatives){
 assert(r.tokens>=10&&r.evidence.length>0);
 const c=m.view(r.id),units=R.tokenUnits(c);
 for(const e of r.evidence){
  const i=c.source_units.findIndex(u=>u.unit===e.unit);assert(i>=0);assert.equal(e.quote,c.source_units[i].text||c.source_units[i].original);
  assert(e.matched.length>0);for(const word of e.matched)assert(units[i].includes(word));
 }
}
const tests=[...d.topic_associations,...d.group_associations],ordered=tests.slice().sort((a,b)=>a.p-b.p);let q=1;
for(let i=49;i>=0;i--){q=Math.min(q,ordered[i].p*50/(i+1));assert(Math.abs(q-ordered[i].q50)<1e-10);}
assert.equal(fs.readFileSync('data-package.json','utf8').length>0,true);
console.log('PASS source fingerprint, 471 projected and 20 omitted chapters, 50 BH tests, multilabel preservation, 25 representatives and exact segmented evidence');
