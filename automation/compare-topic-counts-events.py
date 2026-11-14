"""Explore K=3/6/10 without event labels in fitting; stratified multilabel tests."""
import pathlib,sys,json,hashlib,functools,html
ROOT=pathlib.Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'.network-runtime/topic-libs'))
import numpy as np
from qhchina.analytics.topicmodels import LDAGibbsSampler
import qhchina.analytics.topicmodels as tm
from tqdm.auto import tqdm
tm.tqdm=functools.partial(tqdm,disable=True)
from scipy.optimize import linear_sum_assignment
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.font_manager import FontProperties

def bh(ps):
 ps=np.array(ps);order=np.argsort(ps);out=np.empty(len(ps));out[order]=np.minimum(1,np.minimum.accumulate((ps[order]*len(ps)/np.arange(1,len(ps)+1))[::-1])[::-1]);return out

def adjusted_effect(theta,labels,strata):
 numerator=np.zeros((theta.shape[1],labels.shape[1]));denominator=np.zeros(labels.shape[1])
 for s in np.unique(strata):
  ix=strata==s;x=theta[ix];y=labels[ix];n=len(x);n1=y.sum(axis=0)
  numerator+=(x-x.mean(axis=0)).T@y;denominator+=n1*(n-n1)/n
 return np.divide(numerator,denominator[None,:],out=np.zeros_like(numerator),where=denominator[None,:]>0)

def test_associations(theta,labels,strata,permutations=4999):
 observed=adjusted_effect(theta,labels,strata);counts=np.zeros_like(observed,dtype=int);rng=np.random.default_rng(314159)
 for _ in range(permutations):
  shuffled=labels.copy()
  for s in np.unique(strata):
   ix=np.flatnonzero(strata==s);shuffled[ix]=labels[rng.permutation(ix)]
  counts+=np.abs(adjusted_effect(theta,shuffled,strata))>=np.abs(observed)-1e-14
 return observed,(counts+1)/(permutations+1)

def render_figure(out,filename='全書詞彙_三六十主題與類型關聯.png'):
 alltests=out['associations'];results=out['models'];types=out['types']
 font=FontProperties(fname='C:/Windows/Fonts/msyh.ttc');fig,axes=plt.subplots(1,3,figsize=(17,9));v=max(abs(r['length_adjusted_difference'])for r in alltests)
 for ax,model in zip(axes,results):
  k=model['k'];rows=[r for r in alltests if r['k']==k];arr=np.array([r['length_adjusted_difference']for r in rows]).reshape(k,5)
  im=ax.imshow(arr,cmap='RdBu_r',vmin=-v,vmax=v,aspect='auto');ax.set_xticks(range(5),types,fontproperties=font);ax.set_yticks(range(k),[f'主题{i+1}'for i in range(k)],fontproperties=font)
  ax.set_title(f'{k}主题：与篇目类型的关系',fontproperties=font,fontsize=15)
  for r in rows:
   if r['global_bh_q']<.05:ax.text(types.index(r['event']),r['topic']-1,'*'if r['same_direction_all_seeds']else'†',ha='center',va='center',fontsize=18)
 cax=fig.add_axes([.92,.28,.012,.43]);fig.colorbar(im,cax=cax,label='Adjusted mean topic weight difference')
 fig.text(.06,.035,'红：该类篇目主题权重较高；蓝：较低。* q<0.05且三个种子方向一致；† q<0.05但方向不一致。\n4999次篇幅组内重排；95项检验统一BH校正。关联不等于独占、预测能力或因果。',fontproperties=font,fontsize=11)
 fig.subplots_adjust(bottom=.14,right=.86,wspace=.35);fig.savefig(ROOT/'reports'/filename,dpi=150);plt.close(fig)

def main(corpus='allword'):
 prefix='地點與空間詞'if corpus=='place-space'else'全書詞彙'
 json_name='place-space-topic-counts-events.json'if corpus=='place-space'else'allword-topic-counts-events.json'
 input_name='place-space-topic-input.json'if corpus=='place-space'else'allword-topic-input.json'
 src=json.loads((ROOT/'.network-runtime'/input_name).read_text(encoding='utf8'))
 assert src['source_sha256']==hashlib.sha256((ROOT/'data-package.json').read_bytes()).hexdigest()
 cs=[c for c in src['chapters'] if c['tokens']];docs=[c['tokens']for c in cs];types=['人','鬼','狐','妖','神']
 labels=np.array([[e in c['events']for e in types]for c in cs],dtype=float);lengths=np.array([c.get('full_word_count',len(c['tokens']))for c in cs]);cuts=np.quantile(lengths,[.25,.5,.75]);strata=np.searchsorted(cuts,lengths,side='right')
 results=[];alltests=[]
 for k in [3,6,10]:
  params=dict(n_topics=k,iterations=200,burnin=10,min_word_length=1,min_word_count=1,max_vocab_size=1000000,alpha=10.,beta=.01,estimate_alpha=1,log_interval=None)
  models={}
  for seed in [42,7,123]:
   m=LDAGibbsSampler(**params,random_state=seed);m.fit(docs);models[seed]=m
   assert len(m.vocabulary)==len({w for d in docs for w in d})
   assert np.allclose(m.theta.sum(axis=1),1)
   print(f'Completed K={k}, seed={seed}',flush=True)
  ref=models[42];aligned={42:ref.theta};stability=[]
  for seed in [7,123]:
   m=models[seed];assert ref.vocabulary==m.vocabulary
   ii,jj=linear_sum_assignment(-(np.sqrt(ref.phi)@np.sqrt(m.phi).T));aligned[seed]=m.theta[:,jj]
   sims=[]
   for i,j in zip(ii,jj):
    a=set(np.argsort(-ref.phi[i])[:20]);b=set(np.argsort(-m.phi[j])[:20]);sims.append(len(a&b)/len(a|b))
   stability.append({'seed':seed,'matched_topics':jj.tolist(),'top20_jaccard':sims,'mean_top20_jaccard':float(np.mean(sims))})
  observed,ps=test_associations(ref.theta,labels,strata);effects={seed:adjusted_effect(t,labels,strata)for seed,t in aligned.items()}
  topics=[]
  for t in range(k):
   topics.append({'id':t+1,'top_words':[{'word':ref.id_to_word[int(i)],'probability':float(ref.phi[t,i])}for i in np.argsort(-ref.phi[t])[:20]],
    'representative_chapters':[{'id':cs[i]['id'],'title':cs[i]['title'],'weight':float(ref.theta[i,t])}for i in np.argsort(-ref.theta[:,t])[:5]]})
   for e,name in enumerate(types):
    hit=labels[:,e].astype(bool);row={'k':k,'topic':t+1,'event':name,'n_label':int(hit.sum()),'n_other':int((~hit).sum()),
     'mean_label':float(ref.theta[hit,t].mean()),'mean_other':float(ref.theta[~hit,t].mean()),'length_adjusted_difference':float(observed[t,e]),'permutation_p':float(ps[t,e]),
     'effects_by_seed':{str(seed):float(mat[t,e])for seed,mat in effects.items()},'same_direction_all_seeds':all(np.sign(mat[t,e])==np.sign(observed[t,e])for mat in effects.values())};alltests.append(row)
  results.append({'k':k,'parameters':params,'topics':topics,'stability':stability,'learned_alpha':ref.alpha.tolist(),
   'chapters':[{'id':c['id'],'title':c['title'],'token_count':len(docs[i]),'events':c['events'],'weights':ref.theta[i].tolist()}for i,c in enumerate(cs)]})
  print(f'Completed K={k} stratified permutations',flush=True)
 qs=bh([r['permutation_p']for r in alltests])
 for row,q in zip(alltests,qs):row['global_bh_q']=float(q)
 out={'source_sha256':src['source_sha256'],'stopwords_sha256':src['stopwords_sha256'],'corpus':corpus,'input_policy':src.get('policy','all lexical categories except stopwords and punctuation'),'input_counts':src.get('counts',{}),'types':types,'document_count':len(cs),'word_types':len(ref.vocabulary),'tokens':sum(len(d)for d in docs),
 'method':'K=3/6/10; identical all-word chapter corpus; event labels excluded from LDA. Each event is a separate overlapping binary label. 4999 two-sided within-length-quartile permutations of complete label rows. Weighted within-stratum mean difference; weight n1*n0/n. Global BH correction across all 95 K-topic-event tests.',
 'length_quartile_cutpoints':cuts.tolist(),'stratum_sizes':[int((strata==s).sum())for s in range(4)],'permutations':4999,'permutation_seed':314159,'models':results,'associations':alltests,
 'limitations':['主题数与参数选择均属探索；q值只校正本轮95项检验，不涵盖此前所有实验。','同一篇可包含多类，正关联不表示该主題独属某类，也不是预测准确率。','标签词本身仍参与训练；例如狐、鬼可能直接贡献关联，不能据此解释叙事机制。','长度按有效词次分四组，仅作粗粒度控制；不能排除人物姓名、词表和分词误差影响。','跨种子方向一致不等于稳定的文学主题；需同时查看词表匹配稳定性。']}
 out['method']=out['method'].replace('all-word chapter corpus',corpus+' chapter corpus')
 out['length_basis']='Full cleaned chapter token count (all lexical categories)'
 out['unassigned']=[{'id':c['id'],'title':c['title']}for c in src['chapters']if not c['tokens']]
 if corpus=='place-space':
  out['limitations'][2]='只纳入已标注的地名与空间原词；未收录、分词未独立成词及被停用词排除的词不在本轮之内。'
  out['limitations'].append('没有有效地名或空间词的篇目不训练、不强行归组；与全词模型比较时样本数不同，显著项数量不能直接决定优劣。')
 (ROOT/'reports'/json_name).write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf8')
 render_figure(out,prefix+'_三六十主題與類型關聯.png')
 ranked=sorted(alltests,key=lambda r:(r['global_bh_q'],-abs(r['length_adjusted_difference'])))
 lines=['# 全书词汇：三、六、十主题与篇目类型','',out['method'],'',
 '|主题数|跨种子前20词平均Jaccard|q<0.05关联数|其中三种子同方向|','|---|---:|---:|---:|']
 for m in results:
  sig=[r for r in alltests if r['k']==m['k']and r['global_bh_q']<.05];lines.append(f'|{m["k"]}|{np.mean([s["mean_top20_jaccard"]for s in m["stability"]]):.3f}|{len(sig)}|{sum(r["same_direction_all_seeds"]for r in sig)}|')
 lines+=['','## 关联结果（全部95项，按q值排序）','','|K|主题|类型|该类平均权重|其他平均权重|篇幅调整差值|重排p|全局q|三个种子同方向|','|---|---|---|---:|---:|---:|---:|---:|---|']
 for r in ranked:lines.append(f'|{r["k"]}|{r["topic"]}|{r["event"]}|{r["mean_label"]:.3f}|{r["mean_other"]:.3f}|{r["length_adjusted_difference"]:+.3f}|{r["permutation_p"]:.4f}|{r["global_bh_q"]:.4f}|{"是"if r["same_direction_all_seeds"]else"否"}|')
 for m in results:
  lines+=['',f'## {m["k"]}主题代表词','']
  for t in m['topics']:lines.append(f'- 主题{t["id"]}：'+ '、'.join(w['word']for w in t['top_words'])+'。代表篇目：'+'、'.join(c['title']for c in t['representative_chapters']))
 lines+=['','## 限制','',*['- '+s for s in out['limitations']]]
 lines[0]='# '+prefix+'：三、六、十主题与篇目类型'
 lines.insert(2,f'有效篇目{len(cs)}／原有{len(src["chapters"])}篇；{len(ref.vocabulary)}种词，{out["tokens"]}词次。篇幅控制使用全篇各类有效词次。')
 (ROOT/'reports'/(prefix+'_三六十主題關聯報告.md')).write_text('\n'.join(lines)+'\n',encoding='utf8')
 cards=''.join('<h2>'+str(m['k'])+'主题</h2>'+''.join('<p><b>主题'+str(t['id'])+'</b>：'+html.escape('、'.join(w['word']for w in t['top_words']))+'</p>'for t in m['topics'])for m in results)
 payload=json.dumps(out,ensure_ascii=False).replace('<','\\u003c')
 page='''<!doctype html><html lang="zh"><meta charset="utf-8"><title>三六十主题与篇目类型</title><style>body{font:16px/1.6 system-ui;max-width:1400px;margin:25px auto;padding:20px;background:#faf9f5}table{border-collapse:collapse;width:100%}td,th{padding:7px;border-bottom:1px solid #ddd;text-align:left}img{width:100%}select,input{padding:8px;margin:6px}.scroll{max-height:650px;overflow:auto}</style><h1>三、六、十主题与篇目类型</h1><p>同一份491篇全书词汇，不给模型篇目类型标签。下表比较某类篇目与其余篇目的主题权重，保留多类型标签。</p><img src="全書詞彙_三六十主題與類型關聯.png" alt="按篇幅控制后的主题与类型关联"><p>关联不等于分类成功。星号含义、检验范围见图下注释。</p><select id="k"><option value="">全部主题数</option><option>3</option><option>6</option><option>10</option></select><select id="type"><option value="">全部类型</option>'''+''.join('<option>'+e+'</option>'for e in types)+'''</select><label><input type="checkbox" id="sig">仅q&lt;0.05</label><div class="scroll"><table><thead><tr><th>K</th><th>主题</th><th>类型</th><th>该类平均</th><th>其他平均</th><th>调整差值</th><th>p</th><th>全局q</th><th>三种子同向</th></tr></thead><tbody id="rows"></tbody></table></div><details><summary>各模型的代表词</summary>'''+cards+'</details><h2>限制</h2><ul>'+''.join('<li>'+html.escape(s)+'</li>'for s in out['limitations'])+'</ul><script>const D='+payload+''';function draw(){const rows=D.associations.filter(r=>(!document.querySelector('#k').value||r.k==document.querySelector('#k').value)&&(!document.querySelector('#type').value||r.event===document.querySelector('#type').value)&&(!document.querySelector('#sig').checked||r.global_bh_q<.05)).sort((a,b)=>a.global_bh_q-b.global_bh_q);const box=document.querySelector('#rows');box.replaceChildren();for(const r of rows){const tr=document.createElement('tr');for(const value of [r.k,r.topic,r.event,r.mean_label.toFixed(3),r.mean_other.toFixed(3),r.length_adjusted_difference.toFixed(3),r.permutation_p.toFixed(4),r.global_bh_q.toFixed(4),r.same_direction_all_seeds?'是':'否']){const td=document.createElement('td');td.textContent=value;tr.append(td)}box.append(tr)}}for(const id of ['k','type','sig'])document.querySelector('#'+id).onchange=draw;draw();</script></html>'''
 if corpus=='place-space':
  page=page.replace('全書詞彙_三六十主題與類型關聯.png',prefix+'_三六十主題與類型關聯.png').replace('同一份491篇全书词汇',f'地名与空间词合并，{len(cs)}篇有效／原有{len(src["chapters"])}篇').replace('<h1>三、六、十主题与篇目类型</h1>','<h1>地名与空间词：三、六、十主题与篇目类型</h1>')
 (ROOT/'reports'/(prefix+'_三六十主題類型比較.html')).write_text(page,encoding='utf8')
 print(json.dumps({'significant':[r for r in ranked if r['global_bh_q']<.05],'stability':[{m['k']:[s['mean_top20_jaccard']for s in m['stability']]}for m in results]},ensure_ascii=False),flush=True)
if __name__=='__main__':
 import argparse
 parser=argparse.ArgumentParser();parser.add_argument('--corpus',choices=['allword','place-space'],default='allword');main(parser.parse_args().corpus)
