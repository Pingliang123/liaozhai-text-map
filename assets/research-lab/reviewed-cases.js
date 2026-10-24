(function(root){'use strict';
// Unit ranges identify the published snapshot; source quotations are resolved at runtime.
// These are selected narrative landmarks, not an exhaustive event census.
const cases=[
 {title:'画壁',question:'观看如何变成进入，私人幽会又如何受到搜查？',note:'江西修饰孟龙潭的籍贯；都中是客居地。壁内明确“非复人世”，但文本没有直接命名为天界。',events:[
  ['客都中','兰若', ['孟龙潭','朱孝廉'],'movement','人间','宗教场所',149,151,'从客居地进入寺院；不能把江西补作这次行程的起点。'],
  ['殿中','壁内殿阁',['朱孝廉'],'movement','人间→异境','宗教场所',152,153,'凝视天女后进入壁间世界，观看者成为故事中的行动者。'],
  ['壁内殿阁','小舍',['朱孝廉','垂髫女子'],'movement','异境','私人',154,157,'女子引路，曲栏、门户与闭户把幽会组织成隐蔽场景。'],
  ['小舍','榻下',['朱孝廉'],'movement','异境','私人',165,175,'搜查声打断幽会。藏身与静听使人物从欲望转向恐惧。'],
  ['壁间','寺殿',['朱孝廉'],'movement','异境→人间','宗教场所',176,184,'僧人呼唤促成返回，画中发式的改变将壁内经历留在人间。']
 ]},
 {title:'聂小倩',question:'寺院、荒墓和家宅如何改变人与鬼的关系？',note:'浙是宁采臣籍贯，秦是燕赤霞自述籍贯；兰溪修饰来试的生员，均不直接构成宁采臣行程。小倩是鬼，不能因别人疑其为仙便改作仙。',events:[
  ['赴金华途中','金华北郭兰若',['宁采臣'],'movement','人间','宗教场所',2875,2886,'城中住宿昂贵促成寺院留宿；空间选择首先有现实条件。'],
  ['北院','宁采臣寝所',['聂小倩'],'movement','人间','私人',2909,2919,'女子跨入寝所并以金相诱，私室成为检验人物操守的场景。'],
  ['原寝所','燕赤霞同室',['宁采臣'],'movement','人间','私人',2943,2955,'同宿与窗棂构成防护；此处没有进入冥界。'],
  ['金华寺侧墓地','宁宅斋外新墓',['宁采臣（携小倩遗骨）'],'movement','人间','墓葬',2966,2974,'迁移对象是遗骨；返乡目的地未明确命名，不能由“浙人”补出县城。'],
  ['斋外墓地','斋中及宁宅',['聂小倩','宁采臣'],'movement','人间','家宅',2976,2994,'鬼随人进入家庭，通过拜母与家务逐步获得位置。'],
  ['户外','斋室',['聂小倩'],'movement','人间','私人',2997,3002,'剑囊形成进入障碍，移悬他室后才得入内。'],
  ['晨昏往返','留与同卧起',['聂小倩'],'change','人间','私人',3013,3020,'从黄昏离去到被留宿，变化的是家庭接纳程度。']
 ]},
 {title:'黄英',question:'院落经营、家庭边界与清贫身份如何互相牵动？',note:'路径直接读取总资料库。顺天是马宅的推定区域参考，非精确宅址；河朔为拟居，东粤为送信客来源。菊精活动仍在人间。',events:[]},
 {title:'罗刹海市',question:'不同异域的评价秩序与出入限制有何区别？',note:'罗刹国、海市和水国龙宫是三个不同层次的场所；不可一律称为天界。末段龙宫是女儿名，福海是儿子名；灌注地名网络会造成误连。',events:[
  ['海上','异域都会',['马骥'],'movement','海上→异域','城邑',8501,8504,'飓风造成非自愿进入，美貌在异域反被视为怪异。'],
  ['山村','罗刹都城',['马骥','引路村人'],'movement','异域','城邑',8518,8533,'村人引路及官员形貌展示出以丑为美的等级秩序。'],
  ['罗刹都城','村中',['马骥'],'movement','异域','村落',8573,8579,'面目之假被识破后退归村中，仕进受挫与退场相连。'],
  ['村落','海市',['马骥','村人'],'movement','异域→海市','贸易场所',8590,8595,'乘船抵达贸易节点；买卖使不同地域的来者相遇。'],
  ['海市','水国宫殿',['马骥','东洋三世子'],'movement','海市→水国异境','宫廷',8601,8615,'骑马入水与海水中分构成边界；文章才华在水国获得承认。'],
  ['水国宫殿','海岸、故家',['马骥'],'movement','水国异境→人间','家宅',8663,8672,'返乡满足奉亲需要，也使夫妻不能共居。'],
  ['故家','约定岛中，携儿女返回',['马骥','福海','龙宫'],'movement','人间与海上边界','海岛',8673,8709,'接子使亲属联系跨越边界，但不能据此补画马骥重返龙宫。']
 ]},
 {title:'席方平',question:'不断转移的申诉地点如何呈现权力阻隔？',note:'东安是人物籍贯。灌口是席方平拟赴的申诉目的地，途中先遇九王；二郎官廨的确切地理位置没有交代。不能把冥界郡邑当作阳间行政区。',events:[
  ['席家','冥间城狱',['席方平'],'movement','人间→冥界','司法场所',24503,24513,'离魂后寻父，狱门把亲属相见与司法阻隔并置。'],
  ['城隍所在邑','冥间郡司',['席方平'],'movement','冥界','司法场所',24515,24518,'越级申诉后又被批回原处，行程显出救济受阻。'],
  ['冥间郡司','原邑，继至家门',['席方平','押送役'],'movement','冥界→阳间家门', '司法押送',24518,24521,'押返体现官府控制；到家门不等于已经入家还魂。'],
  ['家门','冥府',['席方平'],'movement','阳间家门→冥界','司法场所',24521,24529,'拒绝入家而再诉，返回成为主动坚持。'],
  ['冥王堂上','火床及锯刑处，往返堂上',['席方平','二鬼'],'movement','冥界','刑罚场所',24533,24564,'反复押解把空间控制转化为肉体惩罚。'],
  ['冥府归途','村中门内，转生婴儿',['席方平','二鬼'],'movement','冥界归途→投生处','私人',24581,24595,'门阈成为被迫投生的转折点，村名与位置均未说明。'],
  ['魂行途中九王车前','二郎官廨',['席方平','二郎'],'movement','异境','司法场所',24596,24608,'九王转介促成重新审理；不把拟赴灌口当作已经到达。'],
  ['二郎官廨','席家',['席方平','席廉'],'movement','异境→人间','私人',24643,24648,'父子归家复生，以返回结束申诉。']
 ]},
 {title:'丁前溪',question:'待客与回报如何通过两地家宅展开？',note:'诸城是丁前溪籍贯，也是后段杨姓主人实际到访之地；安丘是避雨地点。丰隆描述供给丰厚，不能作地名。全篇可按人事故事理解。',events:[
  ['逃避按访途中','安丘逆旅',['丁前溪'],'movement','人间','旅宿',3130,3133,'原文只交代逃离后抵安丘，不补出这次离开的具体地点。'],
  ['安丘逆旅','杨家',['丁前溪'],'movement','人间','私人',3134,3151,'由旅宿进入家宅；撤屋茅饲畜与拒受金，使待客之义可见。'],
  ['杨家','诸城丁宅',['杨姓主人'],'movement','人间','私人',3154,3162,'饥荒促使求援，主人与客人的位置互换。'],
  ['丁宅','杨家',['杨姓主人'],'movement','人间','私人',3171,3177,'返家后才得知先前送来的资助，延迟揭示强化丁的周全。']
 ]}
];
const fingerprints={'画壁':'1c82de77','聂小倩':'56fd51f8','罗刹海市':'3fa06e83','席方平':'5ffe8e9b','丁前溪':'1fcda188'};
function resolve(chapters){const result=cases.map(c=>{const source=chapters.find(x=>x.title===c.title);if(!source)throw Error('缺少篇目：'+c.title);
 if(c.title==='黄英'){let h=2166136261;const text=JSON.stringify(source.units.map(u=>[u.id,u.text]));for(let i=0;i<text.length;i++)h=Math.imul(h^text.charCodeAt(i),16777619);if((h>>>0).toString(16)!=='69060a4e')throw Error('原文已变化，请重新核对：'+c.title);return {...c,chapterId:source.id,canonical:true,events:(source.route_steps||[]).filter(s=>s.transition_kind==='movement'||s.transition_kind==='plot').map((s,i)=>{
  const units=source.units.filter(u=>u.id>=s.unit&&u.id<=(s.unit_end??s.unit));if(!units.map(u=>u.text).join('').includes(s.quote))throw Error('原文已变化，请重新核对：'+c.title);
  return {id:c.title+':'+i,from:s.from_space||s.to_space,to:s.to_space,actors:Array.isArray(s.actors)?s.actors:String(s.actors||'').split('、'),kind:s.transition_kind==='plot'?'change':'movement',realm:s.space_realm,access:s.space_access,reading:s.interpretation,units,quote:s.quote};
 })};}
 return {...c,chapterId:source.id,events:c.events.map((e,i)=>{const [from,to,actors,kind,realm,access,start,end,reading]=e;const units=source.units.filter(u=>u.id>=start&&u.id<=end);if(!units.length||units[0].id!==start||units.at(-1).id!==end)throw Error('原文单位不匹配：'+c.title);return {id:c.title+':'+i,from,to,actors,kind,realm,access,reading,units,quote:units.map(u=>u.text).join('')};})};});for(const c of result){if(c.canonical)continue;let h=2166136261;const text=JSON.stringify(c.events.map(e=>e.units.map(u=>[u.id,u.text])));for(let i=0;i<text.length;i++)h=Math.imul(h^text.charCodeAt(i),16777619);if((h>>>0).toString(16)!==fingerprints[c.title])throw Error('原文已变化，请重新核对：'+c.title);}return result;}
const api={resolve};if(typeof module!=='undefined'){module.exports=api;return;}root.GhostReviewedCases=api;
})(typeof window==='undefined'?globalThis:window);
