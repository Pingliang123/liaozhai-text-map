'use strict';
const fs=require('fs'),crypto=require('crypto'),path=require('path'),M=require('./ghost_map_model');
const root=path.resolve(__dirname,'..'),raw=process.argv[2];
if(!raw)throw new Error('Usage: node automation/export-tutorial-markers.js <source.txt>');
const packageBytes=fs.readFileSync(path.join(root,'data-package.json')),p=JSON.parse(packageBytes),m=M.create(p.base);m.importDocument(p.revisions);
const chapters=m.ids.map(id=>({id,title:m.view(id).chapter})),rows=fs.readFileSync(raw,'utf8').replace(/^\uFEFF/,'').split('\n');
let pos=-1;const markers=[];
for(let i=0;i<rows.length;i++){
 const text=rows[i].trim();if(text.length>25)continue;
 const title=m.simplify(text),j=chapters.findIndex((c,k)=>k>pos&&c.title===title);
 if(j>=0){pos=j;markers.push({line:i+1,...chapters[j]});}
}
if(markers.length!==chapters.length)throw new Error(`Only ${markers.length}/${chapters.length} titles aligned`);
const result={package_sha256:crypto.createHash('sha256').update(packageBytes).digest('hex'),raw_sha256:crypto.createHash('sha256').update(fs.readFileSync(raw)).digest('hex'),chapters,markers};
fs.mkdirSync(path.join(root,'.network-runtime'),{recursive:true});
fs.writeFileSync(path.join(root,'.network-runtime/tutorial-topic-chapter-markers.json'),JSON.stringify(result));
console.log(JSON.stringify({matched_titles:markers.length}));
