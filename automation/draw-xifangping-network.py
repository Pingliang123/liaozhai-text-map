"""Reproducible close-reading pilot, independent of the published corpus."""
import os
import sys
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / ".network-runtime" / "plot-libs"))
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.font_manager import FontProperties
import networkx as nx

os.chdir(ROOT)
script = """const M=require('./automation/ghost_map_model'),p=require('./data-package.json'),R=require('./assets/spatial-routes');const m=M.create(p.base);m.importDocument(p.revisions);const c=m.view(395);console.log(JSON.stringify({units:c.source_units,tokens:R.tokenUnits(c,R.lexicon(c))}));"""
source = json.loads(subprocess.check_output(["node", "-e", script], encoding="utf-8"))
vocabulary = {word for unit in source["tokens"] for word in unit}
full = "".join(unit["text"] for unit in source["units"])
# Scoped nodes distinguish two doors and two courts rather than merging homonyms.
nodes = [
 ("home", "家", "席家", "人间"),
 ("city", "城", "冥城", "地界"),
 ("prison", "狱门", "", "地界"),
 ("eaves", "簷下", "父亲停留", "地界"),
 ("county", "门", "城隍遣役所至家门", "人间"),
 ("prefect", "郡司", "受理诉状的机构", "地界"),
 ("court", "堂上", "冥王审判", "地界"),
 ("inn", "逆旅", "", "地界"),
 ("east", "东墀", "", "地界"),
 ("bed", "铁床", "", "地界"),
 ("north", "北门", "", "地界"),
 ("road", "路侧", "", "未明"),
 ("village", "村", "转生村落", "人间"),
 ("door", "门中", "转生入口", "人间"),
 ("office", "官廨", "二郎审判", "未明"),
 ("return", "途中", "父子归途", "未明"),
]
# Each edge is a close-reading decision with a source excerpt and explicit type.
relations = [
 ("home","city","推定","盖魂已离舍矣"),
 ("city","prison","移动","至狱门"),
 ("prison","eaves","关联","遥见父卧簷下"),
 ("prison","prefect","推定","冥行百余里"),
 ("prefect","county","推定","城隍恐其再讼，遣役押送归家"),
 ("county","court","推定","席不肯入，遁赴冥府"),
 ("court","inn","关联","逆旅主人告曰"),
 ("court","east","移动","两鬼捽席下，见东墀有铁床"),
 ("east","bed","移动","鬼脱席衣，掬置其上"),
 ("bed","court","移动","复至堂上"),
 ("court","north","移动","隶率出北门"),
 ("north","court","推定","捽回复见冥王"),
 ("court","road","推定","行数步，辄憩路侧"),
 ("road","village","移动","约半日，至一村"),
 ("village","door","移动","推入门中"),
 ("door","office","推定","九王既去，席从二郎至一官廨"),
 ("office","return","推定","因使两人送之归里"),
 ("return","home","移动","既至家，席先苏"),
]
G = nx.DiGraph()
for ident, word, context, realm in nodes:
 assert word in vocabulary, word
 count = sum(word in unit for unit in source["tokens"])
 G.add_node(ident, word=word, context=context, realm=realm, count=count)
records = []
for a, b, kind, quote in relations:
 assert quote in full, quote
 G.add_edge(a,b,weight=1,kind=kind)
 records.append(dict(source=a,target=b,kind=kind,quote=quote))
# Context links also constrain layout, with half the attraction of movement.
layout_graph = nx.Graph()
layout_graph.add_nodes_from(G)
for a,b,d in G.edges(data=True):
 old=layout_graph.get_edge_data(a,b,{}).get("weight",0)
 layout_graph.add_edge(a,b,weight=old+(0.5 if d["kind"]=="关联" else 1))
pos = nx.spring_layout(layout_graph, seed=42, weight="weight", k=0.85, iterations=600)
font = FontProperties(fname="C:/Windows/Fonts/msyh.ttc")
plt.rcParams["font.family"] = font.get_name()
fig, ax = plt.subplots(figsize=(18,12), facecolor="#faf8f1")
ax.set_facecolor("#faf8f1")
palette={"人间":"#347da8","地界":"#8653a0","未明":"#8a8a80"}
sizes=[280+G.nodes[n]["count"]*115 for n in G]
nx.draw_networkx_nodes(G,pos,node_size=sizes,node_color=[palette[G.nodes[n]["realm"]] for n in G],edgecolors="white",linewidths=2,ax=ax)
for a,b,d in G.edges(data=True):
 nx.draw_networkx_edges(G,pos,edgelist=[(a,b)],node_size=sizes,width=2.2 if d["kind"]=="移动" else 1.5,style={"移动":"solid","推定":"dashed","关联":"dotted"}[d["kind"]],edge_color="#496253" if d["kind"]=="移动" else "#8d958b",arrows=d["kind"]!="关联",arrowsize=19,connectionstyle="arc3,rad=0.09",ax=ax)
for ident,word,context,realm in nodes:
 x,y=pos[ident]
 label=word+" ["+str(G.nodes[ident]["count"])+"]"+("\n"+context if context else "")
 ax.annotate(label,(x,y),xytext=(0,22),textcoords="offset points",ha="center",va="bottom",fontproperties=font,fontsize=11,bbox=dict(boxstyle="round,pad=0.25",fc="#faf8f1",ec="none",alpha=.92))
ax.set_title("《席方平》空间路径图 · 原文核读试作",fontproperties=font,fontsize=23,pad=28)
ax.axis("off")
fig.text(.05,.075,"蓝色＝人间　紫色＝地界　灰色＝归属未明\n实线箭头＝明确移动　虚线箭头＝上下文推定　点线＝场所关联",fontproperties=font,fontsize=12)
fig.text(.05,.025,"节点面积与括号数字按含该词的原文单元数计算。位置采用加权力导向布局（seed=42）。线长为布局结果，无地理／时间单位。\n本图为核读试作。郡司按受理诉状的机构理解。神祇出现处的三界归属待核。",fontproperties=font,fontsize=10,color="#55584f")
fig.subplots_adjust(bottom=.17,top=.9,left=.06,right=.94)
out=ROOT/"reports"/"席方平空間路徑圖"
fig.savefig(str(out)+".png",dpi=180)
fig.savefig(str(out)+".svg")
Path(str(out)+".json").write_text(json.dumps({"nodes":[dict(id=n,**d) for n,d in G.nodes(data=True)],"relations":records,"layout":"spring_layout","seed":42,"positions":{n:list(map(float,p)) for n,p in pos.items()}},ensure_ascii=False,indent=2),encoding="utf-8")
print(str(out)+".png")
