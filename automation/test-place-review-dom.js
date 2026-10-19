const assert=require('assert/strict'),P=require('../assets/place-review');
class E{constructor(tag,text){this.tag=tag;this.textContent=text||'';this.children=[];this.value='';this.listeners={};}append(...xs){this.children.push(...xs);}replaceChildren(...xs){this.children=xs;}setAttribute(k,v){this[k]=v;}addEventListener(k,f){this.listeners[k]=f;}contains(n){return this===n||this.children.some(x=>x.contains(n));}querySelectorAll(s){const tags=s.split(',');return this.children.flatMap(x=>[...(tags.includes(x.tag)?[x]:[]),...x.querySelectorAll(s)]);}}
global.document={createElement:t=>new E(t)};const root=new E('main'),c={source_units:[{text:'赴金陵。',tokens:[[0,3],[3,4]]}],lexical_reviews:{}},row={kind:'places',word:'金陵',chapter:'甲',chapter_id:0,key:'places:金陵',present:true};let saved;
P.mount(root,{rows:()=>[row],chapter:()=>c,unitStream:()=> '赴金陵 / 。',save:(r,e)=>{saved=e;}});
assert.equal(root.querySelectorAll('blockquote')[0].textContent,'赴金陵。');
const fields=root.querySelectorAll('select');assert.deepEqual(fields[1].children.map(x=>x.value),['places','spaces','none']);fields[1].value='spaces';
const synonym=root.querySelectorAll('input').find(n=>n.list);synonym.value='南京';const area=root.querySelectorAll('textarea')[0];area.value='赴 / 金陵 / 。';area.listeners.input();assert(root.querySelectorAll('input')[0].disabled);
root.querySelectorAll('button').find(n=>n.textContent==='保存').onclick();assert.equal(saved.kind,'spaces');assert.equal(saved.canonical,'南京');assert.equal(saved.tokens,'赴 / 金陵 / 。');assert.equal(saved.unitIndex,0);
console.log('PASS visible sentence, three classifications, synonym choice, token editing and save payload');
