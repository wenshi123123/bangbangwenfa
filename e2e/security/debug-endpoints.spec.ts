import { test, expect } from '@playwright/test';

test.describe('生产诊断端点保护', () => {
  const protectedDebugEndpoints = [
    '/api/pay/debug-env',
    '/api/diagnose',
  ];

  for (const path of protectedDebugEndpoints) {
    test(`${path} 未带诊断 token 不应公开`, async ({ request }) => {
      const response = await request.get(path);
      expect([401, 403, 404]).toContain(response.status());
    });
  }
});
