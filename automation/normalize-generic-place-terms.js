'use strict';
const fs=require('fs'),M=require('./ghost_map_model');
const generic=new Set(['都','郡','邑','村','寺']);
const removeOnly=[
 [52,'诸'],[87,'郭'],[147,'郭'],[221,'郝氏']
];
function run(){const p=JSON.parse(fs.readFileSync('data-package.json')),m=M.create(p.base);m.importDocument(JSON.parse(fs.readFileSync('manual-revisions.json')));const report={checked_chapters:m.ids.length,moved:[],removed:[],retained:[]};
 for(const id of m.ids){const c=m.view(id),d=m.editable(id),source=c.source_units.map(u=>u.text||u.original||'').join('');let changed=false;
  const places=d.places||[];for(const entry of places){if(!generic.has(entry.word))continue;d.places=d.places.filter(p=>p.word!==entry.word);d.space_words=[...new Set([...(d.space_words||[]),entry.word])];d.lexical_reviews={...d.lexical_reviews,['places:'+entry.word]:{status:'corrected',word:entry.word,kind:'spaces',note:'泛称场所，依原文语境列为空间词：'+source.slice(Math.max(0,source.indexOf(entry.word)-20),source.indexOf(entry.word)+entry.word.length+40)}};report.moved.push({chapter_id:id,chapter:c.chapter,word:entry.word});changed=true;}
  for(const [chapterId,word] of removeOnly){if(chapterId!==id||!d.places?.some(p=>p.word===word))continue;const at=source.indexOf(word);d.places=d.places.filter(p=>p.word!==word);d.lexical_reviews={...d.lexical_reviews,['places:'+word]:{status:'rejected',word,kind:'places',note:'原文语境核对，非地名：'+source.slice(Math.max(0,at-20),at+word.length+40)}};report.removed.push({chapter_id:id,chapter:c.chapter,word,quote:source.slice(Math.max(0,at-20),at+word.length+40)});changed=true;}
  if(changed)m.save(id,d);
 }
 const retained=['海中市','城隍庙','肃府','内城'];for(const word of retained)report.retained.push({word,reason:'原文中既是具体地点，又承担场景功能，保留双重分类'});
 fs.writeFileSync('manual-revisions.json',JSON.stringify(m.document()));fs.writeFileSync('reports/generic-place-normalization.json',JSON.stringify(report,null,2));console.log(JSON.stringify({moved:report.moved.length,removed:report.removed.length,retained:report.retained.length}));}
if(require.main===module)run();module.exports={generic,removeOnly};
