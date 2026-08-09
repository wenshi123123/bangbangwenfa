import { chromium, type Route } from '@playwright/test';

const payload = Buffer.from(JSON.stringify({
  id: '10000000-0000-4000-8000-000000000001',
  userType: 'user',
  exp: Math.floor(Date.now() / 1000) + 3600,
})).toString('base64url');
const token = `x.${payload}.x`;

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1',
  });
  const page = await context.newPage();

  await page.route('**/api/auth/session', (route: Route) => {
    return route.fulfill({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify({ success: true, data: { id: '10000000-0000-4000-8000-000000000001', phone: '13900000001', username: '川之', nickname: '川之', userType: 'user', isGuardian: false, isLawyer: false } }),
    });
  });
  await page.route(/\/api\/user\/notifications(?:\?.*)?$/, (route: Route) => {
    return route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ success: true, data: [] }),
    });
  });
  await page.route(/\/api\/consult\/order(?:\?.*)?$/, (route: Route) => {
    return route.fulfill({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify({ success: true, order: { id: 123, servicePrice: 5000, caseTitle: '本地模拟咨询', contactPhone: '13900000001', contactName: '川之' } }),
    });
  });
  await page.route('**/api/pay/create', (route: Route) => route.fulfill({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify({ success: true, data: { payTradeNo: 'LOCAL-H5-001', h5Url: 'https://pay.example.test/h5' } }),
  }));
  await page.route('https://pay.example.test/h5', (route: Route) => route.fulfill({
  status: 200,
  contentType: 'text/html',
  body: '<title>Mock WeChat H5</title><main>mock payment</main>',
  }));

  await page.goto('http://127.0.0.1:3100/pay?orderId=123');
  await page.evaluate(({ localToken, user }: { localToken: string; user: Record<string, unknown> }) => {
  localStorage.setItem('token', localToken);
  localStorage.setItem('user_info', JSON.stringify(user));
  }, {
  localToken: token,
  user: { id: '10000000-0000-4000-8000-000000000001', phone: '13900000001', username: '川之', nickname: '川之', userType: 'user', isGuardian: false, isLawyer: false },
  });
  await page.reload();
  const payButton = page.getByRole('button', { name: /微信支付|确认支付/ });
  await payButton.waitFor({ state: 'visible' });
  await payButton.click();
  await page.waitForURL('https://pay.example.test/h5');

  if ((await page.title()) !== 'Mock WeChat H5') {
    throw new Error(`Expected mock H5 page, got ${await page.url()}`);
  }

  console.log('H5 one-click redirect smoke test passed');
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
