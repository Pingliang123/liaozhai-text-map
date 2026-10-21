const assert=require('node:assert/strict');
const Y=require('../assets/research-lab/yi-network');
const c={id:1,title:'示例',places:['济南','金陵'],spaces:['寺'],people:[{word:'王生',types:['人']}],events:['鬼'],units:[{id:0,text:'王生自济南至金陵，宿寺。'}],steps:[{kind:'movement',from:'济南',to:'金陵',actors:['王生'],quote:'王生自济南至金陵，宿寺。',unit:0},{kind:'movement',from:'金陵',to:'济南',actors:['王生'],quote:'王生自济南至金陵，宿寺。',unit:0},{kind:'movement',from:'某处',to:'济南',actors:[],quote:'王生自济南至金陵，宿寺。',unit:0},{kind:'movement',from:'济南',to:'金陵',quote:'不存在的句子'}]};
const before=JSON.stringify(c),g=Y.build([c]);
assert.equal(JSON.stringify(c),before,'Manual annotations are never mutated');
assert.equal(g.incidence.edges.length,2);
assert.equal(g.cooccurrence.edges.length,1);
assert.equal(g.movement.edges.length,2,'Opposite directions remain separate');
assert(g.movement.edges.every(e=>e.directed&&e.weight===1));
assert.equal(g.records.length,3,'Unverifiable quotation excluded');
assert.equal(g.unresolved.length,2);
assert.deepEqual(g.records[0].people,[{word:'王生',types:['人']}]);
assert.deepEqual(g.records[0].events,['鬼'],'Human character is not retyped from chapter ghost event');
assert.equal(g.records[0].sequence,1);
assert(!g.movement.nodes.some(n=>n.label==='某处'));
const real=Y.build(require('../assets/research-lab/data.json').chapters);
assert(real.incidence.edges.length>0&&real.records.length>0);
assert(real.movement.edges.every(e=>e.evidence.length===e.weight&&e.directed));
console.log('PASS typed incidence, directed movement, evidence provenance and unchanged source annotations');
const fs=require('fs'),vm=require('vm');
class Element{
 constructor(tag,text=''){this.tag=tag;this.textContent=text;this.children=[];this.value='';}
 append(...items){this.children.push(...items);if(this.tag==='select'&&!this.value)this.value=items[0]?.value||items[0]?.textContent||'';}
 replaceChildren(...items){this.children=[];this.append(...items);}
 setAttribute(k,v){this[k]=v;}
 get selectedOptions(){return this.children.filter(n=>(n.value||n.textContent)===this.value);}
}
const calls=[],window={GhostPlaceSpaces:require('../assets/research-lab/place-spaces'),GhostBookNetwork:{mount:(out,chapters,exporter,options)=>calls.push(options)}},context={window,document:{createElement:tag=>new Element(tag)}};
vm.createContext(context);vm.runInContext(fs.readFileSync('assets/research-lab/yi-network.js','utf8'),context);
const out=new Element('main');let csv;window.GhostYiNetwork.mount(out,[c],rows=>csv=rows);
const all=n=>[n,...n.children.flatMap(all)],controls=all(out),mode=controls.find(n=>n['aria-label']==='选择关系类型');
mode.value='movement';mode.onchange();assert(calls.at(-1).weightedDirected);assert(calls.at(-1).graph.edges.every(e=>e.directed));
assert(!controls.some(n=>n['aria-label']==='筛选篇目异事'),'异事筛选沿用页面唯一入口');assert.equal(csv.length,4);
const search=controls.find(n=>n['aria-label']==='检索异与空间证据');search.value='无此人物';search.oninput();assert.equal(csv.length,1);
console.log('PASS relationship switch, directed display and synchronized filtered evidence export');
