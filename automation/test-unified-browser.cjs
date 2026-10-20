// Optional isolated headless smoke test. No GitHub/Worker writes are allowed.
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.TEST_BROWSER?{executablePath:process.env.TEST_BROWSER}:{})});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await context.route('**/*',async route=>{
   const u=new URL(route.request().url());if(u.origin!=='http://map.test')return route.abort();
   const file=path.resolve(process.cwd(),'.'+decodeURIComponent(u.pathname==='/'?'/index.html':u.pathname));
   if(!file.startsWith(process.cwd()+path.sep))return route.fulfill({status:403});
   try{const body=fs.readFileSync(file),extension=path.extname(file),mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json'}[extension]||'application/octet-stream';await route.fulfill({status:200,body,contentType:mime});}catch{await route.fulfill({status:404,body:'Not found'});}
  });
  await page.goto('http://map.test/index.html');await page.locator('#data-status').waitFor({state:'hidden',timeout:90000});
  assert.deepEqual(errors,[],'Main page must start without JS errors');
  await page.locator('header a[href="#vocabulary-editor"]').click();await page.locator('#vocabulary-editor').waitFor({state:'visible'});
  await page.getByLabel('词汇类别',{exact:true}).selectOption('places');await page.getByLabel('搜索词汇',{exact:true}).fill('金陵');
  await page.waitForTimeout(450);assert(await page.locator('#vocabulary-editor tbody tr').count()>0);
  const row=page.locator('#vocabulary-editor tbody tr').first();await row.getByLabel('修订词语',{exact:true}).fill('金陵');await row.getByLabel('修订词语',{exact:true}).press('Tab');
  await row.getByRole('button',{name:'保存',exact:true}).click();await page.waitForTimeout(1500);
  assert(!await page.locator('#vocabulary-editor tbody tr').first().getByRole('button',{name:'保存',exact:true}).isDisabled());
  await page.locator('#nav-map').click();await page.locator('#map-section').waitFor({state:'visible'});
  assert(await page.locator('#otherworld-map .otherworld-nodes button').count()>0,'Named otherworld nodes must be shown');
  assert(await page.locator('#map [aria-label^="查看异境"]').count()>0,'Map SVG itself must show named otherworld nodes');
  await page.locator('#otherworld-map .otherworld-nodes button').first().click();assert(await page.locator('#otherworld-map blockquote').count()>0);
  assert.deepEqual(errors,[]);console.log('PASS isolated browser: map startup, shared word table, save, named otherworld nodes and evidence');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
