import type { Metadata, Viewport } from 'next';
import { Inter, Noto_Sans_SC, Noto_Serif_SC } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/hooks/use-auth';
import { Header } from '@/components/layout/header';
import LoginModal from '@/components/auth/login-modal';
import SearchModal from '@/components/search/search-modal';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const notoSansSC = Noto_Sans_SC({
  subsets: ['latin'],
  variable: '--font-noto-sans',
  display: 'swap',
  weight: ['400', '500', '700'],
});

const notoSerifSC = Noto_Serif_SC({
  subsets: ['latin'],
  variable: '--font-noto-serif',
  display: 'swap',
  weight: ['400', '500', '700'],
});

export const metadata: Metadata = {
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
      <body className={`${inter.variable} ${notoSansSC.variable} ${notoSerifSC.variable} font-sans antialiased`}>
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
