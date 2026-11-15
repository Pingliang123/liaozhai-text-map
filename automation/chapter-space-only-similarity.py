import pathlib,sys,json,hashlib,collections
ROOT=pathlib.Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'.network-runtime/topic-libs'))
import numpy as np
from sklearn.feature_extraction.text import TfidfTransformer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.manifold import MDS
from scipy.cluster.hierarchy import linkage,leaves_list
from scipy.spatial.distance import squareform
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.font_manager import FontProperties

def compute(docs):
 vocab=sorted({w for d in docs for w in d});ids={w:i for i,w in enumerate(vocab)};counts=np.zeros((len(docs),len(vocab)))
 for i,d in enumerate(docs):
  for w,n in collections.Counter(d).items():counts[i,ids[w]]=n
 binary=(counts>0).astype(float);inter=binary@binary.T;total=binary.sum(axis=1);union=total[:,None]+total[None,:]-inter
 jac=np.divide(inter,union,out=np.zeros_like(inter),where=union>0)
 cosine=cosine_similarity(TfidfTransformer().fit_transform(counts));return vocab,jac,cosine

def main():
 src=json.loads((ROOT/'.network-runtime/space-only-similarity-input.json').read_text(encoding='utf8'));assert src['source_sha256']==hashlib.sha256((ROOT/'data-package.json').read_bytes()).hexdigest()
 cs=[c for c in src['chapters'] if c['tokens']];vocab,jac,cos=compute([c['tokens']for c in cs]);dist=np.clip(1-jac,0,1);np.fill_diagonal(dist,0)
 order=leaves_list(linkage(squareform(dist,checks=False),method='average')).tolist()
 xy=MDS(n_components=2,dissimilarity='precomputed',random_state=42,n_init=4,max_iter=500).fit_transform(dist)
 chapters=[]
 for i,c in enumerate(cs):
  nearest={}
  for name,mat in [('jaccard',jac),('cosine',cos)]:
   inds=sorted((j for j in range(len(cs))if j!=i),key=lambda j:(-mat[i,j],cs[j]['id']))[:10]
   nearest[name]=[{'id':cs[j]['id'],'title':cs[j]['title'],'similarity':float(mat[i,j]),'shared_words':sorted(set(c['tokens'])&set(cs[j]['tokens']))}for j in inds]
  chapters.append({'id':c['id'],'title':c['title'],'tokens':len(c['tokens']),'words':len(set(c['tokens'])),'events':c['events'],'nearest':nearest,'x':float(xy[i,0]),'y':float(xy[i,1])})
 out={'source_sha256':src['source_sha256'],'method':'Chapter-level exact saved spatial tokens only. Jaccard on word sets; TF-IDF cosine on raw counts (smooth IDF, L2 normalization). Average-linkage heatmap order; metric MDS of 1-Jaccard, seed42. No LDA.','chapters':chapters,'unassigned':[{'id':c['id'],'title':c['title']}for c in src['chapters']if not c['tokens']],'vocabulary_size':len(vocab),'order':order,'jaccard':jac.round(8).tolist(),'cosine':cos.round(8).tolist(),'limitations':['原词未作同义归并；相同词不一定含义相同。','少量词的短篇可能获得很高相似度，需结合词数和共有词阅读。','二维MDS只是距离近似，不表示地理位置或情节路径。','空白篇目不等于原文没有空间；附件未能完成读取，本轮不声称复现讲义方法。']}
 (ROOT/'reports/chapter-space-only-similarity.json').write_text(json.dumps(out,ensure_ascii=False),encoding='utf8')
 font=FontProperties(fname='C:/Windows/Fonts/msyh.ttc');fig,axes=plt.subplots(1,2,figsize=(16,7))
 im=axes[0].imshow(jac[np.ix_(order,order)],vmin=0,vmax=1,cmap='YlGnBu',interpolation='nearest');axes[0].set_title('篇目相似度：Jaccard（层次排序）',fontproperties=font);fig.colorbar(im,ax=axes[0],shrink=.7)
 axes[1].scatter(xy[:,0],xy[:,1],s=12,alpha=.6,color='#397d9a');axes[1].set_title('篇目分布：1－Jaccard的二维MDS',fontproperties=font)
 for ax in axes:ax.set_xticks([]);ax.set_yticks([])
 fig.suptitle('仅空间词：443篇两两比较',fontproperties=font,fontsize=19);fig.text(.08,.02,'热图对角线为自身；点间距离是近似，不表示地理位置。词数过少的篇目需谨慎比较。',fontproperties=font);fig.tight_layout(rect=[0,.05,1,.94]);fig.savefig(ROOT/'reports/篇目純空間詞_相似度.png',dpi=150);plt.close(fig)
 payload=json.dumps(out,ensure_ascii=False).replace('<','\\u003c')
 page='''<!doctype html><meta charset="utf-8"><title>篇目空间词相似度</title><style>body{font:16px/1.6 system-ui;margin:24px;background:#faf9f5}canvas{max-width:100%;background:white;border:1px solid #ddd}input,select{padding:8px}table{border-collapse:collapse;width:100%}td,th{border-bottom:1px solid #ddd;padding:8px;text-align:left}#tip{min-height:50px}</style><h1>篇目空间词相似度</h1><p>443篇有效，48篇无有效词项。选择篇名，查看最相似的篇目和共有词。没有进行主题分类或更改标注。</p><input id="search" placeholder="搜索篇名"><select id="chapter"></select><select id="metric"><option value="jaccard">Jaccard：共有词占比</option><option value="cosine">TF-IDF余弦：考虑词频与辨识性</option></select><p id="summary"></p><table><thead><tr><th>篇目</th><th>相似度</th><th>共有词</th></tr></thead><tbody id="rows"></tbody></table><h2>全书相似度热图</h2><p>悬停查看两篇及精确分数，点击格子查看该行篇目的近邻。按同一Jaccard层次顺序排列；对角线是自身。</p><canvas id="heat" width="443" height="443" style="width:850px;image-rendering:pixelated"></canvas><p id="tip"></p><h2>二维篇目分布</h2><canvas id="map" width="1000" height="650"></canvas><p>MDS近似1－Jaccard距离；与地理位置、时间顺序无关。悬停查看篇名，点击选篇。</p><p>Jaccard不计重复词；TF-IDF使用平滑IDF与L2归一化。未统一同义词，短篇高分应结合共有词数核查。</p><script>const D=PAYLOAD;
const $=id=>document.getElementById(id);let selected=D.chapters[0].id;
function options(){const q=$('search').value.trim();$('chapter').replaceChildren();for(const c of D.chapters.filter(c=>c.title.includes(q))){const o=document.createElement('option');o.value=c.id;o.textContent=c.title;$('chapter').append(o)}if([...$('chapter').options].some(o=>Number(o.value)===selected))$('chapter').value=selected;else if($('chapter').options.length)selected=Number($('chapter').value);show()}
function show(){const c=D.chapters.find(c=>c.id===selected);$('summary').textContent=`《${c.title}》：${c.words}种词，${c.tokens}词次；${c.words<5?'词项较少，请谨慎比较':''}`;$('rows').replaceChildren();for(const n of c.nearest[$('metric').value]){const tr=document.createElement('tr');for(const v of [n.title,n.similarity.toFixed(4),n.shared_words.join('、')]){const td=document.createElement('td');td.textContent=v;tr.append(td)}tr.onclick=()=>{selected=n.id;$('search').value='';options()};$('rows').append(tr)}heat();map()}
function heat(){const ctx=$('heat').getContext('2d'),mat=D[$('metric').value];for(let i=0;i<D.order.length;i++)for(let j=0;j<D.order.length;j++){const v=mat[D.order[i]][D.order[j]];ctx.fillStyle=`rgb(${Math.round(250-220*v)},${Math.round(250-140*v)},${Math.round(245-70*v)})`;ctx.fillRect(j,i,1,1)}}
function cell(e){const r=$('heat').getBoundingClientRect();return [Math.floor((e.clientY-r.top)*443/r.height),Math.floor((e.clientX-r.left)*443/r.width)]}
$('heat').onmousemove=e=>{const[i,j]=cell(e);if(i<0||j<0||i>=443||j>=443)return;const a=D.order[i],b=D.order[j];$('tip').textContent=`《${D.chapters[a].title}》／《${D.chapters[b].title}》：${D[$('metric').value][a][b].toFixed(4)}`};$('heat').onclick=e=>{const[i]=cell(e);if(i>=0&&i<443){selected=D.chapters[D.order[i]].id;$('search').value='';options()}};
const xs=D.chapters.map(c=>c.x),ys=D.chapters.map(c=>c.y),xmin=Math.min(...xs),ymin=Math.min(...ys),scale=Math.min(900/(Math.max(...xs)-xmin),550/(Math.max(...ys)-ymin));const pos=c=>[50+(c.x-xmin)*scale,600-(c.y-ymin)*scale];
function map(){const ctx=$('map').getContext('2d');ctx.clearRect(0,0,1000,650);for(const c of D.chapters){const[x,y]=pos(c);ctx.beginPath();ctx.arc(x,y,c.id===selected?7:3,0,Math.PI*2);ctx.fillStyle=c.id===selected?'#cf572d':'#397d9a88';ctx.fill()}}
function nearest(e){const r=$('map').getBoundingClientRect(),x=(e.clientX-r.left)*1000/r.width,y=(e.clientY-r.top)*650/r.height;return D.chapters.map(c=>{const[a,b]=pos(c);return {c,d:Math.hypot(a-x,b-y)}}).sort((a,b)=>a.d-b.d)[0]}
$('map').onmousemove=e=>{const n=nearest(e);if(n.d<15)$('tip').textContent=`《${n.c.title}》：${n.c.words}种词`};$('map').onclick=e=>{const n=nearest(e);if(n.d<15){selected=n.c.id;$('search').value='';options()}};$('search').oninput=options;$('chapter').onchange=()=>{selected=Number($('chapter').value);show()};$('metric').onchange=show;options();</script>'''.replace('PAYLOAD',payload)
 (ROOT/'reports/篇目純空間詞_相似度互動圖.html').write_text(page,encoding='utf8');print(json.dumps({'chapters':len(cs),'pairs':len(cs)*(len(cs)-1)//2,'types':len(vocab)}))
if __name__=='__main__':main()
