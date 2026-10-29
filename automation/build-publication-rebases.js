'use strict';
// Historical fingerprints identify unedited copies of the pre-review chapter.
// They are not a second source of current annotations.
const fs=require('node:fs'),cp=require('node:child_process'),crypto=require('node:crypto'),M=require('./ghost_map_model');
const stable=value=>value&&typeof value==='object'?(Array.isArray(value)?value.map(stable):Object.fromEntries(Object.keys(value).sort().map(k=>[k,stable(value[k])]))):value;
const hash=value=>crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
const old=JSON.parse(cp.execFileSync('git',['show','cb19c3e:manual-revisions.json'],{maxBuffer:30000000})),pack=require('../data-package.json');
const model=M.create(pack.base);model.importDocument(old);
const raw=old.overrides.find(r=>r.chapter_id===411).changes,normalized=model.editable(411),fields={};
for(const key of ['review_note','segmentation_note','people','places','space_words','narrative_events'])fields[key]=[...new Set([hash(raw[key]),hash(normalized[key])])];
const reviews=Object.fromEntries(Object.keys(raw.lexical_reviews).map(key=>[key,[...new Set([hash(raw.lexical_reviews[key]),hash(normalized.lexical_reviews[key])])]]));
const data={version:'huangying-20261024',corpus_id:old.corpus_id,source_sha256:old.source_sha256,chapters:[{chapter_id:411,title:'黄英',fields,reviews}]};
const existing=require('../assets/publication-rebases');if(existing.locations?.length){data.locations=existing.locations;data.version=existing.version;}
// Rebase only fingerprint-matched old fields. Independently edited fields stay local.
for(const rule of existing.chapters||[]){if(!data.chapters.some(r=>r.chapter_id===rule.chapter_id))data.chapters.push(rule);}
const previous=JSON.parse(cp.execFileSync('git',['show','c0a8604:manual-revisions.json'],{maxBuffer:100000000}));
const priorModel=M.create(pack.base);priorModel.importDocument(previous);
for(const row of previous.overrides){const current=pack.revisions.overrides.find(r=>r.chapter_id===row.chapter_id);if(!current)continue;
 for(const key of ['space_words','segmentation_note']){if(hash(row.changes[key])===hash(current.changes[key]))continue;
  let rule=data.chapters.find(r=>r.chapter_id===row.chapter_id);if(!rule){rule={chapter_id:row.chapter_id,title:priorModel.view(row.chapter_id).chapter,fields:{},reviews:{}};data.chapters.push(rule);}
  rule.fields[key]=[...new Set([...(rule.fields[key]||[]),hash(row.changes[key]),hash(priorModel.editable(row.chapter_id)[key])])];
 }
}
data.version='concrete-spaces-20261029';
const foxBefore=JSON.parse(cp.execFileSync('git',['show','75cceb4:manual-revisions.json'],{maxBuffer:100000000}));
for(const row of foxBefore.overrides){const remote=pack.revisions.overrides.find(r=>r.chapter_id===row.chapter_id);if(!remote||hash(row.changes.event_types)===hash(remote.changes.event_types))continue;let rule=data.chapters.find(r=>r.chapter_id===row.chapter_id);if(!rule){rule={chapter_id:row.chapter_id,title:model.view(row.chapter_id).chapter,fields:{},reviews:{}};data.chapters.push(rule);}rule.fields.event_types=[...new Set([...(rule.fields.event_types||[]),hash(row.changes.event_types)])];}
data.version='fox-events-20261029';
fs.writeFileSync('assets/publication-rebases.js',"(function(root){'use strict';const data="+JSON.stringify(data)+";if(typeof module!=='undefined')module.exports=data;else root.GhostPublicationRebases=data;})(globalThis);\n");
console.log('Recorded pre-review Huangying fingerprints; no current records copied');
