'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const E=require('./export-spatial-paths'),A=require('./audit-exported-spaces');
const root=path.resolve(__dirname,'..');
function exportBatch(start=4,end=53,outputPath=path.join(root,'reports',`聊齋空間路徑_第${start}-${end}篇原文回填.csv`)){
 const temp=path.join(os.tmpdir(),`liaozhai-spatial-${Date.now()}.csv`),result=E.exportCsv(undefined,temp);
 const rows=A.parseCsv(fs.readFileSync(temp,'utf8')),header=rows[0],numberIndex=header.indexOf('篇号');
 const selected=rows.slice(1).filter(row=>{const n=Number(row[numberIndex]);return n>=start&&n<=end;});
 fs.writeFileSync(outputPath,E.toCsv([header,...selected]),'utf8');
 fs.rmSync(temp,{force:true});
 return {outputPath,start,end,chapters:end-start+1,steps:selected.length,totalSteps:result.steps,closeReadRows:result.closeReadRows};
}
if(require.main===module)console.log(JSON.stringify(exportBatch()));
module.exports={exportBatch};
