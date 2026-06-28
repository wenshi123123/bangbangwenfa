'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { LawyerBottomNav } from '@/components/lawyer/lawyer-bottom-nav';

// 不需要认证的律师相关页面
const PUBLIC_LAWYER_PATHS = ['/lawyer/login', '/lawyer/join'];

export default function LawyerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoggedIn, isLoading } = useAuth();
  const [checked, setChecked] = useState(false);

  const isPublicPath = PUBLIC_LAWYER_PATHS.some(
    p => pathname === p || pathname.startsWith(p + '/')
  );

  useEffect(() => {
    if (isLoading) return;

    if (!isPublicPath && !isLoggedIn) {
      // 未登录用户访问受保护的律师页面，重定向到律师登录页
      router.replace(`/lawyer/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    setChecked(true);
  }, [isLoggedIn, isLoading, isPublicPath, pathname, router]);

  if (isPublicPath) {
    return <>{children}</>;
  }

  // 加载中显示占位
  if (isLoading || (!isPublicPath && !checked)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {children}
      {/* 仅对已登录律师页面显示底部导航 */}
      {isLoggedIn && !isPublicPath && <LawyerBottomNav />}
    </>
  );
}
