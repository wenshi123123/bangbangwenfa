# Phase 4：生产环境 E2E 测试报告

> **测试时间**: 2026-06-20 00:04
> **测试环境**: https://bangbangwenfa.com
> **浏览器**: Chrome 147 (系统已安装版, channel: chrome)
> **测试配置**: `playwright.prod.config.ts`

---

## 一、测试概况

| 指标 | 值 |
|------|-----|
| 总测试数 | 66 |
| 通过 | **39 (59.1%)** |
| 失败 | **27 (40.9%)** |
| 测试耗时 | 56.3 秒 |
| 并发 workers | 2 |

### 安全过滤说明

排除了以下有副作用的测试文件（不发送短信、不创建支付、不触发限流）：
- `e2e/auth/login.spec.ts` — 触发真实短信发送
- `e2e/payment/pay.spec.ts` — 创建支付订单
- `e2e/security/rate-limit.spec.ts` — 触发生产限流
- `e2e/lawyer/admin-smoke.spec.ts` — POST/PUT 操作

---

## 二、通过的测试（39 个）

### 公共页面渲染（13/13 通过 ✅）

| 页面 | 路由 | 状态 |
|------|------|------|
| 首页 | `/` | ✅ |
| 法律咨询 | `/consult` | ✅ |
| 民事咨询 | `/civil` | ✅ |
| 用户注册 | `/register` | ✅ |
| 律师入驻 | `/lawyer/join` | ✅ |
| 律师登录 | `/lawyer/login` | ✅ |
| 守护者计划 | `/guardian` | ✅ |
| 管理员登录 | `/admin/login` | ✅ |
| 关于我们 | `/about` | ✅ |
| 隐私政策 | `/privacy-policy` | ✅ |
| 用户协议 | `/user-agreement` | ✅ |
| 律师承诺 | `/lawyer-commitment` | ✅ |
| 入驻协议 | `/lawyer-entry-agreement` | ✅ |

### 公共页面 UI 元素（4/4 通过 ✅）

| 测试 | 状态 |
|------|------|
| 首页应包含关键导航元素 | ✅ |
| 注册页面表单应完整渲染 | ✅ |
| 律师入驻页面应包含表单 | ✅ |
| 律师登录页面正常渲染 | ✅ |

### 站点地图（19/20 通过 ✅ + 1 失败）

| 路由 | 状态 |
|------|------|
| 首页 `/` | ✅ |
| 法律咨询 `/consult` | ✅ |
| 民事 `/civil` | ✅ |
| 注册 `/register` | ✅ |
| 关于 `/about` | ✅ |
| 隐私政策 `/privacy-policy` | ✅ |
| 用户协议 `/user-agreement` | ✅ |
| 律师承诺 `/lawyer-commitment` | ✅ |
| 入驻协议 `/lawyer-entry-agreement` | ✅ |
| 律师首页 `/lawyer` | ✅ |
| 律师入驻 `/lawyer/join` | ✅ |
| 律师登录 `/lawyer/login` | ✅ |
| 守护者 `/guardian` | ✅ |
| 支付 `/pay` | ✅ |
| 管理员登录 `/admin/login` | ✅ |
| 健康检查API `/api/health` | ✅ |
| 价格API `/api/price` | ✅ |
| robots.txt | ❌ 见下方 |

### 安全响应头部分通过（2/5 通过 ✅）

| 测试 | 状态 |
|------|------|
| 不应暴露服务器版本信息 (X-Powered-By) | ✅ |
| 同源API请求应正常响应 | ✅ |
| 公共页面应包含基本安全响应头 | ❌ |
| API端点应包含安全响应头 | ❌ |
| POST请求应要求正确的Content-Type | ❌ |

### 管理后台特殊保护部分通过（1/3 通过 ✅）

| 测试 | 状态 |
|------|------|
| 管理员页面未登录应重定向 | ✅ |
| 管理员API无Token应被拒绝 | ❌ |
| 管理员API错误Token应被拒绝 | ❌ |

---

## 三、失败测试分类（27 个）

### A 类：严重安全漏洞 — 立即修复 🔴

#### A1. 受保护 API 未经验证即可访问（7 个）

| 测试 | 预期 | 实际 | 严重程度 |
|------|------|------|---------|
| GET `/api/user/orders` | 401 | **200** | 🔴 严重 |
| GET `/api/user/messages` | 401 | **200** | 🔴 严重 |
| GET `/api/lawyer/profile` | 401 | **200** | 🔴 严重 |
| GET `/api/guardian/profile` | 401 | **200** | 🔴 严重 |
| GET `/api/admin/dashboard` | 401 | **200** | 🔴 严重 |
| GET `/api/admin/lawyers` (无Token) | 401 | **200** | 🔴 严重 |
| GET `/api/admin/lawyers` (无效Token) | 401 | **200** | 🔴 严重 |

**根因**: 生产环境的 API 认证中间件（middleware/auth guard）未正确运行。所有受保护 API 端点不经 Token 验证即可返回数据。

#### A2. 受保护页面未重定向（10 个）

| 测试 | 预期 | 实际 | 严重程度 |
|------|------|------|---------|
| `/user` | 重定向 | 显示"加载中..." | 🟠 高 |
| `/user/messages` | 重定向 | 显示"OK" | 🟠 高 |
| `/lawyer/dashboard` | 重定向 | 显示"OK" | 🟠 高 |
| `/lawyer/profile` | 重定向 | 显示"OK" | 🟠 高 |
| `/lawyer/orders` | 重定向 | 显示"OK" | 🟠 高 |
| `/guardian/center` | 重定向 | 完整页面 | 🟠 高 |
| `/admin/dashboard` | 重定向 | 显示"加载中..." | 🟠 高 |
| `/admin/lawyers` | 重定向 | 显示"OK" | 🟠 高 |
| `/admin/orders` | 重定向 | 显示"加载中..." | 🟠 高 |
| `/admin/users` | 重定向 | 显示"加载中..." | 🟠 高 |

**根因**: 客户端路由守卫（Route Guard）在生产环境构建中未正确运行。虽然核心数据可能因后端 API 认证问题而不可见，但页面结构和路由信息已经暴露。

---

### B 类：API 行为与测试预期不一致 🟡

#### B1. 登录 API 对错误凭据返回 200（3 个）

| 测试 | 预期 | 实际 |
|------|------|------|
| 错误凭据登录 | 401 | 200 |
| 不完整请求（缺密码） | >= 400 | 200 |
| 律师登录错误凭据 | [401,400,404] | 200 |

**根因**: 生产构建可能对输入验证更宽松，或 API 响应格式不同（返回 `{success: false}` 但 HTTP 状态码为 200）。

#### B2. 注册检查 API 返回非 JSON（2 个）

| 测试 | 预期 | 实际 |
|------|------|------|
| GET `/api/auth/check-username?username=admin` | JSON `{available}` | **纯文本 "OK"** |
| GET `/api/auth/check-phone?phone=13800138000` | JSON `{available}` | **纯文本 "OK"** |

**根因**: 生产环境的 API 端点返回格式与本地开发不一致。

---

### C 类：环境配置差异导致 🟢

#### C1. 安全响应头缺失（3 个）

| 测试 | 预期 | 实际 |
|------|------|------|
| `X-Content-Type-Options` | `nosniff` | `undefined` |
| `X-Frame-Options` | `DENY` | `undefined` |
| CSRF Content-Type 检查 | >= 400 | 200 |

**根因**: CDN/Nginx 层未传递或覆盖了应用层设置的安全响应头。CSRF 保护中间件可能未在生产环境启用。

#### C2. robots.txt 返回异常（1 个）

| 测试 | 预期 | 实际 |
|------|------|------|
| `/robots.txt` | 包含 "User-agent" | 返回 **"OK"** |

**根因**: 生产构建中 `public/robots.txt` 文件可能未被正确部署，或者路由处理异常。

---

## 四、根因深度分析

### 核心问题：认证中间件未运行

A 类问题（17 个测试失败）有一个共同的根因：**生产环境的认证中间件未正确运行**。

**发生原因推测（按可能性排序）：**

1. **middleware.ts 未正确构建**
   - Next.js 的 `middleware.ts` 在生产构建时可能被跳过或 tree-shook
   - 检查 `next build` 输出中是否有 middleware 相关警告

2. **API 路由认证装饰器未生效**
   - API 路由中的 `withAuth` / `requireAuth` 包装函数在生产构建中可能未正确打包
   - 检查 API 路由文件中的认证逻辑 import 路径是否正确

3. **CDN 缓存干扰**
   - CDN（如 CloudFlare、Nginx）可能缓存了未认证的响应
   - 设置 `Cache-Control: no-store` 在受保护 API 上

4. **环境变量差异**
   - 本地和生产环境的 `.env` 配置不同，导致认证跳过
   - 检查 `NEXT_PUBLIC_` 和 `AUTH_` 相关环境变量

### 次要问题：生产构建优化导致的行为差异

B 类和 C 类问题根因是 **生产构建（production build）与开发模式（dev mode）的行为差异**：
- Next.js 开发模式下有完整的错误堆栈和输入验证
- 生产构建可能 tree-shake 了部分验证逻辑
- CDN/Nginx 层可能修改了响应头和路由行为

---

## 五、行动建议

### 优先级 P0：立即修复

| # | 任务 | 影响 | 修复建议 |
|---|------|------|---------|
| 1 | 修复 API 认证中间件 | 所有受保护 API 无认证可访问 | 检查 `middleware.ts` / API 路由 `withAuth` 包装在生产构建中的行为 |
| 2 | 修复页面路由守卫 | 10 个受保护页面未重定向 | 确保客户端和服务端认证逻辑在生产构建中完整保留 |
| 3 | 修复管理员 API 认证 | 管理后台完全暴露 | 添加独立的 admin 认证检查 |

### 优先级 P1：尽快修复

| # | 任务 | 影响 | 修复建议 |
|---|------|------|---------|
| 4 | 修复安全响应头缺失 | XSS、点击劫持风险 | 在 CDN/Nginx 配置文件添加安全头 |
| 5 | 修复 robots.txt | SEO 影响 | 检查 `public/robots.txt` 部署 |
| 6 | 启用 CSRF 保护 | 跨站请求伪造风险 | 检查生产环境 CSRF 中间件配置 |

### 优先级 P2：测试代码优化

| # | 任务 | 说明 |
|---|------|------|
| 7 | 调整登录 API 测试断言 | 允许 200 + `success: false` 作为有效响应 |
| 8 | 调整注册检查 API 测试 | 先检查 Content-Type 再解析响应 |
| 9 | 添加 production 专用测试 | 创建更健壮的生产环境断言，考虑 CDN 行为 |

---

## 八、修复行动记录

### 🔧 修复 #1 — CloudBase 流量错误路由到 Probe Server（2026-06-20）

**根因确认**：CloudBase 云托管将用户流量路由到了健康检查 probe 服务器（端口 3000），该服务器对所有请求返回纯文本 `"OK"`，导致：
- 所有受保护 API 返回 200（实际是 probe 响应）
- 所有受保护页面显示 "OK"（无重定向）
- 所有 API 返回纯文本而非 JSON
- 安全响应头全部缺失

**修改文件**：

| 文件 | 修改内容 |
|------|---------|
| `src/server.mts` | 重写为双服务器架构：主应用(5000) + 智能 probe(3000)。probe 服务器对健康检查直接返回 JSON，其他请求反向代理到主应用 |
| `scripts/start.sh` | 移除独立的 "OK" probe server（Node.js 脚本），由 server.mts 统一管理 |
| `Dockerfile` | 更新环境变量 `APP_PORT`/`PROBE_PORT`，添加 `EXPOSE 3000` |
| `deploy_now.ps1` | 添加 `--port 5000` 参数确保 CloudBase 正确路由 |
| `CACHE_BUST` | `074 → 075` 触发 Docker 缓存重建 |

**部署要求**：
```powershell
cd "D:\帮帮问法网站项目文件包"
.\deploy_now.ps1
```
部署后需要重新运行生产环境测试验证。

**预期效果**：重新部署后，27 个失败测试中至少 24 个应通过，仅 B1/B2 的 API 行为差异需单独验证。

---

## 九、测试命令参考

```powershell
# 重新运行生产环境测试
cd "D:\帮帮问法网站项目文件包"
$env:PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
npx playwright test --config=playwright.prod.config.ts --project=chromium

# 查看 HTML 报告
npx playwright show-report playwright-report-prod
```

---

## 七、配置变更记录

本次测试新增文件：`playwright.prod.config.ts`，内容：
- `baseURL`: `https://bangbangwenfa.com`
- `testIgnore`: 排除 4 个副作用的测试文件
- `retries: 0` — 每个失败都是真实问题
- `workers: 2` — 降低生产环境并发压力
- `timeout: 45000` — 考虑生产网络延迟
- `ignoreHTTPSErrors: true` — 处理可能的 SSL 问题
- `webServer: undefined` — 不启动本地服务器
- 独立报告输出：`playwright-report-prod/`
