(function(root){'use strict';
let simplify=s=>s;
const normalize=s=>simplify(String(s||'').normalize('NFKC')).replace(/[\s《》]/gu,'').toLowerCase();
function matches(rows,query){const q=normalize(query);return rows.filter(r=>!r.disabled&&(!q||normalize(r.label).includes(q)));}
const selector='#chapter-select,#movement-chapter,#research-chapter-select,#report-chapter,#chapter,#case,select[aria-label="词汇篇目"],select[aria-label="选择篇目查看空间网络"],select[aria-label="比较篇目"],select[data-report-picker]';
const widgets=new Set(),bySelect=new WeakMap();let opened=null,serial=0;
function configure(fn){if(typeof fn!=='function')return;simplify=fn;for(const w of widgets)w.refresh();}
function enhance(select){
 if(bySelect.has(select)||!select.parentNode)return;
 const doc=select.ownerDocument,make=(tag,cls)=>{const n=doc.createElement(tag);if(cls)n.className=cls;return n;};
 const box=make('span','chapter-search-box'),input=make('input'),toggle=make('button','chapter-search-toggle'),popup=make('div','chapter-search-popup');
 const label=select.getAttribute('aria-label')||({'chapter-select':'篇目','movement-chapter':'路线篇目','research-chapter-select':'研究篇目','report-chapter':'报表篇目',chapter:'实验室篇目',case:'细读篇目'})[select.id]||'篇目';
 const id='chapter-search-list-'+(++serial);popup.id=id;popup.setAttribute('role','listbox');popup.setAttribute('aria-label',label+'列表');popup.hidden=true;
 input.type='text';input.autocomplete='off';input.placeholder='输入篇名搜索';input.setAttribute('role','combobox');input.setAttribute('aria-label',label+'（可输入搜索）');input.setAttribute('aria-controls',id);input.setAttribute('aria-expanded','false');input.setAttribute('aria-autocomplete','list');
 toggle.type='button';toggle.textContent='▾';toggle.setAttribute('aria-label','展开'+label+'列表');toggle.tabIndex=-1;
 select.parentNode.insertBefore(box,select);box.append(select,input,toggle);doc.body.append(popup);
 const oldTab=select.getAttribute('tabindex'),oldHidden=select.getAttribute('aria-hidden');select.classList.add('chapter-search-native');select.tabIndex=-1;select.setAttribute('aria-hidden','true');
 // The old separate title filter is replaced by this one integrated input.
 const oldSearch=doc.getElementById(select.id==='chapter-select'?'chapter-search':select.id==='research-chapter-select'?'research-search':'');
 if(oldSearch){oldSearch.value='';oldSearch.hidden=true;}
 const oldClear=select.id==='chapter-select'&&doc.getElementById('clear-chapter-search');if(oldClear)oldClear.hidden=true;
 let rows=[],filtered=[],active=-1,query='',composing=false,queued=false;
 const getRows=()=>Array.from(select.options).map(o=>({value:o.value,label:o.textContent,disabled:o.disabled||o.parentElement?.disabled}));
 const position=()=>{if(popup.hidden)return;const r=box.getBoundingClientRect(),width=Math.min(Math.max(r.width,240),root.innerWidth-16);popup.style.width=width+'px';popup.style.left=Math.max(8,Math.min(r.left,root.innerWidth-width-8))+'px';const below=root.innerHeight-r.bottom-8,above=r.top-8,up=below<180&&above>below;popup.style.maxHeight=Math.max(80,Math.min(320,up?above:below))+'px';popup.style.top=up?'auto':r.bottom+4+'px';popup.style.bottom=up?root.innerHeight-r.top+4+'px':'auto';};
 function close(){popup.hidden=true;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');if(opened===api)opened=null;input.value=select.selectedOptions[0]?.textContent||'';query='';}
 function highlight(){for(const [i,n]of Array.from(popup.children).entries())n.setAttribute('aria-selected',String(i===active));if(active>=0&&filtered[active]){const n=popup.children[active];input.setAttribute('aria-activedescendant',n.id);if(n.offsetTop<popup.scrollTop)popup.scrollTop=n.offsetTop;else if(n.offsetTop+n.offsetHeight>popup.scrollTop+popup.clientHeight)popup.scrollTop=n.offsetTop+n.offsetHeight-popup.clientHeight;}else input.removeAttribute('aria-activedescendant');}
 function choose(row){select.value=row.value;select.dispatchEvent(new Event('change',{bubbles:true}));close();refresh();input.focus();}
 function draw(){
  filtered=matches(rows,query);popup.replaceChildren();active=filtered.length?(query?0:Math.max(0,filtered.findIndex(r=>r.value===select.value))):-1;
  if(!filtered.length){const empty=make('div','chapter-search-empty');empty.textContent='没有匹配篇目';empty.setAttribute('role','status');popup.append(empty);}
  for(const [i,row]of filtered.entries()){const option=make('div','chapter-search-option');option.id=id+'-'+i;option.setAttribute('role','option');option.textContent=row.label;option.addEventListener('pointerdown',e=>{e.preventDefault();choose(row);});popup.append(option);}
  position();highlight();
 }
 function open(){if(select.disabled)return;if(opened&&opened!==api)opened.close();opened=api;rows=getRows();query='';popup.hidden=false;input.setAttribute('aria-expanded','true');draw();input.select();}
 function refresh(){rows=getRows();input.disabled=select.disabled;toggle.disabled=select.disabled;if(select.disabled)close();if(opened!==api)input.value=select.selectedOptions[0]?.textContent||'';else draw();}
 const later=()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;if(select.isConnected)refresh();});};
 input.addEventListener('focus',open);
 input.addEventListener('input',e=>{e.stopPropagation();query=input.value;if(opened!==api){if(opened)opened.close();opened=api;popup.hidden=false;input.setAttribute('aria-expanded','true');}draw();});
 input.addEventListener('change',e=>e.stopPropagation());
 input.addEventListener('compositionstart',()=>{composing=true;});input.addEventListener('compositionend',()=>{composing=false;});
 input.addEventListener('keydown',e=>{
  if(e.isComposing||composing)return;
  if(e.key==='Escape'){e.preventDefault();close();}
  else if(e.key==='Tab')close();
  else if(e.key==='Enter'){e.preventDefault();if(opened===api&&filtered[active])choose(filtered[active]);}
  else if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();if(opened!==api)open();else if(filtered.length){active=(active+(e.key==='ArrowDown'?1:-1)+filtered.length)%filtered.length;highlight();}}
 });
 toggle.addEventListener('pointerdown',e=>e.preventDefault());toggle.addEventListener('click',()=>{if(opened===api)close();else{input.focus();if(opened!==api)open();}});
 select.addEventListener('change',later);
 // Existing code assigns select.value when navigating or synchronising views.
 // Preserve native semantics and refresh only this input, without extra events.
 const descriptor=Object.getOwnPropertyDescriptor(root.HTMLSelectElement.prototype,'value');
 Object.defineProperty(select,'value',{configurable:true,get(){return descriptor.get.call(this);},set(value){descriptor.set.call(this,value);later();}});
 const api={select,box,input,popup,refresh,close,position,destroy(){if(opened===api)close();popup.remove();widgets.delete(api);bySelect.delete(select);delete select.value;select.classList.remove('chapter-search-native');if(oldTab===null)select.removeAttribute('tabindex');else select.setAttribute('tabindex',oldTab);if(oldHidden===null)select.removeAttribute('aria-hidden');else select.setAttribute('aria-hidden',oldHidden);}};
 bySelect.set(select,api);widgets.add(api);refresh();return api;
}
function start(){
 const doc=root.document;doc.querySelectorAll(selector).forEach(enhance);
 const observer=new MutationObserver(records=>{
  for(const record of records){const source=record.target.nodeType===1?record.target:record.target.parentElement,select=source?.closest('select');if(select&&bySelect.has(select))bySelect.get(select).refresh();
   for(const node of record.addedNodes||[]){if(node.nodeType!==1)continue;if(node.matches(selector))enhance(node);node.querySelectorAll(selector).forEach(enhance);}
  }
  for(const w of widgets)if(!w.select.isConnected)w.destroy();
 });
 observer.observe(doc.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['disabled','selected','label']});
 doc.addEventListener('pointerdown',e=>{if(opened&&!opened.box.contains(e.target)&&!opened.popup.contains(e.target))opened.close();});
 root.addEventListener('scroll',e=>{if(opened&&!opened.popup.contains(e.target))opened.position();},true);
 root.addEventListener('resize',()=>{if(opened)opened.close();});
}
const api={matches,configure};if(typeof module!=='undefined')module.exports=api;else{root.GhostChapterSearch=api;if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',start,{once:true});else start();}
})(globalThis);
