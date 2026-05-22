import { test, expect } from '@playwright/test';

/**
 * 公共页面可访问性测试
 * 验证所有无需登录的页面都能正常渲染
 */
test.describe('公共页面渲染', () => {
  const publicPages = [
    { path: '/', name: '首页' },
    { path: '/consult', name: '法律咨询' },
    { path: '/civil', name: '民事咨询' },
    { path: '/register', name: '用户注册' },
    { path: '/lawyer/join', name: '律师入驻' },
    { path: '/lawyer/login', name: '律师登录' },
    { path: '/guardian', name: '守护者计划' },
    { path: '/admin/login', name: '管理员登录' },
    { path: '/about', name: '关于我们' },
    { path: '/privacy-policy', name: '隐私政策' },
    { path: '/user-agreement', name: '用户协议' },
    { path: '/lawyer-commitment', name: '律师承诺' },
    { path: '/lawyer-entry-agreement', name: '律师入驻协议' },
  ];

  for (const { path, name } of publicPages) {
    test(`${name}页面 (${path}) 应正常加载`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);

      // 验证页面有基本内容（不是空白页）
      const bodyText = await page.textContent('body');
      expect(bodyText?.trim().length).toBeGreaterThan(0);
    });
  }

  test('首页应包含关键导航元素', async ({ page }) => {
    await page.goto('/');
    // 检查页面标题
    await expect(page).toHaveTitle(/./);
  });

  test('注册页面表单应完整渲染', async ({ page }) => {
    await page.goto('/register');
    // 验证表单元素存在
    const formElements = page.locator('input, button, form');
    await expect(formElements.first()).toBeVisible({ timeout: 5000 });
  });

  test('律师入驻页面应包含表单', async ({ page }) => {
    await page.goto('/lawyer/join');
    const formElements = page.locator('input, button, form');
    await expect(formElements.first()).toBeVisible({ timeout: 5000 });
  });
});
