const assert=require('assert/strict'),fs=require('fs'),vm=require('vm');
class Element{constructor(tag){this.tag=tag;this.children=[];this.attrs={};this.listeners={};this.style={};this.value='';this.textContent='';}append(...nodes){this.children.push(...nodes);if(this.tag==='select'&&!this.value&&nodes[0])this.value=String(nodes[0].value);}replaceChildren(...nodes){this.children=[];this.value=this.tag==='select'?'':this.value;this.append(...nodes);}setAttribute(k,v){this.attrs[k]=String(v);}addEventListener(k,fn){this.listeners[k]=fn;}}
const all=(n,tag)=>[...(n.tag===tag?[n]:[]),...n.children.flatMap(x=>typeof x==='object'?all(x,tag):[])];
const document={createElement:t=>new Element(t),createElementNS:(_,t)=>new Element(t)},window={};vm.runInNewContext(fs.readFileSync('assets/research-lab/book-network.js','utf8'),{document,window,Blob,URL,setTimeout:fn=>{fn();return 1;},clearTimeout(){}});
window.GhostNetworkAnalysis=require('../assets/research-lab/network-analysis');
const root=new Element('main'),c=id=>({id,title:'篇'+id,places:['济南'],spaces:['寺'],people:[{word:'王生'}],units:[{id:1,text:'济南王生宿寺。'}]});let rows;window.GhostBookNetwork.mount(root,[c(0),c(1)],r=>rows=r);
assert(all(root,'h2').some(n=>n.textContent==='哪些篇目共享空间？'));
assert(all(root,'h2').some(n=>n.textContent==='Louvain 群组'));
const color=all(root,'select').find(n=>n.attrs['aria-label']==='网络配色');assert(color);color.value='kind';color.onchange();assert(all(root,'circle').every(n=>n.attrs.fill.startsWith('#')));color.value='community';color.onchange();assert(all(root,'circle').every(n=>n.attrs.fill.startsWith('hsl')));
assert(all(root,'summary').some(n=>n.textContent==='移除这个节点会怎样？'));
assert(all(root,'td').some(n=>n.textContent==='100.0%'));
const comparison=all(root,'select').find(n=>n.attrs['aria-label']==='比较词类');comparison.value='place';comparison.onchange();assert(all(root,'td').some(n=>n.textContent==='地点：济南'));
all(root,'button').find(n=>n.textContent==='篇1').onclick();assert(all(root,'circle').length>0);
assert.equal(all(root,'circle').length,6);assert(rows.length>1);assert(all(root,'blockquote').length>0);
const input=all(root,'input')[0];input.value='不存在';input.oninput();assert.equal(all(root,'circle').length,0);assert.equal(rows.length,1);
input.value='济南';input.oninput();assert(all(root,'circle').length>0);const go=all(root,'button').find(n=>n.textContent==='以此为中心展开');go.onclick();assert.equal(input.value,'');assert(all(root,'blockquote').length>0);
console.log('PASS full-book UI: graph display, search miss/recovery, linked-node expansion, evidence and filtered export');
