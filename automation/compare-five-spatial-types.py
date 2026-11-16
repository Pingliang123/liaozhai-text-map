import os,sys,json,pathlib,collections
os.environ['OPENBLAS_NUM_THREADS']='1'
sys.path.insert(0,'.network-runtime/topic-libs')
import numpy as np
from scipy.stats import fisher_exact
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.font_manager import FontProperties
root=pathlib.Path('reports');d=json.load(open('.network-runtime/latest-place-space-input.json',encoding='utf8'))
cs=d['chapters'];types=['人','鬼','狐','妖','神'];labels=np.array([[t in c['events'] for t in types] for c in cs],dtype=float)
length=np.array([c['full_word_count'] for c in cs]);strata=np.searchsorted(np.quantile(length,[.25,.5,.75]),length,side='right')
features=[]
for category,key in [('地點詞','place_words'),('場所詞','space_words')]:
 freq=collections.Counter(w for c in cs for w in set(c[key]))
 features += [(category,w) for w,n in sorted(freq.items()) if n>=5]
X=np.array([[w in c['place_words' if cat=='地點詞' else 'space_words'] for cat,w in features] for c in cs],dtype=float)
def bh(p):
 p=np.asarray(p);order=np.argsort(p);q=np.empty(len(p));q[order]=np.minimum(1,np.minimum.accumulate((p[order]*len(p)/np.arange(1,len(p)+1))[::-1])[::-1]);return q
bins=[np.flatnonzero(strata==k) for k in np.unique(strata)]
def coefficients(y):
 out=np.zeros_like(y)
 for ix in bins:
  n=len(ix);yes=y[ix].sum(axis=0);no=n-yes;weight=yes*no/n
  out[ix]=y[ix]*np.divide(weight,yes,out=np.zeros_like(yes),where=yes>0)-(1-y[ix])*np.divide(weight,no,out=np.zeros_like(no),where=no>0)
 return out
coef=coefficients(labels);den=np.zeros(5)
for ix in bins:
 n1=labels[ix].sum(0);den+=n1*(len(ix)-n1)/len(ix)
obs=(coef.T@X)/den[:,None]
extreme=np.zeros_like(obs);rng=np.random.default_rng(42);iterations=49999
for i in range(iterations):
 ix=np.arange(len(cs))
 for b in bins:ix[b]=rng.permutation(b)
 perm=coef[ix]
 val=perm.T@X/den[:,None]
 extreme+=np.abs(val)>=np.abs(obs)-1e-12
pp=(extreme+1)/(iterations+1);qp=bh(pp.ravel()).reshape(pp.shape)
rows=[]
for t,event in enumerate(types):
 yes=labels[:,t].astype(bool)
 for j,(cat,word) in enumerate(features):
  a=int(X[yes,j].sum());b=int(X[~yes,j].sum());n1=int(yes.sum());n0=len(cs)-n1
  p=fisher_exact([[a,n1-a],[b,n0-b]])[1]
  rows.append(dict(type=event,category=cat,word=word,inside=a,inside_n=n1,outside=b,outside_n=n0,rate=a/n1,other_rate=b/n0,ratio=(a/n1)/(b/n0) if b else None,p=float(p),adjusted_difference=float(obs[t,j]),length_p=float(pp[t,j]),length_q=float(qp[t,j])))
for r,q in zip(rows,bh([r['p'] for r in rows])):r['q']=float(q)
summary=[]
for t in types:
 group=[c for c in cs if t in c['events']]
 summary.append(dict(type=t,chapters=len(group),place_chapters=sum(bool(c['place_words']) for c in group),venue_chapters=sum(bool(c['space_words']) for c in group),place_tokens=sum(c['place_token_count'] for c in group),venue_tokens=sum(c['space_token_count'] for c in group),full_tokens=sum(c['full_word_count'] for c in group)))
out=dict(source_sha256=d['source_sha256'],summary=summary,comparisons=rows,tests=len(rows),iterations=iterations,method='逐词篇目命中率；每类与不含该标签的其余篇目比较。整行多标签在全文词数四分位组内重排49999次，使用组内加权命中率差。Fisher与重排各自跨全部词×类别×五类进行BH校正。独立分词，保留书写异形；沿用室、穴已记录的语义排除。')
(root/'五類篇目_空間詞比較.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf8')
font=FontProperties(fname='C:/Windows/Fonts/msjh.ttc',size=11)
plt.rcParams['font.family']=font.get_name()
fig,axes=plt.subplots(1,2,figsize=(14,8),gridspec_kw={'width_ratios':[1,2.1]})
axes[0].barh(types,[s['venue_chapters']/s['chapters']*100 for s in summary],label='含場所詞',color='#4e79a7')
axes[0].scatter([s['place_chapters']/s['chapters']*100 for s in summary],types,label='含地點詞',color='#e15759',s=65,zorder=4)
axes[0].set_xlim(0,100);axes[0].set_xlabel('該類篇目占比（%）',fontproperties=font);axes[0].set_title('空間標注覆蓋',fontproperties=font);axes[0].legend(prop=font,loc='lower left')
for label in axes[0].get_yticklabels():label.set_fontproperties(font)
# Common words selected by total chapter prevalence, independent of category labels.
top=sorted([(int(X[:,j].sum()),j) for j,(cat,w) in enumerate(features) if cat=='場所詞'],reverse=True)[:15]
lookup={(r['type'],r['category'],r['word']):r for r in rows}
mat=np.array([[lookup[(t,*features[j])]['rate']*100 for t in types] for n,j in top])
im=axes[1].imshow(mat,aspect='auto',cmap='Blues',vmin=0,vmax=max(30,mat.max()))
axes[1].set_xticks(range(5),types,fontproperties=font);axes[1].set_yticks(range(len(top)),[features[j][1] for n,j in top],fontproperties=font)
for y in range(len(top)):
 for x in range(5):axes[1].text(x,y,f'{mat[y,x]:.0f}%',ha='center',va='center',color='white' if mat[y,x]>mat.max()*.6 else '#222')
axes[1].set_title('全書最常見的十五個場所詞 · 篇目命中率',fontproperties=font)
fig.colorbar(im,ax=axes[1],shrink=.6,label='%')
fig.suptitle('五類篇目的空間詞比較',fontproperties=FontProperties(fname='C:/Windows/Fonts/msjh.ttc',size=20))
fig.text(.04,.015,'一篇可屬多類。色深表示該類中含此詞的篇目比例；圖中百分比未校正篇幅。',fontproperties=font)
fig.tight_layout(rect=[0,.05,1,.95])
fig.savefig(root/'五類篇目_空間詞比較.png',dpi=180)
print('SUMMARY',summary,'tests',len(rows))
for t in types:
 selected=[r for r in rows if r['type']==t and r['inside']>=5 and r['rate']>r['other_rate']]
 selected.sort(key=lambda r:(r['length_q'],r['q'],-r['adjusted_difference']))
 print(t,[(r['category'],r['word'],r['inside'],r['inside_n'],r['outside'],r['outside_n'],round(r['ratio'],2) if r['ratio'] else None,round(r['q'],4),round(r['length_q'],4)) for r in selected[:6]])
print('SIGNIFICANT',[(r['type'],r['word'],r['q'],r['length_q']) for r in rows if r['q']<.05 and r['length_q']<.05])
