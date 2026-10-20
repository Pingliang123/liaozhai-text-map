import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Worker,{SyncSession,SyncControl,seal,open,ticket,verify,validate} from './worker.mjs';
import Model from './model.cjs';
import base from './validation-base.json' with {type:'json'};

const secret='test-secret-for-encryption-and-signing-123456789';
const sid='a'.repeat(43),sha='a'.repeat(40);
const doc=Model.create(base).document();
const pack=data=>Buffer.from(JSON.stringify(data)).toString('base64');
const r=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json',...headers}});
function setup(overrides={}){
  const values=new Map();const storage={async put(k,v){values.set(k,structuredClone(v));},async get(k){return structuredClone(values.get(k));},async delete(k){values.delete(k);},async deleteAll(){values.clear();},async setAlarm(){}};
  const env={AUTH_SECRET:secret,GITHUB_CLIENT_ID:'test-id',GITHUB_CLIENT_SECRET:'server-secret',SITE_ORIGIN:'https://pingliang123.github.io',ALLOWED_LOGIN:'Pingliang123',OWNER:'Pingliang123',REPO:'liaozhai-text-map',...overrides};
  const instances=new Map();env.SESSIONS={idFromName:x=>x,get(id){if(!instances.has(id))instances.set(id,new SyncSession({storage},env));return instances.get(id);}};
  return {env,storage,values,instance:env.SESSIONS.get(sid)};
}
async function login(state,expires=Date.now()+300000){await state.storage.put('credentials',await seal({access_token:'github-access-secret',refresh_token:'refresh-secret',accessExpires:expires,expires:Date.now()+86400000,login:'Pingliang123'},secret));}
const request=async(env,path,options={})=>Worker.fetch(new Request('https://sync.example'+path,{...options,headers:{Origin:env.SITE_ORIGIN,...options.headers}}),env);
test('old partial browser uploads preserve omitted cloud chapters',async()=>{
 const model=Model.create(base),complete={...doc,overrides:model.ids.slice(0,30).map(id=>({chapter_id:id,changes:model.editable(id)}))},partial=structuredClone({...complete,overrides:complete.overrides.slice(0,1)});partial.overrides[0].changes.review_note='latest manual edit';
 let written;const state=setup({FETCH:async(url,options)=>{if(options.method==='PUT'){written=JSON.parse(Buffer.from(JSON.parse(options.body).content,'base64'));return r({commit:{sha:'commit'}});}return r({sha,content:pack(complete)});}});await login(state);
 const response=await request(state.env,'/api/revisions',{method:'PUT',headers:{Authorization:'Bearer '+await ticket(sid,secret),'Content-Type':'application/json'},body:JSON.stringify({doc:partial,sha})});
 assert.equal(response.status,200);assert.equal(written.overrides.length,30);assert.equal(written.overrides.find(o=>o.chapter_id===partial.overrides[0].chapter_id).changes.review_note,'latest manual edit');
});

test('credentials encrypted, tickets authenticated, tampering refused',async()=>{
  const encrypted=await seal({access_token:'sensitive'},secret);assert(!JSON.stringify(encrypted).includes('sensitive'));assert.deepEqual(await open(encrypted,secret),{access_token:'sensitive'});
  const signed=await ticket(sid,secret);assert.equal(await verify(signed,secret),sid);await assert.rejects(verify(signed,secret+'wrong'));await assert.rejects(verify('garbage',secret));
});
test('large cloud files use blob fallback; uploads stay compact; 25 MB guard retains protection',async()=>{
  let blobReads=0,uploaded;
  const state=setup({FETCH:async(url,options)=>{
    if(options.method==='PUT'){uploaded=JSON.parse(options.body);return r({commit:{sha:'commit'}});}
    if(url.includes('/git/blobs/')){blobReads++;return r({content:pack(doc)});}
    return r({sha,size:14369878,encoding:'none',content:''});
  }});await login(state);
  const auth={Authorization:'Bearer '+await ticket(sid,secret),'Content-Type':'application/json'};
  const read=await request(state.env,'/api/revisions',{headers:auth});assert.equal(read.status,200);assert.deepEqual((await read.json()).doc,doc);assert.equal(blobReads,1);
  const saved=await request(state.env,'/api/revisions',{method:'PUT',headers:auth,body:JSON.stringify({doc,sha})});assert.equal(saved.status,200);
  assert.equal(Buffer.from(uploaded.content,'base64').toString(),JSON.stringify(doc));
  const tooBig=await request(state.env,'/api/revisions',{method:'PUT',headers:auth,body:' '.repeat(25000001)});assert.equal(tooBig.status,413);
  const limit=setup({FETCH:async()=>r({sha,size:25000001,encoding:'none',content:''})});await login(limit);
  const blocked=await request(limit.env,'/api/revisions',{headers:auth});assert.equal(blocked.status,413);assert.match((await blocked.json()).message,/25 MB/);
  const health=await request(state.env,'/health');assert.equal((await health.json()).max_revision_bytes,25000000);
});
test('health fails closed when unconfigured and never exposes secrets',async()=>{
  const {env}=setup({GITHUB_CLIENT_SECRET:''});const health=await request(env,'/health');assert.equal((await health.json()).configured,false);
  assert.equal((await request(env,'/auth/start')).status,503);
});
test('OAuth starts with secure cookie, random state and PKCE; callback requires matching cookie',async()=>{
  const {env}=setup();const start=await request(env,'/auth/start');assert.equal(start.status,302);const target=new URL(start.headers.get('Location'));
  assert.equal(target.hostname,'github.com');assert.equal(target.searchParams.get('code_challenge_method'),'S256');assert.equal(target.searchParams.get('code_challenge').length,43);
  assert.match(start.headers.get('Set-Cookie'),/HttpOnly; Secure; SameSite=Lax/);
  assert.equal((await request(env,'/auth/callback?code=test&state='+target.searchParams.get('state'))).status,401);
});
test('successful callback checks owner; browser receives only scoped session ticket',async()=>{
  const {env}=setup({FETCH:async url=>url.includes('access_token')?r({access_token:'github-access-secret',refresh_token:'refresh-secret',expires_in:28800}):url.endsWith('/user')?r({login:'Pingliang123'}):r({permissions:{push:true}})});
  const start=await request(env,'/auth/start');const state=new URL(start.headers.get('Location')).searchParams.get('state');
  const callback=await request(env,'/auth/callback?code=test&state='+state,{headers:{Cookie:start.headers.get('Set-Cookie').split(';')[0]}});
  assert.equal(callback.status,200);const body=await callback.text();assert(body.includes('postMessage'));assert(!body.includes('github-access-secret'));assert(!body.includes('refresh-secret'));
  const replay=await request(env,'/auth/callback?code=test&state='+state,{headers:{Cookie:start.headers.get('Set-Cookie').split(';')[0]}});assert.equal(replay.status,401);
});
test('other GitHub accounts cannot create a session',async()=>{
  const {env,instance,storage}=setup({FETCH:async url=>url.includes('access_token')?r({access_token:'access'}):r({login:'someone-else'})});
  await storage.put('flow',{verifier:'verifier',expires:Date.now()+10000});const response=await instance.fetch(new Request('https://internal/finish',{method:'POST',body:JSON.stringify({code:'test',callback:'https://sync.example/auth/callback'})}));assert.equal(response.status,403);assert(!await storage.get('credentials'));
});
test('CORS and authentication reject foreign origins and unsigned sessions',async()=>{
  const {env}=setup();const allowed=await request(env,'/api/revisions',{method:'OPTIONS'});assert.equal(allowed.status,204);assert.equal(allowed.headers.get('Access-Control-Allow-Origin'),env.SITE_ORIGIN);
  const foreign=await request(env,'/api/revisions',{headers:{Origin:'https://evil.example'}});assert.equal(foreign.status,403);assert(!foreign.headers.has('Access-Control-Allow-Origin'));
  assert.equal((await request(env,'/api/revisions')).status,401);
});
test('expired GitHub tokens refresh once even for concurrent requests',async()=>{
  let refreshes=0;const state=setup({FETCH:async url=>{assert(url.includes('access_token'));refreshes++;return r({access_token:'new-access',refresh_token:'rotated-refresh',expires_in:28800});}});
  await login(state,Date.now()-1);
  const results=await Promise.all([state.instance.fetch(new Request('https://internal/session')),state.instance.fetch(new Request('https://internal/session'))]);assert(results.every(x=>x.status===200));assert.equal(refreshes,1);
  const saved=await open(await state.storage.get('credentials'),secret);assert.equal(saved.refresh_token,'rotated-refresh');
});
test('only canonical file can be written; stale SHA, invalid data and logout are safe',async()=>{
  const writes=[];const state=setup({FETCH:async(url,options)=>{
    if(options.method==='PUT'){writes.push({url,body:JSON.parse(options.body)});return r({commit:{sha:'commit'}});}
    return r({sha,content:pack(doc)});
  }});await login(state);
  const auth={Authorization:'Bearer '+await ticket(sid,secret),'Content-Type':'application/json'};
  const submitted={doc,sha,path:'.github/workflows/evil.yml',branch:'other'};
  const success=await request(state.env,'/api/revisions',{method:'PUT',headers:auth,body:JSON.stringify(submitted)});assert.equal(success.status,200);
  assert.equal(writes.length,1);assert(writes[0].url.endsWith('/contents/manual-revisions.json'));assert.equal(writes[0].body.branch,'main');assert(!JSON.stringify(writes).includes('evil.yml'));
  assert.equal((await request(state.env,'/api/revisions',{method:'PUT',headers:auth,body:JSON.stringify({doc,sha:'b'.repeat(40)})})).status,409);
  assert.equal((await request(state.env,'/api/revisions',{method:'PUT',headers:auth,body:JSON.stringify({doc:{schema_version:99},sha})})).status,400);assert.equal(writes.length,1);
  assert.equal((await request(state.env,'/api/logout',{method:'POST',headers:auth})).status,200);
  assert.equal((await request(state.env,'/api/session',{headers:auth})).status,401);
});
test('GitHub permission and rate limits give actionable errors',async()=>{
  for(const [upstream,expected] of [[r({message:'Resource not accessible'},403),403],[r({message:'rate limit exceeded'},403,{'X-RateLimit-Remaining':'0'}),429]]){
    const state=setup({FETCH:async()=>upstream.clone()});await login(state);
    const response=await request(state.env,'/api/revisions',{headers:{Authorization:'Bearer '+await ticket(sid,secret)}});assert.equal(response.status,expected);assert(!JSON.stringify(await response.json()).includes('github-access-secret'));
  }
});
test('compact baseline validates actual published revision data and rejects wrong corpus',()=>{
  validate(JSON.parse(fs.readFileSync(new URL('./test-revisions.json',import.meta.url),'utf8')));
  assert.throws(()=>validate({...doc,corpus_id:'different',source_sha256:'different'}),/验证/);
});
test('one-time App setup requires private key, matching cookie, correct owner and permissions',async()=>{
  const bootstrap='private-one-time-setup-link';
  const hash=Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(bootstrap))).toString('hex');
  const values=new Map(),storage={async put(k,v){values.set(k,structuredClone(v));},async get(k){return structuredClone(values.get(k));},async delete(k){values.delete(k);}};
  let owner='wrong-owner';
  const {env}=setup({GITHUB_CLIENT_ID:'',GITHUB_CLIENT_SECRET:'',SETUP_KEY_HASH:hash,FETCH:async url=>{
    assert(url.startsWith('https://api.github.com/app-manifests/'));
    // Match GitHub's documented response: there is no `public` field.
    return r({client_id:'app-id',client_secret:'private-client-secret',pem:'must-not-be-stored',slug:'liaozhai-sync-test',permissions:{contents:'write'},owner:{login:owner}});
  }});
  const control=new SyncControl({storage},env);env.CONTROL={idFromName:x=>x,get:()=>control};
  assert.equal((await (await request(env,'/health')).json()).configured,false);
  const begin=key=>request(env,'/setup/start',{method:'POST',headers:{Origin:'https://sync.example','Content-Type':'application/json'},body:JSON.stringify({key})});
  assert.equal((await begin('wrong-key')).status,403);
  let start=await begin(bootstrap),data=await start.json();
  assert.equal(data.manifest.public,false);assert.equal(data.manifest.default_permissions.contents,'write');
  const callback=(state,cookie)=>request(env,'/setup/complete?state='+state+'&code=temporary-code',{headers:cookie?{Cookie:cookie}:{}});
  assert.equal((await callback(data.state)).status,401);
  assert.equal((await callback(data.state,start.headers.get('Set-Cookie').split(';')[0])).status,403);
  assert(!values.has('app'));
  owner='Pingliang123';start=await begin(bootstrap);data=await start.json();
  const success=await callback(data.state,start.headers.get('Set-Cookie').split(';')[0]);assert.equal(success.status,200);
  const body=await success.text();assert(body.includes('installations/new'));assert(!body.includes('private-client-secret'));
  assert(!JSON.stringify([...values.values()]).includes('private-client-secret'));assert(!JSON.stringify([...values.values()]).includes('must-not-be-stored'));
  assert.equal((await (await request(env,'/health')).json()).configured,true);
  assert.equal((await begin(bootstrap)).status,403);
});
