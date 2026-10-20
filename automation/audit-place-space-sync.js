'use strict';
const fs=require('fs'),M=require('./ghost_map_model'),Cross=require('../assets/place-crosscheck'),P=require('../assets/research-lab/place-spaces'),T=require('../assets/research-lab/place-taxonomy');
const base=JSON.parse(fs.readFileSync('data-package.json')).base,model=M.create(base);model.importDocument(JSON.parse(fs.readFileSync('manual-revisions.json')));
const data=require('../assets/research-lab/data.json'),g=P.build(data.chapters),crosscheck=Cross.scan(base,model);
const relative=data.chapters.flatMap(c=>c.places.filter(w=>T.classify(w).type==='relative').map(word=>({word,chapter:c.title,chapter_id:c.id,suggestion:'篇内相对空间；须按本篇确认所指',evidence:c.units.filter(u=>u.text.includes(word))})));
const report={revision_hash:data.revision_hash,chapters:data.chapters.length,place_nodes:g.placesAll.nodes.length,space_relations:g.spaces.edges.length,pending_space_occurrences:g.pending.length,crosscheck,relative};
fs.writeFileSync('reports/place-space-sync-audit.json',JSON.stringify(report,null,2)+'\n');
fs.writeFileSync('reports/place-space-sync-audit.md','# 地点与空间核对\n\n修订指纹：'+data.revision_hash+'\n\n'+data.chapters.length+'篇；地点—空间关系'+g.spaces.edges.length+'条；空间归属未定'+g.pending.length+'处；重名／嵌套地名待核'+crosscheck.length+'条；相对空间候选'+relative.length+'条。\n\n人工修订优先，不自动接受字串命中。已知地名核对会扫描所有当前分词与候选，不限于旧候选列表。\n\n'+relative.map(r=>'## '+r.word+' · '+r.chapter+'\n\n'+r.evidence.map(u=>u.text).join('\n')).join('\n\n'));
console.log(JSON.stringify({relations:report.space_relations,pending:report.pending_space_occurrences,crosscheck:crosscheck.length,relative:relative.length}));
