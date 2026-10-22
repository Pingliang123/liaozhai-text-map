'use strict';
const fs=require('node:fs'),M=require('./ghost_map_model');
// Explicit reviewed identity groups. Shared coordinates and containment never create an identity.
const groups=[
 ['淄川','淄邑','淄'],['泰山','太山','岱'],['华山','太华','华岳','西岳'],
 ['扬州','广陵'],['开封','汴梁','汴城','汴'],['苏州','吴门'],['山西','山右'],
 ['广东','粤','东粤'],['广西','粤西'],['陕西','陕','陕右'],['胶州','胶'],
 ['招远县','招远'],['汉江','汉水'],['武夷山','武夷'],['长清','长清县'],
 ['历城','历城县'],['滕邑','滕'],['辽阳','辽城'],['莱州','莱郡'],['酆都县','酆都'],['顺天','顺天府']
];
function apply(){
 const pack=JSON.parse(fs.readFileSync('data-package.json','utf8')),m=M.create(pack.base);m.importDocument(pack.revisions);const chapters=m.ids.map(id=>m.view(id));
 pack.base.place_node_aliases={...(pack.base.place_node_aliases||{}),...Object.fromEntries(groups.flatMap(([target,...words])=>words.map(w=>[w,target])))};
 const records=groups.map(([canonical,...aliases])=>({canonical,aliases,evidence:aliases.flatMap(word=>chapters.filter(c=>c.places.some(p=>p.word===word)).map(c=>({word,chapter:c.chapter,chapter_id:c.chapter_id,excerpts:c.source_units.filter(u=>u.text.includes(word)).map(u=>u.text)})))}));
 const report={date:'2026-10-22',policy:'同一地理实体的文本异名合并显示；原文词表、分词、人工修订及原定位记录保留。',groups:records,retained_separate:[['千佛山','济南府'],['蔡店','阳信'],['历城','济南府'],['京','都','顺天'],['东岳','泰山'],['蒙山','蒙阴'],['秦中','陕西'],['吴下','苏州'],['粤东','广东']]};
 fs.writeFileSync('data-package.json',JSON.stringify(pack));fs.writeFileSync('reports/place-node-merges-20261022.json',JSON.stringify(report,null,2)+'\n');
 fs.writeFileSync('reports/place-node-merges-20261022.md','# 地点异名合并清单\n\n原文词语与人工修订保留；地图、网络共用合并节点。合并表示同一地理实体的名称对应，不表示不同时期行政疆界完全相同。\n\n| 统一显示 | 合并名称 |\n| --- | --- |\n'+groups.map(([target,...words])=>'| '+target+' | '+words.join('、')+' |').join('\n')+'\n\n## 保留分别显示\n\n'+report.retained_separate.map(xs=>'- '+xs.join('／')).join('\n')+'\n\n共享坐标、上下级隶属、同一地区内的建筑与山川均不作为同义依据。首都语词、异境及存在范围差异的历史区域保留语境区别。逐篇原文证据见同名 JSON。\n');
 console.log('Applied '+groups.length+' groups, '+Object.keys(pack.base.place_node_aliases).length+' aliases');
}
if(require.main===module)apply();module.exports={groups,apply};
