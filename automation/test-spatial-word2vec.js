const assert=require('node:assert/strict'),fs=require('fs'),crypto=require('crypto');
const d=require('../reports/空間詞_Word2Vec結果.json'),input=require('../.network-runtime/embedding-input.json'),rows=new Map(d.rows.map(r=>[r.word,r]));
assert.equal(d.source_sha256,input.source_sha256);assert.equal(rows.size,189);
const freq=new Map();for(const s of input.sentences)for(const w of s)freq.set(w,(freq.get(w)||0)+1);
assert.equal([...freq.values()].reduce((a,b)=>a+b,0),d.training_tokens);
for(const r of rows.values()){
 assert(r.spatial_frequency>=5&&r.chapter_count>=3&&freq.get(r.word)>=5);
 assert.equal(freq.get(r.word),r.training_frequency);
 assert.equal(r.spatial_neighbors.length,10);
 for(let i=0;i<10;i++){
  const n=r.spatial_neighbors[i];assert(rows.has(n.word)&&n.word!==r.word);assert(n.cosine>=-1.000001&&n.cosine<=1.000001);
  if(i)assert(r.spatial_neighbors[i-1].cosine>=n.cosine);
  const back=rows.get(n.word).spatial_neighbors.find(x=>x.word===r.word);
  if(back)assert(Math.abs(back.cosine-n.cosine)<1e-5);
 }
 assert(r.stability.seed_top10_jaccard>=0&&r.stability.seed_top10_jaccard<=1);
 assert(r.evidence.length);for(const e of r.evidence)assert(e.quote.includes(r.word));
}
const html=fs.readFileSync('reports/空間詞_Word2Vec互動查詢.html','utf8');new Function(html.match(/<script>([\s\S]*?)<\/script>/)[1]);
console.log('PASS source, full training counts, all 189 spatial targets, neighbor ranks and reciprocal cosine, evidence and interactive-script syntax');
