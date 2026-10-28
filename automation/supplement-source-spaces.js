'use strict';
// Concrete spatial expressions, not geographic names. Literal spelling is retained.
const compounds=`狱门 狱中 牢狱 牢中 牢门 监狱 囹圄 官廨 公堂 大堂 堂上 堂下 堂前 东墀 西墀 阶下 阶前 庭下 庭中 庭前 后庭 前庭 中庭 庭院 院中 院内 院外 前院 后院 北院 南院 东院 西院 荒庭 荒圃 花圃 菊圃 菊畦 花畦 花园 园中 园内 园外 园门 园林 亭园 亭台 亭中 亭下 亭内 亭外 宅中 宅内 宅外 宅院 家中 家门 门中 门内 门外 门前 门后 门下 门侧 门阈 门庭 门楼 门洞 门径 门口 门边 屋中 屋内 屋外 屋下 屋后 屋前 屋顶 屋檐 屋簷 簷下 檐下 簷前 檐前 簷间 檐间 窗下 窗前 窗外 窗内 窗中 户外 户内 户下 墙内 墙外 墙下 墙头 墙上 墙边 壁间 壁中 壁上 壁内 壁外 室中 室内 室外 室后 内室 外室 寝室 卧室 小室 密室 闺中 闺房 闺阁 斋中 书斋 书室 书房 房中 房内 房外 房前 房后 客房 客舍 客店 旅舍 旅店 逆旅 旅邸 客邸 旅馆 茅舍 茅屋 草堂 茅庐 茅茨 旧居 故居 寓所 居所 南第 北第 东第 西第 甲第 府第 府邸 宅第 楼中 楼上 楼下 楼头 楼前 楼阁 楼舍 廊下 廊中 廊内 回廊 长廊 曲廊 走廊 廊庑 庑下 庑中 厢房 东厢 西厢 后堂 前堂 内堂 正堂 厅堂 殿中 殿内 殿外 殿上 殿下 殿前 殿后 大殿 宫中 宫内 宫外 宫门 宫殿 学宫 寺中 寺内 寺外 寺门 寺前 寺院 寺庙 庙中 庙内 庙外 庙门 庙前 庙后 庙宇 祠中 祠内 祠下 祠堂 宗祠 兰若 道观 庵中 庵内 庵外 僧舍 僧房 禅房 禅室 塔下 塔中 衙门 官署 县署 郡署 学署 书院 试场 考场 市中 市上 市内 市外 市集 市井 街中 街上 街头 街市 街巷 巷中 巷内 巷口 巷外 店中 店内 店外 店门 店肆 酒肆 酒楼 酒店 茶肆 花肆 药肆 典肆 城中 城内 城外 城门 城下 城上 城头 城郭 郡城 县城 邑中 邑城 村中 村内 村外 村头 村口 村舍 北村 南村 东村 西村 郊外 郊野 野外 荒野 旷野 原野 林中 林下 林内 林外 树下 树上 桑下 竹林 丛中 草中 山中 山内 山外 山下 山上 山前 山后 山顶 山谷 山麓 山腰 山腹 山洞 洞中 洞内 洞外 洞口 洞门 洞府 石室 穴中 穴内 穴外 穴口 崖下 崖上 谷中 谷口 溪边 溪上 溪中 水中 水上 水下 水底 水面 江中 江上 江边 江岸 河中 河上 河下 河边 河岸 河畔 河底 池中 池上 池边 池内 池畔 海中 海上 海内 海外 海边 海底 湖中 湖上 湖边 湖畔 舟中 舟内 舟上 舟前 船中 船内 船上 船头 船尾 舱中 舱内 岸上 岸边 桥下 桥上 桥头 路中 路上 路旁 路侧 路边 路口 道中 道旁 道侧 道左 途中 墓中 墓内 墓外 墓前 墓下 墓地 坟中 坟内 坟前 坟墓 坟地 冢中 冢内 棺中 棺内 井中 井内 井下 井底 井边 灶下 灶中 床上 床下 榻上 榻下 帐中 帐内 帘内 帘外 帘下 幕中 幕内 屏后 槛外 槛内 槛前 篱下 篱外 篱内 墙隅 屋隅 室隅 庙隅 堂隅 庭隅 座间 席间 田间 田中 地府 冥府 阴司 阴曹 冥司 冥界 阳间 阳界 阴间 地下 天上 天宫 龙宫 天庭 幽冥 阎罗殿 阎摩殿 奈河边`.split(/\s+/u);
const compact=s=>String(s||'').replace(/\s/gu,'');
const Routes=require('../assets/spatial-routes');
function blocked(c,word){
 if((c.places||[]).some(p=>p.word===word)||(c.people||[]).some(p=>p.word===word))return true;
 return Object.entries(c.lexical_reviews||{}).some(([key,r])=>{
  const original=key.slice(key.indexOf(':')+1);
  return (original===word||r.word===word)&&(r.status==='rejected'||['accepted','corrected'].includes(r.status)&&(r.kind!=='spaces'||r.word!==word));
 });
}
function plan(c){
 const lex=Routes.lexicon(c),units=c.source_units,source=compact(units.map(u=>u.text).join(''));
 const tokens=String(c.segmentation_note||'').split(/[\s/|]+/u).filter(Boolean),aligned=tokens.length>0&&tokens.join('')===source;
 const before=new Set(c.space_words||[]),candidates=[...new Set([...compounds,...before])].filter(w=>w.length>1&&!blocked(c,w)).sort((a,b)=>b.length-a.length);
 // Protect complete existing place/person tokens from substring splitting (e.g. 城隍庙人).
 const protectedWords=new Set([...(c.places||[]),...(c.people||[])].map(p=>p.word));
 const spans=[],ranges=[];let offset=0;
 for(const t of tokens){ranges.push({word:t,start:offset,end:offset+t.length});offset+=t.length;}
 for(const w of protectedWords){let at=source.indexOf(w);while(w&&at>=0){spans.push([at,at+w.length]);at=source.indexOf(w,at+1);}}
 // Do not merge away an already annotated standalone space/time token.
 for(const r of ranges)if(before.has(r.word)||Object.hasOwn(c.years||{},r.word))spans.push([r.start,r.end]);
 const occupied=[],hits=[];
 for(const word of candidates){let at=source.indexOf(word);while(at>=0){const end=at+word.length;
  const context=source.slice(Math.max(0,at-4),end+8),literal=word==='殿下'?/[立跪坐伏至入出在于於]殿下/u.test(context):word==='门下'?/[立坐卧跪]于?门下/u.test(context):word==='堂上'?!/堂上(?:二老|二亲|双亲|父母)/u.test(context):true;
  if(literal&&!spans.some(([a,b])=>at<b&&end>a)&&!occupied.some(([a,b])=>at<b&&end>a)&&(aligned||lex.words.has(word))){occupied.push([at,end]);hits.push({word,start:at,end});}
  at=source.indexOf(word,at+1);
 }}
 let segmentation=c.segmentation_note,boundaries=[];
 if(aligned){const bounds=new Set([0,source.length]);let at=0;for(const t of tokens)bounds.add(at+=t.length);
  for(const h of hits.filter(h=>h.start!==undefined)){
   const removed=[...bounds].filter(b=>b>h.start&&b<h.end),added=[h.start,h.end].filter(b=>!bounds.has(b));
   if(removed.length||added.length){boundaries.push({word:h.word,before:ranges.filter(r=>r.start<h.end&&r.end>h.start).map(r=>r.word).join(' / '),start:h.start,end:h.end});for(const b of removed)bounds.delete(b);for(const b of added)bounds.add(b);}
  }
  if(boundaries.length){const ordered=[...bounds].sort((a,b)=>a-b),ends=new Set();let n=0;for(const u of units)ends.add(n+=compact(u.text).length);
   segmentation=ordered.slice(1).map((end,i)=>source.slice(ordered[i],end)+(end===source.length?'':ends.has(end)?'\n':' / ')).join('');
   if(compact(segmentation.split(/[\s/|]+/u).join(''))!==source)throw Error('分词不能改写原文');
  }
 }
 const finalTokens=aligned?new Set(segmentation.split(/[\s/|]+/u).filter(Boolean)):lex.words;
 const additions=[...new Set(hits.map(h=>h.word))].filter(w=>!before.has(w)&&finalTokens.has(w));
 return {additions,boundaries,segmentation,aligned};
}
function apply(){const fs=require('node:fs'),crypto=require('node:crypto'),M=require('./ghost_map_model'),doc=JSON.parse(fs.readFileSync('manual-revisions.json','utf8')),pkg=JSON.parse(fs.readFileSync('data-package.json','utf8')),m=M.create(pkg.base);m.importDocument(doc);const report={date:'2026-10-28',before_sha256:crypto.createHash('sha256').update(JSON.stringify(doc)).digest('hex'),policy:'补充原文中的具体空间词；仅调整分词边界，保留原字及已有分类决定。无空间归属推断。',chapters:[]};
 for(const id of m.ids){const c=m.view(id),p=plan(c);if(!p.additions.length&&!p.boundaries.length)continue;let entry=doc.overrides.find(e=>e.chapter_id===id);if(!entry){entry={chapter_id:id,changes:m.editable(id)};doc.overrides.push(entry);}entry.changes.space_words=[...new Set([...(entry.changes.space_words||c.space_words),...p.additions])];if(p.boundaries.length)entry.changes.segmentation_note=p.segmentation;
  report.chapters.push({id,title:c.chapter,additions:p.additions.map(word=>({word,quote:c.source_units.find(u=>u.text.includes(word))?.text})),boundary_changes:p.boundaries,aligned:p.aligned});
 }
 report.additions=report.chapters.reduce((n,c)=>n+c.additions.length,0);report.boundary_changes=report.chapters.reduce((n,c)=>n+c.boundary_changes.length,0);
 if(process.argv.includes('--apply'))fs.writeFileSync('manual-revisions.json',JSON.stringify(doc));
 fs.writeFileSync('reports/concrete-space-supplement-20261028.json',JSON.stringify(report,null,2));console.log(JSON.stringify({apply:process.argv.includes('--apply'),chapters:report.chapters.length,additions:report.additions,boundary_changes:report.boundary_changes}));return report;
}
if(require.main===module)apply();module.exports={plan,blocked,compounds};
