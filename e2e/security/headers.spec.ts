import { test, expect } from '@playwright/test';

/**
 * 安全响应头验证
 * 确保安全中间件正确设置所有保护头
 */
test.describe('安全响应头', () => {
  const securityHeaders = [
    { name: 'X-Content-Type-Options', expected: 'nosniff' },
    { name: 'X-Frame-Options', expected: 'DENY' },
    { name: 'X-XSS-Protection', expected: '1; mode=block' },
    { name: 'Referrer-Policy', expected: 'strict-origin-when-cross-origin' },
    { name: 'Permissions-Policy', check: (val: string) => val.includes('camera=()') },
  ];

  test('公共页面应包含基本安全响应头', async ({ page }) => {
    const response = await page.goto('/');
    const headers = response?.headers() || {};

    for (const { name, expected, check } of securityHeaders) {
      const value = headers[name.toLowerCase()];
      if (expected) {
        expect(value, `${name} 应为 ${expected}`).toBe(expected);
      } else if (check) {
        expect(check(value || ''), `${name} 检查失败`).toBeTruthy();
      }
    }
  });

  test('API端点应包含安全响应头', async ({ request }) => {
    const response = await request.get('/api/health');
    const headers = response.headers();

    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('DENY');
  });

  test('不应暴露服务器版本信息', async ({ request }) => {
    const response = await request.get('/');
    const headers = response.headers();

    // 不应包含 X-Powered-By
    expect(headers['x-powered-by']).toBeUndefined();
    // Server 头不应包含版本号
    const server = headers['server'] || '';
    expect(server).not.toContain('/');
  });
});

test.describe('CORS 配置', () => {
  test('同源API请求应正常响应', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.status()).toBe(200);
  });
});

test.describe('CSRF 基础保护', () => {
  test('POST请求应要求正确的Content-Type', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      data: 'plain-text-not-json',
      headers: { 'Content-Type': 'text/plain' },
    });
    // 应拒绝非JSON请求
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });
});
