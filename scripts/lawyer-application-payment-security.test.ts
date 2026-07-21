import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

async function source(file: string): Promise<string> {
  try {
    return await fs.readFile(path.join(process.cwd(), file), 'utf8');
  } catch (error: any) {
    if (error?.code === 'ENOENT') return '';
    throw error;
  }
}

async function main() {
  const [createRoute, statusRoute, callbackRoute, payPage, renewRoute, renewCallback, contextRoute, migration] = await Promise.all([
    source('src/app/api/lawyer/pay/create/route.ts'),
    source('src/app/api/lawyer/pay/status/route.ts'),
    source('src/app/api/lawyer/pay/callback/route.ts'),
    source('src/app/lawyer/pay/page.tsx'),
    source('src/app/api/lawyer/renew/route.ts'),
    source('src/app/api/lawyer/renew/callback/route.ts'),
    source('src/app/api/lawyer/payment-context/route.ts'),
    source('scripts/lawyer-application-payment-orders.sql'),
  ]);

  // 正常链路：支付页只能通过当前登录用户读取本人支付上下文，不能把申请编号当作授权输入。
  assert.notEqual(contextRoute, '', 'payment context route must exist');
  assert.notEqual(migration, '', 'entry-payment migration must exist');
  assert.match(contextRoute, /authenticateRequest\(request\)/, 'payment context must require a logged-in user');
  assert.match(contextRoute, /\.eq\('user_id',\s*String\(auth\.user!\.id\)\)/, 'payment context must query only the current user application');
  assert.doesNotMatch(payPage, /searchParams\.get\('applicationId'\)/, 'payment page must not select a payment application from URL');
  assert.doesNotMatch(createRoute, /const effectiveAppId = applicationId \|\| queryAppId/, 'payment creation must not authorize with applicationId');
  assert.match(createRoute, /if \(!auth\?\.success/, 'payment creation must reject unauthenticated requests');

  // 越权与状态查询：订单只能由所属用户读取。
  assert.match(statusRoute, /lawyer_application_payment_orders/, 'entry payment status must use the dedicated order table');
  assert.match(statusRoute, /String\([\s\S]*user_id[\s\S]*\) !== String\(auth\.user\.id\)/, 'entry payment status must enforce order ownership');

  // 生命周期：一个申请只能有一个有效订单，状态需覆盖 creating/pending/paid/failed/expired。
  assert.match(migration, /CREATE TABLE IF NOT EXISTS lawyer_application_payment_orders/, 'migration must create isolated entry-payment orders');
  assert.match(migration, /status[\s\S]*creating[\s\S]*pending[\s\S]*paid[\s\S]*failed[\s\S]*expired/i, 'migration must define the full payment lifecycle');
  assert.match(migration, /UNIQUE INDEX[\s\S]*application_id[\s\S]*creating[\s\S]*pending/i, 'migration must prevent concurrent active orders per application');
  assert.match(createRoute, /creating/, 'creation must reserve an order before calling WeChat Pay');
  assert.match(createRoute, /payment_expires_at/, 'creation must expire stale orders before replacement');

  // 回调：新订单优先、旧申请表回退；新入驻回调不得进入续费逻辑。
  assert.match(callbackRoute, /lawyer_application_payment_orders/, 'callback must locate new entry-payment orders first');
  assert.match(callbackRoute, /lawyer_applications/, 'callback must retain legacy application-order fallback');
  assert.doesNotMatch(callbackRoute, /member_expires_at/, 'new entry-payment callback must not renew an existing lawyer membership');

  // 续费隔离：续费仍只使用自己的订单表与回调。
  assert.match(renewRoute, /lawyer_renew_orders/, 'renewal creation must remain isolated');
  assert.match(renewCallback, /lawyer_renew_orders/, 'renewal callback must remain isolated');

  console.log('lawyer application payment security contract test passed');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
