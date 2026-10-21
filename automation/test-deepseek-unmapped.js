const assert=require('node:assert/strict'),fs=require('fs'),{apply}=require('./apply-deepseek-unmapped');
const p=JSON.parse(fs.readFileSync('data-package.json')),d=JSON.parse(fs.readFileSync('manual-revisions.json')),a=JSON.parse(fs.readFileSync('reports/deepseek-unmapped-20261021.json')),r=JSON.parse(fs.readFileSync('reports/unmapped-changes-20261021.json'));
assert.equal(a.decisions.length,317);assert.equal(new Set(a.decisions.map(d=>d.word)).size,317);assert.equal(r.changed_words,r.changes.length);
assert.deepEqual([...a.batches.flat()].sort(),a.decisions.map(x=>x.word).sort(),'每个送审词均须有独立返回结果');
assert(a.decisions.some(x=>x.word==='顺天府'&&x.target_name==='顺天'));
assert(d.place_locations.some(x=>x.name==='顺天府'&&x.parent_id==='place-直隶'&&Number.isFinite(x.lon)),'已确认地名仍须补充定位');
assert(d.place_locations.some(x=>x.name==='阳信'&&x.parent_id==='place-武定府'&&Number.isFinite(x.lon)&&x.coordinate_kind==='approximate'),'已定位记录应使用有历史出处的上级；不能延用模型误写的济南府');
assert(d.overrides.find(x=>x.chapter_id===393).changes.lexical_reviews['places:顺天府'].status==='accepted','补定位不能覆盖用户词类判断');
for(const before of r.rollback.before_chapters){const after=d.overrides.find(x=>x.chapter_id===before.chapter_id);for(const key of ['event_types','years','people','narrative_events','realms_present'])assert.deepEqual(after.changes[key],before.changes[key]);}
for(const before of r.rollback.before_locations.filter(x=>x.name!=='阳信'))assert.deepEqual(d.place_locations.find(x=>x.name===before.name),before);
assert(!r.changes.some(x=>x.word==='永年'),'不能把广平县当广平府');
assert(r.changes.find(x=>x.word==='石坑庄').changes.some(c=>c.location),'具名村庄保留地点定位');
assert(r.changes.find(x=>x.word==='胶').changes.some(c=>c.location),'籍贯仍可作地名');
for(const row of r.changes)for(const c of row.changes)if(c.location){assert(Number.isFinite(c.location.lon)&&Number.isFinite(c.location.lat));assert(c.location.source_url);assert(c.location.coordinate_kind==='approximate');assert(p.base.places.some(x=>x.name===row.word),'定位须进入总地名登记表，恢复部分篇目备份时仍然有效');}
const before=JSON.stringify(d),rerun=apply(p,d,a);assert.equal(JSON.stringify(d),before);assert(!rerun.rows.some(r=>r.status==='changed'),'重复执行不得覆盖已保存修订');
console.log('PASS full model audit, source-backed references, manual data preservation, reviewed corrections and idempotent application');
