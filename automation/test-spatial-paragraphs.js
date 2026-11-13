'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),crypto=require('crypto');
const old=require('../reports/spatial-distinctiveness-results.json');
const close=(a,b)=>assert.ok(Number.isFinite(a)&&Math.abs(a-b)<1e-8,`${a} != ${b}`);
const counter=words=>{const result={};for(const w of words)result[w]=(result[w]||0)+1;return result;};
for(const [name,k] of [['five',5],['three',3],['four',4],['ten',10]]){
const r=require(`../reports/spatial-paragraph-${name}-results.json`),baseline=require(`../reports/spatial-topics-${[4,10].includes(k)?'five':name}-results.json`);
test(`${k} paragraph topics: changes boundaries without replacing words or parameters`,()=>{
 assert.equal(r.source_sha256,crypto.createHash('sha256').update(fs.readFileSync(require.resolve('../data-package.json'))).digest('hex'));
 if(![4,10].includes(k))assert.deepEqual(r.parameters,baseline.parameters);
 else {assert.equal(r.parameters.n_topics,k);assert.equal(r.parameters.alpha,10);assert.equal(r.parameters.beta,.2);}
 assert.deepEqual(r.seeds,baseline.seeds);
 assert.equal(r.input.tokens,baseline.input.spatial_token_occurrences);assert.equal(r.input.vocabulary,baseline.input.vocabulary_size);
 assert.equal(r.input.chapters,baseline.input.nonempty_documents);
 const all=r.documents.flatMap(d=>d.spatial_tokens);
 assert.deepEqual(counter(all),Object.fromEntries(baseline.word_classification.map(w=>[w.word,w.frequency])));
 assert.equal(r.documents.length,r.input.documents);
 assert.equal(r.input.one_token_documents,r.documents.filter(d=>d.spatial_tokens.length===1).length);
 assert.equal(r.input.documents_under_10_tokens,r.documents.filter(d=>d.spatial_tokens.length<10).length);
});
test(`${k} paragraph topics: each chapter retains exactly its effective audited spatial tokens`,()=>{
 const p=require('../data-package.json'),M=require('./ghost_map_model'),R=require('../assets/spatial-routes'),m=M.create(p.base);m.importDocument(p.revisions);
 for(const id of m.ids){
  const c=m.view(id),allowed=new Set(c.space_words);
  if(Object.hasOwn(old.room_context_audit.excluded,c.chapter))allowed.delete('室');
  if(Object.hasOwn(old.hole_context_audit.excluded,c.chapter))allowed.delete('穴');
  const expected=R.tokenUnits(c,R.lexicon(c)).flat().filter(w=>allowed.has(w));
  const actual=r.documents.filter(d=>d.chapter_id===id).flatMap(d=>d.spatial_tokens);
  assert.deepEqual(counter(actual),counter(expected),c.chapter);
 }
});
test(`${k} paragraph topics: alignment and source-unit references remain traceable`,()=>{
 assert.equal(r.input.unresolved_documents,0);assert.equal(r.input.fallback_token_assignments,0);
 assert.ok(r.alignment_audit.every(a=>a.match_ratio===1));
 assert.equal(r.alignment_audit.reduce((n,a)=>n+a.spatial_tokens,0),r.input.tokens);
 assert.equal(new Set(r.documents.map(d=>`${d.chapter_id}:${d.line}`)).size,r.documents.length);
 assert.ok(r.documents.every(d=>d.line>0&&d.source_units.length&&d.mapping==='original-line'));
});
test(`${k} paragraph topics: probabilities and manual-group comparisons reconcile`,()=>{
 for(const d of r.documents){assert.equal(d.topic_weights.length,k);close(d.topic_weights.reduce((a,b)=>a+b,0),1);}
 const words=new Map(r.word_classification.map(w=>[w.word,w]));
 for(const w of words.values())close(w.topic_probabilities.reduce((a,b)=>a+b,0),1);
 for(const row of r.manual_comparison){
  const weights=Array(k).fill(0);let total=0;
  for(const term of old.word_groups[row.group])if(words.has(term)){
   const w=words.get(term);total+=w.frequency;w.topic_probabilities.forEach((p,i)=>weights[i]+=p*w.frequency);
  }
  weights.forEach((w,i)=>close(w/total,row.topic_shares[i]));
 }
 for(const run of r.seed_stability){assert.equal(new Set(run.topics.map(t=>t.matched_topic)).size,k);assert.ok(run.mean_top20_jaccard>=0&&run.mean_top20_jaccard<=1);}
});
}
test('three and five paragraph topics retain exactly the same paragraph token sequences',()=>{
 const three=require('../reports/spatial-paragraph-three-results.json'),five=require('../reports/spatial-paragraph-five-results.json');
 assert.deepEqual(three.input,five.input);
 assert.deepEqual(three.documents.map(d=>[d.chapter_id,d.line,d.spatial_tokens]),five.documents.map(d=>[d.chapter_id,d.line,d.spatial_tokens]));
 close(three.paragraph_five_comparison.three_mean_top20_jaccard,three.seed_stability.reduce((a,b)=>a+b.mean_top20_jaccard,0)/2);
 close(three.paragraph_five_comparison.five_mean_top20_jaccard,five.seed_stability.reduce((a,b)=>a+b.mean_top20_jaccard,0)/2);
});
