# 《聊齋志異》文本地圖項目交接記錄

更新日期：2026年11月3日

## 項目位置

- GitHub 倉庫：https://github.com/Pingliang123/liaozhai-text-map
- 網站：https://pingliang123.github.io/liaozhai-text-map/
- 工作分支：`codex/analysis-20261021`
- GitHub `main`：`edfe66d`

## 資料原則

`data-package.json` 是統一資料包，`manual-revisions.json` 保存人工修訂。文本地圖與空間實驗室均由這兩份資料重新生成，不能分別修改副本，否則會造成兩個網站不一致。

原文、分詞、地點詞、空間詞、人物詞、時間詞、異境、異事類型、地理層級與人工判斷均以資料包和修訂檔為準。人工修訂優先於自動分類；任何自動審核都不能覆蓋人工判斷。

## 最近完成

- 修復 Unicode 字符對齊與分詞邊界。
- 清理 45 個由上下文判定為非空間詞的標注。
- 整理 92 個重複空間子詞。
- 新增並核對 69 個完整空間詞，涉及 57 篇。
- 移除已被完整空間詞承接的 69 個短詞索引。
- 未通過詞項篩選由 369 項降為 300 項；剩餘項目仍需逐句核查，不可直接全部歸類。
- 重新生成文本地圖、空間實驗室、地點層級、時間資料、主題資料與分析報表。

## 主要報告

- `reports/spatial-integrity-review-20261102.json`
- `reports/semantic-spatial-review-20261102.json`
- `reports/spatial-compound-consolidation-20261102.json`
- `reports/spatial-compound-expansion-20261102.json`
- `reports/spatial-compound-finalization-20261103.json`
- `reports/analysis-reports-20261021.json`

## 重新生成流程

```text
node automation/merge-revisions.js manual-revisions.json
node automation/build-spatial-lab.js
node automation/export-lab-place-levels.js
node automation/build-lab-times.js
node automation/export-topic-input.js
node automation/build-topic-model.js
node automation/build-analysis-reports.js
node automation/build-publication-rebases.js
node automation/update-asset-versions.js
```

Node 執行檔位於：
`C:\Users\yufen\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe`

## 驗證

最近已通過空間完整詞收束、Unicode 對齊、人工修訂優先、全書章節空間網絡、地點—空間網絡、資料統一與發佈快照測試。

後續處理剩餘 300 項時，應逐項保留：篇名、原文句、原詞、判斷、修訂前值、修訂後值與理由。完成每輪後更新本記錄、建立 Git commit，再推送 `main`。

## 重要提醒

聊天視窗本身不會隨 GitHub 自動轉移到其他設備；在其他設備使用 Codex 時，先打開本倉庫，再閱讀本文件與最新提交，即可恢復項目資料、研究進度和後續工作規則。
