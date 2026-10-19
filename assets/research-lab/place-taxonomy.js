(function(root){'use strict';
// Explicit, reviewable lists. Do not infer category merely from a suffix.
const groups={
 building:{reason:'建筑、居所、园林或设施空间，包括有专名的建筑',words:'柳沟寺 旧寺 菩陀寺 兴福寺 朝天观 贝勒府 仪宾府 青帝庙 斋门 何氏园 十王殿 相公祠 香水月寺 李氏废园 李氏园 城隍祠 土地祠 寺门 圣庙 灵寝 大佛寺 天齐庙 城隍庙 停柩寺 大士祠 王第 离宫 殡宫 大佛阁 毛公佳城 萧寺 郭岳庙 义虎祠 东郭岳庙 育婴堂 水月寺 绰然堂 东四司 醴泉寺 村寺 香普陀寺 姜部郎第 废第 于氏殡宫 蛇佛寺 观音祠 邑泮 山神祠 关庙 岳庙 聂政之墓 香黑帝祠 后宰门 野寺 匡山僧寺 梅姑祠 蒙山寺 五莲山寺 晋邸 郡庠 阜城门 天宁寺 勾栏 李皇亲园 皇亲园 报国寺 梓潼祠 王府 金沙寺 伏虎寺 圣后府 玄帝观 亢氏第 大圣祠 郡狱 吴王庙 海岱门 左车祠 雹神李左车祠 关圣祠 祠 澹台子羽祠 世家园 兰若 下清宫 上苑 苑 旧圃 故宅 梅花馆 魁星楼 肃府 衡府'.split(' ')},
 relative:{reason:'相对位置、场景通称或未具体命名的地域',words:'村外 山村 村落 郊外 乡中 予乡 关 内城 北岸 北边 北邻 北里 南郊 东郊 城东 城南 城市 县 别村 近村 邻村 某村 北村 南村 东村 西村 城北村 都中 都北 都城 都 郡城 邑城 邑中 贵邑 敝里 里 里中 里落 里门 故乡 桑梓 海上 海外 海滨 湖东 河滨 河干 岛 岛岸 大岛 大山 涧谷 苍林 绝壑巉岩 西南山 西道 西邑 西土 西塞 北塞 北地 边 边外 塞上 竹桥之西 莲峰下 镇之南山 御沟 柳堤 水关 文场 古战场 五都之市 罗家 墓 郊路 谷口'.split(' ')},
 realmGeneric:{reason:'世界层次或泛称，不是具体命名的地点',words:'人间 尘世 地下 异域'.split(' ')},
 excluded:{reason:'当前引句指官职、人物名或残片，不纳入两类空间关系',words:'吏部 铨司 江臬 龙宫 新'.split(' ')}
};
const index=new Map();for(const [type,g]of Object.entries(groups))for(const word of g.words)index.set(word,{type,word,category:type==='excluded'?'excluded':'space',reason:g.reason});
function classify(word){return index.get(word)||{word,category:'place',type:'retained',reason:'保留地名或命名异境候选；可结合篇目继续核查'};}
const api={groups,classify};if(typeof module!=='undefined')module.exports=api;else root.GhostPlaceTaxonomy=api;
})(typeof window==='undefined'?globalThis:window);
