# Next.js 静态资源多版本共存设计

## 目标

部署新版本后，已经缓存旧 HTML 的手机浏览器、微信 WebView 和 `www` 访问者仍能完整加载其引用的 JS、CSS、字体和媒体资源；不再因为新容器替换旧 `.next/static` 而出现 404、`ChunkLoadError` 或页面卡在“加载中”。

## 已确认的事实

- `src/middleware.ts` 仅将 `/_next/static/chunks/*.js` 的不存在文件重写到恢复脚本；CSS、字体和图片被 matcher 排除。
- `src/middleware.ts` 对 `www → bangbangwenfa.com` 的 308 重定向直接返回，未调用 `applySecurityHeaders`，因此没有 `Cache-Control: no-store`。
- Zeabur 每次部署运行的是新容器。新容器只包含本次构建的 `.next/static`；它不能保存上一个容器中的静态文件。
- `package.json` 已含 `@aws-sdk/client-s3` 和 `@aws-sdk/lib-storage`，可以对任意 S3 兼容对象存储（R2、COS、TOS、S3 等）上传构建产物，不增加 SDK。

## 方案比较与选择

1. **S3 兼容对象存储保存所有已发布的 `/_next/static` 文件（采用）**：旧 HTML 直接从长期存在的静态域名请求其原始资源。需要配置一个对象存储 bucket 和静态子域名，但跨 Zeabur 部署真正有效。
2. 在 middleware 扩展 JS 恢复逻辑至 CSS、字体与媒体：只能把旧页面强制刷新到新版本，仍会有一次失败和重载；无法保证旧页面连续可用。
3. 继续靠 `__bbwv` 参数和 `Clear-Site-Data`：依赖浏览器是否遵守清缓存，无法消除 `www`、微信 WebView 和离线旧 HTML 的不确定性。

本设计实施方案 1。方案 2 的恢复脚本在第一阶段保留为应急兜底，不作为正常访问链路。

## 架构

### 1. 不可变静态资产库

每次构建完成后，把 `.next/static/**` 上传到对象存储的同一逻辑前缀 `/_next/static/**`。文件名含 Next.js 的内容哈希，因此不同构建通常使用不同路径；上传规则是“只新增，不覆盖已有同名对象”。

Next.js 的 `assetPrefix` 设置为 `NEXT_PUBLIC_STATIC_ASSET_ORIGIN`，例如 `https://static.bangbangwenfa.com`。新旧 HTML 因而都从：

```text
https://static.bangbangwenfa.com/_next/static/chunks/<hash>.js
https://static.bangbangwenfa.com/_next/static/css/<hash>.css
https://static.bangbangwenfa.com/_next/static/media/<hash>.woff2
```

请求各自构建时生成的文件。主站容器更新不再删除这些对象。

对象响应头必须是：

```text
Cache-Control: public, max-age=31536000, immutable
Content-Type: 根据对象扩展名正确设置
```

### 2. 发布原子性与保留策略

构建流程分为：构建 Next.js → 生成完整资产清单 → 上传并验证静态资源 → 生成服务器 bundle → 启动新版本。

资产上传或验证失败必须使部署失败；绝不能启动引用 CDN 资源但资源尚未存在的版本。清理任务读取每个发布清单，只在资产不属于最近 **30 个成功发布** 且对象最后修改时间超过 **30 天** 时删除。失败构建不创建“成功发布”清单，不能触发清理。

每一次成功发布另存 `releases/<build-token>.json`，记录 token、提交号、上传时间与所有资源路径；它既是回滚诊断凭据，也是清理依据。

### 3. 单一主域名与 HTML 缓存

- 唯一业务入口是 `https://bangbangwenfa.com`。
- `https://www.bangbangwenfa.com/*` 返回 **307** 到裸域名，并附 `Cache-Control: no-store, max-age=0`；不再让 WebView 长期缓存一个 308。
- 主站 HTML、RSC 和 API 继续返回 `Cache-Control: no-store`。这样新的导航总是获取当前 HTML；即便某个客户端拿到历史 HTML，它的静态文件也仍可加载。
- `static.bangbangwenfa.com` 只服务 `/_next/static/**`，不设置主站 cookie、不提供 HTML 页面。

### 4. 当前应急恢复机制的过渡

保留 `__bbwv` 跳转和 JS `ChunkLoadError` 恢复脚本一个发布周期，作为静态域名误配时的安全网。上线并连续观察 30 天后，可以删除“旧 chunk 重写为刷新脚本”的主逻辑；版本化 URL 不再承担资源可用性的责任。

## 代码边界

| 位置 | 职责 |
| --- | --- |
| `next.config.ts` | 只从 `NEXT_PUBLIC_STATIC_ASSET_ORIGIN` 生成 `assetPrefix`；统一唯一的 Next 配置来源。 |
| `scripts/publish-next-static-assets.mjs` | 扫描 `.next/static`、上传缺失对象、写发布清单、验证 HEAD 请求。 |
| `scripts/prune-next-static-assets.mjs` | 按 30 个成功发布和 30 天的双条件清理过期对象。只由手动或定时任务调用。 |
| `scripts/build.sh` 与 `Dockerfile` | 在部署构建中调用发布脚本；上传失败立即退出。 |
| `src/middleware.ts` | 让 canonical redirect 同样带 no-store；不再尝试把 CSS/字体/媒体重写成本地恢复内容。 |
| `scripts/*.test.ts` | 覆盖资产路径、上传清单、上传失败阻断发布，以及 canonical redirect 缓存头。 |

## 环境变量

以下变量只配置在 Zeabur，不进入 Git：

```text
NEXT_PUBLIC_STATIC_ASSET_ORIGIN=https://static.bangbangwenfa.com
STATIC_ASSET_S3_ENDPOINT=<S3 兼容 API endpoint>
STATIC_ASSET_S3_REGION=auto
STATIC_ASSET_S3_BUCKET=bangbangwenfa-next-assets
STATIC_ASSET_S3_ACCESS_KEY_ID=<secret>
STATIC_ASSET_S3_SECRET_ACCESS_KEY=<secret>
STATIC_ASSET_RETENTION_RELEASES=30
STATIC_ASSET_RETENTION_DAYS=30
```

`NEXT_PUBLIC_STATIC_ASSET_ORIGIN` 是公开值；其余 `STATIC_ASSET_S3_*` 均为仅构建期/服务端秘密。对象存储必须允许公开读取 `/_next/static/**`，但不得允许匿名写入或列目录。

## 验收标准

1. 裸域名和 www 域名打开首页、`/civil`、`/admin/login` 均无 JS/CSS/font/media 404；www 的最终地址为裸域名。
2. `www → 裸域名` 响应有 `Cache-Control: no-store`。
3. 当前 HTML 的所有 `/_next/static` 引用使用 `static.bangbangwenfa.com`，且逐个 HEAD 为 200。
4. 保存一份部署前 HTML，完成新部署后再请求其中的每一个静态 URL，仍全部为 200。
5. 断开或故意填错对象存储凭据时，构建在上传阶段失败，Zeabur 不会替换现有运行版本。
6. 清理脚本不会删除最近 30 个成功发布引用的任何资源。

## 非目标

- 不迁移业务 API、Supabase、微信支付或用户上传图片。
- 不把 `/_next/image` 迁移到静态资产 bucket。
- 不以强制清用户浏览器缓存作为正确性前提。

## 上线顺序

1. 创建并配置 bucket、静态子域名和上述 Zeabur 环境变量。
2. 部署带发布脚本的版本；确认 bucket 清单和静态资源完整。
3. 用旧 HTML 回放测试和移动端真机测试确认跨部署资源仍为 200。
4. 30 天观察期后，再评估是否移除旧的 JS recovery rewrite。
