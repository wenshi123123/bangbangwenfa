import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const source = (file: string) => readFile(path.join(process.cwd(), file), 'utf8');

function between(content: string, start: string, end: string): string {
  const startIndex = content.indexOf(start);
  const endIndex = content.indexOf(end, startIndex + start.length);
  assert.notEqual(startIndex, -1, `缺少区段起点：${start}`);
  assert.notEqual(endIndex, -1, `缺少区段终点：${end}`);
  return content.slice(startIndex, endIndex);
}

async function main() {
  const [loginRoute, middleware] = await Promise.all([
    source('src/app/api/auth/login/route.ts'),
    source('src/middleware.ts'),
  ]);

  const guardianLogin = between(loginRoute, '// 2. 查 guardian_users 表（守护者）', '// 3. 查 lawyer_applications 表（律师申请）');
  const lawyerLogin = between(loginRoute, "if (lawyerApp.review_status === 'approved')", '// 4. 都没找到，提示注册');

  assert.match(guardianLogin, /return attachAuthCookie\(NextResponse\.json\(/, '守护者登录成功必须同时写入认证 Cookie');
  assert.match(lawyerLogin, /return attachAuthCookie\(NextResponse\.json\(/, '律师登录成功必须同时写入认证 Cookie');
  assert.doesNotMatch(
    middleware,
    /if \(\(pathname === '\/user' \|\| pathname === '\/me'\) && !tokenCookie && !authSyncCookie\)/,
    '个人中心不能只因 Cookie 缺失而跳过前端令牌校验',
  );

  console.log('auth navigation consistency test passed');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
