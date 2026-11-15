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
 full=s['chapters'];valid=[i for i,c in enumerate(full) if c['tokens']];missing=[i for i,c in enumerate(full) if not c['tokens']]
 matrix=np.full((len(full),len(full)),np.nan);matrix[np.ix_(valid,valid)]=a
 display=[valid[int(i)] for i in order]+missing
 font=FontProperties(fname='C:/Windows/Fonts/msyh.ttc');fig,ax=plt.subplots(figsize=(44,43));cmap=plt.get_cmap('YlGnBu').copy();cmap.set_bad('#dddddd')
 im=ax.imshow(matrix[np.ix_(display,display)],vmin=0,vmax=1,cmap=cmap,interpolation='nearest');ax.set_xticks(range(len(display)),[full[i]['title'] for i in display],rotation=90,fontproperties=font,fontsize=4);ax.set_yticks(range(len(display)),[full[i]['title'] for i in display],fontproperties=font,fontsize=4)
 ax.set_title('全书空间词相似度 · 491篇',fontproperties=font,fontsize=18,pad=16)
 cb=fig.colorbar(im,ax=ax,shrink=.65,ticks=[0,.5,1]);cb.set_label('相似度',fontproperties=font)
 fig.tight_layout(rect=[0,.05,1,1]);fig.savefig(ROOT/'reports/全書空間詞_原始詞頻相似度.png',dpi=160);fig.savefig(ROOT/'reports/全書空間詞_原始詞頻相似度.svg');plt.close(fig)
 records=[[None if np.isnan(v) else round(float(v),8) for v in row]for row in matrix]
 (ROOT/'reports/chapter-space-raw-frequency-similarity.json').write_text(json.dumps({'source_sha256':s['source_sha256'],'method':'Cosine similarity of raw spatial token count vectors; no TF-IDF; average linkage on 1-cosine.','chapters':[{'id':c['id'],'title':c['title']}for c in full],'missing_chapter_ids':[full[i]['id']for i in missing],'order':display,'similarity':records},ensure_ascii=False),encoding='utf8')
if __name__=='__main__':main()
