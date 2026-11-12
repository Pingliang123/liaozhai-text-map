'use strict';
const fs=require('node:fs'),M=require('./ghost_map_model'),R=require('../assets/spatial-routes'),E=require('./export-spatial-paths');
const pack=require('../data-package.json'),model=M.create(pack.base);model.importDocument(pack.revisions);
const dictionary=new Set(model.ids.flatMap(id=>model.view(id).space_words||[]).filter(w=>w.length>=2&&/(?:室|房|庙|寺|廊|堂|阁|楼|院|门|亭|狱|祠|墓|冢|谷|野|洞|城外|城中|村外|村中|山中|河边)$/u.test(w)));
const candidates=[];
for(const id of model.ids){const c=model.view(id),known=new Set([...(c.space_words||[]),...c.places.map(p=>p.word)]),units=c.source_units||[],tokens=R.tokenUnits(c,R.lexicon(c));
 for(const word of dictionary){if(known.has(word))continue;const reviews=Object.values(c.lexical_reviews||{});if(reviews.some(r=>r.word===word&&r.status==='rejected'))continue;
  const matches=units.filter((u,i)=>(tokens[i]||[]).includes(word));if(matches.length)candidates.push([id+1,c.chapter,word,'空间候选',matches.map(u=>u.text).join('；'),'与全书已用空间词相同且为原文完整分词；尚须核对本篇具体语义，未自动写入词库']);
 }
}
fs.writeFileSync('reports/全書空間漏詞候選.csv',E.toCsv([['篇号','篇名','候选词','类别','原文','核查说明'],...candidates]));
fs.writeFileSync('reports/全書空間路徑核查说明.md','# 全书空间路径补充核查\n\n覆盖491篇、7222个已有步骤，保持25栏结构。空间词只使用已分词且本步引句可核对的词项。所在地可承接前文最近的唯一地名；同一原文单元出现多个地名、明确异境或无法定位原文位置时保留空白。\n\n使用方式仅对卧室、寝室、闺房、床榻、官署、公堂、街市、深山、郊野等用途明确的词项补充推定，并写入证据栏。未补造原文没有交代的移动端点。\n\n本轮以程序完成全书原文单元、分词和既有标注的交叉检查，并非逐句人工精读。重新扫描发现'+candidates.length+'项篇内可能漏标的空间候选，均附原句，另存《全書空間漏詞候選.csv》；这些候选尚未完成语义复核，未自动混入已确认词库。已有人工修订未改写。\n');
console.log('全书原文分词扫描：'+candidates.length+'项待语义复核的空间漏词候选。');
