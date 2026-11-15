import sys,json,pathlib
sys.path.insert(0,'.network-runtime/topic-libs')
import numpy as np
p=pathlib.Path('reports');d=json.load(open(p/'chapter-space-raw-frequency-similarity.json',encoding='utf8'));s=json.load(open('.network-runtime/space-only-similarity-input.json',encoding='utf8'));by={c['id']:c for c in s['chapters']};valid=[i for i,c in enumerate(d['chapters'])if by[c['id']]['tokens']];cs=[by[d['chapters'][i]['id']]for i in valid];a=np.array(d['similarity'],dtype=float)[np.ix_(valid,valid)];np.fill_diagonal(a,-1);neighbors=np.argsort(-a,axis=1,kind='stable')[:,:5];types=['人','鬼','狐','妖','神'];labels=np.array([[t in c['events']for t in types]for c in cs]);
def stat(l):return np.any(l[:,None,:]&l[neighbors],axis=2).mean()
obs=stat(labels);rng=np.random.default_rng(42);strata=np.searchsorted(np.quantile([len(c['tokens'])for c in cs],[.25,.5,.75]),[len(c['tokens'])for c in cs],side='right');null=[]
for _ in range(4999):
 l=labels.copy()
 for k in np.unique(strata):
  ix=np.flatnonzero(strata==k);l[ix]=labels[rng.permutation(ix)]
 null.append(stat(l))
result={'method':'Each chapter top5 raw-frequency cosine neighbors; fraction sharing at least one event label. Complete multilabel rows permuted 4999 times within spatial-token-count quartiles. Directed neighbor pairs, not unique pairs.','observed':float(obs),'null_mean':float(np.mean(null)),'p':float((1+sum(v>=obs for v in null))/5000),'seed':42,'neighbor_selections':len(cs)*5}
(p/'space-similarity-event-overlap.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8');print(result)
