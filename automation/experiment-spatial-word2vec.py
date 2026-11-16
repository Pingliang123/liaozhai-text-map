import os,sys,json,pathlib,collections
os.environ['OPENBLAS_NUM_THREADS']='1'
sys.path.insert(0,'.network-runtime/topic-libs')
import numpy as np
from qhchina.analytics import Word2Vec
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.font_manager import FontProperties
P=pathlib.Path('reports');d=json.load(open('.network-runtime/embedding-input.json',encoding='utf8'));sentences=d['sentences'];freq=collections.Counter(w for s in sentences for w in s)
tf=collections.Counter(w for c in d['chapters'] for w in c['tokens']);df=collections.Counter(w for c in d['chapters'] for w in set(c['tokens']))
targets=sorted([w for w in tf if tf[w]>=5 and df[w]>=3],key=lambda w:(-tf[w],w))
vocab=sorted(w for w,n in freq.items() if n>=5);models={};matrices={}
params=dict(vector_size=100,window=5,min_word_count=5,sg=1,workers=1)
for epochs,seed in [(5,42),(30,42),(30,7),(30,123)]:
 m=Word2Vec(sentences,**params,epochs=epochs,seed=seed);m.train();models[(epochs,seed)]=m
 a=np.array([m.get_vector(w,normalize=True)for w in targets]);matrices[(epochs,seed)]=a
 print('trained',epochs,seed,flush=True)
main=models[(30,42)];A=matrices[(30,42)];cos=A@A.T
def neighbors(a,i,n=10):
 scores=a@a[i];return np.argsort(-scores)[np.argsort(-scores)!=i][:n]
stability=[]
for i,w in enumerate(targets):
 sets=[set(neighbors(matrices[(30,seed)],i))for seed in [42,7,123]];baseline=set(neighbors(matrices[(5,42)],i))
 pairs=[len(sets[a]&sets[b])/len(sets[a]|sets[b])for a,b in [(0,1),(0,2),(1,2)]]
 stability.append(dict(word=w,seed_top10_jaccard=float(np.mean(pairs)),baseline_vs_30_jaccard=len(baseline&sets[0])/len(baseline|sets[0])))
allvec=np.array([main.get_vector(w,normalize=True)for w in vocab]);rows=[]
for i,w in enumerate(targets):
 spatial=[dict(word=targets[j],cosine=float(cos[i,j]))for j in neighbors(A,i)]
 scores=allvec@A[i];ix=[j for j in np.argsort(-scores) if vocab[j]!=w][:10]
 rows.append(dict(word=w,spatial_frequency=tf[w],chapter_count=df[w],training_frequency=freq[w],kind='地點／場所' if any(w in c['place_words']for c in d['chapters'])and any(w in c['space_words']for c in d['chapters'])else '地點'if any(w in c['place_words']for c in d['chapters'])else'場所',spatial_neighbors=spatial,all_neighbors=[dict(word=vocab[j],cosine=float(scores[j]))for j in ix],evidence=d['evidence'].get(w,[]),stability=stability[i]))
result=dict(source_sha256=d['source_sha256'],method='qhchina Word2Vec Skip-gram. Full sentence contexts with all Han tokens, including function words. Punctuation excluded; no inter-sentence windows. Main 30 epochs, seed42; sensitivity seeds7/123; tutorial 5-epoch seed42 baseline. Spatial targets require saved spatial frequency>=5 and >=3 chapters. Similarity is cosine between context-derived vectors, not geographic distance, synonym equivalence or movement.',parameters={**params,'epochs':30,'seed':42},training_tokens=sum(freq.values()),sentences=len(sentences),training_vocabulary=len(vocab),spatial_targets=len(targets),all_spatial_word_types=len(tf),excluded_rare=len(tf)-len(targets),mean_seed_jaccard=float(np.mean([r['seed_top10_jaccard']for r in stability])),rows=rows)
(P/'空間詞_Word2Vec結果.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8')
anchors=[w for w in ['室','室中','门','门外','墙','堂','穴','洞','山中','舟','水中','宫','冥司','地下','天上','济南','金陵'] if w in targets];ix=[targets.index(w)for w in anchors];arr=cos[np.ix_(ix,ix)]
font=FontProperties(fname='C:/Windows/Fonts/msjh.ttc',size=11)
fig,ax=plt.subplots(figsize=(11,10));im=ax.imshow(arr,cmap='RdBu_r',vmin=-1,vmax=1);ax.set_xticks(range(len(anchors)),anchors,rotation=45,ha='right',fontproperties=font);ax.set_yticks(range(len(anchors)),anchors,fontproperties=font);ax.set_title('空間詞的語境相似度 · Word2Vec',fontproperties=font,fontsize=19);fig.colorbar(im,ax=ax,shrink=.7,label='cosine');fig.text(.08,.02,'全文語境訓練；不是地理距離。主模型30輪、種子42。',fontproperties=font);fig.tight_layout(rect=[0,.05,1,.97]);fig.savefig(P/'空間詞_Word2Vec語境相似度.png',dpi=170)
payload=json.dumps(result,ensure_ascii=False).replace('<','\u003c')
page="""<!doctype html><meta charset="utf-8"><title>空間詞語境近鄰</title><style>body{font:16px/1.7 system-ui;max-width:1100px;margin:30px auto;padding:15px;background:#faf9f5}select{font:inherit;padding:8px}table{border-collapse:collapse;width:100%}td,th{padding:8px;border-bottom:1px solid #ddd;text-align:left}blockquote{background:white;padding:12px}button{cursor:pointer}#tables{display:grid;grid-template-columns:1fr 1fr;gap:25px}@media(max-width:650px){#tables{grid-template-columns:1fr}}</style><h1>空間詞的語境近鄰</h1><p>全文分詞訓練 Word2Vec，再查詢已標注的地點詞與場所詞。近鄰表示用詞語境相近，須對照原文解釋。</p><select id="word"></select><p id="status"></p><div id="tables"></div><h2>原文例句</h2><div id="evidence"></div><script>const D=PAYLOAD;const select=document.querySelector('#word');for(const r of D.rows){let o=new Option(r.word+'（'+r.kind+'，'+r.chapter_count+'篇）',r.word);select.add(o)}function render(){const r=D.rows.find(r=>r.word===select.value);document.querySelector('#status').textContent='空間標注詞次 '+r.spatial_frequency+'；全文訓練詞次 '+r.training_frequency+'；三種子前10近鄰平均Jaccard '+r.stability.seed_top10_jaccard.toFixed(3);let box=document.querySelector('#tables');box.replaceChildren();for(const [key,title]of [['spatial_neighbors','空間詞近鄰'],['all_neighbors','全文詞彙近鄰']]){let section=document.createElement('section'),h=document.createElement('h2'),table=document.createElement('table');h.textContent=title;section.append(h);for(const x of r[key]){let tr=document.createElement('tr'),td=document.createElement('td'),value=document.createElement('td');if(D.rows.some(z=>z.word===x.word)){let b=document.createElement('button');b.textContent=x.word;b.onclick=()=>{select.value=x.word;render()};td.append(b)}else td.textContent=x.word;value.textContent=x.cosine.toFixed(3);tr.append(td,value);table.append(tr)}section.append(table);box.append(section)}let e=document.querySelector('#evidence');e.replaceChildren();for(const x of r.evidence){let q=document.createElement('blockquote');q.textContent='《'+x.title+'》〔'+(x.id+1)+'〕 '+x.quote;e.append(q)}}select.onchange=render;select.value=D.rows.some(r=>r.word==='室')?'室':D.rows[0].word;render();</script>"""
(P/'空間詞_Word2Vec互動查詢.html').write_text(page.replace('PAYLOAD',payload),encoding='utf8')
print('COUNTS',result['spatial_targets'],result['training_vocabulary'],result['mean_seed_jaccard'])
for word in ['室','门','舟','穴','冥司','济南','金陵']:
 r=next((r for r in rows if r['word']==word),None)
 if r:print(word,r['spatial_neighbors'][:6],r['stability'])
