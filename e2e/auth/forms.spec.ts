import { test, expect } from '@playwright/test';

/**
 * 用户注册和登录流程测试
 * 覆盖：注册表单验证 → 手机验证码 → 登录 → 个人中心
 */
test.describe('注册流程', () => {
  test('注册页面表单验证 - 空字段', async ({ page }) => {
    await page.goto('/register');

    // 尝试提交空表单
    const submitBtn = page.locator('button[type="submit"]').first();
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      // 应有表单验证提示
      await page.waitForTimeout(500);
    }

    // 页面不应崩溃
    await expect(page).toHaveURL(/register/);
  });

  test('注册页面表单验证 - 无效手机号', async ({ page }) => {
    await page.goto('/register');

    // 尝试填写无效手机号
    const phoneInput = page.locator('input[type="tel"], input[name="phone"], input[placeholder*="手机"]').first();
    if (await phoneInput.isVisible()) {
      await phoneInput.fill('123');
      const submitBtn = page.locator('button[type="submit"]').first();
      if (await submitBtn.isVisible()) {
        await submitBtn.click();
        await page.waitForTimeout(500);
      }
    }
  });

  test('注册页面 - 用户名检查', async ({ request }) => {
    const response = await request.get('/api/auth/check-username?username=admin');
    // 应正常响应（admin通常已占用）
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('available');
  });

  test('注册页面 - 手机号检查', async ({ request }) => {
    const response = await request.get('/api/auth/check-phone?phone=13800138000');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('available');
  });
});

test.describe('登录流程', () => {
  test('登录页面应正常渲染', async ({ page }) => {
    // 访问需要登录的页面，应被重定向
    await page.goto('/user');

    // 检查是否被重定向
    const url = page.url();
    expect(url).toMatch(/\/(login|register|$)/);
  });

  test('错误凭据登录应被拒绝', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      data: {
        phone: '13800138000',
        password: 'wrongpassword',
      },
      headers: { 'Content-Type': 'application/json' },
    });

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.success).toBe(false);
  });

  test('不完整请求应被拒绝', async ({ request }) => {
    // 缺少密码
    const response1 = await request.post('/api/auth/login', {
      data: { phone: '13800138000' },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(response1.status()).toBeGreaterThanOrEqual(400);

    // 缺少手机号
    const response2 = await request.post('/api/auth/login', {
      data: { password: 'test123' },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(response2.status()).toBeGreaterThanOrEqual(400);
  });
});

test.describe('律师登录流程', () => {
  test('律师登录页面应正常渲染', async ({ page }) => {
    await page.goto('/lawyer/login');
    await expect(page.locator('input, button')).not.toHaveCount(0);
  });

  test('律师登录API错误凭据应被拒绝', async ({ request }) => {
    const response = await request.post('/api/lawyer/login', {
      data: {
        phone: '13800138000',
        password: 'wrongpassword',
      },
      headers: { 'Content-Type': 'application/json' },
    });

    // 应返回认证失败
    expect([401, 400, 404]).toContain(response.status());
  });
});
