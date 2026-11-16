import pathlib,sys,json,collections,hashlib
ROOT=pathlib.Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'.network-runtime/topic-libs'))
import numpy as np
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.font_manager import FontProperties

def main():
 src=json.load(open(ROOT/'.network-runtime/space-only-similarity-input.json',encoding='utf8'));assert src['source_sha256']==hashlib.sha256((ROOT/'data-package.json').read_bytes()).hexdigest()
 cs=[c for c in src['chapters']if c['tokens']];x=CountVectorizer(analyzer=lambda d:d).fit_transform([c['tokens']for c in cs]);sim=cosine_similarity(x);rows=[]
 for i,a in enumerate(cs):
  for j in range(i+1,len(cs)):
   b=cs[j];shared=sorted(set(a['tokens'])&set(b['tokens']));counts=[len(set(a['tokens'])),len(set(b['tokens']))];freq=[len(a['tokens']),len(b['tokens'])]
   if sim[i,j]<.5 or min(counts)<5 or min(freq)<10 or len(shared)<2:continue
   ca,cb=collections.Counter(a['tokens']),collections.Counter(b['tokens']);contrib={w:ca[w]*cb[w]for w in shared};den=sum(contrib.values());largest=max(contrib,key=contrib.get)
   rows.append({'ids':[a['id'],b['id']],'titles':[a['title'],b['title']],'similarity':float(sim[i,j]),'unique_words':counts,'token_counts':freq,'events':[a['events'],b['events']],'shared_types':sorted(set(a['events'])&set(b['events'])),'exact_types':set(a['events'])==set(b['events']),'shared_words':[{'word':w,'counts':[ca[w],cb[w]]}for w in shared],'largest_dot_product_word':largest,'largest_dot_product_share':contrib[largest]/den})
 rows.sort(key=lambda r:(-r['similarity'],r['ids']));out={'source_sha256':src['source_sha256'],'method':'Raw spatial word count cosine; no places or TF-IDF. Descriptive selection: cosine>=.5, both >=5 unique words and >=10 tokens, >=2 shared words. No literary theme or significance inference.','eligible_pairs':len(rows),'rows':rows};(ROOT/'reports/high-spatial-frequency-pairs.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf8')
 top=rows[:20];font=FontProperties(fname='C:/Windows/Fonts/msyh.ttc');fig,ax=plt.subplots(figsize=(15,max(7,len(top)*.43+2)))
 colors=['#397d9a'if r['shared_types']else'#c69963'for r in top];y=np.arange(len(top));ax.barh(y,[r['similarity']for r in top],color=colors,height=.65);ax.set_yticks(y,['／'.join(r['titles'])for r in top],fontproperties=font,fontsize=11);ax.invert_yaxis();ax.set_xlim(0,1);ax.set_xlabel('空间词频余弦相似度',fontproperties=font)
 for i,r in enumerate(top):ax.text(r['similarity']+.01,i,f'{r["similarity"]:.3f}   '+ '／'.join('、'.join(e)or'未定'for e in r['events']),fontproperties=font,va='center',fontsize=9)
 ax.set_title('空间词高相似篇目对（前20组）',fontproperties=font,fontsize=19);ax.spines[['top','right']].set_visible(False)
 fig.text(.03,.015,'蓝：至少共享一种现有类型；褐：没有共享类型。门槛：两篇各≥5种词、≥10词次、共有≥2词，相似度≥0.5。\n仅比较已标注且分词独立出现的空间原词；类型按现有数据，未重新人工核定。',fontproperties=font,fontsize=10);fig.tight_layout(rect=[0,.065,1,1]);fig.savefig(ROOT/'reports/空間詞高相似篇目_類型對照.png',dpi=170,bbox_inches='tight');plt.close(fig)
 lines=['# 空间词高相似篇目与类型','',out['method'],'',f'符合门槛共{len(rows)}组；以下前20组，{sum(bool(r["shared_types"])for r in top)}组共享至少一种类型。门槛仅作探索，不是显著性标准。','', '|篇目对|相似度|类型对照|共有空间词（两篇次数）|最高贡献词／占比|','|---|---:|---|---|---|']
 for r in top:lines.append('|'+ '／'.join(r['titles'])+f'|{r["similarity"]:.3f}|'+ '／'.join('、'.join(e)for e in r['events'])+'|'+ '、'.join(w['word']+'('+ '/'.join(map(str,w['counts']))+')'for w in r['shared_words'])+f'|{r["largest_dot_product_word"]}／{r["largest_dot_product_share"]:.1%}|')
 lines+=['','贡献占比指该词占两篇词频向量点积的比例，不是占最终相似度的比例。高分仍可能由一个重复词主导。相同空间用词不等同于相同情节或价值主题；现有类型标签可能存在误标。']
 (ROOT/'reports/空間詞高相似篇目_對照表.md').write_text('\n'.join(lines)+'\n',encoding='utf8');print(json.dumps({'pairs':len(rows),'top':[{k:r[k]for k in ['titles','similarity','events']}for r in top[:6]],'shared_top20':sum(bool(r['shared_types'])for r in top)},ensure_ascii=False))
if __name__=='__main__':main()
