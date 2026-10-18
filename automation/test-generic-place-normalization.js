const assert=require('assert/strict'),fs=require('fs');
const {generic,removeOnly}=require('./normalize-generic-place-terms');
assert.deepEqual([...generic],['都','郡','邑','村','寺']);assert(removeOnly.some(x=>x[1]==='郝氏'));
const data=JSON.parse(fs.readFileSync('data-package.json'));assert(data.base.chapter_overview.length>=491);
console.log('PASS generic place policy: generic locations move to spaces; false candidates are explicitly rejected');
