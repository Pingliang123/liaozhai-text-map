"""Alternative projection only; retain chapter probabilities and labels."""
import pathlib,sys,json,argparse,re
ROOT=pathlib.Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'.network-runtime/topic-libs'))
import numpy as np
from sklearn.manifold import TSNE,trustworthiness
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Wedge,Patch
from matplotlib.font_manager import FontProperties

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--topics',type=int,choices=[3,5],default=5);k=parser.parse_args().topics
    label='三' if k==3 else '五';suffix='-three' if k==3 else '';filetag='三主題_' if k==3 else ''
    old=json.loads((ROOT/'reports/chapter-spatial-types-visualization.json').read_text(encoding='utf-8'))
    original_payload=json.dumps(old,ensure_ascii=False).replace('<','\\u003c')
    if k==3:
        model_source=json.loads((ROOT/'reports/spatial-topics-three-results.json').read_text(encoding='utf-8'))
        assert model_source['source_sha256']==old['source_sha256']
        events={p['id']:p['events'] for p in old['points']}
        old['points']=[{**c,'events':events[c['id']],'dominant_topic':int(np.argmax(c['weights']))+1} for c in model_source['chapter_topics']]
        old['unassigned']=model_source['input']['empty_documents']
    weights=np.array([p['weights'] for p in old['points']])
    params=dict(n_components=2,perplexity=30,init='pca',learning_rate='auto',max_iter=1000,random_state=42,metric='euclidean')
    model=TSNE(**params);xy=model.fit_transform(weights)
    repeat=TSNE(**params).fit_transform(weights);assert np.allclose(xy,repeat)
    points=[{**p,'x':float(pos[0]),'y':float(pos[1])} for p,pos in zip(old['points'],xy)]
    out={'source_sha256':old['source_sha256'],'method':f't-SNE of unchanged {k}-topic probability vectors','topic_count':k,'parameters':params,
         'colors':old['colors'],'points':points,'unassigned':old['unassigned'],'kl_divergence':float(model.kl_divergence_),
         'trustworthiness_10_neighbors':float(trustworthiness(weights,xy,n_neighbors=10)),
         'note':'Local-neighborhood projection; axis values and between-cluster distance have no direct semantic or geographic meaning. Apparent clusters are not a statistical test.'}
    (ROOT/f'reports/chapter-spatial-types-tsne{suffix}.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8')
    page=(ROOT/'reports/篇目空間主題_互動圖.html').read_text(encoding='utf-8')
    payload=original_payload;assert payload in page
    page=page.replace(payload,json.dumps(out,ensure_ascii=False).replace('<','\\u003c')).replace('PCA','t-SNE')
    page=page.replace('<h1>','<p>t-SNE：只宜判讀局部鄰近；群間距離、群大小和軸值不可直接解釋。外觀分群不代表統計上成立的類別。</p><h1>',1)
    if k==3:
        page=page.replace('五主题','三主题')
        palette={'主题1':'#397d9a','主题2':'#d68a2c','主题3':'#8263ad'}
        page=re.sub(r'const topicColors=\{[^;]+;',lambda _: 'const topicColors='+json.dumps(palette,ensure_ascii=False)+';',page)
    (ROOT/f'reports/篇目空間主題_{filetag}tSNE互動圖.html').write_text(page,encoding='utf-8')
    font=FontProperties(fname='C:/Windows/Fonts/msyh.ttc');fig,axes=plt.subplots(1,2,figsize=(16,8),sharex=True,sharey=True)
    colors=['#397d9a','#d68a2c','#8263ad','#329b78','#bc586d'][:k];radius=float(np.ptp(xy,axis=0).max())*.006
    for ax,mode in zip(axes,['topics','events']):
        for p in sorted(points,key=lambda p:p['token_count']):
            cs=[colors[p['dominant_topic']-1]] if mode=='topics' else [old['colors'][e] for e in p['events']]
            for i,c in enumerate(cs):ax.add_patch(Wedge((p['x'],p['y']),radius,360*i/len(cs),360*(i+1)/len(cs),facecolor=c,edgecolor='white',linewidth=.2,alpha=.8))
        pad=radius*4;ax.set_xlim(xy[:,0].min()-pad,xy[:,0].max()+pad);ax.set_ylim(xy[:,1].min()-pad,xy[:,1].max()+pad);ax.set_aspect('equal')
        ax.set_title(f'{label}主题分组' if mode=='topics' else '异事类型对照',fontproperties=font,fontsize=16)
        handles=[Patch(color=c,label=f'主题{i+1}') for i,c in enumerate(colors)] if mode=='topics' else [Patch(color=c,label=e) for e,c in old['colors'].items()]
        ax.legend(handles=handles,prop=font,loc='upper left');ax.set_xticks([]);ax.set_yticks([])
    fig.suptitle('t-SNE投影：相同篇目，两种着色',fontproperties=font,fontsize=20)
    fig.text(.08,.035,'仅改变投影，未重新训练或改动分类。perplexity=30，种子42，1000轮。\n局部邻近可作比较线索；群间距离、群大小无直接含义，视觉分团不证明真实类别。',fontproperties=font,fontsize=11)
    fig.tight_layout(rect=[0,.09,1,.94]);fig.savefig(ROOT/f'reports/篇目空間主題_{filetag}tSNE雙視圖.png',dpi=160);plt.close(fig)
    print(json.dumps({'points':len(points),'trustworthiness_10':out['trustworthiness_10_neighbors'],'repeat_test':'passed'}))

if __name__=='__main__':main()
