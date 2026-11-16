import os,sys,pathlib,json,functools,collections
os.environ['OPENBLAS_NUM_THREADS']='1'
sys.path.insert(0,'.network-runtime/topic-libs')
import numpy as np
from scipy.stats import fisher_exact
from scipy.optimize import linear_sum_assignment
from sklearn.manifold import TSNE
from qhchina.analytics.topicmodels import LDAGibbsSampler
import qhchina.analytics.topicmodels as tm
from tqdm.auto import tqdm
tm.tqdm=functools.partial(tqdm,disable=True)
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.font_manager import FontProperties
from matplotlib.patches import Wedge,Patch
P=pathlib.Path('reports');src=json.load(open('.network-runtime/latest-place-space-input.json',encoding='utf8'));allcs=src['chapters'];cs=[c for c in allcs if c['tokens']]
types=['人','鬼','狐','妖','神'];docs=[c['tokens'] for c in cs]
models={}
params=dict(n_topics=3,iterations=200,burnin=10,min_word_length=1,min_word_count=1,max_vocab_size=1000000,alpha=10.,beta=.01,estimate_alpha=1,log_interval=None)
for seed in [42,7,123]:
 m=LDAGibbsSampler(**params,random_state=seed);m.fit(docs);models[seed]=m;print('fit',seed,flush=True)
ref=models[42];theta=ref.theta;aligned={42:theta};stability=[]
for seed in [7,123]:
 m=models[seed];ii,jj=linear_sum_assignment(-(np.sqrt(ref.phi)@np.sqrt(m.phi).T));aligned[seed]=m.theta[:,jj]
 stability.append(dict(seed=seed,top20_jaccard=float(np.mean([len(set(np.argsort(-ref.phi[i])[:20])&set(np.argsort(-m.phi[j])[:20]))/len(set(np.argsort(-ref.phi[i])[:20])|set(np.argsort(-m.phi[j])[:20])) for i,j in zip(ii,jj)]))))
xy=TSNE(n_components=2,perplexity=30,init='pca',learning_rate='auto',max_iter=1000,random_state=42).fit_transform(theta)
groups={'房室':['室','室中','房','房中','闺中','斋中','卧室','寝室','内室'],'門戶':['门','门外','门内','户','户外','窗外','窗','墙'],'山穴':['山中','山','穴','洞','山洞','林中'],'舟水':['舟','船','河中','河干','江上','海','海中','河','江','渡','岸'],'冥府稱謂':['冥司','冥府','地府','阴司','阴间','冥间','阎罗殿']}
Y=np.array([[bool(set(c['space_words'])&set(ws)) for ws in groups.values()]for c in allcs],dtype=float)
def bh(p):
 p=np.asarray(p);ix=np.argsort(p);q=np.empty(len(p));q[ix]=np.minimum(1,np.minimum.accumulate((p[ix]*len(p)/np.arange(1,len(p)+1))[::-1])[::-1]);return q
def design(chapters):
 labels=np.array([[t in c['events'] for t in types]for c in chapters],dtype=float);length=np.array([c['full_word_count']for c in chapters]);s=np.searchsorted(np.quantile(length,[.25,.5,.75]),length,side='right');bins=[np.flatnonzero(s==i)for i in np.unique(s)]
 coef=np.zeros_like(labels);den=np.zeros(5)
 for ix in bins:
  y=labels[ix];a=y.sum(0);b=len(ix)-a;weight=a*b/len(ix);den+=weight
  coef[ix]=y*np.divide(weight,a,out=np.zeros(5),where=a>0)-(1-y)*np.divide(weight,b,out=np.zeros(5),where=b>0)
 return labels,bins,coef,den
def permutation(values,chapters):
 labels,bins,coef,den=design(chapters);obs=values.T@coef/den;count=np.zeros_like(obs);rng=np.random.default_rng(42)
 for _ in range(19999):
  ix=np.arange(len(chapters))
  for b in bins:ix[b]=rng.permutation(b)
  count+=np.abs(values.T@coef[ix]/den)>=np.abs(obs)-1e-12
 return labels,obs,(count+1)/20000
lab,obs,p=permutation(theta,cs);full,go,gp=permutation(Y,allcs)
topic_rows=[dict(topic=i+1,type=t,effect=float(obs[i,j]),p=float(p[i,j]))for i in range(3)for j,t in enumerate(types)]
group_rows=[]
for i,g in enumerate(groups):
 for j,t in enumerate(types):
  yes=full[:,j].astype(bool);a=int(Y[yes,i].sum());b=int(Y[~yes,i].sum());n1=int(yes.sum());n0=len(allcs)-n1
  group_rows.append(dict(group=g,type=t,inside=a,inside_n=n1,outside=b,outside_n=n0,rate=a/n1,reference=b/n0,ratio=(a/n1)/(b/n0) if b else None,effect=float(go[i,j]),p=float(gp[i,j]),fisher_p=float(fisher_exact([[a,n1-a],[b,n0-b]])[1]),hits=[c['id']for k,c in enumerate(allcs)if Y[k,i] and t in c['events']]))
for row,q in zip(topic_rows,bh([r['p']for r in topic_rows])):row['q15']=float(q)
for row,q,fq in zip(group_rows,bh([r['p']for r in group_rows]),bh([r['fisher_p']for r in group_rows])):row.update(q25=float(q),fisher_q25=float(fq))
for row,q in zip(topic_rows+group_rows,bh([r['p']for r in topic_rows+group_rows])):row['q40']=float(q)
for row in topic_rows:
 i=row['topic']-1;j=types.index(row['type']);row['same_direction_all_seeds']=all(np.sign((th.T@design(cs)[2]/design(cs)[3])[i,j])==np.sign(row['effect'])for th in aligned.values())
topics=[]
for i in range(3):
 order=np.argsort(-theta[:,i]);reps=[int(k)for k in order if len(cs[k]['tokens'])>=10][:5]
 topics.append(dict(id=i+1,words=[dict(word=ref.id_to_word[int(k)],weight=float(ref.phi[i,k]))for k in np.argsort(-ref.phi[i])[:15]],representatives=[dict(id=cs[k]['id'],title=cs[k]['title'],events=cs[k]['events'],weight=float(theta[k,i]),tokens=len(cs[k]['tokens']))for k in reps]))
points=[dict(id=c['id'],title=c['title'],events=c['events'],tokens=len(c['tokens']),weights=theta[k].tolist(),x=float(xy[k,0]),y=float(xy[k,1]))for k,c in enumerate(cs)]
result=dict(source_sha256=src['source_sha256'],parameters=params,types=types,topics=topics,points=points,stability=stability,topic_associations=topic_rows,groups=groups,group_associations=group_rows,all_chapters=491,modeled_chapters=len(cs),unmodeled=[dict(id=c['id'],title=c['title'])for c in allcs if not c['tokens']],counts=src['counts'],permutations=19999,primary_bh_family=40)
(P/'最新三主題_類型對照.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8')
font=FontProperties(fname='C:/Windows/Fonts/msjh.ttc',size=12);palette=['#397d9a','#d68a2c','#8263ad'];eventcolors=dict(zip(types,['#707780','#8a4eb2','#df7d23','#29945f','#267bb9']))
fig,axes=plt.subplots(1,2,figsize=(16,8),sharex=True,sharey=True);radius=np.ptp(xy,axis=0).max()*.005
for ax,mode in zip(axes,['topic','type']):
 for k,c in enumerate(cs):
  colors=[palette[int(theta[k].argmax())]]if mode=='topic'else[eventcolors[t]for t in types if t in c['events']]
  if not colors:colors=['#cccccc']
  for j,col in enumerate(colors):ax.add_patch(Wedge(xy[k],radius,360*j/len(colors),360*(j+1)/len(colors),facecolor=col,edgecolor='white',linewidth=.2,alpha=.85))
 ax.set_xlim(xy[:,0].min()-radius*5,xy[:,0].max()+radius*5);ax.set_ylim(xy[:,1].min()-radius*5,xy[:,1].max()+radius*5);ax.set_aspect('equal');ax.set_xticks([]);ax.set_yticks([])
 ax.set_title('LDA 三主題'if mode=='topic'else'人、鬼、狐、妖、神',fontproperties=font)
 ax.legend(handles=[Patch(color=col,label='主題'+str(i+1))for i,col in enumerate(palette)]if mode=='topic'else[Patch(color=eventcolors[t],label=t)for t in types],prop=font,loc='upper left')
fig.suptitle('空間詞（地點詞＋場所詞）· 同一座標，兩種著色',fontproperties=font,fontsize=20);fig.text(.06,.025,'每點一篇，多類型以扇形保留。471篇投影；20篇無有效詞項。群間距離與面積沒有直接敘事尺度。',fontproperties=font);fig.tight_layout(rect=[0,.05,1,.94]);fig.savefig(P/'最新三主題_tSNE與五類篇目.png',dpi=170);plt.close(fig)
fig,axes=plt.subplots(1,2,figsize=(14,7));v=max(abs(obs).max(),abs(go).max())*100
for ax,arr,names,rs in [(axes[0],obs,[f'主題{i+1}'for i in range(3)],topic_rows),(axes[1],go,list(groups),group_rows)]:
 im=ax.imshow(arr*100,cmap='RdBu_r',vmin=-v,vmax=v,aspect='auto');ax.set_xticks(range(5),types,fontproperties=font);ax.set_yticks(range(arr.shape[0]),names,fontproperties=font)
 for i in range(arr.shape[0]):
  for j in range(5):ax.text(j,i,f'{arr[i,j]*100:+.1f}'+(('*' if rs[i*5+j].get('same_direction_all_seeds',True) else '†')if rs[i*5+j]['q40']<.05 else ''),ha='center',va='center',fontsize=10,color='white'if abs(arr[i,j]*100)>v*.65 else '#222')
axes[0].set_title('三個 LDA 主題與篇目類型',fontproperties=font);axes[1].set_title('五個人工詞群與篇目類型',fontproperties=font)
fig.suptitle('控制篇幅後的類型差異',fontproperties=font,fontsize=20);fig.text(.06,.035,'紅色較高、藍色較低；數字為加權比例差（百分點）。* 40項統一 BH q<0.05；† LDA跨種子方向不一致。\n19,999次組內多標籤重排；LDA 用471篇，詞群用全491篇。',fontproperties=font);fig.subplots_adjust(bottom=.17,top=.86,right=.83,wspace=.3);cax=fig.add_axes([.89,.24,.016,.55]);fig.colorbar(im,cax=cax).set_label('百分點',fontproperties=font);fig.savefig(P/'最新三主題與人工詞群_五類關聯.png',dpi=170);plt.close(fig)
fig,axes=plt.subplots(1,3,figsize=(15,7))
for ax,t,col in zip(axes,topics,palette):
 ws=t['words'][:12][::-1];ax.barh(range(12),[w['weight']for w in ws],color=col);ax.set_yticks(range(12),[w['word']for w in ws],fontproperties=font);ax.set_title('主題'+str(t['id']),fontproperties=font);ax.set_xlabel('P（詞｜主題）',fontproperties=font)
fig.suptitle('三個 LDA 主題的代表詞',fontproperties=font,fontsize=20);fig.tight_layout(rect=[0,0,1,.94]);fig.savefig(P/'最新三主題_代表詞.png',dpi=170)
print('TOPICS',[(t['id'],[w['word']for w in t['words'][:8]],[r['title']for r in t['representatives']])for t in topics])
print('STABILITY',stability)
print('TOPIC_SIG',[(r['topic'],r['type'],r['effect'],r['q40'])for r in topic_rows if r['q40']<.05])
print('GROUPS',[(r['group'],r['type'],r['inside'],r['inside_n'],r['outside'],r['outside_n'],r['q40'])for r in group_rows if r['q40']<.05])
