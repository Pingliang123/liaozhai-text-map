'use strict';
// Explicitly reviewed links only. Never infer jurisdiction from nearest coordinates.
const fs=require('node:fs'),crypto=require('node:crypto'),M=require('./ghost_map_model');
const stable=v=>v&&typeof v==='object'?(Array.isArray(v)?v.map(stable):Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]))):v;
const fingerprint=v=>crypto.createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');
// Frozen fingerprints of six earlier generated records. Any later user edit
// makes a row ineligible; never capture new fingerprints automatically.
const ancestors={徐州:'c3871b47091ed2840d58e7a0704b29dab91f1dd4a4686c82c201d96df9041444',吴江府:'deaccf5fec9d0fedbb0fec0a6c6d44940afa1313112bca62cd5e37ec35f2f23b',会稽:'9c9769f1733c1ea83d13b01608bc6f3b2ec9d7b42fc5d00440e02edfe51c9209',燕都:'0e696f9235cda27899587e890d6600f6ef4f11390c7c2ec61263d8324dc86d17',无极:'51d132eb741634b2d4435b054ad2a1d74575cab2981747ca40e7039c18a714c9',武陵:'1c0c91bf80a7d3f4f09cecb9376c753371d732be9eb476118989c96f87e5958c'};
const sources={
 jiangzhe:'https://www.shidianguji.com/zh/book/CADAL01022203/chapter/1lml46p9l57w2',
 zhili:'https://www.shidianguji.com/book/CADAL01022203/chapter/1lml46ncg4avu',
 huguang:'https://www.shidianguji.com/book/CADAL01022203/chapter/1lml46pj86asm',
 shandong:'https://www.shidianguji.com/book/SK1153/chapter/1kf4e6hci1nnt',
 guazhou:'https://www.jsxc.gov.cn/whwy/whcc/202512/t20251215_88937.shtml'
};
// A missing intermediate county/prefecture is not invented: the link is to
// the nearest represented containing region, as recorded in the note.
const decisions=[
 ['苏州','江苏','jiangzhe'],['松江','江苏','jiangzhe'],['常州','江苏','jiangzhe'],['镇江','江苏','jiangzhe'],
 ['江宁','江苏','jiangzhe'],['金陵','江苏','jiangzhe','金陵对应江宁府区域；不作现代南京与江苏的历代等同。'],
 ['徐州','江苏','jiangzhe'],['彭城','江苏','jiangzhe','彭城采用徐州区域；同地异名不是上下级。'],
 ['吴江','苏州','jiangzhe'],['吴江府','苏州','jiangzhe','原词保留，所指吴江县属苏州府，不另建吴江府。'],
 ['宿迁','徐州','jiangzhe'],['睢宁','徐州','jiangzhe'],['邳','徐州','jiangzhe'],
 ['木渎镇','苏州','jiangzhe','经吴县关联苏州府；当前资料未单列吴县，非直接辖县声明。'],
 ['瓜州','扬州','guazhou','沿用《霍女》原文校读的瓜洲渡定位，关联扬州区域；不采用甘肃瓜州口记录。'],
 ['湖州','浙江','jiangzhe'],['绍兴','浙江','jiangzhe'],['金华','浙江','jiangzhe'],['衢州','浙江','jiangzhe'],
 ['上虞','绍兴','jiangzhe'],['钱塘','杭州府','jiangzhe'],
 ['会稽','浙江','jiangzhe','沿用既有绍兴区域参考；不是绍兴府下辖另一个府。'],
 ['滦州','永平','zhili'],['河间','直隶','zhili','经河间府关联直隶；当前未区分同城府县。'],
 ['天津','直隶','zhili','经天津府关联直隶；当前未区分同城府县。'],
 ['京','直隶','zhili','沿用既有北京参考点，经顺天府关联直隶；不泛指历代都城。'],
 ['燕都','直隶','zhili','沿用京的北京参考区域；不是京下辖另一个府。'],
 ['无极','真定','zhili','清代正定府（原真定府）辖无极县。'],
 ['云梦','湖北','huguang','经德安府关联湖北，当前资料未单列德安府。'],
 ['沅江','湖南','huguang','经常德府关联湖南，当前资料未单列常德府。'],
 ['武陵','湖南','huguang','清代武陵县属常德府；不得把跨省的湖广区域当作唯一省域。']
];
function apply(input){
 const pack=structuredClone(input),base=pack.base,changes=[],skipped=[];
 const before=M.create(input.base);before.importDocument(input.revisions);
 const locations=new Map(pack.revisions.place_locations.map(r=>[r.name,r]));
 for(const [word,parent,key,detail='']of decisions){
  const p=base.places.find(p=>p.name===word),target=base.places.find(p=>p.name===parent);
  if(!p||!target)throw Error('Missing reviewed place: '+word+'/'+parent);
  const saved=locations.get(word);
  if(saved&&saved.parent_id!==target.id&&fingerprint(saved)!==ancestors[word]){skipped.push({word,reason:'保留后续人工定位；不覆盖其上级'});continue;}
  const old=saved?saved.parent_id:p.parent_id||null,note='清代区域汇总参考；不代替故事年代。'+detail;
  if(old!==target.id)changes.push({word,previous_parent:base.places.find(x=>x.id===old)?.name||null,parent,source_url:sources[key],note,location_fingerprint:saved?ancestors[word]:undefined});
  p.parent_id=target.id;if(saved)saved.parent_id=target.id;
  p.hierarchy_reference={year:1820,parent:target.name,source_url:sources[key],note,relation:'reference-contains'};
  // The earlier full-span CHGIS parent remains archived; do not display it
  // as the basis for this separate Qing reference link.
  if(['江南行省','浙江行省','江南省','越州'].includes(p.historical_parent_name))p.historical_parent_warning='旧记录跨越多个朝代，不用于当前省域归属；区域汇总见 hierarchy_reference。';
  const edges=base.place_hierarchy.edges;
  if(key!=='guazhou'&&!edges.some(e=>e.child_id===p.id&&e.parent_id===target.id&&e.year===1820))edges.push({child_id:p.id,parent_id:target.id,kind:'historical_reference_contains',year:1820,source_url:sources[key],note});
 }
 const model=M.create(base);model.importDocument(pack.revisions);
 const places=model.places(),by=new Map(places.map(p=>[p.id,p]));
 for(const p of places){const seen=new Set();let a=p;while(a?.parent_id){if(seen.has(a.id))throw Error('Hierarchy cycle: '+p.name);seen.add(a.id);a=by.get(a.parent_id);if(!a)throw Error('Dangling parent: '+p.name);}}
 const provinces=places.filter(p=>p.admin_level==='province').map(p=>({province:p.name,descendants:model.descendants(p).map(x=>x.name)}));
 return {pack,report:{changes,skipped,provinces,note:'篇目修订、坐标、原文名称及备注保持原样；六条已识别的早期生成记录仅修上级，其他人工定位不覆盖。现代省界只供底图参照。'}};
}
if(require.main===module){const result=apply(JSON.parse(fs.readFileSync('data-package.json')));if(process.argv.includes('--apply')){fs.writeFileSync('data-package.json',JSON.stringify(result.pack));fs.writeFileSync('manual-revisions.json',JSON.stringify(result.pack.revisions));fs.writeFileSync('reports/province-hierarchy-20261027.json',JSON.stringify(result.report,null,2));const registry=structuredClone(require('../assets/publication-rebases'));registry.version='province-20261027';registry.locations=Object.entries(ancestors).map(([name,hash])=>({name,ancestors:[hash],fields:['parent_id']}));fs.writeFileSync('assets/publication-rebases.js',"(function(root){'use strict';const data="+JSON.stringify(registry)+";if(typeof module!=='undefined')module.exports=data;else root.GhostPublicationRebases=data;})(globalThis);\n");}console.log(JSON.stringify({changes:result.report.changes.length,skipped:result.report.skipped}));}
module.exports={apply,decisions};
