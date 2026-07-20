import { expect, test } from '@playwright/test';

test.describe('律师续费登录回跳', () => {
  test('外部浏览器未登录进入续费页后，登录入口应保留续费返回地址', async ({ page }) => {
    await page.goto('/lawyer/renew');

    const loginLink = page.getByRole('link', { name: '前往登录' });
    await expect(loginLink).toHaveCount(1);
    await expect(loginLink).toHaveAttribute(
      'href',
      '/lawyer/login?redirect=%2Flawyer%2Frenew'
    );
  });

  test('续费订单状态查询应识别续费订单并要求律师身份', async ({ request }) => {
    const response = await request.get(
      '/api/lawyer/pay/status?orderId=RENEW-TEST-ORDER'
    );

    expect(response.status()).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: expect.any(String),
    });
  });
});
