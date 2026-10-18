'use strict';
const fs=require('node:fs'),crypto=require('node:crypto');
function externalize(){
  const bundle=JSON.parse(fs.readFileSync('data-package.json','utf8'));
  const base=JSON.stringify(bundle.base),revisions=fs.readFileSync('manual-revisions.json','utf8');
  const digest=value=>crypto.createHash('sha256').update(value).digest('hex');
  const baseHash=digest(base),revisionHash=digest(revisions);
  fs.writeFileSync('assets/map-base.json',base);
  const seeds={'map-data':{external:'assets/map-base.json?v='+baseHash.slice(0,12),sha256:baseHash,corpus_id:bundle.base.corpus_id},
    'published-revisions':{external:'manual-revisions.json?v='+revisionHash.slice(0,12),sha256:revisionHash}};
  let html=fs.readFileSync('index.html','utf8');
  for(const [id,seed]of Object.entries(seeds)){
    const pattern=new RegExp('<script id="'+id+'" type="application/json">[\\s\\S]*?<\\/script>');
    if(!pattern.test(html))throw Error('Missing data seed: '+id);
    html=html.replace(pattern,()=>'<script id="'+id+'" type="application/json">'+JSON.stringify(seed)+'</script>');
  }
  fs.writeFileSync('index.html',html);
}
module.exports={externalize};if(require.main===module)externalize();
