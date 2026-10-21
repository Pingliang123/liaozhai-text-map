'use strict';
const assert=require('node:assert/strict'),S=require('../assets/corpus-store');
(async()=>{
 const values=new Map(),env={localStorage:{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)}};
 values.set('doc','old');S.signalSaved(env,'doc','indexedDB');
 assert.equal(await S.readLocal(env,'doc',async()=>'new'),'new','IndexedDB save supersedes stale localStorage');
 await assert.rejects(S.readLocal(env,'doc',async()=>null),/备用修订/,'Cannot silently restore older revisions');
 values.set('doc','latest');S.signalSaved(env,'doc','localStorage');
 assert.equal(await S.readLocal(env,'doc',async()=>'older'),'latest');
 values.delete('doc-backend');values.delete('doc');assert.equal(await S.readLocal(env,'doc',async()=>'legacy'),'legacy');
 const full=new Map([['doc','obsolete']]),quota={localStorage:{getItem:k=>full.get(k)||null,removeItem:k=>full.delete(k),setItem:(k,v)=>{if(full.has('doc'))throw Error('quota');full.set(k,v);}}};
 S.signalSaved(quota,'doc','indexedDB');assert.equal(full.get('doc-backend'),'indexedDB');assert.equal(await S.readLocal(quota,'doc',async()=>'durable'),'durable');
 console.log('PASS authoritative storage, change signals, legacy recovery and failure preservation');
})().catch(e=>{console.error(e);process.exitCode=1;});
