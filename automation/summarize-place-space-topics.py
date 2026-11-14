"""Describe combined vocabulary experiment without selecting a winning model."""
import pathlib,json,html
ROOT=pathlib.Path(__file__).resolve().parents[1]

def main():
 d=json.loads((ROOT/'reports/place-space-topic-counts-events.json').read_text(encoding='utf8'))
 old=json.loads((ROOT/'reports/allword-topic-counts-events.json').read_text(encoding='utf8'))
 src=json.loads((ROOT/'.network-runtime/place-space-topic-input.json').read_text(encoding='utf8'))
 assert d['source_sha256']==old['source_sha256']==src['source_sha256']
 sparse=sum(0<len(c['tokens'])<24 for c in src['chapters'])
 lines=['# 地点词＋空间词：比较摘要','',f'原有491篇，其中{d["document_count"]}篇有有效词项；{d["word_types"]}种词、{d["tokens"]}词次。地名词次978，空间词次3977，两者重叠4词次按一次计算。',
 '',f'合并输入后每篇平均{d["tokens"]/d["document_count"]:.1f}词次，{sparse}篇少于24词次。保留短篇，没有用零向量代替缺失篇目。',
 '', '## 结果','',
 '三、六、十主题共95项类型关联，没有一项通过全局BH q<0.05。最低q约0.203。不能为了接近既有类型而挑选未校正的p值。',
 '', '|输入|K|有效篇数|q<0.05项数|其中三种子同向|词表跨种子平均Jaccard|','|---|---:|---:|---:|---:|---:|']
 for label,data in [('全书各类词',old),('地名＋空间词',d)]:
  for m in data['models']:
   sig=[r for r in data['associations']if r['k']==m['k']and r['global_bh_q']<.05]
   stable=sum(r['same_direction_all_seeds']for r in sig);j=sum(s['mean_top20_jaccard']for s in m['stability'])/len(m['stability'])
   lines.append(f'|{label}|{m["k"]}|{data["document_count"]}|{len(sig)}|{stable}|{j:.3f}|')
 lines+=['','两组样本数不同，词汇量与每篇有效长度也不同；上表是描述性对照，不是对两个模型优劣的统计检验。两轮q各自校正95项，未合并为190项。',
 '', '## 一条值得保留但未通过检验的趋势','']
 r=next(r for r in d['associations']if r['k']==3 and r['topic']==3 and r['event']=='狐')
 lines.append(f'三主题的主题3以室、门、门外、市、室中、田等为代表词。狐类平均权重{r["mean_label"]:.1%}，其他篇目{r["mean_other"]:.1%}；篇幅调整差值{r["length_adjusted_difference"]:+.1%}，重排p={r["permutation_p"]:.4f}，q={r["global_bh_q"]:.3f}。三个种子同向，但种子123的效应仅{r["effects_by_seed"]["123"]:.5f}，接近零，不能称为稳健证据。')
 lines+=['','## 含义','',
 '目前没有证据表明，加入地名后能获得与人鬼狐妖神显著对应的主题分组。地名与空间词描述故事发生位置和场景，异事类型描述角色或事件，两种分类不必重合。此前房室词群的定向检验，与本轮无监督主题检验不是同一假设，不能直接以此互相推翻。',
 '', '保留原写法，没有先把金陵与南京等同义地名归并；这避免改动人工资料，但也可能分散地名统计。现有词表与分词的遗漏同样限制结果。可先补足语境与空间标注，而不是继续调参追求显著。',
 '', '## 未进入模型的篇目','', '、'.join(c['title']for c in d['unassigned']),
 '', '## 输入规则','',src['policy']]
 (ROOT/'reports/地點與空間詞_與全詞模型比較.md').write_text('\n'.join(lines)+'\n',encoding='utf8')
 pagepath=ROOT/'reports/地點與空間詞_三六十主題類型比較.html';page=pagepath.read_text(encoding='utf8')
 block=f'<aside id="combined-summary"><h2>本轮结果</h2><p>471篇，1625种词，4951词次；427篇少于24个入模词次。全部95项关联均未达到全局q&lt;0.05，最低q约0.203。</p><p>狐类与三主题的主题3有未校正趋势，但更换种子后有一次效应接近零。不能将此表述为稳定分类。未进入模型的20篇不代表原文没有空间。</p><p><a href="地點與空間詞_與全詞模型比較.md">与全词模型的完整比较</a></p></aside>'
 import re
 page=re.sub(r'<aside id="combined-summary">.*?</aside>','',page,flags=re.S)
 page=page.replace('<select id="k">',block+'<select id="k">');pagepath.write_text(page,encoding='utf8')
 print('Wrote combined-input interpretation and full-vocabulary comparison')
if __name__=='__main__':main()
