'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './use-auth';
import { getFallbackFromStorage } from '@/lib/auth/lawyer-auth-storage';

/**
 * 律师后台统一的认证检查 Hook
 *
 * 修复要点：
 * 1. fallback 通过 useState(initFn) 同步初始化，首次渲染即有正确值
 * 2. fallbackChecked 初始为 true（同步已完成）
 * 3. isLoading 正确反映 authLoading 和 statusChecked 状态
 */
export function useLawyerAuth() {
  const { user, isLoggedIn, isLoading: authLoading } = useAuth();

  // ✅ 关键修复：用初始化函数同步读取 localStorage，避免首次渲染 isLawyer=false
  const [fallback, setFallback] = useState(() => getFallbackFromStorage());
  const [fallbackChecked, setFallbackChecked] = useState(true); // 同步初始化，无需延迟

  // P0-2：律师账号状态
  const [accountStatus, setAccountStatus] = useState<string | null>(null);
  const [statusChecked, setStatusChecked] = useState(false);
  const [forceLoggedOut, setForceLoggedOut] = useState(false);
  const statusCheckRef = useRef(false);

  /**
   * 检查律师账号状态
   */
  const checkAccountStatus = useCallback(async (uid: string) => {
    if (statusCheckRef.current) return;
    statusCheckRef.current = true;

    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`/api/lawyer/check?userId=${encodeURIComponent(uid)}`, { headers });
      const result = await res.json();
      if (result.success && result.data?.status) {
        setAccountStatus(result.data.status);
      } else {
        setAccountStatus('approved');
      }
    } catch {
      setAccountStatus('approved');
    } finally {
      setStatusChecked(true);
      statusCheckRef.current = false;
    }
  }, []);

  // 确定用于状态检查 userId
  const effectiveUserId = user?.id ? String(user.id) : fallback.userId;

  // 当认证通过后，检查账号状态
  useEffect(() => {
    const authorized = (isLoggedIn && (
      !!user?.isLawyer ||
      !!user?.lawyerId
    )) || fallback.isLawyer;

    if (authorized && effectiveUserId) {
      checkAccountStatus(effectiveUserId);
    } else if (!authorized) {
      setAccountStatus(null);
      setStatusChecked(true);
      setForceLoggedOut(false);
    }
  }, [fallbackChecked, isLoggedIn, user?.id, user?.isLawyer, user?.lawyerId, fallback.isLawyer, effectiveUserId]);

  // P0-2：账号被封禁时，清除登录态并弹窗提示
  useEffect(() => {
    if (statusChecked && accountStatus === 'banned') {
      localStorage.removeItem('token');
      localStorage.removeItem('user_info');
      sessionStorage.removeItem('currentLawyerId');
      setForceLoggedOut(true);
      setAccountStatus('banned');
      if (typeof window !== 'undefined') {
        setTimeout(() => {
          alert('您的律师账号已被禁用，无法访问后台。如有疑问请联系平台。');
        }, 100);
      }
    }
  }, [statusChecked, accountStatus]);

  // 授权判断
  const rawAuthorized = (isLoggedIn && (
    !!user?.isLawyer ||
    !!user?.lawyerId
  )) || fallback.isLawyer;

  // P0-3 方案A：允许 active / pending_review / approved / pending / rejected
  const isAuthorized = rawAuthorized && !forceLoggedOut && (
    !statusChecked || accountStatus === 'approved' || accountStatus === 'pending' || accountStatus === 'rejected' || accountStatus === 'active' || accountStatus === 'pending_review'
  );

  // 有效的律师 ID
  const lawyerId: string | number | undefined =
    user?.lawyerId || fallback.lawyerId || undefined;

  // isLoading: fallback 已同步初始化，只需等待 authLoading 和 statusChecked
  const isLoading = authLoading || (rawAuthorized && !statusChecked);

  // 获取带认证的请求头
  const getAuthHeaders = useCallback((): HeadersInit => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  // 统一处理 401 token 过期
  const handleFetchError = useCallback((response: Response) => {
    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user_info');
      sessionStorage.removeItem('currentLawyerId');
      setForceLoggedOut(true);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('open-login-modal'));
      }
    }
  }, []);

  // 带自动 401 处理的 fetch 封装
  const authFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    const authHeaders = getAuthHeaders();
    const mergedHeaders: HeadersInit = {
      ...(options.headers || {}),
      ...authHeaders,
    };
    const response = await fetch(url, { ...options, headers: mergedHeaders });
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
    accountStatus: accountStatus === 'banned' ? 'banned' : accountStatus,
  };
}
