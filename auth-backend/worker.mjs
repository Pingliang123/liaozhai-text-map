import Model from './model.cjs';
import validationBase from './validation-base.json' with {type:'json'};

const encoder=new TextEncoder(), decoder=new TextDecoder();
const FILE='manual-revisions.json', MAX_BYTES=25000000, SESSION_DAYS=30;
const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
class Failure extends Error {constructor(status,message){super(message);this.status=status;}}
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{...headers,'Content-Type':'application/json'}});
function base64(bytes){let text='';for(let i=0;i<bytes.length;i+=8192)text+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(text);}
const unbase64=text=>Uint8Array.from(atob(text),ch=>ch.charCodeAt(0));
const url64=bytes=>base64(bytes).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
const random=()=>url64(crypto.getRandomValues(new Uint8Array(32)));
const hex=bytes=>Array.from(new Uint8Array(bytes),x=>x.toString(16).padStart(2,'0')).join('');
async function key(secret,algorithm,usage){return crypto.subtle.importKey('raw',await crypto.subtle.digest('SHA-256',encoder.encode(secret)),algorithm,false,usage);}
async function seal(value,secret){const iv=crypto.getRandomValues(new Uint8Array(12));const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv},await key(secret,'AES-GCM',['encrypt']),encoder.encode(JSON.stringify(value)));return {iv:base64(iv),data:base64(new Uint8Array(encrypted))};}
async function open(value,secret){return JSON.parse(decoder.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:unbase64(value.iv)},await key(secret,'AES-GCM',['decrypt']),unbase64(value.data))));}
async function ticket(sid,secret){const signature=await crypto.subtle.sign('HMAC',await key(secret,{name:'HMAC',hash:'SHA-256'},['sign']),encoder.encode(sid));return sid+'.'+url64(new Uint8Array(signature));}
async function verify(value,secret){
  if(!/^[A-Za-z0-9_-]{43}\.[A-Za-z0-9_-]{43}$/.test(value||''))throw new Failure(401,'请先登入 GitHub。');
  const [sid,signature]=value.split('.');
  if(!await crypto.subtle.verify('HMAC',await key(secret,{name:'HMAC',hash:'SHA-256'},['verify']),unbase64(signature.replaceAll('-','+').replaceAll('_','/')+'='),encoder.encode(sid)))throw new Failure(401,'登入已失效，请重新登入。');
  return sid;
}
async function readJSON(request){
  if(Number(request.headers.get('Content-Length'))>MAX_BYTES)throw new Failure(413,'修订文件超过 25 MB，本机修改已保留。');
  const reader=request.body?.getReader();if(!reader)throw new Failure(400,'缺少修订数据。');
  const chunks=[];let length=0;
  while(true){const {value,done}=await reader.read();if(done)break;length+=value.length;if(length>MAX_BYTES){await reader.cancel();throw new Failure(413,'修订文件超过 25 MB，本机修改已保留。');}chunks.push(value);}
  const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  try{return JSON.parse(decoder.decode(bytes));}catch(_){throw new Failure(400,'修订数据不是有效 JSON。');}
}
async function github(path,token,env,options={}){
  const response=await (env.FETCH||fetch)('https://api.github.com'+path,{...options,signal:AbortSignal.timeout(30000),headers:{Accept:'application/vnd.github+json','User-Agent':'Liaozhai-Cloud-Sync',Authorization:'Bearer '+token,...options.headers}});
  if(!response.ok){
    let detail={};try{detail=await response.json();}catch(_){}
    if(response.status===409||response.status===422)throw new Failure(response.status,'云端版本已变化，请重新合并后提交。');
    if(response.status===401)throw new Failure(401,'GitHub 授权失效，请重新登入。');
    if(response.status===403){
      if(response.headers.get('Retry-After')||response.headers.get('X-RateLimit-Remaining')==='0'||/rate limit/i.test(detail.message||''))throw new Failure(429,'GitHub 暂时限流，请稍后重试。本机修订已保留。');
      throw new Failure(403,'GitHub App 没有此仓库的 Contents 写入权限，请检查 App 安装的仓库与权限。');
    }
    throw new Failure(response.status===404?403:502,'GitHub 仓库访问失败，请确认 App 已安装到 liaozhai-text-map。');
  }
  return response.json();
}
async function exchange(body,env){
  const response=await (env.FETCH||fetch)('https://github.com/login/oauth/access_token',{method:'POST',signal:AbortSignal.timeout(30000),headers:{Accept:'application/json','Content-Type':'application/json'},body:JSON.stringify({client_id:env.GITHUB_CLIENT_ID,client_secret:env.GITHUB_CLIENT_SECRET,...body})});
  const data=await response.json();if(!response.ok||!data.access_token)throw new Failure(401,'GitHub 登入或授权更新失败，请重新登入。');return data;
}
const repoPath=env=>'/repos/'+encodeURIComponent(env.OWNER)+'/'+encodeURIComponent(env.REPO);
async function readRevisions(token,env){
  const data=await github(repoPath(env)+'/contents/'+FILE+'?ref=main',token,env);
  if(data.size>MAX_BYTES)throw new Failure(413,'云端修订超过 25 MB，本机修改已保留。');
  let content=data.content;
  if(!content&&data.encoding==='none')content=(await github(repoPath(env)+'/git/blobs/'+data.sha,token,env)).content;
  if(!content||!/^[a-f0-9]{40}$/.test(data.sha))throw new Failure(502,'云端修订文件不完整。');
  const bytes=unbase64(content.replace(/\s/g,''));if(bytes.length>MAX_BYTES)throw new Failure(413,'云端修订超过 25 MB，本机修改已保留。');
  return {doc:JSON.parse(decoder.decode(bytes)),sha:data.sha};
}
function validate(doc){try{const model=Model.create(validationBase);model.importDocument(doc);}catch(error){throw new Failure(400,'修订未通过验证：'+error.message);}}

async function configuration(env){
  if(!env.CONTROL)return env;
  const response=await env.CONTROL.get(env.CONTROL.idFromName('configuration')).fetch(new Request('https://internal/configuration'));
  return {...env,...await response.json()};
}
export class SyncControl {
  constructor(state,env){this.state=state;this.env=env;this.queue=Promise.resolve();}
  fetch(request){const response=this.queue.then(()=>this.handle(request)).catch(error=>json({message:error instanceof Failure?error.message:'设置服务暂时不可用。'},error.status||500));this.queue=response.then(()=>{});return response;}
  async handle(request){
    const path=new URL(request.url).pathname;
    let secret=await this.state.storage.get('root-secret');
    if(!secret){secret=random()+random();await this.state.storage.put('root-secret',secret);}
    const encrypted=await this.state.storage.get('app');
    const app=encrypted?await open(encrypted,secret):null;
    if(path==='/configuration')return json({AUTH_SECRET:secret,...(app?{GITHUB_CLIENT_ID:app.client_id,GITHUB_CLIENT_SECRET:app.client_secret,APP_SLUG:app.slug}:{})});
    if(app)throw new Failure(409,'GitHub App 已设置，不能重复初始化。');
    if(path==='/begin'){
      await this.state.storage.put('setup',await request.json());return json({ok:true});
    }
    if(path==='/finish'){
      const input=await request.json(),setup=await this.state.storage.get('setup');
      if(!setup||setup.state!==input.state||setup.expires<Date.now())throw new Failure(401,'设置校验失败或已过期。');
      await this.state.storage.delete('setup');
      if(!/^[A-Za-z0-9_-]{1,200}$/.test(input.code||''))throw new Failure(400,'GitHub 设置代码无效。');
      const response=await (this.env.FETCH||fetch)('https://api.github.com/app-manifests/'+encodeURIComponent(input.code)+'/conversions',{method:'POST',signal:AbortSignal.timeout(30000),headers:{Accept:'application/vnd.github+json','User-Agent':'Liaozhai-Cloud-Sync'}});
      if(!response.ok)throw new Failure(400,'GitHub App 配置未取回，请重新开始设置。');
      const result=await response.json();
      if(result.owner?.login?.toLowerCase()!==this.env.ALLOWED_LOGIN.toLowerCase())throw new Failure(403,'App 所属账号不符，请使用 '+this.env.ALLOWED_LOGIN+' 设置。');
      if(!result.client_id||!result.client_secret||!result.slug||result.permissions?.contents!=='write')throw new Failure(403,'App 配置不完整或缺少 Contents 写入权限，尚未启用。');
      // GitHub's documented manifest conversion response omits `public`.
      // The submitted manifest already fixes it to false; do not mistake an
      // omitted response field for an unexpected change of visibility.
      if(result.public===true)throw new Failure(403,'App 可见性与私有设置不符，尚未启用。');
      await this.state.storage.put('app',await seal({client_id:result.client_id,client_secret:result.client_secret,slug:result.slug},secret));
      // The manifest also returns a private key; this service does not need it
      // and deliberately neither persists it nor returns it to the browser.
      return json({slug:result.slug});
    }
    throw new Failure(404,'设置接口不存在。');
  }
}

// Each session serializes refresh operations so a rotating refresh token cannot
// be consumed by concurrent requests. Stored GitHub credentials are encrypted.
export class SyncSession {
  constructor(state,env){this.state=state;this.env=env;this.queue=Promise.resolve();}
  fetch(request){const result=this.queue.then(()=>this.handle(request)).catch(error=>json({message:error instanceof Failure?error.message:'同步服务暂时不可用。'},error.status||500));this.queue=result.then(()=>{});return result;}
  async handle(request){
    const env=await configuration(this.env),path=new URL(request.url).pathname;
    if(path==='/begin'){
      const flow=await request.json();await this.state.storage.put('flow',flow);await this.state.storage.setAlarm(flow.expires);return json({ok:true});
    }
    if(path==='/finish'){
      const flow=await this.state.storage.get('flow');if(!flow||flow.expires<Date.now())throw new Failure(401,'登入请求已过期，请重新登入。');
      await this.state.storage.delete('flow');
      const input=await request.json();
      const tokens=await exchange({code:input.code,redirect_uri:input.callback,code_verifier:flow.verifier},env);
      const user=await github('/user',tokens.access_token,env);
      if(user.login?.toLowerCase()!==env.ALLOWED_LOGIN.toLowerCase())throw new Failure(403,'此账号没有地图修订权限。');
      const repo=await github(repoPath(env),tokens.access_token,env);
      if(!repo.permissions?.push)throw new Failure(403,'当前账号没有地图库写入权限。');
      const record={...tokens,accessExpires:tokens.expires_in?Date.now()+tokens.expires_in*1000:Number.MAX_SAFE_INTEGER,login:user.login,expires:Date.now()+SESSION_DAYS*86400000};
      await this.state.storage.put('credentials',await seal(record,env.AUTH_SECRET));await this.state.storage.setAlarm(record.expires);
      return json({login:record.login,expires:record.expires});
    }
    if(path==='/logout'){await this.state.storage.deleteAll();return json({ok:true});}
    const stored=await this.state.storage.get('credentials');if(!stored)throw new Failure(401,'请重新登入 GitHub。');
    let credentials=await open(stored,env.AUTH_SECRET);
    if(credentials.expires<Date.now()){await this.state.storage.deleteAll();throw new Failure(401,'登入已到期，请重新登入。');}
    if(credentials.accessExpires<Date.now()+60000){
      if(!credentials.refresh_token)throw new Failure(401,'GitHub 授权到期，请重新登入。');
      const tokens=await exchange({grant_type:'refresh_token',refresh_token:credentials.refresh_token},env);
      credentials={...credentials,...tokens,accessExpires:Date.now()+(tokens.expires_in||28800)*1000};
      await this.state.storage.put('credentials',await seal(credentials,env.AUTH_SECRET));
    }
    if(path==='/session')return json({login:credentials.login,expires:credentials.expires});
    if(path==='/revisions'&&request.method==='GET')return json(await readRevisions(credentials.access_token,env));
    if(path==='/revisions'&&request.method==='PUT'){
      const input=await readJSON(request);if(!/^[a-f0-9]{40}$/.test(input.sha||''))throw new Failure(400,'修订版本标识无效。');
      validate(input.doc);
      const latest=await readRevisions(credentials.access_token,env);
      if(latest.sha!==input.sha)throw new Failure(409,'其他设备已保存新修订，请重新合并。');
      // Path, branch and commit message are fixed here; client input cannot
      // update code, workflow files, another repository or another branch.
      const result=await github(repoPath(env)+'/contents/'+FILE,credentials.access_token,env,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:'保存地图人工修订',branch:'main',sha:input.sha,content:base64(encoder.encode(JSON.stringify(input.doc)))})});
      return json({ok:true,commit:result.commit?.sha});
    }
    throw new Failure(404,'接口不存在。');
  }
  async alarm(){await this.state.storage.deleteAll();}
}

const cookieName='__Host-liaozhai-login';
const cookie=(value,age=600)=>`${cookieName}=${value}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${age}`;
function failurePage(message,status=400){return new Response('<!doctype html><meta charset="utf-8"><title>地图登入</title><p>'+message.replace(/[<>&"]/g,ch=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[ch]))+'</p><p>可关闭本页后重新登入；本机修订仍保留。</p>',{status,headers:{...headers,'Content-Type':'text/html; charset=utf-8'}});}
function configured(env){return !!(env.GITHUB_CLIENT_ID&&env.GITHUB_CLIENT_SECRET&&env.AUTH_SECRET?.length>=32);}
async function route(request,env){
  const url=new URL(request.url),origin=request.headers.get('Origin');
  env=await configuration(env);
  if(url.pathname==='/health')return json({ok:true,configured:configured(env),owner:env.ALLOWED_LOGIN,max_revision_bytes:MAX_BYTES});
  if(url.pathname==='/setup/installed')return failurePage('安装完成。请回到地图点击「登入 GitHub」，即可自动同步保存的修订。',200);
  if(url.pathname==='/setup'){
    if(configured(env))return failurePage('GitHub App 已配置，请回到地图登入。',200);
    const nonce=random();
    const body=`<!doctype html><meta charset="utf-8"><title>地图云端同步设置</title><style>body{max-width:720px;margin:60px auto;padding:20px;font:18px/1.8 system-ui;color:#284637}button{padding:12px 20px;font:inherit}p{margin:20px 0}</style><h1>地图云端同步</h1><p>一次设置后，在地图登入 GitHub 即可自动提交修订。</p><ol><li>点击下方按钮，使用 Pingliang123 建立专用 GitHub App。</li><li>在 GitHub 确认 Create GitHub App。</li><li>回到这里后安装 App，只选择 liaozhai-text-map 仓库。</li></ol><button id="start">开始设置 GitHub App</button><p id="status"></p><script nonce="${nonce}">const key=new URLSearchParams(location.hash.slice(1)).get('key');history.replaceState(null,'','/setup');document.getElementById('start').onclick=async()=>{const status=document.getElementById('status');if(!key){status.textContent='请使用专属设置链接打开本页。';return;}try{const response=await fetch('/setup/start',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key})});const data=await response.json();if(!response.ok)throw new Error(data.message);const form=document.createElement('form');form.method='POST';form.action='https://github.com/settings/apps/new?state='+encodeURIComponent(data.state);const input=document.createElement('input');input.type='hidden';input.name='manifest';input.value=JSON.stringify(data.manifest);form.append(input);document.body.append(form);form.submit();}catch(error){status.textContent=error.message;}};</script>`;
    return new Response(body,{headers:{...headers,'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':`default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}'; connect-src 'self'; form-action https://github.com; base-uri 'none'; frame-ancestors 'none'`}});
  }
  if(url.pathname==='/setup/start'){
    if(!env.CONTROL||configured(env)||request.method!=='POST'||origin!==url.origin||!env.SETUP_KEY_HASH)throw new Failure(403,'不能从此处初始化服务。');
    const input=await readJSON(request);
    if(typeof input.key!=='string'||input.key.length>200||hex(await crypto.subtle.digest('SHA-256',encoder.encode(input.key)))!==env.SETUP_KEY_HASH)throw new Failure(403,'设置链接无效。');
    const state=random();await env.CONTROL.get(env.CONTROL.idFromName('configuration')).fetch(new Request('https://internal/begin',{method:'POST',body:JSON.stringify({state,expires:Date.now()+600000})}));
    const manifest={name:'Liaozhai '+env.ALLOWED_LOGIN+' '+state.slice(0,6),url:env.SITE_ORIGIN+'/liaozhai-text-map/',redirect_url:url.origin+'/setup/complete',callback_urls:[url.origin+'/auth/callback'],setup_url:url.origin+'/setup/installed',hook_attributes:{url:url.origin+'/webhook',active:false},public:false,default_permissions:{contents:'write',metadata:'read'},default_events:[]};
    return new Response(JSON.stringify({state,manifest}),{headers:{...headers,'Content-Type':'application/json','Set-Cookie':cookie(state).replace(cookieName,'__Host-liaozhai-setup')}});
  }
  if(url.pathname==='/setup/complete'){
    const state=url.searchParams.get('state'),saved=request.headers.get('Cookie')?.split(';').map(p=>p.trim()).find(p=>p.startsWith('__Host-liaozhai-setup='))?.slice('__Host-liaozhai-setup='.length);
    if(!env.CONTROL||!state||state!==saved)throw new Failure(401,'设置校验失败，请重新打开设置链接。');
    const response=await env.CONTROL.get(env.CONTROL.idFromName('configuration')).fetch(new Request('https://internal/finish',{method:'POST',body:JSON.stringify({state,code:url.searchParams.get('code')})}));
    const data=await response.json();if(!response.ok)throw new Failure(response.status,data.message);
    if(!/^[a-z0-9-]+$/.test(data.slug))throw new Failure(400,'App 安装链接无效。');
    return new Response('<!doctype html><meta charset="utf-8"><title>安装 GitHub App</title><h1>App 已建立</h1><p>最后一步：安装 App，并选择 Only select repositories → liaozhai-text-map。</p><p><a href="https://github.com/apps/'+data.slug+'/installations/new">安装地图同步 App</a></p>',{headers:{...headers,'Content-Type':'text/html; charset=utf-8','Set-Cookie':cookie('',0).replace(cookieName,'__Host-liaozhai-setup')}});
  }
  if(url.pathname==='/')return failurePage(configured(env)?'同步服务已就绪，请从地图网站点击「登入 GitHub」。':'同步服务已部署，尚需配置 GitHub App 的 Client ID、Client secret 和 AUTH_SECRET。',200);
  if(!configured(env))throw new Failure(503,'登入服务尚未完成 GitHub App 配置；本机修订仍可保存。');
  if(url.pathname==='/auth/start'){
    const sid=random(),verifier=random(),challenge=url64(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(verifier))));
    const stub=env.SESSIONS.get(env.SESSIONS.idFromName(sid));
    await stub.fetch(new Request('https://internal/begin',{method:'POST',body:JSON.stringify({verifier,expires:Date.now()+600000})}));
    const target=new URL('https://github.com/login/oauth/authorize');
    target.search=new URLSearchParams({client_id:env.GITHUB_CLIENT_ID,redirect_uri:url.origin+'/auth/callback',state:sid,code_challenge:challenge,code_challenge_method:'S256',allow_signup:'false',scope:'offline_access'}).toString();
    return new Response(null,{status:302,headers:{...headers,Location:target.toString(),'Set-Cookie':cookie(sid)}});
  }
  if(url.pathname==='/auth/callback'){
    const state=url.searchParams.get('state'),saved=request.headers.get('Cookie')?.split(';').map(p=>p.trim()).find(p=>p.startsWith(cookieName+'='))?.slice(cookieName.length+1);
    if(!state||state!==saved||!/^[A-Za-z0-9_-]{43}$/.test(state)||!url.searchParams.get('code'))throw new Failure(401,'登入校验失败，请从地图重新登入。');
    const result=await env.SESSIONS.get(env.SESSIONS.idFromName(state)).fetch(new Request('https://internal/finish',{method:'POST',body:JSON.stringify({code:url.searchParams.get('code'),callback:url.origin+'/auth/callback'})}));
    const data=await result.json();if(!result.ok)throw new Failure(result.status,data.message);
    const session=await ticket(state,env.AUTH_SECRET),nonce=random();
    const payload=JSON.stringify({type:'liaozhai-github-login',session,login:data.login,expires:data.expires}).replaceAll('<','\\u003c');
    const fallback=env.SITE_ORIGIN+'/liaozhai-text-map/#cloud-session='+encodeURIComponent(session)+'&expires='+data.expires+'&login='+encodeURIComponent(data.login);
    const body=`<!doctype html><meta charset="utf-8"><title>登入成功</title><p>登入成功，正在返回地图。</p><script nonce="${nonce}">if(window.opener){window.opener.postMessage(${payload},${JSON.stringify(env.SITE_ORIGIN)});window.close();}else{location.replace(${JSON.stringify(fallback)});}</script>`;
    return new Response(body,{headers:{...headers,'Content-Type':'text/html; charset=utf-8','Set-Cookie':cookie('',0),'Content-Security-Policy':`default-src 'none'; script-src 'nonce-${nonce}'; base-uri 'none'; frame-ancestors 'none'`}});
  }
  if(url.pathname.startsWith('/api/')){
    if(origin!==env.SITE_ORIGIN)throw new Failure(403,'此网站不能访问修订服务。');
    if(request.method==='OPTIONS')return new Response(null,{status:204});
    const paths={'/api/session':'/session','/api/revisions':'/revisions','/api/logout':'/logout'};
    if(!paths[url.pathname]||!({'/api/session':['GET'],'/api/revisions':['GET','PUT'],'/api/logout':['POST']}[url.pathname].includes(request.method)))throw new Failure(404,'接口不存在。');
    const sid=await verify(request.headers.get('Authorization')?.replace(/^Bearer /,''),env.AUTH_SECRET);
    const forwarded=new Request('https://internal'+paths[url.pathname],{method:request.method,headers:{'Content-Type':'application/json'},...(['PUT','POST'].includes(request.method)?{body:request.body,duplex:'half'}:{})});
    return env.SESSIONS.get(env.SESSIONS.idFromName(sid)).fetch(forwarded);
  }
  throw new Failure(404,'页面不存在。');
}
export default {async fetch(request,env){
  let response;try{response=await route(request,env);}catch(error){response=/^\/(auth|setup)\//.test(new URL(request.url).pathname)&&request.method==='GET'?failurePage(error instanceof Failure?error.message:'登入服务暂时不可用。',error.status||500):json({message:error instanceof Failure?error.message:'同步服务暂时不可用。'},error.status||500);}
  const result=new Response(response.body,response);for(const [name,value] of Object.entries(headers))result.headers.set(name,value);
  if(request.headers.get('Origin')===env.SITE_ORIGIN){result.headers.set('Access-Control-Allow-Origin',env.SITE_ORIGIN);result.headers.set('Access-Control-Allow-Methods','GET, PUT, POST, OPTIONS');result.headers.set('Access-Control-Allow-Headers','Authorization, Content-Type');result.headers.set('Vary','Origin');}
  return result;
}};
export {seal,open,ticket,verify,validate};
