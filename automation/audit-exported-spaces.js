'use strict';
const fs=require('node:fs'),M=require('./ghost_map_model'),R=require('../assets/spatial-routes'),E=require('./export-spatial-paths');
function parseCsv(text){
 const rows=[];let row=[],cell='',quoted=false;
 for(let i=0;i<text.length;i++){
  const ch=text[i];if(i===0&&ch==='\ufeff')continue;
  if(ch==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}
  else if(ch===','&&!quoted){row.push(cell);cell='';}
  else if((ch==='\r'||ch==='\n')&&!quoted){if(ch==='\r'&&text[i+1]==='\n')i++;row.push(cell);rows.push(row);row=[];cell='';}
  else cell+=ch;
 }
 if(quoted)throw new Error('CSV 引号未闭合');
 if(cell||row.length){row.push(cell);rows.push(row);}return rows;
}
function audit(input='reports/聊齋空間路徑_場景核對補全.csv'){
 const pack=require('../data-package.json'),model=M.create(pack.base);model.importDocument(pack.revisions);
 const [header,...rows]=parseCsv(fs.readFileSync(input,'utf8')),out=[],issues=[];
 const chapters=new Map(model.ids.map(id=>{const c=model.view(id);return [id+1,{chapter:c,source:(c.source_units||[]).map(u=>u.text||'').join(''),lex:R.lexicon(c)}];}));
 for(const row of rows){
  if(row.length!==header.length)throw new Error('CSV 栏数异常');
  const record=Object.fromEntries(header.map((h,i)=>[h,row[i]])),data=chapters.get(Number(record.篇号));
  if(!data||data.chapter.chapter!==record.篇名)throw new Error('篇号与篇名不一致');
  for(const field of ['出发空间','到达空间','停留空间'])for(const word of record[field].split('、').filter(Boolean)){
   const present=data.source.includes(word),token=data.lex.words.has(word),unit=(data.chapter.source_units||[]).find(u=>String(u.text||'').includes(word));
   const result=[record.篇号,record.篇名,record.步骤,field,word,present?'是':'否',token?'是':'否',unit?.unit??'',unit?.text||''];
   out.push(result);if(!present||!token)issues.push(result);
  }
 }
 const headings=['篇号','篇名','步骤','字段','空间词','同篇全文出现','完整分词出现','原文单元','原文证据'];
 fs.writeFileSync('reports/匯出空間詞全文核對.csv',E.toCsv([headings,...out]).replace(/\r\n/gu,'\n'));
 fs.writeFileSync('reports/匯出空間詞全文核對異常.csv',E.toCsv([headings,...issues]).replace(/\r\n/gu,'\n'));
 const summary={input,chapters:chapters.size,steps:rows.length,occurrences:out.length,uniqueChapterWords:new Set(out.map(r=>r[0]+'\t'+r[4])).size,missingFromText:issues.filter(r=>r[5]==='否').length,missingFromTokens:issues.filter(r=>r[6]==='否').length};
 fs.writeFileSync('reports/匯出空間詞全文核對.json',JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary));
 return issues;
}
if(require.main===module&&audit(process.argv[2]).length)process.exitCode=1;
module.exports={parseCsv,audit};
