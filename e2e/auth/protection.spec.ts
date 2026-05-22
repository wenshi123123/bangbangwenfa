import { test, expect } from '@playwright/test';

/**
 * 认证保护测试
 * 验证需要登录的页面正确拦截未授权访问
 */
test.describe('认证拦截 - 未登录访问', () => {
  const protectedPages = [
    { path: '/user', name: '个人中心' },
    { path: '/user/messages', name: '用户消息' },
    { path: '/lawyer/dashboard', name: '律师工作台' },
    { path: '/lawyer/profile', name: '律师资料' },
    { path: '/lawyer/orders', name: '律师订单' },
    { path: '/guardian/center', name: '守护者中心' },
    { path: '/admin/dashboard', name: '管理后台' },
    { path: '/admin/lawyers', name: '律师管理' },
    { path: '/admin/orders', name: '订单管理' },
    { path: '/admin/users', name: '用户管理' },
  ];

  for (const { path, name } of protectedPages) {
    test(`${name} (${path}) 应重定向到登录页`, async ({ page }) => {
      const response = await page.goto(path);

      // 应被重定向或返回非200状态
      const finalUrl = page.url();
      const isRedirected =
        finalUrl.includes('/login') ||
        finalUrl.includes('/register') ||
        finalUrl === '/' ||
        response?.status() !== 200;

      expect(isRedirected).toBeTruthy();
    });
  }
});

test.describe('认证拦截 - API端点', () => {
  const protectedApis = [
    { path: '/api/user/orders', name: '用户订单API' },
    { path: '/api/user/messages', name: '用户消息API' },
    { path: '/api/lawyer/profile', name: '律师资料API' },
    { path: '/api/guardian/profile', name: '守护者资料API' },
    { path: '/api/admin/dashboard', name: '管理后台API' },
  ];

  for (const { path, name } of protectedApis) {
    test(`${name} (${path}) 应返回401`, async ({ request }) => {
      const response = await request.get(path);
      expect(response.status()).toBe(401);
    });
  }
});

test.describe('管理后台特殊保护', () => {
  test('管理员API无Token应被拒绝', async ({ request }) => {
    const response = await request.get('/api/admin/lawyers');
    expect(response.status()).toBe(401);
  });

  test('管理员API错误Token应被拒绝', async ({ request }) => {
    const response = await request.get('/api/admin/lawyers', {
      headers: { Authorization: 'Bearer invalid_token_12345' },
    });
    expect(response.status()).toBe(401);
  });

  test('管理员页面未登录应重定向', async ({ page }) => {
    await page.goto('/admin');
    const url = page.url();
    // 应不在 admin 路径下
    expect(url).not.toContain('/admin/dashboard');
    expect(url).not.toContain('/admin/lawyers');
  });
});
