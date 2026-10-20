'use strict';
const fs=require('fs'),cp=require('child_process');
const before=JSON.parse(cp.execFileSync('git',['show','HEAD:manual-revisions.json'],{maxBuffer:50000000})),after=JSON.parse(fs.readFileSync('manual-revisions.json')),rows=[];
const chapters=require('../data-package.json').base.chapter_overview;
for(const o of after.overrides){const prev=before.overrides.find(x=>x.chapter_id===o.chapter_id);if(!prev)continue;
 for(const p of prev.changes.places||[])if(!(o.changes.places||[]).some(q=>q.word===p.word)&&o.changes.space_words?.includes(p.word))rows.push({chapter_id:o.chapter_id,chapter:chapters.find(c=>c.chapter_id===o.chapter_id).chapter,word:p.word});
 for(const [key,value]of Object.entries(prev.changes.lexical_reviews||{}))if(['accepted','corrected','rejected'].includes(value.status)&&JSON.stringify(value)!==JSON.stringify(o.changes.lexical_reviews?.[key]))throw Error('明确审核被改写：'+o.chapter_id+' '+key);
}
fs.writeFileSync('reports/relative-space-applied-20261020.md','# 相对空间分类调整\n\n本轮将'+rows.length+'条篇内地点记录改为空间词；保留原文、分词用字和所有明确的词语审核记录。\n\n'+rows.map(r=>'- 《'+r.chapter+'》：'+r.word).join('\n')+'\n');console.log('Applied '+rows.length+' relative-space transfers; explicit lexical decisions unchanged');
