const assert=require('node:assert/strict'),fs=require('node:fs'),A=require('../audit-reports');
const palette=A.colors(32);
assert.equal(new Set(palette).size,32);
assert.equal(A.colors(0).length,0);
assert.deepEqual(A.colors(5),palette.slice(0,5));
assert.equal(A.eventStats([{types:['狐']},{types:['鬼','狐']}]).total,2);
for(const file of ['index.html','assets/vocabulary-grid.js','assets/research-lab/chapter-spaces.js']){
 const s=fs.readFileSync(file,'utf8');assert(!s.includes('>空间词<'));assert(s.includes('场所词'));
}
assert(fs.readFileSync('index.html','utf8').includes('空间词分为地点词与场所词'));
console.log('PASS terminology and unique combination colors');
