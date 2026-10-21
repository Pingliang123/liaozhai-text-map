const assert=require('assert/strict'),{apply}=require('./complete-reviewed-aliases'),p=require('../data-package.json'),d=require('../manual-revisions.json'),r=require('../reports/reviewed-alias-completion.json');
// Test the classifier against its recorded input, not against later human edits.
const replay=apply(p,{...d,place_locations:r.before_locations}).revisions;
for(const old of r.before_locations)assert.deepEqual(replay.place_locations.find(x=>x.name===old.name),old);
for(const row of r.changes){const loc=d.place_locations.find(x=>x.name===row.word);assert(loc&&loc.coordinate_kind==='approximate'&&loc.source_url);assert(row.evidence.every(e=>e.quotes.some(q=>q.includes(row.word))));assert(p.base.places.some(x=>x.name===row.word));}
assert(d.place_locations.find(x=>x.name==='蔡店').parent_id==='place-阳信');
assert(!apply(p,d).changes.length);console.log('PASS evidence-backed aliases, village containment, original locations preserved and idempotence');
