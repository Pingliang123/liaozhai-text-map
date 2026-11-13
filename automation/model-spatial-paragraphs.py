"""Change document boundaries only: exact canonical spatial tokens, original paragraph lines."""
import pathlib,json,sys,hashlib,collections,difflib,runpy,functools,logging
ROOT=pathlib.Path(__file__).resolve().parents[1]
base=runpy.run_path(str(ROOT/'automation/model-spatial-topics.py'));np=base['np']
import qhchina.analytics.topicmodels as topicmodels
from tqdm.auto import tqdm
topicmodels.tqdm=functools.partial(tqdm,disable=True)
logging.getLogger('qhchina').setLevel(logging.WARNING)

def is_content(ch):
    # Align textual characters, ignoring punctuation/spacing and inline note numbers.
    return ch.isalpha() and not ch.isascii()

def prepare(source,old):
    drops={}
    for word,key in [('室','room_context_audit'),('穴','hole_context_audit')]:
        for title in old[key]['excluded']:drops.setdefault(title,set()).add(word)
    documents=[];audit=[];chapter_docs=[];nonspatial=[]
    for chapter in source['chapters']:
        allowed=set(chapter['spaces'])-drops.get(chapter['title'],set())
        units=chapter['evidence'];a=[];position_to_index={}
        for ui,u in enumerate(units):
            for oi,ch in enumerate(u['original']):
                if is_content(ch):position_to_index[(ui,oi)]=len(a);a.append(ch)
        b=[];raw_index_line={}
        for paragraph in chapter['paragraphs']:
            for ch in paragraph['text']:
                if is_content(ch):raw_index_line[len(b)]=paragraph['line'];b.append(ch)
        matcher=difflib.SequenceMatcher(None,a,b,autojunk=False);mapping={}
        for block in matcher.get_matching_blocks():
            for j in range(block.size):mapping[block.a+j]=raw_index_line[block.b+j]
        bins=collections.defaultdict(list);unitrefs=collections.defaultdict(set);allwords=[];fallback=[]
        for ui,u in enumerate(units):
            unit_lines=[mapping[ix] for (index,_),ix in position_to_index.items() if index==ui and ix in mapping]
            dominant=collections.Counter(unit_lines).most_common(1)
            dominant=dominant[0][0] if dominant else None
            cursor=0
            for token in u['tokens']:
                offset=u['text'].find(token,cursor)
                if offset>=0:cursor=offset+len(token)
                if token not in allowed:continue
                allwords.append(token)
                hits=[]
                if offset>=0 and len(u['text'])==len(u['original']):
                    for oi in range(offset,offset+len(token)):
                        ix=position_to_index.get((ui,oi))
                        if ix in mapping:hits.append(mapping[ix])
                counts=collections.Counter(hits)
                if counts:
                    line=counts.most_common(1)[0][0]
                    if len(counts)>1:fallback.append({'unit':u['unit'],'word':token,'method':'token crosses paragraph boundary; majority matched characters','line':line})
                elif dominant is not None:
                    line=dominant;fallback.append({'unit':u['unit'],'word':token,'method':'unit-majority paragraph fallback','line':line})
                else:
                    line=None;fallback.append({'unit':u['unit'],'word':token,'method':'unmapped source unit; retained in explicit fallback document','line':None})
                bins[line].append(token);unitrefs[line].add(u['unit'])
        if allwords:
            chapter_docs.append({'id':chapter['id'],'title':chapter['title'],'tokens':allwords})
        else:nonspatial.append({'id':chapter['id'],'title':chapter['title']})
        assert collections.Counter(w for xs in bins.values() for w in xs)==collections.Counter(allwords)
        paragraphs={p['line']:p['text'] for p in chapter['paragraphs']}
        for line,words in sorted(bins.items(),key=lambda item:item[0] if item[0] is not None else float('inf')):
            documents.append({'chapter_id':chapter['id'],'title':chapter['title'],'line':line,'tokens':words,'source_units':sorted(unitrefs[line]),
                              'excerpt':paragraphs[line].strip()[:240] if line is not None else '(original paragraph unresolved)',
                              'mapping':'original-line' if line is not None else 'unresolved-unit-document'})
        audit.append({'id':chapter['id'],'title':chapter['title'],'canonical_content_characters':len(a),'matched_characters':len(mapping),
                      'match_ratio':len(mapping)/len(a) if a else None,'spatial_tokens':len(allwords),'fallback_tokens':fallback})
    return documents,chapter_docs,nonspatial,audit

def main():
    source=json.loads((ROOT/'.network-runtime/spatial-paragraph-input.json').read_text(encoding='utf-8'))
    old=json.loads((ROOT/'reports/spatial-distinctiveness-results.json').read_text(encoding='utf-8'))
    previous=json.loads((ROOT/'reports/spatial-topics-five-results.json').read_text(encoding='utf-8'))
    fingerprint=hashlib.sha256((ROOT/'data-package.json').read_bytes()).hexdigest()
    assert source['source_sha256']==old['source_sha256']==previous['source_sha256']==fingerprint
    documents,chapter_docs,empty,audit=prepare(source,old)
    freq=collections.Counter(w for d in documents for w in d['tokens'])
    assert sum(freq.values())==previous['input']['spatial_token_occurrences']
    assert freq==collections.Counter({w['word']:w['frequency'] for w in previous['word_classification']})
    assert {c['id'] for c in chapter_docs}=={c['id'] for c in previous['chapter_topics']}
    assert len(chapter_docs)==previous['input']['nonempty_documents']
    unresolved=[d for d in documents if d['line'] is None]
    print(json.dumps({'paragraph_documents':len(documents),'tokens':sum(freq.values()),'unresolved_documents':len(unresolved),'fallback_tokens':sum(len(a['fallback_tokens']) for a in audit)},ensure_ascii=False),flush=True)
    models={seed:base['fit']([d['tokens'] for d in documents],seed) for seed in [42,7,123]}
    ref=models[42];prob=ref.phi*(ref.n_t/ref.n_t.sum())[:,None];prob/=prob.sum(axis=0,keepdims=True)
    stability=[]
    for seed in [7,123]:
        permutation,detail=base['align'](ref,models[seed])
        other=models[seed].phi*(models[seed].n_t/models[seed].n_t.sum())[:,None]
        hard=other[np.array(permutation)].argmax(axis=0)
        stability.append({'seed':seed,'topics':detail,'mean_top20_jaccard':float(np.mean([d['top20_jaccard'] for d in detail])),
                          'hard_agreement':float((prob.argmax(axis=0)==hard).mean())})
    topics=[]
    for t,words in enumerate(ref.get_topics(20)):
        topics.append({'id':t+1,'token_assignment_share':float(ref.n_t[t]/ref.n_t.sum()),'top_words':[{'word':w,'probability':float(p)} for w,p in words],
                       'representative_paragraphs':[{**{k:v for k,v in documents[i].items() if k!='tokens'},'spatial_token_count':len(documents[i]['tokens']),'topic_weight':float(ref.theta[i,t])} for i in np.argsort(-ref.theta[:,t])[:8]]})
    groups=[]
    for group,ws in old['word_groups'].items():
        present=[w for w in ws if w in ref.word_to_id]
        weights=sum((prob[:,ref.word_to_id[w]]*freq[w] for w in present),np.zeros(5));weights/=weights.sum()
        groups.append({'group':group,'topic_shares':weights.tolist()})
    result={'source_sha256':fingerprint,'raw_source_sha256':source['raw_sha256'],'parameters':dict(base['PARAMS']),'seeds':[42,7,123],
            'versions':{name:base['version'](name) for name in ['qhchina','numpy','scipy']},
            'input':{'documents':len(documents),'chapters':len(chapter_docs),'empty_chapters':empty,'tokens':sum(freq.values()),'vocabulary':len(freq),
                     'one_token_documents':sum(len(d['tokens'])==1 for d in documents),'documents_under_10_tokens':sum(len(d['tokens'])<10 for d in documents),
                     'unresolved_documents':len(unresolved),'fallback_token_assignments':sum(len(a['fallback_tokens']) for a in audit)},
            'same_tokens_as_chapter_model':True,'alignment_audit':audit,'topics':topics,'seed_stability':stability,'manual_comparison':groups,
            'chapter_baseline_stability':previous['seed_stability'],
            'word_classification':[{'word':w,'frequency':freq[w],'dominant_topic':int(prob[:,i].argmax())+1,'topic_probabilities':prob[:,i].tolist()} for i,w in enumerate(ref.vocabulary)],
            'documents':[{**{k:v for k,v in d.items() if k!='tokens'},'spatial_tokens':d['tokens'],'topic_weights':ref.theta[i].tolist()} for i,d in enumerate(documents)],
            'limitations':['Paragraphs are original TXT nonempty lines, not automatically inferred scenes.',
                           'Alignment ignores punctuation; every fallback and match ratio is recorded.',
                           'Identical canonical tokens are retained; original TXT is used only for boundaries.',
                           'Sparse paragraphs and annotation gaps remain; one-token documents cannot provide internal co-occurrence.',
                           'No >150-character or >10-spatial-word filter is applied. Single-character terms are kept.',
                           'Five topics are requested, not proven optimal. No production edits are applied.']}
    (ROOT/'reports/spatial-paragraph-five-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    report(result,previous)
    print(json.dumps({'input':result['input'],'words':[[w['word'] for w in t['top_words'][:10]] for t in topics],'stability':[s['mean_top20_jaccard'] for s in stability]},ensure_ascii=False))

def report(r,previous):
    import matplotlib.pyplot as plt
    from matplotlib.font_manager import FontProperties
    font=FontProperties(fname='C:/Windows/Fonts/msyh.ttc')
    rows=r['manual_comparison'];matrix=np.array([x['topic_shares'] for x in rows])*100
    fig,ax=plt.subplots(figsize=(11,6.5));im=ax.imshow(matrix,cmap='YlGnBu',vmin=0,vmax=100,aspect='auto')
    labels=[f"主题{t['id']}\n"+'／'.join(w['word'] for w in t['top_words'][:3]) for t in r['topics']]
    ax.set_xticks(range(5),labels,fontproperties=font,fontsize=10);ax.set_yticks(range(5),[x['group'] for x in rows],fontproperties=font,fontsize=11)
    for i in range(5):
        for j in range(5):ax.text(j,i,f'{matrix[i,j]:.1f}%',ha='center',va='center',color='white' if matrix[i,j]>55 else '#183947')
    ax.set_title('以段落为文档：空间词五主题',fontproperties=font,fontsize=18,pad=22)
    fig.colorbar(im,ax=ax,label='%');fig.subplots_adjust(left=.17,right=.94,bottom=.24,top=.85)
    fig.text(.08,.065,'与篇目模型保留完全相同的分词、空间词及词次，仅改变文档边界。\n每行是人工词群成员的词频加权主题占比，不是准确率；主种子42。',fontproperties=font,fontsize=10)
    fig.savefig(ROOT/'reports/段落空間詞_五主題.png',dpi=160);plt.close(fig)
    mean=lambda rows:sum(x['mean_top20_jaccard'] for x in rows)/len(rows)
    lines=['# 段落空間詞五主題：與篇目模型的單因素比較','',
           '只改文檔邊界：相同已修訂分詞、相同空間詞表、相同室／穴語義排除，保留單字及低頻詞。五主題、200輪、burn-in 10，預設alpha初值10、beta=0.2、逐輪估計alpha。',
           '三個種子42、7、123；種子42為主模型。原TXT只用於確定換行邊界，沒有用jieba重新分詞，也沒有把原始評注詞加入訓練。','',
           f"輸入：{r['input']['documents']}個非空段落文檔，覆蓋{r['input']['chapters']}篇，{r['input']['tokens']}詞次、{r['input']['vocabulary']}種詞。逐詞頻數與篇目模型完全相等。",'',
           f"其中{r['input']['one_token_documents']}段僅有1個有效空間詞，{r['input']['documents_under_10_tokens']}段不足10詞；沒有為提高模型品質擅自刪去它們。",'',
           '## 字符與段落對齊','',
           '以原典繁體字序列對齊原TXT，忽略標點與空白；分詞仍取網站有效修訂的簡體詞。位置可對應時按詞內匹配字符映射到段落，否則採用所在原文單元的多數匹配段落。跨段及回退均逐項記錄。',
           f"回退詞次：{r['input']['fallback_token_assignments']}；未定位段落的獨立保留文檔：{r['input']['unresolved_documents']}。若有回退，不能將該詞位置視為完全人工確認。",'',
           '## 五主題','']
    for t in r['topics']:
        lines.extend([f"### 主題{t['id']}",'','、'.join(w['word'] for w in t['top_words']),''])
        for d in t['representative_paragraphs'][:3]:lines.extend([f"《{d['title']}》原TXT第{d['line']}行：",'', '> '+d['excerpt'],''])
    lines.extend(['## 本次觀察','',
                  '房室與門戶詞仍共同集中在主題3，舟水詞仍集中在主題4；改成段落沒有使它們自然分成原人工五組。山穴與冥府稱謂也仍分散。',
                  '主題1混合園、樹、穴及上下位置；主題2以樓、殿、宮等詞較突出；主題5混合井、墓、洞、寺、逆旅。這些是共現組合，不應強行命名為五種固定空間。','',
                  '## 人工詞群對照','','| 人工詞群 | 主題1 | 主題2 | 主題3 | 主題4 | 主題5 |','|---|---:|---:|---:|---:|---:|'])
    for g in rows:lines.append('|'+g['group']+'|'+'|'.join(f'{p*100:.1f}%' for p in g['topic_shares'])+'|')
    lines.extend(['','## 跨種子穩定性','',f"前20詞平均Jaccard：篇目模型{mean(previous['seed_stability']):.3f}；段落模型{mean(r['seed_stability']):.3f}。這不是分類準確率，也不是設定差異的顯著性檢驗。",'',
                  '段落不等於場景，短段落也可能沒有足夠的共現信息。本輪只檢查文檔單位的影響，不把主題直接解釋為人物移動或三界分類。','',
                  '## 重算','',
                  '先執行 `node automation/export-tutorial-markers.js <原TXT>`、`node automation/export-spatial-paragraph-input.js <原TXT>`；再執行 `python -X utf8 automation/model-spatial-paragraphs.py`。',
                  '完整逐詞概率、段落分詞、對齊回退清單見 spatial-paragraph-five-results.json。未更改網站與人工修訂。'])
    (ROOT/'reports/段落空間詞_五主題報告.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')

if __name__=='__main__':main()
