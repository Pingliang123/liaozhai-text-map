'use strict';
const C = require('../assets/path-columns');
const R = require('../assets/spatial-routes');
const CORE = new Set('室 房 屋 堂 庭 廊 院 宅 门 寺 庙 殿 书斋 卧室 寝室 闺房 厅 公堂 官署 客店 旅舍 山寺 园中 庭中 室中 门外 门内 窗下 床上 床下 山中 郊野 旷野 幽谷 舟中 船中 河边 墓地'.split(' '));
const AMBIGUOUS = new Set('田 市 谷 井 肆 庄 几 内 外 前 后 侧 底 里 山'.split(' '));
const BOUNDARY = new Set('门 门内 门外 窗 窗下 地上 床上 床下 榻上'.split(' '));
const escape = word => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const actors = value => new Set(String(value || '').split(/[、，,；;]/u).filter(Boolean));
function createChapterContext(chapter, geographicNames = new Set()) {
 const units = chapter.source_units || [];
 const tokenRows = R.tokenUnits(chapter, R.lexicon(chapter));
 const names = new Set(chapter.places.map(p => p.word));
 const spaces = new Set([...(chapter.space_words || []), ...CORE].filter(w => !AMBIGUOUS.has(w)));
 const people = new Set((chapter.people || []).map(p => p.word));
 let cursor = 0, setting = null, region = null;
 function spatialTokens(text, tokens) {
  return [...new Set(tokens.filter(w => (spaces.has(w) || names.has(w)) && text.includes(w)))];
 }
 function roleMatches(text, tokens, verbs) {
  return spatialTokens(text, tokens).filter(word => new RegExp('(?:' + verbs + ')(?:于|於|其|此|一)?' + escape(word), 'u').test(text));
 }
 function realm(word) {
  const found = [...new Set((chapter.realm_evidence || []).filter(e => e.space === word).map(e => e.realm).filter(v => ['人间','天界','地界'].includes(v)))];
  return found.length === 1 ? found[0] : geographicNames.has(word) ? '人间' : '';
 }
 function regionIn(unit, tokens) {
  if(tokens.some(w=>['天界','地界'].includes(realm(w)))) { region = null; return; }
  const found = [...new Set(tokens.filter(w => names.has(w) && geographicNames.has(w)))];
  const locative = roleMatches(unit.text, tokens, '至|抵|赴|往|入|到|居|住|宿|寓|莅任').filter(w=>found.includes(w));
  const opening = units.slice(0,3).some(u=>u.unit===unit.unit);
  if(!opening&&!locative.length)return;
  if(/自言|籍贯|祖籍|故里|同乡|缺一|欲|拟|愿/u.test(unit.text)&&!opening)return;
  if(found.length === 1) region = {word:found[0],unit:unit.unit,quote:unit.text};
  else if(found.length > 1) {
   const arrival = roleMatches(unit.text, tokens, '至|抵|赴|往|入|到').filter(w => found.includes(w));
   region = arrival.length === 1 ? {word:arrival[0],unit:unit.unit,quote:unit.text} : null;
  }
 }
 function advance(unit, tokens) {
  regionIn(unit, tokens);
  if(/远行|远游|出境|迁居|徙居|渡海|出海|飞去|不知所往|不知所之/u.test(unit.text)) setting = null;
  const destinations = roleMatches(unit.text, tokens, '至|抵|赴|往|入|到|居|住|宿|寓|坐|卧|留|停');
  if(destinations.length !== 1 || BOUNDARY.has(destinations[0])) return;
  const word = destinations[0];
  setting = {word,unit:unit.unit,quote:unit.text,actors:new Set(tokens.filter(w => people.has(w))),realm:realm(word)};
 }
 return function complete(values, row) {
  const position = units.findIndex(u => u.unit === row.source_event?.unit);
  if(position < 0) return;
  while(cursor < position) { advance(units[cursor], tokenRows[cursor] || []); cursor++; }
  const col = name => C.headers.indexOf(name), notes = [];
  const quote = String(row.quote || ''), currentTokens = [...new Set((tokenRows[position] || []).filter(w => quote.includes(w)))];
  const currentActors = actors(row.actors);
  if(/半年|经年|数月|数年|他日|翌日|明日|明年|次年|越[一二三四五六七八九十数]+日/u.test(quote))setting=null;
  const shared = setting && [...currentActors].some(a => setting.actors.has(a));
  const sceneMatch = setting && String(row.space || '') .includes(setting.word);
  const sameUnit = setting && setting.unit === units[position].unit;
  const localContinuation = setting && (shared || sceneMatch || sameUnit);
  function fill(role, word, evidence, kind) {
   if(!word || values[col(role + '空间')]) return;
   values[col(role + '空间')] = word;
   notes.push(role + '空间' + kind + '「' + word + '」，原文单元' + evidence.unit + '「' + evidence.quote + '」');
  }
  for(const [role,verbs] of [['出发','自|从|出|离'],['到达','至|抵|赴|往|入|到'],['停留','居|住|宿|寓|坐|卧|留|停']]) {
   const found = roleMatches(quote, currentTokens, verbs);
   if(found.length === 1) fill(role, found[0], {unit:units[position].unit,quote}, '据原句动词补入');
  }
  if(row.has_movement && localContinuation) fill('出发',setting.word,setting,'承接此前场所推定');
  if(!row.has_movement && row.transition_kind !== 'mention' && localContinuation && !/迁居|徙居|渡海|出境|飞去/u.test(quote)) {
   fill('停留',setting.word,setting,'承接连续场景推定');
  }
  const previousRegion = region;
  regionIn(units[position], tokenRows[position] || []);
  for(const role of ['出发','到达','停留']) {
   const word = values[col(role + '空间')]; if(!word) continue;
   const world = values[col(role + '世界分类')] || realm(word) || (setting && setting.word === word ? setting.realm : '');
   if(!values[col(role + '世界分类')] && world) values[col(role + '世界分类')] = world;
   const roleRegion = geographicNames.has(word) ? {word,unit:units[position].unit,quote} : role === '出发' ? previousRegion : region;
   if(!values[col(role + '空间所在地点')] && roleRegion && !['天界','地界'].includes(world)) {
    const event = row.source_event || {}, key = {出发:'from',到达:'to',停留:'space'}[role];
    if(event[key + '_realm'] === '异境') continue;
    values[col(role + '空间所在地点')] = roleRegion.word;
    if(!world) values[col(role + '世界分类')] = '人间';
    notes.push(role + '所在地承接原文地名「' + roleRegion.word + '」，单元' + roleRegion.unit + '「' + roleRegion.quote + '」');
   }
  }
  const destination = values[col('到达空间')], stay = values[col('停留空间')];
  const active = destination && !destination.includes('、') ? destination : !row.has_movement && stay && !stay.includes('、') ? stay : '';
  if(active && !BOUNDARY.has(active)) {
   if(quote.includes(active)) setting = {word:active,unit:units[position].unit,quote,actors:currentActors,realm:values[col(destination?'到达世界分类':'停留世界分类')]||realm(active)};
   else if(setting && active === setting.word) setting.actors = new Set([...setting.actors,...currentActors]);
  } else if(row.has_movement) setting = null;
  if(notes.length) {
   values[col('分类依据')] += '。按整篇情节及人物场景连续性补充，见双端证据';
   values[col('双端证据')] += '；' + notes.join('；');
  }
 };
}
module.exports = {createChapterContext};
