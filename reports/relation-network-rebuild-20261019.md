# 空间与人物网络重建（2026-10-19）

原06、07入口合并为06「空间与人物网络」。沿用研究页491篇快照及独立时间词资料，不改动主站修订。

## 重建原因

旧版把同篇所有人物复制到每条地点—空间连线，无法说明某人物是否出现在两端关系的具体语境；地点和空间也被整篇笛卡尔积密集连接。新版将关系依据作为建图参数，而非把不同含义合成一种边。

## 三层关系

| 层 | 节点与连线 | 权重 | 人物标注 |
|---|---|---|---|
| 同篇地点与空间 | 只保留经原文命中的地点—地点、地点—空间配对；无方向 | 涉及篇数，每篇每对计一次 | 仅取双端在同一原文单位命中的人物；没有则为空 |
| 同单位词汇共现 | 地点、空间、人物、时间直接配对；无方向 | 共现原文单位数，每单位每对计一次 | 从该单位提取现有篇内人物表达，长词优先 |
| 人物移动 | 已有movement步骤，起点→终点 | 同向移动步骤数 | 沿用该步actors完整表达 |

人物节点按篇分开。同名地点、空间节点表示相同词汇表达，并非完成了历史同址消歧。移动端点只做完全一致匹配；无法对应词表的叙事场所按篇建立节点。未知端点不纳入移动图。反向移动分别保存；自环保留。

原文单位沿用既有切分，不声称已完成场景划分。共现不是互动；同篇关系不是移动。移动图使用现有标注，不声称本轮已重新人工审核全部步骤。分群在每层完整筛选图上计算，移动层分群忽略方向，展示仍保留方向。

## 可追溯性

每条边保存relation、weight和evidence。证据包含篇目ID、原文单位或步骤号、引句、人物、basis及evidenceId。JSON保存当前完整关系层，CSV导出当前显示的边；移动CSV明确区分起点、终点与移动次数。图示为有上限的邻域，非全图截图。

## 文献与采用范围

- Labatut, Vincent & Xavier Bost, *Extraction and Analysis of Fictional Character Networks: A Survey*, ACM Computing Surveys 52(5), 2019. https://arxiv.org/abs/1907.02704 。参考其对人物网络提取、关系定义与分析解释的综述，不宣称实现了完整共指消解。
- Lee, John & Chak Yan Yeung, *Extracting Networks of People and Places from Literary Texts*, PACLIC 2012, pp.209–218. https://aclanthology.org/Y12-1022/ 。采用人物—地点—原句互相追溯的组织思路；不声称复现其人物活动地点抽取算法。
- Elson, David, Nicholas Dames & Kathleen McKeown, *Extracting Social Networks from Literary Fiction*, ACL 2010, pp.138–147. https://aclanthology.org/P10-1015/ 。作为基于对话建关系的对照；本站未实现说话者／听者识别，不将共现图称为对话网络。
- Waumans, Michaël C., Thibaut Nicodème & Hugues Bersini, *Topology Analysis of Social Networks Extracted from Literature*, PLOS ONE 10(6), 2015, e0126470. https://doi.org/10.1371/journal.pone.0126470 。参考其关系语境、叙述次序与动态建图的区分；本轮仅保留移动步骤次序信息，未实现动态播放。
- Moretti, Franco, *Network Theory, Plot Analysis*, Stanford Literary Lab, 2011. https://litlab.stanford.edu/projects/network-theory-plot-analysis/ 。作为人物位置与情节解释的参照。

## 验证结果

同篇层：1464节点、7352条边；同单位层：3012节点、3679条边；移动层：3222节点、2482条同向合并边，186条未知端点步骤未纳入。这是当前快照结果，不作为书籍版本固有统计。

测试覆盖错误人物传播、长短人名重叠、不同关系范围、同名场所隔离、相反移动方向、原文出处、阈值筛选、统一入口与界面切换。
