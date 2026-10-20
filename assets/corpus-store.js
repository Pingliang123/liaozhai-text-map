(function(root){'use strict';
async function load(url='data-package.json',request=root.fetch.bind(root)){
 const response=await request(url,{cache:'no-store'});if(!response.ok)throw Error('总资料包读取失败：HTTP '+response.status);
 const bundle=await response.json();if(bundle.package_type!=='liaozhai-text-map'||bundle.package_version!==1||!Array.isArray(bundle.base?.chapter_overview)||!Array.isArray(bundle.revisions?.overrides))throw Error('总资料包格式不完整');
 return bundle;
}
function retainMissing(local,published){
 if(!Array.isArray(local?.overrides)||!Array.isArray(published?.overrides)||published.overrides.length<20||local.overrides.length>=published.overrides.length/2)return local;
 const ids=new Set(local.overrides.map(r=>r.chapter_id)),locations=new Map((published.place_locations||[]).map(r=>[r.name,r]));for(const row of local.place_locations||[])locations.set(row.name,row);
 return {...local,overrides:[...published.overrides.filter(r=>!ids.has(r.chapter_id)),...local.overrides].sort((a,b)=>a.chapter_id-b.chapter_id),place_locations:[...locations.values()]};
}
const api={load,retainMissing};if(typeof module!=='undefined')module.exports=api;else root.GhostCorpusStore=api;
})(globalThis);
