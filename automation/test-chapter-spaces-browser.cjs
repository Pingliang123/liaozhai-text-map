const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.TEST_BROWSER?{executablePath:process.env.TEST_BROWSER}:{})});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await context.route('**/*',async route=>{const u=new URL(route.request().url());if(u.origin!=='http://map.test')return route.abort();let p=decodeURIComponent(u.pathname);if(p.endsWith('/'))p+='index.html';const f=path.resolve(process.cwd(),'.'+p);if(!f.startsWith(process.cwd()+path.sep))return route.abort();try{const mime={'.js':'text/javascript','.html':'text/html','.json':'application/json','.css':'text/css'}[path.extname(f)]||'application/octet-stream';await route.fulfill({body:fs.readFileSync(f),contentType:mime});}catch{await route.fulfill({status:404,body:'Not found'});}});
  await page.goto('http://map.test/assets/research-lab/?chapter=34');
  const pick=page.getByLabel('选择篇目查看空间网络',{exact:true});await pick.waitFor({timeout:90000});
  assert.equal(await pick.inputValue(),'34');const section=page.locator('section.card').filter({has:page.getByRole('heading',{name:'二、篇目空间网络',exact:true})});assert(await section.locator('svg circle').count()>0);
  // The chapter URL filters the available chapters. Clear that filter before testing a different chapter.
  await page.goto('http://map.test/assets/research-lab/');await pick.waitFor({timeout:90000});
  await pick.selectOption('35');assert((await section.locator('a').last().getAttribute('href')).includes('chapter=35'));
  assert.equal(await page.getByLabel('选择地点查看内部空间',{exact:true}).count(),0);
  // A failed large localStorage write can leave an old document behind. Both sites must read the newer IndexedDB record.
  await page.evaluate(async()=>{const pack=await (await fetch('../../data-package.json')).json(),key='liaozhai-map-corrections-v3-'+(pack.base.corpus_id||pack.base.source_sha256);localStorage.setItem(key,JSON.stringify({overrides:[]}));await new Promise((resolve,reject)=>{const request=indexedDB.open('liaozhai-map-local-backup-v1',1);request.onupgradeneeded=()=>request.result.createObjectStore('documents');request.onsuccess=()=>{const db=request.result,tx=db.transaction('documents','readwrite');tx.objectStore('documents').put(JSON.stringify(pack.revisions),key);tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};});GhostCorpusStore.signalSaved(window,key,'indexedDB');const current=await GhostLabData.load();if(current.chapters.length!==pack.base.chapter_overview.length)throw Error('incomplete local corpus');});
  const source=await page.evaluate(()=>GhostCorpusStore.readLocal(window,'probe',async()=>'backup'));assert.equal(source,'backup');
  await page.screenshot({path:process.env.TEMP+'/liaozhai-chapter-network.png',fullPage:false});
  assert.deepEqual(errors,[]);console.log('PASS browser chapter selection, actual SVG, original links and IndexedDB recovery');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
