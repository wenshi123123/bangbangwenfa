import crypto from 'crypto';

export type LocalTestRole = 'user' | 'lawyer' | 'admin';

function enabled() {
  return process.env.NODE_ENV !== 'production' && process.env.DEPLOY_ENV !== 'PROD' && process.env.LOCAL_TEST_ACCOUNTS === 'true';
}

function matches(actual: string, expected: string | undefined) {
  if (!expected) return false;
  const left = Buffer.from(actual);
  const right = Buffer.from(expected);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export function findLocalTestAccount(account: string, password: string) {
  if (!enabled()) return null;
  const entries: Array<{ role: LocalTestRole; account?: string; password?: string; id: number; nickname: string }> = [
    { role: 'user', account: process.env.LOCAL_TEST_USER_ACCOUNT, password: process.env.LOCAL_TEST_USER_PASSWORD, id: 9101, nickname: process.env.LOCAL_TEST_USER_ACCOUNT || '' },
    { role: 'lawyer', account: process.env.LOCAL_TEST_LAWYER_ACCOUNT, password: process.env.LOCAL_TEST_LAWYER_PASSWORD, id: 9102, nickname: process.env.LOCAL_TEST_LAWYER_ACCOUNT || '' },
    { role: 'admin', account: process.env.LOCAL_TEST_ADMIN_ACCOUNT, password: process.env.LOCAL_TEST_ADMIN_PASSWORD, id: 9103, nickname: '本地测试管理员' },
  ];
  return entries.find((entry) => entry.account === account && matches(password, entry.password)) || null;
}

export function isLocalTestAdminId(id: number) {
  return enabled() && id === 9103;
}
