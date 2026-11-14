const test=require('node:test'),a=require('node:assert/strict');
const r=require('../reports/chapter-spatial-types-visualization.json'),s=require('../reports/spatial-topics-five-results.json');
test('all modeled chapters retain probabilities and reproducible PCA coordinates',()=>{
 a.equal(r.points.length,443);a.equal(new Set(r.points.map(p=>p.id)).size,443);
 for(const p of r.points){a.deepEqual(p.weights,s.chapter_topics.find(c=>c.id===p.id).weights);for(let k=0;k<2;k++){const v=p.weights.reduce((n,w,i)=>n+(w-r.mean[i])*r.components[k][i],0);a.ok(Math.abs(v-p[k?'y':'x'])<1e-8);}a.ok(p.events.every(e=>Object.hasOwn(r.colors,e)));}
 a.deepEqual(r.unassigned,s.input.empty_documents);
 a.ok(r.explained_variance_ratio.reduce((a,b)=>a+b,0)<=1.00000001);
});
test('interactive mode switches colors while retaining every chapter coordinate',()=>{
 const fs=require('fs'),vm=require('vm');
 class Element{constructor(){this.children=[];this.attrs={};this.value='';}append(x){this.children.push(x)}replaceChildren(){this.children=[]}setAttribute(k,v){this.attrs[k]=String(v)}querySelector(){return this.input||(this.input={})}}
 const elements=Object.fromEntries(['plot','tip','mode','legend','search'].map(k=>[k,new Element()]));elements.mode.value='topics';
 const document={querySelector:s=>elements[s.slice(1)],createElement:()=>new Element(),createElementNS:()=>new Element()};
 const page=fs.readFileSync(require.resolve('../reports/篇目空間主題_互動圖.html'),'utf8'),script=page.split('<script>')[1].split('</script>')[0];
 const context=vm.createContext({document,Math,Set,Object,Number});new vm.Script(script).runInContext(context);
 const coordinates=()=>elements.plot.children.map(g=>[g.attrs['data-id'],g.attrs['data-x'],g.attrs['data-y']]).sort((a,b)=>Number(a[0])-Number(b[0]));
 const before=coordinates();a.equal(before.length,443);a.equal(elements.legend.children.length,5);
 elements.mode.value='events';elements.mode.onchange();a.deepEqual(coordinates(),before);a.equal(elements.legend.children.length,6);
 elements.search.value='黄英';elements.search.oninput();a.ok(elements.tip.textContent.includes('黄英'));
});
