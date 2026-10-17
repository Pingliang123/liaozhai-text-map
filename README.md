# 聊斋文本地图

研究入口：https://pingliang123.github.io/digital-humanities-lab/

index.html：互动地图。data.html：下载中心。data-package.json：含人工修订的完整恢复包。research-data.zip：原文、分词、词典、AI审核、分析文档及程序。

网页顶部「云端同步」点击「登入 GitHub」，完成一次授权后，保存人工修订会自动提交 `manual-revisions.json`。专用后台仅允许 Pingliang123 修改此仓库的修订文件；GitHub 凭据在后台加密保存，浏览器只保存限用途、可退出的同步会话。未登入的设备也可读取公开修订。旧令牌方式收在高级设置中。

不同篇目修改可合并，同篇或同地名冲突会保留本机内容并暂停提交，可下载备份人工核对，或明确选择「备份本机并载入云端」。关闭浏览器后不会继续上传尚未提交的修改。

GitHub Actions 验证人工修订，更新网页内嵌数据、JSON 资料包、ZIP 与校验值后自动发布。Pages 使用 GitHub Actions；每次提交可以追踪与回滚。旧式上传只合并没有冲突的修订。
