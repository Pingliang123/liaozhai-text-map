'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');
class E{
 constructor(tag){this.tag=tag;this.children=[];this.dataset={};this.attrs={};this.style={};this.value='';this.textContent='';this.disabled=false;}
 append(...nodes){for(const n of nodes){this.children.push(n);n.parent=this;}if(this.tag==='select'&&!this.value)this.value=String(this.children[0]?.value||'');}
 replaceChildren(...nodes){this.children.forEach(n=>n.parent=null);this.children=[];this.append(...nodes);}
 after(){} setAttribute(k,v){this.attrs[k]=v;}getAttribute(k){return this.attrs[k];}querySelector(){return null;}
 get isConnected(){return this.root||!!this.parent?.isConnected;}
}
const ids=Object.fromEntries(['chapter','event','view','snapshot','status','export'].map(id=>[id,new E(id==='chapter'||id==='event'?'select':'div')]));for(const n of Object.values(ids))n.root=true;
const tabs=['relations','words','topics'].map(tab=>{const n=new E('button');n.dataset.tab=tab;return n;}),events={};
let calls=0,draws=0,topic,lateExport;
const chapters=[{id:2,title:'尸变',events:['鬼'],spaces:['室'],places:['阳信'],people:[],steps:[],units:[{id:1,text:'入室见鬼。'}]},{id:3,title:'种梨',events:['神'],spaces:['市'],places:[],people:[],steps:[],units:[]}];
const context={document:{getElementById:id=>ids[id],createElement:t=>new E(t),querySelectorAll:()=>tabs,addEventListener(){}},location:{href:'https://example.test/lab/?tab=relations&chapter=2',search:'?tab=relations&chapter=2'},history:{replaceState(a,b,url){context.location.href=String(url);context.location.search=new URL(url).search;}},URL,URLSearchParams,Node:E,Event:class{},setTimeout,clearTimeout,addEventListener:(name,fn)=>events[name]=fn,GhostLabData:{async load(){calls++;return {chapters,placeRecords:{},origin:'test',revision_hash:'stable'};}},GhostPlaceSpaces:{mount(out,cs,exporter){draws++;assert.equal(cs[0].id,2);exporter([['header'],['row']]);}},GhostYiNetwork:{mount(){}},GhostTopicPlaces:{mount(out,cs,exporter){topic=out;lateExport=exporter;}},console};context.window=context;vm.createContext(context);vm.runInContext(fs.readFileSync('assets/research-lab/lab.js','utf8'),context);
const tick=()=>new Promise(resolve=>setImmediate(resolve));
(async()=>{
 await tick();assert.equal(ids.chapter.value,'2');assert.match(ids.status.textContent,/1 篇/);assert.equal(draws,1);assert.equal(ids.export.disabled,false);
 events.focus();await new Promise(r=>setTimeout(r,450));await tick();assert.equal(calls,2);assert.equal(draws,1,'Unchanged data must not redraw the graph');
 tabs[2].onclick();const oldTopic=topic;tabs[1].onclick();assert.equal(oldTopic.isConnected,false,'Late topic requests receive a detached container');
 lateExport([['stale'],['row']]);assert.equal(ids.export.disabled,false,'A stale exporter cannot replace current rows');
 ids.event.value='神';ids.event.onchange();assert(new URL(context.location.href).searchParams.get('event')==='神');assert.equal(ids.export.disabled,true);assert.match(ids.view.children[0].children[0].textContent,/没有符合/);
 console.log('PASS lab state: chapter deep links, filter URLs, no-op refresh, async view isolation, current exports and empty results');
})().catch(e=>{console.error(e);process.exitCode=1;});
