'use strict';
const fs=require('node:fs'),M=require('./ghost_map_model');
function plan(pack,doc){
 const m=M.create(pack.base);m.importDocument(doc);const located=new Map(m.places().map(p=>[m.name(p.name),p])),protectedNames=new Set(doc.place_locations.map(p=>p.name)),words=new Map();
 for(const id of m.ids){const c=m.view(id);for(const p of c.places){const word=p.word;if(located.has(m.name(word)))continue;if(!words.has(word))words.set(word,[]);words.get(word).push({chapter:c.chapter,chapter_id:id,quotes:c.source_units.filter(u=>u.text.includes(word)).slice(0,3).map(u=>({unit:u.unit,text:u.text}))});}}
 const aliases={淄:'淄川',淄邑:'淄川',太山:'泰山'},rows=[],locations=[];
 const strip=s=>String(s).replace(/(?:省|府|县|縣|州)$/u,'');
 const taxonomy=require('../assets/research-lab/place-taxonomy');
 for(const [word,evidence] of words){const row={word,evidence,status:'unresolved'};rows.push(row);if(protectedNames.has(word)){row.status='manual-preserved';continue;}
 let target=aliases[word]&&located.get(aliases[word]),match=null;
 if(target){row.target=target.name;row.relation='same-reference-area';row.reason='用户指定区域对应，原文核对；保留文本名称，共用现有参考点。';}
 else if(taxonomy.classify(word).category==='place'){
 const history=pack.base.historical_place_search?.records?.find(r=>r.word===word),matches=(history?.matches||[]).filter(x=>strip(x.name||x.api_name)===strip(word)&&x.data_source==='CHGIS'&&Number.isFinite(x.lon)&&Number.isFinite(x.lat)&&x.lon!==0&&Math.abs(x.lon)<=180&&Math.abs(x.lat)<=85);
 const groups=new Map(matches.map(x=>[`${x.lon.toFixed(3)},${x.lat.toFixed(3)}`,x]));
 if(groups.size===1){row.status='gazetteer-candidate';row.candidates=[...groups.values()];row.reason='已存CHGIS唯一同名区域；仍需核对故事所在地。';}
 else if(groups.size>1){row.status='ambiguous';row.candidates=[...groups.values()];}
 }
 if(!target&&!match)continue;
 const parentName=match?.parent_name?.replace(/\s*\(.*/,'').trim(),parent=parentName?[...located.values()].find(p=>strip(p.name)===strip(parentName)):null;
 const location={name:word,admin_level:target?.admin_level||(/府/.test(match.feature_type)?'prefecture':/县|縣/.test(match.feature_type)?'county':'unknown'),parent_id:target?.parent_id||parent?.id||null,modern_name:target?.modern_name||match.name,region_description:target?`与${target.name}共用区域参考点；保留原文名称`:`CHGIS ${match.years||'年代待核'}，隶属${parentName||'待核'}`,modern_level:'历史文本区域参考',source_url:target?.level_source_url||target?.source_url||match.uri,note:row.reason+(word==='太山'?' “太山帝君”等称号不单独证明地理到访。':''),coordinate_kind:'approximate',lon:target?.lon??match.lon,lat:target?.lat??match.lat};
 row.status='located-reference';row.location=location;locations.push(location);
 }
 return {rows,locations};
}
function run(){const file='data-package.json',pack=JSON.parse(fs.readFileSync(file)),doc=JSON.parse(fs.readFileSync('manual-revisions.json'));
 if(process.argv.includes('--withdraw-generated-candidates')){const previous=JSON.parse(fs.readFileSync('reports/unmapped-region-review-20261021.json'));const generated=new Set(previous.rows.filter(r=>r.location&&!r.target).map(r=>r.word));doc.place_locations=doc.place_locations.filter(r=>!generated.has(r.name));}
 const before=JSON.stringify(doc.overrides),report=plan(pack,doc),model=M.create(pack.base);model.importDocument(doc);
 for(const loc of report.locations)model.saveLocation(loc);
 const next=model.document();if(JSON.stringify(next.overrides)!==before)throw Error('篇目人工修订发生变化，停止写入');
 const mountain=pack.base.places.find(p=>p.name==='泰山');if(mountain&&!mountain.parent_id){mountain.parent_id='place-泰安';mountain.containment_note='位于泰安参考区域；地貌位置关系，不表示泰山与泰安是同一实体。';mountain.containment_source_url='https://tjj.taian.gov.cn/col/col316440/index.html';}
 const historical=pack.base.place_hierarchy.edges;if(!historical.some(e=>e.child_id==='place-沂水'&&e.valid_from===1734))historical.push({child_id:'place-沂水',parent_id:'place-沂州',kind:'historical_contains',valid_from:1734,valid_to:1911,source_url:'https://www.yishui.gov.cn/zjys/ysgk1/lsyg.htm',note:'雍正十二年改属沂州府；不反推到此前。'});
 const equivalences=report.rows.filter(r=>r.target&&r.location).map(r=>({word:r.word,target:r.target,relation:'same-reference-area',source:'用户区域对应与原文核对',note:r.reason}));pack.base.place_equivalences=[...(pack.base.place_equivalences||[]).filter(x=>!equivalences.some(y=>y.word===x.word)),...equivalences];
 pack.revisions=next;fs.writeFileSync(file,JSON.stringify(pack));fs.writeFileSync('manual-revisions.json',JSON.stringify(next));
 const out={generated_at:new Date().toISOString(),provider:'原文、已存CHGIS检索与人工指定区域；本轮未调用DeepSeek',checked:report.rows.length,located:report.locations.length,resolved_references:pack.base.place_equivalences||[],manual_chapters_unchanged:true,rows:report.rows};fs.writeFileSync('reports/unmapped-region-review-20261021.json',JSON.stringify(out,null,2));console.log(JSON.stringify({checked:out.checked,located:out.located,words:report.locations.map(r=>r.name)}));return out;}
if(require.main===module)run();module.exports={plan};
