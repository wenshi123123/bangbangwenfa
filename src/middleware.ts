import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  BUILD_CACHE_BUST_VALUE,
  STATIC_ASSET_RECOVERY_PARAM,
} from '@/lib/build-meta';
import {
  getCanonicalSiteUrl,
  getRequestHostname,
  shouldRedirectToCanonicalHost,
} from '@/lib/site';

const CACHE_BUST_PARAM = '__bbwv';

function applySecurityHeaders(
  response: NextResponse,
  isProd: boolean,
  clearBrowserCache = false
) {
  // 隐藏技术栈信息
  response.headers.delete('X-Powered-By');

  // 防止 MIME 类型嗅探
  response.headers.set('X-Content-Type-Options', 'nosniff');
  // 防止点击劫持
  response.headers.set('X-Frame-Options', 'DENY');
  // XSS 防护
  response.headers.set('X-XSS-Protection', '1; mode=block');
  // Referrer 策略
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  // 权限策略
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  // 页面和 API 响应不要长期缓存，避免 CloudBase/CDN 命中旧 HTML 后引用失效的静态资源
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  if (clearBrowserCache) {
    response.headers.set('Clear-Site-Data', '"cache"');
  }

  if (isProd) {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
    response.headers.set(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "font-src 'self' data:",
        "connect-src 'self' https://api.mch.weixin.qq.com https://*.supabase.co",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join('; ')
    );
  }

  return response;
}

/**
 * 全局中间件
 * 1. 添加安全响应头
 * 2. 隐藏技术栈信息（移除 X-Powered-By）
 * 3. 静默放行业务请求（各 API 自行验证权限）
 */
export async function middleware(request: NextRequest) {
  const isProd = process.env.DEPLOY_ENV === 'PROD' || process.env.NODE_ENV === 'production';
  const hasBuildCacheBust = BUILD_CACHE_BUST_VALUE !== 'dev';
  const hostname = getRequestHostname(request.headers, request.nextUrl.hostname);
  const { pathname, search } = request.nextUrl;
  const acceptHeader = request.headers.get('accept') || '';
  const isHtmlNavigation = acceptHeader.includes('text/html');
  const isApiRoute = pathname === '/api' || pathname.startsWith('/api/');
  const isRecoveryNavigation =
    request.nextUrl.searchParams.get(STATIC_ASSET_RECOVERY_PARAM) === '1';

  const tokenCookie = request.cookies.get('token')?.value;
  const authSyncCookie = request.cookies.get('auth_sync')?.value;

  if ((pathname === '/user' || pathname === '/me') && !tokenCookie && !authSyncCookie) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/register';
    redirectUrl.search = `?next=${encodeURIComponent(`${pathname}${search}`)}`;
    return NextResponse.redirect(redirectUrl);
  }

  if (isProd && shouldRedirectToCanonicalHost(hostname)) {
    const redirectUrl = request.nextUrl.clone();
    const canonicalUrl = new URL(getCanonicalSiteUrl());
    redirectUrl.protocol = canonicalUrl.protocol;
    redirectUrl.hostname = canonicalUrl.hostname;
    redirectUrl.port = canonicalUrl.port;
    return applySecurityHeaders(NextResponse.redirect(redirectUrl, 307), isProd);
  }

  if (
    hasBuildCacheBust &&
    isHtmlNavigation &&
    !isApiRoute &&
    (request.nextUrl.searchParams.get(CACHE_BUST_PARAM) !== BUILD_CACHE_BUST_VALUE ||
      isRecoveryNavigation)
  ) {
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.searchParams.set(CACHE_BUST_PARAM, BUILD_CACHE_BUST_VALUE);
    rewriteUrl.searchParams.delete(STATIC_ASSET_RECOVERY_PARAM);
    return applySecurityHeaders(
      NextResponse.redirect(rewriteUrl, 307),
      isProd,
      isRecoveryNavigation
    );
  }

  // 添加安全响应头
  return applySecurityHeaders(NextResponse.next(), isProd);
}

export const config = {
  matcher: [
    // HTML/API 仍由中间件防旧缓存；带内容哈希的 Next 静态资源交给 Next 默认的长期缓存策略。
    '/((?!_next/static/|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|woff2?|ttf|map)$).*)',
  ],
};
