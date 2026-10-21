'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');
const M=require('./ghost_map_model'),S=require('../assets/corpus-store'),{placeName}=require('../assets/map-network-link');
const pack=require('../data-package.json'),base=pack.base,html=fs.readFileSync('index.html','utf8');
assert.equal(placeName({value:'p',textContent:'○济南〔府／州〕 · 12 篇'}),'济南');
assert.equal(placeName({value:'p',dataset:{placeName:'江南'},textContent:'△江南〔区域〕 · 8 篇'}),'江南');
assert.equal(placeName({value:'',textContent:'选择地点'}),'');
assert(html.includes("window.dispatchEvent(new Event('ghostmap:place-selected'))"));
assert(html.includes("location.href='assets/research-lab/?tab=relations&chapter='"));
const full=M.create(base);for(const id of full.ids.slice(0,30))full.save(id,full.editable(id));
const ancestor=full.document();for(const id of full.ids.slice(0,30))full.reset(id);
assert.equal(S.retainMissing(full.document(),ancestor).overrides.length,0,'Explicit complete snapshots can remove all revisions');
assert.equal(M.mergeDocuments(base,ancestor,full.document(),ancestor).overrides.length,0,'Cloud merge must preserve an intentional reset');
const limit=Number(html.match(/file.size > (\d+)\) throw new Error\('修订档/)[1]);
assert(new Blob([JSON.stringify(pack.revisions,null,2)]).size<limit,'Current exported backup must be importable');
const source=html.slice(html.indexOf('  function persistFallback('),html.indexOf('  function withLocationBackup('));
let stored=JSON.stringify(M.create(base).document()),tail=Promise.resolve(),fail=false;
const open=async()=>{if(fail){fail=false;throw Error('temporary storage failure');}return {close(){},transaction(){
 const tx={objectStore:()=>({get(){const req={};tail=tail.then(()=>new Promise(resolve=>setImmediate(()=>{req.result=stored;req.onsuccess();if(tx.aborted)tx.onabort();else{stored=tx.value;tx.oncomplete();}resolve();})));return req;},put(value){tx.value=value;}}),abort(){tx.aborted=true;}};return tx;
}};};
function page(){const model=M.create(base),ctx={model,M,base,storageKey:'test',fallbackStoreName:'documents',storageAncestor:model.document(),storageSnapshot:stored,storagePending:false,state:{},fallbackWrites:Promise.resolve(),fallbackOpen:open,withLocationBackup:x=>x,localStorage:{getItem:()=> 'indexedDB'},message(){},GhostCorpusStore:{signalSaved(){}},window:{dispatchEvent(){}},Event:class{},JSON};vm.createContext(ctx);vm.runInContext(source,ctx);return ctx;}
async function main(){
 const a=page(),b=page(),[id0,id1]=a.model.ids;
 const da=a.model.editable(id0),db=b.model.editable(id1);da.event_types={人:1};db.event_types={鬼:1};a.model.save(id0,da);b.model.save(id1,db);
 a.persistFallback(a.model.document());b.persistFallback(b.model.document());await Promise.all([a.fallbackWrites,b.fallbackWrites]);
 assert.deepEqual(JSON.parse(stored).overrides.map(r=>r.chapter_id).sort((x,y)=>x-y),[id0,id1],'Atomic IDB saves preserve both tabs');
 const retry=page();retry.storageAncestor=JSON.parse(stored);retry.model.importDocument(JSON.parse(stored));fail=true;
 retry.persistFallback(retry.model.document());await assert.rejects(retry.fallbackWrites,/temporary/);
 retry.persistFallback(retry.model.document());await retry.fallbackWrites;assert.equal(retry.state.unpersisted,false,'A failed transaction must not poison future saves');
 const H=require('../assets/research-lab/hierarchy-network');
 const projected=H.project({nodes:[{id:'place:蔡店',label:'蔡店',kind:'place'}],edges:[]},{蔡店:{id:'place-蔡店',name:'蔡店',level:'village'}},'town');assert.equal(projected.nodes.length,1);
 const R=require('../assets/research-lab/relation-network');
 const c={id:1,title:'测试',places:['济南'],spaces:['寺'],times:[],people:[],units:[{id:1,text:'一日至济南，宿寺。'}],steps:[]};
 assert(!R.build([c],'unit',{1:['一日']}).nodes.some(n=>n.kind==='time'),'An explicit empty live time list overrides an old static snapshot');
 console.log('PASS site audit: canonical map links, backups, deliberate resets, atomic multi-tab saves, retry recovery, village levels and live time terms');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
