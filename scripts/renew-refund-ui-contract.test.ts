import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';

const successPage = readFileSync('src/app/success/page.tsx', 'utf8');
const userPage = readFileSync('src/app/user/page.tsx', 'utf8');

assert.match(successPage, /orderType === ['\"]renew['\"]/, 'success page must recognize renewal return type');
assert.match(successPage, /orderType === ['\"]renew['\"][\s\S]*\/api\/lawyer\/pay\/status/, 'renewal return must query lawyer payment status');
assert.match(successPage, /!isLawyerPayment && order && paymentConfirmed/, 'renewal success must not show the consultation-only confirmation panel');
assert.match(successPage, /isRenewalOrder \? ['\"]\/lawyer\/renew['\"]/, 'renewal retry must return to the renewal page');
assert.match(userPage, /退款原因/, 'refund UI must show a reason selector');
assert.match(userPage, /服务尚未开始/, 'refund UI must provide a clear reason option');
assert.doesNotMatch(userPage, /window\.prompt\(['\"]请填写退款原因/, 'refund UI must not rely on a browser prompt in WeChat');
assert.match(userPage, /退款申请已提交|退款处理中|退款已完成|退款已拒绝/, 'refund UI must expose request status');

console.log('renewal return and refund UI contract tests passed');
