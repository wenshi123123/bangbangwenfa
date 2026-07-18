import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const source = (file: string) => readFile(path.join(root, file), 'utf8');

async function main() {
  const [authHook, userCenter, middleware, loginModal] = await Promise.all([
    source('src/hooks/use-auth.tsx'),
    source('src/app/user/page.tsx'),
    source('src/middleware.ts'),
    source('src/components/auth/login-modal.tsx'),
  ]);

  assert.doesNotMatch(authHook, /兼容旧的 guardian_user 存储/, '旧守护者缓存不能在没有有效令牌时当成登录状态');
  assert.match(authHook, /localStorage\.removeItem\('guardian_user'\)/, '无效认证状态必须清理守护者缓存');
  assert.match(authHook, /checkAuth\(\)/, '登录成功事件必须重新按有效令牌校验认证状态');

  assert.doesNotMatch(userCenter, /window\.location\.replace\('\/register\?next=\/user'\)/, '个人中心未登录时不能强制跳转注册页');
  assert.match(userCenter, /open-login-modal/, '个人中心未登录时必须提供正常登录入口');
  assert.doesNotMatch(middleware, /redirectUrl\.pathname = '\/register'/, '路由守卫未登录时不能跳注册页');
  assert.match(middleware, /searchParams\.set\('login', '1'\)/, '路由守卫必须携带打开登录框的标记');
  assert.match(loginModal, /useSearchParams/, '登录弹窗必须能读取路由守卫携带的登录标记');
  assert.match(loginModal, /searchParams\.get\(["']login["']\)/, '登录弹窗收到登录标记后必须自行打开');
  assert.match(loginModal, /setIsOpen\(true\)/, '登录标记必须真正打开登录弹窗');

  console.log('auth state consistency test passed');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
