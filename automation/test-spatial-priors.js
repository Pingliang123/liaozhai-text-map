'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),crypto=require('crypto');
const r=require('../reports/spatial-prior-sensitivity-results.json');
const old=require('../reports/spatial-topics-five-results.json');
const manual=require('../reports/spatial-distinctiveness-results.json').word_groups;
const close=(a,b)=>assert.ok(Number.isFinite(a)&&Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('all prior settings retain canonical inputs and the five-topic baseline',()=>{
 assert.equal(r.source_sha256,crypto.createHash('sha256').update(fs.readFileSync(require.resolve('../data-package.json'))).digest('hex'));
 assert.equal(r.baseline_reproduced,true);assert.equal(r.experiments.length,7);
 assert.equal(new Set(r.experiments.map(e=>e.id)).size,7);
 assert.equal(r.topics,5);assert.equal(r.iterations,200);assert.equal(r.burnin,10);
 for(const e of r.experiments){
  assert.deepEqual(e.runs.map(s=>s.seed),[42,7,123]);
  assert.deepEqual(e.reference_word_topics.map(w=>[w.word,w.frequency]),old.word_classification.map(w=>[w.word,w.frequency]));
  assert.equal(e.reference_word_topics.reduce((n,w)=>n+w.frequency,0),r.input.tokens);
 }
});
test('fixed versus estimated alpha settings and aggregate metrics are explicit',()=>{
 for(const e of r.experiments){
  assert.ok(e.alpha_initial_per_topic>0&&e.beta>0);
  close(e.mean_manual_ARI,e.runs.reduce((s,x)=>s+x.manual_agreement.ARI,0)/3);
  close(e.mean_manual_NMI,e.runs.reduce((s,x)=>s+x.manual_agreement.NMI,0)/3);
  close(e.mean_top20_jaccard,e.stability.reduce((s,x)=>s+x.top20_jaccard,0)/2);
  close(e.mean_hard_agreement,e.stability.reduce((s,x)=>s+x.hard_agreement,0)/2);
  for(const run of e.runs){
   assert.equal(run.final_alpha.length,5);assert.ok(run.final_alpha.every(a=>Number.isFinite(a)&&a>0));
   if(!e.estimate_alpha)run.final_alpha.forEach(a=>close(a,e.alpha_initial_per_topic));
   assert.equal(run.manual_agreement.memberships,40);
   assert.equal(run.top_words.length,5);
   assert.ok(run.top_words.every(t=>t.length===20));
  }
 }
});
test('reference word probabilities and manual-group weighted comparisons reconcile',()=>{
 for(const e of r.experiments){
  const words=new Map(e.reference_word_topics.map(w=>[w.word,w]));
  for(const w of words.values()){assert.equal(w.topic_probabilities.length,5);close(w.topic_probabilities.reduce((a,b)=>a+b,0),1);}
  for(const row of e.reference_group_distribution){
   const expected=Array(5).fill(0);let total=0;
   for(const term of manual[row.group])if(words.has(term)){
    const w=words.get(term);total+=w.frequency;
    w.topic_probabilities.forEach((p,i)=>expected[i]+=p*w.frequency);
   }
   expected.forEach((n,i)=>close(n/total,row.topic_shares[i]));
  }
 }
});
