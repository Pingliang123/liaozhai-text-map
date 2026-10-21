const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');
const html=fs.readFileSync('assets/research-lab/index.html','utf8'),source=fs.readFileSync('assets/research-lab/lab.js','utf8');
assert.deepEqual([...html.matchAll(/<button data-tab="([^"]+)"/g)].map(m=>m[1]),['relations','yi','words','topics']);
const expression=source.match(/const legacyTabs=(\{[^;]+\});/)[1],aliases=vm.runInNewContext('('+expression+')');
for(const [old,target] of Object.entries(aliases))assert(['relations','yi','words','topics'].includes(target),old);
assert.equal(aliases.layers,'relations');assert.equal(aliases.boundary,'words');assert.equal(aliases.routes,'yi');
new vm.Script(source);assert(source.includes('exportRows=[];hierarchyState.level=\'all\''));
console.log('PASS four navigation destinations, legacy bookmarks, export reset and syntax');
