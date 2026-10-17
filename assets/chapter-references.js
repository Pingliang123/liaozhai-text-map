(function(){
  'use strict';
  const panel=document.createElement('details');panel.id='chapter-references';panel.className='work-step';
  const heading=document.createElement('summary');heading.textContent='题解与白话译文';panel.append(heading);
  const content=document.createElement('div');content.style.cssText='max-height:65vh;overflow:auto;line-height:1.9;padding:12px';panel.append(content);
  let selected=null,data=null,request=null;
  function text(tag,value){const el=document.createElement(tag);el.textContent=value;return el;}
  function show(){
    content.replaceChildren();
    const row=data.chapters[String(selected)];
    if(!row){content.append(text('p','此篇暂无对应参考。'));return;}
    content.append(text('p','《'+row.title+'》 · '+data.source.contributors+' · '+data.source.publisher));
    for(const [key,label] of [['introduction','题解'],['translation','白话译文'],['commentary','评语']]){
      if(!row[key]?.length)continue;
      const group=document.createElement('details');group.open=key==='introduction';group.append(text('summary',label));
      for(const paragraph of row[key])group.append(text('p',paragraph));content.append(group);
    }
    content.append(text('small','所附EPUB版本参考，未并入分词与统计。〔原书图字〕为图片字，需查原书。'));
  }
  async function load(){
    if(!panel.open)return;
    if(data){show();return;}
    content.replaceChildren(text('p','正在载入参考…'));
    try{
      if(!request)request=fetch('assets/chapter-references.json').then(r=>{if(!r.ok)throw Error('载入失败');return r.json();}).catch(e=>{request=null;throw e;});
      data=await request;show();
    }catch(_){content.replaceChildren(text('p','参考未载入。请重新展开重试。'));}
  }
  panel.addEventListener('toggle',load);
  window.GhostMapReferences={render(id){selected=id;if(panel.open)load();}};
  document.querySelector('.source-column').append(panel);
})();
