const assert=require('assert/strict'),fs=require('fs'),vm=require('vm');
const {resolve}=require('../assets/research-lab/reviewed-cases'),data=require('../assets/research-lab/data.json');
const before=JSON.stringify(data),rows=resolve(data.chapters);
assert.equal(rows.length,6);assert.equal(new Set(rows.map(c=>c.title)).size,6);
for(const c of rows){let previous=-1;for(const e of c.events){assert(e.units[0].id>=previous);previous=e.units[0].id;assert(e.quote.length);assert(e.actors.length);assert(['movement','change'].includes(e.kind));const source=data.chapters.find(x=>x.id===c.chapterId);for(const u of e.units)assert(source.units.some(x=>x.id===u.id&&x.text===u.text));}}
assert.equal(JSON.stringify(data),before,'Review must not alter saved annotations');
assert(rows.find(c=>c.title==='黄英').events.every(e=>e.realm==='人间'));
assert(rows.find(c=>c.title==='丁前溪').events.every(e=>e.realm==='人间'));
assert(!rows.find(c=>c.title==='画壁').events.some(e=>e.from==='江西'));
assert(!rows.find(c=>c.title==='席方平').events.some(e=>e.to==='灌口'));
assert.throws(()=>resolve([]),/缺少篇目/);
const changed=structuredClone(data.chapters);changed.find(c=>c.title==='画壁').units=changed.find(c=>c.title==='画壁').units.filter(u=>u.id!==149);assert.throws(()=>resolve(changed),/原文单位不匹配/);
new vm.Script(fs.readFileSync('assets/research-lab/cases-page.js','utf8'));
const edited=structuredClone(data.chapters);edited.find(c=>c.title==='黄英').units.find(u=>u.id===26684).text+='更正';assert.throws(()=>resolve(edited),/原文已变化/);
assert(fs.readFileSync('assets/research-lab/index.html','utf8').includes('cases.html'));
console.log('PASS six reviews, '+rows.reduce((n,c)=>n+c.events.length,0)+' ordered records, exact source units, realm distinctions and immutable source');
