# Next.js / CloudBase 版本化静态资产发布手册

## 发布不变量

- 每个候选版本必须有唯一的 `NEXT_PUBLIC_DEPLOYMENT_ID`。
- 所有 `/_next/static` 文件必须先上传到 `NEXT_PUBLIC_STATIC_ASSET_ORIGIN/next/<deployment-id>/_next/static/`，再部署 CloudRun 候选修订。
- 动态页面与 RSC 始终 `no-store`。部分 CloudBase 网关会移除自定义诊断响应头，因此发布验收必须以 HTML 实际引用的静态部署路径为准。
- 静态对象必须至少具有 `max-age=31536000`；不存在对象必须真实 404，不能返回 HTML、CSS、JavaScript、204 或恢复脚本。
- 静态域与站点域不同时，字体对象必须响应 `Access-Control-Allow-Origin: <site-origin>`（或 `*`），否则浏览器会拒绝加载字体。
- 静态资产至少保留当前及前两个完整发布周期；删除前必须通过“旧标签页”验证。

## 候选发布步骤

1. 生成一个不可复用的部署代号，例如 `20260721-<commit-short-sha>`。
2. 将本次的公开参数写入仓库根目录 `static-release.env`（只允许包含静态域名与部署代号，不能包含任何密钥），再使用镜像构建或 CloudBase 源码构建。`NEXT_PUBLIC_*` 值必须在 `next build` 前可用；仅在服务运行时配置不会改变已生成的 JS 资源地址。镜像构建也可显式使用 **Docker build args**：

   ```bash
   docker buildx build --platform linux/amd64 --push \
     --build-arg NEXT_PUBLIC_STATIC_ASSET_ORIGIN=https://<static-domain> \
     --build-arg NEXT_PUBLIC_DEPLOYMENT_ID=<deployment-id> \
     -t ccr.ccs.tencentyun.com/<namespace>/bangbangwenfa:<deployment-id> .
   ```

3. 用相同的两个变量执行 `pnpm build`，生成 `.next/static-release-manifest.json`，然后将 `.next/static` 上传至 `next/<deployment-id>/_next/static/`。上传后必须以 manifest 逐项校验；目录上传工具可能遗漏以下划线开头的 Next 清单文件（例如 `_buildManifest.js`、`_ssgManifest.js`），这些文件必须按 manifest 明确补传。CloudBase CLI 的精确命令是：

   ```bash
   tcb hosting deploy .next/static next/<deployment-id>/_next/static \
     -e bangbangwenfa-d4g7q7yei6a3b2970
   ```

   上传程序不得覆盖历史部署目录，也不得在本步骤删除任何旧目录。
4. 为该静态前缀设置长期 immutable 缓存、跨域字体 CORS；为静态前缀外的 404 设置 `no-store`。不要把静态托管回源到 CloudRun。
5. 静态对象上传后、切入候选服务前执行：

   ```bash
   SITE_ORIGIN=https://<candidate-domain> \
   SITE_QUERY='bbwv_canary=<candidate-value>' \
   STATIC_ASSET_ORIGIN=https://<static-domain> \
   DEPLOYMENT_ID=<deployment-id> \
   node scripts/verify-static-release.mjs
   ```

6. 仅在该命令通过后，部署刚才构建的**不可变镜像**为 CloudRun 候选 revision，并保持灰度模式：

   ```bash
   tcb cloudrun deploy -e bangbangwenfa-d4g7q7yei6a3b2970 \
     -s bangbangwenfa --port 5000 \
     --imageUrl ccr.ccs.tencentyun.com/<namespace>/bangbangwenfa:<deployment-id> \
     --traffic
   ```

   记录当前 100% 流量 revision、镜像 digest、部署代号和 manifest SHA-256，作为回滚锚点。
7. 候选初始保持 0% 或最小可用灰度比例；不得直接切 100%。通过候选域名/定向请求验证后，才用 `tcb cloudrun traffic --stable 95 --canary 5` 开始 5% 切流。

## 三类灰度验收

每一类都必须在候选流量上执行，并保存浏览器 HAR 或网络记录。

1. **新会话：** 无痕上下文打开 `/guardian`，点击“传递守护”。首跳 URL 必须为 `/guardian/center`，不能有 `__bbwv_legacy_asset_retry`、`__bbwv_resource_retry`、`__bbwv_recover`。
2. **冷缓存：** 清空 HTTP 缓存后重做同一流程。document、RSC、JS、CSS、font 的部署代号/路径必须都属于候选版本；无静态资源失败。
3. **已打开旧页面：** 在旧 revision 仍承接流量时打开 `/guardian` 并保持该标签页；切至候选灰度后点击“传递守护”。若旧页面有完整保留的版本化静态资产，则其旧资源继续从旧静态目录读取；若导航请求候选文档，则该文档与后续静态资产必须全部属于候选部署代号。不得出现恢复参数、伪 200 或自动刷新。

每次至少运行：

```bash
PLAYWRIGHT_BASE_URL=https://<candidate-domain> \
pnpm exec playwright test e2e/cache/build-consistency.spec.ts --config=playwright.prod.config.ts
```

## 分段切流与回滚

通过三类验收后，以 CloudBase 支持的最小安全阶梯切流：5%、25%、50%、100%。每个阶段检查 CloudRun 5xx、静态资源 4xx、前端白屏与部署代号不一致。达到全量条件后使用 `tcb cloudrun traffic promote`；失败则使用 `tcb cloudrun traffic rollback`，不要删除静态版本目录。

出现任一项时，立即恢复已记录的正式 revision；静态目录不删除。回滚完成后重复三类验收，并在事故记录中附上请求 ID、部署代号和 manifest SHA-256。
