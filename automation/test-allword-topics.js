const test=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto'),zlib=require('node:zlib'),vm=require('node:vm');
const d=require('../reports/allword-five-topic-results.json');
test('all chapter tokens use explicit stopwords, with no POS or short-chapter exclusion',()=>{
 a.equal(d.source_sha256,crypto.createHash('sha256').update(fs.readFileSync(require.resolve('../data-package.json'))).digest('hex'));
 require('node:child_process').execFileSync(process.execPath,[require.resolve('./export-allword-topics')],{cwd:require('node:path').resolve(__dirname,'..')});
 const input=JSON.parse(fs.readFileSync(require.resolve('../.network-runtime/allword-topic-input.json'),'utf8'));
 a.equal(d.points.length,input.chapters.length);a.equal(d.points.length,491);a.equal(d.unassigned.length,0);
 const stop=new Set(d.stopwords),freq=new Map();for(const c of input.chapters)for(const w of c.tokens){a.ok(/^\p{Script=Han}+$/u.test(w));a.ok(!stop.has(w));freq.set(w,(freq.get(w)||0)+1);}
 a.equal(d.counts.tokens,input.chapters.reduce((s,c)=>s+c.tokens.length,0));a.equal(d.counts.word_types,freq.size);
 a.ok([...freq.keys()].some(w=>[...w].length===1));a.ok([...freq.values()].some(n=>n===1));
 for(const p of d.points){const c=input.chapters.find(c=>c.id===p.id);a.equal(p.token_count,c.tokens.length);a.equal(p.weights.length,5);a.ok(Math.abs(p.weights.reduce((a,b)=>a+b,0)-1)<1e-8);a.equal(p.dominant_topic,p.weights.indexOf(Math.max(...p.weights))+1);a.ok(Number.isFinite(p.x)&&Number.isFinite(p.y));}
});
test('complete vocabulary and both probability definitions are preserved',()=>{
 const words=JSON.parse(zlib.gunzipSync(fs.readFileSync(require.resolve('../reports/allword-five-topic-vocabulary.json.gz'))));
 a.equal(words.length,d.counts.word_types);a.equal(words.reduce((s,w)=>s+w.frequency,0),d.counts.tokens);
 const sums=[0,0,0,0,0];for(const w of words){a.equal(w.topic_probabilities.length,5);a.ok(Math.abs(w.topic_probabilities.reduce((s,p)=>s+p,0)-1)<1e-8);w.p_word_given_topic.forEach((p,i)=>sums[i]+=p);}
 sums.forEach(p=>a.ok(Math.abs(p-1)<1e-8));a.equal(d.topics.length,5);a.equal(d.stability.length,2);
});
test('interactive comparison embeds actual model and searchable per-chapter table',()=>{
 const html=fs.readFileSync(require.resolve('../reports/全書詞彙_五主題篇目比較.html'),'utf8');const script=html.split('<script>')[1].split('</script>')[0];new vm.Script(script);
 a.deepEqual(JSON.parse(script.slice(script.indexOf('const D=')+8,script.indexOf(',ns='))),d);
 for(const s of ['id="rows"','id="chapterSearch"','id="sort"','异事类型对照','id="prior-comparison"'])a.ok(html.includes(s));
});
test('chapter table search, probability sorting and plot modes operate on actual data',()=>{
 class Element{constructor(){this.children=[];this.attrs={};this.value='';this.style={};}append(x){this.children.push(x)}replaceChildren(){this.children=[]}setAttribute(k,v){this.attrs[k]=String(v)}querySelector(){return this.input||(this.input={})}}
 const el=Object.fromEntries(['plot','tip','mode','legend','search','rows','chapterSearch','sort'].map(k=>[k,new Element()]));el.mode.value='topics';el.sort.value='id';
 const document={querySelector:s=>el[s.slice(1)],createElement:()=>new Element(),createElementNS:()=>new Element()};
 const html=fs.readFileSync(require.resolve('../reports/全書詞彙_五主題篇目比較.html'),'utf8'),script=html.split('<script>')[1].split('</script>')[0];
 new vm.Script(script).runInContext(vm.createContext({document,Math,Set,Object,Number}));
 a.equal(el.rows.children.length,491);a.equal(el.plot.children.length,491);
 el.sort.value='0';el.sort.onchange();a.equal(el.rows.children[0].children[1].textContent,[...d.points].sort((a,b)=>b.weights[0]-a.weights[0])[0].title);
 el.chapterSearch.value='黄英';el.chapterSearch.oninput();a.equal(el.rows.children.length,1);a.equal(el.rows.children[0].children[1].textContent,'黄英');
 const coords=()=>el.plot.children.map(g=>JSON.stringify(g.attrs)).sort();const before=coords();el.mode.value='events';el.mode.onchange();a.deepEqual(coords(),before);
});
