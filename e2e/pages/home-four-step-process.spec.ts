import { expect, test } from '@playwright/test';

test('首页按新顺序呈现四步服务流程', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: '四步，从问题到方案' })).toBeVisible();
  await expect(page.getByText('从说清纠纷到律师交付，每一步都清楚、可追溯')).toBeVisible();

  const steps = page.locator('[data-service-step]');
  await expect(steps).toHaveCount(4);
  await expect(steps.nth(0)).toContainText('说清你的纠纷');
  await expect(steps.nth(0)).toContainText('用一句话，讲清发生了什么');
  await expect(steps.nth(1)).toContainText('选择解决方式');
  await expect(steps.nth(1)).toContainText('按你的目标，选择合适的解决方案');
  await expect(steps.nth(2)).toContainText('律师交付意见');
  await expect(steps.nth(2)).toContainText('给出针对性的法律意见和下一步行动建议');
  await expect(steps.nth(3)).toContainText('平台全程保障');
  await expect(steps.nth(3)).toContainText('订单全程留痕，服务质量由帮帮问法保障');
});
