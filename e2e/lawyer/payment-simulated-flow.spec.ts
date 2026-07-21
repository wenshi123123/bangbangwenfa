import { expect, test } from '@playwright/test';

const paymentContext = {
  success: true,
  data: { status: 'payable', packageType: 'civil_premium', amount: 100 },
};

async function mockPaymentContext(page: import('@playwright/test').Page) {
  await page.route('**/api/lawyer/payment-context', async (route) => {
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(paymentContext) });
  });
}

test.describe('律师入驻支付模拟闭环', () => {
  test('本人支付页创建一次订单后同步显示支付完成', async ({ page }) => {
    let createRequests = 0;
    let statusRequests = 0;
    let releaseCreate: (() => void) | undefined;
    let signalCreateStarted: (() => void) | undefined;
    const createStarted = new Promise<void>((resolve) => { signalCreateStarted = resolve; });
    const createCanFinish = new Promise<void>((resolve) => { releaseCreate = resolve; });
    await mockPaymentContext(page);
    await page.route('**/api/lawyer/pay/create', async (route) => {
      createRequests += 1;
      expect(route.request().method()).toBe('POST');
      expect(route.request().postDataJSON()).toEqual({});
      signalCreateStarted?.();
      await createCanFinish;
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { orderId: 'LAW-SIMULATED-PAID-001', status: 'pending', codeUrl: 'weixin://wxpay/bizpayurl?pr=simulated' },
        }),
      });
    });
    await page.route('**/api/lawyer/pay/status?orderId=LAW-SIMULATED-PAID-001', async (route) => {
      statusRequests += 1;
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { orderId: 'LAW-SIMULATED-PAID-001', status: 'paid', isPaid: true } }),
      });
    });

    await page.goto('/lawyer/pay?applicationId=forged-id-must-be-ignored');
    await expect(page.getByRole('heading', { name: '确认入驻支付' })).toBeVisible();
    await expect(page.getByText('¥1.00')).toBeVisible();

    const payButton = page.getByRole('button', { name: '确认并支付' });
    const paymentClick = payButton.click();
    await createStarted;
    await expect(page.getByRole('button', { name: '正在创建订单...' })).toBeDisabled();
    releaseCreate?.();
    await paymentClick;

    await expect(page.getByRole('heading', { name: '支付已完成' })).toBeVisible();
    expect(createRequests).toBe(1);
    expect(statusRequests).toBeGreaterThanOrEqual(1);
  });

  test('复用待支付订单时不生成第二笔支付凭据，并向用户说明处理方式', async ({ page }) => {
    let createRequests = 0;
    await mockPaymentContext(page);
    await page.route('**/api/lawyer/pay/create', async (route) => {
      createRequests += 1;
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { orderId: 'LAW-SIMULATED-REUSED-001', status: 'pending', reused: true },
        }),
      });
    });
    await page.route('**/api/lawyer/pay/status?orderId=LAW-SIMULATED-REUSED-001', async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { orderId: 'LAW-SIMULATED-REUSED-001', status: 'pending', isPaid: false } }),
      });
    });

    await page.goto('/lawyer/pay');
    await page.getByRole('button', { name: '确认并支付' }).click();

    await expect(page.getByText('已有一笔待支付订单正在处理中，请在此前打开的支付窗口继续完成，或等待订单超时后重新发起。')).toBeVisible();
    expect(createRequests).toBe(1);
  });
});
