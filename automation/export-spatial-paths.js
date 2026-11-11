'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const S=require('./supplement-source-steps');
const {createChapterContext}=require('./chapter-scene-context');
const {applyCloseReading}=require('./apply-chapter-close-reading');
const root=path.resolve(__dirname,'..'),M=require('./ghost_map_model'),R=require('../assets/spatial-routes'),C=require('../assets/path-columns');
function csvCell(value){const text=String(value??'');return /[",\r\n]/u.test(text)?'"'+text.replace(/"/gu,'""')+'"':text;}
function toCsv(rows){return '\ufeff'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n')+'\r\n';}
function loadNarrative(){
 const context={GhostSpatialRoutes:R};vm.createContext(context);
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const script=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gu)].map(m=>m[1]).find(s=>s.includes('else root.GhostMapNarrative=api'));
 if(!script)throw new Error('找不到篇目敘事路徑資料模組');
 vm.runInContext(script,context);return context.GhostMapNarrative;
}
function completeContext(values,row,chapter){
 const units=chapter.source_units||[],tokens=R.tokenUnits(chapter,R.lexicon(chapter)),position=units.findIndex(u=>u.unit===row.source_event.unit);
 const col=name=>C.headers.indexOf(name),notes=[];
 if(position>=0){
  const spaces=new Set(chapter.space_words||[]),places=new Set(chapter.places.map(p=>p.word));
  const movement=row.has_movement;
  for(const [role,label] of movement?[['出发',row.from_space],['到达',row.to_space]]:[['停留',row.space]]){
   if(values[col(role+'空间')]||!label)continue;
   const matches=[...spaces].filter(w=>w===label||(w.length>=2&&String(label).includes(w)));
   const terms=matches.filter(w=>!matches.some(other=>other!==w&&other.includes(w)));
   if(terms.length!==1)continue;
   const term=terms[0];
   for(let j=position;j>=Math.max(0,position-12);j--){
    if(j<position&&/迁居|徙居|旋里|渡海|出境/.test(units[j+1].text))break;
    if(!tokens[j]?.includes(term))continue;
    values[col(role+'空间')]=term;
    notes.push(role+'空间按网站场景「'+label+'」及同篇原文推定（单元'+units[j].unit+'）「'+units[j].text+'」');
    const local=[...new Set(tokens[j].filter(w=>places.has(w)))];
    const prefix={'出发':'from','到达':'to','停留':'space'}[role],event=row.source_event||{},review=row.endpoint_review||{};
    const realm=event[prefix+'_realm']||review[prefix+'_realm'];
    const access=event[prefix+'_access']||review[prefix+'_access'];
    if(['私人','公共','混合','开放自然'].includes(access))values[col(role+'使用方式')]=access;
    if(['天界','地界','人间'].includes(realm))values[col(role+'世界分类')]=realm;
    if(local.length===1&&(!realm||realm==='人间')&&!values[col(role+'空间所在地点')])values[col(role+'空间所在地点')]=local[0];
    
    break;
   }
  }
 }
 if(notes.length){values[col('分类依据')]+='。空间另据同篇场景承接推定';values[col('双端证据')]+='；'+notes.join('；');}
}
function completeScene(values,row,chapter){
 const col=name=>C.headers.indexOf(name),scene=String(row.space||''),units=chapter.source_units||[],tokens=R.tokenUnits(chapter,R.lexicon(chapter));
 const position=units.findIndex(u=>u.unit===row.source_event?.unit);
 if(position<0||!scene)return;
 const places=new Set(chapter.places.map(p=>p.word)),vocabulary=[...new Set([...(chapter.space_words||[]),...places])];
 function terms(label){
  const matches=vocabulary.filter(w=>w===label||(w.length>=2&&label.includes(w)));
  return matches.filter(w=>!matches.some(other=>other!==w&&other.includes(w))).map(word=>{
   for(let j=position;j>=0;j--)if(tokens[j]?.includes(word))return {word,unit:units[j]};
   return null;
  }).filter(Boolean);
 }
 const parts=scene.split(/\s*→\s*/u),roles=parts.length>1?[['出发',parts[0]],['到达',parts[parts.length-1]]]:!row.has_movement?[['停留',scene]]:[];
 const notes=[];
 for(const [role,label] of roles){
  if(values[col(role+'空间')])continue;
  const found=terms(label);if(!found.length||(role!=='停留'&&found.length!==1))continue;
  values[col(role+'空间')]=found.map(x=>x.word).join('、');
  for(const item of found){notes.push(role+'空间按场景「'+scene+'」及原文单元'+item.unit.unit+'「'+item.unit.text+'」补入');}
 }
 const references=new Set(String(values[col('参考地点')]||'').split('、').filter(Boolean));
 for(const item of terms(scene).filter(x=>places.has(x.word))){
  if(references.has(item.word))continue;
  references.add(item.word);notes.push('场景参考地点「'+item.word+'」据原文单元'+item.unit.unit+'「'+item.unit.text+'」补入');
 }
 values[col('参考地点')]=[...references].join('、');
 if(notes.length){values[col('分类依据')]+='。按场景与同篇已分词原文补入，见双端证据';values[col('双端证据')]+='；'+notes.join('；');}
}
function completeSourceTerms(values,row,chapter){
 const col=name=>C.headers.indexOf(name),event=row.source_event||{},position=(chapter.source_units||[]).findIndex(u=>u.unit===event.unit);
 if(position<0)return;
 const tokenRows=R.tokenUnits(chapter,R.lexicon(chapter)),spaces=new Set(chapter.space_words||[]),places=new Set((chapter.places||[]).map(p=>p.word)),notes=[];
 const exact=(term,idx)=>tokenRows[idx]&&tokenRows[idx].includes(term);
 const spatialAt=idx=>[...spaces].filter(w=>exact(w,idx)).sort((a,b)=>b.length-a.length);
 const placeAt=idx=>[...places].filter(w=>exact(w,idx)).sort((a,b)=>b.length-a.length);
 const setRole=(role,term)=>{
  const field=role+'空间';if(!term||values[col(field)])return;
  values[col(field)]=term;const ps=placeAt(position);
  if(ps.length===1&&!values[col(role+'空间所在地点')])values[col(role+'空间所在地点')]=ps[0];
  notes.push(role+'空间据原文分词单元'+chapter.source_units[position].unit+'「'+chapter.source_units[position].text+'」补入');
 };
 const current=spatialAt(position);
 if(!row.has_movement){if(current.length===1)setRole('停留',current[0]);}
 else{
  const from=String(row.from_space||''),to=String(row.to_space||'');
  const fromTerm=current.find(w=>from.includes(w)||w===from),toTerm=current.find(w=>to.includes(w)||w===to);
  if(fromTerm)setRole('出发',fromTerm);if(toTerm)setRole('到达',toTerm);
  if(!values[col('到达空间')]&&current.length===1)setRole('到达',current[0]);
 }
 if(notes.length){values[col('分类依据')]+='。按引句分词回填';values[col('双端证据')]+='；'+notes.join('；');}
}
function completeMentionTerms(values,row,chapter){
 const col=name=>C.headers.indexOf(name),event=row.source_event||{},position=(chapter.source_units||[]).findIndex(u=>u.unit===event.unit);
 if(position<0||row.has_movement||values[col('出发空间')]||values[col('到达空间')]||values[col('停留空间')])return;
 const tokenRows=R.tokenUnits(chapter,R.lexicon(chapter)),tokens=tokenRows[position]||[],places=new Set((chapter.places||[]).map(p=>p.word));
 const markers=new Set(['在','于','至','入','到','从','向','出','过','经','居','住','宿','寓','坐','卧','赴','登','临','行','循','绕']);
 const locative=new Set(['中','内','外','上','下','边','旁','侧','前','后','间','里','头']);
 const candidates=[...(chapter.space_words||[])].filter(w=>{
  if(places.has(w)||!tokens.includes(w))return false;
  if(w.length>=2)return true;
  const i=tokens.indexOf(w),prev=tokens[i-1],next=tokens[i+1];
  return markers.has(prev)||markers.has(next)||locative.has(prev)||locative.has(next);
 });
 if(!candidates.length)return;
 const unique=[...new Set(candidates)];values[col('停留空间')]=unique.join('、');
 const evidence=chapter.source_units[position];
 values[col('分类依据')]+='。按原文空间词提及回填';
 values[col('双端证据')]+='；停留空间据原文分词单元'+evidence.unit+'「'+evidence.text+'」补入';
}
function exportCsv(packagePath=path.join(root,'data-package.json'),outputPath=path.join(root,'reports','聊齋空間路徑.csv')){
 const pack=JSON.parse(fs.readFileSync(packagePath,'utf8')),model=M.create(pack.base);model.importDocument(pack.revisions);
 const narrative=loadNarrative(),places=model.places(),matrix=[C.headers],additions=[];let previous=[-1,-1],inferredLocations=0,closeReadRows=0;
 for(const id of model.ids){const chapter=model.view(id),existing=narrative.rows(model,[chapter],places),extra=S.supplement(chapter,existing),events=[...existing,...extra].sort((a,b)=>Number(a.unit)-Number(b.unit));
  const geographicNames=new Set(places.filter(p=>Number.isFinite(p.lon)&&Number.isFinite(p.lat)).flatMap(p=>[p.name,...(p.merged_names||[])]));
  const completeChapter=createChapterContext(chapter,geographicNames);
  for(const e of extra)additions.push([id+1,chapter.chapter,e.unit,e.transition_kind,e.missing_terms.join('、'),e.from_space,e.to_space,e.source_roles.stay,e.quote,e.step_id]);
  events.forEach((event,i)=>{const row={...event,chapter_id:id,chapter:chapter.chapter,step:i+1,source_event:event,endpoint_review:event.endpoint_review,has_movement:event.transition_kind==='movement'};
   const order=[id,i+1];if(order[0]<previous[0]||(order[0]===previous[0]&&order[1]<=previous[1]))throw new Error('路徑步驟順序錯誤');previous=order;
   const values=C.values(row,chapter,R);if(values.length!==C.headers.length)throw new Error('欄位數不一致：'+chapter.chapter+' 第'+(i+1)+'步');
   if(id>=0&&id<491)inferredLocations+=C.groups(row,chapter,R).filter(group=>group.locationSource==='篇内前文最近明确地名（上下文承接）').length;
   if(event.source_supplement){
    const at=name=>C.headers.indexOf(name);
    for(const [role,key] of [['出发','from'],['到达','to'],['停留','stay']]){
     const term=event.source_roles[key];values[at(role+'空间')]=term;
     if(!term)for(const suffix of ['使用方式','空间所在地点','世界分类'])values[at(role+suffix)]='';
    }
    values[at('分类依据')]='全文补录：该原文单元存在未被已有引句覆盖的空间词。出发、到达、停留按原句动词与词项的直接搭配提取；仅提及空间的步骤在场景栏列词。';
    values[at('双端证据')]='原文单元'+event.unit+'「'+event.quote+'」；漏收词项「'+event.missing_terms.join('、')+'」';
   }else{completeContext(values,row,chapter);completeScene(values,row,chapter);}
   completeChapter(values,row,()=>{
    if(id>=3&&id<=490){completeSourceTerms(values,row,chapter);completeMentionTerms(values,row,chapter);}
   });
   if(applyCloseReading(values,row,chapter))closeReadRows++;
   const chapterText=(chapter.source_units||[]).map(u=>u.text||'').join('');
   for(const role of ['出发','到达','停留'])for(const suffix of ['空间','空间所在地点']){
    const value=String(values[C.headers.indexOf(role+suffix)]||'');
    for(const word of value.split('、').filter(Boolean))if(!chapterText.includes(word))throw new Error('补值不见于本篇全文：'+chapter.chapter+' '+word);
   }
   if(values[C.headers.indexOf('原文')]!==row.quote)throw new Error('原文引句遺失：'+chapter.chapter+' 第'+(i+1)+'步');matrix.push(values);
  });
 }
 fs.mkdirSync(path.dirname(outputPath),{recursive:true});fs.writeFileSync(outputPath,toCsv(matrix),'utf8');
 return {outputPath,chapters:model.ids.length,steps:matrix.length-1,columns:C.headers.length,inferredLocations,addedSteps:additions.length,additions,closeReadRows};
}
if(require.main===module){const result=exportCsv(process.argv[2],process.argv[3]);fs.writeFileSync(result.outputPath.replace(/\.csv$/u,'_新增步骤.csv'),toCsv([['篇号','篇名','原文单元','步骤类型','原遗漏词项','出发空间','到达空间','停留空间','原文','稳定步骤标识'],...result.additions]));console.log(JSON.stringify({outputPath:result.outputPath,steps:result.steps,addedSteps:result.addedSteps,chapters:result.chapters}));}
module.exports={csvCell,toCsv,exportCsv,completeScene,completeMentionTerms};
