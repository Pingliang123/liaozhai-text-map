'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {exportBatch}=require('./export-batch-spatial-report');
const out=path.join(os.tmpdir(),'liaozhai-batch-254-303.csv'),result=exportBatch(254,303,out);
assert.equal(result.chapters,50);assert.ok(result.steps>0);
const body=fs.readFileSync(out,'utf8');assert.ok(body.startsWith('\ufeff篇号,篇名,'));
assert.ok(body.includes('按引句分词回填'),'批次应包含原文分词回填证据');
fs.rmSync(out,{force:true});
console.log('PASS 第254–303篇批次导出与原文分词回填核对');
