'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),zlib=require('zlib'),crypto=require('crypto');
const r=require('../reports/tutorial-long-line-five-results.json');
const words=JSON.parse(zlib.gunzipSync(fs.readFileSync(require.resolve('../reports/tutorial-long-line-word-topics.json.gz')))).words;
const close=(a,b)=>assert.ok(Number.isFinite(a)&&Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('literal tutorial settings and exclusions are explicit and bound to canonical chapter mapping',()=>{
 assert.equal(r.package_sha256,crypto.createHash('sha256').update(fs.readFileSync(require.resolve('../data-package.json'))).digest('hex'));
 assert.equal(r.parameters.n_topics,5);assert.equal(r.parameters.iterations,200);assert.equal(r.parameters.burnin,10);
 assert.equal(r.parameters.min_word_length,2);assert.equal(r.parameters.max_vocab_size,50000);
 assert.equal(r.parameters.log_interval,5);assert.equal(r.executed_log_interval,null);
 assert.equal(r.python_hash_seed,42);assert.deepEqual(r.seeds,[42,7,123]);
 assert.equal(r.documents.length,r.counts.training_documents);
 assert.equal(r.counts.long_lines_selected,r.documents.length+r.excluded_after_line_filter.length);
 assert.ok(r.documents.every(d=>d.source_characters>150&&d.clean_token_count>10&&d.model_token_count>0));
 assert.equal(r.documents.reduce((n,d)=>n+d.model_token_count,0),r.counts.training_tokens);
 assert.equal(r.documents.reduce((n,d)=>n+d.source_characters,0),r.counts.training_line_characters);
});
test('chapter coverage includes excluded stories rather than silently claiming full coverage',()=>{
 const ids=new Set(r.documents.map(d=>d.chapter_id));assert.ok(!ids.has(null));
 assert.equal(ids.size,r.counts.covered_chapters);
 assert.equal(ids.size+r.missing_chapters.length,491);
 assert.ok(r.missing_chapters.every(c=>!ids.has(c.id)));
 assert.equal(new Set(r.documents.map(d=>d.line)).size,r.documents.length);
 assert.equal(r.documents.filter(d=>d.editorial_marker).length,r.counts.editorial_marked_training_documents);
 assert.equal(r.documents.filter(d=>d.author_comment).length,r.counts.author_comment_training_documents);
});
test('capped full vocabulary, topic probabilities and total word counts reconcile',()=>{
 assert.equal(words.length,r.counts.vocabulary);assert.equal(new Set(words.map(w=>w.word)).size,words.length);
 assert.equal(r.counts.vocabulary_before_cap-r.counts.word_types_removed_by_cap,words.length);
 assert.equal(words.reduce((n,w)=>n+w.frequency,0),r.counts.training_tokens);
 for(const w of words){assert.ok(/^[\u4e00-\u9fff]{2,}$/.test(w.word));assert.equal(w.topic_probabilities.length,5);close(w.topic_probabilities.reduce((a,b)=>a+b,0),1);}
 for(const d of r.documents)close(d.topic_weights.reduce((a,b)=>a+b,0),1);
 const vocab=new Set(words.map(w=>w.word));
 for(const t of r.topics){assert.equal(t.top_words.length,20);assert.ok(t.top_words.every(w=>vocab.has(w.word)&&w.probability>0));}
 close(r.topics.reduce((s,t)=>s+t.token_assignment_share,0),1);
 for(const run of r.seed_stability){assert.equal(new Set(run.topics.map(t=>t.matched_topic)).size,5);assert.ok(run.mean_top20_jaccard>=0&&run.mean_top20_jaccard<=1);}
});
