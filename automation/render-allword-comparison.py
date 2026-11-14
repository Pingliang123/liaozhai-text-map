"""Render chapter mixtures without forcing a hard partition."""
import pathlib,sys,json,re
ROOT=pathlib.Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'.network-runtime/topic-libs'))
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.font_manager import FontProperties
from collections import Counter

def main():
 d=json.loads((ROOT/'reports/allword-five-topic-results.json').read_text(encoding='utf8'))
 b=json.loads((ROOT/'reports/allword-five-topic-baseline-beta02.json').read_text(encoding='utf8'))
 assert d['source_sha256']==b['source_sha256'] and d['counts']==b['counts']
 font=FontProperties(fname='C:/Windows/Fonts/msyh.ttc');pts=sorted(d['points'],key=lambda p:p['id'])
 fig,ax=plt.subplots(figsize=(9,18));im=ax.imshow(np.array([p['weights']for p in pts]),aspect='auto',vmin=0,vmax=1,cmap='YlGnBu',interpolation='nearest')
 ticks=list(range(0,len(pts),10));ax.set_yticks(ticks,[f'{pts[i]["id"]+1} {pts[i]["title"]}'for i in ticks],fontproperties=font,fontsize=8)
 ax.set_xticks(range(5),[f'主题{i+1}'for i in range(5)],fontproperties=font);ax.set_title('全书篇目 × 五主题概率（按篇目顺序）',fontproperties=font,fontsize=16)
 bar=fig.colorbar(im,ax=ax,shrink=.45);bar.set_label('主题概率；每行合计为1',fontproperties=font)
 fig.text(.1,.015,'颜色深浅表示概率，不是频次。每篇通常混合多个主题；未强制均分五组。',fontproperties=font,fontsize=10)
 fig.tight_layout(rect=[0,.03,1,1]);fig.savefig(ROOT/'reports/全書詞彙_篇目主題熱圖.png',dpi=150);plt.close(fig)
 hard=Counter(p['dominant_topic']for p in pts);basehard=Counter(p['dominant_topic']for p in b['points'])
 note=f'同一词表对照：beta=0.2时最高主题归组为{dict(sorted(basehard.items()))}；beta=0.01时为{dict(sorted(hard.items()))}。降低beta只是改变平滑强度，不保证分类正确；两版原始结果均保留。'
 lines=['# 全书词汇：五主题与篇目对比','',f'{d["counts"]["chapters"]}篇，{d["counts"]["word_types"]}种有效分词词项，{d["counts"]["tokens"]}词次。','',
 '使用现有修订后的原典分词，排除非纯汉字词项及明确停用词。保留单字、低频词和短篇；「所有词」指不再限定空间、地点、人物、时间等类别。并非分词错误已全部消除。','',note,'',
 '|主题|抽样词次份额|最高概率归组篇数|前15代表词|代表篇目|','|---|---:|---:|---|---|']
 for t in d['topics']:lines.append(f'|{t["id"]}|{t["share"]:.1%}|{hard[t["id"]]}|'+ '、'.join(w['word']for w in t['top_words'][:15])+'|'+ '、'.join(c['title']for c in t['representative_chapters'][:5])+'|')
 lines+=['','## 解释边界','','主题编号由模型生成，不对应人、鬼、狐、妖、神。人物姓名或局部高频词可能使某些主题受少量长篇支配。概率最高的组不能代替完整的五维分布，宜同时检查热图与逐篇表格。','',
 '跨种子前20词匹配平均Jaccard：'+ '；'.join(f'{s["seed"]}：{s["mean_top20_jaccard"]:.3f}'for s in d['stability'])+'。这些是稳定性指标，不是分类准确率。',
 '', '完整词表保存在 allword-five-topic-vocabulary.json.gz；每词包含词频、P(词｜主题)与按抽样主题份额计算的P(主题｜词)。主题图只展示代表词，不表示其余词未进入模型。','',*['- '+s for s in d['limitations']]]
 (ROOT/'reports/全書詞彙_五主題說明.md').write_text('\n'.join(lines)+'\n',encoding='utf8')
 pagepath=ROOT/'reports/全書詞彙_五主題篇目比較.html';page=pagepath.read_text(encoding='utf8')
 import html
 block='<aside id="prior-comparison"><h2>参数对照</h2><p>'+html.escape(note)+'</p><p>主题图显示代表词；其余词也参与训练。完整词表另存压缩JSON。主题编号不等同于异事类型。</p><p><a href="全書詞彙_篇目主題熱圖.png">查看全书篇目×主题热图</a></p></aside>'
 page=re.sub(r'<aside id="prior-comparison">.*?</aside>','',page,flags=re.S)
 page=page.replace('<h2>方法与限制</h2>',block+'<h2>方法与限制</h2>');pagepath.write_text(page,encoding='utf8')
 print(note)
if __name__=='__main__':main()
