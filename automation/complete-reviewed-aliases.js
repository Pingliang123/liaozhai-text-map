'use strict';
const fs=require('fs'),M=require('./ghost_map_model');
const aliases={陕右:'陕西',粤西:'广西',东粤:'广东',京师:'顺天',北平:'顺天',莱郡:'莱州',济郡:'济南府'};
const within={蔡店:'阳信',新城:'济南府',青城山:'成都'};
function apply(pack,doc){const m=M.create(pack.base);m.importDocument(doc);const changes=[],held=[];
 for(const [word,targetName]of Object.entries({...aliases,...within})){
  const existing=doc.place_locations.find(x=>x.name===word);if(existing&&Number.isFinite(existing.lon)&&Number.isFinite(existing.lat))continue;
  const target=m.places().find(p=>p.name===targetName);if(!target||!Number.isFinite(target.lon)||!Number.isFinite(target.lat)){held.push({word,reason:'参照地点无有效定位'});continue;}
  const evidence=m.ids.map(id=>m.view(id)).filter(c=>c.places.some(p=>p.word===word)).map(c=>({chapter_id:c.chapter_id,chapter:c.chapter,quotes:c.source_units.filter(u=>u.text.includes(word)).map(u=>u.text)}));if(!evidence.length)continue;
  const isWithin=word in within,level=word==='蔡店'?'village':word==='新城'?'county':word==='青城山'?'natural':target.admin_level;
  const location={name:word,admin_level:level,parent_id:isWithin?target.id:target.parent_id||null,modern_name:targetName+'区域参考',region_description:isWithin?`位于${targetName}区域内；采用区域参考点`:`与${targetName}同区的文本名称`,modern_level:'历史文本区域参考',coordinate_kind:'approximate',lon:target.lon,lat:target.lat,source_url:target.level_source_url||target.source_url,note:'根据原文籍贯、行旅或明确区域指称复核；此坐标为区域参考，不是独立精确位置。'};
  if(!location.source_url){held.push({word,reason:'参照地点缺少来源'});continue;}m.saveLocation(location);changes.push({word,target:targetName,relation:isWithin?'within-reference-region':'same-reference-area',location,evidence});
 }
 return {revisions:m.document(),changes,held};}
if(require.main===module){const pack=require('../data-package.json'),doc=require('../manual-revisions.json'),r=apply(pack,doc);pack.revisions=r.revisions;
 for(const x of r.changes)pack.base.place_equivalences=[...(pack.base.place_equivalences||[]).filter(e=>e.word!==x.word),{word:x.word,target:x.target,relation:x.relation,source:'原文逐条复核',note:x.location.region_description}];
 const m=M.create(pack.base);m.importDocument(r.revisions);for(const p of m.places())if(!pack.base.places.some(x=>x.name===p.name))pack.base.places.push(p);
 fs.writeFileSync('data-package.json',JSON.stringify(pack));fs.writeFileSync('manual-revisions.json',JSON.stringify(r.revisions));fs.writeFileSync('reports/reviewed-alias-completion.json',JSON.stringify({...r,revisions:undefined,before_locations:doc.place_locations},null,2));console.log(r.changes.map(x=>x.word).join('、'));}
module.exports={apply};
