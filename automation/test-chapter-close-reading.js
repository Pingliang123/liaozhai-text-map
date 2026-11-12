'use strict';
const assert=require('node:assert/strict'),C=require('../assets/path-columns'),M=require('./ghost_map_model');
const {applyCloseReading}=require('./apply-chapter-close-reading');
const pack=require('../data-package.json'),model=M.create(pack.base);model.importDocument(pack.revisions);
function reviewed(id,unit){
 const values=C.headers.map(()=>''),chapter=model.view(id);
 for(const role of ['出发','到达','停留'])values[C.headers.indexOf(role+'空间所在地点')]='河南';
 assert.equal(applyCloseReading(values,{chapter_id:id,source_event:{unit}},chapter),true);
 return Object.fromEntries(C.headers.map((header,i)=>[header,values[i]]));
}
const exam=reviewed(0,10);assert.equal(exam.到达空间,'殿上');
assert.equal(exam.到达空间所在地点,'','河南为拟授任所，不是考场所在地');
assert.ok(exam.双端证据.includes('召公上'));
assert.equal(reviewed(0,23).到达空间,'堂');assert.equal(reviewed(0,23).到达世界分类,'人间');
assert.equal(reviewed(1,33).出发空间,'耳');assert.equal(reviewed(1,33).到达空间,'地上');
assert.equal(reviewed(1,37).停留空间,'','半年治疗地点原文不明');
const escape=reviewed(2,73);assert.equal(escape.到达空间,'东郊');assert.equal(escape.到达空间所在地点,'阳信');
assert.equal(escape.出发空间所在地点,'蔡店');
assert.equal(reviewed(2,90).停留空间,'兰若');
assert.equal(reviewed(2,101).停留空间,'门外','县宰询问前没有转赴官府的文字');
const untouched=C.headers.map(()=>'原值');assert.equal(applyCloseReading(untouched,{chapter_id:3,source_event:{unit:105}},model.view(3)),false);
assert.ok(untouched.every(value=>value==='原值'));
console.log('PASS 前三篇逐条全文核读定位、空间同指及不明场所处理');
