import { expect, test } from '@playwright/test';

test('守护者入口首次导航不触发资源恢复或版本重试', async ({ page }) => {
  const recoveryResponses: string[] = [];
  const failedStaticResources: string[] = [];

  page.on('response', response => {
    if (response.headers()['x-bbwv-legacy-asset-recovery']) {
      recoveryResponses.push(response.url());
    }
    const url = new URL(response.url());
    if (url.pathname.startsWith('/_next/static/') && response.status() >= 400) {
      failedStaticResources.push(`${response.status()} ${url.pathname}`);
    }
  });

  await page.goto('/guardian', { waitUntil: 'networkidle' });
  const guardianCtas = page.locator('a[href="/guardian/center"]');
  await expect(guardianCtas).toHaveCount(3);
  await guardianCtas.nth(0).click();
  await expect(page).toHaveURL(/\/guardian\/center$/);

  const url = new URL(page.url());
  expect(url.searchParams.has('__bbwv_legacy_asset_retry')).toBe(false);
  expect(url.searchParams.has('__bbwv_resource_retry')).toBe(false);
  expect(url.searchParams.has('__bbwv_recover')).toBe(false);
  expect(recoveryResponses).toEqual([]);
  expect(failedStaticResources).toEqual([]);
});
