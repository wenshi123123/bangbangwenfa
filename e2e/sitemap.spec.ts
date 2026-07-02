import { test, expect } from '@playwright/test';

/**
 * 站点地图完整性测试
 * 检查所有关键路由是否返回非错误状态
 */
test.describe('站点地图完整性', () => {
  const sitemap = [
    // 公共页面
    { path: '/', name: '首页' },
    { path: '/consult', name: '法律咨询' },
    { path: '/civil', name: '民事' },
    { path: '/register', name: '注册' },
    { path: '/about', name: '关于' },
    { path: '/privacy-policy', name: '隐私政策' },
    { path: '/user-agreement', name: '用户协议' },
    { path: '/lawyer-commitment', name: '律师承诺' },
    { path: '/lawyer-entry-agreement', name: '入驻协议' },

    // 律师页面
    { path: '/lawyer', name: '律师首页' },
    { path: '/lawyer/join', name: '律师入驻' },
    { path: '/lawyer/login', name: '律师登录' },

    // 守护者
    { path: '/guardian', name: '守护者' },

    // 支付
    { path: '/pay', name: '支付' },

    // 管理后台
    { path: '/admin/login', name: '管理员登录' },

    // API
    { path: '/api/health', name: '健康检查API' },
    { path: '/api/price', name: '价格API' },
  ];

  for (const { path, name } of sitemap) {
    test(`${name} (${path}) HTTP状态正常`, async ({ page, request }) => {
      // API 用 request，页面用 page
      if (path.startsWith('/api/')) {
        const res = await request.get(path);
        expect(res.status()).toBeLessThan(500);
        return;
      }

      const response = await page.goto(path);
      const status = response?.status() || 0;
      // 200-499 之间都是可接受的（401/403 表示正确拦截）
      expect(status).toBeLessThan(500);
      expect(status).toBeGreaterThanOrEqual(200);
    });
  }

  test('robots.txt 存在且格式正确', async ({ request }) => {
    const res = await request.get('/robots.txt');
    expect(res.status()).toBe(200);
    const text = await res.text();
    expect(text.length).toBeGreaterThan(0);
    expect(text.toLowerCase()).toContain('user-agent');
  });

  test('sitemap.xml 存在且包含关键页面', async ({ request }) => {
    const res = await request.get('/sitemap.xml');
    expect(res.status()).toBe(200);
    const text = await res.text();
    expect(text.length).toBeGreaterThan(0);
    expect(text.toLowerCase()).toContain('<urlset');
    expect(text).toContain('/consult');
    expect(text).toContain('/lawyer/join');
  });
});
