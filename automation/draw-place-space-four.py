import json,runpy
from pathlib import Path
m=runpy.run_path('automation/model-place-space-four.py');np=m['np'];plt=m['plt'];font=m['FontProperties'](fname='C:/Windows/Fonts/msyh.ttc')
from matplotlib.patches import Wedge,Patch
d=json.load(open('reports/place-space-four-topic-results.json',encoding='utf8'));pts=d['points'];xy=np.array([[p['x'],p['y']]for p in pts]);colors=['#397d9a','#d68a2c','#8263ad','#329b78'];radius=np.ptp(xy,axis=0).max()*.006
fig,axes=plt.subplots(1,2,figsize=(16,8),sharex=True,sharey=True)
for ax,mode in zip(axes,['topics','events']):
 for p in pts:
  cs=[colors[p['dominant_topic']-1]]if mode=='topics'else[d['colors'][e]for e in p['events']]
  for i,c in enumerate(cs):ax.add_patch(Wedge((p['x'],p['y']),radius,360*i/len(cs),360*(i+1)/len(cs),facecolor=c,edgecolor='white',linewidth=.2,alpha=.8))
 ax.set_xlim(xy[:,0].min()-radius*4,xy[:,0].max()+radius*4);ax.set_ylim(xy[:,1].min()-radius*4,xy[:,1].max()+radius*4);ax.set_aspect('equal');ax.set_xticks([]);ax.set_yticks([])
 ax.set_title('四主题'if mode=='topics'else'人、鬼、妖、神（多类型保留）',fontproperties=font)
 handles=[Patch(color=c,label=f'主题{i+1}')for i,c in enumerate(colors)]if mode=='topics'else[Patch(color=c,label=e)for e,c in d['colors'].items()]
 ax.legend(handles=handles,prop=font,loc='upper left')
fig.suptitle('地点词＋空间词：相同t-SNE坐标，两种着色',fontproperties=font,fontsize=19)
fig.text(.08,.03,'471篇；20篇无有效词项未投影。群间距离、群大小不宜直接解释；颜色混合不是显著性检验。',fontproperties=font)
fig.tight_layout(rect=[0,.06,1,.94]);fig.savefig('reports/地點與空間詞_四主題_tSNE雙視圖.png',dpi=160)
