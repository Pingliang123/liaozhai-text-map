import json,collections
d=json.load(open('reports/全空間詞_五詞群歸納.json',encoding='utf8'));s=json.load(open('.network-runtime/latest-place-space-input.json',encoding='utf8'));by={r['word']:r for r in d['vocabulary']}
assert len(by)==1647 and d['source_sha256']==s['source_sha256']
assert sum(r['word_types']for r in d['coverage'].values())+d['unassigned_types']==1647
assert sum(r['token_count']for r in d['coverage'].values())+d['unassigned_tokens']==4951
for c in s['chapters']:
 assert all(w in by for w in c['tokens'])
for word,group in [('洞房','房室'),('水月寺',None),('柳沟寺',None),('山村',None),('古煤井','山穴'),('家中','房室'),('壁上','門戶'),('地下',None),('墓',None),('济南',None)]:
 assert by[word]['group']==group,(word,by[word]['group'])
for row in d['comparisons']:
 if row['variant']!='擴充詞表':continue
 yes=[c for c in s['chapters']if row['type']in c['events']];no=[c for c in s['chapters']if row['type']not in c['events']]
 hit=lambda c:any(by[w]['group']==row['group']for w in set(c['tokens']))
 assert row['inside']==sum(map(hit,yes)) and row['outside']==sum(map(hit,no))
 assert row['inside_n']+row['outside_n']==491
tests=sorted(d['comparisons'],key=lambda r:r['p']);q=1
for i in range(49,-1,-1):
 q=min(q,tests[i]['p']*50/(i+1));assert abs(q-tests[i]['q50'])<1e-10
assert sum(r['n']for r in d['combinations'])==491
print('PASS exhaustive vocabulary ledger, coverage reconciliation, semantic exceptions, all expanded incidence tables and 50-test BH')
