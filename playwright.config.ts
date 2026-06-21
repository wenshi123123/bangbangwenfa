import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E 测试配置
 * 用法:
 *   npx playwright test                    # 运行全部测试
 *   npx playwright test e2e/auth           # 运行特定目录
 *   npx playwright test --ui               # UI 模式
 *   npx playwright test --headed           # 有头模式调试
 */
// 使用系统已安装的 Chrome，跳过浏览器下载
process.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = '1';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
  ],
  timeout: 30000,
  expect: {
    timeout: 10000,
  },

  use: {
    baseURL: process.env.TEST_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
      },
    },
    // Firefox 需要额外下载，暂时注释
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5'],
        channel: 'chrome',
      },
    },
  ],

  webServer: process.env.CI
    ? undefined
    : {
        command: 'npx next start --port 3000',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
      },
});
