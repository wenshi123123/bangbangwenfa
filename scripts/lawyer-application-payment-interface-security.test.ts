import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

async function source(file: string): Promise<string> {
  return fs.readFile(path.join(process.cwd(), file), 'utf8');
}

async function main() {
  const [contextRoute, createRoute, statusRoute, renewRoute] = await Promise.all([
    source('src/app/api/lawyer/payment-context/route.ts'),
    source('src/app/api/lawyer/pay/create/route.ts'),
    source('src/app/api/lawyer/pay/status/route.ts'),
    source('src/app/api/lawyer/renew/route.ts'),
  ]);

  assert.match(contextRoute, /authenticateRequest\(request\)/, 'payment context must require login');
  assert.match(contextRoute, /\.eq\('user_id',\s*String\(auth\.user!\.id\)\)/, 'payment context must select only the logged-in user application');
  assert.doesNotMatch(contextRoute, /searchParams\.get\('applicationId'\)/, 'payment context must not take applicationId from the URL');

  assert.match(createRoute, /if \(!auth\?\.success \|\| !auth\.user\)/, 'order creation must reject unauthenticated users');
  assert.doesNotMatch(createRoute, /applicationId|queryAppId|effectiveAppId/, 'order creation must not authorize with a client applicationId');
  assert.match(createRoute, /\.eq\('user_id',\s*String\(auth\.user\.id\)\)/, 'order creation must derive the application from the logged-in user');
  assert.match(createRoute, /lawyer_application_payment_orders/, 'order creation must use the isolated payment-order table');
  assert.match(createRoute, /status:\s*'creating'/, 'order creation must reserve an order before payment creation');
  assert.match(createRoute, /payment_expires_at/, 'order creation must expire stale orders before replacement');
  assert.match(createRoute, /status:\s*'paid'/, 'order creation must avoid a new order for paid applications');

  assert.match(statusRoute, /if \(!auth\?\.success \|\| !auth\.user\)/, 'entry-payment status must require login');
  assert.match(statusRoute, /lawyer_application_payment_orders/, 'entry-payment status must prefer the isolated payment-order table');
  assert.match(statusRoute, /String\(paymentOrder\.user_id\) !== String\(auth\.user\.id\)/, 'new order status must verify order ownership');
  assert.match(statusRoute, /String\(application\.user_id\) !== String\(auth\.user\.id\)/, 'legacy status must verify application ownership');
  assert.match(statusRoute, /lawyer_applications/, 'legacy application orders must remain readable');
  assert.match(renewRoute, /lawyer_renew_orders/, 'renewal creation must remain isolated');

  console.log('lawyer application payment interface security contract passed');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
