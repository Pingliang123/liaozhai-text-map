(function(root){'use strict';
function snapshot(model){return model.ids.map(id=>{const c=model.view(id);return {id,title:c.chapter,spaces:c.space_words||[],places:c.places.map(p=>p.word),reviews:c.lexical_reviews||{},people:c.people.map(p=>({word:p.word,types:Object.keys(p.person_types||{})})),events:Object.keys(c.event_types||{}),realms:[...(c.realms_present||[])],realm_evidence:(c.realm_evidence||[]).map(e=>({id:e.id,realm:e.realm,space:e.space||'',unit:e.unit,excerpt:e.excerpt||e.quote||e.text||'',kind:e.kind||''})),evidence_review:c.evidence_review||{},units:c.source_units.map(u=>({id:u.unit,text:u.text||u.original||''})),steps:(c.narrative_events||[]).map(e=>({from:e.from_space||'',to:e.to_space||'',actors:e.actors||'',quote:e.quote||'',kind:e.transition_kind||'',unit:e.unit,realm:e.space_realm||'',access:e.space_access||''}))};});}
async function fallback(idb,key){if(!idb)return null;return new Promise((resolve,reject)=>{const req=idb.open('liaozhai-map-local-backup-v1',1);req.onupgradeneeded=()=>req.result.createObjectStore('documents');req.onerror=()=>reject(req.error);req.onsuccess=()=>{const db=req.result;const op=db.transaction('documents').objectStore('documents').get(key);op.onsuccess=()=>{db.close();resolve(op.result||null);};op.onerror=()=>{db.close();reject(op.error);};};});}
async function load(env=root){
 const Store=typeof module!=='undefined'?require('../corpus-store'):env.GhostCorpusStore;
 const bundle=await Store.load('../../data-package.json',env.fetch.bind(env)),publishedBase=bundle.base,published=bundle.revisions;
 const P=env.GhostMapPackage;let installed=null;
 if(env.indexedDB) {const saved=await P.load(env.indexedDB,publishedBase);if(saved)installed=P.validate(saved,publishedBase);}
 const base=installed?installed.base:publishedBase,model=env.GhostMapModel.create(base);
 model.importDocument(installed?installed.revisions:published);
 const scope=(base.corpus_id||base.source_sha256)+(installed?'-package-'+installed.installation_id:'');
 const key='liaozhai-map-corrections-v3-'+scope;let saved=null;
 try{saved=env.localStorage?.getItem(key);}catch(_){}
 if(!saved)saved=await fallback(env.indexedDB,key);
 if(saved)model.importDocument(Store.retainMissing(JSON.parse(saved),installed?installed.revisions:published));
 const Records=typeof module!=='undefined'?require('./place-records'):env.GhostPlaceRecords;
 return {generated:new Date().toISOString(),source_hash:base.source_sha256,revision_hash:bundle.revision_hash||'',chapters:snapshot(model),placeRecords:Records.build(model,base),storageKey:key,origin:saved?'本机已保存修订':installed?'本机总资料包':'GitHub 最新修订'};
}
const api={snapshot,load,fallback};if(typeof module!=='undefined')module.exports=api;else root.GhostLabData=api;
})(globalThis);
