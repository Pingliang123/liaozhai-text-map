'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{
 const old=JSON.parse(cp.execFileSync('git',['show','cb19c3e:manual-revisions.json'],{maxBuffer:30000000}));
 old.overrides.find(r=>r.chapter_id===0).changes.review_note='我保留的批注';
 const raw=JSON.stringify(old),key='liaozhai-map-corrections-v3-'+old.corpus_id;
 const browser=await chromium.launch({headless:true,...(process.env.TEST_BROWSER?{executablePath:process.env.TEST_BROWSER}:{})});
 try{
  const context=await browser.newContext({viewport:{width:1450,height:1050}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await context.route('**/*',async route=>{const u=new URL(route.request().url());if(u.origin!=='http://localhost')return route.abort();if(u.pathname==='/seed.html')return route.fulfill({contentType:'text/html',body:'<!doctype html><title>seed</title>'});let p=decodeURIComponent(u.pathname);if(p.endsWith('/'))p+='index.html';const file=path.resolve(process.cwd(),'.'+p);if(!file.startsWith(process.cwd()+path.sep))return route.abort();try{await route.fulfill({body:fs.readFileSync(file),contentType:({'.js':'text/javascript','.html':'text/html','.json':'application/json','.css':'text/css'})[path.extname(file)]||'application/octet-stream'});}catch{await route.fulfill({status:404,body:'Not found'});}});
  await page.goto('http://localhost/seed.html');
  await page.evaluate(async({raw,key})=>{await new Promise((resolve,reject)=>{const req=indexedDB.open('liaozhai-map-local-backup-v1',1);req.onupgradeneeded=()=>req.result.createObjectStore('documents');req.onsuccess=()=>{const db=req.result,tx=db.transaction('documents','readwrite');tx.objectStore('documents').put(raw,key);tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};});localStorage.setItem(key+'-backend','indexedDB');sessionStorage.setItem('liaozhai-route-view-'+key.replace('liaozhai-map-corrections-v3-',''),JSON.stringify({scope:'off',chapter:0,actor:'宋焘'}));},{raw,key});
  await page.goto('http://localhost/index.html?chapter=411#map-section');
  try{await page.waitForFunction(()=>document.querySelector('#storage-status')?.textContent.includes('已更新《黄英》'),null,{timeout:90000});}catch(error){console.log(await page.evaluate(()=>({storage:document.querySelector('#storage-status')?.textContent,loading:document.querySelector('#data-status')?.textContent,inert:document.querySelector('main')?.inert})));console.log(errors);throw error;}
  assert.equal(await page.locator('#movement-scope').inputValue(),'chapter');
  await page.waitForFunction(()=>document.querySelectorAll('.character-route').length>0);
  const stored=await page.evaluate(async({key})=>new Promise((resolve,reject)=>{const req=indexedDB.open('liaozhai-map-local-backup-v1',1);req.onsuccess=()=>{const db=req.result,tx=db.transaction('documents'),store=tx.objectStore('documents'),a=store.get(key),b=store.get(key+'-before-publication-huangying-20261024');tx.oncomplete=()=>{db.close();const d=JSON.parse(a.result);resolve({steps:d.overrides.find(r=>r.chapter_id===411).changes.narrative_events.length,note:d.overrides.find(r=>r.chapter_id===0).changes.review_note,backup:b.result});};};req.onerror=()=>reject(req.error);}),{key});
  assert.equal(stored.steps,45);assert.equal(stored.note,'我保留的批注');assert.equal(stored.backup,raw,'迁移前完整备份');
  await page.screenshot({path:path.join(process.env.TEMP,'huangying-visible-update.png')});
  await page.reload();await page.waitForFunction(()=>document.querySelector('#chapter-select')?.value==='411'&&!document.querySelector('main').inert,null,{timeout:90000});
  assert.equal(await page.locator('#movement-scope').inputValue(),'chapter');
  await page.goto('http://localhost/assets/research-lab/?chapter=411&tab=relations');await page.getByLabel('选择篇目查看空间网络',{exact:true}).waitFor({timeout:90000});
  assert.equal(await page.evaluate(async()=>{const d=await GhostLabData.load();return d.chapters.find(c=>c.id===411).route_steps.length;}),45);
  assert.deepEqual(errors,[]);console.log('PASS 真正旧IndexedDB快照：更新45步、保留批注、完整备份、刷新稳定、链接自动画路线、实验室一致');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
