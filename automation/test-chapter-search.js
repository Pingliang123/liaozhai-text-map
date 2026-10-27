'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),S=require('../assets/chapter-search'),M=require('./ghost_map_model');
const model=M.create(require('../data-package.json').base);S.configure(model.simplify);
const rows=[{value:'',label:'全书'},{value:'411',label:'黄英〔妖〕'},{value:'1',label:'画壁〔神〕'},{value:'2',label:'聂小倩〔鬼〕'},{value:'3',label:'黄九郎〔妖〕',disabled:true}];
assert.deepEqual(S.matches(rows,'黃').map(r=>r.value),['411']);assert.deepEqual(S.matches(rows,'《 畫壁 》').map(r=>r.value),['1']);assert.deepEqual(S.matches(rows,'聶小').map(r=>r.value),['2']);assert.equal(S.matches(rows,'不存在的篇名').length,0);assert.equal(S.matches(rows,'').length,4);
assert.equal(rows.length,5);assert.equal(rows[1].label,'黄英〔妖〕','搜索不改资料');
for(const file of ['index.html','assets/research-lab/index.html','assets/research-lab/cases.html']){const text=fs.readFileSync(file,'utf8');assert(text.includes('chapter-search.js'));assert(text.includes('chapter-search.css'));}
assert(fs.readFileSync('index.html','utf8').includes('GhostChapterSearch?.configure(model.simplify)'));assert(fs.readFileSync('assets/research-lab/current-data.js','utf8').includes('GhostChapterSearch?.configure(model.simplify)'));
console.log('PASS 共用篇目搜索：繁简、部分篇名、空结果、禁用选项和三页接入，资料不变');
