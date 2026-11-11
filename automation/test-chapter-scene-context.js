'use strict';
const assert=require('node:assert/strict');
const C=require('../assets/path-columns');
const {createChapterContext}=require('./chapter-scene-context');
const chapter={source_units:[
 {unit:1,text:'济南甲居卧室。',tokens:['济南','甲','居','卧室','。']},
 {unit:2,text:'甲与客谈。',tokens:['甲','与','客','谈','。']},
 {unit:3,text:'半年医药始愈。',tokens:['半年','医药','始','愈','。']},
 {unit:4,text:'河南缺一城隍。',tokens:['河南','缺','一','城隍','。']},
 {unit:5,text:'甲入冥府。',tokens:['甲','入','冥府','。']}
 ],places:[{word:'济南'},{word:'河南'}],space_words:['卧室','冥府'],people:[{word:'甲'}],realm_evidence:[{space:'冥府',realm:'地界'}]};
const apply=createChapterContext(chapter,new Set(['济南','河南']));
function row(unit,quote,kind='plot'){
 const values=C.headers.map(()=>'');
 apply(values,{actors:'甲',source_event:{unit},quote,space:'',transition_kind:kind,has_movement:kind==='movement'});
 return Object.fromEntries(C.headers.map((h,i)=>[h,values[i]]));
}
const dialogue=row(2,'甲与客谈。');
assert.equal(dialogue.停留空间,'卧室');assert.equal(dialogue.停留空间所在地点,'济南');
assert.ok(dialogue.双端证据.includes('济南甲居卧室。'));
assert.equal(row(3,'半年医药始愈。').停留空间,'','时间跳跃后不继承旧停留处');
const appointment=row(4,'河南缺一城隍。');assert.equal(appointment.停留空间,'');
const underworld=row(5,'甲入冥府。','movement');
assert.equal(underworld.到达空间,'冥府');assert.equal(underworld.到达世界分类,'地界');assert.equal(underworld.到达空间所在地点,'');
const fresh=createChapterContext(chapter,new Set(['济南','河南'])),empty=C.headers.map(()=>'');
fresh(empty,{source_event:{unit:999},quote:'未知引句',actors:'甲'});
assert.equal(empty[C.headers.indexOf('停留空间')],'');
console.log('PASS 全篇场景承接、人物连续性、时间跳跃及异境地理隔离');
