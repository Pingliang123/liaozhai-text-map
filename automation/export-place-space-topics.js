'use strict';
const fs=require('node:fs'),crypto=require('node:crypto'),M=require('./ghost_map_model'),R=require('../assets/spatial-routes');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
function selectChapter(c,stop,drops){
 const spaces=new Set(c.space_words||[]),places=new Set((c.places||[]).map(p=>typeof p==='string'?p:p.word));
 for(const w of drops)spaces.delete(w);
 const source=R.tokenUnits(c,R.lexicon(c)).flat().filter(w=>typeof w==='string'&&/^\p{Script=Han}+$/u.test(w)&&!stop.has(w));
 const tokens=source.filter(w=>spaces.has(w)||places.has(w));
 return {id:c.chapter_id,title:c.chapter,events:Object.keys(c.event_types||{}).filter(k=>c.event_types[k]),tokens,
 full_word_count:source.length,place_words:[...new Set(tokens.filter(w=>places.has(w)))],space_words:[...new Set(tokens.filter(w=>spaces.has(w)))],
 both_categories:[...new Set(tokens.filter(w=>places.has(w)&&spaces.has(w)))],context_excluded:[...drops],
 place_token_count:tokens.filter(w=>places.has(w)).length,space_token_count:tokens.filter(w=>spaces.has(w)).length,
 both_token_count:tokens.filter(w=>places.has(w)&&spaces.has(w)).length};
}
function main(){
 const bytes=fs.readFileSync('data-package.json'),p=JSON.parse(bytes),m=M.create(p.base);m.importDocument(p.revisions);
 const stopBytes=fs.readFileSync('automation/topic-stopwords.txt'),stop=new Set(stopBytes.toString('utf8').split(/\r?\n/).filter(s=>!s.trim().startsWith('#')).join(' ').split(/\s+/).filter(Boolean));
 const audit=JSON.parse(fs.readFileSync('reports/spatial-distinctiveness-results.json','utf8'));
 if(audit.source_sha256!==hash(bytes))throw Error('语义核查报告与当前资料指纹不一致');
 const chapters=p.base.chapter_overview.map(row=>{
  const c=m.view(row.chapter_id??row.id),drops=new Set();
  for(const[w,key]of [['室','room_context_audit'],['穴','hole_context_audit']])if(Object.hasOwn(audit[key].excluded,c.chapter))drops.add(w);
  return selectChapter(c,stop,drops);
 });
 const counts={chapters:chapters.length,nonempty:chapters.filter(c=>c.tokens.length).length,tokens:chapters.reduce((s,c)=>s+c.tokens.length,0),word_types:new Set(chapters.flatMap(c=>c.tokens)).size,
 place_tokens:chapters.reduce((s,c)=>s+c.place_token_count,0),space_tokens:chapters.reduce((s,c)=>s+c.space_token_count,0),overlap_tokens:chapters.reduce((s,c)=>s+c.both_token_count,0)};
 const out={source_sha256:hash(bytes),stopwords_sha256:hash(stopBytes),semantic_audit_sha256:hash(fs.readFileSync('reports/spatial-distinctiveness-results.json')),stopwords:[...stop],chapters,counts,
 policy:'Union of saved place and spatial annotations, exact matches to effective source segmentation; each token counted once even if both categories. Retain original written forms, no inferred terms or geocoding. Reuse documented chapter-level 室/穴 exclusions. Length control uses full cleaned chapter tokens, not only selected spatial tokens.'};
 fs.mkdirSync('.network-runtime',{recursive:true});fs.writeFileSync('.network-runtime/place-space-topic-input.json',JSON.stringify(out));console.log(JSON.stringify(counts));
}
if(require.main===module)main();module.exports={selectChapter};
