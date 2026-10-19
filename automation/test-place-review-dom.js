const assert=require('assert/strict'),P=require('../assets/place-review');
class E{constructor(tag,text){this.tag=tag;this.textContent=text||'';this.children=[];this.value='';this.listeners={};}append(...xs){this.children.push(...xs);}replaceChildren(...xs){this.children=xs;}setAttribute(k,v){this[k]=v;}addEventListener(k,f){this.listeners[k]=f;}contains(n){return this===n||this.children.some(x=>x.contains(n));}querySelectorAll(s){const tags=s.split(',');return this.children.flatMap(x=>[...(tags.includes(x.tag)?[x]:[]),...x.querySelectorAll(s)]);}}
global.document={createElement:t=>new E(t)};const root=new E('main'),c={places:[{word:'金陵'}],space_words:[],source_units:[{text:'赴金陵。',tokens:[[0,3],[3,4]]}],lexical_reviews:{}},row={kind:'places',word:'金陵',chapter:'甲',chapter_id:0,key:'places:金陵',present:true};let saved;
P.mount(root,{rows:()=>[row],chapter:()=>c,unitStream:()=> '赴金陵 / 。',save:(r,e)=>{saved=e;}});
assert.equal(root.querySelectorAll('blockquote')[0].textContent,'赴金陵。');
const fields=root.querySelectorAll('select');assert.deepEqual(fields[2].children.map(x=>x.value),['','places','spaces','none']);fields[2].value='spaces';
const synonym=root.querySelectorAll('input').find(n=>n.list);synonym.value='南京';const area=root.querySelectorAll('textarea')[0];area.value='赴 / 金陵 / 。';area.listeners.input();assert(root.querySelectorAll('input')[0].disabled);
root.querySelectorAll('button').find(n=>n.textContent==='保存').onclick();assert.equal(saved.kind,'spaces');assert.equal(saved.canonical,'南京');assert.equal(saved.tokens,'赴 / 金陵 / 。');assert.equal(saved.unitIndex,0);
console.log('PASS visible sentence, three classifications, synonym choice, token editing and save payload');
const other=new E('main'),candidate={...row,word:'俄',key:'places:俄',present:false,status:'pending'};let writes=0;P.mount(other,{rows:()=>[candidate],chapter:()=>c,unitStream:()=>'',save:()=>writes++});assert.equal(other.querySelectorAll('blockquote').length,0,'Candidates are not presented as existing locations');const scope=other.querySelectorAll('select')[0];scope.value='pending';scope.onchange();const category=other.querySelectorAll('select')[2];assert.equal(category.value,'','Unreviewed candidate must not default to a place');assert.equal(other.querySelectorAll('blockquote')[0].textContent,'原文未找到此词');other.querySelectorAll('button').find(n=>n.textContent==='保存').onclick();assert.equal(writes,0);category.value='none';other.querySelectorAll('button').find(n=>n.textContent==='保存').onclick();assert.equal(writes,0,'Missing source must not silently edit the first unit');
assert.equal(P.classification(row,{...c,places:[],space_words:['金陵']}),'spaces');assert.equal(P.classification(row,{...c,space_words:['金陵']}),'');
console.log('PASS candidate separation, real current categories, conflicting annotations and missing-source save guard');
const filtered=new E('main'),missing={...row,word:'未定位处'},alias={...row,word:'金陵别称'},pending={...row,word:'俄',present:false,status:'pending'},chapter={...c,places:[{word:'金陵'},{word:'未定位处'},{word:'金陵别称'}]},unmapped=new Set(['未定位处']);P.mount(filtered,{rows:()=>[row,missing,alias,pending],chapter:()=>chapter,unmapped:()=>unmapped,normalize:w=>w==='金陵别称'?'金陵':w,unitStream:()=>'',save(){}});const scopeSelect=filtered.querySelectorAll('select')[0];assert(scopeSelect.children.some(o=>o.value==='unmapped'));scopeSelect.value='unmapped';scopeSelect.onchange();assert.deepEqual(filtered.querySelectorAll('strong').map(n=>n.textContent),['未定位处'],'Only current unmapped places, excluding mapped aliases and pending candidates');unmapped.clear();scopeSelect.onchange();assert.equal(filtered.querySelectorAll('strong').length,0,'Saved coordinates must be reflected on rerender');
console.log('PASS unmapped filter, canonical aliases, candidate exclusion and refreshed location data');

const page = require('fs').readFileSync('index.html', 'utf8');
for (const [fragment, message] of [
  ["const fallbackDBName = 'liaozhai-map-local-backup-v1'", 'missing IndexedDB backup database'],
  ["indexedDB.open(fallbackDBName, 1)", 'missing IndexedDB opener'],
  ['queueFallbackWrite(storageKey, storageSnapshot)', 'missing queued fallback write'],
  ['await fallbackRead(storageKey)', 'missing fallback restore'],
  ['storagePending || storageInvalid', 'missing pending-save guard'],
  ['本机保存失败（主储存与备用储存均不可用）：请立即下载 JSON 备份。', 'missing final backup warning']
]) if (!page.includes(fragment)) throw new Error(message);
console.log('PASS IndexedDB fallback, queued writes, restore and backup warning');
if (!page.includes('let unmappedCache = null') || !page.includes('if (unmappedCache) return unmappedCache')) throw new Error('全书未定位地点没有缓存');
if (!require('fs').readFileSync('assets/place-review.js', 'utf8').includes('const sourceRows=api.rows()')) throw new Error('地点修改列表仍重复读取全量记录');
console.log('PASS cached unmapped scan and single source-row read per list render');
const preview=new E('main');P.mount(preview,{rows:()=>[{...row,word:'赴金陵',key:'places:赴金陵'}],chapter:()=>({...c,places:[{word:'赴金陵'}]}),unitStream:()=> '赴金陵 / 。',save(){}});
const previewWord=preview.querySelectorAll('input').find(n=>n['aria-label']==='赴金陵修订词语');previewWord.value='金陵';previewWord.listeners.change();assert.equal(preview.querySelectorAll('textarea')[0].value,'赴 / 金陵 / 。');
console.log('PASS word correction immediately updates visible sentence-token preview');
const cross=new E('main');P.mount(cross,{rows:()=>[row,{...row,word:'赴金陵',present:false,status:'pending'}, {...row,present:false,status:'pending',chapter:'乙'}],chapter:()=>c,unitStream:()=> '赴金陵 / 。',save(){}});const crossScope=cross.querySelectorAll('select')[0];crossScope.value='crosscheck';crossScope.onchange();assert.deepEqual(cross.querySelectorAll('strong').map(n=>n.textContent),['赴金陵','金陵']);assert(cross.querySelectorAll('small').some(n=>n.textContent==='对照地名：金陵'));
console.log('PASS known-place matching includes exact unclassified names and embedded malformed phrases');
