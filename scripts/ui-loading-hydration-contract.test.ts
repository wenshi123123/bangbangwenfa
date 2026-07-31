import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { withTimeout } from '../src/lib/ui/with-timeout';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

const guardian = read('src/app/guardian/center/page.tsx');
const guardianLoader = read('src/lib/guardian/load-center-data.ts');
const civil = read('src/components/consult/civil-consultation-wizard.tsx');
const messages = read('src/app/user/messages/page.tsx');
const admin = read('src/app/admin/dashboard/page.tsx');
const lawyerJoin = read('src/app/lawyer/join/page.tsx');

assert.match(guardian, /loadGuardianCenterData/);
assert.match(guardian, /GuardianCenterLoadTimeoutError/);
assert.match(guardianLoader, /UI_LOAD_TIMEOUT_MS/);
assert.match(guardianLoader, /controller\.abort/);
assert.match(guardian, /loadError/);
assert.match(guardian, /加载失败/);
assert.match(guardianLoader, /readSuccessfulJson/);
assert.match(civil, /authLoadTimedOut/);
assert.match(civil, /登录状态加载超时/);
assert.doesNotMatch(messages, /const hasToken = typeof window !== 'undefined' \? !!localStorage\.getItem\('token'\)/);
assert.match(messages, /loadError/);
assert.match(messages, /通知接口返回异常/);
assert.match(admin, /loadError/);
assert.match(admin, /数据加载失败/);
assert.match(admin, /后台统计接口返回异常/);
assert.doesNotMatch(lawyerJoin, /^\s*["']use client["'];/);

void (async () => {
  await assert.rejects(
    () => withTimeout(new Promise<never>(() => undefined), 5),
    /请求超时/
  );
  console.log('UI loading and hydration contract checks passed');
})();
