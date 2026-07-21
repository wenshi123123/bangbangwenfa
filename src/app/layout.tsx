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
  if (window.__bbwvDocumentNavigationGuardInstalled) return;
  window.__bbwvDocumentNavigationGuardInstalled = true;
  window.addEventListener('click', function (event) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    var target = event.target;
    if (!target || !target.closest) return;
    var anchor = target.closest('a[href]');
    if (!anchor || anchor.target && anchor.target !== '_self' || anchor.hasAttribute('download')) return;
    if (anchor.origin !== window.location.origin || anchor.protocol !== window.location.protocol) return;
    if (anchor.hash && anchor.pathname === window.location.pathname && anchor.search === window.location.search) return;
    event.preventDefault();
    window.location.assign(anchor.href);
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
