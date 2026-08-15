import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const source = (file: string) => readFile(path.join(root, file), 'utf8');

async function main() {
  const [migration, reviewRoute, consultCreate, consultPriceStep, civilPriceStep, renewRoute, renewCallback, renewalSettlement, renewStatus, userOrders, adminOrders, renewPage, lawyerPackages, refundRoute, lawyerCreate, paymentContext, lawyerPayPage] = await Promise.all([
    source('supabase/migrations/20260805090000_lawyer_payment_closure.sql'),
    source('src/app/api/admin/lawyer/review/route.ts'),
    source('src/app/api/consult/create/route.ts'),
    source('src/components/consult/price-step.tsx'),
    source('src/components/consult/civil-price-step.tsx'),
    source('src/app/api/lawyer/renew/route.ts'),
    source('src/app/api/lawyer/renew/callback/route.ts'),
    source('src/lib/payment/renewal-settlement.ts'),
    source('src/app/api/lawyer/pay/status/route.ts'),
    source('src/app/api/user/orders/route.ts'),
    source('src/app/api/admin/order/list/route.ts'),
    source('src/app/lawyer/renew/page.tsx'),
    source('src/components/lawyer/lawyer-package-step.tsx'),
    source('src/app/api/admin/refund-requests/route.ts'),
    source('src/app/api/lawyer/create/route.ts'),
    source('src/app/api/lawyer/payment-context/route.ts'),
    source('src/app/lawyer/pay/page.tsx'),
  ]);

  assert.match(migration, /lawyer_complimentary_orders/i, 'migration must create auditable complimentary orders');
  assert.match(migration, /ENABLE ROW LEVEL SECURITY/i, 'new payment data must be protected with RLS');
  assert.match(migration, /payment_expires_at/i, 'payment orders must have an expiry timestamp');
  assert.match(migration, /membership_records/i, 'dual-package entitlement must use membership records');

  assert.match(reviewRoute, /approve_complimentary/, 'review route must support complimentary approval explicitly');
  assert.match(reviewRoute, /payment_status !== 'paid'/, 'normal approval must require a paid application');
  assert.match(reviewRoute, /complimentary_reason/, 'complimentary reason must be recorded');
  assert.doesNotMatch(reviewRoute, /complimentary_code:\s*code/, 'the complimentary code must not be persisted');
  assert.doesNotMatch(reviewRoute, /COMPLIMENTARY_APPROVAL_CODE/, 'complimentary approval must not require an environment secret');
  assert.doesNotMatch(reviewRoute, /complimentaryCode/, 'complimentary approval must not require a code from the client');

  assert.match(lawyerCreate, /authenticateRequest\(request\)/, 'lawyer applications must use the server-verified login identity');
  assert.match(lawyerCreate, /applicationMode/, 'lawyer applications must support paid and complimentary request modes');
  assert.match(lawyerCreate, /complimentary_requested/, 'complimentary applications must remain pending until admin approval');
  assert.doesNotMatch(lawyerCreate, /bodyUserId|x-user-info/, 'lawyer application ownership must not trust client user identity');
  assert.match(paymentContext, /applicationId/, 'payment context must accept an application navigation hint');
  assert.match(paymentContext, /eq\('user_id', String\(auth\.user!\.id\)\)/, 'payment context must enforce current-user ownership');
  assert.match(paymentContext, /complimentary_pending/, 'payment context must expose pending complimentary applications');
  assert.match(lawyerPackages, /申请免费体验/, 'lawyer onboarding must expose a complimentary application option');
  assert.match(lawyerPackages, /experienceReason/, 'complimentary applications must collect a reason');
  assert.match(lawyerPayPage, /applicationId/, 'payment page must preserve the selected application id');

  assert.match(consultCreate, /loadConfiguredPrices/, 'consultation server must read backend price config');
  assert.match(consultCreate, /planId/, 'consultation creation must accept a plan ID');
  assert.doesNotMatch(consultCreate, /const finalServicePrice = servicePrice/, 'consultation price must not trust the client');
  assert.match(consultPriceStep, /planId: selectedPlan/, 'criminal consultation must submit plan ID');
  assert.match(civilPriceStep, /planId: selectedPlan/, 'civil consultation must submit plan ID');

  assert.match(renewRoute, /getPaymentClientContext/, 'renewal must reuse existing payment channel selection');
  assert.match(renewRoute, /createH5Order/, 'renewal must support H5 payment');
  assert.match(renewRoute, /createJsapiOrder/, 'renewal must support JSAPI payment');
  assert.match(renewRoute, /selected_packages/, 'renewal eligibility must be based on selected packages');
  assert.match(renewCallback, /handleRenewalPaymentSuccess/, 'renewal callback must use the shared settlement path');
  assert.match(renewalSettlement, /membership_records/, 'renewal settlement must update package membership');
  assert.match(renewStatus, /renewOrder[\s\S]*queryOrder\(renewOrder\.order_no\)/, 'renewal status must query WeChat to compensate missed callbacks');
  assert.match(renewStatus, /remote\.tradeState === ['"]SUCCESS['"][\s\S]*handleRenewalPaymentSuccess/, 'renewal status must settle the order and membership after a successful query');
  assert.match(renewStatus, /['"]closed['"][\s\S]*allowClosedRecovery|renewOrder\.payment_status === ['"]closed['"]/, 'renewal status must recover a paid order closed before callback compensation');
  assert.match(renewalSettlement, /allowClosedRecovery \? \['pending', ['"]paying['"], ['"]closed['"]\]/, 'closed renewal recovery must persist paid order state');
  assert.match(renewPage, /toFixed\(2\)/, 'renewal price display must preserve cents');
  assert.match(lawyerPackages, /toFixed\(2\)/, 'onboarding price display must preserve cents');

  assert.match(refundRoute, /const outTradeNo = refundRequest\.order_type === ['"]lawyer_renewal['"][\s\S]*\? order\.order_no/, 'renewal refunds must use the original out_trade_no, not the stored transaction id');

  assert.match(userOrders, /lawyer_renew_orders/, 'user orders must include renewal orders');
  assert.match(userOrders, /lawyer_complimentary_orders/, 'user orders must include complimentary orders');
  assert.match(adminOrders, /lawyer_renew_orders/, 'admin orders must include renewal orders');
  assert.match(adminOrders, /lawyer_complimentary_orders/, 'admin orders must include complimentary orders');

  console.log('lawyer payment closure contract passed');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
