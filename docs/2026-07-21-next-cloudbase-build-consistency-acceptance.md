# Next.js / CloudBase 构建一致性修复验收记录

**状态：** 代码与本地候选验证通过；CloudBase 静态资产域上传、候选修订灰度和正式切流尚未执行。

## 根因

线上旧页面请求不存在的 hash 静态文件时，`src/server.mts` 曾将旧 JS 改写为带 `location.replace()` 的 `200 application/javascript`，将旧 CSS 改写为当前 `legacy.css` 的 `200 text/css`。页面端还会在资源错误后追加 `__bbwv_resource_retry` 自动刷新。三者会使一个旧 HTML/RSC 页面执行新构建资源，或者依赖刷新才恢复；这不是缓存恢复，而是跨构建混用。

2026-07-21 的生产只读探测记录：

| 请求 | 修复前响应 | 结论 |
| --- | --- | --- |
| 不存在的 `/_next/static/chunks/*.js` | `200`，`X-BBWV-Legacy-Asset-Recovery: 1`，响应体为刷新脚本 | 伪成功 |
| 不存在的 `/_next/static/css/*.css` | `200`，响应体为当前构建 CSS | 跨构建 CSS 混用 |
| 不存在的 font | `404` | 正确，不再伪装成功 |
| 当前 hash JS/CSS | CloudBase 网关返回 `no-store` | 静态资产没有独立的 immutable 发布边界 |

## 已完成改动

1. 删除服务端 JS/CSS/图片恢复改写；不存在资源交给 Next 返回真实 `404 + no-store`。
2. 删除页面资源错误自动刷新和 `__bbwv_resource_retry` 参数逻辑。
3. 删除 `bb_build_version` Cookie 与 `Clear-Site-Data` 作为部署恢复手段。
4. 对动态 HTML/RSC 响应写入 `X-BBWV-Deployment-Id`，并保持 `no-store`。
5. 新增 `NEXT_PUBLIC_STATIC_ASSET_ORIGIN/next/<NEXT_PUBLIC_DEPLOYMENT_ID>` 的 `assetPrefix` 支持。
6. 每次构建生成 `.next/static-release-manifest.json`，逐文件记录相对路径、SHA-256、大小与部署代号。
7. 生产构建强制要求 `NEXT_PUBLIC_STATIC_ASSET_ORIGIN` 与 `NEXT_PUBLIC_DEPLOYMENT_ID`；缺一即失败。
8. 删除容器内 `legacy-next-static` 合并。旧版本资源的保留改由版本化静态资产域负责，避免未知 archive 覆盖当前 hash。
9. 新增发布前校验脚本与 [发布手册](./next-static-release-runbook.md)。
10. 普通站内链接在捕获阶段改走浏览器完整页面导航，避免把客户端 RSC 预取响应作为跨版本跳转通道；程序化业务跳转仍须在灰度网络记录中逐项确认。

## 本地验收结果

| 验证 | 结果 | 证据 |
| --- | --- | --- |
| 缺失 JS/CSS/font 语义 | 通过 | 本地服务均为 `404`，含 `Cache-Control: no-store`，无恢复头或脚本 |
| 动态部署代号 | 通过 | `/guardian`、`/guardian/center` 均为 `X-BBWV-Deployment-Id: canary-001` 与 `no-store` |
| 构建清单 | 通过 | 候选构建生成 202 个静态文件 manifest，部署代号 `canary-001` |
| 实际渲染资产路径 | 通过 | 以 `canary-asset-prefix` 构建并请求 `/guardian`，HTML 中的 CSS/JS 均为 `https://assets.example.test/next/canary-asset-prefix/_next/static/...`；响应头部署代号相同 |
| 守护者首跳 | 通过 | Playwright 点击“传递守护”后首次到达 `/guardian/center`，无 `__bbwv_*retry`，无静态资源失败 |
| 浏览器完整导航 | 通过 | 本地浏览器点击“返回首页”触发 document 导航；守护入口首跳 `/guardian/center`，控制台无 error |
| 类型与静态检查 | 通过 | `pnpm ts-check` 通过；`pnpm lint` 0 error、28 条既有 warning |

## 尚未完成的平台验收

以下项需要 CloudBase 管理权限与静态资产托管域，当前工作区没有可调用的 CloudBase MCP/CLI 登录通道，因此未执行：

1. 上传候选 `.next/static` 到 `next/<deployment-id>/_next/static/` 并校验所有 manifest 对象为 immutable。
2. 确认静态域 404 不被 CDN 改写为 `200/204` 或 HTML 回退。
3. 部署 CloudRun 候选 revision，记录当前 100% revision、镜像 digest 和 deployment id。
4. 以 0%/最小灰度比例跑新会话、冷缓存、旧标签页三种验收。
5. 按 5% → 25% → 50% → 100% 分段切流并监控 5xx、静态 4xx 与部署代号不一致。

## 回滚

在候选发布前记录当前 CloudRun revision、镜像 digest、`deployment-id` 和当前静态 manifest SHA-256。任何灰度阶段出现静态资源 4xx、伪成功、白屏或响应部署代号不一致时：

1. 立即将 CloudRun 流量恢复至已记录 revision；
2. 不删除候选或旧的版本化静态目录；
3. 保存请求 ID、HAR、候选 manifest 和 CloudRun 日志；
4. 回滚后重复三类会话验证。

正式验收不能以“刷新后最终可进入页面”为通过条件。
