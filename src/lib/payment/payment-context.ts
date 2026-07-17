import crypto from 'crypto';

export type PaymentChannel = 'jsapi' | 'h5' | 'native';

export interface PaymentClientContext {
  isWechat: boolean;
  isMobile: boolean;
  channel: PaymentChannel;
}

export interface WechatPaymentSession {
  openid: string;
  redirect: string;
}

interface SignedWechatPaymentSession extends WechatPaymentSession {
  expiresAt: number;
}

export const WECHAT_PAYMENT_SESSION_COOKIE = 'wechat_payment_session';
const SESSION_DURATION_SECONDS = 10 * 60;

export function getPaymentClientContext(request: Request): PaymentClientContext {
  const userAgent = (request.headers.get('x-user-agent') || request.headers.get('user-agent') || '').toLowerCase();
  const isWechat = userAgent.includes('micromessenger');
  const isMobile =
    request.headers.get('x-client-device') === 'mobile' ||
    /android|iphone|ipad|ipod|webos|blackberry|iemobile|opera mini/.test(userAgent);

  return {
    isWechat,
    isMobile,
    channel: isWechat ? 'jsapi' : isMobile ? 'h5' : 'native',
  };
}

export function isSafePaymentRedirect(redirect: string): boolean {
  return redirect.startsWith('/') && !redirect.startsWith('//') && !redirect.includes('\\');
}

function getSessionSecret(): string {
  const secret = process.env.WEIXIN_PAYMENT_SESSION_SECRET;
  if (!secret) {
    throw new Error('未配置微信支付会话密钥');
  }
  return secret;
}

function sign(value: string): string {
  return crypto.createHmac('sha256', getSessionSecret()).update(value).digest('base64url');
}

export function createWechatPaymentSession(session: WechatPaymentSession): string {
  if (!session.openid || !isSafePaymentRedirect(session.redirect)) {
    throw new Error('无效的微信支付会话');
  }

  const payload: SignedWechatPaymentSession = {
    ...session,
    expiresAt: Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function readWechatPaymentSession(value: string | undefined): WechatPaymentSession | null {
  if (!value) return null;

  const [encodedPayload, signature, ...rest] = value.split('.');
  if (!encodedPayload || !signature || rest.length) {
    return null;
  }

  const expectedSignature = sign(encodedPayload);
  if (signature.length !== expectedSignature.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as SignedWechatPaymentSession;
    if (
      !payload.openid ||
      !isSafePaymentRedirect(payload.redirect) ||
      !Number.isInteger(payload.expiresAt) ||
      payload.expiresAt < Math.floor(Date.now() / 1000)
    ) {
      return null;
    }
    return { openid: payload.openid, redirect: payload.redirect };
  } catch {
    return null;
  }
}

export function getWechatPaymentSession(request: Request): WechatPaymentSession | null {
  const cookieHeader = request.headers.get('cookie') || '';
  const value = cookieHeader
    .split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${WECHAT_PAYMENT_SESSION_COOKIE}=`))
    ?.slice(WECHAT_PAYMENT_SESSION_COOKIE.length + 1);
  return readWechatPaymentSession(value);
}

export function getWechatPaymentSessionCookie(session: WechatPaymentSession): string {
  return `${WECHAT_PAYMENT_SESSION_COOKIE}=${createWechatPaymentSession(session)}; Path=/; Max-Age=${SESSION_DURATION_SECONDS}; HttpOnly; Secure; SameSite=Lax`;
}
