'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),crypto=require('crypto');
const old=require('../reports/spatial-distinctiveness-results.json');
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
for(const [name,k] of [['five',5],['three',3],['six',6]]){
const r=require(`../reports/spatial-topics-${name}-results.json`);
test(`${k} topics: model provenance and complete vocabulary accounting`,()=>{
 assert.equal(r.source_sha256,crypto.createHash('sha256').update(fs.readFileSync(require.resolve('../data-package.json'))).digest('hex'));
 assert.equal(r.parameters.n_topics,k);assert.equal(r.parameters.min_word_length,1);
 assert.equal(r.input.total_chapters,r.input.nonempty_documents+r.input.empty_documents.length);
 assert.equal(r.word_classification.length,r.input.vocabulary_size);
 assert.equal(new Set(r.word_classification.map(w=>w.word)).size,r.input.vocabulary_size);
 assert.equal(r.word_classification.reduce((n,w)=>n+w.frequency,0),r.input.spatial_token_occurrences);
 assert.equal(r.chapter_topics.reduce((n,c)=>n+c.token_count,0),r.input.spatial_token_occurrences);
 assert.equal(r.input.unmatched_chapter_terms_excluded,old.unmatched_chapter_terms);
 assert.equal(new Set([...r.chapter_topics,...r.input.empty_documents].map(c=>c.id)).size,r.input.total_chapters);
});
test(`${k} topics: soft assignments and top-word probabilities are valid`,()=>{
 for(const w of r.word_classification){
  close(w.topic_probabilities.reduce((a,b)=>a+b,0),1);
  assert.equal(w.dominant_topic,w.topic_probabilities.indexOf(Math.max(...w.topic_probabilities))+1);
  assert.ok(w.frequency>=w.chapter_count);assert.ok(w.examples.length>0);
 }
 for(const c of r.chapter_topics){assert.equal(c.weights.length,k);close(c.weights.reduce((a,b)=>a+b,0),1);}
 const vocab=new Set(r.word_classification.map(w=>w.word));
 for(const t of r.topics){
  assert.equal(t.top_words.length,20);
  assert.ok(t.top_words.every(w=>vocab.has(w.word)&&w.probability>0&&w.probability<=1));
 }
 close(r.topics.reduce((n,t)=>n+t.token_assignment_share,0),1);
 for(const row of r.event_topic_comparison){
  assert.equal(row.documents+row.other_documents,r.input.nonempty_documents);
  close(row.mean_topic_weights.reduce((a,b)=>a+b,0),1);
  close(row.other_mean_topic_weights.reduce((a,b)=>a+b,0),1);
 }
});
test(`${k} topics: manual groups are compared after training using all available members`,()=>{
 const words=new Map(r.word_classification.map(w=>[w.word,w]));
 for(const c of r.manual_comparison){
  assert.deepEqual([...c.present_words,...c.absent_words].sort(),[...old.word_groups[c.manual_group]].sort());
  const expected=Array(k).fill(0);let total=0;
  for(const term of c.present_words){const w=words.get(term);total+=w.frequency;w.topic_probabilities.forEach((p,i)=>expected[i]+=w.frequency*p);}
  expected.forEach((n,i)=>close(n/total,c.frequency_weighted_topic_share[i]));
 }
 for(const s of r.seed_stability){
  assert.equal(new Set(s.topics.map(t=>t.matched_topic)).size,k);
  assert.ok(s.vocabulary_hard_label_agreement>=0&&s.vocabulary_hard_label_agreement<=1);
 }
});
}
test('three and five topics use identical document vocabulary and initial priors',()=>{
 const three=require('../reports/spatial-topics-three-results.json'),five=require('../reports/spatial-topics-five-results.json');
 assert.deepEqual(three.input,five.input);
 assert.deepEqual(three.word_classification.map(w=>[w.word,w.frequency,w.chapter_count]),five.word_classification.map(w=>[w.word,w.frequency,w.chapter_count]));
 assert.equal(three.parameters.alpha,50/5);
 assert.equal(three.parameters.beta,1/5);
 close(three.five_topic_comparison.three_mean_top20_jaccard,three.seed_stability.reduce((s,r)=>s+r.mean_top20_jaccard,0)/2);
});
test('six-topic comparison retains identical inputs and correctly summarizes each run',()=>{
 const six=require('../reports/spatial-topics-six-results.json');
 assert.equal(six.parameters.alpha,10);assert.equal(six.parameters.beta,.2);
 for(const row of six.topic_count_comparison){
  const name={3:'three',5:'five',6:'six'}[row.topics];
  const other=require(`../reports/spatial-topics-${name}-results.json`);
  assert.deepEqual(six.input,other.input);
  assert.deepEqual(six.word_classification.map(w=>[w.word,w.frequency]),other.word_classification.map(w=>[w.word,w.frequency]));
  close(row.mean_top20_jaccard,other.seed_stability.reduce((s,r)=>s+r.mean_top20_jaccard,0)/2);
  close(row.mean_hard_agreement,other.seed_stability.reduce((s,r)=>s+r.vocabulary_hard_label_agreement,0)/2);
 }
});
