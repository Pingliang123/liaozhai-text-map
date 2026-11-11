(function(root){'use strict';
const headers=['篇号','篇名','步骤','人物',...['出发','到达','停留'].flatMap(p=>[p+'空间',p+'使用方式',p+'空间所在地点',p+'世界分类']),'场景','步骤类型','分类依据','参考地点','边界／媒介','空间叙事功能','原文','稳定步骤标识','双端证据'];
const contextCache=new WeakMap();
const REALMS=new Set(['天界','地界','人间']);
function indexFor(chapter,routes){
 if(contextCache.has(chapter))return contextCache.get(chapter);
 const lex=routes.lexicon(chapter),units=chapter.source_units||chapter.units||[],tokens=routes.tokenUnits(chapter,lex);
 const rows=units.map((unit,i)=>({id:unit.unit??unit.id??i,unit,tokens:tokens[i]||[]}));
 const value={lex,rows,spaces:new Set(chapter.space_words||chapter.spaces||[]),places:(chapter.places||[]).map(p=>typeof p==='string'?p:p.word).filter(Boolean),realmEvidence:chapter.realm_evidence||[]};
 contextCache.set(chapter,value);return value;
}
function eventTokens(row,index){
 const event=row.source_event||{},quote=String(row.quote||'');if(!quote)return new Set();
 const start=Number(event.unit),end=Number(event.unit_end??event.unit),inRange=index.rows.filter(r=>Number.isFinite(start)&&r.id>=start&&r.id<=end);
 const source=inRange.length?inRange:index.rows;
 return new Set(source.flatMap(r=>r.tokens).filter(token=>token&&quote.includes(token)&&index.lex.words.has(token)));
}
function contextPlaces(tokens,index){return [...new Set(index.places)].filter(word=>tokens.has(word));}
function nearestPlace(space,places,quote){
 if(!places.length)return '';
 if(places.length===1)return places[0];
 const at=quote.indexOf(space);if(at<0)return '';
 const ranked=places.map(word=>({word,distance:Math.min(...[...quote.matchAll(new RegExp(escapeRegExp(word),'gu'))].map(m=>Math.abs(m.index-at)))})).sort((a,b)=>a.distance-b.distance);
 return ranked.length===1||ranked[0].distance<ranked[1].distance?ranked[0].word:'';
}
function escapeRegExp(value){return value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
function worldFor(role,space,location,row,index){
 const event=row.source_event||{},review=row.endpoint_review||event.endpoint_review||{},quote=String(row.quote||''),prefix=role==='stay'?'space':role;
 const chapterRealms=[...new Set(index.realmEvidence.map(e=>e.realm).filter(realm=>REALMS.has(realm)))];
 const stepRealm=role==='stay'?(row.has_movement?(event.space_realm==='异境'&&chapterRealms.length===1?'异境':''):(event.space_realm||row.classification?.realm)):'',rawRealm=event[prefix+'_realm']||review[prefix+'_realm']||stepRealm;
 const explicit=REALMS.has(rawRealm)?rawRealm:'';
 if(explicit)return explicit;
 const evidence=index.realmEvidence.filter(e=>e.space===space&&REALMS.has(e.realm)&&quote.includes(e.space));
 const realms=[...new Set(evidence.map(e=>e.realm))];if(realms.length===1)return realms[0];
 if(rawRealm==='异境'&&chapterRealms.length===1)return chapterRealms[0];
 if(rawRealm==='异境')return '';
 // A place token in the quoted, tokenized source is a human-world location
 // unless the same step gives explicit celestial/underworld evidence.
 if(location)return '人间';
 return '';
}
function groups(row,chapter,routes){
 const index=indexFor(chapter,routes),quote=String(row.quote||''),tokens=eventTokens(row,index),spaces=[...index.spaces].filter(w=>tokens.has(w)),places=contextPlaces(tokens,index),event=row.source_event||{},review=row.endpoint_review||event.endpoint_review||{};
 const valid=w=>w&&index.lex.words.has(w)&&tokens.has(w)?w:'';
 const raw={from:row.from_space,to:row.to_space};
 const endpoint={from:valid(raw.from),to:valid(raw.to)};
 const staying=[...new Set(spaces.filter(w=>w!==endpoint.from&&w!==endpoint.to))];
 if(!row.has_movement){
  const sceneSpace=String(row.space||'').split(/\s*(?:→|／|、|,|，|；|;)\s*/u).map(valid).find(Boolean);
  for(const word of spaces)if(word===sceneSpace&&!staying.includes(word))staying.unshift(word);
 }
 const stayWord=staying.join('、');
 return ['from','to','stay'].map(role=>{
  const word=role==='stay'?stayWord:endpoint[role]||'';
  const access=word?(role==='from'?(row.from_access||event.from_access||review.from_access):role==='to'?(event.to_access||review.to_access||row.classification?.access):(event.space_access||row.classification?.access)):'';
  const subject=role==='stay'?staying[0]:word,prefix=role==='stay'?'space':role;
  const chapterRealms=[...new Set(index.realmEvidence.map(e=>e.realm).filter(realm=>REALMS.has(realm)))],stepRealm=role==='stay'?(row.has_movement?(event.space_realm==='异境'&&chapterRealms.length===1?'异境':''):(event.space_realm||row.classification?.realm)):'',rawRealm=event[prefix+'_realm']||review[prefix+'_realm']||stepRealm;
  const evidencedRealm=word?worldFor(role,subject,'',row,index):'';
  const candidateLocation=!word?'':role==='stay'?staying.map(w=>nearestPlace(w,places,quote)).filter(Boolean).filter((w,i,a)=>a.indexOf(w)===i).join('、'):nearestPlace(word,places,quote);
  const location=(rawRealm==='异境'&&!evidencedRealm||['天界','地界'].includes(evidencedRealm)&&candidateLocation!==subject)?'':candidateLocation;
  const realm=word?evidencedRealm||worldFor(role,subject,location,row,index):'';
  return {word,access:['私人','开放自然','公共','混合'].includes(access)?access:'',location,realm};
 });
}
function values(row,chapter,routes){
 const event=row.source_event||{},groupsValue=groups(row,chapter,routes),review=row.endpoint_review||event.endpoint_review||'';
 const evidence=typeof review==='object'?[review.quote,review.reason].filter(Boolean).join('；'):'';
 return [row.chapter_id+1,row.chapter,row.step,row.actors,...groupsValue.flatMap(g=>[g.word,g.access,g.location,g.realm]),row.space,({movement:'人物移动',plot:'情节转换',mention:'空间提及',scene:'场景标注'})[row.transition_kind]||'待核','仅列出本步骤引句中出现的原文词项；地点与三界按同句证据填写',(row.places||[]).join('、'),row.boundary_medium||'',row.narrative_role||'',row.quote,row.step_id,evidence||row.quote||''];
}
const api={headers,groups,values};if(typeof module!=='undefined')module.exports=api;else root.GhostPathColumns=api;
})(globalThis);
