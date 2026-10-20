'use strict';
const fs=require('fs'),cp=require('child_process');
const prior=JSON.parse(cp.execFileSync('git',['show','e3e2ad5:manual-revisions.json'],{maxBuffer:50000000})),current=JSON.parse(fs.readFileSync('manual-revisions.json'));
const latest=new Map(current.overrides.map(r=>[r.chapter_id,r])),restored=prior.overrides.filter(r=>!latest.has(r.chapter_id));
current.overrides=[...restored,...current.overrides].sort((a,b)=>a.chapter_id-b.chapter_id);
const locations=new Map(prior.place_locations.map(r=>[r.name,r]));for(const r of current.place_locations)locations.set(r.name,r);current.place_locations=[...locations.values()];
fs.writeFileSync('manual-revisions.json',JSON.stringify(current));
fs.writeFileSync('reports/recovered-omitted-revisions-20261020.json',JSON.stringify({source:'e3e2ad5',newest:'49a3296',restored_ids:restored.map(r=>r.chapter_id),policy:'保留最新提交中全部篇目；仅恢复未包含的旧篇目，不用旧值替换新记录。'},null,2)+'\n');
console.log('Recovered omitted chapters:',restored.length);
