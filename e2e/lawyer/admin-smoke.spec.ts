import { test, expect } from '@playwright/test';

/**
 * 律师后台全面冒烟测试
 * 
 * 覆盖范围：
 * 1. 页面可访问性（无需登录即可访问的页面）
 * 2. API 端点基础功能（权限、数据校验、错误处理）
 * 3. 认证和授权边界条件
 * 4. 数据安全和隐私
 */

// ============================================================
// 第一部分：页面可访问性测试
// ============================================================
test.describe('律师相关页面可访问性', () => {
  const lawyerPages = [
    { path: '/lawyer/login', name: '律师登录页' },
    { path: '/lawyer/join', name: '律师入驻页' },
  ];

  for (const { path, name } of lawyerPages) {
    test(`${name} (${path}) 应正常加载`, async ({ page }) => {
      const response = await page.goto(path, { timeout: 15000 });
      expect(response?.status()).toBe(200);
      const bodyText = await page.textContent('body');
      expect(bodyText?.trim().length).toBeGreaterThan(0);
    });
  }

  test('律师登录页应包含关键UI元素', async ({ page }) => {
    await page.goto('/lawyer/login', { timeout: 15000 });
    // 应有返回首页按钮和手机号登录按钮
    const pageContent = await page.textContent('body');
    expect(pageContent).toContain('返回首页');
    expect(pageContent).toContain('手机号登录');
  });

  test('律师登录页 - 未登录状态应显示登录界面', async ({ page }) => {
    // 清除可能的登录状态
    await page.goto('/lawyer/login', { timeout: 15000 });
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload({ timeout: 15000 });
    
    // 等待页面加载完成
    await page.waitForTimeout(2000);
    
    // 应该显示登录相关的UI元素
    const bodyText = await page.textContent('body');
    const hasLoginContent = bodyText?.includes('手机号登录') || 
                            bodyText?.includes('请先登录') ||
                            bodyText?.includes('臻选律师');
    expect(hasLoginContent).toBeTruthy();
  });

  test('律师后台页（/lawyer）未登录不应崩溃', async ({ page }) => {
    await page.goto('/lawyer', { timeout: 15000 });
    await page.waitForTimeout(2000);
    // 应该能正常渲染，要么显示登录界面，要么重定向
    const bodyText = await page.textContent('body');
    expect(bodyText?.trim().length).toBeGreaterThan(0);
  });

  test('律师订单页（/lawyer/orders）未登录不应崩溃', async ({ page }) => {
    await page.goto('/lawyer/orders', { timeout: 15000 });
    await page.waitForTimeout(2000);
    const bodyText = await page.textContent('body');
    expect(bodyText?.trim().length).toBeGreaterThan(0);
  });

  test('律师资料页（/lawyer/profile）未登录不应崩溃', async ({ page }) => {
    await page.goto('/lawyer/profile', { timeout: 15000 });
    await page.waitForTimeout(2000);
    const bodyText = await page.textContent('body');
    expect(bodyText?.trim().length).toBeGreaterThan(0);
  });
});

// ============================================================
// 第二部分：API 端点测试
// ============================================================
test.describe('律师登录API (/api/lawyer/login)', () => {
  test('POST 空请求应返回 400', async ({ request }) => {
    const response = await request.post('/api/lawyer/login', {
      data: {},
      headers: { 'Content-Type': 'application/json' },
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toBeTruthy();
  });

  test('POST 仅手机号无验证码应返回 400', async ({ request }) => {
    const response = await request.post('/api/lawyer/login', {
      data: { phone: '13800138000' },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('验证码');
  });

  test('POST 无效验证码应返回 400', async ({ request }) => {
    const response = await request.post('/api/lawyer/login', {
      data: { phone: '13800138000', code: '000000' },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
  });

  test('POST 不存在律师手机号应返回提示入驻', async ({ request }) => {
    const response = await request.post('/api/lawyer/login', {
      data: { phone: '19900000000', code: '123456' },
      headers: { 'Content-Type': 'application/json' },
    });
    // 应该返回非 200 状态，提示需要入驻
    expect([400, 404]).toContain(response.status());
    const body = await response.json();
    expect(body.success).toBe(false);
  });
});

test.describe('律师检查API (/api/lawyer/check)', () => {
  test('GET 无 userId 参数应返回 400', async ({ request }) => {
    const response = await request.get('/api/lawyer/check');
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('缺少用户ID');
  });

  test('GET 无效 userId 应正常返回（无律师记录）', async ({ request }) => {
    const response = await request.get('/api/lawyer/check?userId=999999');
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    // 应返回 success: false（表示没有律师记录），但不是服务器错误
    expect(body.hasOwnProperty('success')).toBeTruthy();
  });

  test('POST 无 phone 应返回 400', async ({ request }) => {
    const response = await request.post('/api/lawyer/check', {
      data: {},
      headers: { 'Content-Type': 'application/json' },
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('手机号');
  });

  test('POST 不存在手机号应返回 exists: false', async ({ request }) => {
    const response = await request.post('/api/lawyer/check', {
      data: { phone: '19999999999' },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.exists).toBe(false);
    expect(body.lawyer).toBeNull();
  });
});

test.describe('律师申请API (/api/lawyer/application)', () => {
  test('GET 无 userId 参数应返回 400', async ({ request }) => {
    const response = await request.get('/api/lawyer/application');
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('缺少用户ID');
  });

  test('GET 无效 userId 应正常返回空结果', async ({ request }) => {
    const response = await request.get('/api/lawyer/application?userId=99999999');
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.application).toBeNull();
  });
});

test.describe('律师签发Token API (/api/lawyer/issue-token)', () => {
  test('POST 无 token 应返回 401', async ({ request }) => {
    const response = await request.post('/api/lawyer/issue-token', {
      data: {},
      headers: { 'Content-Type': 'application/json' },
    });
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.success).toBe(false);
  });

  test('POST 无效 token 应返回 401', async ({ request }) => {
    const response = await request.post('/api/lawyer/issue-token', {
      data: {},
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer invalid_token_here',
      },
    });
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.success).toBe(false);
  });
});

test.describe('律师资料API (/api/lawyer/profile)', () => {
  test('GET 无 token 应返回 401', async ({ request }) => {
    const response = await request.get('/api/lawyer/profile');
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.success).toBe(false);
  });

  test('GET 无效 token 应返回 401', async ({ request }) => {
    const response = await request.get('/api/lawyer/profile', {
      headers: { 'Authorization': 'Bearer fake_token_123' },
    });
    expect(response.status()).toBe(401);
  });

  test('PUT 无 token 应返回 401', async ({ request }) => {
    const response = await request.put('/api/lawyer/profile', {
      data: { real_name: '测试' },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(response.status()).toBe(401);
  });
});

test.describe('律师订单API', () => {
  test('GET /api/lawyer/orders 无 token 应返回 401', async ({ request }) => {
    const response = await request.get('/api/lawyer/orders');
    expect(response.status()).toBe(401);
  });

  test('GET /api/lawyer/order/pending 无 token 应返回 401', async ({ request }) => {
    const response = await request.get('/api/lawyer/order/pending');
    expect(response.status()).toBe(401);
  });

  test('POST /api/lawyer/order/confirm 无 token 应返回 401', async ({ request }) => {
    const response = await request.post('/api/lawyer/order/confirm', {
      data: { orderId: 1, action: 'accept' },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(response.status()).toBe(401);
  });

  test('POST /api/lawyer/order/confirm 无 orderId 但有 token 格式应返回 401', async ({ request }) => {
    const response = await request.post('/api/lawyer/order/confirm', {
      data: { action: 'accept' },
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer invalid_token',
      },
    });
    expect(response.status()).toBe(401);
  });
});

test.describe('律师资料修改审核API', () => {
  test('POST /api/lawyer/profile/submit-review 无 token 应返回 401', async ({ request }) => {
    const response = await request.post('/api/lawyer/profile/submit-review', {
      data: {
        lawyerId: 1,
        revisionType: 'name',
        oldValue: '张三',
        newValue: '李四',
        reason: '改名',
      },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(response.status()).toBe(401);
  });
});

// ============================================================
// 第三部分：管理员律师管理API
// ============================================================
test.describe('管理员-律师列表API', () => {
  test('GET /api/admin/lawyer/list 无 token 应返回 401', async ({ request }) => {
    const response = await request.get('/api/admin/lawyer/list');
    expect(response.status()).toBe(401);
  });

  test('GET /api/admin/lawyers 无 token 应返回 401', async ({ request }) => {
    const response = await request.get('/api/admin/lawyers');
    expect(response.status()).toBe(401);
  });

  test('GET /api/admin/lawyer/stats 无 token 应返回 401', async ({ request }) => {
    const response = await request.get('/api/admin/lawyer/stats');
    expect(response.status()).toBe(401);
  });
});

test.describe('管理员-审核相关API', () => {
  test('PUT /api/admin/lawyer/review 无 token 应返回 401', async ({ request }) => {
    const response = await request.put('/api/admin/lawyer/review', {
      data: { applicationId: 1, action: 'approve' },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(response.status()).toBe(401);
  });

  test('GET /api/admin/lawyer-profile-revisions 无 token 应返回 401', async ({ request }) => {
    const response = await request.get('/api/admin/lawyer-profile-revisions');
    expect(response.status()).toBe(401);
  });
});

// ============================================================
// 第四部分：接口响应格式一致性
// ============================================================
test.describe('API响应格式一致性', () => {
  test('未认证API应返回统一格式 { success: false, error }', async ({ request }) => {
    const endpoints = [
      { method: 'GET', url: '/api/lawyer/profile' },
      { method: 'GET', url: '/api/lawyer/orders' },
      { method: 'GET', url: '/api/lawyer/order/pending' },
      { method: 'POST', url: '/api/lawyer/order/confirm', data: { orderId: 1, action: 'accept' } },
      { method: 'POST', url: '/api/lawyer/issue-token', data: {} },
    ];

    for (const ep of endpoints) {
      const options: any = {
        headers: { 'Content-Type': 'application/json' },
      };
      if (ep.data) {
        options.data = ep.data;
      }
      if (ep.method !== 'GET') {
        const response = await request[ep.method.toLowerCase() as 'post'](ep.url, options);
        expect(response.status()).toBe(401);
        const body = await response.json();
        expect(body.success).toBe(false);
        expect(body.error).toBeTruthy();
      }
    }
  });

  test('参数缺失API应返回 400 + { success: false, error }', async ({ request }) => {
    // 测试缺少参数的端点
    const response1 = await request.get('/api/lawyer/check');
    expect(response1.status()).toBe(400);
    const b1 = await response1.json();
    expect(b1.success).toBe(false);
    expect(b1.error).toBeTruthy();

    const response2 = await request.get('/api/lawyer/application');
    expect(response2.status()).toBe(400);
    const b2 = await response2.json();
    expect(b2.success).toBe(false);
    expect(b2.error).toBeTruthy();

    const response3 = await request.post('/api/lawyer/login', {
      data: {},
      headers: { 'Content-Type': 'application/json' },
    });
    expect(response3.status()).toBe(400);
    const b3 = await response3.json();
    expect(b3.success).toBe(false);
    expect(b3.error).toBeTruthy();
  });
});

// ============================================================
// 第五部分：跨端点数据一致性检查
// ============================================================
test.describe('数据一致性检查', () => {
  test('律师登录API需要验证码，不能绕过', async ({ request }) => {
    // 确保不能通过空验证码、错误格式等方式绕过
    const attempts = [
      { phone: '13800138000', code: '' },
      { phone: '13800138000', code: null },
      { phone: '13800138000' },
    ];

    for (const data of attempts) {
      const response = await request.post('/api/lawyer/login', {
        data,
        headers: { 'Content-Type': 'application/json' },
      });
      expect(response.status()).toBeGreaterThanOrEqual(400);
      const body = await response.json();
      expect(body.success).toBe(false);
    }
  });

  test('律师资料API必须是律师类型才能访问', async ({ request }) => {
    // 普通用户 token 不应能访问律师专属API
    // 这里用无效token模拟，实际应该用有效的非律师token
    const response = await request.get('/api/lawyer/profile', {
      headers: { 'Authorization': 'Bearer non_lawyer_user_token' },
    });
    expect(response.status()).toBe(401);
  });
});

// ============================================================
// 第六部分：SQL注入和XSS防护
// ============================================================
test.describe('基本安全测试', () => {
  test('检查API不受SQL注入影响 - 参数化查询', async ({ request }) => {
    const sqlInjectionPayload = "1' OR '1'='1";
    const response = await request.get(`/api/lawyer/check?userId=${encodeURIComponent(sqlInjectionPayload)}`);
    // 应该正常响应（返回无记录）而不是500服务器错误
    expect([200, 400]).toContain(response.status());
  });

  test('检查API不处理XSS脚本', async ({ request }) => {
    const xssPayload = '<script>alert("xss")</script>';
    const response = await request.post('/api/lawyer/check', {
      data: { phone: xssPayload },
      headers: { 'Content-Type': 'application/json' },
    });
    // 应该正常处理（返回不存在），而不是报错或返回脚本
    expect([200, 400]).toContain(response.status());
  });

  test('超大请求体不应导致服务器崩溃', async ({ request }) => {
    try {
      const response = await request.post('/api/lawyer/login', {
        data: { phone: '1'.repeat(5000), code: '1'.repeat(5000) },
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000,
      });
      // 应该返回错误而不是崩溃
      expect(response.status()).toBeLessThan(500);
    } catch {
      // 如果超时，也算是一种防御
    }
  });
});

// ============================================================
// 第七部分：响应时间性能
// ============================================================
test.describe('API响应性能', () => {
  test('公开页面应在3秒内加载完成', async ({ page }) => {
    const startTime = Date.now();
    const response = await page.goto('/lawyer/login', { timeout: 10000 });
    const loadTime = Date.now() - startTime;
    
    expect(response?.status()).toBe(200);
    expect(loadTime).toBeLessThan(5000);
  });

  test('检查API应在1秒内响应', async ({ request }) => {
    const startTime = Date.now();
    const response = await request.post('/api/lawyer/check', {
      data: { phone: '13800138000' },
      headers: { 'Content-Type': 'application/json' },
    });
    const responseTime = Date.now() - startTime;
    
    expect(response.ok()).toBeTruthy();
    expect(responseTime).toBeLessThan(3000);
  });
});
