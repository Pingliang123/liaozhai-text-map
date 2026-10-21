'use strict';
const assert=require('node:assert/strict'),D=require('../assets/research-lab/current-data'),M=require('./ghost_map_model');
const pack=require('../data-package.json');
(async()=>{
 let corpusReads=0,manifestReads=0,version='one',saved=null;
 const env={GhostMapModel:M,GhostMapPackage:{},localStorage:{getItem:key=>key.endsWith('-backend')?null:saved},fetch:async url=>{
   if(url.endsWith('release-manifest.json')){manifestReads++;return {ok:true,json:async()=>({artifacts:[{path:'data-package.json',sha256:version}]})};}
   corpusReads++;return {ok:true,json:async()=>pack};
 }};
 const a=await D.load(env),b=await D.load(env);assert.equal(corpusReads,1);assert.equal(manifestReads,2);assert.equal(a.revision_hash,b.revision_hash);
 const m=M.create(pack.base);m.importDocument(pack.revisions);const id=m.ids.find(id=>Object.keys(m.view(id).years||{}).length),d=m.editable(id);d.years={};m.save(id,d);saved=JSON.stringify(m.document());
 const edited=await D.load(env);assert.equal(corpusReads,1);assert.notEqual(edited.revision_hash,a.revision_hash);assert.equal(edited.chapters.find(c=>c.id===id).times.length,0,'Local time changes remain live with a cached corpus');
 version='two';await D.load(env);assert.equal(corpusReads,2,'A changed publication invalidates the cached corpus');
 console.log('PASS manifest-based corpus caching, stable effective fingerprints, live local revisions and publication invalidation');
})().catch(e=>{console.error(e);process.exitCode=1;});
