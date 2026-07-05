'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from './use-auth';
import { getVersionedPath } from '@/lib/site';

interface UseAuthGuardOptions {
  // 是否需要登录
  requireAuth?: boolean;
  // 登录后重定向的页面，默认返回来源页面
  redirectTo?: string;
  // 不需要登录的路径（这些路径不会被拦截）
  excludedPaths?: string[];
}

/**
 * 登录守卫 Hook
 * 用于需要登录才能访问的页面
 */
export function useAuthGuard(options: UseAuthGuardOptions = {}) {
  const { requireAuth = true, redirectTo, excludedPaths = [] } = options;
  const { isLoggedIn, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // 加载中不处理
    if (isLoading) return;

    // 不需要登录，直接返回
    if (!requireAuth) return;

    // 检查是否在排除路径中
    if (excludedPaths.some(path => pathname?.startsWith(path))) {
      return;
    }

    // 未登录，重定向到登录
    if (!isLoggedIn) {
      // 保存当前路径，登录后返回
      if (typeof window !== 'undefined' && pathname) {
        sessionStorage.setItem(
          'auth_guard_redirect',
          getVersionedPath(`${pathname}${window.location.search}`)
        );
      }
      
      // 打开登录弹窗
      window.dispatchEvent(new CustomEvent('open-login-modal'));
      
      // 如果指定了重定向路径
      if (redirectTo) {
        router.push(getVersionedPath(redirectTo));
      }
    }
  }, [isLoggedIn, isLoading, requireAuth, pathname, router, redirectTo, excludedPaths]);

  return {
    isLoggedIn,
    isLoading,
    // 获取登录后应跳转的路径
    getRedirectPath: () => {
      if (typeof window !== 'undefined') {
        return sessionStorage.getItem('auth_guard_redirect') || getVersionedPath('/');
      }
      return getVersionedPath('/');
    },
    // 清除重定向路径
    clearRedirectPath: () => {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('auth_guard_redirect');
      }
    }
  };
}

/**
 * 需要游客身份（未登录）才能访问的页面
 * 如：登录页、注册页
 */
export function useGuestGuard(redirectTo = '/') {
  const { isLoggedIn, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;
    
    // 已登录，跳转到指定页面
    if (isLoggedIn) {
      router.push(redirectTo);
    }
  }, [isLoggedIn, isLoading, router, redirectTo]);

  return {
    isLoggedIn,
    isLoading,
  };
}
