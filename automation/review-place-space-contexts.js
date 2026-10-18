'use strict';
const fs=require('fs'),M=require('./ghost_map_model');
const fixes=[
 [46,'places','盖陵阳','陵阳'],[72,'places','达金陵','金陵'],[91,'places','冥律',''],
 [101,'places','卓锡泰山','泰山'],[117,'places','官汾州','汾州'],[119,'places','诣庙','庙','spaces'],
 [130,'places','赴海市','海市'],[131,'places','辽阳人','辽阳'],[140,'places','临酆都','酆都'],
 [225,'places','时颜镇','颜镇'],[251,'places','时肃府','肃府'],[274,'places','寓蒙山寺','蒙山寺'],
 [321,'places','河间人','河间'],[355,'places','诣岳庙','岳庙'],[375,'places','闻安期岛','安期岛'],
 [394,'places','泰山人','泰山'],[420,'places','戎衢州','衢州'],[421,'places','平阴人','平阴'],
 [440,'places','试金陵','金陵'],[449,'places','云南人','云南'],[464,'places','葬竹桥','竹桥'],
 [465,'places','大名世家','大名'],[322,'spaces','他',''],[324,'spaces','近',''],
 [348,'spaces','君','君山','places'],[320,'spaces','复室帘','复室'],[248,'spaces','常楼','楼']
];
function revise(c,d,row){const [id,kind,old,word,target=kind]=row;
 const list=k=>k==='spaces'?d.space_words:d.places.map(x=>x.word);
 if(!list(kind).includes(old))return null;
 const source=c.source_units.map(u=>u.text||u.original||'').join(''),at=source.indexOf(old);
 if(at<0||(word&&!source.includes(word)))throw Error('Missing evidence '+id+' '+old);
 const quote=source.slice(Math.max(0,at-25),at+old.length+45);
 if(kind==='spaces')d.space_words=d.space_words.filter(w=>w!==old);else d.places=d.places.filter(p=>p.word!==old);
 if(word&&!list(target).includes(word)){if(target==='spaces')d.space_words.push(word);else d.places.push({word,mentions:0});}
 d.lexical_reviews={...d.lexical_reviews,[kind+':'+old]:{status:word?'corrected':'rejected',word,kind:target,note:'原文语境核对：'+quote}};
 // Split the erroneous whole token only; retain the source characters and other edits.
 if(word&&old.includes(word)&&d.segmentation_note){const i=old.indexOf(word),parts=[old.slice(0,i),word,old.slice(i+word.length)].filter(Boolean);d.segmentation_note=d.segmentation_note.split(/(\s*\/\s*|\n)/).map(t=>t===old?parts.join(' / '):t).join('');}
 return {chapter_id:id,chapter:c.chapter,kind,before:old,after:word,target,quote};
}
function run(){const p=JSON.parse(fs.readFileSync('data-package.json')),m=M.create(p.base);m.importDocument(JSON.parse(fs.readFileSync('manual-revisions.json')));const report={checked_chapters:m.ids.length,applied:[],retained:[{chapter:'丐仙',word:'耳舍',reason:'置于耳舍，指附属房舍'},{chapter:'公孙夏',word:'部署',reason:'客即导至部署，指故事中的办事场所'}]};
 for(const row of fixes){const c=m.view(row[0]),d=m.editable(row[0]),r=revise(c,d,row);if(r){m.save(row[0],d);report.applied.push(r);}}
 fs.writeFileSync('manual-revisions.json',JSON.stringify(m.document()));fs.writeFileSync('reports/place-space-context-review.json',JSON.stringify(report,null,2));console.log('Applied '+report.applied.length+' contextual corrections');}
if(require.main===module)run();module.exports={revise};
