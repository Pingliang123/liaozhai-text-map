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
# Explicit spatial relations are reviewed separately from lexical co-occurrence.
full="".join(unit["text"] for unit in source["units"])
token_vocabulary={word for tokens in source["tokens"] for word in tokens}
reviewed=[
 ("狱中","簷下","归属推定","其父已收狱中。至狱门，遥见父卧簷下"),
 ("狱门","狱中","边界关联","其父已收狱中。至狱门"),
 ("阴曹","狱中","归属推定","其父已收狱中"),
 ("阴曹","冥府","归属推定","席不肯入，遁赴冥府"),
 ("冥府","堂上","归属推定","升堂，见冥王有怒色"),
 ("堂上","东墀","归属推定","两鬼捽席下，见东墀有铁床"),
 ("东墀","铁床","明确包含","见东墀有铁床"),
 ("冥府","北门","归属推定","冥王立命送还阳界。隶率出北门"),
 ("冥府","逆旅","场景关联","逆旅主人告曰"),
 ("村","门阈","归属推定","至一村，一门半辟，鬼引与共坐；席便据门阈"),
 ("村","门中","归属推定","二鬼乘其不备，推入门中"),
 ("官廨","当堂","归属推定","当堂对勘，席所言皆不妄"),
 ("家","楼阁","产权关联","楼阁田产，尽为席有"),
]
for a,b,kind,quote in reviewed:
 assert a in token_vocabulary and b in token_vocabulary,(a,b)
 assert quote in full,quote
 for word in (a,b):
  if word not in G:G.add_node(word,count=sum(word in tokens for unit,tokens in sentences),kind="空间词")
 if not G.has_edge(a,b):G.add_edge(a,b,weight=1,quotes=[])
 G[a][b].update(relation=kind)
 G[a][b]["quotes"].append(dict(text=quote,interpretation=kind))
for a,b,d in G.edges(data=True):
 d.setdefault("relation","同句段共现")
isolates=list(nx.isolates(G))
H=G.subgraph([n for n in G if n not in isolates]).copy()
assert all(n in token_vocabulary for n in H)
pos={}
components=sorted(nx.connected_components(H),key=len,reverse=True)
for index,component in enumerate(components):
 local=nx.spring_layout(H.subgraph(component),seed=42,k=1.1,iterations=700,weight="weight")
 if index==0:
  for n,p in local.items():pos[n]=(-.55+float(p[0])*.60,float(p[1])*.85)
 else:
  center_y=.85-(index-1)*.40
  for n,p in local.items():pos[n]=(.80+float(p[0])*.22,center_y+float(p[1])*.10)
font=FontProperties(fname="C:/Windows/Fonts/msyh.ttc")
plt.rcParams["font.family"]=font.get_name()
fig,ax=plt.subplots(figsize=(19,14),facecolor="#faf8f1")
ax.set_facecolor("#faf8f1")
sizes=[220+H.nodes[n]["count"]*100 for n in H]
for a,b,d in H.edges(data=True):
 nx.draw_networkx_edges(H,pos,edgelist=[(a,b)],width=2,style="dashed" if d["relation"]=="归属推定" else "dotted" if d["relation"]=="同句段共现" else "solid",alpha=.7,edge_color="#71877d",ax=ax)
nx.draw_networkx_nodes(H,pos,node_size=sizes,node_color=["#8c65a7" if H.nodes[n]["kind"]=="地点词" else "#368574" for n in H],edgecolors="white",linewidths=2,ax=ax)
for n,(x,y) in pos.items():
 offset=22 if list(H).index(n)%2 else -30
 ax.annotate(n+" ["+str(H.nodes[n]["count"])+"]",(x,y),xytext=(0,offset),textcoords="offset points",ha="center",fontproperties=font,fontsize=12,bbox=dict(boxstyle="round,pad=.2",fc="#faf8f1",ec="none",alpha=.9))
ax.set_title("《席方平》空间关系网络",fontproperties=font,fontsize=24,pad=26)
ax.axis("off")
fig.text(.06,.10,"实线＝明确包含、边界或产权／场景关联　虚线＝上下文归属推定　点线＝同句段共现",fontproperties=font,fontsize=12)
fig.text(.06,.065,"节点面积／数字＝含该词的句段数。同形词尚未按场景拆分。\n各连通组独立加权布局，组间位置为排版安排。线长无地理或时间单位。关系与引句随 JSON 保存。",fontproperties=font,fontsize=11)
fig.text(.06,.025,"另有 "+str(len(isolates))+" 个词项未形成同句段连线，完整词表与引句保存在数据文件。",fontproperties=font,fontsize=10)
fig.subplots_adjust(bottom=.18,top=.91,left=.06,right=.94)
out=ROOT/"reports"/"席方平空間關係網絡"
fig.savefig(str(out)+".png",dpi=180)
fig.savefig(str(out)+".svg")
Path(str(out)+".json").write_text(json.dumps({"basis":"以句号问号叹号结束处合并分词单元，按句段完整分词共现","seed":42,"nodes":[dict(word=n,**d) for n,d in G.nodes(data=True)],"edges":[dict(source=a,target=b,**d) for a,b,d in G.edges(data=True)],"isolates":isolates},ensure_ascii=False,indent=2),encoding="utf-8")
print(json.dumps({"nodes":len(H),"edges":H.number_of_edges(),"isolates":isolates},ensure_ascii=False))
