'use strict';
const fs=require('node:fs'),path=require('node:path');
const M=require('./ghost_map_model.js'),P=require('./ghost_map_package.js');
const input=process.argv[2];if(!input)throw new Error('需要提供修订 JSON');
const bundle=JSON.parse(fs.readFileSync('data-package.json','utf8'));
let revisions=JSON.parse(fs.readFileSync(input,'utf8'));
if(!revisions||revisions.schema_version!==2||!Array.isArray(revisions.overrides)||!Array.isArray(revisions.place_locations))throw new Error('修订格式错误（需要 schema_version 2）');
const canonical='manual-revisions.json';
if(path.resolve(input)!==path.resolve(canonical)&&fs.existsSync(canonical)){
  // Legacy uploads have no ancestor. Only merge non-conflicting rows; never
  // replace newer edits from another browser with an older full snapshot.
  revisions=M.mergeDocuments(bundle.base,null,revisions,JSON.parse(fs.readFileSync(canonical,'utf8')));
}
const model=M.create(bundle.base);model.importDocument(revisions);
const merged=P.create(bundle.base,model.document());
let html=fs.readFileSync('index.html','utf8');
const pattern=/<script id="published-revisions" type="application\/json">[\s\S]*?<\/script>/;
if(!pattern.test(html))throw new Error('网页缺少人工修订数据');
const seed=JSON.stringify(merged.revisions).replaceAll('<','\\u003c');
html=html.replace(pattern,()=>'<script id="published-revisions" type="application/json">'+seed+'</script>');
fs.writeFileSync('data-package.json',JSON.stringify(merged));
fs.writeFileSync(canonical,JSON.stringify(merged.revisions));
fs.writeFileSync('index.html',html);
require('./externalize-data.js').externalize();
console.log(`Validated ${merged.revisions.overrides.length} chapter edits and ${merged.revisions.place_locations.length} place edits`);
