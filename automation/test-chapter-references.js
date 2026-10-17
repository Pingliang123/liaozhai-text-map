'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const data=JSON.parse(fs.readFileSync('assets/chapter-references.json','utf8'));
const bundle=JSON.parse(fs.readFileSync('data-package.json','utf8'));
assert.equal(Object.keys(data.chapters).length,491);assert.deepEqual(data.unmatched,[]);
for(const c of bundle.base.chapter_overview){const r=data.chapters[c.chapter_id];assert(r);assert(r.translation.length);assert(r.introduction.length);assert(r.source_files.length);}
assert.notEqual(data.chapters[19].source_files[0],data.chapters[456].source_files[0],'Same-title stories retain distinct sources');
assert.equal(data.chapters[144].title,'妾击贼');
assert(data.chapters[0].translation.join('').includes('这里记述的只是个大略情况'),'All segmented translations are retained');
class Element{
  constructor(){this.children=[];this.style={};this.listeners={};this.textContent='';}
  append(...c){this.children.push(...c);}
  replaceChildren(...c){this.children=c;}
  addEventListener(event,callback){this.listeners[event]=callback;}
}
const column=new Element(),context={window:{},document:{createElement:()=>new Element(),querySelector:()=>column}};
let resolve,calls=0;context.fetch=()=>{calls++;return new Promise(r=>{resolve=r;});};
vm.createContext(context);vm.runInContext(fs.readFileSync('assets/chapter-references.js','utf8'),context);
const panel=column.children[0],content=panel.children[1];
context.window.GhostMapReferences.render(0);assert.equal(calls,0,'Closed reference panel loads lazily');
panel.open=true;const pending=panel.listeners.toggle();context.window.GhostMapReferences.render(317);
resolve({ok:true,json:async()=>data});
pending.then(()=>{
  assert(content.children[0].textContent.includes(data.chapters[317].title),'Async load follows current chapter');
  context.window.GhostMapReferences.render(0);
  assert(content.children[0].textContent.includes('考城隍'));
  console.log('PASS: all 491 references, distinct homonyms, complete segmented translations and chapter switching');
}).catch(e=>{console.error(e);process.exitCode=1;});
