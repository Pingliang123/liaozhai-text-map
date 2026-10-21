const assert=require('node:assert/strict'),fs=require('fs'),{plan}=require('./resolve-unmapped-regions');
const p=JSON.parse(fs.readFileSync('data-package.json')),d=JSON.parse(fs.readFileSync('manual-revisions.json')),saved=JSON.stringify(d),a=plan(p,d);assert.equal(JSON.stringify(d),saved);assert.equal(a.locations.length,0,'重复运行不得覆盖已保存定位');
const report=JSON.parse(fs.readFileSync('reports/unmapped-region-review-20261021.json'));assert(report.manual_chapters_unchanged);assert(report.checked>0);for(const r of report.rows.filter(r=>r.location)){assert(Number.isFinite(r.location.lon));assert(r.location.source_url);assert(r.evidence.length);}
const r=report.rows.find(r=>r.word==='淄邑');if(r?.location){const target=p.base.places.find(x=>x.name==='淄川');assert.equal(r.location.lon,target.lon);assert.equal(r.location.lat,target.lat);assert.equal(r.target,'淄川');}
console.log('PASS protected manual chapters, sourced coordinates, original evidence, shared reference and idempotence');
