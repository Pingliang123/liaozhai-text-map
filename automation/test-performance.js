'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{create}=require('../github-sync.js');
async function main(){
  const doc=JSON.parse(fs.readFileSync('manual-revisions.json','utf8'));let merges=0,applies=0,validates=0,acknowledgements=0;
  const client=create({ancestor:doc,localIsValidated:true,getLocal:()=>doc,hasDraft:()=>false,
    cloud:{connected:()=>true,read:async()=>({doc,sha:'a'.repeat(40)})},
    merge:()=>{merges++;throw Error('Unchanged data must not merge');},apply:()=>{applies++;},validate:()=>{validates++;},onAncestor:()=>{acknowledgements++;}});
  const start=performance.now();await client.sync();await client.sync();
  assert.equal(merges,0);assert.equal(applies,0);assert.equal(validates,0);assert.equal(acknowledgements,0);
  const changed={...doc,note:'changed remote content'};let checks=0;
  const guarded=create({ancestor:doc,getLocal:()=>doc,hasDraft:()=>false,
    cloud:{connected:()=>true,read:async()=>({doc:changed,sha:'b'.repeat(40)})},validate:()=>{checks++;throw Error('bad remote');},merge:()=>{throw Error('must validate first');},apply:()=>{throw Error('must not apply invalid remote');}});
  await assert.rejects(guarded.sync(),/bad remote/);assert.equal(checks,1);
  const html=fs.readFileSync('index.html','utf8');
  assert(html.includes("if(!$('path-report-panel').open || $('reports-screen').hidden)return;"));
  assert(html.includes("if (!$('map-section').hidden) refreshMapResults();"));
  assert(html.includes("if (!$('research-screen').hidden) refreshResearchResults();"));
  assert(html.includes("$('report-search').addEventListener('input',GhostMapAuditReports.debounce("));
  assert(!html.includes("renderChapter(); showEditor(currentEditor); renderBookSynthesis();"));
  const screens={'reports-screen':{hidden:false},'map-section':{hidden:true},'research-screen':{hidden:true}},calls={reports:0,map:0,research:0};
  const context={$:id=>screens[id],reportRows:{},pathRowsCache:{},renderReports:()=>calls.reports++,refreshMapResults:()=>calls.map++,refreshResearchResults:()=>calls.research++};
  vm.createContext(context);vm.runInContext(html.slice(html.indexOf('  function updateResults()'),html.indexOf('  function refreshResearchResults()')),context);
  context.updateResults();assert.deepEqual(calls,{reports:1,map:0,research:0});
  screens['reports-screen'].hidden=true;screens['map-section'].hidden=false;context.updateResults();assert.deepEqual(calls,{reports:1,map:1,research:0});
  screens['map-section'].hidden=true;screens['research-screen'].hidden=false;context.updateResults();assert.deepEqual(calls,{reports:1,map:1,research:1});
  console.log(`PASS: two unchanged full-corpus syncs ${(performance.now()-start).toFixed(0)} ms; zero merge, import, ancestor writes or redraw; changed remote still validated`);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
