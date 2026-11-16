import json,pathlib
R=pathlib.Path('reports');d=json.load(open(R/'place-space-raw-frequency-interactive.json',encoding='utf8'));topics=json.load(open(R/'place-space-five-topic-results.json',encoding='utf8'));lookup={p['id']:p for p in topics['points']};src=json.load(open('.network-runtime/place-space-topic-input.json',encoding='utf8'));words={c['id']:set(c['tokens'])for c in src['chapters']};rows=[]
for i,a in enumerate(d['chapters']):
 for j in range(i+1,len(d['chapters'])):
  b=d['chapters'][j];v=d['similarity'][i][j]
  if v is None:continue
  x,y=lookup[a['id']],lookup[b['id']];rows.append({'a':a['id'],'b':b['id'],'titles':[a['title'],b['title']],'similarity':v,'words':[len(words[a['id']]),len(words[b['id']])],'tokens':[a['token_count'],b['token_count']],'shared':sorted(words[a['id']]&words[b['id']]),'topics':[x['dominant_topic'],y['dominant_topic']],'weights':[x['weights'],y['weights']],'events':[x['events'],y['events']],'same_topic':x['dominant_topic']==y['dominant_topic']})
rows.sort(key=lambda r:(-r['similarity'],r['a'],r['b']));robust=[r for r in rows if min(r['words'])>=5 and min(r['tokens'])>=10];out={'source_sha256':d['source_sha256'],'method':'Unique unordered pairs ranked by raw-count cosine. Topic labels from existing five-topic place-space LDA seed42; not literary theme validation. Additional exploratory eligibility: both chapters >=5 unique words and >=10 selected tokens.','top_unfiltered':rows[:20],'top_eligible':robust[:20]}
R.joinpath('high-similarity-chapter-topic-pairs.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf8')
lines=['# 高相似篇目与五主题对照','','这里的主题是既有LDA模型中的最高概率主题，不等同于人工判定的思想主题。类型标签另列；相似度与主题使用同一词表，二者吻合不是独立验证。','']
for title,key in [('未设词数门槛','top_unfiltered'),('两篇各至少5种词、10词次','top_eligible')]:
 lines+=['## '+title,'','|篇目对|相似度|词种数|主題|共享词|类型|','|---|---:|---|---|---|---|']
 for r in out[key]:lines.append('|'+ '／'.join(r['titles'])+f'|{r["similarity"]:.3f}|'+ '/'.join(map(str,r['words']))+'|'+ '/'.join(map(str,r['topics']))+'|'+ '、'.join(r['shared'])+'|'+ '／'.join('、'.join(e)for e in r['events'])+'|')
lines+=['','## 五主题代表词','']
for t in topics['topics']:lines.append(f'- 主題{t["id"]}：'+'、'.join(w['word']for w in t['top_words'][:12]))
R.joinpath('高相似篇目與主題對照.md').write_text('\n'.join(lines)+'\n',encoding='utf8');print(json.dumps(out['top_eligible'][:6],ensure_ascii=False,indent=2));print('same_top20',sum(r['same_topic']for r in out['top_eligible']),'unfiltered',sum(r['same_topic']for r in out['top_unfiltered']))
