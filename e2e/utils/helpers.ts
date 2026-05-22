/**
 * E2E 测试辅助函数
 */
import { Page, APIRequestContext } from '@playwright/test';

/**
 * 等待页面网络空闲
 */
export async function waitForPageReady(page: Page, timeout = 10000) {
  await page.waitForLoadState('networkidle', { timeout }).catch(() => {
    // 某些页面持续有轮询请求，忽略超时
  });
}

/**
 * 验证页面关键元素可见（不抛错的软验证）
 */
export async function softExpectVisible(page: Page, selector: string, timeout = 3000) {
  try {
    await page.waitForSelector(selector, { state: 'visible', timeout });
    return true;
  } catch {
    return false;
  }
}

/**
 * API 健康检查
 */
export async function apiHealthCheck(request: APIRequestContext): Promise<{
  ok: boolean;
  uptime?: number;
  error?: string;
}> {
  try {
    const res = await request.get('/api/health');
    if (res.status() !== 200) return { ok: false, error: `status=${res.status()}` };
    const body = await res.json();
    return { ok: true, uptime: body.uptime };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

/**
 * 获取安全的测试手机号（避免影响生产数据）
 */
export function testPhone(index: number): string {
  return `1380013${String(index).padStart(4, '0')}`;
}
