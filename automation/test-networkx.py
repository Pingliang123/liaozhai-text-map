import json
import math
from pathlib import Path
from importlib.util import spec_from_file_location, module_from_spec
spec = spec_from_file_location('network_builder', Path(__file__).with_name('build-networkx.py'))
module = module_from_spec(spec)
spec.loader.exec_module(module)
nx = module.nx
record = dict(signature='fixture', directed=True, nodes=[dict(id=n) for n in ['a', 'b', 'c']], edges=[dict(source='a', target='b', weight=3), dict(source='b', target='a', weight=1), dict(source='b', target='c', weight=2)])
result = module.analyze(record)
assert result['directed'] and result['edges'] == 3
assert result['metrics']['a']['in_strength'] == 1
assert result['metrics']['a']['out_strength'] == 3
assert math.isclose(result['metrics']['b']['degree'], 1.5)
assert math.isclose(result['metrics']['b']['betweenness'], 0.5)
assert math.isclose(result['metrics']['c']['closeness'], 2/3)
assert all(len(p) == 2 and all(math.isfinite(v) for v in p) for p in result['top_positions'].values())
assert module.analyze(record)['top_positions'] == result['top_positions']
repeated = dict(record, edges=record['edges'] + [dict(source='a', target='b', weight=2)])
assert module.analyze(repeated)['metrics']['a']['out_strength'] == 5
data = json.loads(Path('assets/research-lab/networkx-analysis.json').read_text(encoding='utf8'))
assert data['networkx'] == '3.4.2' and data['louvain'] == '0.16'
for key, g in data['graphs'].items():
    assert len(g['metrics']) == g['nodes']
    assert set(g['top_positions']) == set(g['top_nodes'])
    for n in g['metrics']:
        assert all(g['metrics'][n][k] >= 0 for k in ['degree', 'betweenness', 'closeness'])
inputs = json.loads(Path('network-input.json').read_text(encoding='utf8'))
for mode in ['chapter', 'unit', 'movement']:
    full = inputs['graphs'][mode + ':full']
    weak = nx.Graph()
    weak.add_nodes_from(n['id'] for n in full['nodes'])
    weak.add_edges_from((e['source'], e['target']) for e in full['edges'])
    while True:
        leaves = [n for n, degree in weak.degree() if degree == 1]
        if not leaves:
            break
        weak.remove_nodes_from(leaves)
    assert set(weak) == {n['id'] for n in inputs['graphs'][mode + ':core']['nodes']}
print('PASS actual NetworkX directed centralities, summed repeated edges, seeded layouts and published analysis schema')
