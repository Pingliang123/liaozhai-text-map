'use strict';
const assert=require('node:assert/strict'),{revise,evidence}=require('./reconcile-space-vocabulary'),T=require('../assets/research-lab/place-taxonomy');
const c={chapter_id:130,source_units:[{unit:1,text:'入宫，宫女至。',tokens:[[0,1],[1,2],[3,5],[5,6]]}]};
assert.equal(evidence(c,'宫').length,1);assert.equal(evidence({...c,source_units:[{text:'宫女至',tokens:[[0,2],[2,3]]}]},'宫').length,0);
const d={places:[{word:'宫'}],space_words:[],lexical_reviews:{'places:宫':{status:'accepted',kind:'places'}}};assert.equal(revise(c,d).changes[0].action,'place-to-space');assert(!d.places.length);assert(d.space_words.includes('宫'));assert.equal(d.lexical_reviews['places:宫'].kind,'spaces');
const held={places:[],space_words:[],lexical_reviews:{'spaces:宫':{status:'rejected'}}};assert.equal(revise({...c,chapter_id:2},held).held.length,1);assert(!held.space_words.length);
for(const w of ['宫','寺','廊','室','殿'])assert.equal(T.classify(w).category,'space');assert.equal(T.classify('济南').category,'place');
const M=require('./ghost_map_model'),D=require('../assets/research-lab/current-data'),pkg=require('../data-package.json'),model=M.create(pkg.base);model.importDocument(require('../manual-revisions.json'));
assert.deepEqual(pkg.revisions,model.document());
for(const [id,w]of [[119,'庙'],[129,'寺'],[130,'宫']]){const c=model.view(id);assert(!c.places.some(p=>p.word===w));assert(c.space_words.includes(w));}
const snapshot=D.snapshot(model),published=require('../assets/research-lab/data.json');for(let i=0;i<snapshot.length;i++)assert.equal(JSON.stringify(snapshot[i]),JSON.stringify(published.chapters[i]),'共享快照：'+i);
for(const row of require('../reports/space-vocabulary-20261022.json').changes){const c=model.view(row.chapter_id);assert(c.space_words.includes(row.word));assert(row.evidence.some(e=>c.source_units.some(u=>u.unit===e.unit&&u.text===e.quote)));}
console.log('PASS spatial context, palace compound exclusion, explicit corrections and retained decisions');
