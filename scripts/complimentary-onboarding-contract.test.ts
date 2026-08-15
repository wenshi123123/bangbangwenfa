import assert from 'node:assert/strict';
import fs from 'node:fs';

const review = fs.readFileSync('src/app/api/admin/lawyer/review/route.ts', 'utf8');
const create = fs.readFileSync('src/app/api/lawyer/create/route.ts', 'utf8');
const context = fs.readFileSync('src/app/api/lawyer/payment-context/route.ts', 'utf8');
const orders = fs.readFileSync('src/app/api/user/orders/route.ts', 'utf8');
const pay = fs.readFileSync('src/app/lawyer/pay/page.tsx', 'utf8');

assert.match(review, /data:\s*\{\s*applicationId:/, 'notifications must use the production data column');
assert.match(review, /eq\('application_id', targetId\)/, 'complimentary order creation must be idempotent');
assert.match(review, /eq\('source_type', membershipSourceType\)/, 'membership creation must be idempotent by source');
assert.match(create, /code:\s*'APPLICATION_PENDING'/, 'pending applications must return a structured conflict');
assert.match(create, /code:\s*'LAWYER_ALREADY_ACTIVE'/, 'active lawyers must not submit another application');
assert.match(context, /status:\s*'complimentary_active'/, 'approved complimentary applications need an active status');
assert.match(orders, /approval_mode === 'complimentary'\) continue/, 'approved complimentary applications must avoid duplicate order display');
assert.match(orders, /approval_mode === 'complimentary_requested'/, 'pending complimentary applications must be visible');
assert.match(pay, /免费体验已开通/, 'active complimentary users need a visible success state');

console.log('complimentary onboarding contract passed');
