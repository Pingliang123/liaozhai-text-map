const test=require('node:test'),a=require('node:assert/strict');
const r=require('../reports/chapter-spatial-topic-clusters-five.json'),s=require('../reports/spatial-topics-five-results.json');
test('every modeled chapter appears once with unchanged probabilities',()=>{
 const members=r.groups.flatMap(g=>g.members);a.equal(members.length,443);a.equal(new Set(members.map(c=>c.id)).size,443);
 for(const g of r.groups)for(const c of g.members){a.deepEqual(c.weights,s.chapter_topics.find(x=>x.id===c.id).weights);a.equal(c.assigned_topic,g.topic);a.equal(c.highest_probability,Math.max(...c.weights));}
 a.deepEqual(r.unassigned,s.input.empty_documents);a.equal(members.length+r.unassigned.length,r.total_chapters);
});
test('ambiguous and sparse classifications follow disclosed criteria',()=>{
 for(const c of r.groups.flatMap(g=>g.members)){a.equal(c.ambiguous,c.highest_probability<.5||c.margin<.2);a.equal(c.sparse,c.token_count<5);a.ok(c.highest_probability>=c.second_probability);}
});
