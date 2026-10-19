# 按 Tutorial_5_Network_Analysis.ipynb 重做空间网络

本轮实际调用 NetworkX 3.4.2、python-louvain 0.16、NumPy 2.2.6、SciPy 1.15.3，不再把网页自写分群与布局当成附件库的结果。三个关系层各生成完整、去噪两份分析。

所参考附件SHA256：`c92485e4e8e36759f4ba2545e6bca29b50746daa3bff93d1208d726637cf0cf6`。

| 附件环节 | 本站实现 |
|---|---|
| 配对后has_edge累加weight | 已有原文关系及移动步骤累计边权；Python读入时再次正确累加重复边 |
| nx.Graph | 同篇／共现用Graph；人物移动用DiGraph，正反边分开 |
| denoise_network逐轮删除degree==1 | 在无向副本上逐轮删除，直到无度1节点；保留孤立点，与附件代码一致；前端明确切换完整／去噪图，不删除原始资料 |
| best_partition(random_state=42) | 实际调用python-louvain；移动层的副本将正反边权重相加后分群 |
| 每群加权度前20，G.subgraph | 使用NetworkX的加权度排序，每群Top20；有向图诱导子图仍保留方向 |
| spring_layout(seed=42,k=0.5) | 对每群Top20诱导子图的无向投影实际求布局；另存完整图的布局，供邻域查看 |
| degree/betweenness/closeness/eigenvector | 实际调用NetworkX；按附件默认使用无权拓扑。特征向量迭代上限提高到1000、tol=1e-8；不收敛时为空，并保存原因 |
| top_neighbors按weight排序 | 节点详情列出最强五条关联，移动明确起点与终点 |
| 节点大小／线宽／分群颜色 | 教程视图节点面积参考degree_centrality×4000，零／极小节点留最小可点击尺寸；线宽使用weight；分群配色，概览边透明度0.03 |

四项中心性不是同一个「重要程度」。有向图度中心性包含入度和出度，可能大于1；接近中心性按NetworkX默认的入向距离定义；特征向量也是入向贡献。边权为出现次数，不作为最短路长度。

完整图与去噪图各自重新分群、计算指标及布局。中心性排名以对应分析图为基准，不以画面上的局部样本为基准。

## 展示

- 「教程全图：每群Top20」显示附件选择规则的完整结果。
- 「教程概览」仅显示前12群各最多20点，明确标出抽样范围，便于浏览器操作。
- 「中心邻域」复用完整图的NetworkX坐标，再等比例缩放至画面。
- 下载的NetworkX分析JSON含六份分析的指标、群组、Top20名单与坐标；主网JSON另保留原始有向边及证据。

图上几何长度仍为弹簧布局产生的关系距离，不是经纬度或实际路程。教程视图默认锁定节点，只有主动解锁后可拖动；拖动只影响显示，不改分析数据。

## 图数据一致性

前端与导出脚本使用同一结构指纹（节点ID、源／目标、方向、边权）；仅当当前图与Python分析匹配时展示NetworkX指标及坐标。篇目筛选、阈值变化造成图不同时，显示未匹配提示，不套用其他图的中心性。

## 当前结果

| 层 | 完整节点／边 | 教程去噪后节点／边 |
|---|---:|---:|
| 同篇地点与空间 | 1464／7352 | 1310／7202 |
| 同单位词汇 | 3012／3679 | 1398／2391 |
| 有向移动 | 3222／2482 | 410／164 |

移动去噪图的410节点包含孤立节点；大量出发端与终点会被这一算法移除，不能将去噪结果直接当成全部叙事结构。故完整图仍为默认分析输入，去噪作为可比较的教程步骤。

## 重现

1. `python -m pip install -r automation/requirements-network.txt`
2. `node automation/export-network-input.js`
3. `python automation/build-networkx.py`
4. `node automation/test-tutorial-network.js`
5. `node automation/test-tutorial-network-dom.js`
6. `python automation/test-networkx.py`

GitHub Actions执行同一流程。Python测试直接对照方向中心性、重复边累权、固定种子坐标与附件去噪算法；JS测试逐一核对六份分析指纹及各群Top20名单，界面测试核对真实指标启用和筛选后的失效处理。
