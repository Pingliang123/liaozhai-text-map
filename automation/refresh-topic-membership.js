'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const before=JSON.parse(fs.readFileSync('topic-input.json','utf8')),next=require('./export-topic-input').build();
assert.deepEqual(next.documents.map(d=>[d.id,d.text,d.tokens]),before.documents.map(d=>[d.id,d.text,d.tokens]),'文本或训练词改变时应重新训练');
const topics=JSON.parse(fs.readFileSync('assets/research-lab/topics.json','utf8')),docs=new Map(next.documents.map(d=>[d.id,d]));
topics.documents=topics.documents.map(d=>({...d,places:docs.get(d.id).places}));topics.places=next.places;
fs.writeFileSync('assets/research-lab/topics.json',JSON.stringify(topics));fs.writeFileSync('topic-input.json',JSON.stringify(next));
console.log('Updated place membership; exact training tokens and all topic probabilities retained');
