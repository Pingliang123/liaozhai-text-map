'use strict';
const fs=require('node:fs'),M=require('./ghost_map_model'),A=require('./audit-spatial-integrity'),D=require('../assets/research-lab/current-data');
const unsafe=new Set('胡田村 酒数厅 构庐 游廛 浮家泛宅 俱入室 人宅'.split(' '));
function apply(){const pkg=JSON.parse(fs.readFileSync('data-package.json','utf8')),before=JSON.parse(fs.readFileSync('manual-revisions.json','utf8')),doc=structuredClone(before),model=M.create(pkg.base);model.importDocument(before);const snapshot=D.snapshot(model),audit=A.review({...pkg,revisions:before}).report,changes=[];
 for(const x of audit.omissions){const c=model.view(x.chapter_id),review=x.protected_review,full=[...new Set(x.evidence.flatMap(e=>e.containing))];
  if(review?.note!=='附件空间叙事框架审核通过；保留原文词形，纳入空间词。'||!full.length||!full.every(w=>c.space_words.includes(w)&&!unsafe.has(w)))continue;
  const row=doc.overrides.find(r=>r.chapter_id===x.chapter_id);row.changes.space_words=row.changes.space_words.filter(w=>w!==x.word);row.changes.lexical_reviews['spaces:'+x.word]={status:'corrected',word:full[0],kind:'spaces',note:'完整词项已在本篇标注，清理未独立成词的重复子词；保留：'+full.join('、')+'。'};
  changes.push({...x,replacement_terms:full,action:'保留既有完整空间词，移除重复子词标注'});
 }
 const next=M.create(pkg.base);next.importDocument(doc);const after=D.snapshot(next);for(const c of snapshot){const n=after.find(x=>x.id===c.id);if(JSON.stringify(c.spaces)!==JSON.stringify(n.spaces))throw Error('Graph vocabulary changed '+c.title);}
 const report={source_sha256:pkg.base.source_sha256,changes,summary:{changed_annotations:changes.length,changed_chapters:new Set(changes.map(x=>x.chapter_id)).size,graph_space_vocabulary_unchanged:true,remaining_omissions:after.reduce((n,c)=>n+c.lexical_omissions.filter(x=>x.kind==='space').length,0)}};
 fs.writeFileSync('manual-revisions.json',JSON.stringify(doc));fs.writeFileSync('reports/spatial-compound-consolidation-20261102.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report.summary));return report;}
if(require.main===module)apply();module.exports={apply};
