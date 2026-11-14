const test=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto'),vm=require('node:vm');
const {selectChapter}=require('./export-place-space-topics');
test('union counts a token once and preserves original word forms',()=>{
 const c={chapter_id:0,chapter:'例',event_types:{狐:true},source_tokens:['金陵','室','门','女'],source_units:[{text:'金陵室门女',token_words:['金陵','室','门','女']}],space_words:['室','门'],places:[{word:'金陵'},{word:'门'}]};
 const r=selectChapter(c,new Set(),new Set(['室']));a.deepEqual(r.tokens,['金陵','门']);a.equal(r.place_token_count,2);a.equal(r.space_token_count,1);a.equal(r.both_token_count,1);a.equal(r.full_word_count,4);a.deepEqual(r.both_categories,['门']);
});
test('current combined input uses exact saved category words with traceable counts',()=>{
 require('node:child_process').execFileSync(process.execPath,[require.resolve('./export-place-space-topics')],{cwd:require('node:path').resolve(__dirname,'..')});
 const s=JSON.parse(fs.readFileSync(require.resolve('../.network-runtime/place-space-topic-input.json'),'utf8'));
 const hash=crypto.createHash('sha256').update(fs.readFileSync(require.resolve('../data-package.json'))).digest('hex');a.equal(s.source_sha256,hash);
 a.equal(s.chapters.length,491);a.equal(s.counts.tokens,s.counts.place_tokens+s.counts.space_tokens-s.counts.overlap_tokens);
 for(const c of s.chapters){a.ok(c.full_word_count>=c.tokens.length);const words=new Set([...c.place_words,...c.space_words]);a.ok(c.tokens.every(w=>words.has(w)));}
});
test('combined results exclude empty documents and preserve multi-label inference family',()=>{
 const d=require('../reports/place-space-topic-counts-events.json'),s=JSON.parse(fs.readFileSync(require.resolve('../.network-runtime/place-space-topic-input.json'),'utf8'));
 a.equal(d.source_sha256,s.source_sha256);a.equal(d.document_count,s.counts.nonempty);a.equal(d.tokens,s.counts.tokens);a.equal(d.word_types,s.counts.word_types);a.equal(d.unassigned.length,491-d.document_count);
 a.equal(d.associations.length,95);a.deepEqual(d.models.map(m=>m.k),[3,6,10]);
 for(const m of d.models){a.equal(m.chapters.length,d.document_count);for(const c of m.chapters){a.equal(c.weights.length,m.k);a.ok(Math.abs(c.weights.reduce((x,y)=>x+y)-1)<1e-8);}}
 for(const r of d.associations){a.equal(r.n_label+r.n_other,d.document_count);a.ok(r.global_bh_q>=r.permutation_p-1e-10);}
 const html=fs.readFileSync(require.resolve('../reports/地點與空間詞_三六十主題類型比較.html'),'utf8');const script=html.split('<script>')[1].split('</script>')[0];new vm.Script(script);
 a.deepEqual(JSON.parse(script.slice(script.indexOf('const D=')+8,script.indexOf(';function draw'))),d);a.ok(html.includes('地點與空間詞_三六十主題與類型關聯.png'));a.ok(!html.includes('同一份491篇全书词汇'));
});
