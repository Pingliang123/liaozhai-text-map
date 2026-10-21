'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
// Content hashes keep existing bookmarks useful after a deployment.
function update(root=process.cwd()){
 const pages=['index.html','data.html'];
 function walk(dir){if(!fs.existsSync(dir))return;for(const e of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,e.name);if(e.isDirectory())walk(file);else if(e.name.endsWith('.html'))pages.push(path.relative(root,file));}}
 walk(path.join(root,'assets'));
 for(const name of pages){const file=path.join(root,name);if(!fs.existsSync(file))continue;const before=fs.readFileSync(file,'utf8');
 const after=before.replace(/(<(?:script|link)\b[^>]*?\b(?:src|href)=")([^"?#]+\.(?:js|css))(?:\?([^"#]*))?("[^>]*>)/g,(all,start,ref,query,end)=>{
   if(/^(?:[a-z]+:|\/\/|\/)/i.test(ref))return all;const asset=path.resolve(path.dirname(file),ref),relative=path.relative(root,asset);
   if(relative.startsWith('..')||!fs.existsSync(asset))return all;
   const params=new URLSearchParams(query||'');params.set('v',crypto.createHash('sha256').update(fs.readFileSync(asset)).digest('hex').slice(0,12));return start+ref+'?'+params+end;
 });if(after!==before)fs.writeFileSync(file,after);
 }
}
module.exports={update};if(require.main===module)update();
