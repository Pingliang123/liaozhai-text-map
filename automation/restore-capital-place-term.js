'use strict';
const fs=require('fs'),M=require('./ghost_map_model');
function run(){const p=JSON.parse(fs.readFileSync('data-package.json')),m=M.create(p.base);m.importDocument(JSON.parse(fs.readFileSync('manual-revisions.json')));const changed=[];
 for(const id of m.ids){const c=m.view(id),d=m.editable(id);if(!(d.space_words||[]).includes('都'))continue;
  d.space_words=d.space_words.filter(w=>w!=='都');
  if(!(d.places||[]).some(x=>x.word==='都'))d.places=[...(d.places||[]),{word:'都',mentions:0}];
  d.lexical_reviews={...(d.lexical_reviews||{}),['spaces:都']:{status:'corrected',word:'都',kind:'places',note:'按原文语境恢复为地点词：都可指京城、都城或赴都的目的地。'}};
  m.save(id,d);changed.push({chapter_id:id,chapter:c.chapter,word:'都'});
 }
 const report={checked_chapters:m.ids.length,restored:changed,reason:'都在原文中可作京城、都城或赴都的地点词。'};
 fs.writeFileSync('manual-revisions.json',JSON.stringify(m.document()));fs.writeFileSync('reports/restore-capital-place-term.json',JSON.stringify(report,null,2));console.log(JSON.stringify({restored:changed.length}));}
if(require.main===module)run();
