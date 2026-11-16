import sys,json
from pathlib import Path
sys.path.insert(0,str(Path('../site-current/.network-runtime/topic-libs').resolve()))
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.font_manager import FontProperties
d=json.loads(Path('reports/event-combinations-traditional.json').read_text(encoding='utf8'))
font=FontProperties(fname='C:/Windows/Fonts/msjh.ttc',size=12)
rows=d['combinations']; n=d['total']
fig,ax=plt.subplots(figsize=(13,8),facecolor='white')
wedges,_=ax.pie([x[1] for x in rows],colors=d['colors'],startangle=90,counterclock=False,wedgeprops=dict(width=.52,edgecolor='white',linewidth=1.5))
ax.text(0,.07,str(n),ha='center',fontsize=29,color='#222222')
ax.text(0,-.14,'篇',ha='center',fontproperties=font)
labels=[f"{label}　{value} 篇（{value/n:.1%}）" for label,value in rows]
ax.legend(wedges,labels,loc='center left',bbox_to_anchor=(1,0.5),frameon=False,prop=font)
ax.set_title('篇目類型組合占比',fontproperties=FontProperties(fname='C:/Windows/Fonts/msjh.ttc',size=20),pad=24)
fig.text(.08,.04,'依網站已保存標籤統計；每篇按完整類型組合計算一次。',fontproperties=font,color='#555555')
fig.subplots_adjust(left=.03,right=.62,top=.88,bottom=.1)
for ext in ['png','svg']:
 fig.savefig('reports/篇目類型組合占比_繁體.'+ext,dpi=180,facecolor='white')
assert sum(x[1] for x in rows)==n
assert len(set(d['colors']))==len(rows)
