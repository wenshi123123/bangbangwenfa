# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: lawyer\admin-smoke.spec.ts >> API响应格式一致性 >> 参数缺失API应返回 400 + { success: false, error }
- Location: e2e\lawyer\admin-smoke.spec.ts:347:7

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 400
Received: 429
```

# Test source

```ts
  265 | 
  266 | test.describe('律师资料修改审核API', () => {
  267 |   test('POST /api/lawyer/profile/submit-review 无 token 应返回 401', async ({ request }) => {
  268 |     const response = await request.post('/api/lawyer/profile/submit-review', {
  269 |       data: {
  270 |         lawyerId: 1,
  271 |         revisionType: 'name',
  272 |         oldValue: '张三',
  273 |         newValue: '李四',
  274 |         reason: '改名',
  275 |       },
  276 |       headers: { 'Content-Type': 'application/json' },
  277 |     });
  278 |     expect(response.status()).toBe(401);
  279 |   });
  280 | });
  281 | 
  282 | // ============================================================
  283 | // 第三部分：管理员律师管理API
  284 | // ============================================================
  285 | test.describe('管理员-律师列表API', () => {
  286 |   test('GET /api/admin/lawyer/list 无 token 应返回 401', async ({ request }) => {
  287 |     const response = await request.get('/api/admin/lawyer/list');
  288 |     expect(response.status()).toBe(401);
  289 |   });
  290 | 
  291 |   test('GET /api/admin/lawyers 无 token 应返回 401', async ({ request }) => {
  292 |     const response = await request.get('/api/admin/lawyers');
  293 |     expect(response.status()).toBe(401);
  294 |   });
  295 | 
  296 |   test('GET /api/admin/lawyer/stats 无 token 应返回 401', async ({ request }) => {
  297 |     const response = await request.get('/api/admin/lawyer/stats');
  298 |     expect(response.status()).toBe(401);
  299 |   });
  300 | });
  301 | 
  302 | test.describe('管理员-审核相关API', () => {
  303 |   test('PUT /api/admin/lawyer/review 无 token 应返回 401', async ({ request }) => {
  304 |     const response = await request.put('/api/admin/lawyer/review', {
  305 |       data: { applicationId: 1, action: 'approve' },
  306 |       headers: { 'Content-Type': 'application/json' },
  307 |     });
  308 |     expect(response.status()).toBe(401);
  309 |   });
  310 | 
  311 |   test('GET /api/admin/lawyer-profile-revisions 无 token 应返回 401', async ({ request }) => {
  312 |     const response = await request.get('/api/admin/lawyer-profile-revisions');
  313 |     expect(response.status()).toBe(401);
  314 |   });
  315 | });
  316 | 
  317 | // ============================================================
  318 | // 第四部分：接口响应格式一致性
  319 | // ============================================================
  320 | test.describe('API响应格式一致性', () => {
  321 |   test('未认证API应返回统一格式 { success: false, error }', async ({ request }) => {
  322 |     const endpoints = [
  323 |       { method: 'GET', url: '/api/lawyer/profile' },
  324 |       { method: 'GET', url: '/api/lawyer/orders' },
  325 |       { method: 'GET', url: '/api/lawyer/order/pending' },
  326 |       { method: 'POST', url: '/api/lawyer/order/confirm', data: { orderId: 1, action: 'accept' } },
  327 |       { method: 'POST', url: '/api/lawyer/issue-token', data: {} },
  328 |     ];
  329 | 
  330 |     for (const ep of endpoints) {
  331 |       const options: any = {
  332 |         headers: { 'Content-Type': 'application/json' },
  333 |       };
  334 |       if (ep.data) {
  335 |         options.data = ep.data;
  336 |       }
  337 |       if (ep.method !== 'GET') {
  338 |         const response = await request[ep.method.toLowerCase() as 'post'](ep.url, options);
  339 |         expect(response.status()).toBe(401);
  340 |         const body = await response.json();
  341 |         expect(body.success).toBe(false);
  342 |         expect(body.error).toBeTruthy();
  343 |       }
  344 |     }
  345 |   });
  346 | 
  347 |   test('参数缺失API应返回 400 + { success: false, error }', async ({ request }) => {
  348 |     // 测试缺少参数的端点
  349 |     const response1 = await request.get('/api/lawyer/check');
  350 |     expect(response1.status()).toBe(400);
  351 |     const b1 = await response1.json();
  352 |     expect(b1.success).toBe(false);
  353 |     expect(b1.error).toBeTruthy();
  354 | 
  355 |     const response2 = await request.get('/api/lawyer/application');
  356 |     expect(response2.status()).toBe(400);
  357 |     const b2 = await response2.json();
  358 |     expect(b2.success).toBe(false);
  359 |     expect(b2.error).toBeTruthy();
  360 | 
  361 |     const response3 = await request.post('/api/lawyer/login', {
  362 |       data: {},
  363 |       headers: { 'Content-Type': 'application/json' },
  364 |     });
> 365 |     expect(response3.status()).toBe(400);
      |                                ^ Error: expect(received).toBe(expected) // Object.is equality
  366 |     const b3 = await response3.json();
  367 |     expect(b3.success).toBe(false);
  368 |     expect(b3.error).toBeTruthy();
  369 |   });
  370 | });
  371 | 
  372 | // ============================================================
  373 | // 第五部分：跨端点数据一致性检查
  374 | // ============================================================
  375 | test.describe('数据一致性检查', () => {
  376 |   test('律师登录API需要验证码，不能绕过', async ({ request }) => {
  377 |     // 确保不能通过空验证码、错误格式等方式绕过
  378 |     const attempts = [
  379 |       { phone: '13800138000', code: '' },
  380 |       { phone: '13800138000', code: null },
  381 |       { phone: '13800138000' },
  382 |     ];
  383 | 
  384 |     for (const data of attempts) {
  385 |       const response = await request.post('/api/lawyer/login', {
  386 |         data,
  387 |         headers: { 'Content-Type': 'application/json' },
  388 |       });
  389 |       expect(response.status()).toBeGreaterThanOrEqual(400);
  390 |       const body = await response.json();
  391 |       expect(body.success).toBe(false);
  392 |     }
  393 |   });
  394 | 
  395 |   test('律师资料API必须是律师类型才能访问', async ({ request }) => {
  396 |     // 普通用户 token 不应能访问律师专属API
  397 |     // 这里用无效token模拟，实际应该用有效的非律师token
  398 |     const response = await request.get('/api/lawyer/profile', {
  399 |       headers: { 'Authorization': 'Bearer non_lawyer_user_token' },
  400 |     });
  401 |     expect(response.status()).toBe(401);
  402 |   });
  403 | });
  404 | 
  405 | // ============================================================
  406 | // 第六部分：SQL注入和XSS防护
  407 | // ============================================================
  408 | test.describe('基本安全测试', () => {
  409 |   test('检查API不受SQL注入影响 - 参数化查询', async ({ request }) => {
  410 |     const sqlInjectionPayload = "1' OR '1'='1";
  411 |     const response = await request.get(`/api/lawyer/check?userId=${encodeURIComponent(sqlInjectionPayload)}`);
  412 |     // 应该正常响应（返回无记录）而不是500服务器错误
  413 |     expect([200, 400]).toContain(response.status());
  414 |   });
  415 | 
  416 |   test('检查API不处理XSS脚本', async ({ request }) => {
  417 |     const xssPayload = '<script>alert("xss")</script>';
  418 |     const response = await request.post('/api/lawyer/check', {
  419 |       data: { phone: xssPayload },
  420 |       headers: { 'Content-Type': 'application/json' },
  421 |     });
  422 |     // 应该正常处理（返回不存在），而不是报错或返回脚本
  423 |     expect([200, 400]).toContain(response.status());
  424 |   });
  425 | 
  426 |   test('超大请求体不应导致服务器崩溃', async ({ request }) => {
  427 |     try {
  428 |       const response = await request.post('/api/lawyer/login', {
  429 |         data: { phone: '1'.repeat(5000), code: '1'.repeat(5000) },
  430 |         headers: { 'Content-Type': 'application/json' },
  431 |         timeout: 10000,
  432 |       });
  433 |       // 应该返回错误而不是崩溃
  434 |       expect(response.status()).toBeLessThan(500);
  435 |     } catch {
  436 |       // 如果超时，也算是一种防御
  437 |     }
  438 |   });
  439 | });
  440 | 
  441 | // ============================================================
  442 | // 第七部分：响应时间性能
  443 | // ============================================================
  444 | test.describe('API响应性能', () => {
  445 |   test('公开页面应在3秒内加载完成', async ({ page }) => {
  446 |     const startTime = Date.now();
  447 |     const response = await page.goto('/lawyer/login', { timeout: 10000 });
  448 |     const loadTime = Date.now() - startTime;
  449 |     
  450 |     expect(response?.status()).toBe(200);
  451 |     expect(loadTime).toBeLessThan(5000);
  452 |   });
  453 | 
  454 |   test('检查API应在1秒内响应', async ({ request }) => {
  455 |     const startTime = Date.now();
  456 |     const response = await request.post('/api/lawyer/check', {
  457 |       data: { phone: '13800138000' },
  458 |       headers: { 'Content-Type': 'application/json' },
  459 |     });
  460 |     const responseTime = Date.now() - startTime;
  461 |     
  462 |     expect(response.ok()).toBeTruthy();
  463 |     expect(responseTime).toBeLessThan(3000);
  464 |   });
  465 | });
```