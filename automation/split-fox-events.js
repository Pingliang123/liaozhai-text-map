'use strict';
// Explicit chapter review, not an automatic match on the character 狐.
const excluded={48:'狐魂为悼亡称谓，未证狐参与事件',51:'毒狐药是药物名',81:'非鬼必狐为人物猜测',100:'群疑其狐，后见小人而未确认狐身',134:'鬼火狐鸣为墓地环境描写',212:'狐媚为比喻',258:'狐子为称呼，未确认狐身份',282:'良工明确说此非狐也',360:'女自称真仙人，狐为老媪先前猜测',392:'狐狸于地下为斥责鬼物的比拟',405:'北之有狐为比较，不是本事五通的身份'};
const keepMonster=new Set([195,281]);
function apply(){const fs=require('fs'),M=require('./ghost_map_model'),doc=require('../manual-revisions.json'),pack=require('../data-package.json'),m=M.create(pack.base);m.importDocument(doc);const rows=[],skipped=[];
 for(const id of m.ids){const c=m.view(id),source=c.source_units.map(u=>u.text).join('');if(!c.event_types.妖||!source.includes('狐'))continue;
  if(excluded[id]){skipped.push({id,title:c.chapter,reason:excluded[id]});continue;}
  const entry=doc.overrides.find(r=>r.chapter_id===id),before={...entry.changes.event_types},after={...before,狐:1};if(!keepMonster.has(id))delete after.妖;
  const ordered=Object.fromEntries(M.EVENTS.filter(t=>after[t]).map(t=>[t,1]));entry.changes.event_types=ordered;rows.push({id,title:c.chapter,before,after:ordered,evidence:c.source_units.filter(u=>u.text.includes('狐')).map(u=>u.text),note:keepMonster.has(id)?'狐参与，同时保留其他妖异／身份歧义的妖标记':'狐从原妖类中分出，其他类别保留'});
 }
 fs.writeFileSync('manual-revisions.json',JSON.stringify(doc));fs.writeFileSync('reports/fox-event-split-20261029.json',JSON.stringify({policy:'狐单列；妖为其他妖怪。人物身份体系与所有词汇、分词、空间及路径不改。',changed:rows.length,rows,excluded:skipped},null,2));fs.writeFileSync('reports/fox-event-split-20261029.md','# 狐类拆分\n\n狐从异事类型的妖中单列；人物身份未改。其他类型保留，疑称、比喻、药名不据字面归类。\n\n|篇目|原类型|新类型|\n|---|---|---|\n'+rows.map(r=>'|'+r.title+'|'+Object.keys(r.before).join('、')+'|'+Object.keys(r.after).join('、')+'|').join('\n')+'\n\n## 未据狐字改类\n\n'+skipped.map(r=>'- 《'+r.title+'》：'+r.reason).join('\n')+'\n');console.log('Split fox events in '+rows.length+' chapters; skipped '+skipped.length);
}
if(require.main===module)apply();module.exports={excluded,keepMonster};
