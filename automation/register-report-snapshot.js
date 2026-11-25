'use strict';
// Register exact, known prior field values; never ship original chapter text.
const fs=require('node:fs'),crypto=require('node:crypto'),M=require('./ghost_map_model');
const [priorPath,publishedPath]=process.argv.slice(2);
if(!priorPath||!publishedPath)throw Error('Usage: node automation/register-report-snapshot.js PRIOR_PACKAGE PUBLISHED_PACKAGE');
const prior=JSON.parse(fs.readFileSync(priorPath,'utf8')),published=JSON.parse(fs.readFileSync(publishedPath,'utf8'));
if(JSON.stringify(prior.base)!==JSON.stringify(published.base))throw Error('Baseline differs; do not infer a recovery');
const stable=v=>v&&typeof v==='object'?(Array.isArray(v)?v.map(stable):Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]))):v;
const equal=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
const hash=v=>crypto.createHash('sha256').update(JSON.stringify(stable(v))||'undefined').digest('hex');
const model=M.create(published.base);model.importDocument(prior.revisions);
const before=model.document();model.importDocument(published.revisions);const after=model.document();
const registry=require('../assets/publication-rebases'),rules=new Map(registry.chapters.map(r=>[r.chapter_id,r]));
const oldRows=new Map(before.overrides.map(r=>[r.chapter_id,r.changes]));
let fields=0,reviews=0;
for(const row of after.overrides){
 const old=oldRows.get(row.chapter_id);if(!old)continue;
 let rule=rules.get(row.chapter_id);
 if(!rule){rule={chapter_id:row.chapter_id,title:model.view(row.chapter_id).chapter,fields:{},reviews:{}};registry.chapters.push(rule);rules.set(row.chapter_id,rule);}
 for(const [key,value] of Object.entries(row.changes)){
  if(equal(old[key],value))continue;
  const ancestors=rule.fields[key]??=[];const h=hash(old[key]);if(!ancestors.includes(h)){ancestors.push(h);fields++;}
 }
 // Per-entry checks preserve newly added or edited manual decisions in this map.
 for(const [key,value]of Object.entries(row.changes.lexical_reviews||{})){
  if(equal(old.lexical_reviews?.[key],value))continue;
  const ancestors=rule.reviews[key]??=[];const h=hash(old.lexical_reviews?.[key]);if(!ancestors.includes(h)){ancestors.push(h);reviews++;}
 }
}
registry.version='report-snapshot-20261117';
fs.writeFileSync('assets/publication-rebases.js','(function(root){const data='+JSON.stringify(registry)+";if(typeof module!=='undefined')module.exports=data;else root.GhostPublicationRebases=data;})(globalThis);\n");
console.log(JSON.stringify({registered_fields:fields,registered_reviews:reviews,prior_package_sha256:crypto.createHash('sha256').update(fs.readFileSync(priorPath)).digest('hex')}));
