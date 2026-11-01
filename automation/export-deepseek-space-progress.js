'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const review=require('./deepseek-space-vocabulary');
const DATA='assets/research-lab/data.json',OUTPUT='reports',OUT='deepseek-space-vocabulary-partial-20261101';
const TYPE={place:'专名地点',built:'建筑/人造空间',natural:'自然空间',relative:'方位/相对空间',boundary:'边界/通道',otherworld:'异境空间',relation:'空间关系词'};
function csvCell(value){const s=String(value??'');return '"'+s.replaceAll('"','""')+'"';}
function toCsv(headers,rows){return '\uFEFF'+[headers,...rows].map(row=>row.map(csvCell).join(',')).join('\r\n')+'\r\n';}
function fingerprintFor(items){return crypto.createHash('sha256').update('strict-target-v2\n'+items.map(x=>x.word+'\t'+x.frequency+'\t'+x.examples.map(e=>e.text).join('|')).join('|')).digest('hex');}
function makeSummary(progress,checked,total){
 const counts={};for(const key of Object.keys(TYPE))counts[key]=progress.candidates.filter(x=>x.type===key).length;
 const left=total-checked;
 return ['# 《聊斋志异》空间词与分词复核：阶段名单','',`本名单是 DeepSeek 已完成部分，**不是全书最终结果**。已审 ${checked.toLocaleString('zh-CN')} / ${total.toLocaleString('zh-CN')} 个不同分词词项；尚余 ${left.toLocaleString('zh-CN')} 个。`,`空间词候选 ${progress.candidates.length.toLocaleString('zh-CN')} 项；分词边界疑点 ${progress.segmentation.length.toLocaleString('zh-CN')} 项。`,`模型：${progress.model}。候选来自原文句子与现有分词上下文，尚待人工复核；建议不会自动写回网站。`,'','## 空间词候选类别','','| 类别 | 数量 |','|---|---:|',...Object.entries(counts).map(([key,n])=>`| ${TYPE[key]} | ${n.toLocaleString('zh-CN')} |`),'','## 文件','','- `deepseek-space-vocabulary-partial-20261101-space-candidates.csv`：空间词候选、类别、词频、篇数、原句和理由。','- `deepseek-space-vocabulary-partial-20261101-segmentation.csv`：分词疑点、原分词与建议切分、原句和理由。','','CSV 使用 UTF-8 BOM，可用 Excel 打开。'].join('\n');
}
function exportProgress(checkpointPath,outputDir,dataPath=DATA){
 const data=JSON.parse(fs.readFileSync(dataPath,'utf8')),items=review.buildInput(data),fingerprint=fingerprintFor(items),progress=JSON.parse(fs.readFileSync(checkpointPath,'utf8'));
 if(progress.fingerprint!==fingerprint)throw Error('进度文件与当前全书词项版本不匹配');
 const batches=Math.ceil(items.length/review.BATCH_SIZE),completed=[...new Set(progress.completed||[])];
 if(completed.some(i=>!Number.isInteger(i)||i<0||i>=batches))throw Error('进度文件含无效批次编号');
 const checked=completed.reduce((n,i)=>n+Math.min(review.BATCH_SIZE,items.length-i*review.BATCH_SIZE),0);
 const candidateRows=(progress.candidates||[]).map(r=>[r.word,TYPE[r.type]||r.type,r.frequency,r.chapter_count,r.evidence?.chapter,r.evidence?.unit_id,r.evidence?.quote,r.evidence?.segmented_context,r.reason]);
 const segmentationRows=(progress.segmentation||[]).map(r=>[r.word,r.certainty==='likely'?'较明确':'待核',r.frequency,r.chapter_count,r.evidence?.chapter,r.evidence?.unit_id,r.evidence?.quote,(r.evidence?.before||[]).join(' / '),(r.evidence?.after||[]).join(' / '),r.reason]);
 fs.mkdirSync(outputDir,{recursive:true});
 const base=path.join(outputDir,OUT.split('/').at(-1));
 fs.writeFileSync(base+'-space-candidates.csv',toCsv(['词项','候选类别','全书词频','篇数','证据篇目','原文单元','原文句子','原分词上下文','DeepSeek判断'],candidateRows));
 fs.writeFileSync(base+'-segmentation.csv',toCsv(['词项','把握','全书词频','篇数','证据篇目','原文单元','原文句子','当前切分','建议切分','DeepSeek理由'],segmentationRows));
 fs.writeFileSync(base+'.md',makeSummary(progress,checked,items.length));
 return {checked,total:items.length,candidates:candidateRows.length,segmentation:segmentationRows.length,files:[base+'.md',base+'-space-candidates.csv',base+'-segmentation.csv']};
}
if(require.main===module){const checkpoint=process.argv[2];if(!checkpoint){console.error('Usage: node automation/export-deepseek-space-progress.js <checkpoint.json>');process.exitCode=2;}else try{const result=exportProgress(checkpoint,OUTPUT);process.stdout.write(JSON.stringify(result,null,2)+'\n');}catch(error){console.error(error.message);process.exitCode=1;}}
module.exports={csvCell,toCsv,fingerprintFor,makeSummary,exportProgress,TYPE};
