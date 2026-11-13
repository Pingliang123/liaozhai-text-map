"""Literal Tutorial 4 long-line/all-vocabulary experiment, independent of production data."""
import pathlib,sys,json,re,hashlib,argparse,logging,functools,collections,runpy,os,subprocess,gzip
if os.environ.get('PYTHONHASHSEED')!='42':
    raise SystemExit(subprocess.call([sys.executable,*sys.argv],env={**os.environ,'PYTHONHASHSEED':'42','PYTHONUTF8':'1'}))
ROOT=pathlib.Path(__file__).resolve().parents[1]
base=runpy.run_path(str(ROOT/'automation/model-spatial-topics.py'));np=base['np']
import jieba
from qhchina import load_stopwords
import qhchina.analytics.topicmodels as topicmodels
from tqdm.auto import tqdm
from importlib.metadata import version
topicmodels.tqdm=functools.partial(tqdm,disable=True)
logging.getLogger('qhchina').setLevel(logging.WARNING)
PARAMS=dict(n_topics=5,iterations=200,burnin=10,log_interval=5,random_state=42,min_word_length=2,max_vocab_size=50000)
CHINESE=re.compile(r'^[\u4e00-\u9fff]+$');FOOTNOTE=re.compile(r'^〔.*$')

def prepare(text,stopwords,markers):
    lines=text.split('\n');selected=[];clean=[];docs=[];excluded=[];pos=-1
    for index,line in enumerate(lines):
        number=index+1
        while pos+1<len(markers) and markers[pos+1]['line']<=number:pos+=1
        chapter=markers[pos] if pos>=0 else None
        if len(line)<=150 or FOOTNOTE.match(line):continue
        selected.append(number)
        tokens=[w for w in jieba.lcut(line) if w not in stopwords and CHINESE.match(w)]
        meta={'line':number,'chapter_id':chapter['id'] if chapter else None,'chapter':chapter['title'] if chapter else None,
              'source_characters':len(line),'clean_token_count':len(tokens),'excerpt':line.strip()[:220],
              'text_sha256':hashlib.sha256(line.encode('utf-8')).hexdigest(),
              'editorial_marker':bool(re.match(r'^\s*〈〔',line)),'author_comment':bool(re.match(r'^\s*異史氏',line))}
        if len(tokens)<=10:
            excluded.append({**meta,'reason':'10 or fewer tokens after stopword/Chinese filtering'});continue
        # qhchina's min_word_length=2 applies only after the notebook's >10-word check.
        if not any(len(w)>=2 for w in tokens):
            excluded.append({**meta,'reason':'all words removed by model min_word_length=2'});continue
        clean.append(meta);docs.append(tokens)
    return lines,selected,clean,docs,excluded

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--text',required=True);args=parser.parse_args()
    path=pathlib.Path(args.text);raw=path.read_bytes();text=path.read_text(encoding='utf-8-sig')
    info=json.loads((ROOT/'.network-runtime/tutorial-topic-chapter-markers.json').read_text(encoding='utf-8'))
    assert info['raw_sha256']==hashlib.sha256(raw).hexdigest()
    assert info['package_sha256']==hashlib.sha256((ROOT/'data-package.json').read_bytes()).hexdigest()
    stopwords=load_stopwords('zh_sim')
    jieba.setLogLevel(logging.WARNING)
    lines,selected,metadata,docs,excluded=prepare(text,stopwords,info['markers'])
    candidate_freq=collections.Counter(w for d in docs for w in d if len(w)>=2)
    models={}
    for seed in [42,7,123]:
        params={**PARAMS,'random_state':seed,'log_interval':None}
        # log_interval only prints diagnostics; sampling/hyperparameter estimation unchanged.
        m=topicmodels.LDAGibbsSampler(**params);m.fit(docs);models[seed]=m
        if seed==42:freq=collections.Counter({w:candidate_freq[w] for w in m.vocabulary})
        assert set(m.vocabulary)==set(freq)
        assert m.theta.shape==(len(docs),5)
        assert np.allclose(m.theta.sum(axis=1),1) and np.allclose(m.phi.sum(axis=1),1)
        print(f'Completed long-line model seed {seed}: {len(docs)} documents / {len(freq)} word types',flush=True)
    ref=models[42];posterior=ref.phi*(ref.n_t/ref.n_t.sum())[:,None];posterior/=posterior.sum(axis=0,keepdims=True)
    topics=[]
    for t,top in enumerate(ref.get_topics(20)):
        topics.append({'id':t+1,'token_assignment_share':float(ref.n_t[t]/ref.n_t.sum()),'top_words':[{'word':w,'probability':float(p)} for w,p in top],
                       'representative_lines':[{**metadata[i],'topic_weight':float(ref.theta[i,t])} for i in np.argsort(-ref.theta[:,t])[:8]]})
    stability=[]
    for seed in [7,123]:
        permutation,detail=base['align'](ref,models[seed])
        stability.append({'seed':seed,'topics':detail,'mean_top20_jaccard':float(np.mean([r['top20_jaccard'] for r in detail]))})
    included_ids={m['chapter_id'] for m in metadata if m['chapter_id'] is not None}
    word_rows=[{'word':w,'frequency':freq[w],'dominant_topic':int(posterior[:,i].argmax())+1,'topic_probabilities':posterior[:,i].tolist()} for i,w in enumerate(ref.vocabulary)]
    result={'raw_source_sha256':info['raw_sha256'],'package_sha256':info['package_sha256'],'source_filename':path.name,
            'input_policy':'Raw traditional Chinese TXT; original newline documents; jieba default dictionary; zh_sim stopwords; no manual dictionary or revisions.',
            'parameters':PARAMS,'executed_log_interval':None,'seeds':[42,7,123],'python_hash_seed':42,
            'fitted_alpha':{str(seed):m.alpha.tolist() for seed,m in models.items()},'fitted_beta':float(ref.beta),
            'versions':{k:version(k) for k in ['qhchina','jieba','numpy','scipy']},
            'counts':{'source_characters':len(text),'raw_lines':len(lines),'long_lines_selected':len(selected),'selected_line_characters':sum(len(lines[i-1]) for i in selected),
                      'training_documents':len(docs),'training_line_characters':sum(m['source_characters'] for m in metadata),
                      'clean_tokens_before_model_length_filter':sum(map(len,docs)),'training_tokens':sum(freq.values()),'vocabulary':len(freq),
                      'vocabulary_before_cap':len(candidate_freq),'word_types_removed_by_cap':len(candidate_freq)-len(freq),
                      'covered_chapters':len(included_ids),'total_chapters':len(info['chapters']),
                      'editorial_marked_training_documents':sum(m['editorial_marker'] for m in metadata),'author_comment_training_documents':sum(m['author_comment'] for m in metadata)},
            'missing_chapters':[c for c in info['chapters'] if c['id'] not in included_ids],
            'excluded_after_line_filter':excluded,'documents':[{**meta,'model_token_count':sum(w in freq for w in d),'topic_weights':ref.theta[i].tolist()} for i,(meta,d) in enumerate(zip(metadata,docs))],
            'topics':topics,'word_topics_file':'tutorial-long-line-word-topics.json.gz','seed_stability':stability,
            'limitations':['Raw traditional text and zh_sim stopwords are retained to mirror the notebook; this is not a script-matched classical preprocessing pipeline.',
                           'Existing canonical segmentation, dictionaries and manual edits are not used or overwritten.',
                           'Words from all lexical categories enter this model. Topics are content/co-occurrence mixtures, not five spatial categories.',
                           'Raw-file length and newline formatting determine inclusion; short stories can disappear.',
                           'The literal footnote rule does not remove all editorial notes. Retained markers are reported.',
                           'Primary model seed42 is retained; additional seeds are sensitivity checks, not model selection.',
                           'Only excerpts, line numbers and hashes are stored in reports; original full text is not duplicated.']}
    (ROOT/'reports/tutorial-long-line-word-topics.json.gz').write_bytes(gzip.compress(json.dumps({'raw_source_sha256':info['raw_sha256'],'words':word_rows},ensure_ascii=False,separators=(',',':')).encode('utf-8'),mtime=0))
    (ROOT/'reports/tutorial-long-line-five-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    report(result)
    print(json.dumps({'counts':result['counts'],'topic_words':[[w['word'] for w in t['top_words'][:12]] for t in topics],'stability':[{k:v for k,v in s.items() if k!='topics'} for s in stability]},ensure_ascii=False))

def report(r):
    import matplotlib.pyplot as plt
    from matplotlib.font_manager import FontProperties
    font=FontProperties(fname='C:/Windows/Fonts/msyh.ttc')
    fig,axes=plt.subplots(1,5,figsize=(16,6.8))
    for ax,t in zip(axes,r['topics']):
        words=t['top_words'][:10];ys=np.arange(len(words))
        ax.barh(ys,[w['probability']*100 for w in words],color='#447e8c')
        ax.set_yticks(ys,[w['word'] for w in words],fontproperties=font,fontsize=10);ax.invert_yaxis()
        ax.set_title(f"主题{t['id']}",fontproperties=font,fontsize=13)
        ax.set_xlabel('P(word | topic) %',fontsize=9)
    fig.suptitle('按附件长行方法：全词汇五主题',fontproperties=font,fontsize=20)
    c=r['counts']
    fig.text(.04,.035,f"原TXT繁体＋jieba＋zh_sim停用词；仅保留>150字符的行及>10词的文档，模型去除单字词。\n{c['training_documents']}行文档，覆盖{c['covered_chapters']}/{c['total_chapters']}篇；主种子42。主题编号不对应先前的空间词主题。",fontproperties=font,fontsize=10)
    fig.tight_layout(rect=[0,.12,1,.92]);fig.savefig(ROOT/'reports/附件長行法_五主題.png',dpi=160);plt.close(fig)
    lines=['# 按Tutorial 4長行法：全詞彙五主題','',
           '這是忠實保留附件主要流程的獨立對照，不是替換網站現有分詞或空間詞分類。',
           '輸入為使用者原始《聊齋志異》TXT繁體文本，保留原始換行；不拼接句子製造長段、不轉簡體、不加入人工字典。','',
           '## 方法與篩選','',
           '1. 每行超過150字符，且不匹配`^〔.*$`才保留。',
           '2. 使用jieba預設分詞、qhchina的zh_sim停用詞，只保留基本漢字區的純中文詞。',
           '3. 清洗後須超過10詞。模型再設min_word_length=2，排除單字詞。',
           '4. qhchina LDAGibbsSampler，五主題、200輪、burn-in 10、主種子42，alpha與beta使用套件預設並自動估計alpha。',
           '5. 附件log_interval=5只涉及診斷輸出；本次關閉定期輸出，抽樣與逐輪alpha估計不變。另以種子7、123作敏感性檢查。','',
           '| 指標 | 數量 |','|---|---:|']
    for k,label in [('raw_lines','原始行數'),('long_lines_selected','通過長行篩選'),('training_documents','最終訓練文檔'),('training_tokens','模型實際詞次'),('vocabulary_before_cap','上限篩選前詞種'),('vocabulary','模型實際詞種'),('word_types_removed_by_cap','因五萬詞上限排除的詞種'),('covered_chapters','至少一行進入模型的篇目'),('editorial_marked_training_documents','含編者評語標記的保留行'),('author_comment_training_documents','異史氏評語保留行')]:lines.append(f'|{label}|{c[k]}|')
    lines.extend(['',f"訓練行字符占原TXT字符的{c['training_line_characters']/c['source_characters']:.1%}；這是字符保留比例，不是敘事內容覆蓋率。",'',
                  '## 主題與代表原文',''])
    for t in r['topics']:
        lines.extend([f"### 主題{t['id']}",'','前20詞：'+'、'.join(w['word'] for w in t['top_words']),''])
        for d in t['representative_lines'][:3]:lines.extend([f"- 《{d['chapter']}》原TXT第{d['line']}行；主題概率{d['topic_weight']:.1%}：",'','> '+d['excerpt'],''])
    lines.extend(['## 這次結果能說明甚麼','',
                  '本次前列詞包括女郎、女子、娘子、兄弟、夫妻、公子、夫人、道士、城隍、冥王、異史氏等，也包括不能、不知、一日等通用詞。模型並未分出五種空間類型，而是人物稱謂、題材、敘述套語與評議語彙的混合。',
                  '這可以作為全詞彙內容主題的探索，不能直接與原人工五組空間詞做分類正確率比較，也不能把主題編號與先前模型一一對應。',
                  '這一輪同時改了文檔單位與詞彙範圍。若要判斷長行是否優於篇目，後續必須固定分詞、詞表與清洗，只改文檔單位；本輪尚未做此單因素比較。','',
                  '## 穩定性',''])
    for s in r['seed_stability']:lines.append(f"- 種子{s['seed']}與42配對後，五主題前20詞平均Jaccard：{s['mean_top20_jaccard']:.3f}。")
    lines.extend(['','## 與先前空間詞模型的差別','',
                  '先前以篇目為文檔，且只使用已標注並對齊的空間詞；本次改變了文檔單位、分詞、停用詞、單字篩選和詞彙範圍。結果不同，不能單獨歸因於改用長行。',
                  '本次繁體原文與現代簡體停用詞未匹配，是照搬附件的限制；其中低信息詞或分詞錯誤仍可能進入主題。這些主題不能直接命名為空間類別。',
                  '短篇或短段落大量被排除；另有少量編者評語未被附件正則攔截。這些情況均已記錄，不能聲稱模型分析了每篇全文。','',
                  '## 完全未納入的篇目','', '、'.join(c['title'] for c in r['missing_chapters']),'',
                  '## 重算','',
                  '先執行 `node automation/export-tutorial-markers.js <原始TXT路徑>`，再執行 `python -X utf8 automation/model-tutorial-long-lines.py --text <原始TXT路徑>`。隔離環境另需jieba==0.42.1。',
                  '摘要、各行主題概率、原文行號與來源指紋見 tutorial-long-line-five-results.json；完整五萬詞及逐詞主題概率存於 tutorial-long-line-word-topics.json.gz，避免重複儲存全文。',
                  'PYTHONHASHSEED固定42，避免五萬詞上限截斷時同頻詞因集合遍歷次序而變動。未改動網站與人工修訂。'])
    (ROOT/'reports/附件長行法_五主題報告.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')

if __name__=='__main__':main()
