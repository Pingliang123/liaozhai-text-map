'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const G=require('../assets/vocabulary-grid'),O=require('../assets/otherworld-map');
class E{
 constructor(tag){this.tag=tag;this.children=[];this.value='';this.listeners={};this.dataset={};this.textContent='';}
 append(...nodes){this.children.push(...nodes);}replaceChildren(...nodes){this.children=nodes;}
 setAttribute(k,v){this[k]=v;}addEventListener(k,fn){this.listeners[k]=fn;}
 contains(n){return this===n||this.children.some(c=>c.contains(n));}
 querySelectorAll(s){return this.children.flatMap(c=>[...(s.split(',').includes(c.tag)?[c]:[]),...c.querySelectorAll(s)]);}
}
global.document={createElement:tag=>new E(tag)};global.GhostPlaceReview=require('../assets/place-review');
const rows=[{kind:'places',word:'金陵',chapter:'甲',chapter_id:0,key:'places:金陵',present:true},
 {kind:'spaces',word:'室',chapter:'甲',chapter_id:0,key:'spaces:室',present:true},
 {kind:'people',word:'王',chapter:'甲',chapter_id:0,key:'people:王',present:false,status:'pending'}];
assert.equal(G.filter(rows).length,2);assert.equal(G.filter(rows,{scope:'pending'}).length,1);
assert.equal(G.filter(rows,{scope:'unmapped',unmapped:new Set(['金陵'])}).length,1);
const root=new E('main'),chapter={chapter:'甲',places:[{word:'金陵'}],source_units:[{text:'赴金陵。'}]},calls=[];
const grid=G.mount(root,{ids:[0],chapter:()=>chapter,rows:()=>[rows[0]],simplify:x=>x,normalize:x=>x,unmapped:()=>new Set(),draft(){},unitStream:()=> '赴金陵 / 。',save:(r,e)=>calls.push(e)});
assert.equal(root.querySelectorAll('table').length,0,'Do not scan the corpus until editing is requested');grid.open();
const find=(tag,name)=>root.querySelectorAll(tag).find(n=>n['aria-label']===name);
find('input','修订词语').value='金陵';find('input','修订词语').listeners.input();assert(grid.hasDraft());find('input','修订词语').listeners.change();assert.equal(find('textarea','所在句分词').value,'赴 / 金陵 / 。');
root.querySelectorAll('tr').at(-1).listeners.keydown({ctrlKey:true,key:'Enter',preventDefault(){}});assert.equal(calls.length,1);assert.equal(calls[0].word,'金陵');assert.equal(calls[0].unitIndex,0);assert(!grid.hasDraft());
const node={realm:'地界',space:'冥府',chapter_id:0,chapter:'甲',id:'a',excerpt:'诉之冥府。',review:{kind:'mention'}};
const evidence=[node,node,{...node,id:'b',space:'仙人岛',realm:'天界',review:{kind:'crossing'}},{...node,id:'c',review:{kind:'reject'}}];
assert.equal(O.nodes(evidence).length,2);assert.equal(O.nodes(evidence).find(n=>n.name==='冥府').evidence.length,1);
assert(!Object.hasOwn(O.nodes(evidence)[0],'lon'),'Otherworld nodes must not invent coordinates');
let read;const realm=new E('details');O.render(realm,evidence,{place:'济南',read:id=>read=id});
assert(realm.querySelectorAll('blockquote').some(n=>n.textContent==='诉之冥府。'));realm.querySelectorAll('button').find(n=>n.textContent==='阅读《甲》').onclick();assert.equal(read,0);
assert(realm.querySelectorAll('p').some(n=>n.className==='otherworld-mention'));
const html=fs.readFileSync('index.html','utf8');for(const s of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))if(s[1].trim()&&!s[0].includes('application/json'))new vm.Script(s[1]);
assert(html.includes("GhostVocabularyGrid.mount(vocabularySection"));assert(html.includes("const entrance=element('div');entrance.append(button('在词汇表中修改'"));
assert(html.includes('GhostPlaceReview.replaceUnit(c.segmentation_note||segmented(c)'));assert(html.includes('persist(proposed.document());reportRows=null;renderChapter();updateResults();'));
assert(html.includes("GhostOtherworldMap.render(otherworldPanel,links"));assert(html.includes("slice(0,3).entries()"));
assert(fs.readFileSync('assets/research-lab/index.html','utf8').includes('edit-entrance.js'));
assert(fs.readFileSync('.github/workflows/publish-updates.yml','utf8').includes('node automation/test-unified-vocabulary.js'));
console.log('PASS unified vocabulary filtering, lazy grid, keyboard save, source boundaries, shared persistence and symbolic otherworld nodes');
