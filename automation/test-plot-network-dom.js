const assert=require('assert/strict'),fs=require('fs'),vm=require('vm');
class Element{
 constructor(tag){this.tag=tag;this.children=[];this.attrs={};this.listeners={};this.textContent='';this.value='';}
 append(...nodes){this.children.push(...nodes);if(this.tag==='select'&&!this.value&&nodes[0])this.value=String(nodes[0].value);}
 replaceChildren(...nodes){this.children=[];this.append(...nodes);}
 setAttribute(k,v){this.attrs[k]=String(v);}
 addEventListener(k,fn){this.listeners[k]=fn;}
}
const document={createElement:t=>new Element(t),createElementNS:(_,t)=>new Element(t)},window={};
vm.runInNewContext(fs.readFileSync('assets/research-lab/network.js','utf8'),{document,window,Blob,URL,setTimeout});
const root=new Element('main'),step={from:'室',to:'庭',actors:'张生',quote:'出室至庭。',unit:7};let exported;
window.GhostPlotNetwork.mount(root,[{id:0,title:'甲',steps:Array.from({length:14},()=>({...step}))}],rows=>exported=rows);
const all=(node,tag)=>[...(node.tag===tag?[node]:[]),...node.children.flatMap(n=>typeof n==='object'?all(n,tag):[])];
assert(all(root,'svg').length===1);assert.equal(all(root,'g').length,12);assert.equal(exported.length,3);
all(root,'g')[0].listeners.click();assert(all(root,'blockquote').some(x=>x.textContent==='出室至庭。'));
const next=all(root,'button').find(b=>b.textContent==='下一页');next.onclick();assert.equal(all(root,'g').length,2);
const view=all(root,'select')[1];view.value='relations';view.onchange();assert.equal(all(root,'line').length,2);
all(root,'g')[0].listeners.keydown({key:'Enter',preventDefault(){}});assert(all(root,'blockquote').length>0);
const empty=new Element('main');window.GhostPlotNetwork.mount(empty,[],()=>{});assert(all(empty,'p').some(x=>x.textContent==='当前范围没有情节步骤。'));
console.log('PASS browser interaction harness: first chapter, pagination, view switch, click/keyboard evidence, empty filter and CSV rows');
