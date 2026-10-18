# 聊斋地图登入与同步后端

此后端部署到用户的 Cloudflare Workers；地图继续托管于 GitHub Pages，修订的唯一正式资料库仍是 `Pingliang123/liaozhai-text-map`。

日常使用：地图点击「登入 GitHub」，完成授权后自动同步保存；重新开页恢复此设备的 30 天服务会话，GitHub 的 8 小时授权由服务器更新。到期、撤销或退出后重新登入。浏览器只保存限于地图修订接口的随机会话凭证，GitHub access token 和 refresh token 加密保存在后端 Durable Object 内，不发给浏览器。

## 一次性设置（推荐）

部署者生成随机设置口令，仅将 SHA-256 摘要放入 `SETUP_KEY_HASH`。通过专属 `/setup#key=口令` 进入设置页；口令不进入服务器 URL 日志、不提交到 GitHub，完成设置后不能重复使用。点击建立 GitHub App，使用 Pingliang123 在 GitHub 确认 Create GitHub App，返回设置页后安装 App，并只选择 `liaozhai-text-map`。GitHub 的 Client secret 由后台接收并加密保存，不需手动粘贴。服务加密与签名密钥由后台自动生成，不发送到浏览器。GitHub 返回的 private key 不用于此服务，也不会持久储存。

后台 `/health` 显示 `configured: true` 后，地图「登入 GitHub」即可使用。地图服务网址配置在根目录 `github-sync-config.json`。可在任何设备登入，浏览器保存的是仅限地图库修订接口的服务会话。

## 部署与手动配置说明

1. 在 Cloudflare 部署此目录。通过 Cloudflare Workers Git 集成选取地图库，根目录填 `auth-backend`，构建测试为 `npm test`，部署为 `npx wrangler deploy`。也可在本地运行 `pnpm install`、`pnpm exec wrangler login`、`pnpm exec wrangler deploy`。需要 Cloudflare 账号的本人授权。
2. 记录 Worker 的 HTTPS 地址。在 GitHub 的 Settings → Developer settings → GitHub Apps → New GitHub App 注册应用：Homepage 为地图地址，Callback 为 `https://你的Worker地址/auth/callback`，关闭 Webhook，Repository permissions 的 Contents 设为 Read and write，Metadata 为 Read。保留 expiring user tokens，只安装到 `liaozhai-text-map` 仓库。GitHub App 注册、安装和生成 Client secret 需账号本人确认。
3. 推荐使用上方一次性设置向导自动取得 Client ID 与 Client secret。若需要手动接入已有 App，可在 Cloudflare Worker 的 Variables and Secrets 设置 `GITHUB_CLIENT_ID`（变量）、`GITHUB_CLIENT_SECRET`（Secret）；签名与加密密钥由 SyncControl 自动生成。不要将 Secret 填入 GitHub 仓库或地图网页。
4. 将地图库根目录的 `github-sync-config.json` 中 `backend_url` 填为 Worker HTTPS 根地址并提交。也可先在地图「云端同步」输入服务网址，只在该设备试用。
5. 打开 Worker `/health`，应显示 `configured: true`；然后从地图完成一次登入和实际修订测试，再在另一设备验证读取。

Cloudflare 运行环境会自动创建 SQLite Durable Object，不需要额外手动建数据库。此目录的 `.dev.vars`、`.env`、`.wrangler` 和 node_modules 已忽略。首次注册或帐号授权完成前，服务会明确返回「尚未配置」，不假装登入成功。

## 验证与更新

同步接口与浏览器均以UTF-8字节数限制修订文件，当前上限25 MB。仓库保存、后台写入和浏览器上传使用紧凑JSON，不删减词表、分词、原文或修订记录。超过GitHub Contents内联大小的文件改由同一版本SHA的Blob接口完整读取；超过25 MB明确拒绝，保留本机修改，不能静默截断。`/health`的`max_revision_bytes`可核对已部署上限。

`node --test test-worker.mjs` 验证 CSRF/PKCE、允许账号、加密、刷新并发、CORS、权限错误、数据与版本冲突。服务器使用完整原文的精简基线与地图同一套验证模型；本文本基线是从公开地图库生成的，不含分词缓存。若更换原文、章节或模型，应重新运行工作区 `outputs/prepare_auth_backend.js`，更新模型与 validation-base 后再部署。

后台仅支持固定的 `manual-revisions.json` 和 `main`，不接收任意仓库、路径或分支。GitHub Actions 在收到修订提交后执行完整测试、生成数据包和发布网站。Cloudflare 负责临时授权会话，不作为研究资料库。
