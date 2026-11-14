"""Present chapter clusters from existing five-topic spatial LDA, without re-fitting."""
import json,pathlib,hashlib,sys,collections
ROOT=pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'.network-runtime/topic-libs'))
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.font_manager import FontProperties

def main():
    src=json.loads((ROOT/'reports/spatial-topics-five-results.json').read_text(encoding='utf-8'))
    assert src['source_sha256']==hashlib.sha256((ROOT/'data-package.json').read_bytes()).hexdigest()
    groups=[]
    for topic in src['topics']:
        members=[]
        for c in src['chapter_topics']:
            ranked=sorted(enumerate(c['weights'],1),key=lambda x:-x[1])
            if ranked[0][0]!=topic['id']:continue
            first,second=ranked[:2]
            members.append({**c,'assigned_topic':first[0],'highest_probability':first[1],'second_topic':second[0],
                            'second_probability':second[1],'margin':first[1]-second[1],
                            'ambiguous':first[1]<.5 or first[1]-second[1]<.2,
                            'sparse':c['token_count']<5})
        groups.append({'topic':topic['id'],'top_words':topic['top_words'],'members':sorted(members,key=lambda c:-c['highest_probability'])})
    out={'source_sha256':src['source_sha256'],'model_source':'spatial-topics-five-results.json',
         'method':'Existing chapter-level LDA; argmax document-topic probability, not a new K-means or refitted model.',
         'parameters':src['parameters'],'seed':42,'thresholds':{'ambiguous_max_probability_below':.5,'ambiguous_margin_below':.2,'sparse_tokens_below':5},
         'groups':groups,'unassigned':src['input']['empty_documents'],'total_chapters':491}
    (ROOT/'reports/chapter-spatial-topic-clusters-five.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8')
    lines=['# 依空間詞聚合篇目：五主題','',
           '本次改變分析結果的呈現對象：不為詞語分組，而依每篇故事的五主題概率，將篇目歸入概率最高的一組。沿用已訓練的篇目五主題LDA（種子42），沒有重新訓練或把詞頻當作篇目標籤。',
           '每篇只輸入現有、已對齊分詞的空間詞。五主題、200輪、burn-in 10；alpha自動估計，beta=0.2。不把人物或異事類型交給模型。',
           '歸組只是混合概率的摘要，不表示故事只屬於一類。「混合」指最高概率低於0.5或前兩主題差距小於0.2；「稀疏」指有效空間詞次少於5。這些是閱讀提示，不是統計顯著性標準。','',
           '## 各組規模','','| 主題 | 篇數 | 混合篇數 | 稀疏篇數 |','|---|---:|---:|---:|']
    for g in groups:lines.append(f"|{g['topic']}|{len(g['members'])}|{sum(c['ambiguous'] for c in g['members'])}|{sum(c['sparse'] for c in g['members'])}|")
    for g in groups:
        lines.extend(['',f"## 主題{g['topic']}",'','代表詞：'+'、'.join(w['word'] for w in g['top_words'][:15]),'',
                      '| 篇號 | 篇名 | 空間詞次 | 本組概率 | 次高主題／概率 | 提示 |','|---|---|---:|---:|---|---|'])
        for c in g['members']:
            flags='、'.join(x for x,on in [('混合',c['ambiguous']),('稀疏',c['sparse'])] if on)
            lines.append(f"|{c['id']+1}|{c['title']}|{c['token_count']}|{c['highest_probability']:.1%}|{c['second_topic']}／{c['second_probability']:.1%}|{flags}|")
    lines.extend(['','## 未歸組篇目','', '、'.join(c['title'] for c in out['unassigned']),'',
                  '以上48篇在現有標注與分詞對齊後沒有可用空間詞；不表示原文沒有空間描寫。', '',
                  '## 解讀限制','',
                  '主題1含大量常見空間詞，較大的組別不等於一種已驗證的文學類型。短篇可能因一兩個詞歸組，高概率也不等於可靠性高。',
                  '本模型先前跨種子前20詞平均Jaccard約0.355，細分仍不穩定；此表只呈現種子42，不應據此把篇目固定改類。',
                  '篇目分組可以用來找比較樣本；是否共享敘事結構，仍需檢查人物路徑與原文。網站與人工修訂未更動。'])
    (ROOT/'reports/篇目空間詞_五主題聚類.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
    font=FontProperties(fname='C:/Windows/Fonts/msyh.ttc')
    fig,ax=plt.subplots(figsize=(10,6));xs=range(1,6)
    clear=[sum(not c['ambiguous'] for c in g['members']) for g in groups];mixed=[sum(c['ambiguous'] for c in g['members']) for g in groups]
    ax.bar(xs,clear,color='#428092',label='最高主题较明确');ax.bar(xs,mixed,bottom=clear,color='#d3b883',label='混合归属')
    ax.set_xticks(list(xs),[f"主题{g['topic']}\n"+'／'.join(w['word'] for w in g['top_words'][:3]) for g in groups],fontproperties=font)
    ax.set_title('按空间词聚合篇目：五主题',fontproperties=font,fontsize=18)
    ax.set_ylabel('篇数',fontproperties=font);ax.legend(prop=font)
    for x,g in zip(xs,groups):ax.text(x,len(g['members'])+2,str(len(g['members'])),ha='center')
    fig.text(.1,.035,'沿用篇目LDA，按最高主题概率归组；混合阈值见报告。48篇无有效空间词，未强行归组。',fontproperties=font,fontsize=9)
    fig.tight_layout(rect=[0,.07,1,1]);fig.savefig(ROOT/'reports/篇目空間詞_五主題聚類.png',dpi=160);plt.close(fig)
    print(json.dumps([{'topic':g['topic'],'count':len(g['members']),'examples':[c['title'] for c in g['members'] if not c['sparse']][:6]} for g in groups],ensure_ascii=False))

if __name__=='__main__':main()
