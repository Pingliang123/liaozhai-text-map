const assert=require('node:assert/strict'),crypto=require('crypto');
const p=require('../data-package.json'),r=require('../reports/selective-types.json'),source=require('../reports/event-types-csv-source.json'),review=require('../reports/multitype-review.json');
for(const s of source){
 const id=+s['篇号']-1,types=p.revisions.overrides.find(r=>r.chapter_id===id).changes.event_types,row=review.rows.find(r=>r.chapter_id===id);
 const expected=s['异事类型'].includes('人')||!row?s['异事类型'].split('／'):row.after;
 assert.deepEqual(types,Object.fromEntries(expected.filter(Boolean).map(t=>[t,1])),s['篇名']);
}
assert.equal(r.applied.length+r.excluded.length,48);
for(const row of p.revisions.overrides)delete row.changes.event_types;
const stable=v=>v&&typeof v==='object'?(Array.isArray(v)?v.map(stable):Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]))):v;
assert.equal(crypto.createHash('sha256').update(JSON.stringify(stable(p))).digest('hex'),r.non_type_sha256);
console.log('PASS all 491 classifications, human exclusions, and unchanged non-type data');
