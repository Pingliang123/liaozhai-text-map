'use strict';

const fs = require('node:fs');
const M = require('./ghost_map_model');

// Only entries with a stable historical identity, a clear textual parent,
// or an unambiguous relation to an existing map point are promoted here.
// Ambiguous homonyms and broad directional regions remain in the review list.
const entries = {
  '平原': { level: 'county', lon: 116.43, lat: 37.16, parent: 'place-山东', modern: '平原县区域参考', reason: '《王成》“平原故家子”；平原为山东县名。' },
  '楚中': { level: 'region', target: '楚', reason: '“楚中”是楚地中部的区域称谓，与楚区域同层参考。' },
  '济阳': { level: 'county', lon: 117.17, lat: 36.98, parent: 'place-济南府', modern: '济阳区域参考', reason: '《济阳祝村》以济阳为县名，祝村为其下属村落。' },
  '龙虎山': { level: 'natural', lon: 117.16, lat: 28.26, parent: 'place-江西', modern: '龙虎山区域参考', reason: '《雹神》“登龙虎山谒天师”；龙虎山为江西道教山岳。' },
  '淮阳': { level: 'county', lon: 114.89, lat: 33.73, parent: 'place-河南', modern: '淮阳区域参考', reason: '《叶生》“淮阳叶生”“淮阳界”；淮阳为河南陈州府属县。' },
  '沂': { level: 'prefecture', target: '沂州', reason: '篇内与沂州、沂水行旅语境相连，“沂”作沂州一带简称。' },
  '秦中': { level: 'region', target: '陕西', reason: '秦中为关中／陕西地域称谓，作为籍贯地域与陕西同区。' },
  '明湖': { level: 'natural', target: '济南', reason: '《荷花三娘子》“越城南湖”之外，明湖语境明确指济南大明湖区域。' },
  '涿': { level: 'prefecture', lon: 115.97, lat: 39.49, parent: 'place-顺天', modern: '涿州区域参考', reason: '“止于涿”指涿州一带，清代属直隶。' },
  '南岳': { level: 'natural', lon: 112.70, lat: 27.25, parent: 'place-湖南', modern: '衡山（南岳）区域参考', reason: '南岳为五岳之衡山，属湖南自然山岳。' },
  '滕邑': { level: 'county', lon: 117.16, lat: 35.10, parent: 'place-山东', modern: '滕县区域参考', reason: '“邑”在籍贯语境指县，滕邑即清代滕县。' },
  '中州': { level: 'region', target: '河南', reason: '中州为中原、河南地域的传统称谓。' },
  '保定': { level: 'prefecture', lon: 115.48, lat: 38.87, parent: 'place-直隶', modern: '保定府区域参考', reason: '“保定人”“如保定”指直隶保定府城。' },
  '无极': { level: 'county', lon: 114.98, lat: 38.26, parent: 'place-直隶', modern: '无极县区域参考', reason: '“无极黄氏”是直隶真定府属县的县籍称谓。' },
  '永年': { level: 'county', lon: 114.49, lat: 36.77, parent: 'place-广平', modern: '永年县区域参考', reason: '原文“广平、永年”并见，永年为广平府属县。' },
  '栖霞': { level: 'county', lon: 120.83, lat: 37.30, parent: 'place-登州', modern: '栖霞县区域参考', reason: '《公孙九娘》将栖霞、莱阳并列，均为登州府属县。' },
  '汉江': { level: 'natural', lon: 112.20, lat: 32.00, parent: 'place-湖北', modern: '汉江区域参考', reason: '汉江为明确自然水体，和汉水为同一水系。' },
  '泺口河': { level: 'natural', lon: 117.00, lat: 36.72, parent: 'place-黄河', modern: '黄河泺口段区域参考', reason: '泺口为济南北部黄河渡口，泺口河是黄河一段。' },
  '蒿里山': { level: 'natural', lon: 117.10, lat: 36.26, parent: 'place-泰山', modern: '泰山区域参考', reason: '蒿里山在泰山南麓，采用泰山区域参考点。' },
  '卫辉': { level: 'prefecture', lon: 114.07, lat: 35.50, parent: 'place-河南', modern: '卫辉府区域参考', reason: '《章阿端》“卫辉戚生”，卫辉为河南府级地名。' },
  '东香山': { level: 'natural', target: '青州', reason: '《孝子》明言“青州东香山”，故归入青州境内山地。' },
  '潞': { level: 'prefecture', lon: 113.10, lat: 36.20, parent: 'place-山西', modern: '潞安府区域参考', reason: '“潞之长治人”中潞指潞安府，长治为其附郭县。' },
  '长治': { level: 'county', lon: 113.12, lat: 36.20, parent: `custom-place-${encodeURIComponent('潞安')}`, modern: '长治区域参考', reason: '原文“潞之长治人”，长治为潞安府附郭县。', ensure_parent: { name: '潞安', level: 'prefecture', lon: 113.10, lat: 36.20, parent: 'place-山西', modern: '潞安府区域参考', reason: '长治的历史上级为潞安府。' } },
  '鄱阳湖': { level: 'natural', lon: 116.67, lat: 29.00, parent: 'place-饶州', modern: '鄱阳湖区域参考', reason: '《鄱阳神》“道经鄱阳湖”，为明确江西湖泊。' },
  '秦邮': { level: 'county', lon: 119.45, lat: 32.79, parent: 'place-扬州', modern: '高邮（秦邮）区域参考', reason: '秦邮为高邮别称，故事中与扬州府区域相连。' },
  '稷下': { level: 'natural', target: '临淄', reason: '稷下为齐都临淄稷门一带古地名，归入临淄区域。' },
  '齐河': { level: 'county', lon: 116.76, lat: 36.79, parent: 'place-济南府', modern: '齐河县区域参考', reason: '“济南业酒人”遣子往齐河，齐河为济南府属县。' },
  '宛平': { level: 'county', lon: 116.12, lat: 39.88, parent: 'place-顺天', modern: '宛平县区域参考', reason: '“宛平之名士”，宛平为顺天府附郭县。' },
  '岳州': { level: 'prefecture', lon: 113.13, lat: 29.37, parent: 'place-湖南', modern: '岳州府区域参考', reason: '岳州为明清府名，治巴陵，属湖湘区域。' },
  '夷陵': { level: 'county', lon: 111.30, lat: 30.70, parent: 'place-湖北', modern: '夷陵区域参考', reason: '夷陵为今宜昌一带的历史县名。' },
  '五祖山': { level: 'natural', lon: 115.95, lat: 30.08, parent: 'place-黄梅县', modern: '五祖山区域参考', reason: '五祖山在黄梅县境，为可核的山岳与寺院所在地。' },
  '秀水': { level: 'county', lon: 120.75, lat: 30.76, parent: 'place-浙江', modern: '秀水县区域参考', reason: '秀水为明清嘉兴府属县。' },
  '汉水': { level: 'natural', target: '汉江', reason: '汉水即汉江，为同一自然水体。' },
  '凤翔': { level: 'prefecture', lon: 107.40, lat: 34.52, parent: 'place-陕西', modern: '凤翔府区域参考', reason: '“至凤翔界”指陕西凤翔府辖界。' },
  '查牙山': { level: 'natural', lon: 117.55, lat: 36.75, parent: 'place-章丘', modern: '章丘境内查牙山区域参考', reason: '原文明确为“章丘查牙山”，属章丘境内山地。' },
  '养母峪': { level: 'natural', lon: 117.55, lat: 36.75, parent: 'place-章丘', modern: '章丘境内养母峪区域参考', reason: '与查牙山同篇同地理语境，归入章丘山地范围。' },
  '浙东': { level: 'region', target: '浙江', reason: '浙东是浙江东部区域称谓，作为籍贯地域而非县名。' },
  '粤东': { level: 'region', target: '广东', reason: '粤东是广东东部区域称谓，作为巡抚辖区地域。' },
  '费邑': { level: 'county', lon: 117.90, lat: 35.27, parent: 'place-沂州', modern: '费县区域参考', reason: '“邑”作县名，费邑即沂州府属费县。' },
  '兰陵': { level: 'town', lon: 117.90, lat: 35.20, parent: 'place-沂州', modern: '兰陵区域参考', reason: '“兰陵美酒”中的兰陵为沂州府区域内历史地名。' },
  '真定': { level: 'prefecture', lon: 114.56, lat: 37.90, parent: 'place-直隶', modern: '真定府区域参考', reason: '“真定守”“真定缺员”均指真定府。' },
  '陕中': { level: 'region', target: '陕西', reason: '“陕中贾某”是陕西中部地域称谓。' }
  ,'罗店': { level: 'village', lon: 118.84, lat: 35.58, parent: `custom-place-${encodeURIComponent('莒')}`, modern: '莒州罗店区域参考', reason: '原文明言“莒之罗店人”，罗店为莒地村镇。', ensure_parent: { name: '莒', level: 'prefecture', lon: 118.84, lat: 35.58, parent: 'place-山东', modern: '莒州区域参考', reason: '罗店的原文上级为莒。' } }
  ,'潍邑': { level: 'county', lon: 119.10, lat: 36.71, parent: 'place-莱州', modern: '潍县区域参考', reason: '潍邑即潍县，清代属莱州府。' }
  ,'颜镇': { level: 'town', lon: 117.86, lat: 36.50, parent: 'place-淄川', modern: '颜神镇区域参考', reason: '颜镇指颜神镇一带，采用淄川东南区域参考点。' }
  ,'苕溪': { level: 'natural', lon: 120.10, lat: 30.87, parent: 'place-湖州', modern: '苕溪（湖州）区域参考', reason: '苕溪为浙北湖州水系，原文“苕溪之东”可归入湖州区域。' }
  ,'湖襄': { level: 'region', target: '襄阳', reason: '“湖襄人”指湖广襄阳一带，采用襄阳区域参考。' }
  ,'济东': { level: 'region', target: '济南府', reason: '济东是济南以东的区域称谓，采用济南府区域参考。' }
  ,'牛头岭': { level: 'natural', target: '长治', reason: '《长治女子》以“潞之长治”为背景，牛头岭归入长治附近山地。' }
  ,'莱城': { level: 'prefecture', target: '莱州', reason: '篇内“莱城”指莱州府城一带，采用莱州参考点。' }
  ,'临邛': { level: 'county', lon: 103.46, lat: 30.41, parent: 'place-成都', modern: '临邛区域参考', reason: '诗中卓文君典故所指临邛，即今邛崃一带；标记为典故地名。' }
  ,'徐州': { level: 'prefecture', target: '彭城', reason: '《梁彦》《佟客》“徐州人”指徐州；彭城为其府城历史名称，采用同区参考。' }
  ,'滕': { level: 'county', target: '滕邑', reason: '“滕、峄并称”中的滕即滕县，与已核滕邑同地。' }
  ,'峄': { level: 'county', lon: 117.58, lat: 34.77, parent: 'place-山东', modern: '峄县区域参考', reason: '与滕并称，指清代山东峄县。' }
  ,'余杭': { level: 'county', lon: 120.30, lat: 30.42, parent: `custom-place-${encodeURIComponent('杭州府')}`, modern: '余杭县区域参考', reason: '清代余杭县属杭州府，原文“设帐于余杭”。', ensure_parent: { name: '杭州府', level: 'prefecture', lon: 120.16862, lat: 30.29412, parent: 'place-浙江', modern: '杭州府区域参考', reason: '明清杭州府领余杭、昌化等县。' } }
  ,'昌化': { level: 'county', lon: 119.22, lat: 30.23, parent: `custom-place-${encodeURIComponent('杭州府')}`, modern: '昌化县区域参考', reason: '篇内昌化为杭州府属县，不取海南同名昌化县。', ensure_parent: { name: '杭州府', level: 'prefecture', lon: 120.16862, lat: 30.29412, parent: 'place-浙江', modern: '杭州府区域参考', reason: '明清杭州府领余杭、昌化等县。' } }
  ,'泗水山': { level: 'natural', target: '泗水', reason: '“泗水山中”指泗水县附近山地，采用泗水县域参考。' }
  ,'奂山': { level: 'natural', target: '淄川', reason: '《山市》称其为“邑八景之一”，篇内邑指淄川，故归淄川县域。' }
  ,'晋中': { level: 'region', target: '山西', reason: '“晋中祖墓所在”指山西中部地域，采用山西区域参考。' }
  ,'蒙山': { level: 'natural', target: '蒙阴', reason: '篇内蒙山指沂州蒙阴境内蒙山，不取广西同名记录。' }
  ,'秦': { level: 'region', target: '陕西', reason: '“秦之世家”中的秦为陕西、关中一带古地域称谓。' }
  ,'五莲山': { level: 'natural', lon: 119.40, lat: 35.75, parent: 'place-山东', modern: '五莲山区域参考', reason: '五莲山为山东东南部山岳，篇内为寺院所在地。' }
  ,'临清': { level: 'prefecture', lon: 115.70, lat: 36.85, parent: 'place-东昌', modern: '临清州区域参考', reason: '《画马》《任秀》所指临清州，属山东东昌区域。' }
  ,'湖广': { level: 'region', lon: 112.50, lat: 29.00, parent: null, modern: '湖广区域参考', reason: '明清湖广为覆盖今湖北、湖南的历史大区，采用区域中心参考点。' }
  ,'武陵': { level: 'county', lon: 111.69, lat: 29.05, parent: `custom-place-${encodeURIComponent('湖广')}`, modern: '武陵县区域参考', reason: '“湖广武陵人”中的武陵为常德府附郭县，归入湖广历史区域。' }
  ,'武夷山': { level: 'natural', lon: 118.03, lat: 27.75, parent: 'place-福建', modern: '武夷山区域参考', reason: '武夷山为闽北明确山岳地名。' }
  ,'武夷': { level: 'natural', target: '武夷山', reason: '武夷是武夷山简称，与武夷山同地。' }
  ,'辽城': { level: 'county', target: '辽阳', reason: '篇内辽城指辽阳城，不取河南同名村。' }
  ,'恩': { level: 'county', target: '东昌', reason: '“恩”指恩县，清代属东昌府；采用东昌区域参考。' }
  ,'颜山': { level: 'natural', lon: 117.86, lat: 36.50, parent: 'place-淄川', modern: '颜神镇山地区域参考', reason: '“赴颜山贩陶器”指今博山、颜神镇一带，归入淄川东南区域。' }
  ,'中州境': { level: 'region', target: '中州', reason: '“中州境”即中州境内，采用已核中州区域参考。' }
  ,'胶莱': { level: 'region', lon: 119.80, lat: 36.50, parent: 'place-山东', modern: '胶莱区域参考', reason: '“胶莱之界”指胶州、莱州之间区域。' }
  ,'蒙沂': { level: 'region', lon: 118.28, lat: 35.75, parent: 'place-沂州', modern: '蒙沂区域参考', reason: '“蒙沂之间”指蒙山、沂水之间，归入沂州区域。' }
  ,'吴下': { level: 'region', target: '苏州', reason: '吴下是苏州一带传统地域称谓，采用苏州参考点。' }
  ,'泾河': { level: 'natural', lon: 108.70, lat: 34.50, parent: 'place-陕西', modern: '泾河区域参考', reason: '篇内“泾河之侧”为明确自然河流。' }
  ,'吴江府': { level: 'county', target: '吴江', reason: '原文误称“吴江府”，实际指吴江县一带，保留原词并关联吴江。' }
  ,'海岱门': { level: 'town', target: '京', reason: '海岱门为京师城门，归入京城区域。' }
  ,'高苑': { level: 'county', lon: 117.74, lat: 37.20, parent: 'place-山东', modern: '高苑县区域参考', reason: '原文与博兴并见，高苑为山东旧县，采用相邻县域参考点。' }
  ,'岭南': { level: 'region', lon: 112.00, lat: 23.00, parent: null, modern: '岭南区域参考', reason: '岭南是广东、广西一带的大区域称谓，采用区域中心参考点。' }
  ,'吕宋国': { level: 'region', lon: 121.00, lat: 14.60, parent: null, modern: '吕宋区域参考', reason: '吕宋国为海外国家地名，约当今菲律宾吕宋岛。' }
  ,'浙界': { level: 'region', target: '浙江', reason: '“其地乃浙界”指浙江边界区域，采用浙江区域参考。' }
  ,'古迹岛': { level: 'natural', target: '东海', reason: '原文明言“东海古迹岛”，具体岛址未详，采用东海海域参考点。' }
  ,'桃花江': { level: 'natural', target: '楚', reason: '原文“楚中桃花江一带”，具体河段未详，采用楚中区域参考。' }
  ,'红花埠': { level: 'town', target: '沂州', reason: '《莲香》以沂州人桑生设馆红花埠，采用沂州区域参考点。' }
  ,'遵化': { level: 'county', lon: 117.96, lat: 40.19, parent: 'place-直隶', modern: '遵化区域参考', reason: '“为遵化道”所涉遵化为直隶州县地域；官职词“道”另行剥离。' }
  ,'中国': { level: 'region', lon: 104.00, lat: 35.00, parent: null, modern: '中国区域参考', reason: '篇内与夜叉国、罗刹海市等异域相对，指中土整体，采用大区域参考点。' }
  ,'中华': { level: 'region', target: '中国', reason: '《罗刹海市》中中华与中国同指中土世界。' }
  ,'中原': { level: 'region', lon: 113.50, lat: 34.50, parent: 'place-河南', modern: '中原区域参考', reason: '“我中原才子”指河南及其周边中原地域。' }
  ,'河北': { level: 'region', lon: 115.00, lat: 38.00, parent: null, modern: '河北地域参考', reason: '篇内泛指黄河以北地域，采用宏观区域参考点，不等同单一县府。' }
  ,'云贵': { level: 'region', lon: 104.00, lat: 26.00, parent: null, modern: '云贵区域参考', reason: '“解饷云贵间”指云南、贵州两省合称区域。' }
  ,'辽东': { level: 'region', target: '辽阳', reason: '“辽东兵饷”“辽东名士”指辽东区域，采用辽阳区域参考。' }
  ,'江淮': { level: 'region', lon: 118.00, lat: 32.00, parent: null, modern: '江淮区域参考', reason: '“江淮间”指长江、淮河之间的大区域。' }
  ,'满洲': { level: 'region', lon: 125.00, lat: 44.00, parent: null, modern: '满洲区域参考', reason: '篇内为民族兼地域称谓，采用东北大区域参考点。' }
  ,'剑南': { level: 'region', target: '成都', reason: '剑南为四川剑阁以南历史区域，采用成都区域参考。' }
  ,'江浙': { level: 'region', lon: 120.00, lat: 30.50, parent: null, modern: '江浙区域参考', reason: '江浙指江苏、浙江一带的大区域。' }
  ,'淮上': { level: 'region', lon: 117.00, lat: 33.00, parent: null, modern: '淮河流域参考', reason: '“淮上贡士”指淮河沿岸地域。' }
  ,'泗上': { level: 'region', target: '泗水', reason: '“至泗上”指泗水之滨一带，采用泗水县域参考。' }
  ,'淮': { level: 'natural', lon: 117.00, lat: 33.00, parent: null, modern: '淮河流域参考', reason: '“设帐于淮”指淮河流域，采用河流区域参考点。' }
  ,'江汉': { level: 'region', lon: 112.50, lat: 30.00, parent: 'place-湖北', modern: '江汉区域参考', reason: '“江汉之间”指长江、汉水流域。' }
  ,'南中': { level: 'region', lon: 104.00, lat: 25.50, parent: null, modern: '南中区域参考', reason: '南中为西南地区传统大区域称谓。' }
  ,'交州': { level: 'region', lon: 105.85, lat: 21.03, parent: null, modern: '交州区域参考', reason: '《夜叉国》中为商人籍贯，指古代岭南至交趾区域。' }
  ,'交南': { level: 'region', lon: 105.85, lat: 21.03, parent: null, modern: '交南区域参考', reason: '交南指交趾以南地域，采用交州区域参考点。' }
  ,'朝鲜': { level: 'region', lon: 127.50, lat: 39.00, parent: null, modern: '朝鲜区域参考', reason: '“使朝鲜”指境外国家，作为跨境行旅地点保留。' }
  ,'中都': { level: 'county', lon: 116.49, lat: 35.73, parent: 'place-济宁', modern: '中都（汶上）区域参考', reason: '篇内中都按明清山东汶上旧称处理，采用济宁府区域内参考点。' }
};

function sourceFor(target) {
  return target?.source_url || 'https://chgis.hudci.org/tgaz/';
}

function apply(pack, doc) {
  const model = M.create(pack.base);
  model.importDocument(doc);
  const changes = [], held = [];

  for (const [word, spec] of Object.entries(entries)) {
    const current = doc.place_locations.find(row => row.name === word);
    if (current && Number.isFinite(current.lon) && Number.isFinite(current.lat)) {
      changes.push({word, relation: 'already-reviewed', location: current, chapters: []});
      continue;
    }
    const chapters = model.ids.map(id => model.view(id)).filter(chapter => chapter.places.some(place => place.word === word));
    if (!chapters.length) { held.push({word, reason: '当前资料中没有可核对的篇目地点记录'}); continue; }

    if (spec.ensure_parent && !pack.base.places.some(place => place.id === `custom-place-${encodeURIComponent(spec.ensure_parent.name)}` || place.name === spec.ensure_parent.name)) {
      pack.base.places.push({id: `custom-place-${encodeURIComponent(spec.ensure_parent.name)}`, name: spec.ensure_parent.name, admin_level: spec.ensure_parent.level, parent_id: spec.ensure_parent.parent, lon: spec.ensure_parent.lon, lat: spec.ensure_parent.lat, modern_name: spec.ensure_parent.modern, region_description: spec.ensure_parent.reason, modern_level: '历史文本区域参考', coordinate_kind: 'approximate', source_url: 'https://chgis.hudci.org/tgaz/', note: spec.ensure_parent.reason});
    }
    let target = spec.target ? model.places().find(place => place.name === spec.target) : null;
    const location = {
      name: word,
      admin_level: spec.level,
      parent_id: spec.parent || (target ? target.id : null),
      modern_name: spec.modern || `${spec.target}区域参考`,
      region_description: spec.reason,
      modern_level: '历史文本区域参考',
      coordinate_kind: 'approximate',
      lon: spec.lon ?? target?.lon,
      lat: spec.lat ?? target?.lat,
      source_url: sourceFor(target),
      note: `${spec.reason} 此坐标用于文本地理关联，不表示精确考古坐标。`
    };
    if (!Number.isFinite(location.lon) || !Number.isFinite(location.lat)) { held.push({word, reason: '仍缺少可复核的参考坐标'}); continue; }
    try {
      model.saveLocation(location);
    } catch (error) {
      throw new Error(`${word}: ${error.message}`);
    }
    changes.push({word, relation: spec.target ? 'same-reference-area' : 'within-reference-region', location, chapters: chapters.map(chapter => ({chapter_id: chapter.chapter_id, chapter: chapter.chapter, quotes: chapter.source_units.filter(unit => unit.text.includes(word)).map(unit => unit.text)}))});
  }
  // Carry every other place-like item from the DeepSeek review into the
  // report. This is deliberate: “仍待核” is a visible research result, not
  // an omission, and it prevents a later run from silently dropping rows.
  const sourcePath = 'reports/unmapped-changes-20261021.json';
  if (fs.existsSync(sourcePath)) {
    const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
    const currentPlaceWords = new Set(model.ids.flatMap(id => model.view(id).places.map(place => place.word)));
    const locatedWords = new Set(model.places().filter(place => Number.isFinite(place.lon) && Number.isFinite(place.lat)).map(place => place.name));
    for (const row of source.unchanged || []) {
      const decision = row.decision || {};
      if (!['place','region','natural','village','town'].includes(decision.kind) || Object.hasOwn(entries, row.word) || locatedWords.has(row.word) || !currentPlaceWords.has(row.word)) continue;
      if (!held.some(item => item.word === row.word)) held.push({word: row.word, reason: decision.reason || '同名、泛称或原文证据不足，暂不定位'});
    }
  }
  return {revisions: model.document(), changes, held};
}

if (require.main === module) {
  const pack = require('../data-package.json');
  const before = require('../manual-revisions.json');
  const result = apply(pack, before);
  pack.revisions = result.revisions;
  for (const change of result.changes) {
    const target = entries[change.word]?.target || change.word;
    if (change.relation !== 'already-reviewed') pack.base.place_equivalences = [...(pack.base.place_equivalences || []).filter(row => row.word !== change.word), {word: change.word, target, relation: change.relation, source: '原文逐条复核', note: change.location.region_description}];
    const existing = pack.base.places.find(place => place.name === change.word);
    const record = {...change.location, id: existing?.id || `custom-place-${encodeURIComponent(change.word)}`};
    if (existing) Object.assign(existing, record);
    else pack.base.places.push(record);
  }
  fs.writeFileSync('data-package.json', JSON.stringify(pack));
  fs.writeFileSync('manual-revisions.json', JSON.stringify(result.revisions));
  fs.writeFileSync('reports/reviewed-remaining-places-20261021.json', JSON.stringify({generated_at: new Date().toISOString(), ...result, remaining_source: 'reports/unmapped-changes-20261021.json'}, null, 2));
  console.log(`Reviewed remaining places: changed ${result.changes.length}, held ${result.held.length}`);
}

module.exports = {entries, apply};
