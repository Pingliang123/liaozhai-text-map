"""Space relations from exact token co-occurrence in original source units."""
import os
import sys
import json
import subprocess
from pathlib import Path
from itertools import combinations
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/".network-runtime"/"plot-libs"))
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.font_manager import FontProperties
import networkx as nx
os.chdir(ROOT)
script="""const M=require('./automation/ghost_map_model'),p=require('./data-package.json'),R=require('./assets/spatial-routes');const m=M.create(p.base);m.importDocument(p.revisions);const c=m.view(395);console.log(JSON.stringify({units:c.source_units,tokens:R.tokenUnits(c,R.lexicon(c)),spaces:c.space_words,places:c.places.map(p=>p.word)}));"""
source=json.loads(subprocess.check_output(["node","-e",script],encoding="utf-8"))
vocabulary=set(source["spaces"]+source["places"])
G=nx.Graph()
sentences=[]
buffer_text=""
buffer_tokens=[]
start_unit=None
for unit,tokens in zip(source["units"],source["tokens"]):
 if start_unit is None:start_unit=unit["unit"]
 buffer_text+=unit["text"]
 buffer_tokens.extend(tokens)
 if unit["text"].rstrip('」』”').endswith(('。','！','？')):
  sentences.append((dict(unit=start_unit,text=buffer_text),buffer_tokens))
  buffer_text="";buffer_tokens=[];start_unit=None
if buffer_text:sentences.append((dict(unit=start_unit,text=buffer_text),buffer_tokens))
for unit,tokens in sentences:
 words=sorted(set(tokens)&vocabulary)
 for word in words:
  if word not in G:G.add_node(word,count=0,kind="地点词" if word in source["places"] else "空间词")
  G.nodes[word]["count"]+=1
 for a,b in combinations(words,2):
  if not G.has_edge(a,b):G.add_edge(a,b,weight=0,quotes=[])
  G[a][b]["weight"]+=1
  G[a][b]["quotes"].append(dict(unit=unit["unit"],text=unit["text"]))
isolates=list(nx.isolates(G))
H=G.subgraph([n for n in G if n not in isolates]).copy()
assert all(d["weight"]==len(d["quotes"]) for a,b,d in H.edges(data=True))
assert all(n in vocabulary for n in H)
pos=nx.spring_layout(H,seed=42,k=1.1,iterations=700,weight="weight")
font=FontProperties(fname="C:/Windows/Fonts/msyh.ttc")
plt.rcParams["font.family"]=font.get_name()
fig,ax=plt.subplots(figsize=(19,14),facecolor="#faf8f1")
ax.set_facecolor("#faf8f1")
sizes=[220+H.nodes[n]["count"]*100 for n in H]
nx.draw_networkx_edges(H,pos,width=[.7+1.5*d["weight"] for a,b,d in H.edges(data=True)],alpha=.55,edge_color="#71877d",ax=ax)
nx.draw_networkx_nodes(H,pos,node_size=sizes,node_color=["#8c65a7" if H.nodes[n]["kind"]=="地点词" else "#368574" for n in H],edgecolors="white",linewidths=2,ax=ax)
for n,(x,y) in pos.items():
 ax.annotate(n+" ["+str(H.nodes[n]["count"])+"]",(x,y),xytext=(0,17),textcoords="offset points",ha="center",fontproperties=font,fontsize=12,bbox=dict(boxstyle="round,pad=.2",fc="#faf8f1",ec="none",alpha=.9))
ax.set_title("《席方平》空间关系网络 · 原文句段共现",fontproperties=font,fontsize=24,pad=26)
ax.axis("off")
fig.text(.06,.10,"绿＝空间词　紫＝地点词　节点面积／数字＝含该词的句段数　线宽＝共同出现的句段数",fontproperties=font,fontsize=12)
fig.text(.06,.065,"无向连线表示同句段共现，按原文句号、问号、叹号结束处合并连续分词单元。\n共现包括叙述、对话与判词。位置采用加权力导向布局（seed=42），长度没有地理／时间单位。",fontproperties=font,fontsize=11)
fig.text(.06,.025,"另有 "+str(len(isolates))+" 个词项未形成同句段连线，完整词表与引句保存在数据文件。",fontproperties=font,fontsize=10)
fig.subplots_adjust(bottom=.18,top=.91,left=.06,right=.94)
out=ROOT/"reports"/"席方平空間關係網絡"
fig.savefig(str(out)+".png",dpi=180)
fig.savefig(str(out)+".svg")
Path(str(out)+".json").write_text(json.dumps({"basis":"以句号问号叹号结束处合并分词单元，按句段完整分词共现","seed":42,"nodes":[dict(word=n,**d) for n,d in G.nodes(data=True)],"edges":[dict(source=a,target=b,**d) for a,b,d in G.edges(data=True)],"isolates":isolates},ensure_ascii=False,indent=2),encoding="utf-8")
print(json.dumps({"nodes":len(H),"edges":H.number_of_edges(),"isolates":isolates},ensure_ascii=False))
