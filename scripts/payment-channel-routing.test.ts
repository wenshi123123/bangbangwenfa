import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const consultRoute = readFileSync('src/app/api/pay/create/route.ts', 'utf8');
const lawyerRoute = readFileSync('src/app/api/lawyer/pay/create/route.ts', 'utf8');

for (const route of [consultRoute, lawyerRoute]) {
  assert.match(route, /channel === 'jsapi'/);
  assert.match(route, /getWechatPaymentSession\(request\)/);
  assert.doesNotMatch(route, /if \(isWechat\)[\s\S]{0,500}createH5Order/);
}

console.log('payment channel routing tests passed');
