"""Before/after display example with identical site graph and node coordinates."""
import os
import sys
import subprocess
import json
import math
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/".network-runtime"/"plot-libs"))
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.font_manager import FontProperties
os.chdir(ROOT)
script="""const d=require('./assets/research-lab/data.json'),C=require('./assets/research-lab/chapter-spaces'),A=require('./assets/research-lab/network-analysis'),R=require('./assets/route-csv-report'),X=require('./assets/research-lab/csv-route-network'),fs=require('fs');const c=d.chapters.find(c=>c.id===395);const csv=R.parse(fs.readFileSync('reports/聊齋空間路徑_精簡版.csv','utf8'));const graph=X.combine(C.build(c),c,csv,false);console.log(JSON.stringify({...graph,nodes:A.layout(graph)}));"""
graph=json.loads(subprocess.check_output(["node","-e",script],encoding="utf-8"))
nodes={n["id"]:n for n in graph["nodes"]}
edges=graph["edges"]
focus=next(n["id"] for n in graph["nodes"] if n["label"]=="狱门")
neighbors={focus}
for edge in edges:
 if focus in (edge["source"],edge["target"]):neighbors.update((edge["source"],edge["target"]))
font=FontProperties(fname="C:/Windows/Fonts/msyh.ttc")
plt.rcParams["font.family"]=font.get_name()
fig,axes=plt.subplots(1,2,figsize=(24,13),facecolor="#faf8f1")
fig.subplots_adjust(left=.025,right=.975,bottom=.14,top=.88,wspace=.07)
for ax in axes:
 ax.set_facecolor("#faf8f1");ax.axis("off")
 ax.set_xlim(0,860);ax.set_ylim(720,-20)
for panel,ax in enumerate(axes):
 ax.set_title("原有关系 · 常规显示" if panel==0 else "同一网络 · 标签避让与关联高亮",fontproperties=font,fontsize=19)
 for edge in edges:
  a,b=nodes[edge["source"]],nodes[edge["target"]]
  active=focus in (a["id"],b["id"])
  ax.plot([a["x"],b["x"]],[a["y"],b["y"]],color="#4a7060" if panel==0 else "#b65a32" if active else "#8e9f94",lw=1.4 if panel==0 else 2.5 if active else .9,alpha=.55 if panel==0 else .95 if active else .20,zorder=1)
 for node in nodes.values():
  color="#8a62a4" if node["kind"]=="place" else "#b54736" if node.get("realm")=="otherworld" else "#367a70"
  radius=min(28,7+math.sqrt(node.get("strength",1) or 1)*1.4)
  ax.scatter([node["x"]],[node["y"]],s=radius*radius*1.4,c=[color],edgecolors="white",linewidths=1.2,zorder=3)
 fig.canvas.draw()
 renderer=fig.canvas.get_renderer()
 occupied=[]
 ordered=sorted(nodes.values(),key=lambda n:(n["id"]!=focus,n["id"] not in neighbors,-n.get("degree",0)))
 for node in ordered:
  if panel==0:
   ax.annotate(node["label"],(node["x"],node["y"]),xytext=(10,-3),textcoords="offset points",fontproperties=font,fontsize=11,zorder=4)
   continue
  annotation=None
  for offset in [(0,17),(0,-22),(30,10),(-30,10),(35,-16),(-35,-16),(0,35),(0,-40),(55,25),(-55,25),(55,-35),(-55,-35),(0,55),(0,-65)]:
   if annotation is not None:annotation.remove()
   annotation=ax.annotate(node["label"],(node["x"],node["y"]),xytext=offset,textcoords="offset points",ha="center",fontproperties=font,fontsize=11,bbox=dict(boxstyle="round,pad=.18",fc="#faf8f1",ec="none",alpha=.96),arrowprops=dict(arrowstyle="-",color="#a3afa3",lw=.6),zorder=5)
   box=annotation.get_window_extent(renderer).expanded(1.02,1.06)
   if not any(box.overlaps(other) for other in occupied):break
  occupied.append(box)
fig.suptitle("《席方平》空间关系网络 · 仅调整显示",fontproperties=font,fontsize=25,y=.96)
fig.text(.04,.075,str(len(nodes))+" 个节点 · "+str(len(edges))+" 条关联，两侧使用完全相同的节点、连线、权重、大小和坐标。",fontproperties=font,fontsize=13)
fig.text(.04,.035,"右图示例选中「狱门」：相关连线加深，背景连线淡化；标签避让并用细引导线指向节点。图中关联沿用现有网站逻辑。",fontproperties=font,fontsize=12)
assert all(e["source"] in nodes and e["target"] in nodes for e in edges)
out=ROOT/"reports"/"席方平現有網絡_顯示微調對照"
fig.savefig(str(out)+".png",dpi=160)
fig.savefig(str(out)+".svg")
print(json.dumps({"nodes":len(nodes),"edges":len(edges),"coordinates_changed":False},ensure_ascii=False))
