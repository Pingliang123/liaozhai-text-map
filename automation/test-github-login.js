'use strict';
const assert=require('node:assert/strict');
const {create}=require('./github_login.js');
const {create:sync}=require('./github_sync.js');
async function main(){
  const rows=new Map(),storage={getItem:k=>rows.get(k),setItem:(k,v)=>rows.set(k,v),removeItem:k=>rows.delete(k)};
  const listeners=new Map(),popup={closed:false};
  const window={open:(url)=>{assert.equal(url,'https://sync.example/auth/start');return popup;},addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:name=>listeners.delete(name)};
  let status=200,doc={schema_version:2},calls=[];
  const request=async(url,options)=>{calls.push({url,options});return new Response(JSON.stringify(status===401?{message:'请重新登入'}:url.endsWith('/revisions')?{doc,sha:'a'.repeat(40)}:{login:'Pingliang123'}),{status});};
  assert.throws(()=>create({url:'http://sync.example',storage}),/HTTPS/);
  const client=create({url:'https://sync.example',storage,window,request});assert(!client.connected());
  const pending=client.login();const data={type:'liaozhai-github-login',session:'a'.repeat(43)+'.'+'b'.repeat(43),expires:Date.now()+86400000,login:'Pingliang123'};
  listeners.get('message')({origin:'https://evil.example',source:popup,data});assert(!client.connected());
  listeners.get('message')({origin:'https://sync.example',source:{},data});assert(!client.connected());
  listeners.get('message')({origin:'https://sync.example',source:popup,data});await pending;assert(client.connected());assert(!listeners.has('message'));
  const reload=create({url:'https://sync.example',storage,request});assert(await reload.restore());
  assert.deepEqual(await reload.read(),{doc,sha:'a'.repeat(40)});await reload.write(doc,'a'.repeat(40));
  assert.equal(JSON.parse(calls.at(-1).options.body).sha,'a'.repeat(40));assert(!calls.some(call=>call.url.includes(data.session)),'Session must not appear in URLs');
  const another=create({url:'https://other.example',storage,request});assert(!another.connected());
  // The sync engine uses the backend without requiring a GitHub token.
  let local={chapter:2},saved=null;
  const cloud={connected:()=>true,read:async()=>({doc:{chapter:1},sha:'a'.repeat(40)}),write:async value=>{saved=value;return new Response('{}');},logout:async()=>{}};
  const engine=sync({ancestor:{chapter:1},cloud,getLocal:()=>local,hasDraft:()=>false,merge:(_before,mine)=>mine,validate:()=>{},apply:value=>{local=value;}});
  await engine.sync();assert.deepEqual(saved,{chapter:2});
  status=401;await assert.rejects(reload.restore(),/登入/);assert(!reload.connected());assert.equal(rows.size,0);
  let cleaned=null;
  const fallbackWindow={location:{hash:'#cloud-session='+data.session+'&expires='+data.expires+'&login=Pingliang123',pathname:'/liaozhai-text-map/',search:'?view=map'},history:{replaceState:(_state,_title,url)=>{cleaned=url;}}};
  const fallback=create({url:'https://sync.example',storage,window:fallbackWindow,request});
  assert(fallback.connected());assert.equal(cleaned,'/liaozhai-text-map/?view=map');
  await fallback.logout();assert.equal(rows.size,0);
  fallbackWindow.location.hash='#cloud-session=invalid&expires='+data.expires;
  assert(!create({url:'https://sync.example',storage,window:fallbackWindow,request}).connected());
  console.log('GitHub login: safe popup messages, persistent sessions, backend isolation, expired login, scoped transport passed.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
