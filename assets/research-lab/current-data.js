(function(root){'use strict';
const publishedCache=new WeakMap();
async function publishedBundle(env,Store){
 // Checking the small manifest avoids downloading the 30+ MB corpus on every focus.
 let version='';try{const r=await env.fetch('../../release-manifest.json',{cache:'no-store'});if(r.ok){const m=await r.json();version=m.artifacts?.find(a=>a.path==='data-package.json')?.sha256||'';}}catch(_){}
 const old=publishedCache.get(env);if(version&&old?.version===version)return old.bundle;
 const bundle=await Store.load('../../data-package.json',env.fetch.bind(env));
 publishedCache.set(env,{version,bundle});return bundle;
}
function snapshot(model){const Routes=typeof module!=='undefined'?require('../spatial-routes'):root.GhostSpatialRoutes,places=model.places();return model.ids.map(id=>{const c=model.view(id);return {place_aliases:Object.fromEntries(c.places.map(p=>[p.word,model.placeName(p.word)])),route_steps:Routes.project(c,places,model).map(r=>({...r,from:r.from?{id:r.from.id,name:r.from.name,lon:r.from.lon,lat:r.from.lat}:null,to:r.to?{id:r.to.id,name:r.to.name,lon:r.to.lon,lat:r.to.lat}:null})),id,title:c.chapter,spaces:c.space_words||[],times:Object.keys(c.years||{}),places:c.places.map(p=>p.word),reviews:c.lexical_reviews||{},people:c.people.map(p=>({word:p.word,types:Object.keys(p.person_types||{})})),events:Object.keys(c.event_types||{}),realms:[...(c.realms_present||[])],realm_evidence:(c.realm_evidence||[]).map(e=>({id:e.id,realm:e.realm,space:e.space||'',unit:e.unit,excerpt:e.excerpt||e.quote||e.text||'',kind:e.kind||''})),evidence_review:c.evidence_review||{},units:c.source_units.map(u=>({id:u.unit,text:u.text||u.original||''})),steps:(c.narrative_events||[]).map(e=>({from:e.from_space||'',to:e.to_space||'',actors:e.actors||'',quote:e.quote||'',kind:e.transition_kind||'',unit:e.unit,realm:e.space_realm||'',access:e.space_access||''}))};});}
async function fallback(idb,key){if(!idb)return null;return new Promise((resolve,reject)=>{const req=idb.open('liaozhai-map-local-backup-v1',1);req.onupgradeneeded=()=>req.result.createObjectStore('documents');req.onerror=()=>reject(req.error);req.onsuccess=()=>{const db=req.result;const op=db.transaction('documents').objectStore('documents').get(key);op.onsuccess=()=>{db.close();resolve(op.result||null);};op.onerror=()=>{db.close();reject(op.error);};};});}
async function load(env=root){
 const Store=typeof module!=='undefined'?require('../corpus-store'):env.GhostCorpusStore;
 const bundle=await publishedBundle(env,Store),publishedBase=bundle.base,published=bundle.revisions;
 const P=env.GhostMapPackage;let installed=null;
 if(env.indexedDB) {const saved=await P.load(env.indexedDB,publishedBase);if(saved)installed=P.validate(saved,publishedBase);}
 const base=Store.effectiveBase(publishedBase,installed?.base),model=env.GhostMapModel.create(base);
 model.importDocument(installed?installed.revisions:published);
 const scope=(base.corpus_id||base.source_sha256)+(installed?'-package-'+installed.installation_id:'');
 const key='liaozhai-map-corrections-v3-'+scope;
 const saved=await Store.readLocal(env,key,k=>fallback(env.indexedDB,k));
 if(saved)model.importDocument(Store.retainMissing(JSON.parse(saved),installed?installed.revisions:published));
 const update=await Store.rebasePublished(model.document(),published,env);
 if(update.applied.length)model.importDocument(update.document);
 const Records=typeof module!=='undefined'?require('./place-records'):env.GhostPlaceRecords;
 const chapters=snapshot(model),placeRecords=Records.build(model,base),state=JSON.stringify([chapters,placeRecords]);
 const revision_hash=root.crypto?.subtle?Array.from(new Uint8Array(await root.crypto.subtle.digest('SHA-256',new TextEncoder().encode(state))),b=>b.toString(16).padStart(2,'0')).join(''):state;
 return {generated:new Date().toISOString(),source_hash:base.source_sha256,revision_hash,chapters,placeRecords,storageKey:key,origin:update.applied.length?'本机修订＋发布更新':saved?'本机已保存修订':installed?'本机总资料包':'GitHub 最新修订'};
}
const api={snapshot,load,fallback};if(typeof module!=='undefined')module.exports=api;else root.GhostLabData=api;
})(globalThis);
