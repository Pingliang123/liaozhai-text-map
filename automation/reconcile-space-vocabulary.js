'use strict';
const fs=require('node:fs'),M=require('./ghost_map_model');
const fixes=[[119,'庙'],[129,'寺'],[130,'宫']];
const terms='宫 殿 阁 楼 亭 榭 廊 庑 堂 厅 宅 院 庭 园 圃 室 房 门 户 窗 壁 墙 井 穴 洞 墓 冢 坟 寺 庙 祠 桥 厨 厕 狱 门外 门内 门前 室内 室中 庭中 院中 廊下 堂上 堂下 窗外 墙外 村外 城外 郊外 野外 林中 山中 洞中 井中 墓中 墓门 寝室 卧室 书斋 客舍 客店 茅舍 厢房 后院 前庭 宫殿'.split(' ');
function evidence(c,w){
 const out=[];
 for(const u of c.source_units){const text=u.text||'',tokens=(u.tokens||[]).map(t=>typeof t==='string'?t:text.slice(t[0],t[1]));
 if(!tokens.includes(w))continue;
 let at=-1;while((at=text.indexOf(w,at+1))>=0){const before=text.slice(Math.max(0,at-6),at),after=text.slice(at+w.length,at+w.length+5);
 // Require a locative construction; an exact token alone is insufficient.
 if(/[入出至到登临居宿归坐立卧启闭开叩扣窥踰越穿置在于於]$/.test(before)||/^(?:中|内|外|下|上|前|后|侧|旁|畔|边|里)/.test(after)||w.length>1&&/[入出至到居宿在于]$/.test(before))out.push({unit:u.unit,quote:text});
 }
 }return out;
}
function revise(c,d){const changes=[],held=[];
 for(const [id,w] of fixes)if(c.chapter_id===id&&d.places.some(p=>p.word===w)){
 d.places=d.places.filter(p=>p.word!==w);if(!d.space_words.includes(w))d.space_words.push(w);
 d.lexical_reviews['places:'+w]={status:'corrected',word:w,kind:'spaces',note:'原文场景泛称；本轮核查改为空间词。'};
 changes.push({word:w,action:'place-to-space',evidence:c.source_units.filter(u=>(u.text||'').includes(w)).map(u=>({unit:u.unit,quote:u.text}))});
 }
 for(const w of terms){if(d.space_words.includes(w)||d.places.some(p=>p.word===w))continue;const ev=evidence(c,w);if(!ev.length)continue;
 if(d.lexical_reviews['spaces:'+w]||d.lexical_reviews['places:'+w]){held.push({word:w,reason:'保留已有修订',evidence:ev});continue;}
 d.space_words.push(w);d.lexical_reviews['spaces:'+w]={status:'accepted',word:w,kind:'spaces',note:'原文独立词及处所句法核对：'+ev[0].quote};changes.push({word:w,action:'add-space',evidence:ev});
 }return {changes,held};
}
function run(){const p=JSON.parse(fs.readFileSync('data-package.json')),m=M.create(p.base);m.importDocument(JSON.parse(fs.readFileSync('manual-revisions.json')));const report={checked_chapters:m.ids.length,changes:[],held:[],policy:'保留已有人工决定；明确纠正宫、寺、庙三处；独立分词和处所句法双重匹配。'};
 for(const id of m.ids){const c=m.view(id),d=m.editable(id),r=revise(c,d);if(r.changes.length)m.save(id,d);for(const key of ['changes','held'])report[key].push(...r[key].map(x=>({chapter_id:id,chapter:c.chapter,...x})));}
 fs.writeFileSync('manual-revisions.json',JSON.stringify(m.document()));fs.writeFileSync('reports/space-vocabulary-20261022.json',JSON.stringify(report,null,2));console.log(JSON.stringify({chapters:report.checked_chapters,changes:report.changes.length,held:report.held.length}));
}if(require.main===module)run();module.exports={revise,evidence};
