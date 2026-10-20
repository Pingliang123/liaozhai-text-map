(function(){
  'use strict';
  // Keep old bookmarks usable, but give vocabulary changes one destination.
  const destination=new URL('../../index.html?edit=words#vocabulary-editor',location.href);
  const a=document.createElement('a');a.href=destination.href;a.textContent='词汇修订';document.querySelector('header').append(a);
  document.addEventListener('click',event=>{
    const link=event.target.closest('a');if(!link)return;
    const url=new URL(link.href,location.href);
    if(url.origin!==destination.origin||!url.pathname.endsWith('/index.html')||!(url.searchParams.get('review')==='places'||url.hash==='#location-panel'))return;
    const target=new URL(destination);if(url.hash==='#location-panel'){
      target.searchParams.set('kind','places');target.searchParams.set('scope','unmapped');
      const summary=link.closest('details')?.querySelector('summary');if(summary)target.searchParams.set('word',summary.textContent.split(' · ')[0]);
    }
    // Rewrite rather than force navigation: modifier keys and new tabs still work.
    link.href=target.href;
  },true);
})();
