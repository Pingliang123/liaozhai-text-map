(function(root){
  'use strict';
  function create(options){
    const url=new URL(options.url);if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw new Error('同步服务须为 HTTPS 根网址。');
    const origin=url.origin,key='liaozhai-cloud-login-v1-'+origin,request=options.request||fetch;
    let storage=options.storage;try{storage||=root.localStorage;}catch(_){}
    storage||={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};
    let session=null;
    const clear=()=>{session=null;try{storage.removeItem(key);}catch(_){}};
    try{const prior=JSON.parse(storage.getItem(key)||'null');if(prior?.expires>Date.now()&&/^[A-Za-z0-9_-]{43}\.[A-Za-z0-9_-]{43}$/.test(prior.session))session=prior;}catch(_){}
    // Some browsers isolate OAuth popups. The backend can return to the map
    // with only the file-scoped service session in the fragment (not a URL query).
    const view=options.window||root;
    if(view.location?.hash?.startsWith('#cloud-session=')){
      const values=new URLSearchParams(view.location.hash.slice(1)),value=values.get('cloud-session'),expires=Number(values.get('expires'));
      if(/^[A-Za-z0-9_-]{43}\.[A-Za-z0-9_-]{43}$/.test(value||'')&&expires>Date.now()&&expires<Date.now()+31*86400000){session={session:value,expires,login:values.get('login')};try{storage.setItem(key,JSON.stringify(session));}catch(_){} }
      view.history?.replaceState(null,'',view.location.pathname+view.location.search);
    }
    async function call(path,method='GET',body){
      if(!session||session.expires<=Date.now()){clear();throw new Error('请登入 GitHub 后自动同步。');}
      const response=await request(origin+'/api/'+path,{method,signal:AbortSignal.timeout(45000),cache:'no-store',headers:{Authorization:'Bearer '+session.session,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
      if(response.status===401)clear();
      return response;
    }
    async function checked(response){const data=await response.json();if(!response.ok)throw new Error(data.message||'同步服务暂时无法使用。本机修订保留。');return data;}
    return {
      connected:()=>!!session&&session.expires>Date.now(),
      async restore(){if(!session)return false;await checked(await call('session'));return true;},
      read:async()=>checked(await call('revisions')),
      write:(doc,sha)=>call('revisions','PUT',{doc,sha}),
      async logout(){try{if(session)await call('logout','POST');}finally{clear();}},
      login(){return new Promise((resolve,reject)=>{
        const view=options.window||root;let popup=null,watch=null,timer=null;
        const done=(error,data)=>{view.removeEventListener('message',receive);clearInterval(watch);clearTimeout(timer);if(error){reject(error);return;}
          session={session:data.session,expires:data.expires,login:data.login};try{storage.setItem(key,JSON.stringify(session));}catch(_){}resolve(session.login);};
        const receive=event=>{
          if(event.origin!==origin||event.source!==popup||event.data?.type!=='liaozhai-github-login')return;
          const data=event.data;
          if(!/^[A-Za-z0-9_-]{43}\.[A-Za-z0-9_-]{43}$/.test(data.session||'')||!Number.isFinite(data.expires)||data.expires<=Date.now()||data.expires>Date.now()+31*86400000)return;
          done(null,data);
        };
        view.addEventListener('message',receive);
        popup=view.open(origin+'/auth/start','liaozhai-github-login','popup,width=680,height=760');
        if(!popup){done(new Error('浏览器拦截了登入窗口，请允许此网站打开登入窗口后重试。'));return;}
        watch=setInterval(()=>{if(popup.closed)done(new Error('登入窗口已关闭；本机修订仍保留。'));},700);
        timer=setTimeout(()=>done(new Error('登入超时，请重试。')),300000);
      });}
    };
  }
  const api={create};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.GhostMapLogin=api;
})(globalThis);
