import sys,json,math,pathlib,collections
sys.path.insert(0,'.network-runtime/topic-libs')
import numpy as np
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.metrics.pairwise import cosine_similarity
d=json.load(open('reports/十六類型組合_空間相似度.json',encoding='utf8'));s=json.load(open('.network-runtime/latest-place-space-input.json',encoding='utf8'));cs=[c for c in s['chapters']if c['tokens']]
assert d['source_sha256']==s['source_sha256']
expected=[60,122,105,30,56,66,9,14,3,4,6,1,7,1,3,4]
assert [r['full_n']for r in d['groups']]==expected
assert sum(expected)==491 and sum(r['valid_n']for r in d['groups'])==471
X=CountVectorizer(analyzer=lambda x:x).fit_transform([c['tokens']for c in cs]);sim=cosine_similarity(X)
label=lambda c:'／'.join(t for t in ['人','鬼','狐','妖','神']if t in c['events'])
for i,r in enumerate(d['groups']):
 ix=[j for j,c in enumerate(cs)if label(c)==r['group']];other=[j for j,c in enumerate(cs)if label(c)!=r['group']]
 pairs=sim[np.ix_(ix,ix)][np.triu_indices(len(ix),1)]
 assert r['within_pairs']==len(ix)*(len(ix)-1)//2
 if len(ix)>1:assert abs(pairs.mean()-r['within_mean'])<1e-10
 else:assert r['within_mean']is None and r['q']is None
 assert abs(sim[np.ix_(ix,other)].mean()-r['cross_mean'])<1e-10
 for j,v in enumerate(d['between'][i]):
  assert v==d['between'][j][i]or abs(v-d['between'][j][i])<1e-10
rows=sorted([r for r in d['groups']if r['p']is not None],key=lambda r:r['p']);q=1
for i in range(len(rows)-1,-1,-1):
 q=min(q,rows[i]['p']*len(rows)/(i+1));assert abs(q-rows[i]['q'])<1e-10
assert d['bh_tests']==14 and d['permutations']==19999
print('PASS exact 16 group sizes, every within/between mean, singleton exclusions, joint-label permutation metadata and 14-test BH')
