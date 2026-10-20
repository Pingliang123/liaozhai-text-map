(function(root) {
  'use strict';
  const OWNER='Pingliang123', REPO='liaozhai-text-map', FILE='manual-revisions.json';
  const API=`https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE}`;
  const RAW=`https://raw.githubusercontent.com/${OWNER}/${REPO}/main/${FILE}`;
  const MAX_BYTES=25000000;
  const clone=x=>JSON.parse(JSON.stringify(x));
  const stable=x=>Array.isArray(x)?x.map(stable):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(key=>[key,stable(x[key])])):x;
  const equal=(a,b)=>a===b||JSON.stringify(a)===JSON.stringify(b)||JSON.stringify(stable(a))===JSON.stringify(stable(b));
  function encode(doc) {
    const bytes=new TextEncoder().encode(JSON.stringify(doc));
    if(bytes.length>MAX_BYTES)throw new Error('修订文件超过 25 MB，本机修改已保留。');
    let value=''; for(let i=0;i<bytes.length;i+=8192) value+=String.fromCharCode(...bytes.subarray(i,i+8192));
    return btoa(value);
  }
  function decode(value) {
    return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(atob(value.replace(/\s/g,'')),x=>x.charCodeAt(0))));
  }
  function create(options) {
    let ancestor=clone(options.ancestor), token='', running=null, wanted=false;
    const connected=()=>!!token||!!options.cloud?.connected();
    const status=options.status||(()=>{}), request=options.request||fetch;
    let validatedJSON=null;
    const validate=doc=>{
      const encoded=JSON.stringify(doc);
      if(encoded!==validatedJSON){
        if(!options.localIsValidated||!equal(doc,options.getLocal()))options.validate(doc);
        validatedJSON=encoded;
      }
      return doc;
    };
    function acknowledge(doc){if(!equal(ancestor,doc)){ancestor=clone(doc);options.onAncestor?.(clone(ancestor));}}
    async function remote(authenticated) {
      if(authenticated&&options.cloud?.connected())return validateRemote(await options.cloud.read());
      const response=await request(authenticated?API+'?ref=main':RAW+'?t='+Date.now(),{
        cache:'no-store',signal:AbortSignal.timeout(30000),
        headers:authenticated?{Accept:'application/vnd.github+json',Authorization:'Bearer '+token}:{}});
      if(!response.ok) throw new Error(response.status===401||response.status===403?'GitHub 授权失效或没有仓库写入权限，请重新连接。':`读取云端失败（HTTP ${response.status}），本机修订已保留。`);
      const data=await response.json();
      if(authenticated&&data.size>MAX_BYTES)throw new Error('云端修订超过 25 MB，本机修改已保留。');
      if(authenticated&&!data.content&&data.encoding==='none') {
        if(!/^[a-f0-9]{40}$/.test(data.sha))throw new Error('云端文件标识无效。');
        const blob=await request(`https://api.github.com/repos/${OWNER}/${REPO}/git/blobs/${data.sha}`,{
          signal:AbortSignal.timeout(30000),headers:{Accept:'application/vnd.github+json',Authorization:'Bearer '+token}});
        if(!blob.ok)throw new Error(`读取完整云端修订失败（HTTP ${blob.status}）。`);
        data.content=(await blob.json()).content;
      }
      return authenticated?{doc:validate(decode(data.content)),sha:data.sha}:{doc:validate(data)};
    }
    function validateRemote(incoming){validate(incoming.doc);if(!/^[a-f0-9]{40}$/.test(incoming.sha||''))throw new Error('云端修订版本标识无效。');return incoming;}
    async function pass() {
      if(options.hasDraft()) { status('请先保存当前输入；保存后会自动同步。');return; }
      for(let attempt=0;attempt<3;attempt++) {
        const incoming=await remote(connected());
        if(options.hasDraft()) {status('请先保存当前输入；云端尚未覆盖本机。');return;}
        const mine=clone(options.getLocal());
        if(equal(mine,incoming.doc)){
          acknowledge(incoming.doc);status(connected()?'本机与云端一致。':'已载入云端修订；连接 GitHub 后可自动提交修改。');return;
        }
        const merged=equal(ancestor,mine)?incoming.doc:options.merge(ancestor,mine,incoming.doc);
        if(!connected()) {
          // Never acknowledge unsent local edits as part of the cloud ancestor.
          if(!equal(merged,options.getLocal()))await options.apply(merged);
          acknowledge(incoming.doc);
          status(equal(merged,incoming.doc)?'已载入云端修订；连接 GitHub 后可自动提交修改。':'本机有待上传修订；连接 GitHub 后自动提交。');return;
        }
        if(!equal(merged,incoming.doc)) {
          const response=options.cloud?.connected()?await options.cloud.write(merged,incoming.sha):await request(API,{method:'PUT',signal:AbortSignal.timeout(45000),
            headers:{Accept:'application/vnd.github+json',Authorization:'Bearer '+token,'Content-Type':'application/json'},
            body:JSON.stringify({message:'保存地图人工修订',branch:'main',sha:incoming.sha,content:encode(merged)})});
          if(response.status===409||response.status===422) continue;
          if(!response.ok){
            let problem={};try{problem=await response.json();}catch(_){}
            if(options.cloud)throw new Error(problem.message||`提交失败（HTTP ${response.status}），本机修订已保留。`);
            if(response.status===403)throw new Error('GitHub 拒绝写入（403）：临时令牌的仓库范围或 Contents 写入权限不足，也可能受到 GitHub 限流。建议改用「登入 GitHub」；本机修订已保留。');
            throw new Error(`提交失败（HTTP ${response.status}），本机修订保留，可重试或下载备份。`);
          }
        }
        // Include edits saved while the network request was in flight.
        const current=options.getLocal(),latest=equal(mine,current)?merged:options.merge(mine,current,merged);
        if(options.hasDraft()) {status('已提交云端；当前输入保留，保存后继续同步。');return;}
        if(!equal(latest,options.getLocal()))await options.apply(latest);
        acknowledge(merged);
        if(!equal(latest,merged)) wanted=true;
        status('已保存到 GitHub；发布版将在自动测试后更新。');return;
      }
      throw new Error('云端同时有其他提交，请稍后重试。本机修订未删除。');
    }
    async function sync() {
      wanted=true;if(running)return running;
      running=(async()=>{try {while(wanted){wanted=false;await pass();}}catch(error){wanted=false;status(error.message,true);throw error;}finally{running=null;}})();
      return running;
    }
    return {sync,async pull(){if(running)await running.catch(()=>{});if(options.hasDraft())throw new Error('请先保存或取消当前输入。');const incoming=await remote(connected());await options.apply(incoming.doc);ancestor=clone(incoming.doc);options.onAncestor?.(clone(ancestor));status('已载入云端版本；原本机修订请从刚下载的备份核对。');},connect(value){if(!value||/\s/.test(value))throw new Error('请输入有效的 GitHub 授权令牌。');token=value;},async disconnect(){token='';await options.cloud?.logout();status('已退出 GitHub；本机仍可保存，云端修订可继续读取。');},connected};
  }
  async function mount(options) {
    const button=document.getElementById('save-github');if(!button)return;
    const panel=document.createElement('details'), title=document.createElement('summary'); title.textContent='云端同步';panel.append(title);
    const status=document.createElement('p');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
    const info=document.createElement('p');info.textContent='登入后，每次保存人工修订会自动提交到 GitHub；此设备会恢复登入状态，授权到期由后台自动更新。';
    const input=document.createElement('input');input.type='password';input.autocomplete='off';input.placeholder='GitHub fine-grained token';input.setAttribute('aria-label','GitHub 授权令牌');
    const help=document.createElement('a');help.href='https://github.com/settings/personal-access-tokens/new';help.target='_blank';help.rel='noopener';help.textContent='建立限于 liaozhai-text-map 的令牌（Contents: Read and write）';
    const connect=document.createElement('button');connect.type='button';connect.textContent='连接并同步';
    const disconnect=document.createElement('button');disconnect.type='button';disconnect.textContent='断开连接';
    const pull=document.createElement('button');pull.type='button';pull.textContent='备份本机并载入云端';
    const legacy=document.createElement('details'),legacyTitle=document.createElement('summary');legacyTitle.textContent='高级：临时令牌';legacy.append(legacyTitle,help,document.createElement('br'),input,connect);
    const backendInput=document.createElement('input');backendInput.type='url';backendInput.placeholder='https://你的同步服务.workers.dev';backendInput.setAttribute('aria-label','云端同步服务网址');
    const configure=document.createElement('button');configure.type='button';configure.textContent='连接同步服务';
    panel.append(info,backendInput,configure,disconnect,pull,legacy);button.textContent='登入 GitHub';
    const backup=button.closest('details'),cloud=document.createElement('section');cloud.setAttribute('aria-label','云端同步');cloud.id='cloud-sync';
    if(backup){backup.before(cloud);cloud.append(button,status,panel);}else button.after(status,panel);
    let service='';try{const config=await fetch('github-sync-config.json?t='+Date.now(),{cache:'no-store',signal:AbortSignal.timeout(10000)});if(config.ok)service=(await config.json()).backend_url||'';}catch(_){}
    try{service=localStorage.getItem('liaozhai-sync-service-v1')||service;}catch(_){}
    let transport=null;
    if(service&&root.GhostMapLogin)try{transport=root.GhostMapLogin.create({url:service});backendInput.value=service;}catch(error){status.textContent=error.message;}
    configure.addEventListener('click',()=>{try{
      if(options.hasDraft())throw new Error('请先保存或取消当前输入，再连接同步服务。');
      root.GhostMapLogin.create({url:backendInput.value.trim()});localStorage.setItem('liaozhai-sync-service-v1',backendInput.value.trim());window.location.reload();
    }catch(error){status.textContent=error.message;}});
    const key='liaozhai-cloud-ancestor-v1-'+options.base.corpus_id;
    // A legacy browser has no known cloud ancestor; absent old rows must not
    // delete corrections already saved by a different device.
    let ancestor=options.initialAncestor;try{const saved=localStorage.getItem(key);if(saved){options.validate(JSON.parse(saved));ancestor=JSON.parse(saved);}}catch(_){}
    let applying=false,timer;
    const client=create({...options,ancestor,cloud:transport,
      apply:async doc=>{applying=true;try{await options.apply(doc);}finally{applying=false;}},
      onAncestor:doc=>{try{localStorage.setItem(key,JSON.stringify(doc));}catch(_){}},
      status:(message,error)=>{status.textContent=message;status.style.color=error?'#a12828':'';}});
    const run=()=>client.sync().catch(()=>{});
    connect.addEventListener('click',()=>{try{client.connect(input.value.trim());input.value='';run();}catch(error){status.textContent=error.message;}});
    disconnect.addEventListener('click',()=>{client.disconnect().catch(error=>{status.textContent=error.message;});input.value='';button.textContent='登入 GitHub';});
    pull.addEventListener('click',()=>{
      if(options.hasDraft()){status.textContent='请先保存或取消当前输入。';return;}
      if(!window.confirm('将下载当前已保存修订的备份，再以云端版本替换本机已保存修订。是否继续？'))return;
      const url=URL.createObjectURL(new Blob([JSON.stringify(options.getLocal(),null,2)],{type:'application/json'}));
      const link=document.createElement('a');link.href=url;link.download='聊斋同步前本机备份.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
      client.pull().catch(error=>{status.textContent=error.message;});
    });
    button.addEventListener('click',()=>{
      if(!transport){panel.open=true;status.textContent='登入后端尚未接通。配置完成后，将自动保存到 GitHub；当前本机修订保留。';backendInput.focus();return;}
      if(transport.connected()){run();return;}
      transport.login().then(()=>{button.textContent='立即同步';run();}).catch(error=>{status.textContent=error.message;});
    });
    window.addEventListener('ghostmap:revision-saved',()=>{if(applying)return;clearTimeout(timer);timer=setTimeout(run,1500);});
    window.addEventListener('online',run);
    let lastCheck=Date.now();document.addEventListener('visibilitychange',()=>{if(!document.hidden&&Date.now()-lastCheck>60000){lastCheck=Date.now();run();}});
    setInterval(()=>{if(!document.hidden){lastCheck=Date.now();run();}},300000);
    // Anonymous visitors can read revisions without publishing credentials.
    if(transport)try{await transport.restore();if(transport.connected())button.textContent='立即同步';}catch(error){status.textContent=error.message;}
    run();return client;
  }
  const api={create,mount,encode,decode};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.GhostMapSync=api;
})(globalThis);
