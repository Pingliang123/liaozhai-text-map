import sys,json,pathlib
sys.path.insert(0,'.network-runtime/topic-libs')
import numpy as np
R=pathlib.Path('reports');results=[]
for kind,inputname in [('place-space','place-space-topic-input.json'),('allword','allword-topic-input.json')]:
 d=json.load(open(R/f'{kind}-raw-frequency-interactive.json',encoding='utf8'));src=json.load(open('.network-runtime/'+inputname,encoding='utf8'));lookup={c['id']:c for c in src['chapters']};valid=[i for i,c in enumerate(d['chapters'])if c['token_count']];cs=[lookup[d['chapters'][i]['id']]for i in valid];a=np.array(d['similarity'],dtype=float)[np.ix_(valid,valid)];np.fill_diagonal(a,-1);neighbors=np.argsort(-a,axis=1,kind='stable')[:,:5];types=['人','鬼','狐','妖','神'];l=np.array([[e in c['events']for e in types]for c in cs]);counts=np.array([c.get('full_word_count',len(c['tokens']))for c in cs]);strata=np.searchsorted(np.quantile(counts,[.25,.5,.75]),counts,side='right')
 def overlap(labels):return np.any(labels[:,None,:]&labels[neighbors],axis=2).mean()
 obs=overlap(l);exact=np.all(l[:,None,:]==l[neighbors],axis=2).mean();rng=np.random.default_rng(42);null=[]
 for _ in range(4999):
  shuffled=l.copy()
  for k in np.unique(strata):
   ix=np.flatnonzero(strata==k);shuffled[ix]=l[rng.permutation(ix)]
  null.append(overlap(shuffled))
 results.append({'corpus':kind,'chapters':len(cs),'selections':len(cs)*5,'shared_any':float(obs),'identical_label_set':float(exact),'null_mean':float(np.mean(null)),'permutation_p':float((1+sum(v>=obs for v in null))/5000),'method':'Top5 raw-frequency cosine neighbors; directed selections. Any shared label as primary test; identical label set descriptive. Full cleaned chapter token quartiles; permute entire label rows 4999 times; seed42.'})
ps=np.array([r['permutation_p']for r in results]);order=np.argsort(ps);q=np.empty(2);q[order]=np.minimum(1,np.minimum.accumulate((ps[order]*2/np.arange(1,3))[::-1])[::-1])
for r,v in zip(results,q):r['bh_q_two_tests']=float(v)
R.joinpath('frequency-neighbors-event-comparison.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf8');print(json.dumps(results,ensure_ascii=False,indent=2))
