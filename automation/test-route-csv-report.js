'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const report=require('../assets/route-csv-report');
const rows=report.parse(fs.readFileSync('reports/聊齋空間路徑_精簡版.csv','utf8'));
assert.equal(rows.length,8461);
assert.equal(report.parse('\ufeff篇号,篇名,出发空间,到达空间,停留空间,原文\r\n1,例,,,室,"有逗号,及""引号"""\r\n')[0].原文,'有逗号,及"引号"');
const fixture=[
 {'篇号':'1','出发空间':'室','出发使用方式':'私人','出发世界分类':'人间','到达空间':'庭','到达世界分类':'人间'},
 {'篇号':'1','出发空间':'室','到达空间':'庭'},
 {'篇号':'2','停留空间':'室、室','停留世界分类':'地界'}
];
const counted=report.aggregate(fixture,['出发','到达','停留'],'count');
assert.equal(counted.spaces.find(item=>item.label==='室').value,3);
assert.equal(counted.transitions[0].value,2);
assert.equal(counted.access.reduce((sum,item)=>sum+item.value,0),5);
assert.equal(counted.worlds.find(item=>item.label==='地界').value,1);
assert.equal(report.aggregate(fixture,['停留'],'count').spaces.length,1);
assert.equal(report.aggregate(fixture,['出发','到达','停留'],'chapters').spaces.find(item=>item.label==='室').value,2);
assert.deepEqual(report.aggregate([],['出发'],'count').worlds,[]);
const totals=report.aggregate(rows,['出发','到达','停留'],'count');
assert.ok(totals.places.length>0&&totals.transitions.length>0);
console.log('PASS 路径图表 CSV、角色筛选、篇数去重、次数及原文关联');
