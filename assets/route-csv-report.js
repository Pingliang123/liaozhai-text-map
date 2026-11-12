(function(root){
 'use strict';
 function parse(text){
  const rows=[];let row=[],cell='',quoted=false;
  for(let i=0;i<text.length;i++){
   const char=text[i];if(i===0&&char==='\ufeff')continue;
   if(char==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}
   else if(char===','&&!quoted){row.push(cell);cell='';}
   else if((char==='\n'||char==='\r')&&!quoted){if(char==='\r'&&text[i+1]==='\n')i++;row.push(cell);rows.push(row);row=[];cell='';}
   else cell+=char;
  }
  if(quoted)throw Error('路径资料引号未闭合');
  if(cell||row.length){row.push(cell);rows.push(row);}
  const headers=rows.shift()||[];
  for(const name of ['篇号','篇名','出发空间','到达空间','停留空间','原文'])if(!headers.includes(name))throw Error('路径资料缺少'+name);
  return rows.map(values=>{
   if(values.length!==headers.length)throw Error('路径资料栏数不一致');
   return Object.fromEntries(headers.map((name,i)=>[name,values[i]]));
  });
 }
 function aggregate(rows,roles,metric){
  const maps={spaces:new Map(),places:new Map(),access:new Map(),worlds:new Map(),transitions:new Map()};
  function add(kind,label,row,role){
   if(!label)return;
   if(!maps[kind].has(label))maps[kind].set(label,{label,entries:[],chapters:new Set()});
   const group=maps[kind].get(label);
   group.entries.push({row,role});group.chapters.add(row.篇号);
  }
  for(const row of rows){
   for(const role of roles){
    if(!row[role+'空间'])continue;
    for(const word of new Set(row[role+'空间'].split('、').filter(Boolean)))add('spaces',word,row,role);
    add('places',row[role+'空间所在地点'],row,role);
    add('access',row[role+'使用方式']||'未填写',row,role);
    add('worlds',row[role+'世界分类']||'未填写',row,role);
   }
   if(row.出发空间&&row.到达空间)add('transitions',row.出发空间+' → '+row.到达空间,row,'出发 → 到达');
  }
  return Object.fromEntries(Object.entries(maps).map(([name,map])=>[name,[...map.values()].map(group=>({...group,value:metric==='chapters'?group.chapters.size:group.entries.length})).sort((a,b)=>b.value-a.value||a.label.localeCompare(b.label,'zh'))]));
 }
 function mount(host,{url,bars,pie,open}){
  const el=(tag,text)=>{const node=document.createElement(tag);if(text)node.textContent=text;return node;};
  const summary=el('summary','空间路径统计');host.append(summary);
  const controls=el('div');controls.className='toolbar';
  function select(label,options){
   const wrapper=el('label',label+' '),input=el('select');
   for(const [value,text] of options){const option=el('option',text);option.value=value;input.append(option);}
   wrapper.append(input);controls.append(wrapper);return input;
  }
  const chapter=select('篇目',[['','全书']]);
  const role=select('空间角色',[['all','全部'],['出发','出发'],['到达','到达'],['停留','停留']]);
  const metric=select('统计方式',[['count','标注次数'],['chapters','涉及篇数']]);
  const status=el('p'),charts=el('div'),evidence=el('div');charts.className='report-charts';
  host.append(controls,status,charts,evidence);
  const download=el('button','导出空间路径 CSV');
  download.disabled=true;controls.append(download);
  const full=el('a','下载全书空间路径 CSV');full.href=url;full.download='聊斋空间路径.csv';controls.append(full);
  let rows=null,loading=false;
  download.onclick=()=>{
   if(!rows)return;
   const filtered=rows.filter(row=>!chapter.value||row.篇号===chapter.value);
   const headers=Object.keys(rows[0]||{});
   const cell=value=>'"'+String(value??'').replace(/^[=+@-]/u,"'$&").replace(/"/gu,'""')+'"';
   const csv='\ufeff'+[headers,...filtered.map(row=>headers.map(key=>row[key]))].map(row=>row.map(cell).join(',')).join('\r\n');
   const link=el('a');link.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));link.download='聊斋空间路径.csv';link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);
  };
  function show(group){
   evidence.replaceChildren(el('h3',group.label));
   const unique=[...new Map(group.entries.map(item=>[item.row.篇号+'/'+item.row.步骤+'/'+item.role,item])).values()];
   let cursor=0;
   const more=el('button','查看更多原文');
   function next(){
    for(const {row,role:entryRole} of unique.slice(cursor,cursor+20)){
     const item=el('details'),heading=el('summary','《'+row.篇名+'》第'+row.步骤+'步 · '+entryRole);
     item.append(heading,el('p',row.人物||'未填写人物'),el('blockquote',row.原文),el('p',row.双端证据));
     const button=el('button','打开篇目');button.onclick=()=>open(Number(row.篇号)-1);item.append(button);evidence.insertBefore(item,more);
     const network=el('a','查看本篇空间网络');
     network.href='assets/research-lab/?tab=relations&mode=paths&chapter='+(Number(row.篇号)-1);
     item.append(network);
    }
    cursor+=20;more.hidden=cursor>=unique.length;
   }
   more.onclick=next;evidence.append(more);next();
  }
  function render(){
   if(!rows)return;
   const filtered=rows.filter(row=>!chapter.value||row.篇号===chapter.value);
   const roles=role.value==='all'?['出发','到达','停留']:[role.value];
   const data=aggregate(filtered,roles,metric.value);
   status.textContent=new Set(filtered.map(row=>row.篇号)).size+' 篇 · '+filtered.length+' 个步骤。按有值的空间角色计数，同一步骤可计入多个角色。数据来自已核对路径 CSV。';
   charts.replaceChildren();evidence.replaceChildren();
   for(const [key,title,isPie] of [['spaces','空间词前 12 名'],['places','所在地前 12 名'],['transitions','出发 → 到达前 12 名'],['access','空间使用方式',true],['worlds','三界分类',true]]){
    const card=el('div'),plot=el('div');card.append(el('h3',title),plot);
    const groups=data[key],shown=isPie?groups:groups.slice(0,12);
    if(isPie)pie(plot,shown.map(group=>[group.label,group.value]),title);
    else bars(plot,shown.map(group=>[group.label,group.value]));
    const links=el('div');links.className='report-pie-legend';
    for(const group of shown){
     const button=el('button',group.label+' · '+group.value);
     button.onclick=()=>show(group);links.append(button);
    }
    card.append(links);charts.append(card);
   }
  }
  async function load(){
   if(rows||loading)return;
   loading=true;status.textContent='正在读取空间路径资料…';
   try{
    const response=await fetch(url);if(!response.ok)throw Error('HTTP '+response.status);
    rows=parse(await response.text());
    download.disabled=false;
    const chapters=[...new Map(rows.map(row=>[row.篇号,row.篇名])).entries()];
    for(const [number,title] of chapters){const option=el('option',number+' '+title);option.value=number;chapter.append(option);}
    render();
   }catch(error){status.textContent='路径资料读取失败，'+error.message+'。';rows=null;}
   finally{loading=false;}
  }
  for(const input of [chapter,role,metric])input.onchange=render;
  host.addEventListener('toggle',()=>{if(host.open)load();});
  if(host.open)load();
 }
 const api={parse,aggregate,mount};if(typeof module!=='undefined')module.exports=api;else root.GhostRouteCsvReport=api;
})(globalThis);
