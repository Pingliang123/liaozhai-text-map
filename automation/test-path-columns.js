'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),C=require('../assets/path-columns'),R=require('../assets/spatial-routes'),M=require('./ghost_map_model');
const chapter={source_tokens:['济南','室','庭','廊','金陵','院'],source_units:[
 {unit:10,text:'济南室至庭，廊中相会。',tokens:['济南','室','至','庭','，','廊','中','相会','。']},
 {unit:11,text:'后往金陵院中。',tokens:['后','往','金陵','院','中','。']}
],places:[{word:'济南'},{word:'金陵'}],space_words:['室','庭','廊','院'],realm_evidence:[]};
const moving={chapter_id:0,chapter:'测试',step:1,actors:'甲',has_movement:true,quote:'济南室至庭，廊中相会。',from_space:'室',to_space:'庭',space:'室 → 庭',from_access:'私人',classification:{access:'公共',realm:'异境'},source_event:{unit:10,unit_end:10,space_access:'混合',from_realm:'人间',to_realm:'异境'}};
const g=C.groups(moving,chapter,R);assert.deepEqual(g.map(x=>x.word),['室','庭','廊']);assert.deepEqual(g.map(x=>x.location),['济南','','济南'],'异境到达端不可沿用人间地名');assert.deepEqual(g.map(x=>x.realm),['人间','','人间']);assert.deepEqual(g.map(x=>x.access),['私人','公共','混合']);
const noPlace={...moving,quote:'室至庭，廊中相会。',source_event:{unit:10,unit_end:10}};assert.deepEqual(C.groups(noPlace,chapter,R).map(x=>x.location),['','',''],'不得从同篇其他引句补地点');
const otherworld={source_tokens:['济南','室','狱门'],source_units:[{unit:12,text:'济南室至狱门。',tokens:['济南','室','至','狱门','。']}],places:[{word:'济南'}],space_words:['室','狱门'],realm_evidence:[{space:'冥府',realm:'地界'}]};
const crossing={...moving,quote:'济南室至狱门。',from_space:'室',to_space:'狱门',source_event:{unit:12,unit_end:12,from_realm:'人间',to_realm:'异境'}};const cross=C.groups(crossing,otherworld,R);assert.equal(cross[1].realm,'地界','异境按本篇唯一且有原文证据的三界归属补为地界');assert.equal(cross[1].location,'','不把人间地点误挂到地界端点');
const scene={...moving,has_movement:false,space:'院中',quote:'后往金陵院中。',classification:{access:'私人',realm:'人间'},source_event:{unit:11,unit_end:11,space_access:'私人',space_realm:'人间'}};assert.deepEqual(C.groups(scene,chapter,R).map(x=>x.word),['','','院']);assert.equal(C.groups(scene,chapter,R)[2].location,'金陵');
assert.equal(C.groups({...moving,from_space:'赴济南'},chapter,R)[0].word,'','不能把含地点词的动作短语当成空间词');
assert.equal(C.headers.length,C.values(moving,chapter,R).length);
for(const old of ['出发类型','到达类型','出发世界','使用方式','世界分类'])assert.ok(!C.headers.includes(old));
assert.equal(C.headers.filter(x=>x.endsWith('空间所在地点')).length,3);assert.equal(C.headers.filter(x=>x.endsWith('世界分类')).length,3);
const pack=require('../data-package.json'),model=M.create(pack.base);model.importDocument(pack.revisions);const originalDocument=JSON.stringify(model.document());assert.equal(model.ids.length,491,'核对总资料包全部篇目');
const context={GhostSpatialRoutes:R};vm.createContext(context);const html=fs.readFileSync('index.html','utf8');
const narrative=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]).find(s=>s.includes('else root.GhostMapNarrative=api'));assert.ok(narrative);vm.runInContext(narrative,context);
const rows=[],places=model.places();for(const id of model.ids){const c=model.view(id);context.GhostMapNarrative.rows(model,[c],places).forEach((event,i)=>rows.push({...event,chapter_id:id,chapter:c.chapter,step:i+1,source_event:event,endpoint_review:event.endpoint_review,has_movement:event.transition_kind==='movement'}));}
const stats={steps:rows.length,endpointSpaces:0,stays:0,locations:0,worlds:0,ordered:true};let last=[-1,-1];
for(const row of rows){const c=model.view(row.chapter_id),values=C.values(row,c,R),groups=C.groups(row,c,R),knownPlaces=new Set(c.places.map(p=>p.word)),knownSpaces=new Set(c.space_words||[]);const key=[row.chapter_id,row.step];if(key[0]<last[0]||key[0]===last[0]&&key[1]<=last[1])stats.ordered=false;last=key;
 for(const [role,group] of groups.entries()){if(group.word){const words=group.word.split('、');for(const w of words){assert.ok(row.quote.includes(w),'非引文词项进入路径表：'+row.chapter+' '+w);if(role===2)assert.ok(knownSpaces.has(w),'停留空间必须来自本篇已标注空间词：'+row.chapter+' '+w);}if(role===2)stats.stays+=words.length;else stats.endpointSpaces+=words.length;}if(group.location){for(const w of group.location.split('、')){assert.ok(knownPlaces.has(w),'所在地点必须是本篇地点词：'+row.chapter+' '+w);if(!row.quote.includes(w)){assert.ok(row.chapter_id>=20&&row.chapter_id<470&&c.source_units.some(u=>u.text.includes(w)),'篇内承接仅限21至470篇且须有原文锚点：'+row.chapter+' '+w);assert.equal(group.locationSource,'篇内前文最近明确地名（上下文承接）');}}stats.locations+=group.location.split('、').length;}if(group.realm){stats.worlds++;assert.ok(['天界','地界','人间'].includes(group.realm));}}
 assert.equal(values.length,C.headers.length);
}
assert.equal(stats.ordered,true,'全书导出按篇目与步骤顺序');assert.equal(stats.steps,7222,'扫描全书去除重复后实际导出的路径步骤');assert.equal(JSON.stringify(model.document()),originalDocument,'导出核查不能改写任何人工修订');
console.log('PASS 全书 '+stats.steps+' 步按篇目顺序核对；端点空间 '+stats.endpointSpaces+' 项，停留空间 '+stats.stays+' 项，空间所在地点 '+stats.locations+' 项，三界 '+stats.worlds+' 项');
