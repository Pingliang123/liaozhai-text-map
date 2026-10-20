(function(root){
  'use strict';
  const kinds={places:'地点词',spaces:'空间词',people:'人物词',times:'时间词',none:'无类别'};
  function filter(rows,{kind='',chapter='',query='',scope='active',unmapped=new Set(),normalize=x=>x}={}){
    return rows.filter(r=>(!kind||r.kind===kind)&&(!chapter||String(r.chapter_id)===String(chapter))&&
      (!query||(r.word+' '+r.chapter).includes(query))&&
      (scope==='all'||scope==='active'&&r.present||scope==='pending'&&r.status==='pending'||
       scope==='unmapped'&&r.kind==='places'&&r.present&&unmapped.has(normalize(r.word))));
  }
  function mount(container,api){
    const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
    const option=(s,v,t)=>{const n=el('option',t);n.value=v;s.append(n);};
    const field=(label,tag='input')=>{const n=el(tag);n.setAttribute('aria-label',label);return n;};
    const bar=el('div');bar.className='toolbar';
    const category=field('词汇类别','select'),chapter=field('词汇篇目','select'),scope=field('词汇范围','select'),search=field('搜索词汇');
    search.type='search';search.placeholder='词语或篇名';option(category,'','四类全部');
    for(const [v,t]of Object.entries(kinds))if(v!=='none')option(category,v,t);
    option(chapter,'','全书');for(const id of api.ids)option(chapter,String(id),api.chapter(id).chapter);
    for(const [v,t]of [['active','现有词汇'],['pending','待定候选'],['unmapped','未定位地点'],['all','含历史记录']])option(scope,v,t);
    const status=el('p'),hint=el('p','一行对应一篇。修改词语、类别或分词后保存此行；Tab 换格，Ctrl/⌘＋Enter 保存，Esc 取消。');
    status.setAttribute('role','status');hint.className='muted';
    const scroll=el('div');scroll.className='vocabulary-scroll';const previous=el('button','上一页'),next=el('button','下一页');
    const add=el('button','新增词语');bar.append(category,chapter,scope,search,add);container.append(bar,hint,status,scroll,previous,next);
    let page=0,dirty=false,timer,active=null;
    function draft(value,row){dirty=value;active=value?row:null;api.draft(value);for(const n of [category,chapter,scope,search,previous,next,add])n.disabled=value;
      for(const n of scroll.querySelectorAll('input,select,textarea,button'))n.disabled=value&&!row.contains(n);
    }
    function render(extra){
      if(dirty)return;const matches=filter(api.rows(),{kind:category.value,chapter:chapter.value,query:api.simplify(search.value.trim()),scope:scope.value,unmapped:scope.value==='unmapped'?api.unmapped():new Set(),normalize:api.normalize});
      const pages=Math.max(1,Math.ceil(matches.length/20));page=Math.min(page,pages-1);
      status.textContent=matches.length+' 条 · '+(page+1)+' / '+pages+' 页';scroll.replaceChildren();
      const table=el('table'),thead=el('thead'),head=el('tr'),tbody=el('tbody');
      for(const title of ['词语／篇目','原文句子','分类','统一名称／人物身份','所在句分词','保存'])head.append(el('th',title));thead.append(head);table.append(thead,tbody);scroll.append(table);
      for(const row of [...(extra?[extra]:[]),...matches.slice(page*20,(page+1)*20)]){
        const c=api.chapter(row.chapter_id),units=c.source_units||[],review=c.lexical_reviews?.[row.key],tr=el('tr');
        const cells=Array.from({length:6},()=>el('td'));tr.append(...cells);tbody.append(tr);
        const word=field('修订词语');word.value=row.word;cells[0].append(word,el('p','《'+row.chapter+'》'),el('small',row.present?'现有':row.status||'新增'));
        const position=field('原文位置','select');units.forEach((u,i)=>{if(!row.word||(u.text||u.original||'').includes(row.word))option(position,String(i),'第 '+(i+1)+' 单位');});
        const quote=el('blockquote');cells[1].append(position,quote);
        const kind=field('修订类别','select');for(const [v,t]of Object.entries(kinds))option(kind,v,t);kind.value=row.present?row.kind:review?.status==='rejected'?'none':row.kind;cells[2].append(kind);
        const canonical=field('统一名称或所指人物');canonical.value=row.person?.canonical||(review?.note||'').match(/^统一名称：([^\n]*)/u)?.[1]||'';
        const types=field('人物身份（人、鬼、妖、神）');types.placeholder='人、鬼、妖、神（可多选）';types.value=Object.keys(row.person?.person_types||{}).join('、');cells[3].append(canonical,types);
        const tokens=field('所在句分词','textarea');cells[4].append(tokens);
        const load=()=>{const u=units[Number(position.value)];quote.textContent=u?.text||u?.original||'';tokens.value=u?api.unitStream(c,Number(position.value)):'';};load();
        position.value=position.children[0]?.value||'';load();position.onchange=load;const save=el('button','保存'),cancel=el('button','取消'),message=el('p');message.setAttribute('role','status');cells[5].append(save,cancel,message);
        const toggle=()=>{types.hidden=kind.value!=='people';};toggle();kind.addEventListener('change',toggle);
        for(const n of [word,kind,canonical,types,tokens])n.addEventListener('input',()=>draft(true,tr));
        // A renamed term is immediately visible as a complete token, not a replacement of original characters.
        word.addEventListener('change',()=>{if(!word.value.trim()||!quote.textContent.includes(word.value.trim()))return;const aligned=root.GhostPlaceReview.alignPlaces({segmentation_note:tokens.value,source_units:[{text:quote.textContent}],places:[{word:word.value.trim()}]});tokens.value=aligned.note;});
        save.onclick=()=>{try{
          if(position.value==='')throw Error('原文没有此词，请选择对应句子');
          const identity=types.value.split(/[、,，\s/]+/u).filter(Boolean);if(kind.value==='people'&&identity.some(t=>!['人','鬼','妖','神'].includes(t)))throw Error('人物身份只填人、鬼、妖、神');
          if(kind.value==='people'&&word.value.trim().length===1&&!canonical.value.trim())throw Error('单字人物须填写所指人物');
          api.save(row,{word:word.value.trim(),kind:kind.value,canonical:canonical.value.trim(),types:identity,unitIndex:Number(position.value),tokens:tokens.value});
          draft(false,tr);render();status.textContent='已保存《'+row.chapter+'》 · '+status.textContent;
        }catch(e){message.textContent=e.message;}};
        cancel.onclick=()=>{draft(false,tr);render();};
        tr.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();save.onclick();}if(e.key==='Escape'){e.preventDefault();cancel.onclick();}});
      }
      previous.disabled=page===0;next.disabled=page+1>=pages;
    }
    for(const n of [category,chapter,scope])n.onchange=()=>{page=0;render();};search.oninput=()=>{clearTimeout(timer);timer=setTimeout(()=>{page=0;render();},180);};
    previous.onclick=()=>{page--;render();};next.onclick=()=>{page++;render();};
    add.onclick=()=>{if(chapter.value===''){status.textContent='请先选择篇目';return;}render({chapter_id:Number(chapter.value),chapter:api.chapter(Number(chapter.value)).chapter,word:'',key:(category.value||'places')+':新增',kind:category.value||'places',status:'pending'});};
    return {render,open(options={}){if(dirty)throw Error('请先保存或取消当前行');category.value=options.kind||'';chapter.value=options.chapter===undefined?'':String(options.chapter);search.value=options.word||'';scope.value=options.scope||'active';page=0;render();},hasDraft:()=>dirty};
  }
  const api={filter,mount};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.GhostVocabularyGrid=api;
})(globalThis);
