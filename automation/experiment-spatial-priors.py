"""Controlled five-topic alpha/beta sensitivity; never selects by manual agreement."""
import json, hashlib, collections, pathlib, sys, logging, runpy
ROOT=pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parent))
base=runpy.run_path(str(ROOT/'automation/model-spatial-topics.py'))
np=base['np']
from sklearn.metrics import adjusted_rand_score, normalized_mutual_info_score

SETTINGS=[
 ('baseline','原設定：alpha自動估計',10.,.2,1),
 ('alpha_low_auto','降低alpha初值，繼續估計',.1,.2,1),
 ('alpha_high_fixed','固定alpha=10的對照',10.,.2,0),
 ('alpha_low_fixed','固定低alpha',.1,.2,0),
 ('beta_005','降低beta至0.05',10.,.05,1),
 ('beta_001','降低beta至0.01',10.,.01,1),
 ('both_low_fixed','低alpha固定＋低beta',.1,.05,0),
]
SEEDS=[42,7,123]

def word_posterior(m):
    p=m.phi*(m.n_t/m.n_t.sum())[:,None]
    return p/p.sum(axis=0,keepdims=True)

def manual_metrics(m,old):
    hard=word_posterior(m).argmax(axis=0);gold=[];pred=[]
    for i,ws in enumerate(old['word_groups'].values()):
        for w in ws:
            if w in m.word_to_id:gold.append(i);pred.append(int(hard[m.word_to_id[w]]))
    return {'memberships':len(gold),'ARI':float(adjusted_rand_score(gold,pred)),
            'NMI':float(normalized_mutual_info_score(gold,pred))}

def main():
    source=json.loads((ROOT/'.network-runtime/spatial-distinctiveness-source.json').read_text(encoding='utf-8'))
    old=json.loads((ROOT/'reports/spatial-distinctiveness-results.json').read_text(encoding='utf-8'))
    previous=json.loads((ROOT/'reports/spatial-topics-five-results.json').read_text(encoding='utf-8'))
    fingerprint=hashlib.sha256((ROOT/'data-package.json').read_bytes()).hexdigest()
    assert fingerprint==source['source_sha256']==old['source_sha256']==previous['source_sha256']
    chapters,docs,empty=base['prepare'](source,old)
    freq=collections.Counter(w for d in docs for w in d)
    experiments=[]
    for key,label,alpha,beta,estimate in SETTINGS:
        base['PARAMS'].update(n_topics=5,alpha=alpha,beta=beta,estimate_alpha=estimate)
        models={seed:base['fit'](docs,seed) for seed in SEEDS}
        ref=models[42];prob=word_posterior(ref)
        stability=[]
        for seed in [7,123]:
            permutation,detail=base['align'](ref,models[seed])
            hard=word_posterior(models[seed])[np.array(permutation)].argmax(axis=0)
            stability.append({'seed':seed,'top20_jaccard':float(np.mean([r['top20_jaccard'] for r in detail])),
                              'hard_agreement':float((prob.argmax(axis=0)==hard).mean()),'topic_details':detail})
        runs=[{'seed':seed,'final_alpha':m.alpha.tolist(),'manual_agreement':manual_metrics(m,old),
               'mean_document_normalized_entropy':float(np.mean(-np.sum(m.theta*np.log(m.theta),axis=1)/np.log(5))),
               'top_words':[[{'word':w,'probability':float(p)} for w,p in topic] for topic in m.get_topics(20)]}
              for seed,m in models.items()]
        group_distribution=[]
        for group,ws in old['word_groups'].items():
            present=[w for w in ws if w in ref.word_to_id]
            weights=sum((prob[:,ref.word_to_id[w]]*freq[w] for w in present),np.zeros(5))
            weights/=weights.sum()
            group_distribution.append({'group':group,'topic_shares':weights.tolist()})
        experiments.append({'id':key,'label':label,'alpha_initial_per_topic':alpha,'beta':beta,'estimate_alpha':estimate,
            'runs':runs,'stability':stability,'mean_top20_jaccard':float(np.mean([s['top20_jaccard'] for s in stability])),
            'mean_hard_agreement':float(np.mean([s['hard_agreement'] for s in stability])),
            'mean_manual_ARI':float(np.mean([r['manual_agreement']['ARI'] for r in runs])),
            'mean_manual_NMI':float(np.mean([r['manual_agreement']['NMI'] for r in runs])),
            'reference_group_distribution':group_distribution,
            'reference_word_topics':[{'word':w,'frequency':freq[w],'topic_probabilities':prob[:,i].tolist()} for i,w in enumerate(ref.vocabulary)]})
        if key=='baseline':
            assert [[w['word'] for w in t] for t in runs[0]['top_words']]==[[w['word'] for w in t['top_words']] for t in previous['topics']]
            for old_word,new_word in zip(previous['word_classification'],experiments[-1]['reference_word_topics']):
                assert old_word['word']==new_word['word'] and np.allclose(old_word['topic_probabilities'],new_word['topic_probabilities'])
        print(f"Completed {key}",flush=True)
    result={'source_sha256':fingerprint,'model':'qhchina LDAGibbsSampler','topics':5,'iterations':200,'burnin':10,'seeds':SEEDS,
            'versions':{k:base['version'](k) for k in ['qhchina','numpy','scipy','scikit-learn']},
            'input':{'documents':len(docs),'empty_documents':len(empty),'vocabulary':len(freq),'tokens':sum(map(len,docs))},
            'experiments':experiments,'baseline_reproduced':True,
            'limitations':['Exploratory sensitivity analysis; no model selected by manual agreement.',
                           'ARI/NMI compare only 40 available manual-group members, not complete semantic correctness.',
                           'Stability uses two reference-to-seed alignments, not every possible pair.',
                           'All settings retain 200 iterations. No convergence or held-out generalization claim is made.',
                           'Topic numbers are local to each run. Do not compare unaligned topic IDs across settings.']}
    (ROOT/'reports/spatial-prior-sensitivity-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    report(result)
    print(json.dumps([{k:e[k] for k in ['id','mean_top20_jaccard','mean_hard_agreement','mean_manual_ARI','mean_manual_NMI']} for e in experiments],ensure_ascii=False))

def report(r):
    import matplotlib.pyplot as plt
    from matplotlib.font_manager import FontProperties
    font=FontProperties(fname='C:/Windows/Fonts/msyh.ttc')
    es=r['experiments'];x=np.arange(len(es))
    fig,axes=plt.subplots(1,2,figsize=(13,6))
    labels=[e['label'] for e in es]
    for ax,key,title,color in zip(axes,['mean_top20_jaccard','mean_manual_ARI'],['跨种子代表词稳定性（平均Jaccard）','与人工词表吻合度（三种子平均ARI）'],['#397a91','#a46f45']):
        ax.barh(x,[e[key] for e in es],color=color)
        ax.set_yticks(x,labels,fontproperties=font,fontsize=9);ax.invert_yaxis()
        ax.set_title(title,fontproperties=font,fontsize=12)
        for i,e in enumerate(es):ax.text(max(0,e[key])+.006,i,f'{e[key]:.3f}',va='center',fontsize=9)
        ax.set_xlim(min(0,min(e[key] for e in es))-.02,max(e[key] for e in es)+.08)
    fig.suptitle('五主题：降低alpha与beta的敏感性试验',fontproperties=font,fontsize=17)
    fig.text(.1,.025,'相同443篇、1,204种空间词；每项3个种子。吻合度仅比较40个人工词表成员，不等于分类正确率。',fontproperties=font,fontsize=10)
    fig.tight_layout(rect=[0,.055,1,.94]);fig.savefig(ROOT/'reports/五主題_先驗參數比較.png',dpi=160);plt.close(fig)
    lines=['# 五主題：降低alpha與beta的試驗','',
           '相同443篇、1,204種空間詞、3,978詞次；200輪、burn-in 10，種子42、7、123。只改先驗及alpha估計方式，不調整詞表或人工標注。',
           '原設定重跑已復現先前五主題的代表詞及逐詞概率。每次訓練均未使用人工五組或異事類型；人工五組僅用於訓練後比較。','',
           '| 設定 | alpha初值／每主題 | alpha自動估計 | beta | 前20詞穩定性 | 全詞表歸屬一致率 | 人工ARI均值 | 人工NMI均值 |',
           '|---|---:|---|---:|---:|---:|---:|---:|']
    for e in es:lines.append(f"|{e['label']}|{e['alpha_initial_per_topic']}|{'是' if e['estimate_alpha'] else '否'}|{e['beta']}|{e['mean_top20_jaccard']:.3f}|{e['mean_hard_agreement']:.1%}|{e['mean_manual_ARI']:.3f}|{e['mean_manual_NMI']:.3f}|")
    lines.extend(['','## 本輪觀察','',
                  '本輪降低alpha初值但繼續估計，前20詞穩定性由0.355升至0.403；人工ARI均值由0.221升至0.239，NMI卻由0.401略降至0.395。不同指標沒有一致地改善。',
                  '固定alpha=0.1、beta=0.05的人工ARI均值為0.308、穩定性0.387，較原設定接近人工詞表，但還未重現人工五組；其主種子的室、門等日常詞仍跨數個主題。',
                  'beta=0.05時人工吻合度上升、跨種子穩定性下降；降至0.01後人工ARI均值約0.220、穩定性0.264，不能說參數越低越好。',
                  '以上是三個種子的描述性結果，沒有對設定之間的差異作顯著性檢驗，也未以人工吻合度挑選並替換主模型。','',
                  '## 怎樣讀表','',
                  '前20詞穩定性：先按完整主題詞概率配對主題，再算代表詞Jaccard；0為完全不重合，1為完全重合。',
                  '人工ARI／NMI：比較原人工五組中能進入訓練的40項詞成員。這不是整體分類準確率；人工分組也不是已驗證的正確答案。',
                  '三種子平均用於避免只挑種子42中最吻合的一次。主題編號只在各次模型內有效；跨設定不能直接把同號主題當作同一類。',
                  'alpha低初值＋自動估計不等於固定低alpha。固定10的對照用於分辨關閉估計本身的影響；固定低alpha應與此對照比較。',
                  '原始空間詞標注稀疏、漏詞及詞義歧義仍存在。此輪未增加迭代數，不能把參數變化後的任一結果當成已收斂或最優模型。','',
                  '## 各設定代表詞與alpha最終值',''])
    for e in es:
        lines.extend([f"### {e['label']}",''])
        for run in e['runs']:lines.append(f"- 種子{run['seed']}最終alpha："+', '.join(f'{v:.4f}' for v in run['final_alpha']))
        lines.extend(['','以下僅列主種子42，各主題前12詞；其他種子的完整前20詞、逐詞概率與全部比較見JSON。',''])
        for i,ws in enumerate(e['runs'][0]['top_words']):lines.append(f"- 主題{i+1}："+'、'.join(w['word'] for w in ws[:12]))
        lines.append('')
    lines.extend(['## 重算與保留','',
                  '`python -X utf8 automation/experiment-spatial-priors.py`；驗證：`node --test automation/test-spatial-priors.js`。',
                  '完整結果：spatial-prior-sensitivity-results.json。先前三／五／六主題報告均保留，未更換五主題主模型或覆寫網站人工分類。'])
    (ROOT/'reports/五主題_先驗參數比較.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')

if __name__=='__main__':main()
