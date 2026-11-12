"""Two full-corpus views following the supplied notebook pipelines."""
import csv
import json
import os
import sys
import subprocess
from collections import Counter
from pathlib import Path
import unicodedata
ROOT=Path(__file__).resolve().parents[1]
if os.environ.get("PYTHONHASHSEED")!="42":
 environment=dict(os.environ,PYTHONHASHSEED="42")
 raise SystemExit(subprocess.call([sys.executable,str(Path(__file__).resolve())],env=environment))
sys.path.insert(0,str(ROOT/".network-runtime"/"plot-libs"))
import networkx as nx
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.font_manager import FontProperties
os.chdir(ROOT)
script="""const M=require('./automation/ghost_map_model'),p=require('./data-package.json'),R=require('./assets/spatial-routes');const m=M.create(p.base);m.importDocument(p.revisions);console.log(JSON.stringify(m.ids.map(id=>{const c=m.view(id),tokens=R.tokenUnits(c,R.lexicon(c));return{id,title:c.chapter,units:c.source_units.map((u,i)=>({id:u.unit,text:u.text,tokens:tokens[i]})),words:[...new Set([...c.space_words,...c.places.map(p=>p.word)])]}})));"""
chapters=json.loads(subprocess.check_output(["node","-e",script],encoding="utf-8"))
G=nx.Graph()
evidence=[]
frequency=Counter()
for chapter in chapters:
 vocabulary=set(chapter["words"])
 tokens=[]
 for unit in chapter["units"]:
  for word in unit["tokens"]:
   if any(unicodedata.category(c)[0] in ("L","N") for c in word):
    tokens.append(dict(word=word,unit=unit["id"]))
 frequency.update(t["word"] for t in tokens if t["word"] in vocabulary)
 G.add_nodes_from(sorted(vocabulary.intersection(t["word"] for t in tokens)))
 for i,first in enumerate(tokens):
  if first["word"] not in vocabulary:continue
  for j in range(i+1,min(i+11,len(tokens))):
   second=tokens[j]
   if second["word"] not in vocabulary or second["word"]==first["word"]:continue
   a,b=sorted((first["word"],second["word"]))
   if not G.has_edge(a,b):G.add_edge(a,b,weight=0,chapters=set())
   G[a][b]["weight"]+=1
   G[a][b]["chapters"].add(chapter["id"])
   evidence.append([chapter["id"]+1,chapter["title"],a,b,i,j,j-i,first["unit"],second["unit"],"".join(t["word"] for t in tokens[max(0,i-4):j+5])])
assert sum(d["weight"] for a,b,d in G.edges(data=True))==len(evidence)
assert len({(r[0],r[4],r[5]) for r in evidence})==len(evidence)
font=FontProperties(fname="C:/Windows/Fonts/msyh.ttc")
plt.rcParams["font.family"]=font.get_name()
prefix=ROOT/"reports"/"聊齋全書_附件方法"
with Path(str(prefix)+"_完整詞對.csv").open("w",encoding="utf-8-sig",newline="") as stream:
 writer=csv.writer(stream);writer.writerow(["篇号","篇名","词一","词二","位置一","位置二","词距","单元一","单元二","分词上下文"]);writer.writerows(evidence)
full_record=dict(chapters=len(chapters),window=10,non_punctuation=True,counts="unordered occurrence pairs, counted once",nodes=[dict(word=n,frequency=frequency[n]) for n in G],edges=[dict(source=a,target=b,weight=d["weight"],chapters=sorted(d["chapters"])) for a,b,d in G.edges(data=True)])
Path(str(prefix)+"_完整網絡.json").write_text(json.dumps(full_record,ensure_ascii=False,indent=2),encoding="utf-8")
summaries=[]
for method in ["Tutorial5","老子網絡"]:
 H=G.copy()
 if method=="Tutorial5":
  while True:
   leaves=[n for n,d in H.degree() if d==1]
   if not leaves:break
   H.remove_nodes_from(leaves)
  rule="反复移除度为 1 的节点；保留完整网络副本"
 else:
  H.remove_edges_from([(a,b) for a,b,d in H.edges(data=True) if d["weight"]<2])
  H.remove_nodes_from(list(nx.isolates(H)))
  rule="保留权重 ≥ 2 的边；移除孤立节点"
 # Tutorial denoising leaves degree-zero nodes; keep them in H and list separately.
 isolates=list(nx.isolates(H))
 active=H.subgraph([n for n in H if n not in isolates]).copy()
 communities=nx.community.louvain_communities(active,weight="weight",seed=42)
 partition={n:i for i,group in enumerate(communities) for n in group}
 chosen=set()
 for group in communities:
  chosen.update(sorted(group,key=lambda n:(-active.degree(n,weight="weight"),n))[:20])
 selected=active.subgraph(chosen).copy()
 pos=nx.spring_layout(selected,seed=42,k=.5 if method=="Tutorial5" else 2,weight="weight",iterations=300)
 degree=nx.degree_centrality(active)
 colors=plt.get_cmap("hsv")
 sizes=[max(18,degree[n]*18000) if method=="Tutorial5" else active.degree(n,weight="weight")*100 for n in selected]
 fig,ax=plt.subplots(figsize=(23,19),facecolor="#faf8f1");ax.set_facecolor("#faf8f1")
 nx.draw_networkx_edges(selected,pos,ax=ax,alpha=.48,edge_color="#607d6c",width=[.7+min(3,d["weight"]*.2) for a,b,d in selected.edges(data=True)])
 nx.draw_networkx_nodes(selected,pos,ax=ax,node_size=sizes,node_color=[colors(partition[n]/max(1,len(communities))) for n in selected],edgecolors="white",linewidths=.5)
 ranked=sorted(selected,key=lambda n:(-active.degree(n,weight="weight"),n))
 for i,n in enumerate(ranked[:50]):
  ax.annotate(n,pos[n],xytext=((i%3-1)*12,10 if i%2 else -15),textcoords="offset points",fontproperties=font,fontsize=9,bbox=dict(fc="#faf8f1",ec="none",alpha=.8,pad=.1))
 ax.axis("off")
 ax.set_title("《聊斋志异》全书空间词汇网络 · "+method,fontproperties=font,fontsize=24,pad=25)
 fig.subplots_adjust(bottom=.15,top=.92,left=.04,right=.96)
 fig.text(.05,.105,f'完整网络 {len(G)} 节点／{G.number_of_edges()} 边；筛选后 {len(H)} 节点／{H.number_of_edges()} 边；显示每群前 20 点，共 {len(selected)} 点／{selected.number_of_edges()} 边。',fontproperties=font,fontsize=12)
 fig.text(.05,.075,rule+"。颜色为 Louvain 群组。节点大小："+("度中心性" if method=="Tutorial5" else "加权度")+"。",fontproperties=font,fontsize=12)
 fig.text(.05,.045,"前后 10 个非标点词，同一出现位置配对只计一次，限于篇内；沿用已有分词及空间／地点词表。NetworkX Louvain，seed=42。",fontproperties=font,fontsize=10)
 fig.text(.05,.02,"PNG 标注加权度前 50 词，SVG 显示全部选中词标签。位置为加权 spring_layout，线长为算法结果。同形词合并，保留对话及判词。",fontproperties=font,fontsize=10)
 output=Path(str(prefix)+"_"+method)
 fig.savefig(str(output)+".png",dpi=160)
 for n in ranked[50:]:ax.text(*pos[n],n,fontproperties=font,fontsize=5,alpha=.8)
 fig.savefig(str(output)+".svg")
 plt.close(fig)
 record=dict(method=method,filter_rule=rule,full_nodes=len(G),full_edges=G.number_of_edges(),filtered_nodes=len(H),filtered_edges=H.number_of_edges(),communities=len(communities),displayed_nodes=len(selected),displayed_edges=selected.number_of_edges(),isolates=isolates,community_implementation="networkx.louvain_communities",nodes=[dict(word=n,community=partition[n],strength=active.degree(n,weight="weight"),degree_centrality=degree[n],x=float(pos[n][0]),y=float(pos[n][1])) for n in selected])
 Path(str(output)+".json").write_text(json.dumps(record,ensure_ascii=False,indent=2),encoding="utf-8")
 assert set(selected)<=set(G)
 assert all(selected[a][b]["weight"]==G[a][b]["weight"] for a,b in selected.edges())
 summaries.append({k:v for k,v in record.items() if k not in ("nodes","isolates")})
print(json.dumps(dict(chapters=len(chapters),pairs=len(evidence),versions=summaries),ensure_ascii=False))
