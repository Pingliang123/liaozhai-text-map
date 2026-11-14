const test=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('association table embeds model results and filters all 95 tests',()=>{
 class Element{constructor(){this.children=[];this.value='';this.checked=false;}append(x){this.children.push(x)}replaceChildren(){this.children=[]}}
 const el=Object.fromEntries(['k','type','sig','rows'].map(k=>[k,new Element()]));
 const document={querySelector:s=>el[s.slice(1)],createElement:()=>new Element()};
 const html=fs.readFileSync(require.resolve('../reports/全書詞彙_三六十主題類型比較.html'),'utf8'),script=html.split('<script>')[1].split('</script>')[0];
 const d=require('../reports/allword-topic-counts-events.json');
 a.deepEqual(JSON.parse(script.slice(script.indexOf('const D=')+8,script.indexOf(';function draw'))),d);
 new vm.Script(script).runInContext(vm.createContext({document}));a.equal(el.rows.children.length,95);
 el.k.value='6';el.k.onchange();a.equal(el.rows.children.length,30);
 el.type.value='狐';el.type.onchange();a.equal(el.rows.children.length,6);
 el.sig.checked=true;el.sig.onchange();a.equal(el.rows.children.length,d.associations.filter(r=>r.k===6&&r.event==='狐'&&r.global_bh_q<.05).length);
});
