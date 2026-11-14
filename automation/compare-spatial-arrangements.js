'use strict';
// Read-only comparison. No inferred transitions and no changes to saved annotations.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const R=require('../assets/spatial-routes');
const root=path.resolve(__dirname,'..');
const compact=s=>String(s||'').replace(/\s/gu,'');
function jaccard(a,b){const A=new Set(a),B=new Set(b),u=new Set([...A,...B]);return u.size?[...A].filter(x=>B.has(x)).length/u.size:0;}
function graphMetrics(edges){
 const nodes=new Set(edges.flatMap(e=>[e.from,e.to]));
 const keys=new Set(edges.map(e=>JSON.stringify([e.from,e.to])));
 let reverse=0;for(const key of keys){const[a,b]=JSON.parse(key);if(a!==b&&keys.has(JSON.stringify([b,a])))reverse++;}
 const indeg=new Map(),outdeg=new Map();for(const key of keys){const[a,b]=JSON.parse(key);indeg.set(b,(indeg.get(b)||0)+1);outdeg.set(a,(outdeg.get(a)||0)+1);}
 return {nodes:nodes.size,edges:keys.size,reciprocal_fraction:keys.size?reverse/keys.size:0,
  sink_fraction:nodes.size?[...nodes].filter(n=>!outdeg.has(n)).length/nodes.size:0,
  branch_fraction:nodes.size?[...nodes].filter(n=>(outdeg.get(n)||0)>1).length/nodes.size:0,
  self_fraction:edges.length?edges.filter(e=>e.from===e.to).length/edges.length:0};
}
function structuralDistance(a,b){const fields=['reciprocal_fraction','sink_fraction','branch_fraction','self_fraction'];return fields.reduce((s,k)=>s+Math.abs(a[k]-b[k]),0)/fields.length;}
function cooccurrenceMetrics(words,edges){
 const adj=new Map(words.map(w=>[w,new Set()]));for(const[a,b]of edges){adj.get(a).add(b);adj.get(b).add(a);}
 let largest=0,triangles=0,triples=0;const seen=new Set();
 for(const w of words){const neighbors=[...adj.get(w)];triples+=neighbors.length*(neighbors.length-1)/2;
  for(let i=0;i<neighbors.length;i++)for(let j=i+1;j<neighbors.length;j++)if(adj.get(neighbors[i]).has(neighbors[j]))triangles++;
  if(seen.has(w))continue;const stack=[w];seen.add(w);let size=0;
  while(stack.length){size++;for(const next of adj.get(stack.pop()))if(!seen.has(next)){seen.add(next);stack.push(next);}}largest=Math.max(largest,size);
 }
 return {density:words.length>1?2*edges.length/(words.length*(words.length-1)):0,
  largest_component_fraction:words.length?largest/words.length:0,
  transitivity:triples?triangles/triples:0,
  maximum_degree_fraction:words.length>1?Math.max(...[...adj.values()].map(s=>s.size))/(words.length-1):0};
}
function coDistance(a,b){return Object.keys(a).reduce((s,k)=>s+Math.abs(a[k]-b[k]),0)/Object.keys(a).length;}
function analyzeChapter(c){
 const units=c.source_units||[],tokens=R.tokenUnits(c,R.lexicon(c)),lex=R.lexicon(c);
 const spaceSet=new Set(c.space_words||[]),words=[...new Set(tokens.flat().filter(w=>spaceSet.has(w)))];
 const source=compact(units.map(u=>u.text||u.original||'').join(''));
 const allowed=new Set([...words,...(c.places||[]).map(p=>typeof p==='string'?p:p.word)].filter(w=>lex.words.has(w)));
 const co=new Map();
 for(let i=0;i<units.length;i++){
  const local=[...new Set((tokens[i]||[]).filter(w=>spaceSet.has(w)))].sort();
  for(let a=0;a<local.length;a++)for(let b=a+1;b<local.length;b++){
   const key=JSON.stringify([local[a],local[b]]);if(!co.has(key))co.set(key,{from:local[a],to:local[b],evidence:[]});
   co.get(key).evidence.push({unit:units[i].unit,quote:units[i].text||units[i].original||''});
  }
 }
 const edges=[],rejected=[];
 for(const row of R.normalize(c.narrative_events||[])){
  if((row.transition_kind??row.kind)!=='movement')continue;
  const from=row.from_space??row.from??'',to=row.to_space??row.to??'',quote=row.quote||'';
  let reason='';
  if(!compact(quote)||!source.includes(compact(quote)))reason='引句未与全文对齐';
  else if(!allowed.has(from)||!allowed.has(to))reason='端点不是已标注且分词独立出现的原词';
  if(reason){rejected.push({index:row.index,from,to,quote,reason});continue;}
  edges.push({index:row.index,unit:row.unit,from,to,actors:row.actors||'',quote});
 }
 return {id:c.chapter_id,title:c.chapter,characters:[...source].length,space_words:words,
  annotated_spaces:spaceSet.size,events:Object.keys(c.event_types||{}).filter(k=>c.event_types[k]),
  cooccurrence_edges:[...co.values()],co_metrics:cooccurrenceMetrics(words,[...co.values()].map(e=>[e.from,e.to])),
  movement_records:edges.length,rejected_records:rejected.length,metrics:graphMetrics(edges),edges,rejected};
}
function main(){
 const bytes=fs.readFileSync(path.join(root,'data-package.json')),p=JSON.parse(bytes),m=require('./ghost_map_model').create(p.base);m.importDocument(p.revisions);
 const chapters=p.base.chapter_overview.map(x=>analyzeChapter(m.view(x.chapter_id??x.id)));
 const pairs=[];
 for(let i=0;i<chapters.length;i++)for(let j=i+1;j<chapters.length;j++){
  const a=chapters[i],b=chapters[j];
  if(Math.min(a.space_words.length,b.space_words.length)<4||Math.min(a.cooccurrence_edges.length,b.cooccurrence_edges.length)<3)continue;
  const lengthRatio=Math.max(a.characters,b.characters)/Math.max(1,Math.min(a.characters,b.characters));
  if(lengthRatio>2)continue;
  const similarity=jaccard(a.space_words,b.space_words);if(similarity<.15)continue;
  const distance=coDistance(a.co_metrics,b.co_metrics);
  pairs.push({a:a.id,b:b.id,titles:[a.title,b.title],vocabulary_similarity:similarity,structural_distance:distance,length_ratio:lengthRatio,
   shared_words:a.space_words.filter(w=>b.space_words.includes(w)),score:similarity*distance});
 }
 pairs.sort((a,b)=>b.score-a.score||b.vocabulary_similarity-a.vocabulary_similarity||a.a-b.a||a.b-b.b);
 const result={source_sha256:crypto.createHash('sha256').update(bytes).digest('hex'),
  method:'Exact token-aligned annotated spatial vocabulary; undirected same-source-unit cooccurrence. Structural distance is mean absolute difference of density, largest component fraction, transitivity, normalized maximum degree. Saved directed movements are independently audited, not used in pair ranking. Not a significance test.',
  thresholds:{min_unique_spaces:4,min_cooccurrence_edges:3,max_length_ratio:2,min_jaccard:.15},
  sensitivity:{pairs_at_jaccard_03:pairs.filter(v=>v.vocabulary_similarity>=.3).length,pairs_at_jaccard_015:pairs.length},
  limitations:['词项未做语义归并；没有补造端点。未沿用旧主题实验对个别室、穴词项的语境排除，本轮词项仍须核查。','共现依据原始文本单元，不是段落或整篇；单元划分与标注疏漏均会影响结构。','图结构是保存步骤的并集，不表示同一人物连续行程。双向边不等于人物往返。','所筛选的是候选比较篇目，不是审美创新排名。未运行随机对照，不能据此宣称统计显著。','保存路径的疏漏会影响结构差异；空白与未通过检查不代表原文没有空间。'],chapters,pairs};
 fs.writeFileSync(path.join(root,'reports/spatial-arrangements-comparison.json'),JSON.stringify(result,null,2));
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const byId=new Map(chapters.map(c=>[c.id,c]));
 const detail=c=>`<section><h3>《${esc(c.title)}》</h3><p>${c.characters}字 · ${c.space_words.length}个空间词 · ${c.cooccurrence_edges.length}组共现 · ${c.movement_records}条有效移动</p><p>${c.space_words.map(esc).join('、')}</p><p>密度 ${c.co_metrics.density.toFixed(2)}；最大连通部分 ${c.co_metrics.largest_component_fraction.toFixed(2)}；传递性 ${c.co_metrics.transitivity.toFixed(2)}；最大度占比 ${c.co_metrics.maximum_degree_fraction.toFixed(2)}</p><table><tr><th>共现空间</th><th>原文（首条证据）</th></tr>${c.cooccurrence_edges.map(e=>`<tr><td>${esc(e.from)} — ${esc(e.to)}</td><td>${esc(e.evidence[0].quote)}</td></tr>`).join('')}</table></section>`;
 const rows=pairs.slice(0,30).map((v,i)=>`<details><summary>${i+1}. 《${esc(v.titles[0])}》／《${esc(v.titles[1])}》　用词相似 ${v.vocabulary_similarity.toFixed(2)} · 结构差异 ${v.structural_distance.toFixed(2)}</summary><p>共有空间：${v.shared_words.map(esc).join('、')}</p><div class="columns">${detail(byId.get(v.a))}${detail(byId.get(v.b))}</div></details>`).join('');
 const html=`<!doctype html><html lang="zh"><meta charset="utf-8"><title>每篇各具局面？空间比较实验</title><style>body{font:16px/1.7 system-ui;margin:30px auto;padding:0 24px;max-width:1400px;background:#faf9f5;color:#263535}h1{font-size:28px}details{background:white;border:1px solid #ccd7d5;padding:16px;margin:12px 0}summary{cursor:pointer;font-weight:bold}.columns{display:grid;grid-template-columns:1fr 1fr;gap:24px}table{border-collapse:collapse;width:100%;font-size:14px}td,th{border-bottom:1px solid #ddd;padding:6px;text-align:left;vertical-align:top}@media(max-width:800px){.columns{grid-template-columns:1fr}}svg{width:100%;max-height:340px}small{color:#526563}</style><h1>「每篇各具局面」：空间比较实验</h1><p>比较空间词相近、单元共现结构不同的篇目（共现不等于移动）。点击条目查看两篇原文证据。此实验不修改网站数据。</p><p>${chapters.length}篇；${chapters.filter(c=>c.movement_records>=3).length}篇有至少3条通过检查的移动；${pairs.length}组满足比较条件。</p><p>词汇相似度＝共有词／合计不重复词。结构差异＝图密度、最大连通部分占比、传递性、最大度占比之差的平均值。两者均为0—1。</p><p>仅保留各有至少4个空间词、3组共现关系、篇幅不超过2倍、词汇相似度至少0.15的篇目对；按相似度×结构差异排列。</p><svg viewBox="0 0 1000 330" role="img" aria-label="每个圆点代表一对篇目，横轴词汇相似度，纵轴结构差异"><path d="M65 20V280H950" fill="none" stroke="#999"/>${pairs.map(v=>`<circle cx="${65+v.vocabulary_similarity*850}" cy="${280-v.structural_distance*240}" r="4" fill="#397d9a" opacity=".65"><title>${esc(v.titles.join('／'))}；相似${v.vocabulary_similarity.toFixed(2)}，差异${v.structural_distance.toFixed(2)}</title></circle>`).join('')}<text x="390" y="320">空间词相似度（0—1）→</text><text x="5" y="15">结构差异（0—1）↑</text><text x="65" y="300">0</text><text x="915" y="300">1</text></svg><p>相似度门槛0.30时无符合条件的篇目对，降至0.15作探索；不得将这些候选称为高度相似。</p><h2>候选比较篇目（前30组）</h2>${rows||'<p>没有符合当前门槛的篇目对；未放宽标准制造结果。</p>'}<h2>限制</h2><ul>${result.limitations.map(s=>`<li>${esc(s)}</li>`).join('')}</ul><p>完整结果包括各篇纳入与排除的步骤，见同目录 spatial-arrangements-comparison.json。</p></html>`;
 fs.writeFileSync(path.join(root,'reports/篇目空間組構比較.html'),html);
 const lines=['# 「每篇各具局面」：第一轮空间比较','',
  `检查${chapters.length}篇。${chapters.filter(c=>c.space_words.length>=4&&c.cooccurrence_edges.length>=3).length}篇具备至少4个空间词和3组单元共现。`,
  `保存的移动经去重后，${chapters.reduce((s,c)=>s+c.movement_records,0)}条通过严格检查，${chapters.reduce((s,c)=>s+c.rejected_records,0)}条未纳入。未纳入不等于原标注一定错误；复合场景、分词边界和引句差异都会导致排除。`,
  '', '## 结果与门槛','',
  '原先Jaccard至少0.30的门槛没有找到篇目对。本轮将探索门槛降至0.15，得到'+pairs.length+'组；这不能称为高度相似，而是共享部分空间材料的候选。篇幅比不超过2；不使用人物或异事类型筛选。',
  '', '|篇目对|共用空间词|Jaccard|共现结构差异|','|---|---|---:|---:|',
  ...pairs.map(v=>`|${v.titles.join('／')}|${v.shared_words.join('、')}|${v.vocabulary_similarity.toFixed(3)}|${v.structural_distance.toFixed(3)}|`),
  '', '## 可以与不可以据此推论','',
  '当前结果只支持定位比较对象，尚不能证实「每篇各具局面」。空间词组本身的重合较有限，保存移动步骤与原词的对应也存在较大缺口。优先核查候选篇目的词项和原文单元，再开展打乱顺序对照；不应把低覆盖率造成的断裂解释为作者刻意安排。',
  '',...result.limitations.map(s=>'- '+s)];
 fs.writeFileSync(path.join(root,'reports/篇目空間組構比較.md'),lines.join('\n')+'\n');
 console.log(JSON.stringify({chapters:chapters.length,eligible:chapters.filter(c=>c.movement_records>=3).length,valid_edges:chapters.reduce((s,c)=>s+c.movement_records,0),rejected:chapters.reduce((s,c)=>s+c.rejected_records,0),pairs:pairs.length,top:pairs.slice(0,5)},null,2));
}
if(require.main===module)main();
module.exports={jaccard,graphMetrics,structuralDistance,cooccurrenceMetrics,coDistance,analyzeChapter};
