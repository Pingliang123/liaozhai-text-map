const test=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const {jaccard,graphMetrics,cooccurrenceMetrics,coDistance,analyzeChapter}=require('./compare-spatial-arrangements');
test('set overlap and topology have explicit bounded definitions',()=>{
 a.equal(jaccard(['室','门','门'],['门','院']),1/3);a.equal(jaccard([],[]),0);
 const complete=cooccurrenceMetrics(['a','b','c'],[['a','b'],['b','c'],['a','c']]);
 a.deepEqual(complete,{density:1,largest_component_fraction:1,transitivity:1,maximum_degree_fraction:1});
 a.equal(coDistance(complete,complete),0);
 a.equal(graphMetrics([{from:'a',to:'b'},{from:'b',to:'a'}]).reciprocal_fraction,1);
});
test('cooccurrence never invents movement or links across source units',()=>{
 const c={chapter_id:1,chapter:'测试',source_tokens:['室','门','院'],space_words:['室','门','院'],places:[],
 source_units:[{unit:1,text:'室门',token_words:['室','门']},{unit:2,text:'院',token_words:['院']}],
 narrative_events:[{unit:1,transition_kind:'movement',from_space:'室',to_space:'院',quote:'不存在的引文'}]};
 const result=analyzeChapter(c);a.equal(result.cooccurrence_edges.length,1);
 a.deepEqual([result.cooccurrence_edges[0].from,result.cooccurrence_edges[0].to],['室','门'].sort());
 a.equal(result.movement_records,0);a.equal(result.rejected_records,1);
});
test('saved comparison is traceable to current data and honest about thresholds',()=>{
 const d=require('../reports/spatial-arrangements-comparison.json');
 a.equal(d.source_sha256,crypto.createHash('sha256').update(fs.readFileSync(require.resolve('../data-package.json'))).digest('hex'));
 a.equal(d.chapters.length,491);const lookup=new Map(d.chapters.map(c=>[c.id,c]));
 for(const v of d.pairs){const x=lookup.get(v.a),y=lookup.get(v.b);a.equal(v.vocabulary_similarity,jaccard(x.space_words,y.space_words));a.equal(v.structural_distance,coDistance(x.co_metrics,y.co_metrics));a.ok(v.length_ratio<=2);a.ok(v.vocabulary_similarity>=.15);}
 for(const c of d.chapters)for(const e of c.cooccurrence_edges){a.ok(c.space_words.includes(e.from)&&c.space_words.includes(e.to));a.ok(e.evidence.length>0);}
 a.equal(d.sensitivity.pairs_at_jaccard_03,d.pairs.filter(v=>v.vocabulary_similarity>=.3).length);
 const html=fs.readFileSync(require.resolve('../reports/篇目空間組構比較.html'),'utf8');a.ok(html.includes('共现不等于移动'));a.ok(html.includes('<svg'));
});
