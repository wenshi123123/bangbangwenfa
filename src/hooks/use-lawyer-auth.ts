'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';

/**
 * 律师后台统一的认证检查 Hook
 * 
 * 解决 5 种不同认证模式的问题：
 * 1. useAuth 主检查
 * 2. token 中 userType === 'lawyer' 兜底
 * 3. token 中 lawyerId 存在兜底
 * 4. sessionStorage.currentLawyerId 兜底
 * 5. 返回统一的 isAuthorized / lawyerId / isLoading
 * 
 * 并统一处理 401 token 过期 → 自动弹出登录
 */
export function useLawyerAuth() {
  const { user, isLoggedIn, isLoading: authLoading } = useAuth();
  const [fallbackChecked, setFallbackChecked] = useState(false);
  const [fallback, setFallback] = useState<{
    isLawyer: boolean;
    lawyerId: string | null;
  }>({ isLawyer: false, lawyerId: null });

  // 兜底检查：token + sessionStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const savedLawyerId = sessionStorage.getItem('currentLawyerId');
    const token = localStorage.getItem('token');

    let isLawyerToken = false;
    let tokenLawyerId: string | null = null;

    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.userType === 'lawyer') {
          isLawyerToken = true;
          tokenLawyerId = payload.lawyerId || null;
        }
      } catch { /* ignore parse errors */ }
    }

    setFallback({
      isLawyer: isLawyerToken || !!savedLawyerId,
      lawyerId: tokenLawyerId || savedLawyerId || null,
    });
    setFallbackChecked(true);
  }, [authLoading]);

  // 综合判断是否授权
  const isAuthorized = isLoggedIn && (
    !!user?.isLawyer ||
    !!user?.lawyerId ||
    fallback.isLawyer
  );

  // 有效的律师 ID
  const lawyerId: string | number | undefined = user?.lawyerId || fallback.lawyerId || undefined;

  // isLoading: auth 还在加载 或 兜底检查未完成
  const isLoading = authLoading || !fallbackChecked;

  // 获取带认证的请求头（各页面通用）
  const getAuthHeaders = useCallback((): HeadersInit => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  // 🔧 统一处理 401 token 过期 → 清除状态 → 弹登录
  const handleFetchError = useCallback((response: Response) => {
    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user_info');
      sessionStorage.removeItem('currentLawyerId');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('open-login-modal'));
      }
    }
  }, []);

  // 带自动 401 处理的 fetch 封装
  const authFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    const headers: HeadersInit = {
      ...(options.headers || {}),
      ...getAuthHeaders(),
    };
    const response = await fetch(url, { ...options, headers });
    if (response.status === 401) {
      handleFetchError(response);
    }
    return response;
  }, [getAuthHeaders, handleFetchError]);

  return {
    user,
    isLoggedIn,
    isAuthorized,
    lawyerId,
    isLoading,
    getAuthHeaders,
    authFetch,
  };
}
