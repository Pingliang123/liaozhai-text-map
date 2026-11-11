(function(root){'use strict';
const headers=['篇号','篇名','步骤','人物',...['出发','到达','停留'].flatMap(p=>[p+'空间',p+'使用方式',p+'空间所在地點',p+'世界分类']),'场景','步骤类型','分类依据','参考地点','边界／媒介','空间叙事功能','原文','稳定步骤标识','双端证据'];
function groups(row,chapter,routes){
 const lex=routes.lexicon(chapter),quote=String(row.quote||'');
 const valid=w=>w&&lex.words.has(w)&&quote.includes(w)?w:'';
 const place=w=>valid(w)&&chapter.places.some(p=>p.word===w)?w:'';
 const event=row.source_event||{},review=row.endpoint_review||{};
 return ['from','to','stay'].map(role=>{
  const staying=role==='stay',moving=row.has_movement;
  const raw=staying?(!moving?row.space:''):moving?row[role+'_space']:'';
  const word=valid(raw),prefix=role==='from'?'from':role==='to'?'to':'stay';
  const location=word?place(event[prefix+'_location']||''):'';
  const realmValue=event[prefix+'_realm']||review[prefix+'_realm']||'';
  const realm=word&&['天界','地界','人间'].includes(realmValue)?realmValue:'';
  const access=word?(role==='from'?row.from_access:row.classification?.access)||'':'';
  return {word,access:access==='待核'?'':access,location,realm};
 });
}
function values(row,chapter,routes){const fields=groups(row,chapter,routes).flatMap(g=>[g.word,g.access,g.location,g.realm]);return [row.chapter_id+1,row.chapter,row.step,row.actors,...fields,row.space,({movement:'人物移动',plot:'情节转换',mention:'空间提及',scene:'场景标注'})[row.transition_kind]||'待核','仅采用原文完整分词；所在地及三界未有逐端证据者留空',(row.places||[]).join('、'),row.boundary_medium||'',row.narrative_role||'',row.quote,row.step_id,row.endpoint_review?.reason||''];}
const api={headers,groups,values};if(typeof module!=='undefined')module.exports=api;else root.GhostPathColumns=api;
})(globalThis);
