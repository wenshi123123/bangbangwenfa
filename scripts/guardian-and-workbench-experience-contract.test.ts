import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const source = (file: string) => readFile(path.join(process.cwd(), file), 'utf8');

async function main() {
  const [guardianCenter, shareDrawer, bindWechat, bindQrcode, bottomNav, authHook, dashboard, ordersPage, profilePage, profileRoute] = await Promise.all([
    source('src/app/guardian/center/page.tsx'),
    source('src/components/guardian/guardian-share-drawer.tsx'),
    source('src/app/api/guardian/bind-wechat/route.ts'),
    source('src/app/api/guardian/bind-qrcode/route.ts'),
    source('src/components/lawyer/lawyer-bottom-nav.tsx'),
    source('src/hooks/use-lawyer-auth.ts'),
    source('src/app/lawyer/page.tsx'),
    source('src/app/lawyer/orders/page.tsx'),
    source('src/app/lawyer/profile/page.tsx'),
    source('src/app/api/lawyer/profile/route.ts'),
  ]);

  assert.match(guardianCenter, /copyTextWithFallback/, '守护者中心必须提供剪贴板失败回退');
  assert.match(guardianCenter, /shareError/, '自动复制失败时必须保留可见错误提示');
  assert.match(shareDrawer, /inviteUrl/, '分享抽屉必须提供手动复制的完整链接');
  assert.match(bindWechat, /resolveGuardianId/, 'JSON 收款码绑定必须统一使用守护者身份解析');
  assert.match(bindQrcode, /resolveGuardianId/, '文件收款码绑定必须统一使用守护者身份解析');
  assert.doesNotMatch(bindWechat, /auth\.userType !== 'guardian'/, '绑定接口不得重复要求 guardian 专用 token');
  assert.doesNotMatch(bindQrcode, /auth\.userType !== 'guardian'/, '文件绑定接口不得重复要求 guardian 专用 token');

  assert.match(bottomNav, /if \(active\) return/, '当前工作台标签重复点击不得重新导航');
  assert.match(authHook, /ACCOUNT_STATUS_CACHE_TTL/, '律师账号状态检查必须短时缓存');
  assert.match(dashboard, /getLawyerCachedData/, '工作台必须短时缓存资料和待处理订单');
  assert.match(ordersPage, /getLawyerCachedData/, '订单标签页必须短时缓存订单列表');
  assert.match(profilePage, /getLawyerCachedData/, '我的标签页必须短时缓存律师资料');
  assert.doesNotMatch(dashboard, /initRef\.current && !authLoading && !loading && !profile/, '工作台不得因空资料状态重复初始化请求');
  assert.match(profileRoute, /Promise\.all\(/, '资料接口的统计查询必须并行执行');

  console.log('guardian and workbench experience contract passed');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
