"""PCA of chapter topic mixtures; event labels annotate, never determine coordinates."""
import pathlib,json,sys,hashlib,html
ROOT=pathlib.Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'.network-runtime/topic-libs'))
import numpy as np
from sklearn.decomposition import PCA
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Wedge,Patch
from matplotlib.font_manager import FontProperties

COLORS={'人':'#707780','鬼':'#8a4eb2','狐':'#df7d23','妖':'#29945f','神':'#267bb9','未定':'#c7c7c7'}

def main():
    src=json.loads((ROOT/'reports/spatial-topics-five-results.json').read_text(encoding='utf-8'))
    evidence=json.loads((ROOT/'.network-runtime/spatial-distinctiveness-source.json').read_text(encoding='utf-8'))
    fingerprint=hashlib.sha256((ROOT/'data-package.json').read_bytes()).hexdigest()
    assert src['source_sha256']==evidence['source_sha256']==fingerprint
    labels={c['id']:c['events'] for c in evidence['chapters']}
    weights=np.array([c['weights'] for c in src['chapter_topics']]);pca=PCA(n_components=2);xy=pca.fit_transform(weights)
    points=[]
    for c,pos in zip(src['chapter_topics'],xy):
        points.append({**c,'x':float(pos[0]),'y':float(pos[1]),'events':[e for e in COLORS if e in labels[c['id']]] or ['未定'],
                       'dominant_topic':int(np.argmax(c['weights']))+1})
    result={'source_sha256':fingerprint,'method':'Centered PCA of existing five-topic document probability vectors; no standardization or jitter.',
            'colors':COLORS,'explained_variance_ratio':pca.explained_variance_ratio_.tolist(),'components':pca.components_.tolist(),
            'mean':pca.mean_.tolist(),'points':points,'unassigned':src['input']['empty_documents'],
            'note':'Equal pie sectors indicate overlapping event labels, not probabilities. Coordinates do not represent geography or chronology.'}
    (ROOT/'reports/chapter-spatial-types-visualization.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    font=FontProperties(fname='C:/Windows/Fonts/msyh.ttc');fig,ax=plt.subplots(figsize=(12,9))
    for p in sorted(points,key=lambda p:p['token_count']):
        for i,event in enumerate(p['events']):ax.add_patch(Wedge((p['x'],p['y']),.012,360*i/len(p['events']),360*(i+1)/len(p['events']),facecolor=COLORS[event],edgecolor='white',linewidth=.25,alpha=.8))
    ax.set_xlim(xy[:,0].min()-.06,xy[:,0].max()+.06);ax.set_ylim(xy[:,1].min()-.06,xy[:,1].max()+.06);ax.set_aspect('equal')
    ax.set_xlabel(f"PC1（解释{pca.explained_variance_ratio_[0]:.1%}变异）",fontproperties=font)
    ax.set_ylabel(f"PC2（解释{pca.explained_variance_ratio_[1]:.1%}变异）",fontproperties=font)
    ax.set_title('篇目空间主题分布：按异事类型着色',fontproperties=font,fontsize=19,pad=18)
    ax.legend(handles=[Patch(color=color,label=event) for event,color in COLORS.items()],prop=font,loc='upper left',bbox_to_anchor=(1.01,1))
    ax.grid(alpha=.16)
    fig.text(.08,.035,'每点一篇；多类型用等分色块表示。位置越近，二维投影中的空间主题组合越相似。\n相同位置可能重叠；不是地理地图，也不是情节路线。48篇无有效空间词，未投影。',fontproperties=font,fontsize=10)
    fig.tight_layout(rect=[0,.09,1,1]);fig.savefig(ROOT/'reports/篇目空間主題_異事類型.png',dpi=160);plt.close(fig)
    payload=json.dumps(result,ensure_ascii=False).replace('<','\\u003c')
    page='''<!doctype html><meta charset="utf-8"><title>篇目空间主题与异事类型</title>
<style>body{font:16px system-ui;margin:24px;background:#faf9f5;color:#25333d}svg{width:100%;max-height:75vh;background:white;border:1px solid #ddd}button,input{padding:8px;margin:4px}#tip{white-space:pre-line;min-height:95px}circle,path{cursor:pointer}#legend{display:flex;flex-wrap:wrap}label{margin-right:18px}</style>
<h1>篇目空间主题与异事类型</h1><p>每点一篇；多类型按颜色等分。位置是五主题概率的PCA投影，不是地理位置。相同位置可能重叠。</p>
<input id="search" placeholder="输入篇名查找"><div id="legend"></div><svg id="plot" viewBox="0 0 1100 720"></svg><p id="tip">悬停或点击圆点查看篇名、类型及主题概率。可搜索篇名以找到重叠点。</p>
<p>48篇无有效空间词，未投影。颜色使用现有异事类型，未参与坐标计算。筛选仅改变显示，不重新计算位置。</p>
<script>const D=PAYLOAD;const ns='http://www.w3.org/2000/svg',svg=document.querySelector('#plot'),tip=document.querySelector('#tip'),enabled=new Set(Object.keys(D.colors));
for(const [type,color] of Object.entries(D.colors)){const label=document.createElement('label');label.innerHTML=`<input type="checkbox" checked> <span style="color:${color}">●</span> ${type}`;label.querySelector('input').onchange=e=>{e.target.checked?enabled.add(type):enabled.delete(type);draw()};document.querySelector('#legend').append(label)}
const xs=D.points.map(p=>p.x),ys=D.points.map(p=>p.y),xmin=Math.min(...xs),xmax=Math.max(...xs),ymin=Math.min(...ys),ymax=Math.max(...ys),scale=Math.min(980/(xmax-xmin),580/(ymax-ymin));
function info(p){tip.textContent=`《${p.title}》｜${p.events.join('、')}｜空间词次 ${p.token_count}\n`+p.weights.map((w,i)=>`主题${i+1} ${(w*100).toFixed(1)}%`).join('；')}
function draw(){svg.replaceChildren();const q=document.querySelector('#search').value.trim();let pts=D.points.filter(p=>p.events.some(e=>enabled.has(e)));pts.sort((a,b)=>Number(a.title.includes(q))-Number(b.title.includes(q)));for(const p of pts){const g=document.createElementNS(ns,'g'),x=60+(p.x-xmin)*scale,y=650-(p.y-ymin)*scale,r=q&&p.title.includes(q)?11:6;g.setAttribute('opacity',q&&!p.title.includes(q)?'.12':'.85');
for(let i=0;i<p.events.length;i++){let node;if(p.events.length===1){node=document.createElementNS(ns,'circle');node.setAttribute('cx',x);node.setAttribute('cy',y);node.setAttribute('r',r)}else{node=document.createElementNS(ns,'path');let a=2*Math.PI*i/p.events.length,b=2*Math.PI*(i+1)/p.events.length;node.setAttribute('d',`M ${x} ${y} L ${x+r*Math.cos(a)} ${y+r*Math.sin(a)} A ${r} ${r} 0 0 1 ${x+r*Math.cos(b)} ${y+r*Math.sin(b)} Z`)}node.setAttribute('fill',D.colors[p.events[i]]);node.setAttribute('stroke','white');node.setAttribute('stroke-width','.4');g.append(node)}g.onmouseenter=()=>info(p);g.onclick=()=>info(p);svg.append(g)}if(q){const hits=D.points.filter(p=>p.title.includes(q));tip.textContent=hits.length?hits.map(p=>`《${p.title}》：${p.events.join('、')}，最高主题${p.dominant_topic}`).join('\\n'):'未找到篇名'}}
document.querySelector('#search').oninput=draw;draw();</script>'''.replace('PAYLOAD',payload)
    page=page.replace('<input id="search"', '<label>着色方式：<select id="mode"><option value="topics">五主题分组</option><option value="events">异事类型对照</option></select></label><input id="search"')
    page=page.replace('每点一篇；多类型按颜色等分。位置是五主题概率的PCA投影，不是地理位置。相同位置可能重叠。','每点一篇。先按五主题着色，再切换异事类型比较；两种视图位置完全相同。位置是主题概率的PCA投影，不是地理位置。相同位置可能重叠。')
    script=(ROOT/'automation/chapter-topic-view.js').read_text(encoding='utf-8').replace('PAYLOAD',payload)
    page=page.split('<script>')[0]+'<script>'+script+'</script>'
    (ROOT/'reports/篇目空間主題_互動圖.html').write_text(page,encoding='utf-8')
    fig,axes=plt.subplots(1,2,figsize=(16,8),sharex=True,sharey=True)
    topic_colors=['#397d9a','#d68a2c','#8263ad','#329b78','#bc586d']
    for ax,mode in zip(axes,['topics','events']):
        for p in sorted(points,key=lambda p:p['token_count']):
            colors=[topic_colors[p['dominant_topic']-1]] if mode=='topics' else [COLORS[e] for e in p['events']]
            for i,color in enumerate(colors):ax.add_patch(Wedge((p['x'],p['y']),.012,360*i/len(colors),360*(i+1)/len(colors),facecolor=color,edgecolor='white',linewidth=.2,alpha=.8))
        ax.set_xlim(xy[:,0].min()-.06,xy[:,0].max()+.06);ax.set_ylim(xy[:,1].min()-.06,xy[:,1].max()+.06);ax.set_aspect('equal');ax.grid(alpha=.12)
        ax.set_title('五主题分组' if mode=='topics' else '异事类型对照',fontproperties=font,fontsize=16)
        handles=[Patch(color=color,label=f'主题{i+1}') for i,color in enumerate(topic_colors)] if mode=='topics' else [Patch(color=color,label=e) for e,color in COLORS.items()]
        ax.legend(handles=handles,prop=font,fontsize=9,loc='upper left')
        ax.set_xlabel('PC1',fontsize=11)
    axes[0].set_ylabel('PC2');fig.suptitle('相同篇目、相同坐标：两种着色方式',fontproperties=font,fontsize=20)
    fig.text(.08,.04,'每点一篇；左图按最高主题概率归组，右图按既有异事类型着色。颜色未参与坐标计算。\n二维PCA保留70.1%变异；点可能重叠。不是五团独立类别，也不是地理地图。',fontproperties=font,fontsize=10)
    fig.tight_layout(rect=[0,.09,1,.94]);fig.savefig(ROOT/'reports/篇目空間主題_雙視圖.png',dpi=160);plt.close(fig)
    print(json.dumps({'points':len(points),'explained_variance':pca.explained_variance_ratio_.tolist(),'multitype':sum(len(p['events'])>1 for p in points)},ensure_ascii=False))

if __name__=='__main__':main()
