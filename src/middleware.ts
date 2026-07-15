import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  BUILD_CACHE_BUST_VALUE,
  STATIC_ASSET_RECOVERY_PARAM,
} from '@/lib/build-meta';
import { getCanonicalSiteUrl, shouldRedirectToCanonicalHost } from '@/lib/site';

const CACHE_BUST_PARAM = '__bbwv';
const CHUNK_MANIFEST_PATH = `/__bbwv-chunks-${BUILD_CACHE_BUST_VALUE}.json`;
const RECOVERY_SCRIPT_PATH = `/__bbwv-recover-${BUILD_CACHE_BUST_VALUE}.js`;

let currentChunkNames: Set<string> | null = null;
let currentChunkNamesPromise: Promise<Set<string> | null> | null = null;

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

async function loadCurrentChunkNames(request: NextRequest): Promise<Set<string> | null> {
  if (currentChunkNames) {
    return currentChunkNames;
  }

  if (!currentChunkNamesPromise) {
    const manifestUrl = new URL(CHUNK_MANIFEST_PATH, request.url);
    currentChunkNamesPromise = fetch(manifestUrl.toString(), { cache: 'no-store' })
      .then(async response => {
        if (!response.ok) {
          return null;
        }

        const payload = (await response.json()) as
          | { chunks?: string[] }
          | string[]
          | null;

        const chunkList = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.chunks)
            ? payload.chunks
            : [];

        return new Set(chunkList);
      })
      .catch(() => null)
      .finally(() => {
        currentChunkNamesPromise = null;
      });
  }

  const resolvedChunkNames = await currentChunkNamesPromise;

  if (resolvedChunkNames && resolvedChunkNames.size > 0) {
    currentChunkNames = resolvedChunkNames;
  }

  return resolvedChunkNames;
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
  const hostname = request.nextUrl.hostname?.toLowerCase();
  const { pathname, search } = request.nextUrl;
  const acceptHeader = request.headers.get('accept') || '';
  const isHtmlNavigation = acceptHeader.includes('text/html');
  const isApiRoute = pathname === '/api' || pathname.startsWith('/api/');
  const isRecoveryNavigation =
    request.nextUrl.searchParams.get(STATIC_ASSET_RECOVERY_PARAM) === '1';
  const isStaticChunkRequest =
    pathname.startsWith('/_next/static/chunks/') && pathname.endsWith('.js');

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

  if (hasBuildCacheBust && isStaticChunkRequest) {
    const requestedChunk = pathname.slice('/_next/static/chunks/'.length);
    const currentChunkNames = await loadCurrentChunkNames(request);

    if (currentChunkNames && !currentChunkNames.has(requestedChunk)) {
      const recoveryUrl = request.nextUrl.clone();
      recoveryUrl.pathname = RECOVERY_SCRIPT_PATH;
      recoveryUrl.search = '';
      recoveryUrl.hash = '';
      return applySecurityHeaders(NextResponse.rewrite(recoveryUrl), isProd);
    }
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
    // 匹配所有路径（保留静态 chunk 以便旧 HTML 可自动跳转到当前构建）
    '/((?!_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|woff2?|ttf|map)$).*)',
  ],
};
