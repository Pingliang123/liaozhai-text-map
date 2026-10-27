(function(root){'use strict';
async function load(url='data-package.json',request=root.fetch.bind(root)){
 const response=await request(url,{cache:'no-store'});if(!response.ok)throw Error('总资料包读取失败：HTTP '+response.status);
 const bundle=await response.json();if(bundle.package_type!=='liaozhai-text-map'||bundle.package_version!==1||!Array.isArray(bundle.base?.chapter_overview)||!Array.isArray(bundle.revisions?.overrides))throw Error('总资料包格式不完整');
 return bundle;
}
function effectiveBase(published,local){
 if(!local)return published;
 // Imported packages may contain an obsolete geographic registry. Annotations
 // live in revisions, not base; keep them while using current geography.
 return local.source_sha256===published.source_sha256?{...local,places:published.places,place_hierarchy:published.place_hierarchy,place_equivalences:published.place_equivalences,place_node_aliases:{...(local.place_node_aliases||{}),...(published.place_node_aliases||{})}}:local;
}
function retainMissing(local,published){
 if(local?.complete_snapshot===true||!Array.isArray(local?.overrides)||!Array.isArray(published?.overrides)||published.overrides.length<20||local.overrides.length>=published.overrides.length/2)return local;
 const ids=new Set(local.overrides.map(r=>r.chapter_id)),locations=new Map((published.place_locations||[]).map(r=>[r.name,r]));for(const row of local.place_locations||[])locations.set(row.name,row);
 return {...local,overrides:[...published.overrides.filter(r=>!ids.has(r.chapter_id)),...local.overrides].sort((a,b)=>a.chapter_id-b.chapter_id),place_locations:[...locations.values()]};
}
const stable=value=>value&&typeof value==='object'?(Array.isArray(value)?value.map(stable):Object.fromEntries(Object.keys(value).sort().map(k=>[k,stable(value[k])]))):value;
const same=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
async function rebasePublished(local,published,env=root){
 const registry=typeof module!=='undefined'?require('./publication-rebases'):env.GhostPublicationRebases;
 const result={document:local,applied:[],preserved:[],version:registry?.version||''};
 if(!registry||![local,published].every(d=>d?.corpus_id===registry.corpus_id&&d.source_sha256===registry.source_sha256&&Array.isArray(d.overrides)))return result;
 const cryptoAPI=env.crypto||root.crypto||(typeof module!=='undefined'?require('node:crypto').webcrypto:null);
 if(!cryptoAPI?.subtle)return result;
 const hash=async value=>Array.from(new Uint8Array(await cryptoAPI.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(stable(value))||'undefined'))),b=>b.toString(16).padStart(2,'0')).join('');
 let copied=false;
 for(const rule of registry.chapters){
  const row=local.overrides.find(r=>r.chapter_id===rule.chapter_id),remote=published.overrides.find(r=>r.chapter_id===rule.chapter_id);
  // A deleted override can be an intentional reset; never reintroduce it.
  if(!row||!remote)continue;
  let changes=null;
  const put=(key,value)=>{if(!changes){if(!copied){result.document={...local,overrides:local.overrides.slice()};copied=true;}changes={...row.changes,lexical_reviews:{...row.changes.lexical_reviews}};result.document.overrides[result.document.overrides.indexOf(row)]={...row,changes};}changes[key]=value;};
  for(const [field,ancestors]of Object.entries(rule.fields)){
   if(same(row.changes[field],remote.changes[field]))continue;
   if(ancestors.includes(await hash(row.changes[field]))){put(field,remote.changes[field]);result.applied.push({chapter_id:rule.chapter_id,field});}
   else result.preserved.push({chapter_id:rule.chapter_id,field});
  }
  for(const [key,review]of Object.entries(remote.changes.lexical_reviews||{})){
   const current=row.changes.lexical_reviews?.[key];if(same(current,review))continue;
   if(current===undefined&&!Object.hasOwn(rule.reviews,key)||rule.reviews[key]?.includes(await hash(current))){
    const reviews={...(changes||row.changes).lexical_reviews,[key]:review};put('lexical_reviews',reviews);result.applied.push({chapter_id:rule.chapter_id,field:'lexical_reviews:'+key});
   }else result.preserved.push({chapter_id:rule.chapter_id,field:'lexical_reviews:'+key});
  }
 }
 for(const rule of registry.locations||[]){
  const row=local.place_locations?.find(r=>r.name===rule.name),remote=published.place_locations?.find(r=>r.name===rule.name);
  if(!row||!remote||rule.fields.every(f=>same(row[f],remote[f])))continue;
  if(!rule.ancestors.includes(await hash(row))){result.preserved.push({place:rule.name,field:'parent_id'});continue;}
  if(!copied){result.document={...local,overrides:local.overrides.slice()};copied=true;}
  if(result.document.place_locations===local.place_locations)result.document.place_locations=local.place_locations.slice();
  const updated={...row};for(const field of rule.fields)updated[field]=remote[field];
  result.document.place_locations[result.document.place_locations.indexOf(row)]=updated;
  result.applied.push({place:rule.name,field:'parent_id'});
 }
 return result;
}
async function backupBeforeUpdate(env,key,raw,version){
 const backupKey=key+'-before-publication-'+version;
 if(env.indexedDB)return new Promise((resolve,reject)=>{
  const request=env.indexedDB.open('liaozhai-map-local-backup-v1',1);
  request.onupgradeneeded=()=>request.result.createObjectStore('documents');request.onerror=()=>reject(request.error);
  request.onsuccess=()=>{const db=request.result,tx=db.transaction('documents','readwrite'),store=tx.objectStore('documents'),get=store.get(backupKey);get.onsuccess=()=>{if(get.result===undefined)store.put(raw,backupKey);};tx.oncomplete=()=>{db.close();resolve(backupKey);};tx.onerror=tx.onabort=()=>{db.close();reject(tx.error||new Error('更新前备份失败'));};};
 });
 if(!env.localStorage)throw Error('更新前备份无法保存');
 if(env.localStorage.getItem(backupKey)===null)env.localStorage.setItem(backupKey,raw);
 return backupKey;
}
async function readLocal(env,key,readBackup){
 let saved=null,backend=null;
 try{saved=env.localStorage?.getItem(key);backend=env.localStorage?.getItem(key+'-backend');}catch(_){}
 if(backend==='indexedDB'){
  const backup=await readBackup(key);
  if(!backup)throw Error('备用修订读取失败；请保留本机资料后重试');
  return backup;
 }
 return saved||await readBackup(key);
}
function signalSaved(env,key,backend){
 const notify=()=>{env.localStorage.setItem(key+'-backend',backend);env.localStorage.setItem(key+'-changed',String(Date.now())+'-'+Math.random());};
 try{notify();}catch(_){
  // Called only after the IndexedDB transaction commits. Reclaim the obsolete
  // large mirror so a full localStorage cannot hide the new storage authority.
  if(backend==='indexedDB')try{env.localStorage.removeItem(key);notify();}catch(_){}
 }
}
const api={load,effectiveBase,retainMissing,rebasePublished,backupBeforeUpdate,readLocal,signalSaved};if(typeof module!=='undefined')module.exports=api;else root.GhostCorpusStore=api;
})(globalThis);
