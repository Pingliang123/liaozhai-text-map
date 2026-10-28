'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),M=require('./ghost_map_model'),Routes=require('../assets/spatial-routes'),D=require('../assets/research-lab/current-data'),C=require('../assets/research-lab/chapter-spaces');
const pack=require('../data-package.json'),model=M.create(pack.base);model.importDocument(pack.revisions);const before=JSON.stringify(model.document()),chapters=D.snapshot(model);let missing=0,drawn=0;
for(const c of chapters){const raw=model.view(c.id),tokens=Routes.lexicon(raw).words;
 for(const w of [...c.places,...c.spaces,...c.times,...c.people.map(p=>p.word)])assert(tokens.has(w),c.title+'词项不在分词：'+w);
 for(const u of c.units)for(const w of u.token_words||[])assert(u.text.includes(w),'词项必须来自对应原文单位');
 const graph=C.build(c);assert(graph.edges.every(e=>!e.directed),'篇目空间图只能展示地点与空间关系');
 for(const n of graph.nodes){const originals=Object.keys(c.place_aliases).filter(w=>c.place_aliases[w]===n.label);assert(tokens.has(n.label)||originals.some(w=>tokens.has(w)),c.title+'生成了分词之外的节点：'+n.label);}
 const paths=C.build(c,{paths:true});for(const step of paths.itinerary){assert(tokens.has(step.from)||Object.values(c.place_aliases).includes(step.from));assert(tokens.has(step.to)||Object.values(c.place_aliases).includes(step.to));for(const actor of step.actors)assert(tokens.has(actor));drawn++;}
 missing+=c.lexical_omissions.length;
}
assert.equal(JSON.stringify(model.document()),before,'不覆盖任何分词与人工修订');
const fixture={source_units:[{unit:1,text:'王自济南至金陵，入室。',tokens:[[0,1],[1,2],[2,4],[4,5],[5,7],[8,9],[9,10]]}],places:[{word:'济南'},{word:'金陵'}],space_words:['室'],people:[{word:'王'}],narrative_events:[{unit:1,from_space:'济南王氏私宅',to_space:'金陵',transition_kind:'movement',actors:'王、金陵客',quote:'王自济南至金陵，入室。'}]};
const p=Routes.project(fixture,[],{name:s=>s,simplify:s=>s});assert.equal(p[0].from_space,'济南');assert.equal(p[0].to_space,'金陵');assert.equal(p[0].actors,'王');assert.equal(p[0].original_from_space,'济南王氏私宅');assert.equal(Routes.lexicalEndpoint('空想花园',fixture),'');assert.equal(Routes.lexicalEndpoint('济南与金陵之间',fixture),'','多地端点不可任选其一');
const chronology=Routes.project({...fixture,source_units:[...fixture.source_units,{unit:2,text:'王归济南。',tokens:[[0,1],[1,2],[2,4]]}],narrative_events:[{unit:2,from_space:'金陵',to_space:'济南',quote:'王归济南。',transition_kind:'movement'},...fixture.narrative_events]},[],{name:s=>s,simplify:s=>s});assert.deepEqual(chronology.map(r=>r.unit),[1,2]);
const report={chapters:chapters.length,omitted_terms:missing,drawn_steps:drawn,policy:'原典分词词项；已对齐修订分词优先，否则用原典词位分词。原始人工标注保留。',items:chapters.filter(c=>c.lexical_omissions.length||c.token_basis.includes('未全文对齐')).map(c=>({id:c.id,title:c.title,token_basis:c.token_basis,terms:c.lexical_omissions,unresolved_routes:c.route_steps.filter(r=>r.transition_kind==='movement'&&(!r.from_space||!r.to_space)).map(r=>({index:r.index,from:r.original_from_space,to:r.original_to_space,quote:r.quote}))}))};
if(process.argv.includes('--report'))fs.writeFileSync('reports/source-token-network-audit-20261028.json',JSON.stringify(report,null,2));
console.log('PASS 全书词项来源、图与路径分离、别名追溯、原典位置、人物、顺序及人工资料保留；'+drawn+'条可绘步骤，'+missing+'条词项待对齐');
