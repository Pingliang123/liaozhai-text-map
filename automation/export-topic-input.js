const fs=require('fs'),crypto=require('crypto'),M=require('./ghost_map_model');
function build(){
 const p=JSON.parse(fs.readFileSync('data-package.json')),m=M.create(p.base),Routes=require('../assets/spatial-routes');m.importDocument(JSON.parse(fs.readFileSync('manual-revisions.json')));
 return {revision_hash:crypto.createHash('sha256').update(fs.readFileSync('manual-revisions.json')).digest('hex'),source_hash:p.base.source_sha256,documents:m.ids.map(id=>{const c=m.view(id),lex=Routes.lexicon(c);return {id,title:c.chapter,places:[...new Set(c.places.filter(p=>lex.words.has(p.word)).map(p=>m.placeName(p.word)))],text:c.source_units.map(u=>u.text||u.original||'').join('\n'),tokens:Routes.tokenUnits(c,lex).flat().filter(Boolean)};}),places:m.places().map(p=>({id:p.id,name:p.name,lat:p.lat,lon:p.lon,chapter_ids:m.atPlace(p).map(c=>c.chapter_id),aggregate_ids:m.atPlace(p,true).map(c=>c.chapter_id)}))};
}
if(require.main===module)fs.writeFileSync(process.argv[2]||'topic-input.json',JSON.stringify(build()));module.exports={build};
