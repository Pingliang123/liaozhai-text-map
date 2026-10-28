'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),S=require('./supplement-source-spaces'),R=require('../assets/spatial-routes'),M=require('./ghost_map_model'),D=require('../assets/research-lab/current-data'),C=require('../assets/research-lab/chapter-spaces');
const fixture={space_words:[],places:[],people:[],source_units:[{unit:1,text:'至狱门，遥见父卧簷下。'}],segmentation_note:'至 / 狱门 / ， / 遥见父卧簷下 / 。'};
const p=S.plan(fixture);assert(p.additions.includes('狱门'));assert(p.additions.includes('簷下'));assert(p.segmentation.includes('遥见父卧 / 簷下'));assert.equal(p.segmentation.split(/[\s/|]+/u).join(''),fixture.source_units[0].text);
const rejected=S.plan({...fixture,lexical_reviews:{'spaces:簷下':{status:'rejected',kind:'',word:''}}});assert(!rejected.additions.includes('簷下'));assert.equal(rejected.segmentation,fixture.segmentation_note);
const renamed=S.plan({...fixture,lexical_reviews:{'spaces:簷下':{status:'corrected',kind:'places',word:'别处'}}});assert(!renamed.additions.includes('簷下'));
const named=S.plan({...fixture,places:[{word:'狱门'}]});assert(!named.additions.includes('狱门'));
const title={...fixture,source_units:[{unit:1,text:'上帝殿下九王，至殿前。'}],segmentation_note:'上帝 / 殿 / 下 / 九王 / ， / 至 / 殿前 / 。'};assert(!S.plan(title).additions.includes('殿下'));assert(S.plan(title).additions.includes('殿前'));
const literal={...title,source_units:[{unit:1,text:'至殿下。'}],segmentation_note:'至 / 殿 / 下 / 。'};assert(S.plan(literal).additions.includes('殿下'));
const broken=S.plan({...fixture,segmentation_note:'至 / 狱门'});assert.equal(broken.segmentation,'至 / 狱门','不覆盖未全文对齐的人工分词');assert(!broken.boundaries.length);
const pkg=require('../data-package.json'),m=M.create(pkg.base);m.importDocument(pkg.revisions);const snapshots=D.snapshot(m),c=m.view(395),tokens=R.lexicon(c).words,snap=snapshots.find(c=>c.id===395),g=C.build(snap);
for(const w of ['狱门','簷下','官廨','门阈','东墀'])if(c.space_words.includes(w)&&tokens.has(w)){assert(snap.spaces.includes(w));assert(g.nodes.some(n=>n.label===w));}
const report=JSON.parse(fs.readFileSync('reports/concrete-space-supplement-20261028.json'));
// The audit is historical evidence, not a permanent lock on later manual edits.
for(const row of report.chapters){const view=m.view(row.id),idx=R.lexicon(view),source=view.source_units.map(u=>u.text).join('').replace(/\s/gu,'');for(const {word,quote} of row.additions){assert(view.source_units.some(u=>u.text===quote&&quote.includes(word)));if(view.space_words.includes(word)&&idx.words.has(word))assert(snapshots.find(c=>c.id===row.id).spaces.includes(word));}for(const h of row.boundary_changes)assert.equal(source.slice(h.start,h.end),h.word);}
console.log('PASS 具体空间词补充、原字与分词对应、专名及人工决定保护、尊称排除、两站同步');
