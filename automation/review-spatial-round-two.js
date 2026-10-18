'use strict';
const fs=require('fs'),M=require('./ghost_map_model'),{revise}=require('./review-place-space-contexts');
const fixes=[
 [52,'places','诸','诸城'],[131,'places','登',''],[146,'places','王舍','王舍人庄'],
 [147,'places','郭','郭外','spaces'],[176,'places','城隍',''],[221,'places','郝氏',''],
 [39,'spaces','腔',''],[55,'spaces','出门','门'],[137,'spaces','己门','门'],
 [205,'spaces','入门','门'],[308,'spaces','出山','山'],[441,'spaces','城隍','']
];
const retained=[
 {chapter_id:283,word:'盖',reason:'至盖省其舅：盖为地名简称，不能按虚词删除'},
 {chapter_id:316,word:'松',reason:'抵苏、松间：与苏并列的地名简称'},
 {chapter_id:343,word:'恩',reason:'设教于恩：原句作地名，具体历史对应仍须考证'},
 {chapter_id:471,word:'新',reason:'由苑之新：方向句式中的地点，具体对应仍须考证'},
 {chapter_id:133,word:'喑处',reason:'原文如此，疑涉版本用字；未核版本前保留'},
 {chapter_id:134,word:'中余',reason:'朱送至中余：疑涉版本讹字，不能凭猜测替换'},
 {chapter_id:342,word:'心头',reason:'有小人出，是异事发生的身体空间'},
 {chapter_id:301,word:'掌中',reason:'置掌中审顾之，是虱子变化的微观空间'},
 {chapter_id:80,word:'肉分',reason:'龙潜藏于眼部肉分，具有身体空间意义'}
];
function run(){const p=JSON.parse(fs.readFileSync('data-package.json')),m=M.create(p.base);m.importDocument(JSON.parse(fs.readFileSync('manual-revisions.json')));const report={checked_chapters:m.ids.length,applied:[],retained:[]};
 for(const row of fixes){const c=m.view(row[0]),d=m.editable(row[0]),r=revise(c,d,row);if(r){m.save(row[0],d);report.applied.push(r);}}
 for(const r of retained){const c=m.view(r.chapter_id),s=c.source_units.map(u=>u.text||u.original||'').join(''),at=s.indexOf(r.word);report.retained.push({...r,chapter:c.chapter,quote:s.slice(Math.max(0,at-25),at+r.word.length+45)});}
 fs.writeFileSync('manual-revisions.json',JSON.stringify(m.document()));fs.writeFileSync('reports/spatial-round-two.json',JSON.stringify(report,null,2));console.log(JSON.stringify({applied:report.applied.length,retained:report.retained.length}));}
if(require.main===module)run();module.exports={fixes,retained};
