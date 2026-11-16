import os,sys,json,pathlib,collections
os.environ['OPENBLAS_NUM_THREADS']='1'
sys.path.insert(0,'.network-runtime/topic-libs')
import numpy as np
from sklearn.feature_extraction.text import CountVectorizer,TfidfTransformer
from sklearn.metrics.pairwise import cosine_similarity
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.font_manager import FontProperties
P=pathlib.Path('reports');src=json.load(open('.network-runtime/latest-place-space-input.json',encoding='utf8'));allcs=src['chapters'];cs=[c for c in allcs if c['tokens']]
order=['神','人','鬼','鬼／神','狐','妖','人／神','鬼／狐','鬼／狐／神','鬼／妖','妖／神','人／鬼／妖','人／妖','狐／妖','狐／神','人／鬼'];types=['人','鬼','狐','妖','神']
def label(c):return '／'.join(t for t in types if t in c['events'])
labels=np.array([order.index(label(c))for c in cs]);N=len(cs);M=np.eye(16)[labels];n=M.sum(0)
vec=CountVectorizer(analyzer=lambda x:x);X=vec.fit_transform([c['tokens']for c in cs]);vocab=vec.get_feature_names_out()
raw=cosine_similarity(X);tfidf=cosine_similarity(TfidfTransformer().fit_transform(X));binary=cosine_similarity(X.sign())
removed=X.copy();j=next((i for i,w in enumerate(vocab)if w=='舟'),None)
if j is not None:removed=removed.tocsc();removed[:,j]=0;removed=removed.tocsr()
no_boat=cosine_similarity(removed)
def summaries(S):
 S=S.copy();np.fill_diagonal(S,0);tot=(M*(S@M)).sum(0);within=np.divide(tot,n*(n-1),out=np.full(16,np.nan),where=n>1);cross=np.divide(M.T@S.sum(1)-tot,n*(N-n),out=np.full(16,np.nan),where=n>0)
 return within,cross
W,C=summaries(raw);obs=W-C
S=raw.copy();np.fill_diagonal(S,0);sums=S.sum(1)
length=np.array([c['full_word_count']for c in cs]);strata=np.searchsorted(np.quantile(length,[.25,.5,.75]),length,side='right');bins=[np.flatnonzero(strata==k)for k in np.unique(strata)]
rng=np.random.default_rng(42);high=np.zeros(16);low=np.zeros(16);null_sum=np.zeros(16);iterations=19999
for _ in range(iterations):
 ix=np.arange(N)
 for b in bins:ix[b]=rng.permutation(b)
 mm=M[ix];total=(mm*(S@mm)).sum(0)
 wi=np.divide(total,n*(n-1),out=np.zeros(16),where=n>1);cr=np.divide(mm.T@sums-total,n*(N-n),out=np.zeros(16),where=n>0)
 stat=wi-cr;high+=stat>=obs-1e-12;low+=stat<=obs+1e-12;null_sum+=stat
ps=np.minimum(1,2*np.minimum((high+1)/(iterations+1),(low+1)/(iterations+1)));eligible=np.flatnonzero(n>=2);ix=eligible[np.argsort(ps[eligible])];q=np.full(16,np.nan);q[ix]=np.minimum(1,np.minimum.accumulate((ps[ix]*len(ix)/np.arange(1,len(ix)+1))[::-1])[::-1])
no_room=X.tocsc(copy=True)
room=np.flatnonzero(vocab=='室')
if len(room):no_room[:,int(room[0])]=0
no_room=cosine_similarity(no_room.tocsr())
variants={key:summaries(A)for key,A in [('tfidf',tfidf),('binary',binary),('without_boat',no_boat),('without_room',no_room)]}
filtered=np.array([len(set(c['tokens']))>=5 and len(c['tokens'])>=10 for c in cs]);rows=[]
for k,g in enumerate(order):
 inside=np.flatnonzero(labels==k);outside=np.flatnonzero(labels!=k);a=raw[np.ix_(inside,inside)][np.triu_indices(len(inside),1)];b=raw[np.ix_(inside,outside)].ravel()
 selected=inside[filtered[inside]];z=raw[np.ix_(selected,selected)][np.triu_indices(len(selected),1)]
 row=dict(null_difference_mean=float(null_sum[k]/iterations),group=g,full_n=sum(label(c)==g for c in allcs),valid_n=int(n[k]),within_pairs=len(a),within_mean=float(W[k])if len(a)else None,within_median=float(np.median(a))if len(a)else None,within_nonzero=float(np.mean(a>1e-12))if len(a)else None,cross_mean=float(C[k]),difference=float(obs[k])if len(a)else None,p=float(ps[k])if len(a)else None,q=float(q[k])if len(a)else None,filtered_n=len(selected),filtered_within=float(z.mean())if len(z)else None)
 for key,(w,c)in variants.items():row[key+'_difference']=float(w[k]-c[k])if len(a)else None
 rows.append(row)
between=np.divide(M.T@S@M,n[:,None]*n[None,:],out=np.full((16,16),np.nan),where=(n[:,None]*n[None,:])>0)
for k in range(16):between[k,k]=W[k]
pairs=[]
for i in range(N):
 for j in range(i+1,N):
  if not(filtered[i]and filtered[j]):continue
  a,b=collections.Counter(cs[i]['tokens']),collections.Counter(cs[j]['tokens']);shared=a.keys()&b.keys()
  if len(shared)<2 or raw[i,j]<.5:continue
  dot=sum(a[w]*b[w]for w in shared);lead=max(shared,key=lambda w:a[w]*b[w])
  pairs.append(dict(ids=[cs[i]['id'],cs[j]['id']],titles=[cs[i]['title'],cs[j]['title']],groups=[label(cs[i]),label(cs[j])],similarity=float(raw[i,j]),lead_word=lead,lead_dot_share=a[lead]*b[lead]/dot))
pairs.sort(key=lambda r:-r['similarity'])
result=dict(source_sha256=src['source_sha256'],all_chapters=491,valid_chapters=N,groups=rows,between=between.tolist(),order=order,permutations=iterations,bh_tests=len(eligible),top_pairs=pairs[:20],method='Exclusive saved label combinations; each chapter once. Exact union of place/venue tokens, raw-frequency cosine. All nonempty chapters, no high-similarity threshold in group means. Within-vs-cross mean difference; full cleaned chapter-length quartiles, joint label-row permutation 19999 times; two-sided doubled empirical-tail p, BH across all groups with >=2 valid chapters. TF-IDF, binary cosine, removing 舟 and >=5 types/10 tokens as descriptive sensitivities.')
from sklearn.preprocessing import normalize
normalized=normalize(X,norm='l2')
for k,row in enumerate(rows):
 block=normalized[labels==k]
 sums=np.asarray(block.sum(axis=0)).ravel();squares=np.asarray(block.power(2).sum(axis=0)).ravel()
 contribution=np.maximum(0,(sums*sums-squares)/2);total=contribution.sum()
 row['leading_words']=[dict(word=str(vocab[j]),similarity_sum_share=float(contribution[j]/total))for j in np.argsort(-contribution)[:10] if total>0 and contribution[j]>0]
# Serialize undefined singleton estimates as null.
result['between']=[[None if not np.isfinite(v)else float(v)for v in row]for row in between]
(P/'十六類型組合_空間相似度.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8')
font=FontProperties(fname='C:/Windows/Fonts/msjh.ttc',size=11)
fig,ax=plt.subplots(figsize=(13,11));im=ax.imshow(np.ma.masked_invalid(between),cmap='YlGnBu',vmin=0,vmax=np.nanmax(between));names=[g+'（'+str(int(n[k]))+'）'for k,g in enumerate(order)]
ax.set_xticks(range(16),names,rotation=55,ha='right',fontproperties=font);ax.set_yticks(range(16),names,fontproperties=font)
for i in range(16):
 for j in range(16):ax.text(j,i,'—'if not np.isfinite(between[i,j])else f'{between[i,j]:.2f}',ha='center',va='center',fontsize=8,color='white'if between[i,j]>.6*np.nanmax(between)else '#222')
ax.set_title('類型組合間的平均空間詞相似度',fontproperties=font,fontsize=19);fig.colorbar(im,ax=ax,shrink=.65,label='cosine');fig.text(.02,.015,'地點詞＋場所詞；括號為有效篇數。對角線是組內不同篇目均值。單篇組無組內估計；小樣本格僅供描述。',fontproperties=font);fig.tight_layout(rect=[0,.06,1,.96]);fig.savefig(P/'十六類型組合_空間相似度.png',dpi=170)
for r in rows:print(r)
print('similarity distribution',float(np.median(raw[np.triu_indices(N,1)])),float(np.mean(raw[np.triu_indices(N,1)]>0)))
