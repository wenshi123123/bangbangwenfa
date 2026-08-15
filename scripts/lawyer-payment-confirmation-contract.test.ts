import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function main() {
  const [statusRoute, successPage] = await Promise.all([
    readFile('src/app/api/lawyer/pay/status/route.ts', 'utf8'),
    readFile('src/app/success/page.tsx', 'utf8'),
  ]);
  assert.match(statusRoute, /paymentOrder\.order_no/, 'new lawyer orders must query WeChat by merchant order number');
  assert.match(statusRoute, /lawyer_application_payment_orders[\s\S]*status: 'paid'/, 'new order lookup must persist paid status');
  assert.match(statusRoute, /payment_status: 'paid'/, 'new order lookup must persist application paid status');
  assert.match(successPage, /setInterval\(fetchOrder/, 'lawyer H5 return page must poll payment status');
  console.log('lawyer payment confirmation contract passed');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
