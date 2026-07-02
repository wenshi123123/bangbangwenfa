'use client';

import { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from 'react';
import { usePathname } from 'next/navigation';

export type UserType = 'user' | 'guardian' | 'lawyer';

export interface GuardianInfo {
  id: number;
  inviteCode: string;
  totalInvites: number;
  validInvites: number;
  totalCommission: number;
  availableCommission: number;
}

export interface LawyerInfo {
  id: string | number;
  name: string;
  status: 'pending' | 'approved' | 'paid' | 'expired' | 'active' | 'rejected';
  expireAt?: string;
}

export interface UserInfo {
  id: number;
  phone: string;
  username: string | null;
  nickname: string;
  avatarUrl?: string | null;
  userType: UserType;
  // 守护者信息
  isGuardian: boolean;
  guardianInfo?: GuardianInfo | null;
  // 律师信息
  isLawyer: boolean;
  lawyerInfo?: LawyerInfo | null;
  // 兼容旧字段
  lawyerId?: string | number;
  lawyerStatus?: LawyerInfo['status'];
  lawyerExpireAt?: string;
  inviteCode?: string;
  totalInvites?: number;
  validInvites?: number;
  totalCommission?: number;
  availableCommission?: number;
  withdrawnCommission?: number;
}

interface AuthContextType {
  user: UserInfo | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
  checkAuth: () => Promise<void>;
  updateUser: (data: { nickname?: string }) => Promise<void>;
  refreshAuth: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 全局滚动重置组件
function GlobalScrollReset() {
  const pathname = usePathname();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return; // 首次渲染不滚动
    }
    
    // 延迟滚动确保新页面内容加载完成
    const timer = setTimeout(() => {
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      });
    }, 200);

    return () => clearTimeout(timer);
  }, [pathname]);

  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 从存储数据构建用户信息
  const buildUserInfo = useCallback((userData: any): UserInfo => {
    const guardianInfo = userData.guardianInfo;
    const lawyerInfo = userData.lawyerInfo;
    
    return {
      id: userData.id,
      phone: userData.phone || '',
      username: userData.username || null,
      nickname: userData.nickname || '',
      avatarUrl: userData.avatarUrl || null,
      userType: userData.userType || 'user',
      // 守护者信息
      isGuardian: userData.isGuardian || !!guardianInfo,
      guardianInfo: guardianInfo,
      // 律师信息
      isLawyer: userData.isLawyer || !!lawyerInfo,
      lawyerInfo: lawyerInfo,
      // 兼容旧字段
      lawyerId: lawyerInfo?.id,
      lawyerStatus: lawyerInfo?.status,
      lawyerExpireAt: lawyerInfo?.expireAt,
      inviteCode: guardianInfo?.inviteCode,
      totalInvites: guardianInfo?.totalInvites,
      validInvites: guardianInfo?.validInvites,
      totalCommission: guardianInfo?.totalCommission,
      availableCommission: guardianInfo?.availableCommission,
    };
  }, []);

  // 检查登录状态
  const checkAuth = useCallback(async () => {
    try {
      // 读取 user_info（统一登录方式）
      const userInfoStr = localStorage.getItem('user_info');
      
      if (userInfoStr) {
        try {
          const userData = JSON.parse(userInfoStr);
          // 🔑 从 token 中检查 userType，覆盖 isLawyer 状态
          const token = localStorage.getItem('token');
          if (token) {
            try {
              // 修复：支持 base64url 编码的 JWT
              const parts = token.split('.');
              if (parts.length === 3) {
                let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
                const pad = base64.length % 4;
                if (pad === 2) base64 += '==';
                else if (pad === 3) base64 += '=';
                const payload = JSON.parse(atob(base64));
                if (payload.userType === 'lawyer') {
                  userData.isLawyer = true;
                  userData.userType = 'lawyer';
                  if (payload.lawyerId) {
                    userData.lawyerInfo = userData.lawyerInfo || {};
                    userData.lawyerInfo.id = payload.lawyerId;
                  }
                }
              }
            } catch { /* token 解析失败，忽略 */ }
          }
          setUser(buildUserInfo(userData));
        } catch (e) {
          console.error('解析 user_info 失败:', e);
          setUser(null);
        }
      } else {
        // 兼容旧的 guardian_user 存储
        const guardianStr = localStorage.getItem('guardian_user');
        if (guardianStr) {
          try {
            const guardianData = JSON.parse(guardianStr);
            // 转换为新的用户格式
            setUser(buildUserInfo({
              id: guardianData.id,
              phone: guardianData.phone,
              nickname: guardianData.nickname,
              userType: 'guardian',
              isGuardian: true,
              guardianInfo: {
                id: guardianData.id,
                inviteCode: guardianData.invite_code,
                totalInvites: guardianData.total_invites,
                validInvites: guardianData.valid_invites,
                totalCommission: guardianData.total_commission,
                availableCommission: guardianData.available_commission,
              },
              isLawyer: false,
              lawyerInfo: null,
            }));
          } catch (e) {
            console.error('解析 guardian_user 失败:', e);
            setUser(null);
          }
        } else {
          setUser(null);
        }
      }
    } catch (error) {
      console.error('检查登录状态失败:', error);
      setUser(null);
    }
  }, [buildUserInfo]);

  // 初始化检查 + 监听登录成功事件
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      setIsLoading(true);
      try {
        await checkAuth();
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();
    
    // 监听登录成功事件
    const handleLoginSuccess = (event: Event) => {
      const customEvent = event as CustomEvent;
      const userData = customEvent.detail;
      
      if (userData) {
        // 注意：调用方（login-modal/register-page）已经将 user_info 和 token 写入 localStorage
        // 这里只更新 React 状态，避免重复写入
        setUser(buildUserInfo(userData));
        setIsLoading(false);
      }
    };

    // 监听律师状态更新事件
    const handleLawyerStatusUpdated = () => {
      const userInfoStr = localStorage.getItem('user_info');
      if (userInfoStr) {
        try {
          const userData = JSON.parse(userInfoStr);
          // 重新构建用户信息
          setUser(buildUserInfo(userData));
        } catch (e) {
          console.error('解析用户信息失败:', e);
        }
      }
    };

    window.addEventListener('user-logged-in', handleLoginSuccess);
    window.addEventListener('lawyer-status-updated', handleLawyerStatusUpdated);

    // 监听 Token 过期事件
    const handleAuthExpired = () => {
      console.log('Token 已过期，需要重新登录');
      setUser(null);
      // 可选：自动打开登录弹窗
      window.dispatchEvent(new CustomEvent('open-login-modal'));
    };
    window.addEventListener('auth-expired', handleAuthExpired);

    // 监听 storage 事件（跨标签页通信）
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'user_info' && e.newValue) {
        try {
          const userData = JSON.parse(e.newValue);
          setUser(buildUserInfo(userData));
        } catch (err) {
          console.error('解析 storage 用户信息失败:', err);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      mounted = false;
      window.removeEventListener('user-logged-in', handleLoginSuccess);
      window.removeEventListener('lawyer-status-updated', handleLawyerStatusUpdated);
      window.removeEventListener('auth-expired', handleAuthExpired);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [buildUserInfo, checkAuth]);

  // 登录（打开登录弹窗）
  const login = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('open-login-modal'));
    }
  }, []);

  // 退出登录
  const logout = useCallback(() => {
    localStorage.removeItem('user_info');
    localStorage.removeItem('guardian_user');
    localStorage.removeItem('user_id');
    localStorage.removeItem('token');
    document.cookie = 'token=; path=/; max-age=0; samesite=lax';
    setUser(null);
    window.location.href = '/';
  }, []);

  // 刷新登录状态
  const refreshAuth = useCallback(() => {
    checkAuth();
  }, [checkAuth]);

  // 更新用户信息
  const updateUser = useCallback(async (data: { nickname?: string }) => {
    if (!user) throw new Error('未登录');

    // 从 localStorage 获取最新数据
    const userInfoStr = localStorage.getItem('user_info');
    const userData = userInfoStr ? JSON.parse(userInfoStr) : null;
    
    if (!userData) throw new Error('用户数据不存在');

    // 更新本地数据
    const updatedData = {
      ...userData,
      nickname: data.nickname || userData.nickname,
    };

    // 保存到 localStorage
    localStorage.setItem('user_info', JSON.stringify(updatedData));

    // 同步更新状态
    setUser(buildUserInfo(updatedData));
  }, [user, buildUserInfo]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoggedIn: !!user,
        isLoading,
        login,
        logout,
        checkAuth,
        updateUser,
        refreshAuth,
      }}
    >
      <GlobalScrollReset />
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
