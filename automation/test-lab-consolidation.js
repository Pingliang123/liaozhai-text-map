const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');
const html=fs.readFileSync('assets/research-lab/index.html','utf8'),source=fs.readFileSync('assets/research-lab/lab.js','utf8');
assert.deepEqual([...html.matchAll(/<button data-tab="([^"]+)"/g)].map(m=>m[1]),['relations','words','topics']);
const expression=source.match(/const legacyTabs=(\{[^;]+\});/)[1],aliases=vm.runInNewContext('('+expression+')');
for(const [old,target] of Object.entries(aliases))assert(['relations','words','topics'].includes(target),old);
assert.equal(aliases.layers,'relations');assert.equal(aliases.boundary,'words');assert.equal(aliases.routes,'relations');assert.equal(aliases.yi,'relations');
new vm.Script(source);assert(source.includes('exportRows=[];'));assert(source.includes("关系网络类型"));assert(!source.includes("if(tab==='layers')"));assert(!source.includes('单篇情节网络'));
assert(!source.includes("fetch('place-levels.json'"));
console.log('PASS three navigation destinations, merged relation modes, live registry and legacy bookmarks');
