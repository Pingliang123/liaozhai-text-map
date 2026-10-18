'use strict';
const fs=require('fs'),M=require('./ghost_map_model');
const fixes=[
 [0,'people','宋公讳焘','宋公','宋焘'],[96,'people','杨治棋枰','杨','杨于畏'],
 [142,'people','万福字子祥','万福','万福'],[171,'people','王略无疑贰','王','王文'],
 [192,'people','王命向生','王','蜂王'],[224,'people','林乃托疾','林','林氏'],
 [244,'people','梦白衣少年','白衣少年','白衣少年'],[380,'people','邑有穆生','穆生','穆生'],
 [398,'people','王窥其意','王','王氏'],[416,'people','内一女郎','女郎','晚霞'],
 [437,'people','李知其吝','李','李氏'],
 [54,'spaces','其中','祠'],[234,'spaces','其中','禅院'],[329,'spaces','其中','精舍'],
 [72,'spaces','内','内城'],[87,'spaces','内',''],
 ...[107,170,275,333].map(id=>[id,'spaces','满屋','屋'])
];
function apply(c,draft,row){
 const [id,kind,old,word,canonical]=row,text=c.source_units.map(u=>u.text||u.original||'').join('');
 const list=kind==='people'?draft.people.map(p=>p.word):draft.space_words;
 if(!list.includes(old))return null;
 if(word&&!text.includes(word))throw Error('replacement absent '+id+' '+word);
 const at=text.indexOf(old),quote=text.slice(Math.max(0,at-30),at+old.length+45);
 if(kind==='people'){const prior=draft.people.find(p=>p.word===old);draft.people=draft.people.filter(p=>p.word!==old);const existing=draft.people.find(p=>p.word===word);if(existing)existing.canonical=existing.canonical||canonical;else draft.people.push({...prior,word,canonical,evidence:quote});}
 else draft.space_words=[...new Set(draft.space_words.filter(w=>w!==old).concat(word?[word]:[]))];
 draft.lexical_reviews={...draft.lexical_reviews,[kind+':'+old]:{status:word?'corrected':'rejected',word,kind,note:'逐句核对：'+quote}};
 return {chapter_id:id,chapter:c.chapter,kind,before:old,after:word,canonical,quote};
}
function run(){const p=JSON.parse(fs.readFileSync('data-package.json')),m=M.create(p.base);m.importDocument(JSON.parse(fs.readFileSync('manual-revisions.json')));const report={applied:[],flagged:[],checked:m.ids.length};
 for(const row of fixes){const c=m.view(row[0]),d=m.editable(row[0]),entry=apply(c,d,row);if(entry){m.save(row[0],d);report.applied.push(entry);}}
 for(const id of m.ids){const c=m.view(id),text=c.source_units.map(u=>u.text||u.original||'').join('');for(const kind of ['people','places','spaces'])for(const w of kind==='spaces'?c.space_words:c[kind].map(p=>p.word)){
 const at=text.indexOf(w);if(at<0||(kind==='people'&&w.length>=4)||(kind==='places'&&w==='都'))report.flagged.push({chapter_id:id,chapter:c.chapter,kind,word:w,reason:at<0?'原文未命中':kind==='places'?'须按出现位置区分京城、异境及副词':'长人物称谓须核对',quote:at<0?'':text.slice(Math.max(0,at-25),at+w.length+45)});
 }}fs.writeFileSync('manual-revisions.json',JSON.stringify(m.document()));fs.writeFileSync('reports/context-vocabulary-review.json',JSON.stringify(report,null,2));console.log(JSON.stringify({checked:report.checked,applied:report.applied.length,flagged:report.flagged.length}));}
if(require.main===module)run();module.exports={apply,fixes};
