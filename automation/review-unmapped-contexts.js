'use strict';
const fs=require('fs'),M=require('./ghost_map_model');
const spaces=new Set('衡府 贝勒府 仪宾府 青帝庙 相公祠 兴福寺 朝天观 水月寺 圣庙 琉璃厂 大佛寺 庙 城隍庙 西村 大士祠 寺 殡宫 大佛阁 兰若 郭岳庙 义虎祠 绰然堂 安乐乡 醴泉寺 村寺 普陀寺 城隍祠 蛇佛寺 山神祠 岳庙 黑帝祠 肃府 后宰门 野寺 梅姑祠 蒙山寺 铜雀 晋邸 红桥 姚巷 阜城门 天宁寺 李皇亲园 皇亲园 梅花馆 报国寺 梓潼祠 金沙寺 玄帝观 郡狱 吴王庙 外洋 左车祠 雹神李左车祠 关圣祠 祠 平康巷 下清宫 关帝庙 世家园 竹桥 江村 大圣祠 郡庠 勾栏'.split(' '));
function review(pack,doc,audit){
 const m=M.create(pack.base);m.importDocument(doc);const rows=[];
 for(const d of audit.decisions){const row={word:d.word,model_suggestion:d,occurrences:[],status:'retained',reason:'地理对应仍须外部证据；模型分数不作为定论'};rows.push(row);
 for(const id of m.ids){const c=m.view(id);if(!c.places.some(p=>p.word===d.word))continue;const quotes=c.source_units.filter(u=>u.text.includes(d.word)).map(u=>({unit:u.unit,text:u.text}));const entry={chapter_id:id,chapter:c.chapter,quotes};row.occurrences.push(entry);const input=m.editable(id),review=input.lexical_reviews?.['places:'+d.word];
 if(review&&['accepted','corrected','rejected'].includes(review.status)){entry.action='保留逐词人工修订';continue;}
 if(!spaces.has(d.word)){entry.action='保留原分类';continue;}
 if(!quotes.length){entry.action='缺少原文匹配';continue;}
 input.places=input.places.filter(p=>p.word!==d.word);if(!input.space_words.includes(d.word))input.space_words.push(d.word);
 input.lexical_reviews={...input.lexical_reviews,['places:'+d.word]:{status:'corrected',word:d.word,kind:'spaces',note:'逐句核对：建筑、场所或相对空间；定位是否明确不影响空间词分类。'}};
 m.save(id,input);entry.action='地点词 → 空间词';row.status='changed';row.reason='原文所指为建筑、场所或相对空间';
 }
 if(!row.occurrences.length){row.status='already-processed';row.reason='当前地点词表无该词';}
 }
 return {revisions:m.document(),rows};
}
if(require.main===module){const pack=require('../data-package.json'),doc=require('../manual-revisions.json'),audit=require('../reports/deepseek-unmapped-20261021.json');const result=review(pack,doc,audit);result.before=doc;fs.writeFileSync('reports/unmapped-context-review.json',JSON.stringify(result,null,2));fs.writeFileSync('manual-revisions.json',JSON.stringify(result.revisions));console.log(JSON.stringify({checked:result.rows.length,changed:result.rows.filter(r=>r.status==='changed').map(r=>r.word)}));}
module.exports={review};
