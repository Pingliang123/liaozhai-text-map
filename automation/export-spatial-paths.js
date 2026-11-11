'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),M=require('./ghost_map_model'),R=require('../assets/spatial-routes'),C=require('../assets/path-columns');
function csvCell(value){const text=String(value??'');return /[",\r\n]/u.test(text)?'"'+text.replace(/"/gu,'""')+'"':text;}
function toCsv(rows){return '\ufeff'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n')+'\r\n';}
function loadNarrative(){
 const context={GhostSpatialRoutes:R};vm.createContext(context);
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const script=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gu)].map(m=>m[1]).find(s=>s.includes('else root.GhostMapNarrative=api'));
 if(!script)throw new Error('找不到篇目敘事路徑資料模組');
 vm.runInContext(script,context);return context.GhostMapNarrative;
}
function exportCsv(packagePath=path.join(root,'data-package.json'),outputPath=path.join(root,'reports','聊齋空間路徑.csv')){
 const pack=JSON.parse(fs.readFileSync(packagePath,'utf8')),model=M.create(pack.base);model.importDocument(pack.revisions);
 const narrative=loadNarrative(),places=model.places(),matrix=[C.headers];let previous=[-1,-1],inferredLocations=0;
 for(const id of model.ids){const chapter=model.view(id),events=narrative.rows(model,[chapter],places);
  events.forEach((event,i)=>{const row={...event,chapter_id:id,chapter:chapter.chapter,step:i+1,source_event:event,endpoint_review:event.endpoint_review,has_movement:event.transition_kind==='movement'};
   const order=[id,i+1];if(order[0]<previous[0]||(order[0]===previous[0]&&order[1]<=previous[1]))throw new Error('路徑步驟順序錯誤');previous=order;
   const values=C.values(row,chapter,R);if(values.length!==C.headers.length)throw new Error('欄位數不一致：'+chapter.chapter+' 第'+(i+1)+'步');
   if(id>=20&&id<270)inferredLocations+=C.groups(row,chapter,R).filter(group=>group.locationSource==='篇内前文最近明确地名（上下文承接）').length;
   if(values[C.headers.indexOf('原文')]!==row.quote)throw new Error('原文引句遺失：'+chapter.chapter+' 第'+(i+1)+'步');matrix.push(values);
  });
 }
 fs.mkdirSync(path.dirname(outputPath),{recursive:true});fs.writeFileSync(outputPath,toCsv(matrix),'utf8');
 return {outputPath,chapters:model.ids.length,steps:matrix.length-1,columns:C.headers.length,inferredLocations};
}
if(require.main===module){const result=exportCsv(process.argv[2],process.argv[3]);console.log('已匯出 '+result.steps+' 步、'+result.columns+' 欄、'+result.chapters+' 篇；第21–270篇篇內推定所在地點 '+result.inferredLocations+' 項：'+result.outputPath);}
module.exports={csvCell,toCsv,exportCsv};
