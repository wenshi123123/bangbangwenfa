import { devices, expect, test } from '@playwright/test';

test.use({ ...devices['iPhone 13'], browserName: 'chromium' });

test.describe('生产移动端公开页面验收', () => {
  const pages = ['/', '/consult', '/civil', '/register', '/lawyer/join', '/guardian'];

  for (const path of pages) {
    test(`${path} 在移动端正常渲染且无同源资源失败`, async ({ page }) => {
      const consoleErrors: string[] = [];
      const failedResources: string[] = [];
      const baseOrigin = new URL(process.env.PLAYWRIGHT_BASE_URL || 'https://bangbangwenfa.com').origin;

      page.on('console', (message) => {
        if (message.type() === 'error') consoleErrors.push(message.text());
      });
      page.on('response', (response) => {
        const url = new URL(response.url());
        if (url.origin === baseOrigin && response.status() >= 400) {
          failedResources.push(`${response.status()} ${url.pathname}`);
        }
      });
      page.on('requestfailed', (request) => {
        const url = new URL(request.url());
        const wasAbortedByNavigation = request.failure()?.errorText === 'net::ERR_ABORTED';
        if (url.origin === baseOrigin && request.resourceType() !== 'document' && !wasAbortedByNavigation) {
          failedResources.push(`network ${url.pathname}`);
        }
      });

      const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
      expect(response?.status()).toBe(200);
      await expect(page.locator('body')).not.toBeEmpty();
      await page.waitForLoadState('load');
      await page.waitForTimeout(1000);
      expect(failedResources).toEqual([]);
      expect(consoleErrors).toEqual([]);
    });
  }
});
