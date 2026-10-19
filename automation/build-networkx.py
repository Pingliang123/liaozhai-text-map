"""Apply the supplied Tutorial_5 workflow to saved relation layers."""
import json
import math
import platform
import sys
from pathlib import Path
local = Path(__file__).resolve().parent.parent / '.network-runtime'
if local.exists():
    sys.path.insert(0, str(local))
import networkx as nx
import numpy as np
import community as community_louvain

def analyze(record):
    graph = nx.DiGraph() if record['directed'] else nx.Graph()
    graph.add_nodes_from(n['id'] for n in record['nodes'])
    for e in record['edges']:
        if graph.has_edge(e['source'], e['target']):
            graph[e['source']][e['target']]['weight'] += e['weight']
        else:
            graph.add_edge(e['source'], e['target'], weight=e['weight'])
    # Louvain in the tutorial requires Graph: sum both directions in a copy.
    projection = nx.Graph()
    projection.add_nodes_from(graph)
    for a, b, d in graph.edges(data=True):
        if projection.has_edge(a, b):
            projection[a][b]['weight'] += d['weight']
        else:
            projection.add_edge(a, b, weight=d['weight'])
    partition = community_louvain.best_partition(projection, random_state=42, weight='weight') if graph else {}
    degree = nx.degree_centrality(graph)
    between = nx.betweenness_centrality(graph, weight=None, normalized=True)
    close = nx.closeness_centrality(graph, distance=None)
    eigen_error = None
    try:
        eigen = nx.eigenvector_centrality(graph, max_iter=1000, tol=1e-8, weight=None) if graph else {}
    except nx.PowerIterationFailedConvergence:
        eigen = {}
        eigen_error = '1000次迭代未收敛，未填写伪造值。'
    communities = {}
    for node, group in partition.items():
        communities.setdefault(group, []).append(node)
    strength = dict(graph.degree(weight='weight'))
    top_nodes = set()
    for members in communities.values():
        top_nodes.update(sorted(members, key=lambda n: (-strength[n], n))[:20])
    # Preserve the directed induced subgraph for drawing; positions use the same
    # undirected projection as community detection, with tutorial seed and k.
    draw = graph.subgraph(top_nodes).copy()
    pos = nx.spring_layout(projection, seed=42, k=0.5, weight='weight', iterations=50) if graph else {}
    top_pos = nx.spring_layout(projection.subgraph(top_nodes).copy(), seed=42, k=0.5, weight='weight', iterations=50) if top_nodes else {}
    metrics = {}
    for n in graph:
        row = dict(degree=degree[n], betweenness=between[n], closeness=close[n], eigenvector=eigen.get(n), strength=strength[n])
        if graph.is_directed():
            row.update(in_degree=graph.in_degree(n), out_degree=graph.out_degree(n), in_strength=graph.in_degree(n, weight='weight'), out_strength=graph.out_degree(n, weight='weight'))
        metrics[n] = row
    return dict(signature=record['signature'], directed=record['directed'], nodes=graph.number_of_nodes(), edges=graph.number_of_edges(), partition=partition, metrics=metrics, positions={n: [float(v) for v in p] for n, p in pos.items()}, top_positions={n: [float(v) for v in p] for n, p in top_pos.items()}, top_nodes=sorted(top_nodes), top_edges=draw.number_of_edges(), eigen_error=eigen_error)

def main():
    source = json.loads(Path('network-input.json').read_text(encoding='utf-8'))
    output = dict(method='NetworkX + python-louvain; Tutorial_5 adaptation', tutorial_sha256='c92485e4e8e36759f4ba2545e6bca29b50746daa3bff93d1208d726637cf0cf6', python=platform.python_version(), networkx=nx.__version__, numpy=np.__version__, louvain=community_louvain.__version__, seed=42, k=0.5, iterations=50, top_n=20, source_hash=source['source_hash'], revision_hash=source['revision_hash'], graphs={})
    cache_path = Path('assets/research-lab/networkx-analysis.json')
    old = json.loads(cache_path.read_text(encoding='utf-8')) if ('--layout-only' in sys.argv or '--refresh-eigen' in sys.argv) and cache_path.exists() else {}
    if '--refresh-eigen' in sys.argv:
        old.update({k: v for k, v in output.items() if k != 'graphs'})
        for key, record in source['graphs'].items():
            assert old['graphs'][key]['signature'] == record['signature']
            graph = nx.DiGraph() if record['directed'] else nx.Graph()
            graph.add_nodes_from(n['id'] for n in record['nodes'])
            graph.add_weighted_edges_from((e['source'], e['target'], e['weight']) for e in record['edges'])
            error = None
            try:
                eigen = nx.eigenvector_centrality(graph, max_iter=1000, tol=1e-8, weight=None) if graph else {}
            except nx.PowerIterationFailedConvergence:
                eigen, error = {}, '1000次迭代未收敛，未填写伪造值。'
            for node, row in old['graphs'][key]['metrics'].items():
                row['eigenvector'] = eigen.get(node)
            old['graphs'][key]['eigen_error'] = error
            print('Refreshed unweighted eigenvector', key, flush=True)
        cache_path.write_text(json.dumps(old, ensure_ascii=False, separators=(',', ':'), allow_nan=False), encoding='utf-8')
        return
    for key, record in source['graphs'].items():
        print('Analyzing', key, len(record['nodes']), 'nodes', flush=True)
        if key in old.get('graphs', {}) and old['graphs'][key]['signature'] == record['signature'] and old.get('numpy') == np.__version__:
            output['graphs'][key] = old['graphs'][key]
            projected = nx.Graph()
            projected.add_nodes_from(n['id'] for n in record['nodes'])
            for e in record['edges']:
                a, b = e['source'], e['target']
                if projected.has_edge(a, b):
                    projected[a][b]['weight'] += e['weight']
                else:
                    projected.add_edge(a, b, weight=e['weight'])
            ids = output['graphs'][key]['top_nodes']
            pos = nx.spring_layout(projected.subgraph(ids).copy(), seed=42, k=0.5, weight='weight', iterations=50) if ids else {}
            output['graphs'][key]['top_positions'] = {n: [float(v) for v in p] for n, p in pos.items()}
        else:
            output['graphs'][key] = analyze(record)
        print('Finished', key, flush=True)
    Path('assets/research-lab/networkx-analysis.json').write_text(json.dumps(output, ensure_ascii=False, separators=(',', ':'), allow_nan=False), encoding='utf-8')

if __name__ == '__main__':
    main()
