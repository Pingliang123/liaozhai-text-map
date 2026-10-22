'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),M=require('./ghost_map_model');
const html=fs.readFileSync('index.html','utf8'),context={};vm.createContext(context);
const source=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(x=>x[1]).find(x=>x.includes('const api = {COLORS, projection'));
vm.runInContext(source,context);const G=context.GhostMapGeometry,p=require('../data-package.json'),m=M.create(p.base);m.importDocument(p.revisions);
const before=JSON.stringify(m.document());
context.allPlaces=()=>m.places();context.matchesLayer=()=>true;context.filteredChapters=(p,aggregate=false)=>m.atPlace(p,aggregate);
const start=html.indexOf('  function currentPlaces()'),end=html.indexOf('\n  function renderPlace()',start);vm.runInContext(html.slice(start,end),context);
const points=context.currentPlaces();
for(const word of ['江苏','安徽','四川','甘肃']){const p=points.find(p=>p.name===word);assert(p,'保留下级有关联篇目的省域');assert.equal(p.chapters.length,0,'不伪造直接提及');assert(p.context_chapters.length>0);}
assert(points.some(p=>p.name==='吕宋国'));
for(const [width,height]of [[1000,600],[600,500],[300,460]]){
 const project=G.projection(points.map(p=>[p.lon,p.lat]),width,height,36),input=points.map(p=>({...p,xy:project([p.lon,p.lat])}));
 const visible=G.visiblePoints(input,{k:1,x:0,y:0},width,height);
 assert.equal(visible.length,points.length,'总览不因缩放等级、距离或预算删除已定位点');
 assert(visible.some(p=>p.name==='吕宋国'));assert(visible.some(p=>p.prominent===false),'低层级和密集点保留为小点');
 assert(visible.filter(p=>p.prominent).length<=60,'醒目标记仍有疏密控制');
 const county=points.find(p=>p.admin_level==='county'),selected=G.visiblePoints(input,{k:1,x:0,y:0},width,height,county.id);
 assert(selected.find(p=>p.id===county.id).prominent,'选定下级地点立即突出显示');
 assert(G.labels(selected,width,height,county.id).some(p=>p.id===county.id),'选定地点有名称');
 for(const point of visible)assert.deepEqual([...point.display],[...point.anchor],'不移动地理位置');
}
assert(html.includes("$('movement-controls').insertBefore(movementDiagram,$('movement-status'))"),'示意放在地图外');
assert(!html.includes('state.height-108'),'不再遮住地图底部');
assert.equal(JSON.stringify(m.document()),before,'不改人工定位及篇目资料');
console.log('PASS '+points.length+'个有直接或下级篇目的定位点均保留；吕宋国、上下级区分、选定名称与地图外示意');
