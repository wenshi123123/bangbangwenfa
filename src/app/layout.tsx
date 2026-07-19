import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/hooks/use-auth';
import { Header } from '@/components/layout/header';
import LoginModal from '@/components/auth/login-modal';
import SearchModal from '@/components/search/search-modal';
import { CanonicalHostGuard } from '@/components/canonical-host-guard';
import { getSiteUrl } from '@/lib/site';
import {
  LEGACY_BROWSER_FALLBACK_CSS,
  buildLegacyBrowserDetectionScript,
} from '@/lib/legacy-browser-fallback';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: '帮帮问法',
    template: '%s | 帮帮问法',
  },
  description:
    '专业法律咨询服务平台，提供案件分析、法律建议和可执行的行动方案。',
  keywords: [
    '法律咨询',
    '律师服务',
    '刑事案件',
    '民事案件',
    '法律顾问',
  ],
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: '/',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `;(function () {
  if (window.__bbBfcacheGuardInstalled) return;
  window.__bbBfcacheGuardInstalled = true;
  window.addEventListener('pageshow', function (event) {
    if (event.persisted) window.location.reload();
  });
})();`,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `;(function () {
  if (window.__bbStaleResourceGuardInstalled) return;
  window.__bbStaleResourceGuardInstalled = true;
  var retryKey = '__bbwv_resource_retry';
  var currentUrl = window.location.href;
  var hasRetried = currentUrl.indexOf(retryKey + '=1') !== -1;
  var recoveryStarted = false;
  function isRecoverableResource(target) {
    if (!target || !target.tagName) return false;
    var tag = target.tagName.toLowerCase();
    if (tag === 'script' || tag === 'img') return true;
    return tag === 'link' && (target.rel || '').toLowerCase().split(/\\s+/).indexOf('stylesheet') !== -1;
  }
  window.addEventListener('error', function (event) {
    var target = event.target;
    if (recoveryStarted || hasRetried || !isRecoverableResource(target)) return;
    recoveryStarted = true;
    var separator = currentUrl.indexOf('?') === -1 ? '?' : '&';
    var freshUrl = currentUrl + separator + retryKey + '=1&__bbwv_recover=' + Date.now();
    window.location.replace(freshUrl);
  }, true);
})();`,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: buildLegacyBrowserDetectionScript(),
          }}
        />
        <style dangerouslySetInnerHTML={{ __html: LEGACY_BROWSER_FALLBACK_CSS }} />
      </head>
      <body className="font-sans antialiased">
        <CanonicalHostGuard />
        <AuthProvider>
          <Header />
          <main className="min-h-screen">{children}</main>
          <LoginModal />
          <SearchModal />
        </AuthProvider>
      </body>
    </html>
  );
}
