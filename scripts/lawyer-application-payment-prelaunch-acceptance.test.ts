import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const source = (file: string) => fs.readFile(path.join(process.cwd(), file), 'utf8');

async function main() {
  const [createRoute, statusRoute, callbackRoute, adminListRoute, adminDetailPage, adminReviewRoute, renewRoute, renewCallback] = await Promise.all([
    source('src/app/api/lawyer/pay/create/route.ts'),
    source('src/app/api/lawyer/pay/status/route.ts'),
    source('src/app/api/lawyer/pay/callback/route.ts'),
    source('src/app/api/admin/lawyer/list/route.ts'),
    source('src/app/admin/lawyer/[id]/page.tsx'),
    source('src/app/api/admin/lawyer/review/route.ts'),
    source('src/app/api/lawyer/renew/route.ts'),
    source('src/app/api/lawyer/renew/callback/route.ts'),
  ]);

  // 订单创建与生命周期：服务端释放过期单、失败单可另行新建、并发时复用唯一赢家订单。
  assert.match(createRoute, /update\(\{ status: 'expired'/, 'expired pending orders must be released before creating another order');
  assert.match(createRoute, /createOrderError\?\.code === '23505'/, 'concurrent active-order conflicts must reuse the database winner');
  assert.match(createRoute, /\['creating', 'pending'\]/, 'only active orders are reused');
  assert.match(createRoute, /status: 'failed'/, 'failed payment creation must be recorded as failed rather than active');

  // 状态查询：新订单与关联申请都必须属于当前用户，已支付申请不能继续走创建分支。
  assert.match(statusRoute, /String\(paymentOrder\.user_id\) !== String\(auth\.user\.id\)/, 'new-order status must verify the order owner');
  assert.match(statusRoute, /String\(application\.user_id\) !== String\(auth\.user\.id\)/, 'new-order status must verify the related application owner');
  assert.match(createRoute, /NO_PAYABLE_APPLICATION/, 'paid applications must not create a fresh entry-payment order');

  // 回调：签名先行，金额与状态检查、幂等、新旧订单兼容，且不把付款当成审核通过或续费。
  assert.match(callbackRoute, /verifyWechatPaySignature/, 'callback must verify WeChat signatures');
  assert.match(callbackRoute, /paymentOrder\.amount !== paymentResult\.amount\.total/, 'callback must reject new-order amount mismatches');
  assert.match(callbackRoute, /application\.package_price !== paymentResult\.amount\.total/, 'callback must reject legacy-order amount mismatches');
  assert.match(callbackRoute, /paymentOrder\.status === 'paid'/, 'duplicate successful callbacks must be idempotent');
  assert.match(callbackRoute, /\.in\('status', \['creating', 'pending'\]\)/, 'callback must use an atomic active-to-paid state transition');
  assert.match(callbackRoute, /\/\/ 历史订单兼容/, 'legacy entry-payment callbacks must remain supported');
  assert.doesNotMatch(callbackRoute, /review_status:\s*'approved'|member_expires_at|lawyer_renew_orders/, 'payment callback must not approve lawyers or trigger renewal');

  // 管理端显示支付与审核为独立状态；付款本身不自动成为律师，审核通过仍沿既有审核端点进行。
  assert.match(adminListRoute, /\.eq\('payment_status', 'paid'\)/, 'admin list must be able to identify paid applications');
  assert.match(adminDetailPage, /支付状态：\{application\.payment_status === 'paid' \? '已支付' : '未支付'\}/, 'admin detail must display payment status separately');
  assert.match(adminDetailPage, /application\.review_status === 'pending'/, 'admin detail must keep review state separate from payment state');
  assert.match(adminReviewRoute, /if \(action === 'approve'\)/, 'lawyer benefits remain in the existing explicit approval flow');

  // 律师续费仍保持独立表和回调。
  assert.match(renewRoute, /lawyer_renew_orders/, 'renewal creation must remain isolated');
  assert.match(renewCallback, /lawyer_renew_orders/, 'renewal callback must remain isolated');

  console.log('lawyer application payment prelaunch acceptance contract passed');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
