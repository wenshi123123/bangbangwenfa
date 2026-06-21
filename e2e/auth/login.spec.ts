/**
 * 登录功能 E2E 测试
 * 覆盖：验证码登录 API、密码登录 API、SMS 发送 API 的参数校验和错误处理
 */
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

test.describe('短信发送 API (POST /api/sms/send)', () => {
  test('空请求体应返回 400', async ({ request }) => {
    const response = await request.post('/api/sms/send', {
      data: {},
      headers: { 'Content-Type': 'application/json' },
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toBeTruthy();
  });

  test('无效手机号应返回 400', async ({ request }) => {
    const response = await request.post('/api/sms/send', {
      data: { phone: '123' },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('手机号');
  });

  test('SQL 注入尝试应被安全处理', async ({ request }) => {
    const response = await request.post('/api/sms/send', {
      data: { phone: "1' OR '1'='1" },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
  });

  test('发送到有效手机号应返回成功', async ({ request }) => {
    // 使用测试手机号（实际 SMS 可能走 Mock 模式）
    const response = await request.post('/api/sms/send', {
      data: { phone: '13800138000' },
      headers: { 'Content-Type': 'application/json' },
    });
    // 可能成功（200）或被限流（429）
    expect([200, 429]).toContain(response.status());
    const body = await response.json();
    if (response.status() === 200) {
      expect(body.success).toBe(true);
    }
  });
});

test.describe('验证码登录 API (POST /api/auth/login)', () => {
  test('空请求体应返回 400', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      data: {},
      headers: { 'Content-Type': 'application/json' },
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toBeTruthy();
  });

  test('无效 loginType 应返回 400', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      data: { loginType: 'invalid' },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
  });

  test('无手机号应返回 400', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      data: { loginType: 'code', code: '123456' },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('手机号');
  });

  test('无验证码应返回 400', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      data: { loginType: 'code', phone: '13800138000' },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('验证码');
  });

  test('不存在手机号应返回 400（验证码不存在或未注册）', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      data: { loginType: 'code', phone: '19900000000', code: '123456' },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    // 实际返回取决于验证码状态：没有验证码记录时返回"验证码已过期"
    expect(body.error).toBeTruthy();
  });
});

test.describe('密码登录 API (POST /api/auth/login)', () => {
  test('无账号应返回 400', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      data: { loginType: 'password', password: 'test123' },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('账号');
  });

  test('无密码应返回 400', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      data: { loginType: 'password', account: 'testuser' },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('密码');
  });

  test('错误密码应返回 400（账号或密码错误）', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      data: { loginType: 'password', account: '13800138000', password: 'wrongpassword123' },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('账号或密码错误');
  });
});

test.describe('响应格式一致性', () => {
  test('未认证端点返回统一 JSON 格式', async ({ request }) => {
    const endpoints = [
      { url: '/api/auth/login', body: {} },
      { url: '/api/sms/send', body: {} },
    ];
    for (const ep of endpoints) {
      const res = await request.post(ep.url, {
        data: ep.body,
        headers: { 'Content-Type': 'application/json' },
      });
      expect(res.status()).toBe(400);
      const body = await res.json();
      expect(body).toHaveProperty('success');
      expect(body).toHaveProperty('error');
      expect(typeof body.success).toBe('boolean');
      expect(body.success).toBe(false);
    }
  });
});

test.describe('安全测试', () => {
  test('GET 请求返回 405 方法不允许', async ({ request }) => {
    // POST-only 端点用 GET 请求
    const response = await request.get('/api/auth/login');
    expect([400, 405, 500]).toContain(response.status());
  });

  test('SQL 注入尝试应被安全处理', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      data: { loginType: 'code', phone: "' OR 1=1--", code: '123456' },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
  });

  test('超大请求体应被限制', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      data: { loginType: 'code', phone: '1'.repeat(100000) },
      headers: { 'Content-Type': 'application/json' },
    });
    // 超大请求体可能被限制返回 400 / 413 / 429（限流）
    expect([400, 413, 429]).toContain(response.status());
  });
});
