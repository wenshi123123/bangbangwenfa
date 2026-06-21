import { defineConfig, devices } from '@playwright/test';

/**
 * 生产环境 E2E 测试配置
 * 用法: npx playwright test --config=playwright.prod.config.ts
 *
 * 安全策略：只执行只读测试（GET），绝不触发短信、支付、数据修改等副作用
 *
 * 排除的测试文件（有副作用）：
 *   - e2e/auth/login.spec.ts      ← 触发真实短信发送
 *   - e2e/payment/pay.spec.ts     ← 创建支付订单
 *   - e2e/security/rate-limit.spec.ts  ← 触发生产限流
 *   - e2e/lawyer/admin-smoke.spec.ts   ← POST/PUT 操作
 */

process.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = '1';

export default defineConfig({
  testDir: './e2e',

  // 排除有副作用的测试文件
  testIgnore: [
    '**/auth/login.spec.ts',
    '**/payment/pay.spec.ts',
    '**/security/rate-limit.spec.ts',
    '**/lawyer/admin-smoke.spec.ts',
  ],

  // 生产环境不重试，每个失败都是真实问题
  retries: 0,

  // 减少并发避免对生产环境造成压力
  workers: 2,

  // 生产环境网络稍慢，适当增加超时
  timeout: 45000,
  expect: {
    timeout: 15000,
  },

  reporter: [
    // 独立报告目录，与本地测试隔离
    ['html', { outputFolder: 'playwright-report-prod' }],
    ['list'],
  ],

  // 仅运行已排除副作用文件的测试（通过 testIgnore 过滤）

  use: {
    // 直接连接生产环境
    baseURL: 'https://bangbangwenfa.com',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
    // 生产环境忽略 HTTPS 证书错误（如有自签名证书情况）
    ignoreHTTPSErrors: true,
    // 模拟真实用户
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Playwright-Prod-Test/1.0',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
      },
    },
  ],

  // 生产环境测试不启动本地 webServer
  webServer: undefined,
});
