import { test, expect, type Page } from '@playwright/test';

const guardian = {
  id: 42,
  nickname: '测试守护者',
  avatar_url: null,
  invite_code: 'CARE42',
  total_invites: 12,
  valid_invites: 8,
  total_commission: 6800,
  available_commission: 3200,
  withdrawn_commission: 0,
};

async function mockGuardianApis(page: Page) {
  await page.route(/\/api\/guardian\/profile\?guardianId=42$/, (route) => route.fulfill({ json: { success: true, data: guardian } }));
  await page.route(/\/api\/guardian\/commissions\?guardianId=42$/, (route) => route.fulfill({ json: { success: true, data: [] } }));
  await page.route(/\/api\/guardian\/invites\?guardianId=42$/, (route) => route.fulfill({ json: { success: true, data: [] } }));
  await page.route(/\/api\/guardian\/withdrawals\?guardianId=42$/, (route) => route.fulfill({ json: { success: true, data: [] } }));
  await page.route(/\/api\/guardian\/withdraw\?action=config$/, (route) => route.fulfill({
    json: { success: true, data: { minAmount: 10000, feeRate: 0.006, processingDays: '1-3个工作日' } },
  }));
}

async function seedUser(page: Page, guardianData?: typeof guardian) {
  await page.addInitScript((value) => {
    localStorage.setItem('token', 'test-token');
    localStorage.setItem('user_info', JSON.stringify({ id: 7, nickname: '测试用户' }));
    if (value) localStorage.setItem('guardian_user', JSON.stringify(value));
  }, guardianData);
}

test.describe('守护者中心转化与交互', () => {
  test('未登录用户只看到成为守护者的登录主行动', async ({ page }) => {
    await page.goto('/guardian/center');

    await expect(page.getByRole('button', { name: '登录后成为守护者' })).toBeVisible();
    await expect(page.getByText('邀请亲友获得法律帮助')).toHaveCount(0);
  });

  test('已登录未入驻用户看到守护者开通主行动且不承诺自动入驻', async ({ page }) => {
    await seedUser(page);
    await page.goto('/guardian/center');

    await expect(page.getByRole('button', { name: '成为守护者' })).toBeVisible();
    await expect(page.getByText('点击后将使用当前账号开通守护者身份。')).toBeVisible();
    await expect(page.getByText('登录后自动入驻守护者计划')).toHaveCount(0);
  });

  test('已入驻用户优先看到分享主行动且分享链接使用规范邀请码参数', async ({ page }) => {
    await mockGuardianApis(page);
    await seedUser(page, guardian);
    await page.goto('/guardian/center');

    const hero = page.getByTestId('guardian-identity-hero');
    await expect(hero.getByText('你已为 12 位亲友打开法律帮助通道')).toBeVisible();
    await expect(hero.getByTestId('guardian-primary-share')).toBeVisible();
    await expect(hero.getByText('CARE42')).toBeVisible();
    await expect(page.getByText('提取守护回馈')).toHaveCount(0);

    await hero.getByTestId('guardian-primary-share').click();
    await expect(page.getByRole('dialog', { name: '邀请亲友获得法律帮助' })).toBeVisible();
    await expect(page.getByText('亲友将通过平台完成注册和法律咨询，个人信息与咨询内容受保护。')).toBeVisible();
    await expect(page.getByRole('button', { name: '分享守护海报' })).toBeVisible();
    await expect(page.getByRole('button', { name: '保存专属二维码' })).toBeVisible();
    await expect(page.getByRole('button', { name: '复制邀请链接' })).toBeVisible();

    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.getByRole('button', { name: '复制邀请链接' }).click();
    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText()))
      .toBe(`${new URL(page.url()).origin}/register?inviteCode=CARE42`);
  });

  test('减少动态效果时分享面板仍可操作', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await mockGuardianApis(page);
    await seedUser(page, guardian);
    await page.goto('/guardian/center');

    await page.getByTestId('guardian-primary-share').click();
    await expect(page.getByRole('dialog', { name: '邀请亲友获得法律帮助' })).toBeVisible();
  });
});
