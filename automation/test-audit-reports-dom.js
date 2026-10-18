'use strict';
// Small deterministic DOM harness: test interaction logic without a network or browser account.
const assert=require('node:assert/strict'),A=require('../audit-reports.js');
class Node {
  constructor(tag,doc,text=''){this.tagName=tag;this.ownerDocument=doc;this.children=[];this.attributes={};this.listeners={};this.textContent=text;this.value='';this.checked=false;}
  setAttribute(k,v){this.attributes[k]=v;if(k==='value')this.value=v;if(k==='open')this.open=true;}
  append(...nodes){this.children.push(...nodes);}
  replaceChildren(...nodes){this.children=[...nodes];}
  insertBefore(n,before){this.children.splice(this.children.indexOf(before),0,n);}
  addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);}
  async dispatch(type){for(const fn of this.listeners[type]||[])await fn();}
  querySelectorAll(selector){return this.children.flatMap(n=>n instanceof Node?[...(n.tagName===selector||selector==='input:checked'&&n.tagName==='input'&&n.checked?[n]:[]),...n.querySelectorAll(selector)]:[]);}
}
const doc={createElement:tag=>new Node(tag,doc),createTextNode:text=>new Node('#text',doc,text)};
const container=new Node('div',doc),chapters=[{chapter_id:0,chapter:'甲',event_types:{人:1},places:[]},{chapter_id:33,chapter:'乙',event_types:{鬼:1,妖:1},places:[{word:'济南'}]},{chapter_id:34,chapter:'丙',event_types:{},places:[]}];
const model={ids:[0,33,34],view:id=>chapters.find(c=>c.chapter_id===id),editable:id=>structuredClone(chapters.find(c=>c.chapter_id===id)),simplify:s=>s};
let scope='',allow=true,saves=0,lastOpen=null,barValues,pieValues;
const panel=A.mount({model,container,chapter:()=>scope,canEdit:()=>allow,bars:(_n,v)=>barValues=v,pie:(_n,v)=>pieValues=v,
  save:(id,draft)=>{saves++;model.view(id).event_types=draft.event_types;},open:(...args)=>lastOpen=args});
(async()=>{
  panel.render();assert.equal(pieValues.reduce((n,r)=>n+r[1],0),3);assert(barValues.some(r=>r[0]==='未定'&&r[1]===1));
  const events=container.children[0],filter=events.querySelectorAll('select')[0];filter.value='鬼';await filter.dispatch('change');
  assert.equal(events.querySelectorAll('tbody')[0].children.length,1);
  const inputs=events.querySelectorAll('tbody')[0].querySelectorAll('input');inputs[0].checked=true;await inputs[0].dispatch('change');assert(inputs.slice(1).every(n=>!n.checked));
  const save=events.querySelectorAll('button').find(n=>n.textContent==='保存');allow=false;await save.dispatch('click');assert.equal(saves,0);
  allow=true;await save.dispatch('click');assert.equal(saves,1);assert.deepEqual(model.view(33).event_types,{人:1});
  scope='34';panel.render();assert.equal(events.querySelectorAll('tbody')[0].children[0].children[0].attributes.colspan,'4');
  filter.value='';await filter.dispatch('change');assert.equal(events.querySelectorAll('tbody')[0].children.length,1);
  await events.querySelectorAll('button').find(n=>n.textContent==='查看原文').dispatch('click');assert.deepEqual(lastOpen,[34,'workspace']);
  const records=container.children[1];scope='';global.fetch=async()=>({ok:true,json:async()=>({entries:[{chapter_id:33,chapter:'乙',kind:'term',proposal:{term:'济南',category:'place',action:'add',quote:'至济南',reason:'地名'},state:'applied',reason:''}]})});
  records.open=true;await records.dispatch('toggle');assert(records.querySelectorAll('table').length===1);
  await records.querySelectorAll('button').find(n=>n.textContent==='核对 / 修改').dispatch('click');assert.deepEqual(lastOpen,[33,'place-panel']);
  console.log('PASS: table filtering, scoped charts, type exclusivity, draft lock, save, records load and edit links');
})().catch(error=>{console.error(error);process.exitCode=1;});
