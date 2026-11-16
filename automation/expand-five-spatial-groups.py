import os,sys,json,re,pathlib,collections,csv
os.environ['OPENBLAS_NUM_THREADS']='1';sys.path.insert(0,'.network-runtime/topic-libs')
import numpy as np
from scipy.stats import fisher_exact
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.font_manager import FontProperties
P=pathlib.Path('reports');src=json.load(open('.network-runtime/latest-place-space-input.json',encoding='utf8'));vocab=json.load(open('.network-runtime/spatial-vocabulary-registry.json',encoding='utf8'));old=json.load(open('reports/最新三主題_類型對照.json',encoding='utf8'));seeds=old['groups'];groups=list(seeds);types=['人','鬼','狐','妖','神'];cs=src['chapters']
seedmap={w:g for g,words in seeds.items()for w in words}
named_water={'洞庭','洞庭湖','黄河','长江','钱塘江','汉江','汉水','西湖','鄱阳湖','太湖','东海','南海','北海'}
named_mountain={'泰山','太山','华山','劳山','崂山','五台山','武夷山','终南山','峨眉山','嵩山'}
suspects={'冯中堂','日中','目前','愕间','愦间','顾左右','日已西下','君命司','改节泉'}
def classify(r):
 w=r['word']
 if w in suspects:return None,'疑似非空間義或分詞邊界問題'
 if w in seedmap:return seedmap[w],'原五群詞表'
 if w in {'海内','河山','海水','江水','河水','池水','潮水','清水','白沙','流水','潜水','剑树'}:return None,'地域泛稱、物質或多義詞，須依出現位置核查'
 if w in {'家','家中','其家','逆旅'}:return '房室','居住處所或旅宿'
 if w in {'井','井中','汲水井'}:return '舟水','取水設施'
 if w in {'古煤井','邻煤洞'}:return '山穴','礦井洞穴'

 if w in named_water:return '舟水','明確水域名稱'
 if w in named_mountain:return '山穴','明確山岳名稱'
 if r['kinds']==['地點詞']:return None,'地理專名，無法僅依名稱納入五群'
 if re.search('冥|阴司|阴曹|阴间|阴世|阴府|地府|地狱|阎罗|阎摩|九幽|九泉|黄泉|十王殿|饿鬼狱|刀山狱|十八狱|黑暗狱|穷泉',w):return '冥府稱謂','陰間、冥司及具名冥獄稱謂'
 if re.search('门|户|扉|窗|櫺|墙|壁|垣|篱|墉|帘|幕|屏|关',w):return '門戶','出入口、隔斷或圍界詞形'
 if re.search('寺|庙|祠|观|庵|兰若|殿|宫|署|狱|营|庠|库|仓|亭',w):return None,'宗教、公共或制度場所，原五群未涵蓋'
 if w.endswith('村'):return None,'聚落詞，不能僅因含山字歸為山穴'
 if w=='洞房':return '房室','婚居房間'
 if re.search('室|房|屋|舍|宅|庐|斋|闺|寝|楼|阁|床|榻|厨|厕|馆|旅邸|店|堂|廊|第|帏|帐|帷|庑|廨',w):
  if w in ['场屋','上台','冯中堂']:return None,'須依語境區別制度、官稱或實際場所'
  return '房室','房舍、內部房間、樓閣、旅居或室內設施詞形'
 if re.search('舟|船|舱|河|江|湖|海|溪|涧|池|泉|渊|水|渡|岸|滨|沟|渠|桥|洋|岛|汀|浦|鹢',w):return '舟水','水域、舟船及水際詞形'
 if re.search('山|谷|岩|崖|峰|岭|壑|洞|穴|窟|林|树|草|野|丛|坡|丘',w):
  if re.search('墓|坟|冢|葬',w):return None,'墓葬場所，不等同冥府'
  if w=='洞房':return '房室','婚居房間'
  return '山穴','山林洞穴及野外地貌詞形'
 if re.search('室|房|屋|舍|宅|庐|斋|闺|寝|楼|阁|床|榻|厨|厕|馆|旅邸|店|堂|廊|第|帏|帐|帷|庑|廨',w):
  if w in ['场屋','上台','冯中堂']:return None,'須依語境區別制度、官稱或實際場所'
  return '房室','房舍、內部房間、樓閣、旅居或室內設施詞形'
 if re.search('墓|坟|冢|棺|柩|殡|葬|灵前|灵寝',w):return None,'墓葬場所，不等同冥府'
 if re.search('天|云|空际|空中|广寒|月府|仙乡',w):return None,'天空或仙界，不屬現有五群'
 if re.search('寺|庙|祠|观|庵|兰若|殿|宫|署|狱|营|庠|库|仓|亭',w):return None,'宗教、公共或制度場所，原五群未涵蓋'
 if re.search('田|畦|圃|园|庭|院|苑|垅|垄|陇',w):return None,'庭院園圃或農耕場所，原五群未涵蓋'
 if re.search('路|道|街|巷|市|肆|廛|村|城|邑|郡|乡|里|郭|衢|驿',w):return None,'道路、聚落或市集，原五群未涵蓋'
 return None,'身體、相對位置、泛稱或待語義核查'
for r in vocab:
 r['group'],r['basis']=classify(r);r['status']='五群外／待核'if r['group']is None else'詞表或詞形歸併，待逐次語義覆核'
lookup={r['word']:r for r in vocab}
Y=np.array([[any(lookup[w]['group']==g for w in set(c['tokens']))for g in groups]for c in cs],dtype=float)
Z=np.array([[bool(set(c['space_words'])&set(seeds[g]))for g in groups]for c in cs],dtype=float)
labels=np.array([[t in c['events']for t in types]for c in cs],dtype=float);length=np.array([c['full_word_count']for c in cs]);strata=np.searchsorted(np.quantile(length,[.25,.5,.75]),length,side='right');bins=[np.flatnonzero(strata==i)for i in np.unique(strata)]
coef=np.zeros_like(labels);den=np.zeros(5)
for ix in bins:
 a=labels[ix].sum(0);b=len(ix)-a;weight=a*b/len(ix);den+=weight
 coef[ix]=labels[ix]*np.divide(weight,a,out=np.zeros(5),where=a>0)-(1-labels[ix])*np.divide(weight,b,out=np.zeros(5),where=b>0)
both=np.column_stack([Z,Y]);obs=both.T@coef/den;extreme=np.zeros_like(obs);rng=np.random.default_rng(42)
for _ in range(19999):
 ix=np.arange(len(cs))
 for b in bins:ix[b]=rng.permutation(b)
 extreme+=np.abs(both.T@coef[ix]/den)>=np.abs(obs)-1e-12
ps=(extreme+1)/20000
def bh(p):
 ix=np.argsort(p);out=np.empty(len(p));out[ix]=np.minimum(1,np.minimum.accumulate((p[ix]*len(p)/np.arange(1,len(p)+1))[::-1])[::-1]);return out
qs=bh(ps.ravel()).reshape(ps.shape);rows=[]
for variant,values,offset in [('原詞表',Z,0),('擴充詞表',Y,5)]:
 for i,g in enumerate(groups):
  for j,t in enumerate(types):
   yes=labels[:,j].astype(bool);a=int(values[yes,i].sum());b=int(values[~yes,i].sum());n1=int(yes.sum());n0=len(cs)-n1
   rows.append(dict(variant=variant,group=g,type=t,inside=a,inside_n=n1,outside=b,outside_n=n0,rate=a/n1,reference=b/n0,ratio=(a/n1)/(b/n0)if b else None,effect=float(obs[offset+i,j]),p=float(ps[offset+i,j]),q50=float(qs[offset+i,j]),fisher_p=float(fisher_exact([[a,n1-a],[b,n0-b]])[1])))
combinations=[]
for name in ['神','人','鬼','鬼／神','狐','妖','人／神','鬼／狐','鬼／狐／神','鬼／妖','妖／神','人／鬼／妖','人／妖','狐／妖','狐／神','人／鬼']:
 ix=[i for i,c in enumerate(cs)if '／'.join(t for t in types if t in c['events'])==name]
 combinations.append(dict(group=name,n=len(ix),hits=Y[ix].sum(0).astype(int).tolist(),rates=Y[ix].mean(0).tolist()))
coverage={g:dict(word_types=sum(r['group']==g for r in vocab),effective_types=sum(r['group']==g and r['frequency']>0 for r in vocab),token_count=sum(r['frequency']for r in vocab if r['group']==g),chapter_hits=int(Y[:,i].sum()))for i,g in enumerate(groups)}
result=dict(source_sha256=src['source_sha256'],all_annotated_types=len(vocab),effective_types=sum(r['frequency']>0 for r in vocab),coverage=coverage,unassigned_types=sum(r['group']is None for r in vocab),unassigned_tokens=sum(r['frequency']for r in vocab if r['group']is None),vocabulary=vocab,comparisons=rows,combinations=combinations,permutations=19999,bh_family=50)
(P/'全空間詞_五詞群歸納.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8')
with (P/'全空間詞_五詞群歸納.csv').open('w',encoding='utf-8-sig',newline='')as f:
 writer=csv.writer(f);writer.writerow(['詞語','原類別','五詞群','歸併依據','有效詞次','有效篇數','標注篇數','例篇','引句'])
 for r in sorted(vocab,key=lambda r:((r['group']or'未歸入'),-r['frequency'],r['word'])):writer.writerow([r['word'],'／'.join(r['kinds']),r['group']or'五群外／待核',r['basis'],r['frequency'],len(r['effective_chapters']),len(r['annotation_chapters']),'、'.join(e['title']for e in r['example']),' '.join(e['quote']for e in r['example'])])
font=FontProperties(fname='C:/Windows/Fonts/msjh.ttc',size=12);fig,axes=plt.subplots(1,2,figsize=(14,7));v=np.max(np.abs(obs))*100
for ax,offset,title in [(axes[0],0,'原五詞群小詞表'),(axes[1],5,'擴充五詞群')]:
 arr=obs[offset:offset+5]*100;im=ax.imshow(arr,cmap='RdBu_r',vmin=-v,vmax=v,aspect='auto');ax.set_xticks(range(5),types,fontproperties=font);ax.set_yticks(range(5),groups,fontproperties=font);ax.set_title(title,fontproperties=font)
 for i in range(5):
  for j in range(5):ax.text(j,i,f'{arr[i,j]:+.1f}'+('*'if qs[offset+i,j]<.05 else ''),ha='center',va='center',color='white'if abs(arr[i,j])>v*.65 else'#222')
fig.subplots_adjust(left=.1,right=.83,bottom=.2,top=.86,wspace=.35);cax=fig.add_axes([.89,.26,.015,.52]);fig.colorbar(im,cax=cax).set_label('百分點',fontproperties=font);fig.suptitle('五詞群擴充前後與篇目類型的關係',fontproperties=font,fontsize=19);fig.text(.04,.045,'數字為篇幅分組加權命中率差；* 兩版本共50項BH q<0.05。\n擴充分組依已標注詞形，尚未逐次消歧；五群外詞另列清單。',fontproperties=font);fig.savefig(P/'全空間詞_五詞群與篇目類型.png',dpi=170)
print('COVERAGE',coverage,'UNASSIGNED',result['unassigned_types'],result['unassigned_tokens'])
for r in rows:
 if r['variant']=='擴充詞表'and r['q50']<.05:print('SIG',r)
