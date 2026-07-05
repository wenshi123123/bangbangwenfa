'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { LawyerBottomNav } from '@/components/lawyer/lawyer-bottom-nav';
import { getVersionedPath } from '@/lib/site';

// 不需要认证的律师相关页面
const PUBLIC_LAWYER_PATHS = ['/lawyer/login', '/lawyer/join', '/lawyer/join/apply'];

export default function LawyerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoggedIn, isLoading } = useAuth();
  const [checked, setChecked] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('token');
  });
  const [unauthorized, setUnauthorized] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !localStorage.getItem('token');
  });

  // 公共页优先放行，避免登录页在路由初始阶段误进入受保护 loading 壳
  const isPublicPath =
    !pathname ||
    PUBLIC_LAWYER_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));

  useEffect(() => {
    if (isLoading) return;

    if (!isPublicPath && !isLoggedIn) {
      setUnauthorized(true);
      // 未登录用户访问受保护的律师页面，重定向到律师登录页
      const currentQuery = new URLSearchParams(window.location.search).toString();
      const currentRedirectPath = currentQuery
        ? `${pathname || '/lawyer'}?${currentQuery}`
        : (pathname || '/lawyer');
      const versionedRedirectPath = getVersionedPath(currentRedirectPath);
      sessionStorage.setItem('auth_guard_redirect', versionedRedirectPath);
      router.replace(`${getVersionedPath('/lawyer/login')}?redirect=${encodeURIComponent(versionedRedirectPath)}`);
      return;
    }

    setChecked(true);
  }, [isLoggedIn, isLoading, isPublicPath, pathname, router]);

  if (isPublicPath) {
    return <>{children}</>;
  }

  if (unauthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-[0_12px_40px_rgba(15,23,42,0.08)] text-center">
          <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-green-50 flex items-center justify-center">
            <div className="w-7 h-7 rounded-full border-4 border-green-600 border-t-transparent animate-spin" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">律师登录</h1>
          <p className="mt-2 text-sm text-slate-500">请先登录律师账号后再访问后台</p>
          <div className="mt-6">
            <button
              onClick={() => router.replace(getVersionedPath('/lawyer/login'))}
              className="inline-flex items-center justify-center rounded-full bg-green-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-green-700"
            >
              前往登录
            </button>
          </div>
        </div>
      </div>
    );
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
