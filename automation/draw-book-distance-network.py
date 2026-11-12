"""Full-book existing chapter networks, weighted by independent chapter support."""
import os
import sys
import subprocess
import json
import csv
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
script="""const d=require('./assets/research-lab/data.json'),C=require('./assets/research-lab/chapter-spaces'),R=require('./assets/route-csv-report'),X=require('./assets/research-lab/csv-route-network'),fs=require('fs');const rows=R.parse(fs.readFileSync('reports/聊齋空間路徑_精簡版.csv','utf8')),nodes=new Map,edges=new Map;for(const c of d.chapters){const g=X.combine(C.build(c),c,rows,false);for(const n of g.nodes){if(!nodes.has(n.id))nodes.set(n.id,{...n,chapters:[]});nodes.get(n.id).chapters.push(c.id)}for(const e of g.edges){const pair=[e.source,e.target].sort(),key=JSON.stringify(pair);if(!edges.has(key))edges.set(key,{source:pair[0],target:pair[1],evidence:[],chapters:[],relations:[]});const edge=edges.get(key);if(!edge.chapters.includes(c.id))edge.chapters.push(c.id);if(!edge.relations.includes(e.relation))edge.relations.push(e.relation);for(const r of e.evidence||[]){const text=r.text||'';if(!edge.evidence.some(x=>x.chapterId===c.id&&x.text===text))edge.evidence.push({chapterId:c.id,chapter:c.title,text,basis:r.basis||''})}}}console.log(JSON.stringify({chapters:d.chapters.length,nodes:[...nodes.values()],edges:[...edges.values()]}));"""
raw=json.loads(subprocess.check_output(["node","-e",script],encoding="utf-8"))
G=nx.Graph()
G.add_nodes_from(n["id"] for n in raw["nodes"])
for edge in raw["edges"]:
 weight=len(edge["chapters"])
 assert weight>0 and weight==len(set(edge["chapters"]))
 G.add_edge(edge["source"],edge["target"],weight=weight,distance=1/weight)
components=sorted(nx.connected_components(G),key=len,reverse=True)
ids=sorted(components[0])
H=G.subgraph(ids)
# Landmark MDS preserves the same distance definition with bounded memory.
landmarks=sorted(ids,key=lambda n:(-G.degree(n,weight="weight"),n))[:128]
distance=np.array([[lengths[n] for n in ids] for lengths in (nx.single_source_dijkstra_path_length(H,n,weight="distance") for n in landmarks)])
indices=[ids.index(n) for n in landmarks]
L=distance[:,indices]
J=np.eye(len(landmarks))-np.ones((len(landmarks),len(landmarks)))/len(landmarks)
vals,vecs=np.linalg.eigh(-.5*J@(L**2)@J)
order=np.argsort(vals)[-2:][::-1]
eigenvalues=np.maximum(vals[order],1e-12)
vectors=vecs[:,order]
squared=distance.T**2
cross=-.5*(squared-squared.mean(axis=1,keepdims=True)-(L**2).mean(axis=0)[None,:]+(L**2).mean())
X=cross@vectors/np.sqrt(eigenvalues)
def loss(points):
 lengths=np.linalg.norm(points[None,:,:]-points[indices,None,:],axis=2)
 return float(np.sum((lengths-distance)**2))
for iteration in range(400):
 delta=X[None,:,:]-X[indices,None,:]
 lengths=np.maximum(np.linalg.norm(delta,axis=2),1e-10)
 forces=2*(1-distance/lengths)[:,:,None]*delta
 gradient=forces.sum(axis=0)
 gradient[indices]-=forces.sum(axis=1)
 old=loss(X)
 step=.3/(len(ids)+len(landmarks))
 for attempt in range(15):
  proposal=X-step*gradient
  if loss(proposal)<old:break
  step*=.5
 else:break
 X=proposal-proposal.mean(axis=0)
 if old-loss(X)<1e-7:break
positions={word:X[i] for i,word in enumerate(ids)}
fitted=np.linalg.norm(X[None,:,:]-X[indices,None,:],axis=2)
stress=float(np.sqrt(np.sum((fitted-distance)**2)/np.sum(distance**2)))
assert np.isfinite(X).all() and np.isfinite(stress)
font=FontProperties(fname="C:/Windows/Fonts/msyh.ttc")
plt.rcParams["font.family"]=font.get_name()
fig,ax=plt.subplots(figsize=(25,20),facecolor="#faf8f1")
ax.set_facecolor("#faf8f1")
node_data={n["id"]:n for n in raw["nodes"]}
for a,b,d in H.edges(data=True):
 p,q=positions[a],positions[b]
 ax.plot([p[0],q[0]],[p[1],q[1]],color="#6c8878",alpha=.09,lw=.25+min(3,np.log1p(d["weight"])*.35),zorder=1)
colors=["#9861a7" if node_data[n]["kind"]=="place" else "#b1503b" if node_data[n].get("realm")=="otherworld" else "#328373" for n in ids]
sizes=[12+len(set(node_data[n]["chapters"]))*3 for n in ids]
ax.scatter(X[:,0],X[:,1],s=sizes,c=colors,alpha=.85,edgecolors="white",linewidths=.3,zorder=2)
ranked=sorted(ids,key=lambda n:(-G.degree(n,weight="weight"),n))
for i,word in enumerate(ranked[:35]):
 ax.annotate(node_data[word]["label"],positions[word],xytext=((i%3-1)*18,12 if i%2 else -20),textcoords="offset points",ha="center",fontproperties=font,fontsize=10,bbox=dict(fc="#faf8f1",ec="none",alpha=.8,pad=.1),arrowprops=dict(arrowstyle="-",lw=.4,color="#888"),zorder=4)
ax.set_title("《聊斋志异》全书现有空间关系网络 · 跨篇证据权重",fontproperties=font,fontsize=25,pad=24)
ax.set_xlabel("网络距离坐标 1",fontproperties=font)
ax.set_ylabel("网络距离坐标 2",fontproperties=font)
ax.grid(alpha=.1)
fig.subplots_adjust(bottom=.17,top=.91,left=.07,right=.95)
fig.text(.06,.115,f'{raw["chapters"]} 篇 · 完整网络 {len(G)} 节点／{G.number_of_edges()} 组关系；主连通组 {len(H)} 节点／{H.number_of_edges()} 组关系。',fontproperties=font,fontsize=13)
fig.text(.06,.08,"每组关系在每篇计 1 次，跨篇累积。目标边距＝1／支持篇数，节点距离＝加权最短路径。节点大小按涉及篇数缩放。",fontproperties=font,fontsize=12)
fig.text(.06,.045,f'紫＝地点　绿＝空间　红＝异境。前 128 个加权度节点作为 MDS 锚点，锚点至全图距离拟合误差 {stress:.3f}。PNG 标注加权度前 35 词。',fontproperties=font,fontsize=11)
fig.text(.06,.02,"现有同篇、场景归属等关系逻辑沿用。不同关系共用的篇目支持只计一次。孤立及其他连通组保存在完整数据文件中。",fontproperties=font,fontsize=10)
out=ROOT/"reports"/"聊齋全書空間關係網絡_證據權重"
fig.savefig(str(out)+".png",dpi=160)
for word in ranked[35:]:
 ax.text(*positions[word],node_data[word]["label"],fontproperties=font,fontsize=4,alpha=.8)
fig.savefig(str(out)+".svg")
record=dict(chapters=raw["chapters"],nodes=raw["nodes"],edges=raw["edges"],weight_definition="distinct supporting chapters per existing node pair",landmarks=landmarks,stress=stress,positions={n:list(map(float,p)) for n,p in positions.items()},other_components=[sorted(c) for c in components[1:]])
Path(str(out)+".json").write_text(json.dumps(record,ensure_ascii=False,indent=2),encoding="utf-8")
with Path(str(out)+"_權重核對.csv").open("w",encoding="utf-8-sig",newline="") as stream:
 writer=csv.writer(stream);writer.writerow(["词一","词二","支持篇数","关系类型","支持篇号","证据"])
 for e in sorted(raw["edges"],key=lambda e:-len(e["chapters"])):
  writer.writerow([node_data[e["source"]]["label"],node_data[e["target"]]["label"],len(e["chapters"]),"、".join(filter(None,e["relations"])),"、".join(str(i+1) for i in e["chapters"]),"\n".join("《"+r["chapter"]+"》"+r["text"] for r in e["evidence"])])
print(json.dumps(dict(chapters=raw["chapters"],nodes=len(G),pairs=G.number_of_edges(),shown=len(H),stress=stress,max_weight=max(d["weight"] for a,b,d in G.edges(data=True))),ensure_ascii=False))
