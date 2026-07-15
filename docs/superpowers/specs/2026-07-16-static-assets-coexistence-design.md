# Next.js 旧缓存单次自愈设计

## 目标

在不增加对象存储、CDN 或新域名的前提下，解决手机浏览器和微信 WebView 因旧 HTML 引用已被新 Zeabur 容器替换的静态资源而出现的异常加载。遇到此类旧资源失败时，页面只自动刷新一次并取得当前 HTML；不能无限刷新，也不能要求用户手工清缓存。

## 已确认的事实

- `src/middleware.ts` 只对 `/_next/static/chunks/*.js` 做旧 chunk 恢复；CSS、字体、图片不在此路径中。
- 同文件中的 `www → bangbangwenfa.com` 使用 308 直接返回，没有 `Cache-Control: no-store`。浏览器/WebView 可能分别缓存两个域名的旧 HTML。
- Zeabur 的新容器只带当前 `.next/static`，因此无法让任意历史 HTML 的每个资源都永久存在；要做到这一点才需要对象存储。
- 当前页面 HTML 已通过 middleware 设置 `Cache-Control: no-store`，故一次真实的顶层刷新能够取得新版本 HTML。

## 方案比较

1. **单次自愈 + 统一入口（采用）**：发现静态资源错误时，顶层页面仅刷新一次；刷新后的 HTML 指向当前资源。无需新增服务，少量代码即可上线。
2. 多版本对象存储：能让旧 HTML 零刷新继续运行，但需要 bucket、静态域名、发布与清理流程；当前不采用。
3. 只靠 `Clear-Site-Data` / `__bbwv`：会清掉用户缓存并可能造成反复跳转，不能可靠捕获 CSS、字体、媒体失败；不采用为主链路。

## 设计

### 统一域名

- 主站仅使用 `https://bangbangwenfa.com`。
- `https://www.bangbangwenfa.com/*` 返回 307 到相同路径的裸域名。
- 该重定向必须附 `Cache-Control: no-store, no-cache, must-revalidate, max-age=0`、`Pragma: no-cache`、`Expires: 0`，不能被 WebView 固化。

### 页面缓存

- HTML 导航和 API 保持 no-store。
- 不再对每次正常 HTML 导航发送 `Clear-Site-Data: "cache"`；它只会在明确的恢复操作中使用。正常访问不应清掉用户其它同域缓存。
- `__bbwv` 继续作为链接带出的构建标记和恢复后的定位标记，但不再是每次请求都清缓存的机制。

### 静态资源错误自愈

新增一个客户端资源错误守卫，使用 capture 阶段监听 `error` 事件，只处理以下同源 `/_next/static/` 请求：

- `<script src>`：JS chunk；
- `<link rel="stylesheet" href>`：CSS；
- `<img src>`、`<video poster>`、`<source src>`：Next 静态媒体；
- 由 CSS 加载的字体不会可靠地产生 DOM error，但 CSS 失败本身已会触发一次刷新。

首次命中后，守卫在 `sessionStorage` 写入当前构建 token 和一次性标记，随后把顶层 URL 的 `__bbwv` 改为当前 token 并执行 `location.replace()`。同一 tab、同一构建最多执行一次；刷新后再次失败则展示原始失败状态并记录 console error，绝不再触发刷新。

守卫忽略第三方资源、业务图片、Supabase/微信请求以及不带 `/_next/static/` 的请求，避免错误刷新。

### 现有恢复逻辑

保留现有旧 JS chunk rewrite 和 `ChunkLoadGuard`，但令它们与资源错误守卫使用同一 sessionStorage 标记语义。无论 JS、CSS 或媒体先失败，都只产生一次恢复导航。

## 文件边界

| 文件 | 改动职责 |
| --- | --- |
| `src/middleware.ts` | 为 canonical redirect 施加 no-store；限制 `Clear-Site-Data` 到恢复跳转。 |
| `src/components/static-asset-recovery-guard.tsx` | 只负责识别同源 `/_next/static/` DOM 资源失败并触发一次顶层恢复。 |
| `src/app/layout.tsx` | 安装该 guard。 |
| `src/lib/static-asset-recovery.ts` | 纯函数：判断资源 URL、生成恢复 URL、生成 session key；供客户端和单元测试共享。 |
| `scripts/static-asset-recovery.test.ts` | 覆盖资源过滤、版本 URL、一次性标记语义。 |
| `scripts/middleware-cache-policy.test.ts` | 覆盖 canonical redirect 必须包含 no-store，正常 HTML 不含 Clear-Site-Data。 |

## 验收标准

1. `www` 打开首页、`/civil`、`/admin/login` 后最终 URL 是裸域名，且 redirect 响应有 no-store。
2. 访问正常页面不出现 `Clear-Site-Data`。
3. 人为触发同源旧 JS、CSS 或图片 `/_next/static/` 资源错误时，当前 tab 只调用一次 `location.replace()`，目标 URL 包含当前 `__bbwv` token。
4. 同一 tab 的第二次资源错误不再自动刷新。
5. 第三方图片和普通业务图片错误不刷新页面。
6. 首页、`/civil`、`/admin/login` 的常规加载和支付、后台流程不受此 guard 影响。

## 明确限制

该方案把“旧资源导致的不可用页面”收敛为一次自动刷新，不能保证离线设备上的历史 HTML 永远无需刷新。若未来需要该保证，再采用对象存储多版本资产库。
