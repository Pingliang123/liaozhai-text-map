'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const dir=path.resolve(process.argv[2]||'.'),html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const M=require(path.join(dir,'automation/ghost_map_model.js')),bundle=JSON.parse(fs.readFileSync(path.join(dir,'data-package.json'),'utf8'));
const model=M.create(bundle.base);model.importDocument(bundle.revisions);
const province=model.places().find(p=>p.name==='山东');
const direct=model.atPlace(province),total=model.atPlace(province,true),children=model.descendants(province);
assert(total.length>direct.length,'Province must include child chapters');
for(const member of children)for(const c of model.atPlace(member))assert(total.some(row=>row.chapter_id===c.chapter_id));
const controls={'place-count-scope':{value:'direct'},'movement-place-scope':{value:'direct'}};
let updates=0,dates=0;
const context={model,$:id=>controls[id],aggregatePlaces:()=>controls['place-count-scope'].value==='aggregate',updateResults:()=>updates++,renderChronology:()=>dates++,filteredChapters:p=>model.atPlace(p,controls['place-count-scope'].value==='aggregate')};
vm.createContext(context);
for(const name of ['routeAggregatePlaces','changeRegionScope','regionalRealmLinks']){
  const start=html.indexOf('  function '+name+'(');assert(start>=0);
  const end=html.indexOf('\n  }',start)+4;
  const source=name==='routeAggregatePlaces'?html.slice(start,html.indexOf('\n',start)):html.slice(start,end);
  vm.runInContext(source,context);
}
context.changeRegionScope('aggregate');assert.equal(controls['movement-place-scope'].value,'aggregate');assert(context.routeAggregatePlaces());
context.changeRegionScope('direct');assert.equal(controls['place-count-scope'].value,'direct');assert(!context.routeAggregatePlaces());assert.equal(updates,2);assert.equal(dates,2);
const directEvidence=context.regionalRealmLinks(province);
context.changeRegionScope('aggregate');const evidence=context.regionalRealmLinks(province);
assert(evidence.length>=directEvidence.length);
const expected=new Set([province,...children].flatMap(p=>model.links(p,new Set(total.map(c=>c.chapter_id)))).map(e=>e.chapter_id+'|'+e.id+'|'+e.realm+'|'+e.unit+'|'+e.space));
assert.equal(evidence.length,expected.size,'Every child evidence must appear once');
for(const e of evidence){assert(e.region_places.length);if(e.review.kind==='crossing')assert(e.region_places.some(name=>model.name(name)===model.name(e.review.origin_place)),'Confirmed crossing retains its original place');}
assert(html.includes("changeRegionScope($('movement-place-scope').value)"));
assert(html.includes("changeRegionScope($('place-count-scope').value)"));
assert(html.includes("let parent=aggregate ? place.parent_id : null;"));
console.log('Region scope: 山东 '+direct.length+' direct / '+total.length+' aggregate chapters; '+evidence.length+' deduplicated realm records; linked controls passed.');
