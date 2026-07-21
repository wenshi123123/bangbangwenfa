import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  getCanonicalSiteUrl,
  getRequestHostname,
  shouldRedirectToCanonicalHost,
} from '@/lib/site';

function applySecurityHeaders(
  response: NextResponse,
  isProd: boolean,
  clearBrowserCache = false,
  preserveCacheControl = false,
  _cacheHomeDocument = false
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
  // 页面和 API 响应不要长期缓存，避免 CloudBase/CDN 命中旧 HTML 后引用失效的静态资源。
  // 公开价格接口有自己的短时缓存策略，不能被这里的全局 no-store 覆盖。
  if (!preserveCacheControl) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
  }
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
        "connect-src 'self' https://bangbangwenfa.com https://www.bangbangwenfa.com https://api.mch.weixin.qq.com https://*.supabase.co",
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
  const hostname = getRequestHostname(request.headers, request.nextUrl.hostname);
  const { pathname } = request.nextUrl;
  const preserveCacheControl = pathname === '/api/price';
  const buildVersion = process.env.BUILD_CACHE_BUST_VALUE || 'unknown';
  const seenBuildVersion = request.cookies.get('bb_build_version')?.value;
  const isDocumentRequest = !pathname.startsWith('/api/') && !pathname.startsWith('/_next/');
  // 微信内置浏览器在收到 Clear-Site-Data 的同时加载页面资源时，部分版本会中断
  // CSS/图片请求，导致用户看到“只有文字、没有样式”的半加载页面。微信自身的
  // WebView 不走这次主动清缓存，仍保留 no-store 与 pageshow 刷新防止旧文档恢复。
  const isWechatBrowser = /MicroMessenger/i.test(request.headers.get('user-agent') ?? '');
  const shouldClearBrowserCache =
    isProd && isDocumentRequest && !isWechatBrowser && seenBuildVersion !== buildVersion;

  if (isProd && shouldRedirectToCanonicalHost(hostname)) {
    const redirectUrl = request.nextUrl.clone();
    const canonicalUrl = new URL(getCanonicalSiteUrl());
    redirectUrl.protocol = canonicalUrl.protocol;
    redirectUrl.hostname = canonicalUrl.hostname;
    redirectUrl.port = canonicalUrl.port;
    const response = applySecurityHeaders(NextResponse.redirect(redirectUrl, 307), isProd, shouldClearBrowserCache);
    if (shouldClearBrowserCache) {
      response.cookies.set('bb_build_version', buildVersion, {
        path: '/', maxAge: 31536000, httpOnly: true, secure: true, sameSite: 'lax',
      });
    }
    return response;
  }

  // 添加安全响应头
  const response = applySecurityHeaders(
    NextResponse.next(),
    isProd,
    false,
    preserveCacheControl,
    false
  );
  if (shouldClearBrowserCache) {
    response.headers.set('Clear-Site-Data', '"cache"');
    response.cookies.set('bb_build_version', buildVersion, {
      path: '/', maxAge: 31536000, httpOnly: true, secure: true, sameSite: 'lax',
    });
  }
  return response;
}

export const config = {
  matcher: [
    // HTML/API 仍由中间件防旧缓存；带内容哈希的 Next 静态资源交给 Next 默认的长期缓存策略。
    '/((?!_next/static/|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|woff2?|ttf|map)$).*)',
  ],
};
