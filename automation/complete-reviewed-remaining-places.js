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
    for (const row of source.unchanged || []) {
      const decision = row.decision || {};
      if (!['place','region','natural','village','town'].includes(decision.kind) || Object.hasOwn(entries, row.word)) continue;
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
    pack.base.place_equivalences = [...(pack.base.place_equivalences || []).filter(row => row.word !== change.word), {word: change.word, target, relation: change.relation, source: '原文逐条复核', note: change.location.region_description}];
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
