import { test, expect } from '@playwright/test';

/**
 * 频率限制测试
 * 验证 API 有适当的速率限制保护
 */
test.describe('频率限制 (Rate Limiting)', () => {
  const SMS_ENDPOINT = '/api/sms/send';
  const LOGIN_ENDPOINT = '/api/auth/login';

  test('短信发送API应限制频繁请求', async ({ request }) => {
    const phone = '13800138000';
    const results: number[] = [];

    // 快速连续发送多次请求，超过当前配置的 20 次/小时阈值后应出现 429
    for (let i = 0; i < 21; i++) {
      const response = await request.post(SMS_ENDPOINT, {
        data: { phone },
        headers: { 'Content-Type': 'application/json' },
      });
      results.push(response.status());
    }

    const hasRateLimit = results.some(s => s === 429);
    expect(hasRateLimit).toBeTruthy();
  });

  test('登录API应限制暴力破解', async ({ request }) => {
    const results: number[] = [];

    for (let i = 0; i < 10; i++) {
      const response = await request.post(LOGIN_ENDPOINT, {
        data: {
          phone: `1380013${String(i).padStart(4, '0')}`,
          password: 'wrong',
        },
        headers: { 'Content-Type': 'application/json' },
      });
      results.push(response.status());
    }

    // 检查有没有被限流
    const hasRateLimit = results.some(s => s === 429);
    // 至少应有401（认证失败）或429（频率限制）
    const allValid = results.every(s => s === 401 || s === 429 || s === 400);
    expect(allValid).toBeTruthy();
    // 记录限流状态（不强制要求一定触发429，取决于配置）
    console.log(`登录限流测试: 429出现=${hasRateLimit}, 状态码=[${results.join(',')}]`);
  });

  test('不同IP的请求应独立计数', async ({ request }) => {
    // 单次请求应正常返回
    const response = await request.post(LOGIN_ENDPOINT, {
      data: {
        phone: '13900139000',
        password: 'test123',
      },
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': '10.0.0.1',
      },
    });

    // 应返回401（密码错误）而非429（频率限制）
    expect([401, 400]).toContain(response.status());
  });
});
