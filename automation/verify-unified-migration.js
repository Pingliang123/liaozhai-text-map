'use strict';
const fs=require('fs'),cp=require('child_process'),assert=require('assert/strict');
const get=sha=>JSON.parse(cp.execFileSync('git',['show',sha+':manual-revisions.json'],{maxBuffer:50000000}));
const latest=get('49a3296'),prior=get('e3e2ad5'),bundle=JSON.parse(fs.readFileSync('data-package.json')),current=bundle.revisions;
const changes=[];let exact=0;
for(const old of latest.overrides){const next=current.overrides.find(r=>r.chapter_id===old.chapter_id);assert(next,'Missing latest chapter '+old.chapter_id);let same=true;for(const [field,value]of Object.entries(old.changes)){if(JSON.stringify(value)===JSON.stringify(next.changes[field]))continue;same=false;assert([15,30].includes(old.chapter_id)&&['places','space_words','lexical_reviews','segmentation_note'].includes(field),'Unexpected change to latest edit '+old.chapter_id+' '+field);changes.push({id:old.chapter_id,field});}if(same)exact++;}
for(const old of prior.overrides)assert(current.overrides.some(r=>r.chapter_id===old.chapter_id),'Lost prior chapter '+old.chapter_id);
const audit={latest_source:'49a3296',prior_source:'e3e2ad5',latest_chapters:latest.overrides.length,unchanged_latest_chapters:exact,authorized_corrections:changes,restored_missing_chapters:prior.overrides.filter(r=>!latest.overrides.some(n=>n.chapter_id===r.chapter_id)).length,total_saved_chapters:current.overrides.length};
fs.writeFileSync('reports/unified-migration-verification-20261020.json',JSON.stringify(audit,null,2)+'\n');console.log(JSON.stringify(audit));
