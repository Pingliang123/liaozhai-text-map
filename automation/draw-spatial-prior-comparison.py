"""Display manual groups versus original and reduced-prior LDA, without re-fitting."""
import pathlib,json,sys,hashlib
ROOT=pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'.network-runtime/topic-libs'))
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.font_manager import FontProperties
import numpy as np

def main():
    data=json.loads((ROOT/'reports/spatial-prior-sensitivity-results.json').read_text(encoding='utf-8'))
    assert data['source_sha256']==hashlib.sha256((ROOT/'data-package.json').read_bytes()).hexdigest()
    groups=[row['group'] for row in data['experiments'][0]['reference_group_distribution']]
    panels=[]
    for setting,title in [('baseline','原参数：alpha自动估计，beta=0.2'),('both_low_fixed','降低参数：固定alpha=0.1，beta=0.05')]:
        e=next(e for e in data['experiments'] if e['id']==setting)
        matrix=[[next(r for r in e['reference_group_distribution'] if r['group']==g)['topic_shares'][k] for k in range(5)] for g in groups]
        assert np.allclose(np.array(matrix).sum(axis=1),1)
        panels.append({'setting':setting,'title':title,'matrix':matrix,
                       'topic_labels':[f"主题{i+1}\n"+'／'.join(w['word'] for w in ws[:3]) for i,ws in enumerate(e['runs'][0]['top_words'])]})
    result={'source_sha256':data['source_sha256'],'groups':groups,'seed':42,
            'measure':'Frequency-weighted P(topic|word) for available members of each manual group; rows sum to 1.',
            'topic_alignment':'Not aligned across settings: each panel uses local topic IDs and displays representative words.',
            'panels':panels}
    (ROOT/'reports/spatial-prior-group-comparison.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    font=FontProperties(fname='C:/Windows/Fonts/msyh.ttc')
    fig,axes=plt.subplots(1,2,figsize=(15,7))
    for ax,panel in zip(axes,panels):
        values=np.array(panel['matrix'])*100
        im=ax.imshow(values,cmap='YlGnBu',vmin=0,vmax=100,aspect='auto')
        ax.set_xticks(range(5),panel['topic_labels'],fontproperties=font,fontsize=9)
        ax.set_yticks(range(5),groups,fontproperties=font,fontsize=11)
        ax.set_title(panel['title'],fontproperties=font,fontsize=13,pad=16)
        for i in range(5):
            for j in range(5):ax.text(j,i,f'{values[i,j]:.1f}%',ha='center',va='center',fontsize=11,color='white' if values[i,j]>55 else '#163149')
    fig.suptitle('人工五类与模型五主题：调参前后对照',fontproperties=font,fontsize=20,y=.96)
    fig.subplots_adjust(left=.09,right=.92,wspace=.32,bottom=.22,top=.84)
    cax=fig.add_axes([.94,.24,.014,.57]);fig.colorbar(im,cax=cax,label='%')
    fig.text(.09,.095,'每行：该人工词群成员的词频加权主题占比，合计100%；不是篇目比例或分类正确率。',fontproperties=font,fontsize=11)
    fig.text(.09,.045,'两图均为种子42。主题编号在各模型内独立，不可直接比较同号列；列下方附各主题代表词。',fontproperties=font,fontsize=11)
    fig.savefig(ROOT/'reports/人工分類與五主題_調參前後.png',dpi=160)
    fig.savefig(ROOT/'reports/人工分類與五主題_調參前後.svg')
    plt.close(fig)

if __name__=='__main__':main()
