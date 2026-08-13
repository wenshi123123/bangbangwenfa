import assert from 'node:assert/strict';
import fs from 'node:fs';

const helper = fs.readFileSync('src/lib/notify/payment-paid.ts', 'utf8');
const callback = fs.readFileSync('src/app/api/pay/callback/route.ts', 'utf8');
const legacyCallback = fs.readFileSync('src/app/api/consult/pay/callback/route.ts', 'utf8');
const status = fs.readFileSync('src/app/api/pay/status/route.ts', 'utf8');

assert.match(helper, /wecom_paid_notification_status/);
assert.match(helper, /eq\('payment_status', 'paid'\)/);
assert.match(helper, /event: 'paid'/);
assert.match(callback, /notifyPaidConsultOrderOnce\(order\.id\)/);
assert.match(legacyCallback, /notifyPaidConsultOrderOnce\(result\.order\.id\)/);
assert.match(status, /notifyPaidConsultOrderOnce\(order\.id\)/);
assert.match(helper, /通知幂等字段尚未迁移/);

console.log('payment paid notification contract tests passed');
