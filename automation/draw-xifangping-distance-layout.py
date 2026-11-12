"""Existing graph with positions fitted to weighted shortest-path distances."""
import os
import sys
import json
import subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/".network-runtime"/"plot-libs"))
import numpy as np
import networkx as nx
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.font_manager import FontProperties
os.chdir(ROOT)
script="""const d=require('./assets/research-lab/data.json'),C=require('./assets/research-lab/chapter-spaces'),A=require('./assets/research-lab/network-analysis'),R=require('./assets/route-csv-report'),X=require('./assets/research-lab/csv-route-network'),fs=require('fs');const c=d.chapters.find(c=>c.id===395);const csv=R.parse(fs.readFileSync('reports/聊齋空間路徑_精簡版.csv','utf8'));const graph=X.combine(C.build(c),c,csv,false);console.log(JSON.stringify({...graph,source_units:c.units}));"""
raw=json.loads(subprocess.check_output(["node","-e",script],encoding="utf-8"))
evidence_weighted="--evidence-weight" in sys.argv
weight_audit=[]
if evidence_weighted:
 source="".join(u["text"] for u in raw["source_units"])
 pairs={}
 for edge in raw["edges"]:
  key=tuple(sorted((edge["source"],edge["target"])))
  pairs.setdefault(key,[]).append(edge)
 for key,records in pairs.items():
  spans=[]
  for edge in records:
   if edge.get("relation")=="places":continue
   for evidence in edge.get("evidence",[]):
    quote=evidence.get("text","").strip()
    if not quote:continue
    start=source.find(quote)
    if start>=0:spans.append((start,start+len(quote),quote))
    else:
     fragments=[part.strip() for part in quote.splitlines() if part.strip() not in ("","…")]
     located=[(source.find(part),len(part)) for part in fragments]
     if located and all(at>=0 for at,length in located):
      spans.append((min(at for at,length in located),max(at+length for at,length in located),quote))
  merged=[]
  for start,end,quote in sorted(set(spans)):
   if merged and start<merged[-1][1]:
    merged[-1]=(merged[-1][0],max(end,merged[-1][1]))
   else:merged.append((start,end))
  weight=max(1,len(merged))
  for edge in records:edge["weight"]=weight
  weight_audit.append(dict(source=key[0],target=key[1],old_weight=1,new_weight=weight,independent_evidence=[source[a:b] for a,b in merged],fallback=not bool(merged)))
 assert all(row["new_weight"]>=1 for row in weight_audit)
G=nx.Graph()
G.add_nodes_from(n["id"] for n in raw["nodes"])
for edge in raw["edges"]:
 assert edge["weight"]>0
 a,b=edge["source"],edge["target"]
 # Duplicate records remain in raw. Parallel ties use the strongest recorded tie.
 length=1/edge["weight"]
 if not G.has_edge(a,b) or length<G[a][b]["distance"]:
  G.add_edge(a,b,distance=length)
components=sorted(nx.connected_components(G),key=len,reverse=True)
ids=sorted(components[0])
distances=dict(nx.all_pairs_dijkstra_path_length(G.subgraph(ids),weight="distance"))
D=np.array([[distances[a][b] for b in ids] for a in ids])
J=np.eye(len(ids))-np.ones((len(ids),len(ids)))/len(ids)
eigenvalues,eigenvectors=np.linalg.eigh(-.5*J@(D**2)@J)
chosen=np.argsort(eigenvalues)[-2:][::-1]
X=eigenvectors[:,chosen]*np.sqrt(np.maximum(eigenvalues[chosen],0))
# Metric MDS stress minimization with a fixed initialization and no random drift.
def stress(points):
 lengths=np.linalg.norm(points[:,None,:]-points[None,:,:],axis=2)
 return float(np.sum(np.triu((lengths-D)**2,1)))
for iteration in range(1500):
 delta=X[:,None,:]-X[None,:,:]
 lengths=np.maximum(np.linalg.norm(delta,axis=2),1e-10)
 gradient=2*np.sum((1-D/lengths)[:,:,None]*delta,axis=1)
 old=stress(X)
 step=.02
 for attempt in range(20):
  proposal=X-step*gradient
  if stress(proposal)<old:break
  step*=.5
 else:break
 if old-stress(proposal)<1e-10:break
 X=proposal-X.mean(axis=0)
positions={word:X[index] for index,word in enumerate(ids)}
normalized_stress=float(np.sqrt(stress(X)/np.sum(np.triu(D**2,1))))
assert np.isfinite(normalized_stress)
assert np.allclose(D,D.T)
assert np.allclose(np.diag(D),0)
font=FontProperties(fname="C:/Windows/Fonts/msyh.ttc")
plt.rcParams["font.family"]=font.get_name()
fig,ax=plt.subplots(figsize=(18,14),facecolor="#faf8f1")
ax.set_facecolor("#faf8f1")
for edge in raw["edges"]:
 if edge["source"] in positions and edge["target"] in positions:
  a,b=positions[edge["source"]],positions[edge["target"]]
  ax.plot([a[0],b[0]],[a[1],b[1]],color="#7d9185",lw=1.1,alpha=.35,zorder=1)
nodes={n["id"]:n for n in raw["nodes"]}
for word,p in positions.items():
 node=nodes[word]
 color="#8a62a4" if node["kind"]=="place" else "#367a70"
 ax.scatter(p[0],p[1],s=140,c=color,edgecolors="white",zorder=3)
fig.subplots_adjust(bottom=.22,top=.90,left=.08,right=.94)
fig.canvas.draw()
renderer=fig.canvas.get_renderer()
occupied=[]
for word in sorted(ids,key=lambda n:-G.degree(n)):
 annotation=None
 for offset in [(0,15),(0,-22),(28,14),(-28,14),(36,-20),(-36,-20),(0,40),(0,-48),(60,36),(-60,36),(60,-45),(-60,-45)]:
  if annotation is not None:annotation.remove()
  annotation=ax.annotate(nodes[word]["label"],positions[word],xytext=offset,textcoords="offset points",ha="center",fontproperties=font,fontsize=11,bbox=dict(boxstyle="round,pad=.16",fc="#faf8f1",ec="none",alpha=.95),arrowprops=dict(arrowstyle="-",color="#9ca99d",lw=.6),zorder=4)
  bbox=annotation.get_window_extent(renderer).expanded(1.03,1.05)
  if not any(bbox.overlaps(other) for other in occupied):break
 occupied.append(bbox)
ax.set_aspect("equal")
ax.grid(alpha=.12)
ax.set_xlabel("网络距离坐标 1",fontproperties=font,fontsize=12)
ax.set_ylabel("网络距离坐标 2",fontproperties=font,fontsize=12)
ax.set_title("《席方平》现有空间网络 · "+("证据重算权重" if evidence_weighted else "网络距离投影"),fontproperties=font,fontsize=22,pad=25)
isolates=[nodes[n]["label"] for group in components[1:] for n in sorted(group)]
fig.text(.06,.14,"边的目标距离＝1／既有权重；节点间目标距离＝加权最短路径。坐标由二维度量 MDS 拟合。",fontproperties=font,fontsize=12)
fig.text(.06,.10,"坐标单位为网络距离；方向与原点由算法确定。归一化距离拟合误差＝"+format(normalized_stress,".3f")+"（0 为完全拟合）。",fontproperties=font,fontsize=11)
fig.text(.06,.06,"保留原有 "+str(len(raw["nodes"]))+" 节点、"+str(len(raw["edges"]))+" 条记录。主连通组显示 "+str(len(ids))+" 节点。其余节点："+("、".join(isolates) or "无"),fontproperties=font,fontsize=11)
fig.text(.06,.025,"平行关联不累加为新权重，距离取最强单条关系。原有混合关系仍沿用；本图度量其网络结构，二维线长只近似目标距离。",fontproperties=font,fontsize=10)
out=ROOT/"reports"/("席方平現有網絡_證據權重試算" if evidence_weighted else "席方平現有網絡_距離意義示例")
fig.savefig(str(out)+".png",dpi=180)
fig.savefig(str(out)+".svg")
record=dict(method="metric MDS of weighted shortest-path distances",distance_rule="1/weight, strongest parallel tie",weight_audit=weight_audit,normalized_stress=normalized_stress,nodes=raw["nodes"],edges=raw["edges"],positions={n:list(map(float,p)) for n,p in positions.items()},excluded_components=isolates)
Path(str(out)+".json").write_text(json.dumps(record,ensure_ascii=False,indent=2),encoding="utf-8")
print(json.dumps(dict(nodes=len(raw["nodes"]),edge_records=len(raw["edges"]),shown=len(ids),stress=normalized_stress,isolates=isolates,weights=sorted(set(e["weight"] for e in raw["edges"]))),ensure_ascii=False))
if evidence_weighted:
 import csv
 with Path(str(out)+"_權重核對.csv").open("w",encoding="utf-8-sig",newline="") as stream:
  writer=csv.writer(stream);writer.writerow(["词一","词二","原权重","新权重","独立原文证据","保留原权重"])
  for row in weight_audit:writer.writerow([row["source"],row["target"],row["old_weight"],row["new_weight"],"\n".join(row["independent_evidence"]),row["fallback"]])
 print(json.dumps({"changed_pairs":sum(row["new_weight"]!=row["old_weight"] for row in weight_audit),"pairs":len(weight_audit),"fallback":sum(row["fallback"] for row in weight_audit)}))
