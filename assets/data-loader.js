(function(root){
  'use strict';
  async function load(seed,request=root.fetch,cryptoAPI=root.crypto){
    if(!seed?.external)return seed;
    if(!/^assets\/map-base\.json\?v=[a-f0-9]{12}$|^manual-revisions\.json\?v=[a-f0-9]{12}$/.test(seed.external)||!/^[a-f0-9]{64}$/.test(seed.sha256||''))throw Error('资料索引无效');
    const response=await request(seed.external,{cache:seed.external.startsWith('assets/')?'default':'no-store'});
    if(!response.ok)throw Error('研究资料载入失败（HTTP '+response.status+'）');
    const bytes=await response.arrayBuffer();
    const hash=Array.from(new Uint8Array(await cryptoAPI.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
    if(hash!==seed.sha256)throw Error('资料版本不一致，请重新载入');
    const result=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
    if(seed.corpus_id&&result.corpus_id!==seed.corpus_id)throw Error('底本资料不匹配');
    return result;
  }
  const api={load};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.GhostMapData=api;
})(globalThis);
