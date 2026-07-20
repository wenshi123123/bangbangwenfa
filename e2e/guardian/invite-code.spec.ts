import { expect, test } from '@playwright/test';

const INVALID_INVITE_CODE = 'INVALID-GUARDIAN-20260719';

test.describe('守护者邀请码契约', () => {
  test('验证接口接受规范参数和历史参数，并明确说明邀请码不存在', async ({ request }) => {
    for (const parameter of ['inviteCode', 'code']) {
      const response = await request.get(
        `/api/guardian/verify-code?${parameter}=${INVALID_INVITE_CODE}`
      );

      expect(response.status()).toBe(200);
      await expect(response).toBeOK();
      await expect(response.json()).resolves.toEqual({
        valid: false,
        error: '邀请码不存在',
      });
    }
  });

  test('二维码规范参数和历史参数都显示可理解的错误页，重复访问不循环', async ({ page }) => {
    for (const parameter of ['inviteCode', 'code']) {
      await page.goto(`/register?${parameter}=${INVALID_INVITE_CODE}`);
      await expect(page.getByRole('heading', { name: '邀请码无效' })).toBeVisible();
      await expect(page.getByText('邀请码不存在', { exact: true })).toBeVisible();

      await page.reload();
      await expect(page.getByRole('heading', { name: '邀请码无效' })).toBeVisible();
      await expect(page.getByText('邀请码不存在', { exact: true })).toBeVisible();
    }
  });

  test('无邀请码时保留普通注册入口', async ({ page }) => {
    await page.goto('/register');

    await expect(page.getByRole('heading', { name: '用户注册' })).toBeVisible();
    await expect(page.getByPlaceholder('守护者邀请码')).toBeVisible();
  });

  test('正常邀请码打开注册页并展示守护者信息', async ({ page }) => {
    const inviteCode = process.env.GUARDIAN_TEST_INVITE_CODE;
    test.skip(!inviteCode, '未配置仅用于生产验证的有效邀请码');

    if (!inviteCode) {
      return;
    }

    await page.goto(`/register?inviteCode=${encodeURIComponent(inviteCode)}`);
    await expect(page.getByRole('heading', { name: '用户注册' })).toBeVisible();
    await expect(page.getByText('您正在加入守护者', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: '邀请码无效' })).toHaveCount(0);
  });
});
