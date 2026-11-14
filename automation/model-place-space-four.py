"""All lexical categories, one complete chapter per document. Independent experiment."""
import pathlib,sys,json,hashlib,collections,gzip,html,functools
ROOT=pathlib.Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'.network-runtime/topic-libs'))
import numpy as np
from qhchina.analytics.topicmodels import LDAGibbsSampler
import qhchina.analytics.topicmodels as tm
from tqdm.auto import tqdm
tm.tqdm=functools.partial(tqdm,disable=True)
from scipy.optimize import linear_sum_assignment
from sklearn.manifold import TSNE,trustworthiness
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.font_manager import FontProperties

def main():
 src=json.loads((ROOT/'.network-runtime/place-space-topic-input.json').read_text(encoding='utf8'))
 assert src['source_sha256']==hashlib.sha256((ROOT/'data-package.json').read_bytes()).hexdigest()
 chapters=[dict(c,events=list(dict.fromkeys('妖' if e in ['狐','妖'] else e for e in c['events']))) for c in src['chapters'] if c['tokens']];docs=[c['tokens'] for c in chapters]
 params=dict(n_topics=4,iterations=200,burnin=10,min_word_length=1,min_word_count=1,max_vocab_size=1000000,alpha=10.,beta=.01,estimate_alpha=1,log_interval=None)
 freq=collections.Counter(w for d in docs for w in d);models={}
 for seed in [42,7,123]:
  m=LDAGibbsSampler(**params,random_state=seed);m.fit(docs);models[seed]=m
  assert set(m.vocabulary)==set(freq)
  assert np.allclose(m.theta.sum(axis=1),1) and np.allclose(m.phi.sum(axis=1),1)
  print(f'Completed seed {seed}: {len(docs)} chapters / {len(freq)} types',flush=True)
 ref=models[42];stability=[]
 for seed in [7,123]:
  m=models[seed];assert ref.vocabulary==m.vocabulary
  sim=np.sqrt(ref.phi)@np.sqrt(m.phi).T;ii,jj=linear_sum_assignment(-sim)
  scores=[]
  for i,j in zip(ii,jj):
   a=set(np.argsort(-ref.phi[i])[:20]);b=set(np.argsort(-m.phi[j])[:20]);scores.append(len(a&b)/len(a|b))
  stability.append({'seed':seed,'mean_top20_jaccard':float(np.mean(scores))})
 xy=TSNE(n_components=2,perplexity=30,init='pca',learning_rate='auto',max_iter=1000,random_state=42).fit_transform(ref.theta)
 colors={'人':'#707780','鬼':'#8a4eb2','妖':'#29945f','神':'#267bb9','未定':'#c7c7c7'}
 points=[{'id':c['id'],'title':c['title'],'token_count':len(docs[i]),'weights':ref.theta[i].tolist(),'dominant_topic':int(ref.theta[i].argmax())+1,'events':[e for e in colors if e in c['events']] or ['未定'],'x':float(xy[i,0]),'y':float(xy[i,1])}for i,c in enumerate(chapters)]
 topics=[]
 for t in range(4):
  top=np.argsort(-ref.phi[t])[:30];representatives=np.argsort(-ref.theta[:,t])[:10]
  topics.append({'id':t+1,'share':float(ref.n_t[t]/ref.n_t.sum()),'top_words':[{'word':ref.id_to_word[int(i)],'probability':float(ref.phi[t,i]),'frequency':freq[ref.id_to_word[int(i)]]}for i in top],
  'representative_chapters':[{'id':chapters[i]['id'],'title':chapters[i]['title'],'weight':float(ref.theta[i,t]),'tokens':len(docs[i])}for i in representatives]})
 prior=ref.n_t/ref.n_t.sum();post=ref.phi*prior[:,None];post/=post.sum(axis=0,keepdims=True)
 wordrows=[{'word':w,'frequency':freq[w],'dominant_topic':int(post[:,i].argmax())+1,'topic_probabilities':post[:,i].tolist(),'p_word_given_topic':ref.phi[:,i].tolist()}for i,w in enumerate(ref.vocabulary)]
 with gzip.GzipFile(filename=str(ROOT/'reports/place-space-four-topic-vocabulary.json.gz'),mode='wb',mtime=0)as f:f.write(json.dumps(wordrows,ensure_ascii=False).encode('utf8'))
 result={'source_sha256':src['source_sha256'],'stopwords_sha256':src['stopwords_sha256'],'stopwords':src['stopwords'],'method':'All saved Chinese tokens except explicit stopwords; full chapters; no POS, length or document-frequency exclusions. Five-topic Gibbs LDA. t-SNE of chapter-topic probabilities. No topic uses event labels.',
 'parameters':params,'seed':42,'stability':stability,'learned_alpha':ref.alpha.tolist(),'counts':{'chapters':len(chapters),'word_types':len(freq),'tokens':sum(freq.values())},'topics':topics,'points':points,'colors':colors,'unassigned':[{'id':c['id'],'title':c['title']}for c in src['chapters'] if not c['tokens']],
 'trustworthiness_10_neighbors':float(trustworthiness(ref.theta,xy,n_neighbors=10)),
 'projection_parameters':{'method':'t-SNE','perplexity':30,'random_state':42,'max_iter':1000},
 'limitations':['所有词指所有词类，并非将标点与停用词交给模型。单字及低频词保留，分词错误仍可能影响结果。','每篇是一份文档，不删除短篇。短篇的高主题概率不等于可靠性高。','主题编号不是文学类别；跨种子稳定性见报告。t-SNE仅用于局部邻近比较，群间距离和轴值没有地理或文学尺度。','沿用现有分词；未重新分词或改动人工修订。与空间词模型输入不同，主题编号不能直接对应。']}
 (ROOT/'reports/place-space-four-topic-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8')
 palette=['#397d9a','#d68a2c','#8263ad','#329b78','#bc586d'];font=FontProperties(fname='C:/Windows/Fonts/msyh.ttc')
 fig,axes=plt.subplots(2,3,figsize=(18,11));axes=axes.flat
 for t,topic in enumerate(topics):
  ws=topic['top_words'][:12];axes[t].barh(range(12),[w['probability'] for w in ws][::-1],color=palette[t]);axes[t].set_yticks(range(12),[w['word']for w in ws][::-1],fontproperties=font);axes[t].set_title(f'主题{t+1}：代表词',fontproperties=font);axes[t].set_xlabel('P(词｜主题)',fontproperties=font)
 ax=axes[5];ax.scatter(xy[:,0],xy[:,1],c=[palette[p['dominant_topic']-1]for p in points],s=18,alpha=.7);ax.set_title('篇目主题组合：t-SNE',fontproperties=font);ax.set_xticks([]);ax.set_yticks([])
 fig.suptitle(f'全书各类词汇：四主题 · {len(chapters)}篇 · {len(freq)}种词',fontproperties=font,fontsize=20);fig.tight_layout(rect=[0,.03,1,.95]);fig.savefig(ROOT/'reports/地點與空間詞_四主題與篇目.png',dpi=150);plt.close(fig)
 payload=json.dumps(result,ensure_ascii=False).replace('<','\\u003c')
 js=(ROOT/'automation/chapter-topic-view.js').read_text(encoding='utf8').replace('PAYLOAD',payload).replace("'主题5':'#bc586d'",'').replace(",};",'};').replace('五主题','四主题').replace('人、鬼、狐、妖、神','人、鬼、妖、神')
 cards=''.join(f'<section><h2>主题{t["id"]}</h2><p>'+html.escape('、'.join(w['word']for w in t['top_words']))+'</p><p>代表篇目：'+html.escape('、'.join(c['title']for c in t['representative_chapters']))+'</p></section>'for t in topics)
 tablejs="""const body=document.querySelector('#rows');function table(){const q=document.querySelector('#chapterSearch').value.trim(),sort=document.querySelector('#sort').value;let rows=D.points.filter(p=>p.title.includes(q));rows.sort(sort==='id'?(a,b)=>a.id-b.id:(a,b)=>b.weights[Number(sort)]-a.weights[Number(sort)]);body.replaceChildren();for(const p of rows){const tr=document.createElement('tr');for(const value of [p.id+1,p.title,p.events.join('、'),p.token_count,...p.weights.map(w=>(w*100).toFixed(1)+'%')]){const td=document.createElement('td');td.textContent=value;tr.append(td)}const td=document.createElement('td');td.style.width='200px';for(let i=0;i<4;i++){const span=document.createElement('span');span.style.cssText='display:inline-block;height:16px;background:'+Object.values(topicColors)[i]+';width:'+(100*p.weights[i])+'%';td.append(span)}tr.append(td);body.append(tr)}}document.querySelector('#chapterSearch').oninput=table;document.querySelector('#sort').onchange=table;table();"""
 page='''<!doctype html><html lang="zh"><meta charset="utf-8"><title>全书词汇主题与篇目比较</title><style>body{font:16px/1.6 system-ui;background:#faf9f5;color:#25333d;margin:24px}section{background:white;padding:16px;border:1px solid #ddd}#cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:12px}svg{width:100%;max-height:75vh;background:white}label{margin-right:15px}input,select{padding:8px;margin:6px}#tip{white-space:pre-line;min-height:95px}table{border-collapse:collapse;width:100%;font-size:14px}td,th{border-bottom:1px solid #ddd;padding:7px}th{position:sticky;top:0;background:#faf9f5}.scroll{overflow:auto;max-height:700px}</style><h1>全书词汇：四主题与篇目比较</h1>'''
 page+=f'<p>{len(chapters)}篇，{len(freq)}种词，{sum(freq.values())}词次。使用地点与空间词合并词表，排除标点及明示停用词；保留单字、低频词和短篇。既有分词与标注未修改。</p><div id="cards">'+cards+'</div>'
 page+='<h2>篇目主题图</h2><p>每点一篇。位置来自四主题概率的t-SNE投影；只宜比较局部邻近，不能把群间距离当作差异尺度。</p><select id="mode"><option value="topics">四主题分组</option><option value="events">异事类型对照</option></select><input id="search" placeholder="搜索图中篇名"><div id="legend"></div><svg id="plot" viewBox="0 0 1100 720"></svg><p id="tip"></p><h2>逐篇对比</h2><input id="chapterSearch" placeholder="筛选篇名"><select id="sort"><option value="id">按篇目顺序</option>'+''.join(f'<option value="{i}">按主题{i+1}概率降序</option>'for i in range(4))+'</select><div class="scroll"><table><thead><tr>'+''.join('<th>'+s+'</th>'for s in ['篇号','篇名','异事类型','有效词次','主题1','主题2','主题3','主题4','组合'])+'</tr></thead><tbody id="rows"></tbody></table></div>'
 page+='<h2>方法与限制</h2><p>200轮 Gibbs 抽样，burn-in 10；初始alpha=10（自动估计），beta=0.01。种子42为展示版本，种子7与123作敏感度检查。前20词匹配后平均Jaccard：'+', '.join(f'{s["seed"]}：{s["mean_top20_jaccard"]:.3f}'for s in stability)+'</p><ul>'+''.join('<li>'+html.escape(s)+'</li>'for s in result['limitations'])+'</ul><details><summary>停用词名单</summary><p>'+html.escape('、'.join(src['stopwords']))+'</p></details><script>'+js+'\n'+tablejs+'</script></html>'
 (ROOT/'reports/地點與空間詞_四主題篇目比較.html').write_text(page,encoding='utf8')
 print(json.dumps({'counts':result['counts'],'stability':stability,'top_words':[[w['word']for w in t['top_words'][:10]]for t in topics]},ensure_ascii=False),flush=True)
if __name__=='__main__':main()
