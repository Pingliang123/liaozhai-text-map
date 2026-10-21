const assert=require('assert/strict'),{review}=require('./review-unmapped-contexts');
const p=require('../data-package.json'),d=require('../manual-revisions.json'),a=require('../reports/deepseek-unmapped-20261021.json'),r=require('../reports/unmapped-context-review.json');
assert.equal(r.rows.length,317);
assert(r.rows.some(x=>x.word==='衡府'&&x.status==='changed'));
for(const old of r.before.overrides){const n=d.overrides.find(x=>x.chapter_id===old.chapter_id);for(const k of ['people','event_types','years','narrative_events','realms_present'])assert.deepEqual(n.changes[k],old.changes[k]);for(const [k,v]of Object.entries(old.changes.lexical_reviews||{}))if(['accepted','corrected','rejected'].includes(v.status))assert.deepEqual(n.changes.lexical_reviews[k],v);}
// Later location review may append newer, evidence-backed rows. The context
// classifier must preserve every location row that existed at its own input.
const currentLocations=new Map(review(p,r.before,a).revisions.place_locations.map(x=>[x.name,x]));
for(const old of r.before.place_locations) assert.deepEqual(currentLocations.get(old.name),old);
assert(!review(p,d,a).rows.some(x=>x.status==='changed'));
console.log('PASS per-occurrence protection, unchanged people/events/time/locations and idempotent classification');
