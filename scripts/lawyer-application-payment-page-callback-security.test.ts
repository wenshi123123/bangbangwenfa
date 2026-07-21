import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

async function source(file: string): Promise<string> {
  return fs.readFile(path.join(process.cwd(), file), 'utf8');
}

async function main() {
  const [page, callback, renewRoute, renewCallback] = await Promise.all([
    source('src/app/lawyer/pay/page.tsx'),
    source('src/app/api/lawyer/pay/callback/route.ts'),
    source('src/app/api/lawyer/renew/route.ts'),
    source('src/app/api/lawyer/renew/callback/route.ts'),
  ]);

  // 页面只由本人支付上下文驱动，不能从 URL 或请求体传入申请、金额或用户标识。
  assert.doesNotMatch(page, /useSearchParams|applicationId/, 'payment page must ignore applicationId completely');
  assert.match(page, /fetch\('\/api\/lawyer\/payment-context'/, 'payment page must load the payment context');
  assert.match(page, /fetch\('\/api\/lawyer\/pay\/create'/, 'payment page must create payment only after user action');
  assert.match(page, /body:\s*JSON\.stringify\(\{\}\)/, 'payment page must not submit client-selected payment fields');
  assert.match(page, /\/lawyer\/login\?redirect=/, 'unauthenticated users must have a payment-page login return URL');

  // 新入驻订单必须优先处理，校验金额与归属，并与续费完全隔离。
  assert.match(callback, /\.from\('lawyer_application_payment_orders'\)/, 'callback must query the new application-payment order table');
  assert.match(callback, /\.eq\('order_no',\s*outTradeNo\)/, 'callback must locate new orders by WeChat order number');
  assert.match(callback, /paymentOrder\.amount\s*!==\s*paymentResult\.amount\.total/, 'callback must reject amount mismatches');
  assert.match(callback, /String\(paymentOrder\.user_id\)\s*!==\s*String\(application\.user_id\)/, 'callback must verify order/application ownership');
  assert.match(callback, /status:\s*'paid'/, 'callback must mark the new order as paid');
  assert.match(callback, /wechat_transaction_id:\s*transactionId/, 'callback must persist the WeChat transaction ID');
  assert.match(callback, /\/\/ 历史订单兼容/, 'callback must retain an explicit legacy-order branch');
  assert.doesNotMatch(callback, /member_expires_at|lawyer_renew_orders/, 'entry-payment callback must not execute renewal logic');

  // 续费仍只走自己的既有链路。
  assert.match(renewRoute, /lawyer_renew_orders/, 'renewal creation must stay isolated');
  assert.match(renewCallback, /lawyer_renew_orders/, 'renewal callback must stay isolated');

  console.log('lawyer application payment page and callback security contract passed');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
