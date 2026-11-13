"""Five-topic LDA following Tutorial 4; no manual word groups enter training."""
import pathlib, sys, json, hashlib, collections, itertools, platform
ROOT=pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'.network-runtime/topic-libs'))
import matplotlib
matplotlib.use('Agg')
import numpy as np
from qhchina.analytics.topicmodels import LDAGibbsSampler
from sklearn.metrics import adjusted_rand_score, normalized_mutual_info_score
from importlib.metadata import version

PARAMS=dict(n_topics=5,iterations=200,burnin=10,min_word_length=1,max_vocab_size=50000,
            min_word_count=1,alpha=None,beta=None,estimate_alpha=1,log_interval=None)

def prepare(source,comparison,audited=True):
    drops={}
    if audited:
        for w,key in [('室','room_context_audit'),('穴','hole_context_audit')]:
            for title in comparison[key]['excluded']:drops.setdefault(title,set()).add(w)
    chapters=[];docs=[];empty=[]
    for c in source['chapters']:
        allowed=set(c['spaces'])-drops.get(c['title'],set())
        tokens=[w for u in c['evidence'] for w in u['tokens'] if w in allowed]
        if tokens:chapters.append(c);docs.append(tokens)
        else:empty.append({'id':c['id'],'title':c['title']})
    return chapters,docs,empty

def fit(docs,seed):
    m=LDAGibbsSampler(**PARAMS,random_state=seed)
    m.fit(docs)
    assert len(m.vocabulary)==len(set(w for d in docs for w in d))
    assert m.theta.shape==(len(docs),5)
    assert np.allclose(m.phi.sum(axis=1),1) and np.allclose(m.theta.sum(axis=1),1)
    return m

def align(reference,other):
    assert reference.vocabulary==other.vocabulary
    similarity=np.sqrt(reference.phi)@np.sqrt(other.phi).T
    permutation=max(itertools.permutations(range(5)),key=lambda p:sum(similarity[i,p[i]] for i in range(5)))
    detail=[]
    for i,j in enumerate(permutation):
        a={reference.id_to_word[k] for k in np.argsort(-reference.phi[i])[:20]}
        b={other.id_to_word[k] for k in np.argsort(-other.phi[j])[:20]}
        detail.append({'reference_topic':i+1,'matched_topic':j+1,'hellinger_affinity':float(similarity[i,j]),'top20_jaccard':len(a&b)/len(a|b)})
    return list(permutation),detail

def main():
    package_hash=hashlib.sha256((ROOT/'data-package.json').read_bytes()).hexdigest()
    source=json.loads((ROOT/'.network-runtime/spatial-distinctiveness-source.json').read_text(encoding='utf-8'))
    old=json.loads((ROOT/'reports/spatial-distinctiveness-results.json').read_text(encoding='utf-8'))
    assert source['source_sha256']==old['source_sha256']==package_hash,'Rebuild exact-token source first'
    chapters,docs,empty=prepare(source,old)
    freq=collections.Counter(w for d in docs for w in d)
    counts=collections.Counter(w for d in docs for w in set(d))
    models={seed:fit(docs,seed) for seed in [42,7,123]}
    ref=models[42];prior=ref.n_t/ref.n_t.sum()
    repeated=fit(docs,42)
    assert np.array_equal(ref.n_wt,repeated.n_wt),'Fixed-seed sampler is not reproducible'
    posterior=ref.phi*prior[:,None];posterior/=posterior.sum(axis=0,keepdims=True)
    hard=posterior.argmax(axis=0)
    stability=[]
    for seed in [7,123]:
        permutation,detail=align(ref,models[seed])
        other_prior=models[seed].n_t/models[seed].n_t.sum()
        other_posterior=models[seed].phi*other_prior[:,None]
        other_hard=other_posterior[np.array(permutation)].argmax(axis=0)
        stability.append({'seed':seed,'topics':detail,'mean_top20_jaccard':float(np.mean([x['top20_jaccard'] for x in detail])),
                          'vocabulary_hard_label_agreement':float((hard==other_hard).mean())})
    words=[]
    for i,w in enumerate(ref.vocabulary):
        evidence=[]
        for c in chapters:
            if w in c['spaces']:
                quote=next((u['text'] for u in c['evidence'] if w in u['tokens']),None)
                if quote:evidence.append({'id':c['id'],'title':c['title'],'quote':quote})
            if len(evidence)==3:break
        words.append({'word':w,'frequency':freq[w],'chapter_count':counts[w],'dominant_topic':int(hard[i])+1,
                      'topic_probabilities':posterior[:,i].tolist(),'manual_groups':[g for g,ws in old['word_groups'].items() if w in ws],
                      'examples':evidence})
    topics=[]
    for t in range(5):
        top_indices=np.argsort(-ref.phi[t])[:20]
        topics.append({'id':t+1,'token_assignment_share':float(prior[t]),
                       'top_words':[{'word':ref.id_to_word[i],'probability':float(ref.phi[t,i])} for i in top_indices],
                       'representative_chapters':[{'id':chapters[i]['id'],'title':chapters[i]['title'],'topic_weight':float(ref.theta[i,t]),'spatial_token_count':len(docs[i])} for i in np.argsort(-ref.theta[:,t])[:8]]})
    comparisons=[];gold=[];pred=[]
    for gi,(group,ws) in enumerate(old['word_groups'].items()):
        present=[w for w in ws if w in ref.word_to_id]
        distribution=np.zeros(5)
        for w in present:
            wi=ref.word_to_id[w];distribution+=posterior[:,wi]*freq[w]
            gold.append(gi);pred.append(int(hard[wi]))
        distribution/=sum(freq[w] for w in present)
        comparisons.append({'manual_group':group,'present_words':present,'absent_words':[w for w in ws if w not in present],
                             'frequency_weighted_topic_share':distribution.tolist(),
                             'words_by_dominant_topic':{str(t+1):[w for w in present if hard[ref.word_to_id[w]]==t] for t in range(5)}})
    # Sensitivity to the earlier 室/穴 exclusions, without using the manual groups.
    _,raw_docs,raw_empty=prepare(source,old,audited=False)
    raw_model=fit(raw_docs,42)
    shared=sorted(set(ref.vocabulary)&set(raw_model.vocabulary))
    a=np.array([ref.phi[:,ref.word_to_id[w]] for w in shared]).T
    b=np.array([raw_model.phi[:,raw_model.word_to_id[w]] for w in shared]).T
    a/=a.sum(axis=1,keepdims=True);b/=b.sum(axis=1,keepdims=True)
    sim=np.sqrt(a)@np.sqrt(b).T
    perm=max(itertools.permutations(range(5)),key=lambda p:sum(sim[i,p[i]] for i in range(5)))
    raw_sensitivity={'raw_documents':len(raw_docs),'raw_tokens':sum(map(len,raw_docs)),'shared_vocabulary':len(shared),
                     'matched_hellinger_affinity':[float(sim[i,perm[i]]) for i in range(5)]}
    event_comparison=[]
    for event in ['人','鬼','狐','妖','神']:
        mask=np.array([event in c['events'] for c in chapters])
        event_comparison.append({'event':event,'documents':int(mask.sum()),'other_documents':int((~mask).sum()),
                                 'mean_topic_weights':ref.theta[mask].mean(axis=0).tolist(),
                                 'other_mean_topic_weights':ref.theta[~mask].mean(axis=0).tolist()})
    result={'source_sha256':package_hash,'method':'qhchina LDAGibbsSampler, chapter documents of exact annotated spatial tokens',
        'versions':{k:version(k) for k in ['qhchina','numpy','scipy','scikit-learn']},'python':platform.python_version(),
        'parameters':PARAMS,'reference_seed':42,'seeds':[42,7,123],
        'fitted_parameters':{str(seed):{'alpha':np.atleast_1d(m.alpha).tolist(),'beta':float(m.beta)} for seed,m in models.items()},
        'input':{'total_chapters':len(source['chapters']),'nonempty_documents':len(docs),'empty_documents':empty,
                 'spatial_token_occurrences':sum(map(len,docs)),'vocabulary_size':len(freq),
                 'one_token_documents':sum(len(d)==1 for d in docs),'documents_under_10_spatial_tokens':sum(len(d)<10 for d in docs),
                 'unmatched_chapter_terms_excluded':old['unmatched_chapter_terms']},
        'topics':topics,'word_classification':words,'chapter_topics':[{'id':c['id'],'title':c['title'],'token_count':len(docs[i]),'weights':ref.theta[i].tolist()} for i,c in enumerate(chapters)],
        'manual_comparison':comparisons,'manual_comparison_metrics':{'word_memberships_compared':len(gold),'adjusted_rand_index':float(adjusted_rand_score(gold,pred)),
            'normalized_mutual_information':float(normalized_mutual_info_score(gold,pred))},
        'seed_stability':stability,'unfiltered_sensitivity':raw_sensitivity,
        'event_topic_comparison':event_comparison,
        'limitations':['K=5 is requested, not selected as optimal. Topics are probabilistic and need interpretation.',
                       'Training is restricted to current annotated exact-token spatial vocabulary; not the complete semantic spatial inventory.',
                       'Short sparse chapter documents and annotation omissions can destabilize topics.',
                       'Manual groups and event labels are not used for training. Manual groups enter post-hoc comparison only.',
                       'Primary input excludes previously audited non-spatial 室/穴 uses; separate raw-input sensitivity is provided.',
                       'Per-word dominant topics are a summary of soft topic probabilities, not exclusive semantic definitions.']}
    out=ROOT/'reports/spatial-topics-five-results.json'
    out.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    write_report(result)
    print(json.dumps({'documents':len(docs),'vocabulary':len(freq),'tokens':sum(map(len,docs)),'fixed_seed_repeat_test':'passed','metrics':result['manual_comparison_metrics']},ensure_ascii=False))

def write_report(result):
    import matplotlib.pyplot as plt
    from matplotlib.font_manager import FontProperties
    font=FontProperties(fname='C:/Windows/Fonts/msyh.ttc')
    matrix=np.array([r['frequency_weighted_topic_share'] for r in result['manual_comparison']])*100
    fig,ax=plt.subplots(figsize=(10,6));im=ax.imshow(matrix,cmap='YlGnBu',vmin=0,vmax=100)
    ax.set_xticks(range(5),[f'模型主题{i+1}' for i in range(5)],fontproperties=font,fontsize=11)
    ax.set_yticks(range(5),[r['manual_group'] for r in result['manual_comparison']],fontproperties=font,fontsize=11)
    for i,j in itertools.product(range(5),repeat=2):ax.text(j,i,f'{matrix[i,j]:.1f}%',ha='center',va='center',color='white' if matrix[i,j]>55 else '#182f41',fontsize=12)
    ax.set_title('人工词群在五个LDA主题中的分布',fontproperties=font,fontsize=17,pad=20)
    fig.colorbar(im,ax=ax,label='%')
    fig.text(.12,.035,'按人工词群成员在语料中的词频加权。每行合计100%；不是篇目命中率。\n主题编号只对应种子42的本次模型；没有预先规定主题含义。',fontproperties=font,fontsize=10)
    fig.subplots_adjust(left=.19,right=.94,top=.86,bottom=.18)
    fig.savefig(ROOT/'reports/空間詞五主題_人工分組對照.png',dpi=160)
    plt.close(fig)
    lines=['# 空間詞五主題：模型分類完整名單','',
           f"資料：{result['input']['nonempty_documents']}篇非空文檔，{result['input']['spatial_token_occurrences']}個空間詞次，{result['input']['vocabulary_size']}種詞。",'',
           '每篇為一份文檔，只使用既有空間標注與完整分詞對齊後的詞。沿用前輪室、穴的語義排除；不套用五組人工詞表。',
           '依附件使用 qhchina LDAGibbsSampler：五主題、200輪、burn-in 10、主種子42；另以7、123檢查穩定性。單字保留，不刪短篇。',
           '主題為混合概率；以下主題歸屬只是該詞最高概率的一項，不代表唯一詞義。五主題是本次指定數量，未證明最優。',
           '高概率詞使用模型P(詞|主題)排序；完整名單用P(主題|詞)分配，以P(詞|主題)乘模型抽樣詞位占比後歸一化估算。兩種概率的分母不同，不能混為一談。',
           '方法參照附件與[官方說明](https://www.qhchina.org/docs/topic_modeling/ldagibbssampler/)。alpha初值50/5=10，beta=1/5=0.2；alpha沿用套件預設逐輪估計，最終值記錄於JSON。','',
           '## 模型主題','']
    for t in result['topics']:
        lines.extend([f"### 主題{t['id']}",'',
                      '高概率詞：'+'、'.join(w['word'] for w in t['top_words']),
                      '', '代表篇目：'+'、'.join(c['title'] for c in t['representative_chapters']),''])
    lines.extend(['## 與原人工詞群對照','','數值為人工詞群成員的詞頻加權主題占比，不是前輪篇目命中率。','',
                  '| 人工詞群 | 主題1 | 主題2 | 主題3 | 主題4 | 主題5 |','|---|---:|---:|---:|---:|---:|'])
    for r in result['manual_comparison']:lines.append('|'+r['manual_group']+'|'+'|'.join(f'{x*100:.1f}%' for x in r['frequency_weighted_topic_share'])+'|')
    metrics=result['manual_comparison_metrics']
    lines.extend(['',f"人工詞表內可比較的{metrics['word_memberships_compared']}項詞成員：ARI={metrics['adjusted_rand_index']:.3f}；NMI={metrics['normalized_mutual_information']:.3f}。這些數字只比較分類吻合度，不是顯著性檢驗。",'',
                  '## 如何理解本次結果','',
                  '結果不是原人工五組的重現。房室詞與大部分門戶詞共同進入主題1，並與市、田、途中等日常詞混合；主題1占抽樣詞位的一半以上，不能把它直接命名為純粹的「私人空間」。',
                  '舟水詞在主題4較集中，但該主題也包含樓、樓上、樓下等詞。山穴詞拆開：洞、山洞偏主題3，山中、山、穴的整體主題權重則另有分布。冥府稱謂也沒有形成統一、獨立的一個主題。',
                  '原詞群的語義相似性，與模型依篇內共現得到的組織不是同一回事。房室與門戶相近，可能反映它們共同構成場景；這本身不能證明跨越邊界的情節或作者意圖。',
                  f"輸入中有{result['input']['documents_under_10_spatial_tokens']}篇不足10個有效空間詞次，另有{len(result['input']['empty_documents'])}篇沒有可用詞。這主要是現有標注及分詞對齊後的稀疏性，不能解釋成這些篇目原文沒有空間描寫。",
                  '本次指定五主題並不代表全書恰有五種自然空間類型。三個種子的差異如下；目前不適合自動覆蓋原詞類、三界歸屬或人工修訂。','',
                  '## 種子穩定性','','使用完整詞概率分布的Hellinger親和度配對主題，再比較各主題前20詞的Jaccard重合度。0為不重合，1為完全重合；未只挑選最像人工詞表的種子。',''])
    for s in result['seed_stability']:lines.append(f"- 種子{s['seed']}：五組前20詞平均Jaccard={s['mean_top20_jaccard']:.3f}；全詞表最高概率主題一致率={s['vocabulary_hard_label_agreement']:.1%}。")
    lines.extend(['','## 各異事類型的模型主題分布','','每篇等權，平均其主題概率；類型可以重疊。分母僅包括有可用空間詞的443篇。這不是原人工詞群的命中率，也未做顯著性檢驗。','',
                  '| 類型 | 有效篇數 | 主題1 | 主題2 | 主題3 | 主題4 | 主題5 |','|---|---:|---:|---:|---:|---:|---:|'])
    for r in result['event_topic_comparison']:lines.append('|'+r['event']+'|'+str(r['documents'])+'|'+'|'.join(f'{x*100:.1f}%' for x in r['mean_topic_weights'])+'|')
    lines.extend(['','## 完整詞項名單','','按最高概率主題分列；括號依次為最高主題概率、空間詞次、篇數。完整五主題概率及原文例句見同目錄JSON。',''])
    for t in range(1,6):
        lines.extend([f'### 主題{t}詞項',''])
        for w in sorted([w for w in result['word_classification'] if w['dominant_topic']==t],key=lambda w:(-w['frequency'],w['word'])):
            lines.append(f"- {w['word']}（{max(w['topic_probabilities']):.1%}；{w['frequency']}次；{w['chapter_count']}篇）")
        lines.append('')
    lines.extend(['## 未納入範圍','','無有效空間詞的篇目：'+'、'.join(c['title'] for c in result['input']['empty_documents']),
                  '',f"另有{result['input']['unmatched_chapter_terms_excluded']}項原標注未對齊完整分詞，未納入訓練。不能把未納入理解為原文沒有空間。",'',
                  '只有空間詞，不含其他動詞、人物與事件，模型不能直接回答空間敘事功能。分類差異也不表示人工語義分類毫無價值；LDA發現的是共現模式。','',
                  '## 重算','',
                  '隔離依賴：`python -m pip install --target .network-runtime/topic-libs qhchina==0.2.7`。其他實際版本見JSON。',
                  '依次執行 `node automation/analyze-spatial-distinctiveness.js`、`python -X utf8 automation/model-spatial-topics.py`、`node --test automation/test-spatial-topics.js`。',
                  '固定種子42另訓練一次，斷言兩次詞—主題計數完全一致；並測試完整詞表計數、概率歸一化、人工詞表對照計算與資料包指紋。未修改原人工修訂或發布網站。'])
    (ROOT/'reports/空間詞五主題_分類名單.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')

if __name__=='__main__':main()
