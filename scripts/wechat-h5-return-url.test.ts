import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

for (const route of [
  'src/app/api/pay/create/route.ts',
  'src/app/api/lawyer/pay/create/route.ts',
]) {
  const source = readFileSync(route, 'utf8');
  assert.match(source, /redirect_url/);
  assert.match(source, /getWechatH5SiteUrl/);
}

for (const page of ['src/app/pay/page.tsx', 'src/app/lawyer/pay/page.tsx']) {
  const source = readFileSync(page, 'utf8');
  assert.doesNotMatch(source, /appendWechatRedirectUrl/);
  assert.doesNotMatch(source, /window\.location\.origin/);
}

console.log('wechat H5 return URL tests passed');
