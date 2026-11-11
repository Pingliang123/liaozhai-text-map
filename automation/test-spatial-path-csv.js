'use strict';
const assert=require('node:assert/strict'),C=require('../assets/path-columns'),E=require('./export-spatial-paths');
assert.equal(E.csvCell('plain'),'plain');
assert.equal(E.csvCell('有,逗號'),'"有,逗號"');
assert.equal(E.csvCell('有"引號'),'"有""引號"');
assert.equal(E.csvCell('跨\n行'),'"跨\n行"');
const csv=E.toCsv([C.headers,['1','《測試》','原文「室中」,见']]);
assert.ok(csv.startsWith('\ufeff篇号,篇名,'),'CSV 使用 UTF-8 BOM，便於 Excel 正確讀取中文');
assert.ok(csv.includes('\r\n1,《測試》,"原文「室中」,见"\r\n'));
const result=E.exportCsv(undefined,require('node:os').tmpdir()+'\\liaozhai-spatial-paths-test.csv');
assert.equal(result.chapters,491);assert.equal(result.steps,7222);assert.equal(result.columns,C.headers.length);assert.ok(result.inferredLocations>0,'第21–70篇应补入有前文原文锚点支持的所在地点');
const fs=require('node:fs');try{const body=fs.readFileSync(result.outputPath,'utf8');assert.ok(body.startsWith('\ufeff'));assert.equal(body.split('\r\n').length-2,7222);}finally{fs.rmSync(result.outputPath,{force:true});}
console.log('PASS 全書路徑 CSV 編碼、轉義、欄數及 7,222 步匯出核對');
