import json,math
from pathlib import Path
d=json.loads(Path('reports/五類篇目_空間詞比較.json').read_text(encoding='utf8'))
src=json.loads(Path('.network-runtime/latest-place-space-input.json').read_text(encoding='utf8'))
assert d['source_sha256']==src['source_sha256']
assert d['tests']==len(d['comparisons'])==830 and d['iterations']==49999
for row in d['comparisons']:
 yes=[c for c in src['chapters'] if row['type'] in c['events']]
 no=[c for c in src['chapters'] if row['type'] not in c['events']]
 key='place_words' if row['category']=='地點詞' else 'space_words'
 assert row['inside']==sum(row['word'] in c[key] for c in yes)
 assert row['outside']==sum(row['word'] in c[key] for c in no)
 assert row['inside_n']+row['outside_n']==491
 for field in ['p','q','length_p','length_q']:assert 0<=row[field]<=1
 assert row['q']+1e-12>=row['p'] and row['length_q']+1e-12>=row['length_p']
assert len({(r['type'],r['category'],r['word']) for r in d['comparisons']})==830
assert sum(s['chapters'] for s in d['summary'])>491
print('PASS current-source provenance, all 830 incidence tables, overlapping groups and adjusted probability bounds')
