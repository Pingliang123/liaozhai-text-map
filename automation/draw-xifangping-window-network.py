"""Notebook-style lexical network using token occurrence pairs within 10 words."""
import csv
import json
import os
from pathlib import Path
import subprocess
import sys
from collections import Counter
import unicodedata

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / ".network-runtime" / "plot-libs"))
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.font_manager import FontProperties
import networkx as nx


def pairs_within_window(tokens, vocabulary, window=10):
    """Count each unordered pair of distinct token occurrences once."""
    pairs = []
    for i, item in enumerate(tokens):
        if item["word"] not in vocabulary:
            continue
        for j in range(i + 1, min(len(tokens), i + window + 1)):
            other = tokens[j]
            if other["word"] in vocabulary and other["word"] != item["word"]:
                pairs.append((i, j))
    return pairs


def build():
    os.chdir(ROOT)
    script = """const M=require('./automation/ghost_map_model'),p=require('./data-package.json'),R=require('./assets/spatial-routes');const m=M.create(p.base);m.importDocument(p.revisions);const c=m.view(395);console.log(JSON.stringify({units:c.source_units,tokens:R.tokenUnits(c,R.lexicon(c)),spaces:c.space_words,places:c.places.map(p=>p.word)}));"""
    data = json.loads(subprocess.check_output(["node", "-e", script], encoding="utf-8"))
    tokens = []
    for unit, words in zip(data["units"], data["tokens"]):
        for word in words:
            if any(unicodedata.category(char)[0] in ("L", "N") for char in word):
                tokens.append(dict(word=word, unit=unit["unit"]))
    vocabulary = set(data["spaces"] + data["places"])
    frequency = Counter(item["word"] for item in tokens if item["word"] in vocabulary)
    graph = nx.Graph()
    graph.add_nodes_from(sorted(frequency))
    evidence = []
    for i, j in pairs_within_window(tokens, vocabulary):
        a, b = tokens[i]["word"], tokens[j]["word"]
        if not graph.has_edge(a, b):
            graph.add_edge(a, b, weight=0)
        graph[a][b]["weight"] += 1
        evidence.append(dict(
            source=a, target=b, first=i, second=j, distance=j-i,
            first_unit=tokens[i]["unit"], second_unit=tokens[j]["unit"],
            context="".join(item["word"] for item in tokens[max(0,i-5):j+6])
        ))
    isolates = sorted(nx.isolates(graph))
    connected = graph.subgraph([word for word in graph if word not in isolates]).copy()
    communities = nx.community.louvain_communities(connected, weight="weight", seed=42)
    community_id = {word:index for index, group in enumerate(communities) for word in group}
    positions = {}
    components = sorted(nx.connected_components(connected), key=lambda c:(-len(c),sorted(c)))
    for index, component in enumerate(components):
        local = nx.spring_layout(connected.subgraph(component), weight="weight", seed=42, k=.9, iterations=800)
        center_x = (index % 3 - 1) * 1.1
        center_y = .65 - (index // 3) * 1.3
        for word, point in local.items():
            positions[word] = (center_x + float(point[0])*.35, center_y + float(point[1])*.40)
    font = FontProperties(fname="C:/Windows/Fonts/msyh.ttc")
    plt.rcParams["font.family"] = font.get_name()
    fig, ax = plt.subplots(figsize=(18, 14), facecolor="#faf8f1")
    ax.set_facecolor("#faf8f1")
    palette = ["#3f8276", "#b27049", "#8471b0", "#447fa6", "#b69738", "#b76186"]
    sizes = [400 * connected.degree(word, weight="weight") for word in connected]
    nx.draw_networkx_edges(
        connected, positions, ax=ax, edge_color="#63786c", alpha=.60,
        width=[.8 + d["weight"]*.7 for _,_,d in connected.edges(data=True)]
    )
    nx.draw_networkx_nodes(
        connected, positions, ax=ax, node_size=sizes,
        node_color=[palette[community_id[word] % len(palette)] for word in connected],
        edgecolors="white", linewidths=2
    )
    # Keep labels legible with deterministic candidate offsets and leader lines.
    occupied = []
    fig.subplots_adjust(left=.06, right=.94, bottom=.19, top=.90)
    fig.canvas.draw()
    renderer = fig.canvas.get_renderer()
    for word in sorted(connected, key=lambda n:connected.degree(n,weight="weight"), reverse=True):
        x, y = positions[word]
        label = word+" ["+str(connected.degree(word, weight="weight"))+"]"
        artist = None
        for offset in [(0,20),(0,-28),(32,12),(-32,12),(40,-24),(-40,-24),(0,44),(0,-52),(60,30),(-60,30)]:
            if artist is not None:
                artist.remove()
            artist = ax.annotate(
                label,(x,y),xytext=offset,textcoords="offset points",ha="center",
                fontproperties=font,fontsize=12,
                bbox=dict(boxstyle="round,pad=.18",fc="#faf8f1",ec="none",alpha=.92),
                arrowprops=dict(arrowstyle="-",color="#a8b0a5",lw=.65)
            )
            box = artist.get_window_extent(renderer).expanded(1.03,1.06)
            if not any(box.overlaps(previous) for previous in occupied):
                break
        occupied.append(box)
    ax.set_title("《席方平》空间词汇关系网络 · 前后 10 词共现",fontproperties=font,fontsize=23,pad=25)
    ax.axis("off")
    fig.text(.06,.12,"节点面积／括号数字＝加权度　线宽＝词对次数　颜色＝Louvain 社群（共 "+str(len(communities))+" 群）",fontproperties=font,fontsize=12)
    fig.text(.06,.075,"窗口按非标点分词计数，可跨句但限于本篇。每对出现位置只计一次，保留权重为 1 的边。\n各连通组采用加权 spring_layout，seed=42，分组排版。组间距离为排版安排，线长无地理或时间单位。",fontproperties=font,fontsize=11)
    fig.text(.06,.025,"词项沿用现有地名／空间词表，包含对话、意向和判词提及。同形词合并。未连线词项："+("、".join(isolates) or "无"),fontproperties=font,fontsize=10)
    output = ROOT/"reports"/"席方平空間詞共現網絡_窗口10"
    fig.savefig(str(output)+".png",dpi=180)
    fig.savefig(str(output)+".svg")
    record = dict(
        method="10 non-punctuation tokens, occurrence pairs counted once",
        window=10, seed=42, community_algorithm="networkx.louvain_communities",
        nodes=[dict(word=word,frequency=frequency[word],strength=graph.degree(word,weight="weight"),community=community_id.get(word)) for word in graph],
        edges=[dict(source=a,target=b,weight=d["weight"]) for a,b,d in graph.edges(data=True)],
        isolates=isolates, evidence=evidence,
        positions={word:list(map(float,position)) for word,position in positions.items()}
    )
    Path(str(output)+".json").write_text(json.dumps(record,ensure_ascii=False,indent=2),encoding="utf-8")
    with Path(str(output)+"_詞對.csv").open("w",encoding="utf-8-sig",newline="") as stream:
        writer=csv.DictWriter(stream,fieldnames=list(evidence[0]))
        writer.writeheader()
        writer.writerows(evidence)
    assert sum(d["weight"] for a,b,d in graph.edges(data=True))==len(evidence)
    assert all(0 < item["distance"] <= 10 for item in evidence)
    assert len({(item["first"],item["second"]) for item in evidence})==len(evidence)
    print(json.dumps(dict(nodes=len(graph),shown=len(connected),edges=graph.number_of_edges(),pairs=len(evidence),communities=len(communities),isolates=isolates),ensure_ascii=False))


if __name__ == "__main__":
    fixture=[dict(word=word,unit=0) for word in ["室","门","室"]]
    assert pairs_within_window(fixture,{"室","门"},1)==[(0,1),(1,2)]
    assert pairs_within_window(fixture,{"室","门"},0)==[]
    build()
