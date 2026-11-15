import pathlib,sys,json,collections
ROOT=pathlib.Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'.network-runtime/topic-libs'))
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from scipy.cluster.hierarchy import linkage,leaves_list
from scipy.spatial.distance import squareform
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.font_manager import FontProperties

def compute(docs):
 vocab=sorted({w for d in docs for w in d});ix={w:i for i,w in enumerate(vocab)};x=np.zeros((len(docs),len(vocab)))
 for i,d in enumerate(docs):
  for w,n in collections.Counter(d).items():x[i,ix[w]]=n
 return cosine_similarity(x)

def main():
 s=json.load(open(ROOT/'.network-runtime/space-only-similarity-input.json',encoding='utf8'));cs=[c for c in s['chapters']if c['tokens']];a=compute([c['tokens']for c in cs]);dist=np.clip(1-a,0,1);np.fill_diagonal(dist,0);order=leaves_list(linkage(squareform(dist,checks=False),method='average'))
 font=FontProperties(fname='C:/Windows/Fonts/msyh.ttc');fig,ax=plt.subplots(figsize=(14,13));im=ax.imshow(a[np.ix_(order,order)],vmin=0,vmax=1,cmap='YlGnBu',interpolation='nearest')
 ticks=list(range(0,len(cs),15));ax.set_xticks(ticks,[cs[order[i]]['title']for i in ticks],rotation=90,fontproperties=font,fontsize=7);ax.set_yticks(ticks,[cs[order[i]]['title']for i in ticks],fontproperties=font,fontsize=7)
 ax.set_title('全书空间词：原始词频的余弦相似度',fontproperties=font,fontsize=20,pad=20);cb=fig.colorbar(im,ax=ax,shrink=.75);cb.set_label('余弦相似度（0—1）',fontproperties=font)
 fig.text(.12,.018,'443篇；48篇无有效空间词未纳入。每格比较两篇，深色更相似；对角线为自身。\n使用原始词频，不作TF-IDF加权；按平均连接层次聚类排序。仅间隔显示篇名。',fontproperties=font,fontsize=11)
 fig.tight_layout(rect=[0,.06,1,1]);fig.savefig(ROOT/'reports/全書空間詞_原始詞頻相似度.png',dpi=200);plt.close(fig)
 (ROOT/'reports/chapter-space-raw-frequency-similarity.json').write_text(json.dumps({'source_sha256':s['source_sha256'],'method':'Cosine similarity of raw spatial token count vectors; no TF-IDF; average linkage on 1-cosine.','chapters':[{'id':c['id'],'title':c['title']}for c in cs],'order':order.tolist(),'similarity':a.round(8).tolist()},ensure_ascii=False),encoding='utf8')
if __name__=='__main__':main()
