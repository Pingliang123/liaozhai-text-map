import json,pathlib
p=pathlib.Path('reports');d=json.load(open(p/'space-similarity-event-overlap.json',encoding='utf8'));assert 0<=d['observed']<=1;assert 0<d['p']<=1;assert d['neighbor_selections']==443*5
svg=(p/'全書空間詞_原始詞頻相似度.svg').read_text(encoding='utf8');assert '考城隍' in svg and '黄英' in svg
print('Overlap bounds and complete axis labels passed')
