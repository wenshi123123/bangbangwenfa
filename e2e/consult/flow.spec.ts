import crypto from 'crypto';
import { test, expect } from '@playwright/test';

function base64UrlEncode(input: string): string {
  return Buffer.from(input, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function generateTestToken() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET 未设置，无法生成测试 Token');
  }

  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64UrlEncode(JSON.stringify({
    id: 901001,
    phone: '13800138001',
    username: 'consult_test_user',
    userType: 'user',
    iat: now,
    exp: now + 7 * 24 * 60 * 60,
  }));
  const signingInput = `${header}.${payload}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signingInput)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return `${signingInput}.${signature}`;
}

test.describe('咨询主链路', () => {
  test('创建订单后可查询订单和支付状态', async ({ request }) => {
    const token = generateTestToken();
    const uniqueSuffix = Date.now();

    const createResponse = await request.post('/api/consult/create', {
      data: {
        category: 'criminal',
        caseType: 'other',
        caseDescription: `测试咨询链路-${uniqueSuffix}`,
        serviceType: ['consult'],
        servicePrice: 9900,
        contactName: '咨询测试用户',
        contactPhone: '13800138001',
        paymentStatus: 'pending',
      },
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    expect(createResponse.status()).toBe(200);
    const createBody = await createResponse.json();
    expect(createBody.success).toBe(true);
    expect(createBody.data?.orderId).toBeTruthy();

    const orderId = createBody.data.orderId;

    const queryResponse = await request.get(`/api/consult/order?orderId=${orderId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    expect(queryResponse.status()).toBe(200);
    const queryBody = await queryResponse.json();
    expect(queryBody.success).toBe(true);
    expect(queryBody.order?.id).toBe(orderId);
    expect(queryBody.order?.paymentStatus).toBe('pending');

    const payStatusResponse = await request.post('/api/consult/pay', {
      data: { orderId },
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    expect(payStatusResponse.status()).toBe(200);
    const payStatusBody = await payStatusResponse.json();
    expect(payStatusBody.success).toBe(true);
    expect(payStatusBody.data?.orderId).toBe(orderId);
    expect(payStatusBody.data?.isPaid).toBe(false);
  });
});
