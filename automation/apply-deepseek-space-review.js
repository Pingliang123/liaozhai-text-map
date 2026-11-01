'use strict';
const fs=require('node:fs'),crypto=require('node:crypto');
const M=require('./ghost_map_model'),P=require('./ghost_map_package'),R=require('../assets/spatial-routes');
const REVIEW_PATH='C:/Users/yufen/AppData/Local/Temp/liaozhai-space-review-bae26ed79eda667652ce4313c3204018118a36604a6244bb2bcec912aa30979b.json';
const REPORT='reports/deepseek-space-application-20261101.json';
const MANUAL_NOUNS=new Set('家 几 門 门 地 床 案 舍 舍 户 戶 墙 牆 城 墓 窗 窗 壁 房 屋 宅 院 廊 厅 廳 堂 殿 宫 宮 觀 观 寺 庙 廟 祠 阁 閣 樓 楼 台 亭 榭 斋 齋 馆 館 店 肆 室 厨 廚 灶 井 榻 庭 园 園 囿 扉 阶 階 阙 闕 洞 穴 庐 廬 庵 冢 塚 坟 墳 塔 库 庫 仓 倉 舱 艙 闺 閨 轩 軒 宇 市'.split(/\s/u));
const BUILT_ENDS='第宅院廊厅堂殿宫觀观寺庙廟祠阁閣楼樓台亭榭斋館馆店肆室房屋舍庐廬庵厨廚灶井榻庭园園囿门門户戶窗壁墙牆扉阶階阙闕洞穴冢塚坟墳墓塔库庫仓倉舱艙闺閨轩軒宇市'.split('');
const NATURAL_NOUNS=new Set('山 水 河 江 海 湖 林 野 原 岸 谷 洞 穴 泉 溪 川 泽 澤 岛 島 洲 峰 岭 嶺 丘 坡 天 空 地 云 雲 风 風 树 樹 草 田 石 雪 沙 岩 际 際'.split(/\s/u));
const NATURAL_ENDS='山岭嶺峰谷洞穴溪河江湖海水泉林野郊原岸丘坡川泽澤岛島洲树樹草田石雪沙岩际際'.split('');
const LOCATIVES=new Set('上 下 内 內 外 中 间 間 前 后 後 左 右 东 東 西 南 北 里 边 邊 旁 侧 側 底 顶 頂 沿 畔'.split(/\s/u));
const BOUNDARY_NOUNS=new Set('门 門 户 戶 口 关 關 界 边 邊 岸 桥 橋 津 径 徑 路 道 洞 穴 窗 墙 牆 垣 隙 缝 縫 扉 阙 闕'.split(/\s/u));
const BOUNDARY_ENDS='门門户戶口关關界边邊岸桥橋津径徑路道洞穴窗墙牆垣隙缝縫扉阙闕'.split('');
const OTHERWORLDS=new Set('人间 人間 人世 尘世 塵世 尘间 塵間 冥司 冥府 冥间 冥間 冥界 幽冥 阴间 陰間 阴曹 陰曹 地府 地狱 地獄 黄泉 黃泉 九泉 月宫 月宮 广寒宫 廣寒宮 广寒 廣寒 天宫 天宮 天庭 仙界 仙境 洞天 龙宫 龍宮 水府 鬼域 酆都 罗刹国 羅刹國 枉死城 奈河 奈何桥 奈何橋 刀山 剑树 劍樹 天堂'.split(/\s/u));
const OTHERWORLD_ENDS='界境府狱獄泉宫宮司域国國城殿庭洞天乡鄉间間'.split('');
const ACTION_START=/^(?:奔|赴|去|到|来|來|返|归|歸|回|入|出|登|走|行|从|從|越|趋|趨|渡|潜|潛|遁|飞|飛|飘|飄|迁|遷|留|居|就|寄|寓|傍|扃|启|啟|开|開|闭|閉|掩|推|扣|叩|过|過|经|經|至|抵|访|訪|望|窥|窺|乘|循|绕|繞|向|在|于|於|以|除|设|設|穿|插|撮|捶|冲|衝|辟|劈|拔|避|达|達|扛|携|攜|引|追|寻|尋|叩|闯|闖|出|泊|徙|堕|墮|创|創|躇)/u;
const FUNCTION_CHARS=/[而者也其以于於如似则則不未或与與此彼我尔爾]/u;
function candidateIsSpatial(row){
 const w=row.word,t=row.type;if(typeof w!=='string'||!w||[...w].length>4||/^[\p{P}\p{S}\s]+$/u.test(w)||FUNCTION_CHARS.test(w)||ACTION_START.test(w))return false;
 if(['built','boundary'].includes(t)&&w.length===1)return MANUAL_NOUNS.has(w)||BOUNDARY_NOUNS.has(w);
 if(t==='built')return MANUAL_NOUNS.has(w)||BUILT_ENDS.some(s=>w.endsWith(s));
 if(t==='natural')return NATURAL_NOUNS.has(w)||NATURAL_ENDS.some(s=>w.endsWith(s));
 if(t==='boundary')return BOUNDARY_NOUNS.has(w)||BOUNDARY_ENDS.some(s=>w.endsWith(s));
 if(t==='relative')return LOCATIVES.has(w)||['之前','之后','之内','之外','之上','之下','之中'].includes(w)||[...LOCATIVES].some(s=>w.endsWith(s))&&w.length<=4;
 if(t==='otherworld')return OTHERWORLDS.has(w)||OTHERWORLD_ENDS.some(s=>w.endsWith(s))&&!/^(?:冥王|鬼王|龙王|龍王|上帝)/u.test(w);
 if(t==='relation')return ['何处','何地','何所','何方','何往'].includes(w);
 return false;
}
function difference(before,after){let left=0;while(left<before.length&&left<after.length&&before[left]===after[left])left++;let bi=before.length,ai=after.length;while(bi>left&&ai>left&&before[bi-1]===after[ai-1]){bi--;ai--;}return {before:before.slice(left,bi),after:after.slice(left,ai)};}
function sequenceStarts(tokens,needle){const out=[];for(let i=0;i<=tokens.length-needle.length;i++)if(needle.every((w,j)=>tokens[i+j]===w))out.push(i);return out;}
function completeTokenUnits(chapter){
 const lex=R.lexicon(chapter),units=chapter.source_units||[];
 if(lex.basis==='与原文逐字对齐的已保存分词')return R.tokenUnits(chapter,lex).map(row=>[...(row||[])]);
 return units.map(u=>{const s=u.text||u.original||'',out=[];let at=0;for(const t of u.tokens||[]){const a=Array.isArray(t)?t[0]:t.start,b=Array.isArray(t)?t[1]:t.end;if(a>at)out.push(s.slice(at,a));if(b>a)out.push(s.slice(a,b));at=b;}if(at<s.length)out.push(s.slice(at));return out.filter(Boolean);});
}
function digest(s){return crypto.createHash('sha256').update(s).digest('hex');}
function plan({pkg,doc,progress,data}){
 if(data.source_hash!==pkg.base.source_sha256)throw Error('DeepSeek审核所用原文版本与当前总资料包不同');
 const model=M.create(pkg.base);model.importDocument(doc);
 const unitsByChapter=new Map(data.chapters.map(c=>[c.id,c]));
 const candidateMap=new Map();for(const row of progress.candidates||[]){const list=candidateMap.get(row.word)||[];if(!list.some(x=>x.type===row.type&&x.evidence.chapter_id===row.evidence.chapter_id&&x.evidence.unit_id===row.evidence.unit_id))list.push(row);candidateMap.set(row.word,list);}
 const accepted=new Map();for(const [word,rows]of candidateMap){const valid=rows.filter(candidateIsSpatial);if(valid.length)accepted.set(word,valid[0]);}
 const placeNames=new Set(model.places().flatMap(p=>[p.name,...(p.merged_names||[])]));for(const id of model.ids)for(const p of model.view(id).places)placeNames.add(model.name(p.word));
 const allSpatialTerms=new Set([...accepted.keys()]);
 const proposals=[],held={possible:0,sourceMismatch:0,wordNotInBefore:0,noSpatialBoundary:0,ambiguous:0,conflict:0};
 for(const row of progress.segmentation||[]){
  if(row.certainty!=='likely'){held.possible++;continue;}
  const before=row.evidence?.before||[],after=row.evidence?.after||[],chapter=model.view(row.evidence.chapter_id),unit=chapter.source_units.find(u=>u.unit===row.evidence.unit_id),snapshot=unitsByChapter.get(row.evidence.chapter_id)?.units.find(u=>u.id===row.evidence.unit_id);
  if(!unit||!snapshot||unit.text!==row.evidence.quote||snapshot.text!==row.evidence.quote||before.join('')!==after.join('')||!before.length||!after.length||before.join('\0')===after.join('\0')){held.sourceMismatch++;continue;}
  if(!before.includes(row.word)){held.wordNotInBefore++;continue;}
  const effective=completeTokenUnits(chapter)[chapter.source_units.findIndex(u=>u.unit===row.evidence.unit_id)]||[];
  const starts=sequenceStarts(effective,before);if(starts.length!==1){held.ambiguous++;continue;}
  const diff=difference(before,after),hits=diff.after.filter(w=>allSpatialTerms.has(w)||placeNames.has(model.name(w)));
  if(!hits.length||/可保留|不必修改|不应改|建议保留|也可保留/u.test(row.reason||'')){held.noSpatialBoundary++;continue;}
  proposals.push({chapter_id:row.evidence.chapter_id,chapter:chapter.chapter,unit_id:row.evidence.unit_id,start:starts[0],end:starts[0]+before.length,before,after,hits,word:row.word,frequency:row.frequency,reason:row.reason,quote:row.evidence.quote});
 }
 proposals.sort((a,b)=>a.chapter_id-b.chapter_id||a.unit_id-b.unit_id||a.start-b.start||(b.end-b.start)-(a.end-a.start)||b.frequency-a.frequency);
 const selected=[],seen=new Set,occupied=new Map;
 for(const row of proposals){const key=[row.chapter_id,row.unit_id,row.start,row.end,row.before.join('\0'),row.after.join('\0')].join('|');if(seen.has(key))continue;seen.add(key);const scope=row.chapter_id+':'+row.unit_id,spans=occupied.get(scope)||[];if(spans.some(x=>row.start<x.end&&row.end>x.start)){held.conflict++;continue;}spans.push({start:row.start,end:row.end});occupied.set(scope,spans);selected.push(row);}
 const perChapter=new Map;
 for(const row of selected){if(!perChapter.has(row.chapter_id))perChapter.set(row.chapter_id,new Map);const map=perChapter.get(row.chapter_id);if(!map.has(row.unit_id))map.set(row.unit_id,[]);map.get(row.unit_id).push(row);}
 const tokenChanges=new Map;
 for(const [id,unitRows]of perChapter){const c=model.view(id),unitTokens=completeTokenUnits(c);for(const [unitId,rows]of unitRows){const index=c.source_units.findIndex(u=>u.unit===unitId);for(const row of [...rows].sort((a,b)=>b.start-a.start))unitTokens[index].splice(row.start,row.end-row.start,...row.after);}
  const source=c.source_units.map(u=>u.text||u.original||'').join('').replace(/\s/gu,''),joined=unitTokens.flat().join('').replace(/\s/gu,'');if(source!==joined){let i=0;while(i<source.length&&source[i]===joined[i])i++;throw Error('分词建议改动了原文字符：《'+c.chapter+'》位置'+i+' 原文「'+source.slice(i,i+30)+'」 切分「'+joined.slice(i,i+30)+'」');}
  const note=unitTokens.map(a=>a.join(' / ')).join('\n');tokenChanges.set(id,{unitTokens,note});}
 const additions=[],skipped={placeCandidates:0,notSpatialForm:0,notAligned:0,manualDecision:0,existingPlaceOrPerson:0,alreadyPresent:0};
 for(const [word,rows]of candidateMap){
  if(rows.every(r=>r.type==='place')){skipped.placeCandidates++;continue;}
  if(!accepted.has(word)){skipped.notSpatialForm++;continue;}
  const sourceRows=rows.filter(r=>candidateIsSpatial(r)&&unitsByChapter.get(r.evidence.chapter_id)?.units.some(u=>u.id===r.evidence.unit_id&&u.text===r.evidence.quote&&u.token_words?.includes(word)));
  if(!sourceRows.length){skipped.notAligned++;continue;}
  for(const row of sourceRows){const id=row.evidence.chapter_id,c=model.view(id),snapshot=unitsByChapter.get(id)?.units.find(u=>u.id===row.evidence.unit_id);if(!snapshot||!snapshot.token_words?.includes(word))continue;
   const review=c.lexical_reviews||{},sr=review['spaces:'+word],pr=review['places:'+word];
   if(sr||pr){skipped.manualDecision++;continue;}
   if(c.places.some(p=>model.name(p.word)===model.name(word))||c.people.some(p=>p.word===word)){skipped.existingPlaceOrPerson++;continue;}
   if(c.space_words.includes(word)){skipped.alreadyPresent++;continue;}
   additions.push({chapter_id:id,chapter:c.chapter,unit_id:row.evidence.unit_id,word,type:row.type,frequency:row.frequency,example:row.evidence});
  }
 }
 const uniqueAdditions=[...new Map(additions.map(row=>[row.chapter_id+'|'+row.word,row])).values()];
 return {model,accepted,selected:[],segmentationReview:proposals,held:{...held,likelySuggestionsHeld:proposals.length},tokenChanges:new Map(),additions:uniqueAdditions,skipped};
}
function apply({root=process.cwd(),checkpoint=REVIEW_PATH,dryRun=false}={}){
 const pkgPath=root+'/data-package.json',docPath=root+'/manual-revisions.json',dataPath=root+'/assets/research-lab/data.json',pkg=JSON.parse(fs.readFileSync(pkgPath,'utf8')),doc=JSON.parse(fs.readFileSync(docPath,'utf8')),progress=JSON.parse(fs.readFileSync(checkpoint,'utf8')),data=JSON.parse(fs.readFileSync(dataPath,'utf8'));
 const reviewed=plan({pkg,doc,progress,data});
 const grouped=new Map;for(const row of reviewed.additions){if(!grouped.has(row.chapter_id))grouped.set(row.chapter_id,[]);grouped.get(row.chapter_id).push(row);}const failedChapters=[];
 if(dryRun)return {dryRun,spaceTerms:reviewed.accepted.size,spaceAdditions:reviewed.additions.length,chapters:grouped.size,segmentation:reviewed.selected.length,held:reviewed.held};
 for(const id of reviewed.model.ids){const draft=reviewed.model.editable(id),tokens=reviewed.tokenChanges.get(id)?.unitTokens;if(tokens)draft.segmentation_note=tokens.map(a=>a.join(' / ')).join('\n');
  for(const row of grouped.get(id)||[]){if(!draft.space_words.includes(row.word))draft.space_words.push(row.word);draft.lexical_reviews={...draft.lexical_reviews,['spaces:'+row.word]:{status:'accepted',word:row.word,kind:'spaces',note:'已核对本篇原文例句；仅在此篇标为空间词。'}};}
  if(tokens||(grouped.get(id)||[]).length)try{reviewed.model.save(id,draft);}catch(error){if(error.message.includes('分词必须与原文一致')){failedChapters.push({chapter_id:id,chapter:reviewed.model.view(id).chapter,reason:error.message});continue;}throw Error('《'+reviewed.model.view(id).chapter+'》修订未通过：'+error.message);}
 }
 const next=reviewed.model.document(),validation=P.create(pkg.base,next),before=digest(JSON.stringify(doc)),after=digest(JSON.stringify(next));
 const appliedRows=reviewed.additions.filter(row=>!failedChapters.some(c=>c.chapter_id===row.chapter_id));
 const report={generated:new Date().toISOString(),source_sha256:pkg.base.source_sha256,checkpoint_fingerprint:progress.fingerprint,review_scope:{checked_types:31460,total_types:51654,space_candidate_rows:progress.candidates.length,unique_candidate_terms:new Set(progress.candidates.map(r=>r.word)).size,segmentation_rows:progress.segmentation.length},screening:{accepted_space_terms:reviewed.accepted.size,held_place_terms:reviewed.skipped.placeCandidates,held_other_terms:reviewed.skipped.notSpatialForm,held_manual_conflicts:reviewed.skipped.manualDecision,held_existing_places_or_people:reviewed.skipped.existingPlaceOrPerson,already_present:reviewed.skipped.alreadyPresent,unaligned:reviewed.skipped.notAligned},application:{space_term_occurrences:appliedRows.length,chapters_with_space_additions:grouped.size-failedChapters.length,chapters_held_for_source_alignment:failedChapters,applied_segmentation:0,segmentation_held:{possible:progress.segmentation.filter(r=>r.certainty!=='likely').length,likely_rows:progress.segmentation.filter(r=>r.certainty==='likely').length,eligible_candidates_held:reviewed.segmentationReview.length,without_spatial_boundary:reviewed.held.noSpatialBoundary,missing_query_token:reviewed.held.wordNotInBefore}},revision_hashes:{before,after},applied_terms:appliedRows.map(row=>({word:row.word,type:row.type,chapter:row.chapter,unit_id:row.unit_id,quote:row.example.quote,reason:row.example.reason})),screened_terms:[...reviewed.accepted].map(([word,row])=>({word,type:row.type,frequency:row.frequency,chapter:row.evidence.chapter,quote:row.evidence.quote,reason:row.reason})),segmentation_candidates_not_applied:reviewed.segmentationReview};
 if(!dryRun){pkg.revisions=validation.revisions;const atomic=(p,v)=>{const tmp=p+'.tmp';fs.writeFileSync(tmp,JSON.stringify(v));fs.renameSync(tmp,p);};atomic(docPath,next);atomic(pkgPath,pkg);fs.writeFileSync(root+'/'+REPORT,JSON.stringify(report,null,2)+'\n');}
 return {dryRun,spaceTerms:reviewed.accepted.size,spaceAdditions:reviewed.additions.length-failedChapters.reduce((n,c)=>n+(grouped.get(c.chapter_id)||[]).length,0),chapters:grouped.size-failedChapters.length,chaptersHeldForSourceAlignment:failedChapters,segmentation:reviewed.selected.length,held:reviewed.held};
}
if(require.main===module){const result=apply({dryRun:process.argv.includes('--dry-run')});console.log(JSON.stringify(result,null,2));}
module.exports={candidateIsSpatial,difference,sequenceStarts,completeTokenUnits,plan,apply,MANUAL_NOUNS,BUILT_ENDS,NATURAL_NOUNS,LOCATIVES};
