import assert from 'node:assert/strict';
import {
  PAYMENT_TTL_MS,
  isPaymentExpired,
  paymentExpiresAt,
} from '../src/lib/payment/order-lifecycle';

const now = new Date('2026-08-06T16:00:00.000Z');

assert.equal(PAYMENT_TTL_MS, 15 * 60 * 1000);
assert.equal(paymentExpiresAt(now).toISOString(), '2026-08-06T16:15:00.000Z');
assert.equal(isPaymentExpired('pending', '2026-08-06T16:14:59.999Z', now), false);
assert.equal(isPaymentExpired('paying', '2026-08-06T16:00:00.000Z', now), true);
assert.equal(isPaymentExpired('paid', '2026-08-05T16:00:00.000Z', now), false);

console.log('payment expiry policy tests passed');
