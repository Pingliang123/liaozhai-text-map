(function(root){
  'use strict';
  const TYPES=['人','鬼','妖','神'];
  function eventRows(model,chapter='',query='',type=''){
    return model.ids.map(id=>{const c=model.view(id);return {chapter_id:id,chapter:c.chapter,types:TYPES.filter(t=>c.event_types?.[t]>0),places:(c.places||[]).map(p=>p.word)};})
      .filter(r=>(chapter===''||r.chapter_id===Number(chapter))&&(!query||r.chapter.includes(query)||r.places.some(p=>p.includes(query)))&&(!type||(type==='未定'?!r.types.length:r.types.includes(type))));
  }
  function eventStats(rows){
    const combinations=new Map();for(const r of rows){const key=r.types.join('／')||'未定';combinations.set(key,(combinations.get(key)||0)+1);}
    return {counts:[...TYPES,'未定'].map(t=>[t,rows.filter(r=>t==='未定'?!r.types.length:r.types.includes(t)).length]),combinations:[...combinations],total:rows.length};
  }
  function validateTypes(types){if(types.some(t=>!TYPES.includes(t))||new Set(types).size!==types.length||types.includes('人')&&types.length>1)throw Error('人类仅用于无鬼、妖、神作用的故事；鬼、妖、神可以多选。');return Object.fromEntries(types.map(t=>[t,1]));}
  function csv(rows){const safe=v=>'"'+String(v??'').replace(/^[=+@-]/,"'$&").replaceAll('"','""')+'"';return '\ufeff'+rows.map(row=>row.map(safe).join(',')).join('\r\n');}
  function mount(options){
    const {model,container,bars,pie,save,open,canEdit,chapter}=options;
    const doc=container.ownerDocument;
    const el=(tag,text='',attrs={})=>{const n=doc.createElement(tag);n.textContent=text;for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);return n;};
    const button=(text,fn)=>{const n=el('button',text,{type:'button'});n.addEventListener('click',fn);return n;};
    const download=(name,rows)=>{const url=URL.createObjectURL(new Blob([csv(rows)],{type:'text/csv;charset=utf-8'})),a=el('a','',{href:url,download:name});doc.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);};
    const events=el('details','',{open:''});events.append(el('summary','异事类型'));
    events.append(el('p','一篇可同时涉及鬼、妖、神；“人”指无人外主体介入的故事。各类型篇数可重叠，饼图按互斥组合计数。',{class:'muted'}));
    const toolbar=el('div','',{class:'toolbar'}),search=el('input','',{type:'search',placeholder:'搜索篇名或地点','aria-label':'搜索异事类型'}),filter=el('select','',{'aria-label':'筛选异事类型'});
    for(const t of ['全部',...TYPES,'未定'])filter.append(el('option',t,{value:t==='全部'?'':t}));
    const count=el('p','',{role:'status'}),charts=el('div','',{class:'report-charts'}),bar=el('div'),pieChart=el('div');
    const barBox=el('div'),pieBox=el('div');barBox.append(el('h3','各类型篇数'),bar);pieBox.append(el('h3','类型组合占比'),pieChart);charts.append(barBox,pieBox);
    let page=0,rows=[];
    toolbar.append(search,filter,button('导出类型表',()=>download('聊斋异事类型.csv',[['篇号','篇名','异事类型','地点'],...rows.map(r=>[r.chapter_id+1,r.chapter,r.types.join('／')||'未定',r.places.join('、')])])));
    const navigation=el('div','',{class:'toolbar'}),pageLabel=el('span'),prev=button('上一页',()=>{page--;renderEvents();}),next=button('下一页',()=>{page++;renderEvents();});navigation.append(prev,pageLabel,next);
    const table=el('table'),thead=el('thead'),head=el('tr'),tbody=el('tbody');for(const t of ['篇目','异事类型','地点','修改'])head.append(el('th',t));thead.append(head);table.append(thead,tbody);
    const scroll=el('div','',{class:'table-scroll',tabindex:'0'});scroll.append(table);events.append(toolbar,count,charts,navigation,scroll);container.append(events);
    function renderEvents(){
      rows=eventRows(model,chapter(),model.simplify(search.value.trim()),filter.value);const stats=eventStats(rows);
      bars(bar,stats.counts);pie(pieChart,stats.combinations,'异事类型组合占比');count.textContent=stats.total+' 篇';
      const pages=Math.max(1,Math.ceil(rows.length/25));page=Math.max(0,Math.min(page,pages-1));pageLabel.textContent=(page+1)+' / '+pages;prev.disabled=page===0;next.disabled=page===pages-1;tbody.replaceChildren();
      for(const r of rows.slice(page*25,page*25+25)){
        const tr=el('tr'),td=el('td'),edit=el('details'),content=el('div','',{class:'report-editor'}),checks=el('div','',{class:'checkboxes'}),status=el('p','',{role:'status'});
        edit.append(el('summary','修改类型'));
        for(const t of TYPES){const label=el('label'),input=el('input','',{type:'checkbox',value:t});input.checked=r.types.includes(t);input.addEventListener('change',()=>{if(input.checked)for(const other of checks.querySelectorAll('input'))if(t==='人'?other.value!=='人':other.value==='人')other.checked=false;});label.append(input,doc.createTextNode(t));checks.append(label);}
        content.append(checks,button('保存',()=>{if(!canEdit()){status.textContent='请先保存或取消其他编辑。';return;}try{const d=model.editable(r.chapter_id);d.event_types=validateTypes([...checks.querySelectorAll('input:checked')].map(n=>n.value));save(r.chapter_id,d);renderEvents();}catch(error){status.textContent=error.message;}}),status);edit.append(content);td.append(edit,button('查看原文',()=>open(r.chapter_id,'workspace')));
        tr.append(el('td','#'+(r.chapter_id+1)+' '+r.chapter),el('td',r.types.join('／')||'未定'),el('td',r.places.join('、')||'—'),td);tbody.append(tr);
      }
      if(!rows.length){const tr=el('tr');tr.append(el('td','没有符合条件的篇目。',{colspan:'4'}));tbody.append(tr);}
    }
    search.addEventListener('input',()=>{page=0;renderEvents();});filter.addEventListener('change',()=>{page=0;renderEvents();});
    const records=el('details');records.append(el('summary','本轮修订记录'));
    const recordStatus=el('p','展开后载入修订记录。',{role:'status'}),recordBody=el('div');records.append(recordStatus,recordBody);container.append(records);
    let data=null,loading=false,recordPage=0;
    const recordSearch=el('input','',{type:'search',placeholder:'词语、篇名或原文','aria-label':'搜索本轮修订'}),recordFilter=el('select','',{'aria-label':'修订类别'});
    for(const [key,title] of [['','全部'],['term','词语'],['segmentation','分词'],['event','异事类型'],['held','未套用']])recordFilter.append(el('option',title,{value:key}));
    const stateNames={applied:'已套用',unchanged:'无变化',held:'未套用',uncertain:'未定'},kindNames={person:'人物词',place:'地点词',space:'空间词',time:'时间词',none:'移除'},actions={add:'新增',remove:'移除',reclassify:'改类',uncertain:'未定'};
    const list=value=>Array.isArray(value)?value:value?[String(value)]:[];
    function renderRecords(){
      if(!data)return;recordBody.replaceChildren();const q=model.simplify(recordSearch.value.trim());
      const selected=data.entries.filter(r=>(chapter()===''||r.chapter_id===Number(chapter()))&&(!q||model.simplify([r.chapter,r.proposal.term,r.proposal.quote,r.proposal.reason].join(' ')).includes(q))&&(!recordFilter.value||(recordFilter.value==='held'?r.state==='held':r.kind===recordFilter.value)));
      const pages=Math.max(1,Math.ceil(selected.length/25));recordPage=Math.max(0,Math.min(recordPage,pages-1));recordStatus.textContent=selected.length+' 条 · 前33篇未改';
      const nav=el('div','',{class:'toolbar'}),previous=button('上一页',()=>{recordPage--;renderRecords();}),following=button('下一页',()=>{recordPage++;renderRecords();});previous.disabled=recordPage===0;following.disabled=recordPage===pages-1;
      nav.append(previous,el('span',(recordPage+1)+' / '+pages),following);const t=el('table'),h=el('tr');for(const s of ['篇目','修订内容','原文与依据','结果','修改'])h.append(el('th',s));t.append(h);
      for(const r of selected.slice(recordPage*25,recordPage*25+25)){
        const p=r.proposal||{},tr=el('tr'),evidence=el('td'),result=el('td',stateNames[r.state]||r.state),action=el('td');
        const quote=p.quote||list(p.evidence).map(e=>e?.quote||'').join('；');evidence.append(el('p',quote||'—'),el('p',p.reason||'',{class:'muted'}));
        if(r.reason&&!/^AI|DeepSeek|GPT/.test(r.reason))result.append(el('p',r.reason,{class:'muted'}));
        const text=r.kind==='event'?'异事类型：'+(list(p.types).join('／')||'未定'):r.kind.includes('segmentation')?list(p.before).join(' / ')+' → '+list(p.after).join(' / '):(actions[p.action]||'')+' '+(p.term||'')+' · '+(kindNames[p.category]||'');
        action.append(button('核对 / 修改',()=>open(r.chapter_id,r.kind==='event'?'workspace':r.kind.includes('segmentation')?'segmentation-panel':p.category==='person'?'people-panel':p.category==='place'?'place-panel':p.category==='time'?'time-panel':'space-panel')));
        tr.append(el('td','#'+(r.chapter_id+1)+' '+r.chapter),el('td',text),evidence,result,action);t.append(tr);
      }
      const wrap=el('div','',{class:'table-scroll',tabindex:'0'});wrap.append(t);recordBody.append(nav,wrap);
    }
    const recordControls=el('div','',{class:'toolbar'});recordControls.append(recordSearch,recordFilter);records.insertBefore(recordControls,recordBody);
    recordSearch.addEventListener('input',()=>{recordPage=0;renderRecords();});recordFilter.addEventListener('change',()=>{recordPage=0;renderRecords();});
    records.addEventListener('toggle',async()=>{
      if(!records.open||data||loading)return;loading=true;recordStatus.textContent='载入中…';
      try{const response=await fetch('assets/deepseek-review.json?v=20261018b');if(!response.ok)throw Error('HTTP '+response.status);data=await response.json();renderRecords();}
      catch(error){recordStatus.textContent='未能载入：'+error.message+'；请关闭后重新展开。';}finally{loading=false;}
    });
    return {render(){renderEvents();renderRecords();}};
  }
  const api={eventRows,eventStats,validateTypes,csv,mount};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.GhostMapAuditReports=api;
})(globalThis);
