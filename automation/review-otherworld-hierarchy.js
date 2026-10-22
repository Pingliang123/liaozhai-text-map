'use strict';
// Reviewed decisions, not suffix-based entity extraction. Re-run only with --apply.
const fs=require('node:fs'),crypto=require('node:crypto'),M=require('./ghost_map_model');
const clone=x=>JSON.parse(JSON.stringify(x));
const uri=id=>'https://chgis.hudci.org/tgaz/placename/'+id;
const decisions=[
 [14,513,'月宫','天界','illusory_scene'],
 [22,1009,'九幽','地界','scene'],[22,1009,'刀山','地界','scene'],[22,1009,'剑树','地界','scene'],
 [25,1126,'冥司','地界','scene'],[58,3417,'思乡地','地界','scene'],[58,3426,'望乡台','地界','scene'],
 [59,3540,'冥中','地界','mention'],[72,4589,'冥司','地界','mention'],[91,5753,'冥司','地界','mention'],[91,5763,'阴曹','地界','scene'],
 [98,6351,'天门','天界','scene'],[98,6355,'广寒宫','天界','scene'],[98,6359,'王母宫','天界','mention'],
 [120,8008,'冥中','地界','mention'],[146,9520,'冥司','地界','mention'],[147,9653,'刀山狱','地界','mention'],
 [157,10182,'冥中','地界','mention'],[176,11227,'冥司','地界','mention'],[178,11313,'冥司','地界','mention'],
 [187,12010,'冥司','地界','mention'],[191,12172,'冥中','地界','mention'],
 [203,12960,'天河','天界','mention'],[211,13474,'冥司','地界','dream_scene'],[221,14136,'冥司','地界','mention'],
 [239,15117,'冥中','地界','mention'],[259,16611,'冥司','地界','mention'],
 [272,17391,'仙人岛','天界','scene'],[273,17565,'阴曹','地界','mention'],
 [276,17729,'冥中','地界','mention'],[276,17749,'冥中','地界','mention'],
 [314,19780,'冥司','地界','mention'],[318,20222,'冥中','地界','mention'],[318,20226,'冥司','地界','mention'],
 [336,21409,'冥中','地界','mention'],[336,21482,'阴曹','地界','mention'],
 [375,22924,'安期岛','天界','mention'],[375,22940,'洞府','天界','scene'],
 [389,23809,'黑暗狱','地界','mention'],[392,24179,'阴世','地界','mention'],[393,24295,'冥司','地界','scene'],
 [395,24569,'阴曹','地界','scene'],[395,24639,'枉死城','地界','mention'],[403,25753,'黑暗狱','地界','mention'],
 [403,25845,'冥中','地界','mention'],[442,28804,'冥中','地界','mention'],[442,28804,'十八狱','地界','mention'],
 [462,29741,'剑树','地界','scene'],[462,29741,'刀山','地界','scene'],[462,29754,'冥中','地界','mention'],[473,30465,'冥中','地界','mention'],
 [462,29741,'冥中','地界','scene'],[474,30497,'冥中','地界','mention'],[478,30843,'神仙岛','天界','scene'],
 [480,31015,'给孤园','地界','mention'],[480,31015,'九幽','地界','mention'],[480,31018,'给孤园','地界','scene']
];
const excluded=[
 [21,926,'广寒宫','比拟婚夕，不是进入月宫'],[22,1018,'冥司','宛冥司倒悬状：比拟'],
 [147,9690,'九幽','人物对黑暗社会的比拟'],[147,9690,'十八狱','人物对黑暗社会的比拟'],
 [460,29678,'广寒宫','席间文字游戏，不是人物所在场景'],[460,29680,'天河','席间文字游戏'],
 [272,17412,'火云洞','所引戏文／西游记典故'],[272,17412,'子母河','所引戏文／西游记典故'],
 [181,11505,'天庭','额部，不是天界'],[382,23528,'桃源','薛生籍贯地名，不据词形判仙境'],
 [382,23567,'桃源','返乡地名，不据词形判仙境'],[130,8659,'龙宫','此处是女儿名字'],
 [130,8701,'龙宫','此处是女儿名字'],[480,31096,'瑶台','此处为人物，不是仙境'],
 [480,31097,'瑶台','人物'],[480,31099,'瑶台','人物'],[480,31100,'瑶台','人物'],[480,31102,'瑶台','人物'],
 [92,5976,'桃源','情辞用典'],[398,25228,'桃源','判词用典，不是实际场景'],
 [212,13551,'瑶台','檄文用典'],[296,19039,'瑶台','比拟配偶福命'],[336,21456,'瑶台','试题名称'],
 [379,23305,'地狱','人物借天堂／地狱作比拟'],[442,28831,'奈河','醒后比拟前历，不另增到访事件']
];
const extraTerms=['冥中','九幽','刀山','剑树','刀山狱','奈河','望乡台','思乡地','给孤园','黑暗狱','十八狱','天门','王母宫','天河','洞府','神仙岛','安期岛','卧眉','毒龙国','火云洞','子母河','瑶台','天庭','桃源','龙宫','冥府','冥界','冥司','幽冥','地府','阴曹','阴司','阴世','阴间','酆都','地狱','天界','天宫','九天','瑶池','广寒宫','仙界','仙境','蓬莱','瀛洲','罗刹国','罗刹海市','水府','仙人岛','洞天','福地','佛国','灵山','南天门','灵霄殿','月宫','水晶宫','海中市','海市'];
const aliases=[['汉水','汉江'],['滕','滕邑'],['沂','沂州'],['莱城','莱州'],['徐州','彭城'],['武夷','武夷山'],['辽城','辽阳'],['中州境','中州'],['吴江府','吴江'],['中华','中国']];
function audit(base,doc){
 const m=M.create(base);m.importDocument(doc);const ps=m.places(),byId=new Map(ps.flatMap(p=>(p.merged_ids||[p.id]).map(id=>[id,p])));
 const cycles=[],dangling=[],sameLevel=[],missing=[],conflicts=[];
 for(const p of ps){
  if(!p.parent_id){if(!['province','region'].includes(p.admin_level))missing.push({word:p.name,level:p.admin_level});continue;}
  const parent=byId.get(p.parent_id);if(!parent){dangling.push({word:p.name,parent:p.parent_id});continue;}
  if(parent.admin_level===p.admin_level)sameLevel.push({word:p.name,parent:parent.name,level:p.admin_level,note:'同级不必然错误；州县层级、山川包含或区域参考需区分'});
  let current=p,seen=new Set();while(current?.parent_id){if(seen.has(current.id)){cycles.push(p.name);break;}seen.add(current.id);current=byId.get(current.parent_id);}
  const expected=(p.historical_parent_name||'').replace(/[省府县]$/,'');
  if(expected&&!parent.name.includes(expected)&&!(p.historical_parent_name||'').includes(parent.name))conflicts.push({word:p.name,parent:parent.name,historical_parent:p.historical_parent_name,reference_year:p.hierarchy_year||null});
 }
 const edges=base.place_hierarchy.edges,historicalDangling=edges.filter(e=>!byId.has(e.child_id)||!byId.has(e.parent_id)),historicalCycles=[],historicalConflicts=[];
 // Check every interval endpoint, not just 1820 or the undated map parent.
 const years=new Set(edges.flatMap(e=>[e.year,e.valid_from,e.valid_to]).filter(y=>y!=null));
 for(const year of years){const parents=new Map();for(const e of edges){if(!(e.year!=null?e.year===year:(e.valid_from!=null||e.valid_to!=null)&&(e.valid_from==null||year>=e.valid_from)&&(e.valid_to==null||year<=e.valid_to)))continue;if(!parents.has(e.child_id))parents.set(e.child_id,new Set());parents.get(e.child_id).add(e.parent_id);}
  for(const [id,targets]of parents){if(targets.size>1)historicalConflicts.push({year,child:id,parents:[...targets]});const visit=(node,path)=>{if(path.has(node)){historicalCycles.push({year,child:id});return;}for(const next of parents.get(node)||[])visit(next,new Set([...path,node]));};visit(id,new Set());}
 }
 const referenceLinks=ps.filter(p=>p.parent_id&&['natural','region'].includes(p.admin_level)).map(p=>({word:p.name,parent:byId.get(p.parent_id)?.name,reason:'自然／泛地域的区域关联，不等于行政隶属，需结合故事场景核对'}));
 return {checked:ps.length,cycles,dangling,historical_edges_checked:edges.length,historical_dangling:historicalDangling,historical_cycles:historicalCycles,historical_conflicts:historicalConflicts,non_administrative_links:referenceLinks,same_level_to_review:sameLevel,missing_parent:missing,reference_conflicts:conflicts};
}
function apply(input,originalDoc){
 const pack=clone(input),doc=clone(originalDoc),base=pack.base;
 const report={date:'2026-10-21',source_sha256:base.source_sha256,method:'逐篇逐单位检索后按原文语义复核；地理结构全量检查，行政修正限有来源的记录。',before:audit(base,doc),added:[],excluded:[],location_changes:[],new_parents:[],held:[]};
 const byChapter=new Map(base.chapter_overview.map(c=>[c.chapter_id,c]));
 for(const [id,unit,word,realm,kind]of decisions){
  const c=byChapter.get(id),u=c?.source_units.find(u=>u.unit===unit),start=u?.text.indexOf(word);
  if(!u||start<0)throw Error('审核引句已变更：'+id+'/'+unit+'/'+word);
  if((c.realm_evidence||[]).some(e=>e.unit===unit&&e.space===word))continue;
  const eid=`u${unit}-${start}-${start+word.length}`;
  const review=doc.overrides.find(r=>r.chapter_id===id)?.changes.evidence_review||{};
  if(review[eid]?.kind==='reject'){report.held.push({chapter:c.chapter,unit,word,reason:'保留人工排除'});continue;}
  const e={id:eid,realm,space:word,unit,start,end:start+word.length,excerpt:u.text,kind,status:'source_checked',source_fingerprint:crypto.createHash('sha256').update(u.text).digest('hex'),relation:'篇内异境证据；不自动判作人物跨界路线'};
  (c.realm_evidence??=[]).push(e);report.added.push({chapter_id:id,chapter:c.chapter,...e});
 }
 for(const [id,unit,word,reason]of excluded){const c=byChapter.get(id),u=c?.source_units.find(u=>u.unit===unit);if(!u?.text.includes(word))throw Error('排除引句已变更：'+id+'/'+unit);report.excluded.push({chapter_id:id,chapter:c.chapter,unit,word,quote:u.text,reason});}
 const parents=[
  {id:'place-广平府',name:'广平府',admin_level:'prefecture',parent_id:'place-直隶',lon:114.72307,lat:36.70103,source_url:uri('hvd_9509'),note:'CHGIS 1820府治参考点；与广平县分立。'},
  {id:'place-武定府',name:'武定府',admin_level:'prefecture',parent_id:'place-山东',lon:117.50389,lat:37.48272,source_url:uri('hvd_9671'),note:'CHGIS 1820府治参考点；1734年升府。'},
  {id:'place-武定州-山东',name:'武定州（山东）',admin_level:'prefecture',parent_id:'place-山东',lon:117.50389,lat:37.48272,source_url:uri('hvd_86015'),note:'1724—1733年山东直隶州；勿与云南武定州混同。'},
  {id:'place-江苏',name:'江苏',admin_level:'province',parent_id:null,lon:120.61862,lat:31.31271,source_url:uri('hvd_30035'),note:'CHGIS清代江苏省治参考点（苏州），不表示省域几何中心。'},
  {id:'place-安徽',name:'安徽',admin_level:'province',parent_id:null,lon:117.03468,lat:30.51229,source_url:uri('hvd_25018'),note:'CHGIS 1820安徽省治参考点（安庆），不表示省域几何中心。'},
  {id:'place-四川',name:'四川',admin_level:'province',parent_id:null,lon:104.07800,lat:30.65038,source_url:uri('hvd_25013'),note:'CHGIS 1820四川省治参考点，不表示省域几何中心。'},
  {id:'place-甘肃',name:'甘肃',admin_level:'province',parent_id:null,lon:103.84714,lat:36.04703,source_url:uri('hvd_25053'),note:'CHGIS 1820甘肃省治参考点，不表示省域几何中心。'}
 ];
 for(const p of parents){const existing=base.places.find(x=>x.id===p.id),display={scale_category:p.admin_level==='province'?'province':'settlement',scale_label:p.admin_level==='province'?'省域':'府／州',level_label:p.admin_level==='province'?'省域':'府／州',min_zoom:1};if(!existing){base.places.push({...p,...display,coordinate_kind:'approximate',modern_name:p.name+'历史治所参考',hierarchy_year:p.name.includes('武定州')?null:1820});report.new_parents.push(p);}else if(existing.source_url===p.source_url)for(const [key,value]of Object.entries(display))if(existing[key]==null)existing[key]=value;}
 const patchLocation=(word,expected,patch,reason)=>{
  const b=base.places.find(x=>x.name===word),l=doc.place_locations.find(x=>x.name===word),effective=l||b;
  if(!b||!effective||Object.entries(patch).every(([k,v])=>effective[k]===v))return;
  if(effective.parent_id!==expected){report.held.push({word,reason:'归属已有其他修订，不覆盖：'+effective.parent_id});return;}
  const changes={...patch};if(reason){changes.region_description=reason;changes.note=reason;}
  report.location_changes.push({word,before:clone(effective),changes,reason});
  Object.assign(b,changes);if(l)Object.assign(l,changes);
 };
 patchLocation('阳信','place-济南府',{parent_id:'place-武定府',source_url:uri('hvd_1006')},'1820参考：阳信县属武定府。1724—1733属武定直隶州，1734起属武定府；故事年代未定，不据此推断故事发生于晚清。');
 patchLocation('永年','place-广平',{parent_id:'place-广平府',lon:114.72307,lat:36.70103,source_url:uri('hvd_58')},'永年县为广平府治，非广平县下辖；坐标采用CHGIS历史县治（广府），不采用今永年城区。');
 patchLocation('广平',null,{parent_id:'place-广平府'},'当前登记对象为广平县，1820属广平府；《李司鉴》“地方报广平”的府县指向仍须结合上下文核对，不因补上级而消除歧义。');
 patchLocation('临清','place-东昌',{parent_id:'place-山东',lon:115.70152,lat:36.84621,source_url:uri('hvd_86010')},'1776—1911临清直隶州属山东省；默认地图采用1820参考，早期东昌区域关系不延用到晚清。');
 patchLocation('临朐','place-山东',{parent_id:'place-青州',source_url:uri('hvd_1732')},'1820参考：临朐县属青州府，青州府属山东；不跳过已存在的府级节点。');
 const restoredParents=[];
 for(const word of ['乐陵','利津','滨州','蒲台','青城','保宁','夔州','成都','泸州','重庆','凤阳','太平','庐州','广陵','扬州','海州','平凉','甘州']){
  const p=base.places.find(p=>p.name===word),parentName=p?.historical_parent_name?.replace(/省$/,''),parent=base.places.find(p=>p.name===parentName);
  if(!p||p.hierarchy_year!==1820||!p.level_source_url||!parent)throw Error('缺少1820独立记录：'+word);
  patchLocation(word,null,{parent_id:parent.id},'1820参考：'+word+'属'+p.historical_parent_name+'；补齐已存CHGIS记录中的上级，不外推故事年代。');
  restoredParents.push([word,parent.id,p.level_source_url]);
 }
 for(const [word,target]of aliases){
  const b=base.places.find(x=>x.name===word),t=base.places.find(x=>x.name===target);if(!b||!t)continue;
  patchLocation(word,t.id,{parent_id:t.parent_id||null},word+'与'+target+'使用同区参考点，不表示二者是行政上下级。');
  const eq={word,target,relation:'same-reference-area',source:'2026-10-21语境与关系类型复核',note:'同区参考，不是行政隶属；保留原词，不合并原文。'};
  base.place_equivalences=[...(base.place_equivalences||[]).filter(e=>e.word!==word),eq];
 }
 // Replace only the verified reference-year links, not arbitrary historical edges.
 const reference=[['阳信','place-武定府','hvd_1006'],['永年','place-广平府','hvd_58'],['广平','place-广平府','hvd_63'],['临清','place-山东','hvd_9670'],['临朐','place-青州','hvd_1732'],['武定府','place-山东','hvd_9671'],['广平府','place-直隶','hvd_9509']];
 for(const [word,parent,id]of reference){const child=base.places.find(p=>p.name===word);base.place_hierarchy.edges=base.place_hierarchy.edges.filter(e=>!(e.child_id===child.id&&e.year===1820));base.place_hierarchy.edges.push({child_id:child.id,parent_id:parent,kind:'historical_reference_contains',year:1820,source_url:uri(id),note:'CHGIS 1820参考；不代替故事年代。'});}
 for(const [word,parent,url]of restoredParents){const child=base.places.find(p=>p.name===word);base.place_hierarchy.edges=base.place_hierarchy.edges.filter(e=>!(e.child_id===child.id&&e.year===1820));base.place_hierarchy.edges.push({child_id:child.id,parent_id:parent,kind:'historical_reference_contains',year:1820,source_url:url,note:'补齐已存CHGIS 1820记录的上级；不代替故事年代。'});}
 for(const row of [
  ['阳信','place-武定州-山东',1724,1733,'hvd_85534'],['阳信','place-武定府',1734,1911,'hvd_85534'],
  ['武定州（山东）','place-山东',1724,1733,'hvd_86015'],['武定府','place-山东',1734,1911,'hvd_86004'],
  ['永年','place-广平府',1368,1911,'hvd_44826'],['临清','place-山东',1776,1911,'hvd_86010']
 ]){const [word,parent,from,to,id]=row,child=base.places.find(p=>p.name===word);const edge={child_id:child.id,parent_id:parent,kind:'historical_contains',valid_from:from,valid_to:to,source_url:uri(id),note:'CHGIS逐段历史记录；其他年份不外推。'};if(!base.place_hierarchy.edges.some(e=>e.child_id===edge.child_id&&e.parent_id===parent&&e.valid_from===from&&e.valid_to===to))base.place_hierarchy.edges.push(edge);}
 base.place_hierarchy.edges.sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b),'en'));
 const model=M.create(base);model.importDocument(doc);report.after=audit(base,doc);
 const terms=[...new Set([...extraTerms,...base.chapter_overview.flatMap(c=>(c.realm_evidence||[]).map(e=>e.space))])].filter(Boolean);
 report.occurrences=[];
 for(const id of model.ids){const c=model.view(id);for(const u of c.source_units)for(const word of terms){let at=-1;while((at=u.text.indexOf(word,at+1))>=0){const e=c.realm_evidence.find(e=>e.unit===u.unit&&e.space===word&&e.start===at),rejected=report.excluded.find(e=>e.chapter_id===id&&e.unit===u.unit&&e.word===word);report.occurrences.push({chapter_id:id,chapter:c.chapter,unit:u.unit,word,start:at,quote:u.text,status:rejected?'excluded':e?'recorded':'context_review',reason:rejected?.reason||'',evidence_id:e?.id||null});}}}
 report.realm_conflicts=report.added.filter(e=>!model.view(e.chapter_id).realms_present.includes(e.realm)).map(e=>({chapter:e.chapter,word:e.space,unit:e.unit,reason:'已补证据；保留人工篇目三界标签，不自动覆盖。'}));
 report.summary={chapters:model.ids.length,place_records:report.after.checked,added_evidence:report.added.length,added_terms:new Set(report.added.map(e=>e.space)).size,changed_locations:report.location_changes.length,new_parent_records:report.new_parents.length,scanned_occurrences:report.occurrences.length,unresolved_occurrences:report.occurrences.filter(x=>x.status==='context_review').length};
 pack.revisions=clone(doc);return {pack,doc,report};
}
function markdown(r){return '# 异境词与地名归属复核\n\n'+
 '原文检索与语义复核，不以词尾或模型置信度代替证据。地图与实验室共用 data-package.json。\n\n'+
 `检查${r.summary.chapters}篇、${r.summary.place_records}条地点登记。新增${r.summary.added_evidence}条异境证据（${r.summary.added_terms}种表述）；修正${r.summary.changed_locations}条定位／归属；补${r.summary.new_parent_records}条历史上级。\n\n`+
 '## 补入的异境证据\n\n|篇目|词|原文|性质|\n|---|---|---|---|\n'+r.added.map(e=>`|${e.chapter}|${e.space}|${e.excerpt}|${e.kind==='scene'?'场景':e.kind==='dream_scene'?'梦中场景':e.kind==='illusory_scene'?'幻设场景':'提及／追述'}|`).join('\n')+
 '\n\n场景证据不自动生成移动线；提及不等于人物到访。天界包括仙居，非一概指地理上的天空。篇目三界人工标签未变；证据与现有标签冲突见 JSON。\n\n## 地理修正\n\n|词|原上级|修正后上级|依据|\n|---|---|---|---|\n'+r.location_changes.map(e=>`|${e.word}|${e.before.parent_id||'未填'}|${e.changes.parent_id||'无行政父项'}|${e.reason} [资料](${e.changes.source_url||e.before.source_url})|`).join('\n')+
 '\n\n## 排除的误读\n\n'+r.excluded.map(e=>`- 《${e.chapter}》“${e.word}”：${e.reason}。`).join('\n')+
 '\n\n## 尚需核对\n\n'+`检索表覆盖${r.summary.scanned_occurrences}次出现，其中${r.summary.unresolved_occurrences}次待逐条语境判断（包括机构代称、引语和洞府等泛称），不是已认定的遗漏数。检查${r.after.historical_edges_checked}条历史上下级记录；同级父子、缺少中间上级、山川与区域关系均逐条列入 JSON。尚有${r.after.missing_parent.length}条非省级／泛地域登记未填父项（含山川、别名等，不都是缺失行政区）。无循环和悬空父项不代表历史归属已全部考定。夜叉国、卧眉、毒龙国等异域不强塞入天界或地界。\n\n`+
 '所有篇目的人工词类、分词、人物、时间、异事类型和证据判定均未改写。地理修正仅替换报告所列旧值；原值完整保留在 JSON，可依提交回滚。\n';}
if(require.main===module){
 const result=apply(JSON.parse(fs.readFileSync('data-package.json')),JSON.parse(fs.readFileSync('manual-revisions.json')));
 if(process.argv.includes('--apply')){
  const file='reports/otherworld-hierarchy-review-20261021.json';
  if(fs.existsSync(file)){
   const prior=JSON.parse(fs.readFileSync(file));if(prior.source_sha256!==result.report.source_sha256)throw Error('原文版本变化，须另建审核报告');
   const unique=(rows,key)=>[...new Map(rows.map(x=>[key(x),x])).values()];
   result.report.before=prior.before;
   result.report.added=unique([...prior.added,...result.report.added],x=>x.chapter_id+'/'+x.id);
   result.report.location_changes=unique([...result.report.location_changes,...prior.location_changes],x=>x.word);
   result.report.new_parents=unique([...prior.new_parents,...result.report.new_parents],x=>x.id);
   const published=M.create(result.pack.base);published.importDocument(result.doc);
   result.report.realm_conflicts=result.report.added.filter(e=>!published.view(e.chapter_id).realms_present.includes(e.realm)).map(e=>({chapter:e.chapter,word:e.space,unit:e.unit,reason:'已补证据；保留人工篇目三界标签，不自动覆盖。'}));
   Object.assign(result.report.summary,{added_evidence:result.report.added.length,added_terms:new Set(result.report.added.map(e=>e.space)).size,changed_locations:result.report.location_changes.length,new_parent_records:result.report.new_parents.length});
  }
  fs.writeFileSync('data-package.json',JSON.stringify(result.pack));fs.writeFileSync('manual-revisions.json',JSON.stringify(result.doc));fs.writeFileSync(file,JSON.stringify(result.report,null,2));fs.writeFileSync('reports/otherworld-hierarchy-review-20261021.md',markdown(result.report));
 }
 console.log(JSON.stringify(result.report.summary));
}
module.exports={apply,audit,decisions,excluded,aliases};
