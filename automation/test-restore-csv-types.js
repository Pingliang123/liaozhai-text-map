const assert=require('node:assert/strict'),fs=require('fs'),crypto=require('crypto');
const p=require('../data-package.json'),source=require('../reports/event-types-csv-source.json'),report=require('../reports/restore-csv-types.json');
const stable=v=>v&&typeof v==='object'?(Array.isArray(v)?v.map(stable):Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]))):v;
for(const r of source){
 const saved=p.revisions.overrides.find(x=>x.chapter_id===+r['篇号']-1);
 assert.deepEqual(saved.changes.event_types,Object.fromEntries(r['异事类型'].split('／').filter(Boolean).map(t=>[t,1])));
}
assert.equal(source.length,491);assert.equal(report.restored,48);
assert.deepEqual(p.revisions,JSON.parse(fs.readFileSync('manual-revisions.json','utf8')));
for(const r of p.revisions.overrides)delete r.changes.event_types;
assert.equal(crypto.createHash('sha256').update(JSON.stringify(stable(p))).digest('hex'),report.non_type_sha256);
console.log('PASS all 491 CSV classifications restored, 48 changes reverted, all other saved data preserved');
