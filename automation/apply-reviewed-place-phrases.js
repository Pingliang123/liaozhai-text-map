'use strict';
const fs=require('fs'),M=require('./ghost_map_model'),P=require('../assets/place-review');
function run(){
 const pack=JSON.parse(fs.readFileSync('data-package.json')),before=JSON.parse(fs.readFileSync('manual-revisions.json')),model=M.create(pack.base);model.importDocument(before);
 const old=new Map(before.overrides.map(r=>[r.chapter_id,r.changes])),report=[];
 for(const id of model.ids){const c=model.view(id),previous=old.get(id)||pack.base.chapter_overview.find(c=>c.chapter_id===id);const beforeWords=previous.places.map(p=>p.word),afterWords=c.places.map(p=>p.word);
  if(JSON.stringify([...beforeWords].sort())===JSON.stringify([...afterWords].sort()))continue;
  const repaired=P.alignPlaces(c),draft=model.editable(id);if(!repaired.held)draft.segmentation_note=repaired.note;
  // Import the proposed chapter to preserve reviewed classifications independently of token-derived guesses.
  const doc=model.document(),rows=doc.overrides.filter(r=>r.chapter_id!==id);rows.push({chapter_id:id,changes:draft});model.importDocument({...doc,overrides:rows});
  report.push({chapter_id:id,chapter:c.chapter,before:beforeWords,after:afterWords,spaces:c.space_words,source:c.source_units.filter(u=>beforeWords.some(w=>(u.text||u.original||'').includes(w)&&!afterWords.includes(w))).map(u=>u.text||u.original),segmentation_held:!!repaired.held});
 }
 fs.writeFileSync('manual-revisions.json',JSON.stringify(model.document()));fs.writeFileSync('reports/reviewed-place-phrases.json',JSON.stringify(report,null,2));console.log(JSON.stringify({chapters:report.length,removed_phrases:report.reduce((n,r)=>n+r.before.filter(w=>!r.after.includes(w)).length,0),held:report.filter(r=>r.segmentation_held).length}));
}
if(require.main===module)run();module.exports={run};
