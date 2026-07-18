import crypto from 'crypto';

const HANDOFF_TTL_SECONDS = 10 * 60;

export interface ConsultPaymentHandoff {
  kind: 'consult-payment';
  orderId: number;
  userId: number;
  expiresAt: number;
}

function getHandoffSecret() {
  return process.env.WEIXIN_PAYMENT_SESSION_SECRET || process.env.JWT_SECRET || null;
}

function sign(value: string, secret: string) {
  return crypto.createHmac('sha256', secret).update(value).digest('base64url');
}

export function createConsultPaymentHandoff(orderId: number, userId: number): string | null {
  const secret = getHandoffSecret();
  if (!secret) return null;
  const payload: ConsultPaymentHandoff = {
    kind: 'consult-payment', orderId, userId,
    expiresAt: Math.floor(Date.now() / 1000) + HANDOFF_TTL_SECONDS,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${encoded}.${sign(encoded, secret)}`;
}

export function readConsultPaymentHandoff(value: string | null | undefined): ConsultPaymentHandoff | null {
  const secret = getHandoffSecret();
  if (!secret || !value) return null;
  const [encoded, signature, ...rest] = value.split('.');
  if (!encoded || !signature || rest.length) return null;
  const expected = sign(encoded, secret);
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as ConsultPaymentHandoff;
    if (payload.kind !== 'consult-payment' || !Number.isInteger(payload.orderId) || payload.orderId <= 0 || !Number.isInteger(payload.userId) || payload.userId <= 0 || !Number.isInteger(payload.expiresAt) || payload.expiresAt < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}
