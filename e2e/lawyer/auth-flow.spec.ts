import { expect, test } from '@playwright/test';

const account = process.env.LAWYER_TEST_ACCOUNT;
const password = process.env.LAWYER_TEST_PASSWORD;

test.describe('律师登录态恢复', () => {
  test.skip(!account || !password, '未配置生产律师测试账号');

  test('密码登录后应直接进入律师工作台，不显示未授权页面', async ({ page }) => {
    await page.goto('/lawyer/login');
    await page.getByRole('button', { name: '手机号登录' }).click();
    await page.getByRole('button', { name: '密码登录' }).click();
    await page.getByPlaceholder('请输入用户名或手机号').fill(account!);
    await page.getByPlaceholder('请输入密码').fill(password!);
    await page
      .getByRole('checkbox', { name: '我已阅读并同意《用户协议》和《隐私政策》等协议内容' })
      .check();

    const loginButton = page.getByRole('button', { name: '登录', exact: true });
    await expect(loginButton).toHaveCount(2);
    await loginButton.nth(1).click();

    await expect(page).toHaveURL('/lawyer?fromLogin=true');
    await expect(page.getByText('律师工作台', { exact: true })).toBeVisible();
    await expect(page.getByText('请先登录律师账号后再访问后台', { exact: true })).toHaveCount(0);
  });
});
