'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const {parseCsv}=require('./audit-exported-spaces'),M=require('./ghost_map_model'),R=require('../assets/spatial-routes');
const pack=require('../data-package.json'),model=M.create(pack.base);model.importDocument(pack.revisions);
const [header,...changes]=parseCsv(fs.readFileSync('reports/空欄復核_所在地補充修改記錄.csv','utf8'));
assert.ok(changes.length>0);
for(const row of changes){
 const [number,title,step,field,oldValue,value,quote,evidence]=row;
 assert.equal(oldValue,'','只补空白');assert.ok(Number(number)>3,'前三篇人工核读保留');
 const c=model.view(Number(number)-1);assert.equal(title,c.chapter);
 assert.ok(evidence.length>0);assert.ok(quote.length>0);
 if(field.endsWith('所在地点')){
  assert.ok(c.places.some(p=>p.word===value),title+' 地点词分类');
  assert.ok(c.source_units.some(u=>u.text.includes(value)),title+' 全文地点');
  assert.ok(R.lexicon(c).words.has(value),title+' 分词地点');
 }else assert.ok(['人间','天界','地界'].includes(value),field);
}
console.log('PASS 补空清单、原文地点、分词地点与世界分类');
