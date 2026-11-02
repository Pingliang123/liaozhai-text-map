'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const map=fs.readFileSync('index.html','utf8'),lab=fs.readFileSync('assets/research-lab/index.html','utf8');
assert(map.includes('assets/research-lab/#research-method'));
assert.equal((lab.match(/id="research-method"/g)||[]).length,1,'research entry must resolve to exactly one section');
for(const term of ['故事空间','艺术空间','边界与相遇','移动与处境','异境与秩序','同篇共现不等于实际移动'])assert(lab.includes(term),term);
for(const id of ['chapter','event','view','status'])assert(lab.includes('id="'+id+'"'),'retain working research controls');
assert(lab.includes('../../index.html?edit=words#reports-screen'),'guide links to shared editor');
console.log('PASS research scope, evidence limits, working entry and shared editing links');
