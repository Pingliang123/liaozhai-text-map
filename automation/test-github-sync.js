'use strict';
const assert=require('node:assert/strict');
const {create,encode,decode}=require('./github_sync.js');
const copy=x=>JSON.parse(JSON.stringify(x));
const merge=(before,mine,theirs)=>{
  const result={};
  for(const key of new Set([...Object.keys(before),...Object.keys(mine),...Object.keys(theirs)])){
    if(before[key]!==mine[key]&&before[key]!==theirs[key]&&mine[key]!==theirs[key])throw new Error('conflict '+key);
    const value=before[key]!==mine[key]?mine[key]:theirs[key];if(value!==undefined)result[key]=value;
  }return result;
};
const response=(status,data)=>({ok:status>=200&&status<300,status,json:async()=>copy(data)});
async function main(){
  let noOpChecks=0;
  const noOp=create({ancestor:{a:1},getLocal:()=>({a:1}),hasDraft:()=>false,validate:()=>noOpChecks++,
    request:async()=>response(200,{a:1}),merge:()=>{throw Error('no-op must not merge');},apply:()=>{throw Error('no-op must not redraw');},onAncestor:()=>{throw Error('no-op must not rewrite ancestor');}});
  await noOp.sync();await noOp.sync();assert.equal(noOpChecks,1,'Identical remote validation is cached');
  assert.equal(Buffer.from(encode({a:1}),'base64').toString(),'{"a":1}','Uploads must not add indentation');
  const large={note:'字'.repeat(3500000)},blobSHA='b'.repeat(40);let largeApplied=null,blobReads=0;
  const largeClient=create({ancestor:{},getLocal:()=>({}),hasDraft:()=>false,merge:(_a,_l,r)=>r,validate:()=>{},apply:d=>{largeApplied=d;},
    request:async url=>url.includes('/git/blobs/')?(blobReads++,response(200,{content:encode(large)})):response(200,{size:14369878,encoding:'none',content:'',sha:blobSHA})});
  largeClient.connect('test-token');await largeClient.sync();assert.equal(largeApplied.note.length,large.note.length);assert.equal(blobReads,1);
  let oversizedApplied=false;
  const oversized=create({ancestor:{},getLocal:()=>({keep:'local'}),hasDraft:()=>false,merge,validate:()=>{},apply:()=>{oversizedApplied=true;},
    request:async()=>response(200,{size:25000001,encoding:'none',sha:blobSHA})});
  oversized.connect('test-token');await assert.rejects(oversized.sync(),/25 MB/);assert.equal(oversizedApplied,false);
  assert.throws(()=>encode({text:'字'.repeat(8333334)}),/25 MB/,'Limits use UTF-8 bytes, not character count');
  assert.deepEqual(decode(encode({text:'聊斋🌏',long:'字'.repeat(30000)})),{text:'聊斋🌏',long:'字'.repeat(30000)});
  let local={a:1},cloud={b:2},sha=1,writes=0,ancestor={},draft=false,mode='',afterPut=null;
  const stored=[];
  const request=async(url,options)=>{
    if(mode==='offline')throw new Error('offline');
    if(options.method==='PUT'){
      writes++;const body=JSON.parse(options.body);assert(!JSON.stringify(body).includes('test-token'));
      if(mode==='race'){mode='';cloud.c=3;sha++;return response(409,{});}
      assert.equal(body.sha,String(sha));cloud=decode(body.content);sha++;if(afterPut){afterPut();afterPut=null;}
      return response(200,{});
    }
    return response(200,url.includes('api.github.com')?{sha:String(sha),content:encode(cloud)}:cloud);
  };
  const client=create({ancestor,request,merge,getLocal:()=>copy(local),hasDraft:()=>draft,
    validate:doc=>assert(doc&&typeof doc==='object'),apply:doc=>{local=copy(doc);},
    onAncestor:doc=>{ancestor=doc;stored.push(JSON.stringify(doc));}});
  await client.sync();assert.deepEqual(local,{a:1,b:2});assert.deepEqual(ancestor,{b:2});assert.equal(writes,0);
  client.connect('test-token');await client.sync();assert.deepEqual(cloud,{a:1,b:2});assert.equal(writes,1);
  local.a=4;mode='race';await client.sync();assert.deepEqual(cloud,{a:4,b:2,c:3});
  local.a=5;cloud.a=6;const prior=copy(local),writeCount=writes;
  await assert.rejects(client.sync(),/conflict/);assert.deepEqual(local,prior);assert.equal(writes,writeCount);
  cloud.a=4;mode='offline';await assert.rejects(client.sync(),/offline/);assert.deepEqual(local,prior);
  mode='';draft=true;await client.sync();assert.equal(writes,writeCount);draft=false;
  afterPut=()=>{local.d=7;};await client.sync();assert.equal(cloud.d,7,'Save made during PUT must be queued');
  client.disconnect();local.e=8;const count=writes;await client.sync();assert.equal(writes,count);
  assert(!stored.join('').includes('test-token'));
  // A fresh browser knows its embedded publication baseline, and must accept
  // a newer cloud edit even when both versions contain the same chapter.
  let freshLocal={chapter:'embedded old'},freshRemote={chapter:'cloud new'};
  const fresh=create({ancestor:copy(freshLocal),merge,getLocal:()=>freshLocal,hasDraft:()=>false,
    validate:()=>{},apply:doc=>{freshLocal=doc;},request:async()=>response(200,freshRemote)});
  await fresh.sync();assert.deepEqual(freshLocal,freshRemote);
  const uncertain=create({ancestor:{},merge,getLocal:()=>({chapter:'legacy local edit'}),hasDraft:()=>false,
    validate:()=>{},apply:()=>{throw new Error('must not overwrite unknown local edits');},request:async()=>response(200,freshRemote)});
  await assert.rejects(uncertain.sync(),/conflict/);
  console.log('GitHub sync: Unicode, anonymous read, authorized save, races, conflicts, offline, drafts, concurrent saves and disconnect passed.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
