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
  console.log('GitHub sync: Unicode, anonymous read, authorized save, races, conflicts, offline, drafts, concurrent saves and disconnect passed.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
