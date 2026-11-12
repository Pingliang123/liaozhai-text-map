"""Exploratory chapter-level contrasts, preserving source annotations unchanged."""
import json, math, collections, pathlib, random, copy
ROOT=pathlib.Path(__file__).resolve().parents[1]
SOURCE=json.loads((ROOT/'.network-runtime/spatial-distinctiveness-source.json').read_text(encoding='utf-8'))
CS=SOURCE['chapters']

def fisher(a,b,c,d):
    n=a+b+c+d; k=a+c; m=a+b
    def logchoose(x,y):
        return math.lgamma(x+1)-math.lgamma(y+1)-math.lgamma(x-y+1)
    def probability(x):
        return math.exp(logchoose(k,x)+logchoose(n-k,m-x)-logchoose(n,m))
    observed=probability(a)
    return min(1.,sum(probability(x) for x in range(max(0,m-(n-k)),min(k,m)+1) if probability(x)<=observed*(1+1e-9)))

def bh(rows):
    ordered=sorted(rows,key=lambda r:r['p']); running=1.
    for i in range(len(ordered)-1,-1,-1):
        running=min(running,ordered[i]['p']*len(rows)/(i+1));ordered[i]['q']=running

def analyze(chapters):
    freq=collections.Counter(w for c in chapters for w in c['spaces'])
    rows=[]
    for event in ['人','鬼','狐','妖','神']:
        yes=[c for c in chapters if event in c['events']];no=[c for c in chapters if event not in c['events']]
        for w,n in freq.items():
            if n<8:continue
            a=sum(w in c['spaces'] for c in yes);b=len(yes)-a
            c=sum(w in c['spaces'] for c in no);d=len(no)-c
            rows.append(dict(event=event,word=w,inside=a,inside_n=len(yes),outside=c,outside_n=len(no),
                prevalence=a/len(yes),reference=c/len(no),ratio=(a/len(yes))/(c/len(no)) if c else None,p=fisher(a,b,c,d)))
    bh(rows)
    return rows

def length_permutation(word,event,chapters,iterations=4999):
    # Preserve event counts within token-count deciles to control rough length differences.
    ordered=sorted(chapters,key=lambda c:c['token_count']);bins=[ordered[i*len(ordered)//10:(i+1)*len(ordered)//10] for i in range(10)]
    n1=sum(event in c['events'] for c in chapters);n0=len(chapters)-n1
    def difference(labels):
        a=sum(word in c['spaces'] for c,t in zip(chapters,labels) if t);b=sum(word in c['spaces'] for c,t in zip(chapters,labels) if not t)
        return a/n1-b/n0
    actual=difference([event in c['events'] for c in chapters]);rng=random.Random(42);extreme=0
    for _ in range(iterations):
        selected=set()
        for batch in bins:
            selected.update(c['id'] for c in rng.sample(batch,sum(event in c['events'] for c in batch)))
        val=difference([c['id'] in selected for c in chapters])
        extreme+=abs(val)>=abs(actual)-1e-12
    return (extreme+1)/(iterations+1)

def main():
    assert abs(fisher(1,9,11,3)-.0027594561852200836)<1e-10
    check=[{'p':.01},{'p':.04},{'p':.03}];bh(check)
    assert all(abs(a['q']-b)<1e-10 for a,b in zip(check,[.03,.04,.04]))
    assert len({c['id'] for c in CS})==len(CS)==491
    for c in CS:
        tokens={w for u in c['evidence'] for w in u['tokens']}
        assert set(c['spaces'])<=tokens
        assert not set(c['spaces'])&set(c['unmatched'])
    rows=analyze(CS)
    # All 102 chapter hits for 室 were read. These three have only the non-spatial sense.
    audited=copy.deepcopy(CS)
    exclusions={'董生':'室亦生：妻室，不是房室','黄九郎':'自陈无室：无妻，不是无房','江城':'富室争女之：富户，不是房室'}
    for c in audited:
        if c['title'] in exclusions:c['spaces'].remove('室')
    hole_exclusions={'三生':'穴屋：凿穿动词','陆判':'穴寝门：凿穿动词','跳神':'穴窗：凿穿动词','青娥':'穴墙：凿穿动词','象':'以蹄穴地：挖掘动词','青蛙神':'穴仓：穿入动词','邵女':'按穴刺之：人体穴位','纫针':'材穴葬之：断词及词义不清，暂不计入'}
    excluded_holes=0
    for c in audited:
        if c['title'] in hole_exclusions and '穴' in c['spaces']:
            c['spaces'].remove('穴');excluded_holes+=1
    assert excluded_holes==len(hole_exclusions)
    audited_rows=analyze(audited)
    for r in audited_rows:
        if r['word']=='室' and r['event']=='狐':r['length_decile_permutation_p']=length_permutation('室','狐',audited)
    # Dictionary transfer checks unequal local annotation coverage. Polysemy remains a limitation.
    vocabulary={w for c in CS for w in c['spaces']}
    dictionary_transfer=copy.deepcopy(CS)
    for c in dictionary_transfer:c['spaces']=list(vocabulary&{w for u in c['evidence'] for w in u['tokens']})
    transfer_rows=analyze(dictionary_transfer)
    groups={
      '房室词群':['室','室中','房','房中','闺中','斋中','卧室','寝室','内室'],
      '门户词群':['门','门外','门内','户','户外','窗外','窗','墙'],
      '山穴词群':['山中','山','穴','洞','山洞','林中'],
      '舟水词群':['舟','船','河中','河干','江上','海','海中','河','江','渡','岸'],
      '冥府称谓':['冥司','冥府','地府','阴司','阴间','冥间','阎罗殿'],
    }
    grouped=copy.deepcopy(audited)
    for c in grouped:c['spaces']=[name for name,words in groups.items() if set(words)&set(c['spaces'])]
    group_rows=analyze(grouped)
    for r in group_rows:
        if r['q']<.05:r['length_decile_permutation_p']=length_permutation(r['word'],r['event'],grouped)
    # Exclude mixed ghost/fox stories for an additional interpretable sensitivity comparison.
    contrast=[c for c in CS if ('鬼' in c['events']) != ('狐' in c['events'])]
    sensitivity=analyze(contrast)
    for r in rows:
        if r['q']<.1:
            r['length_decile_permutation_p']=length_permutation(r['word'],r['event'],CS)
            r['examples']=[{'id':c['id'],'title':c['title'],'quote':next(u['text'] for u in c['evidence'] if r['word'] in u['tokens'])} for c in CS if r['event'] in c['events'] and r['word'] in c['spaces']][:6]
    output={'source_sha256':SOURCE['source_sha256'],'chapters':len(CS),'events':dict(collections.Counter(t for c in CS for t in c['events'])),
        'matched_chapter_terms':sum(len(c['spaces']) for c in CS),'unmatched_chapter_terms':sum(len(c['unmatched']) for c in CS),
        'tests':len(rows),'rows':rows,'ghost_fox_exclusive_sensitivity':sensitivity,
        'room_context_audit':{'chapter_hits_read':102,'excluded':exclusions,'rows':audited_rows},
        'hole_context_audit':{'chapter_hits_read':27,'excluded':hole_exclusions},
        'global_dictionary_sensitivity':transfer_rows,'word_groups':groups,'group_rows':group_rows,
        'group_evidence':{name:[{'id':c['id'],'title':c['title'],'events':c['events'],'words':[w for w in words if w in c['spaces']],
            'quotes':[{'unit':u['unit'],'text':u['text']} for u in c['evidence'] if set(words)&set(c['spaces'])&set(u['tokens'])]}
            for c in audited if set(words)&set(c['spaces'])] for name,words in groups.items()},
        'unmatched_inventory':[{'id':c['id'],'title':c['title'],'words':c['unmatched']} for c in CS if c['unmatched']],
        'method':'chapter binary presence; exact saved tokens; minimum 8 chapters; two-sided Fisher; pooled BH across five labels; length-decile permutation (4999, seed42) for q<0.1',
        'limitations':['Event labels overlap. Annotation completeness varies.','Permutation p values are sensitivity diagnostics, not an additional independently corrected discovery test.','No inference of actual movement, causation, or author intention from co-presence.']}
    (ROOT/'reports/spatial-distinctiveness-results.json').write_text(json.dumps(output,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({'chapters':len(CS),'tests':len(rows),'significant_word_tests':sum(r['q']<.05 for r in rows),'significant_group_tests':sum(r['q']<.05 for r in group_rows)},ensure_ascii=False))
    draw(output)

def draw(output):
    import sys
    sys.path.insert(0,str(ROOT/'.network-runtime/plot-libs'))
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    from matplotlib.font_manager import FontProperties
    import numpy as np
    font=FontProperties(fname='C:/Windows/Fonts/msyh.ttc')
    events=['人','鬼','狐','妖','神'];groups=list(output['word_groups'])
    matrix=np.array([[next(r['prevalence']*100 for r in output['group_rows'] if r['event']==e and r['word']==g) for g in groups] for e in events])
    fig,ax=plt.subplots(figsize=(12,6.8));fig.set_facecolor('#faf8f2')
    img=ax.imshow(matrix,cmap='YlGnBu',vmin=0,vmax=60)
    ax.set_xticks(range(len(groups)),groups,fontproperties=font,fontsize=12)
    ax.set_yticks(range(5),[f"{e}（{output['events'][e]}篇）" for e in events],fontproperties=font,fontsize=12)
    for i,e in enumerate(events):
        for j,g in enumerate(groups):
            r=next(r for r in output['group_rows'] if r['event']==e and r['word']==g)
            ax.text(j,i,f"{matrix[i,j]:.1f}%\n{r['inside']}/{r['inside_n']}",ha='center',va='center',color='white' if matrix[i,j]>35 else '#173448',fontsize=12)
    ax.set_title('各类篇目的空间词群分布',fontproperties=font,fontsize=20,pad=22)
    fig.text(.14,.055,'数值：该类篇目中至少命中一个词群成员的比例。类型可重叠；词群可重叠。\n仅计算与完整分词对齐的已标注词；“室”“穴”已作语义排除。不是人物实际活动比例。',fontproperties=font,fontsize=10,color='#48545b')
    fig.colorbar(img,ax=ax,shrink=.75,label='%')
    fig.subplots_adjust(left=.14,bottom=.17,right=.94,top=.87)
    fig.savefig(ROOT/'reports/空間類型比較_篇目占比.png',dpi=160,facecolor=fig.get_facecolor())
    fig.savefig(ROOT/'reports/空間類型比較_篇目占比.svg',facecolor=fig.get_facecolor())
    plt.close(fig)

if __name__=='__main__':main()
