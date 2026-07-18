import assert from 'node:assert/strict';
import {
  createWechatPaymentSession,
  getPaymentClientContext,
  readWechatPaymentSession,
} from '../src/lib/payment/payment-context';
import {
  createConsultPaymentHandoff,
  readConsultPaymentHandoff,
} from '../src/lib/payment/payment-handoff';

process.env.WEIXIN_PAYMENT_SESSION_SECRET = 'test-session-secret';

const contextFor = (userAgent: string) =>
  getPaymentClientContext(new Request('https://bangbangwenfa.com/pay', {
    headers: { 'user-agent': userAgent },
  }));

assert.equal(contextFor('Mozilla/5.0 MicroMessenger/8.0').channel, 'jsapi');
assert.equal(contextFor('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)').channel, 'h5');
assert.equal(contextFor('Mozilla/5.0 (Macintosh; Intel Mac OS X)').channel, 'native');

const session = createWechatPaymentSession({
  openid: 'openid-for-test',
  redirect: '/pay?orderId=1',
});

assert.deepEqual(readWechatPaymentSession(session), {
  openid: 'openid-for-test',
  redirect: '/pay?orderId=1',
});
assert.equal(readWechatPaymentSession(`${session}x`), null);

const handoff = createConsultPaymentHandoff(123, 456);
assert.ok(handoff);
assert.deepEqual(readConsultPaymentHandoff(handoff), {
  kind: 'consult-payment',
  orderId: 123,
  userId: 456,
  expiresAt: (readConsultPaymentHandoff(handoff) as { expiresAt: number }).expiresAt,
});
assert.equal(readConsultPaymentHandoff(`${handoff}x`), null);

console.log('payment-context tests passed');
