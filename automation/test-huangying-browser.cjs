'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.TEST_BROWSER?{executablePath:process.env.TEST_BROWSER}:{})});
 try{
  const context=await browser.newContext({viewport:{width:1500,height:1050}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await context.route('**/*',async route=>{const u=new URL(route.request().url());if(u.origin!=='http://map.test')return route.abort();let p=decodeURIComponent(u.pathname);if(p.endsWith('/'))p+='index.html';const file=path.resolve(process.cwd(),'.'+p);if(!file.startsWith(process.cwd()+path.sep))return route.abort();try{await route.fulfill({body:fs.readFileSync(file),contentType:({'.js':'text/javascript','.html':'text/html','.json':'application/json','.css':'text/css'})[path.extname(file)]||'application/octet-stream'});}catch{await route.fulfill({status:404,body:'Not found'});}});
  await page.goto('http://map.test/index.html?chapter=411#map-section');
  await page.locator('#movement-chapter option[value="411"]').waitFor({state:'attached',timeout:90000});
  await page.locator('#movement-chapter').selectOption('411');await page.locator('#movement-scope').selectOption('chapter');
  await page.waitForFunction(()=>document.querySelectorAll('.character-route').length>0);
  assert(await page.locator('.character-route[aria-label*="黄英"]').count()>0,'地图实际绘出本篇路线');
  const options=await page.locator('#movement-step option').allTextContents();assert(options.some(t=>t.includes('金陵')));assert(options.some(t=>t.includes('菊畦')));
  await page.screenshot({path:path.join(process.env.TEMP,'huangying-map.png')});
  await page.goto('http://map.test/assets/research-lab/?tab=relations&chapter=411');
  const pick=page.getByLabel('选择篇目查看空间网络',{exact:true});await pick.waitFor({timeout:90000});assert.equal(await pick.inputValue(),'411');
  const graph=page.locator('section.card').filter({has:page.getByRole('heading',{name:'二、篇目空间网络',exact:true})});
  assert(await graph.locator('svg circle').count()>0);
  const g=await page.evaluate(async()=>{const d=await GhostLabData.load();return GhostChapterSpaces.build(d.chapters.find(c=>c.id===411));});
  assert(g.edges.some(e=>e.relation==='movement'));assert(g.edges.some(e=>e.relation==='spatial-change'));
  assert(g.nodes.some(n=>n.label==='园中茅茨'));assert(g.nodes.some(n=>n.label==='南第廊舍'));
  assert(await graph.getByText(/归属未明的空间 ·/).count()>0,'孤立词保留在图下核查列表');
  await graph.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(process.env.TEMP,'huangying-network.png')});
  await page.goto('http://map.test/assets/research-lab/cases.html');await page.locator('#case option[value="黄英"]').waitFor({state:'attached',timeout:90000});await page.locator('#case').selectOption('黄英');
  assert.equal(await page.locator('#case-view article').count(),42,'细读页读取同一总库的移动和变化');
  assert.deepEqual(errors,[]);console.log('PASS browser: 地图真实路线、篇目网络移动/改建、六篇细读总库与无脚本错误');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
