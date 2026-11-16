'use strict';
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const source=JSON.parse(fs.readFileSync('reports/event-types-csv-source.json','utf8'));
const bundle=JSON.parse(fs.readFileSync('data-package.json','utf8'));
const decisions=JSON.parse(fs.readFileSync('reports/multitype-decisions.json','utf8'));
const retained=JSON.parse(fs.readFileSync('reports/multitype-retained.json','utf8'));
const originalBundle=structuredClone(bundle);
const TYPES=['人','鬼','狐','妖','神'],split=s=>s.split(/[／/、]/).filter(Boolean);
const overrides=new Map(bundle.revisions.overrides.map(r=>[r.chapter_id,r]));
const lookup=new Map([...decisions.map(r=>({...r,status:'修正'})),...retained].map(r=>[r.chapter_id,r]));
assert.equal(lookup.size,decisions.length+retained.length);
const audit=[],websiteChanges=[];
for(const row of source){
 const id=Number(row['篇号'])-1,base=bundle.base.chapter_overview.find(c=>c.chapter_id===id);
 assert(base,'篇号不存在 '+id);
 const saved=overrides.get(id),c={...base,...saved?.changes};
 const text=c.source_units.map(u=>u.text||u.original||'').join('');
 const old=split(row['异事类型']),decision=lookup.get(id);
 let types=old;
 if(old.length>1){
  if(old.length===2&&old.includes('鬼')&&old.includes('狐')){
   assert(!decision,'不得修改已核查鬼／狐');
   audit.push({chapter_id:id,title:row['篇名'],before:old,after:old,status:'用户已核查，保留',quote:'',reason:'按你的要求保留鬼／狐。'});
  }else{
   assert(decision,'缺少逐项核查 '+row['篇名']);
   const at=text.indexOf(decision.anchor);
   assert(at>=0,'引句不存在 '+id+' '+decision.anchor);
   if(decision.types)types=decision.types;
   if(old.includes('鬼')&&old.includes('狐'))assert(types.includes('鬼')&&types.includes('狐'),'保留已核查鬼狐标签');
   audit.push({chapter_id:id,title:row['篇名'],before:old,after:types,status:decision.status,quote:text.slice(Math.max(0,at-32),Math.min(text.length,at+decision.anchor.length+70)),reason:decision.reason});
  }
 }
 assert(types.every(t=>TYPES.includes(t)));
 const current=TYPES.filter(t=>c.event_types?.[t]>0);
 if(JSON.stringify(current)!==JSON.stringify(types)){
  websiteChanges.push({chapter_id:id,title:row['篇名'],before:current,after:types});
  overrides.set(id,{...(saved||{chapter_id:id}),changes:{...(saved?.changes||{}),event_types:Object.fromEntries(types.map(t=>[t,1]))}});
 }
 row['异事类型']=types.join('／');
}
assert.equal(source.length,491);
bundle.revisions={...bundle.revisions,overrides:[...overrides.values()].sort((a,b)=>a.chapter_id-b.chapter_id)};
fs.writeFileSync('data-package.json',JSON.stringify(bundle));
fs.writeFileSync('manual-revisions.json',JSON.stringify(bundle.revisions));
const csv=v=>'"'+String(v).replaceAll('"','""')+'"';
fs.writeFileSync('reports/聊斋异事类型_核查修订.csv','\ufeff'+[['篇号','篇名','异事类型','地点'],...source.map(r=>Object.values(r))].map(r=>r.map(csv).join(',')).join('\r\n'));
for(const row of originalBundle.revisions.overrides)delete row.changes.event_types;
const report={non_type_sha256:crypto.createHash('sha256').update(JSON.stringify(originalBundle)).digest('hex'),source:'聊斋异事类型 (4).csv',total:491,multi:audit.length,changed:audit.filter(r=>r.status==='修正').length,uncertain:audit.filter(r=>r.status==='存疑').length,rows:audit,website_changes:websiteChanges};
fs.writeFileSync('reports/multitype-review.json',JSON.stringify(report,null,2));
const lines=['# 多类型篇目核查','', '以用户提供 CSV 为准。未涉及多类型的篇目按 CSV 保存。鬼／狐及三类以上组合中的既有鬼、狐标签均保留。','', '分类按实际身份及事件判断。妖梦、妖容、貌类神仙等修辞不单独作为类型证据。存疑项保留原值。','', '| 篇号 | 篇名 | CSV 原分类 | 修订分类 | 结果 | 依据与原文 |','| --- | --- | --- | --- | --- | --- |',...audit.map(r=>'| '+[r.chapter_id+1,r.title,r.before.join('／'),r.after.join('／'),r.status,r.reason+' '+r.quote].map(s=>String(s).replaceAll('|','／').replaceAll('\n',' ')).join(' | ')+' |')];
fs.writeFileSync('reports/多类型篇目核查.md',lines.join('\n'));
console.log({multi:report.multi,changed:report.changed,uncertain:report.uncertain,websiteChanges:websiteChanges.length});
