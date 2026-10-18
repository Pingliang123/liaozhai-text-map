'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{load}=require('../assets/data-loader.js');
async function main(){
  const html=fs.readFileSync('index.html','utf8'),bundle=JSON.parse(fs.readFileSync('data-package.json','utf8'));
  assert(Buffer.byteLength(html)<1000000,'HTML must not embed the entire corpus');
  for(const [id,expected]of [['map-data',bundle.base],['published-revisions',bundle.revisions]]){
    const seed=JSON.parse(html.match(new RegExp('<script id="'+id+'" type="application/json">([\\s\\S]*?)<\\/script>'))[1]);
    const result=await load(seed,async url=>new Response(fs.readFileSync(url.split('?')[0])),crypto.webcrypto);assert.deepEqual(result,expected);
    await assert.rejects(load(seed,async()=>new Response('{}'),crypto.webcrypto),/版本不一致/);
    await assert.rejects(load(seed,async()=>new Response('',{status:404}),crypto.webcrypto),/HTTP 404/);
  }
  await assert.rejects(load({external:'https://evil.example/data',sha256:'a'.repeat(64)}),/索引无效/);
  const inline={legacy:true};assert.equal(await load(inline),inline);
  const workflow=fs.readFileSync('.github/workflows/publish-updates.yml','utf8');assert(workflow.includes('cp -r assets public/assets'));
  assert(html.includes('GhostMapData.load('));assert(html.includes('本机修订未删除。'));
  console.log(`PASS: ${Buffer.byteLength(html)} byte HTML, full corpus and revisions preserved, fingerprints checked, errors recoverable, assets published`);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
