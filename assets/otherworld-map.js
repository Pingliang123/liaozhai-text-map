(function(root){
  'use strict';
  // These nodes have a textual identity, not a longitude/latitude.
  function nodes(evidence){
    const groups=new Map();for(const e of evidence){if(!['天界','地界'].includes(e.realm)||!e.space||e.review?.kind==='reject')continue;
      const key=e.realm+':'+e.space;if(!groups.has(key))groups.set(key,{key,name:e.space,realm:e.realm,evidence:[]});
      const n=groups.get(key);if(!n.evidence.some(x=>x.chapter_id===e.chapter_id&&x.id===e.id))n.evidence.push(e);
    }return [...groups.values()].sort((a,b)=>b.evidence.length-a.evidence.length||a.name.localeCompare(b.name,'zh'));
  }
  function render(container,evidence,{place='',read}={}){
    const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};container.replaceChildren();
    const all=nodes(evidence),title=el('summary','异境 · '+all.length+'处（示意，无地理坐标）');container.append(title);
    const layout=el('div');layout.className='otherworld-layout';const grid=el('div'),detail=el('div');grid.className='otherworld-nodes';detail.className='otherworld-detail';container.append(layout);layout.append(grid,detail);
    if(!all.length){detail.textContent='当前筛选暂无异境证据';return;}
    let chosen=all.find(n=>n.key===container.dataset.selected)||all[0];
    const select=n=>{container.dataset.selected=n.key;chosen=n;for(const b of grid.children)b.setAttribute('aria-pressed',String(b.dataset.key===n.key));detail.replaceChildren(el('h3',(place?place+' → ':'')+n.name+' · '+n.realm));
      detail.append(el('p',place?'实线表示已核对的跨界；虚线表示同篇提及，不能视为实际行程。':'选择人间地点后，可查看它与异境的关系。'));
      for(const e of n.evidence){const card=el('div');card.className='evidence-card';const crossing=e.review?.kind==='crossing';const edge=el('p',(place?place+' '+(crossing?'→':'┄')+' ':'')+n.name+' · 《'+e.chapter+'》 · '+(crossing?'跨界':'提及'));edge.className=crossing?'otherworld-crossing':'otherworld-mention';card.append(edge,el('blockquote',e.quote||e.excerpt||e.text||e.context||e.review?.note||'请查看篇目原文'));const b=el('button','阅读《'+e.chapter+'》');b.onclick=()=>read(e.chapter_id);card.append(b);detail.append(card);}
    };
    for(const n of all){const b=el('button',n.name+' · '+new Set(n.evidence.map(e=>e.chapter_id)).size+'篇');b.dataset.key=n.key;b.dataset.realm=n.realm;b.onclick=()=>select(n);grid.append(b);}select(chosen);
  }
  const api={nodes,render};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.GhostOtherworldMap=api;
})(globalThis);
