'use strict';
const assert=require('node:assert/strict'),C=require('../assets/path-columns'),E=require('./export-spatial-paths');
const A=require('./audit-exported-spaces');
const S=require('./supplement-source-steps');
const uncovered={chapter_id:0,source_units:[{unit:1,text:'入卧室。',tokens:['入','卧室','。']}],space_words:['卧室'],places:[],people:[]};
assert.equal(S.supplement(uncovered,[])[0].to_space,'卧室');
assert.equal(S.supplement(uncovered,[{unit:1,quote:'入卧室。'}]).length,0,'已覆盖的词项不能重复补步');
const mention={...uncovered,source_units:[{unit:1,text:'卧室寂静。',tokens:['卧室','寂静','。']}]};
assert.equal(S.supplement(mention,[])[0].source_roles.stay,'','空间描写不能凭空变成人物停留');
assert.deepEqual(A.parseCsv('\ufeffa,b\r\n"含,逗号","引号""及\n换行"\r\n'),[['a','b'],['含,逗号','引号"及\n换行']]);
assert.equal(E.csvCell('plain'),'plain');
assert.equal(E.csvCell('有,逗號'),'"有,逗號"');
assert.equal(E.csvCell('有"引號'),'"有""引號"');
assert.equal(E.csvCell('跨\n行'),'"跨\n行"');
const fixture={source_units:[{unit:1,text:'金陵室内至庭。',tokens:['金陵','室内','至','庭','。']}],places:[{word:'金陵'}],space_words:['室内','庭']};
const sceneValues=C.headers.map(()=>''),sceneRow={space:'金陵／室内 → 庭',has_movement:true,source_event:{unit:1}};
E.completeScene(sceneValues,sceneRow,fixture);
assert.equal(sceneValues[C.headers.indexOf('到达空间')],'庭');
assert.equal(sceneValues[C.headers.indexOf('出发空间')],'','含两个词的起端应保留歧义');
assert.ok(sceneValues[C.headers.indexOf('参考地点')].includes('金陵'));
assert.ok(sceneValues[C.headers.indexOf('双端证据')].includes('金陵室内至庭。'));
const absentValues=C.headers.map(()=>'');E.completeScene(absentValues,{space:'未知寺',source_event:{unit:1}},fixture);
assert.equal(absentValues[C.headers.indexOf('停留空间')],'','场景描述不能代替原文词项');
const mentionValues=C.headers.map(()=>'');E.completeMentionTerms(mentionValues,{has_movement:false,source_event:{unit:1}},fixture);
assert.equal(mentionValues[C.headers.indexOf('停留空间')],'室内、庭','引句中可确认的空间词应作为空间提及回填');
const csv=E.toCsv([C.headers,['1','《測試》','原文「室中」,见']]);
const same=C.headers.map(()=>'');
for(const [quote,tokens,want] of [['抵家，母喜。',['抵','家','，','母','喜','。'],'家'],['抵家，母喜。',['抵家','，','母','喜','。'],''],['欲抵家。',['欲','抵','家','。'],'']]){
 const cells=C.headers.map(()=>'');
 E.completeExplicitArrival(cells,{quote,source_event:{unit:1}},{source_units:[{unit:1,text:quote,tokens}],places:[],space_words:[]});
 assert.equal(cells[C.headers.indexOf('到达空间')],want);
}
for(const role of ['停留','到达']){
 for(const [field,value] of Object.entries({'空间':'卧室','空间所在地点':'济南','世界分类':'人间'}))same[C.headers.indexOf(role+field)]=value;
}
same[C.headers.indexOf('原文')]='入卧室。';same[C.headers.indexOf('停留使用方式')]='私人';
const another=same.slice();another[C.headers.indexOf('到达世界分类')]='地界';
E.completeSharedAccess(another);assert.equal(another[C.headers.indexOf('到达使用方式')],'');
E.completeSharedAccess(same);assert.equal(same[C.headers.indexOf('到达使用方式')],'私人');
assert.ok(csv.startsWith('\ufeff篇号,篇名,'),'CSV 使用 UTF-8 BOM，便於 Excel 正確讀取中文');
assert.ok(csv.includes('\r\n1,《測試》,"原文「室中」,见"\r\n'));
const result=E.exportCsv(undefined,require('node:os').tmpdir()+'\\liaozhai-spatial-paths-test.csv');
assert.equal(result.closeReadRows,50,'前三篇50条现有步骤应全部经过逐篇核读规则');
assert.equal(result.chapters,491);assert.equal(result.steps,7222+result.addedSteps);assert.equal(result.columns,C.headers.length);assert.ok(result.inferredLocations>0,'第1–491篇应补入有前文原文锚点支持的所在地点');
const fs=require('node:fs');try{const body=fs.readFileSync(result.outputPath,'utf8');assert.ok(body.startsWith('\ufeff'));assert.ok(body.includes('空间另据同篇场景承接推定'));assert.ok(body.includes('及同篇原文推定（单元'));assert.equal(body.split('\r\n').length-2,result.steps);}finally{fs.rmSync(result.outputPath,{force:true});}
console.log('PASS 全書路徑 CSV 編碼、轉義、欄數及 原有及新增步驟匯出核對');
