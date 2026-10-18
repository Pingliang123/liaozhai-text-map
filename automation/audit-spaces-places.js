'use strict';
const fs=require('fs'),M=require('./ghost_map_model');
const generic=new Set('郡 邑 村 寺 郡城 邻村 近村 邑中 山村 海滨 海上 兰若 萧寺 南郊 东郊'.split(' '));
function inspect(c){
 const text=c.source_units.map(u=>u.text||u.original||'').join(''),out=[];
 for(const p of c.places||[]){const at=text.indexOf(p.word);if(generic.has(p.word)||at<0)out.push({word:p.word,kind:'places',action:at<0?'review':'move-space',reason:at<0?'原文未命中':'场景泛称，不能独立定位',quote:at<0?'':text.slice(Math.max(0,at-25),at+p.word.length+40)});}
 for(const w of c.space_words||[]){const at=text.indexOf(w);if(at<0||(c.places||[]).some(p=>p.word===w))out.push({word:w,kind:'spaces',action:'review',reason:at<0?'原文未命中':'地点与空间同时收录，须结合语境',quote:at<0?'':text.slice(Math.max(0,at-25),at+w.length+40)});}
 return out;
}
function run(){
 const p=JSON.parse(fs.readFileSync('data-package.json')),before=JSON.parse(fs.readFileSync('manual-revisions.json')),m=M.create(p.base);m.importDocument(before);
 const report={checked_chapters:m.ids.length,applied:[],held:[]};
 for(const id of m.ids){const c=m.view(id),draft=m.editable(id);let changed=false;for(const issue of inspect(c)){
 const row={chapter_id:id,chapter:c.chapter,...issue};
 if(issue.action!=='move-space'||c.lexical_reviews?.['places:'+issue.word]||c.lexical_reviews?.['spaces:'+issue.word]){report.held.push(row);continue;}
 draft.places=draft.places.filter(p=>p.word!==issue.word);draft.space_words=[...new Set([...(draft.space_words||[]),issue.word])];changed=true;report.applied.push(row);
 }if(changed)m.save(id,draft);}
 fs.writeFileSync('reports/space-place-audit.json',JSON.stringify(report,null,2));fs.writeFileSync('manual-revisions.json',JSON.stringify(m.document()));console.log(JSON.stringify({checked:report.checked_chapters,applied:report.applied.length,held:report.held.length}));
}
if(require.main===module)run();module.exports={inspect};
