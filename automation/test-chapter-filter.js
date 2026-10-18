'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),A=require('../audit-reports.js');
const chapters=[{chapter_id:0,chapter:'甲',event_types:{人:1}},{chapter_id:33,chapter:'乙',event_types:{鬼:1,妖:1}},{chapter_id:34,chapter:'丙',search_title:'丙',event_types:{}}];
const model={ids:[0,33,34],view:id=>chapters.find(c=>c.chapter_id===id),simplify:s=>s};
assert.deepEqual(A.chapterChoices(model,'','pending'),[34]);assert.deepEqual(A.chapterChoices(model,'','known'),[0,33]);assert.deepEqual(A.chapterChoices(model,'乙','pending'),[]);
let pending=new Map(),counter=0,calls=0,last;const timers={setTimeout:fn=>{pending.set(++counter,fn);return counter;},clearTimeout:id=>pending.delete(id)};
const debounced=A.debounce(value=>{calls++;last=value;},180,timers);debounced('a');debounced('ab');debounced('abc');assert.equal(pending.size,1);[...pending.values()][0]();assert.equal(calls,1);assert.equal(last,'abc');
const html=fs.readFileSync('index.html','utf8'),nodes={};
function node(id){return nodes[id]??={value:'',hidden:false,disabled:false,children:[],listeners:{},replaceChildren(...children){this.children=children;},addEventListener(type,fn){this.listeners[type]=fn;}};}
node('chapter-event-status').value='pending';
const state={chapter:0,dirty:false,unpersisted:false};let chosen=null;
const context={model,state,reportDraft:false,GhostMapAuditReports:A,M:{EVENTS:['人','鬼','妖','神']},$:node,
  element:(_tag,attributes,text)=>({...attributes,text}),message:(id,text)=>{node(id).text=text;},chooseChapter:id=>{chosen=id;state.chapter=id;}};
vm.createContext(context);
vm.runInContext(html.slice(html.indexOf('  function matchingChapters()'),html.indexOf('  function personRow(')),context);
vm.runInContext(html.slice(html.indexOf("  $('chapter-event-status').addEventListener"),html.indexOf("  $('clear-chapter-search').addEventListener")),context);
node('chapter-event-status').listeners.change();assert.equal(chosen,34);context.populateChapters();assert.equal(node('chapter-select').children.length,1);
state.chapter=0;state.dirty=true;chosen=null;node('chapter-event-status').listeners.change();assert.equal(chosen,null);assert(node('chapter-select').children[0].text.includes('筛选外'));
chapters[2].event_types={鬼:1};context.populateChapters();assert(node('chapter-search-status').text.includes('找到 0 篇'));assert.equal(node('chapter-next').disabled,true);
assert(html.includes("'chapter-select', 'chapter-event-status'].includes(event.target.id)"));
console.log('PASS: pending/known filters, title intersection, scoped navigation, unsaved drafts, no-result state and search debounce');
