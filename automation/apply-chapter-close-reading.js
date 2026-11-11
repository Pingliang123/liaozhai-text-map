'use strict';
const C = require('../assets/path-columns');
const R = require('../assets/spatial-routes');
const document = require('./chapter-space-close-reading.json');
function applyCloseReading(values, row, chapter) {
 const unit = Number(row.source_event?.unit);
 const matches = document.reviews.filter(review => review.chapter_id === row.chapter_id && unit >= review.unit_start && unit <= review.unit_end);
 if(!matches.length)return false;
 if(matches.length !== 1)throw new Error('逐篇核读规则重叠');
 const review = matches[0], lex = R.lexicon(chapter), units = chapter.source_units || [];
 const at = name => C.headers.indexOf(name), source = units.map(u=>u.text).join('');
 for(const [role,key] of [['出发','from'],['到达','to'],['停留','stay']]) {
  const entry = review.roles[key];
  for(const suffix of ['空间','使用方式','空间所在地点','世界分类'])values[at(role+suffix)]='';
  if(!entry)continue;
  for(const word of entry.space.split('、'))if(!source.includes(word)||!lex.words.has(word))throw new Error('核读空间词未通过本篇原文分词校验：'+chapter.chapter+' '+word);
  if(entry.place&&!chapter.places.some(p=>p.word===entry.place))throw new Error('核读所在地不是本篇地点词');
  if(!['人间','天界','地界'].includes(entry.realm))throw new Error('核读三界值错误');
  values[at(role+'空间')]=entry.space;values[at(role+'使用方式')]=entry.access;
  values[at(role+'空间所在地点')]=entry.place;values[at(role+'世界分类')]=entry.realm;
 }
 const from=review.roles.from?.space,to=review.roles.to?.space,stay=review.roles.stay?.space;
 values[at('场景')]=from&&to?from+' → '+to:stay||to||from||'';
 values[at('步骤类型')]=review.type;
 const evidence=review.evidence_units.map(id=>{
  const found=units.find(u=>u.unit===id);if(!found)throw new Error('核读原文单元不存在');
  return '单元'+id+'「'+found.text+'」';
 });
 values[at('分类依据')]='逐篇全文核读。'+review.reason;
 values[at('双端证据')]=evidence.join('；');
 return true;
}
module.exports={applyCloseReading,reviewedChapters:document.reviewed_chapters};
