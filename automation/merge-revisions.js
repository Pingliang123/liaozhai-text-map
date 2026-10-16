'use strict';
const fs=require('node:fs');
const path=require('node:path');
const M=require('./ghost_map_model.js');
const P=require('./ghost_map_package.js');

const input=process.argv[2];
if(!input) throw new Error('需要提供 manual-revisions.json');
const packagePath='data-package.json';
const bundle=JSON.parse(fs.readFileSync(packagePath,'utf8'));
const revisions=JSON.parse(fs.readFileSync(input,'utf8'));
if(!revisions || revisions.document_version !== 1 || !Array.isArray(revisions.overrides) || !Array.isArray(revisions.place_locations)) {
  throw new Error('修订文件不是受支持的版本');
}
if(revisions.corpus_id && revisions.corpus_id !== bundle.base.corpus_id) throw new Error('修订文件与当前文本底本不匹配');
const model=M.create(bundle.base);
model.importDocument(revisions);
const merged=P.create(bundle.base,model.document());
fs.writeFileSync(packagePath,JSON.stringify(merged));
const htmlPath='index.html';
let html=fs.readFileSync(htmlPath,'utf8');
const seed=JSON.stringify(merged.revisions).replaceAll('<','\\u003c');
const pattern=/<script id="published-revisions" type="application\/json">[\s\S]*?<\/script>/;
if(!pattern.test(html)) throw new Error('网页没有人工修订入口');
html=html.replace(pattern,'<script id="published-revisions" type="application/json">'+seed+'</script>');
fs.writeFileSync(htmlPath,html);
console.log(JSON.stringify({chapters:merged.base.chapter_overview.length,manual_chapters:merged.revisions.overrides.length,manual_locations:merged.revisions.place_locations.length}));
