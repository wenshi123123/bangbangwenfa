# E2E 测试指南

## 目录结构

```
e2e/
├── README.md                    # 本文件
├── sitemap.spec.ts              # 站点地图完整性测试
├── pages/
│   └── public.spec.ts           # 公共页面渲染测试（13个页面）
├── auth/
│   ├── forms.spec.ts            # 注册/登录流程测试
│   └── protection.spec.ts       # 认证拦截测试（10个受保护路由）
├── security/
│   ├── headers.spec.ts          # 安全响应头验证（CSP/XSS/Frame）
│   └── rate-limit.spec.ts       # 频率限制测试
└── utils/
    └── helpers.ts               # 测试辅助工具
```

## 安装

### 1. 安装 Playwright 浏览器

标准安装（需要访问 Google CDN）：
```bash
npx playwright install chromium
```

**中国大陆镜像安装**（推荐）：
```bash
# 方式一：使用环境变量指定镜像
$env:PLAYWRIGHT_DOWNLOAD_HOST="https://npmmirror.com/mirrors/playwright/"
npx playwright install chromium

# 方式二：手动下载放到缓存目录
# 下载 win64 版到 %USERPROFILE%\AppData\Local\ms-playwright\chromium-XXXX\
```

### 2. 安装项目依赖
```bash
pnpm install
```

## 运行测试

### 运行全部测试
```bash
npx playwright test
# 或
pnpm test:e2e
```

### 运行特定测试套件
```bash
# 站点地图
npx playwright test e2e/sitemap.spec.ts

# 公共页面
npx playwright test e2e/pages/

# 认证测试
npx playwright test e2e/auth/

# 安全测试
npx playwright test e2e/security/
```

### UI 模式（推荐调试）
```bash
pnpm test:e2e:ui
```

### 查看报告
```bash
pnpm test:e2e:report
```

### 指定浏览器
```bash
npx playwright test --project=chromium     # 仅 Chrome
npx playwright test --project=firefox      # 仅 Firefox
npx playwright test --project=mobile-chrome # 移动端模拟
```

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `TEST_BASE_URL` | 测试目标地址 | `http://localhost:3000` |
| `PLAYWRIGHT_DOWNLOAD_HOST` | 浏览器下载镜像 | Google CDN |

## 测试覆盖

| 类别 | 测试数 | 说明 |
|------|--------|------|
| 站点地图 | 19 | 所有关键路由 HTTP 状态检查 |
| 公共页面 | 16 | 13页面渲染 + 3表单验证 |
| 认证拦截 | 16 | 10页面重定向 + 6 API 401验证 |
| 安全头 | 5 | CSP/X-Frame/CORS/CSRF |
| 频率限制 | 3 | SMS API / 登录暴力破解 / IP隔离 |
| **总计** | **59** | |

## CI/CD 集成

在 GitHub Actions 中：
```yaml
- name: Run E2E tests
  run: |
    npx playwright install chromium
    npx playwright test
  env:
    TEST_BASE_URL: http://localhost:3000
```
