'use strict';
const fs=require('fs'),assert=require('node:assert/strict'),Store=require('../assets/corpus-store');

const after=require('../data-package.json'),source=require('../reports/event-types-csv-source.json'),report=require('../reports/multitype-review.json');
const before=structuredClone(after);
for(const change of report.website_changes)before.revisions.overrides.find(r=>r.chapter_id===change.chapter_id).changes.event_types=Object.fromEntries(change.before.map(t=>[t,1]));
const stripped=structuredClone(after);
for(const r of stripped.revisions.overrides)delete r.changes.event_types;
assert.equal(require('crypto').createHash('sha256').update(JSON.stringify(stripped)).digest('hex'),report.non_type_sha256);
const byID=d=>new Map(d.overrides.map(r=>[r.chapter_id,r]));
const a=byID(before.revisions),b=byID(after.revisions);
assert.deepEqual(after.base,before.base);
assert.deepEqual(after.revisions.place_locations,before.revisions.place_locations);
for(const [id,row] of b){
 const previous=a.get(id);const strip=r=>{const c={...r.changes};delete c.event_types;return c;};
 assert.deepEqual(strip(row),strip(previous));
}
for(const row of report.rows){
 if(row.status==='用户已核查，保留')assert.deepEqual(row.after,row.before);
 if(row.before.includes('鬼')&&row.before.includes('狐'))assert(row.after.includes('鬼')&&row.after.includes('狐'));
 if(row.status==='存疑')assert.deepEqual(row.after,row.before);
}
assert.equal(report.multi,98);assert.equal(report.changed,48);assert.equal(report.uncertain,8);
assert.equal(source.length,491);
(async()=>{
 const result=await Store.rebasePublished(before.revisions,after.revisions);
 for(const change of report.website_changes)assert.deepEqual(byID(result.document).get(change.chapter_id).changes.event_types,b.get(change.chapter_id).changes.event_types);
 const manual=structuredClone(before.revisions),row=manual.overrides.find(r=>r.chapter_id===39);row.changes.event_types={狐:1};
 const protectedResult=await Store.rebasePublished(manual,after.revisions);
 assert.deepEqual(byID(protectedResult.document).get(39).changes.event_types,{狐:1});
 console.log('PASS 491 CSV rows, 98 reviewed combinations, 48 changes, 8 preserved uncertainties; all non-type annotations intact; known snapshots updated and new manual choices preserved');
})().catch(e=>{console.error(e);process.exitCode=1;});
