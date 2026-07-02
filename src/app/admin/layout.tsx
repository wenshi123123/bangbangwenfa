'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  ShoppingCart, 
  LogOut, 
  Menu, 
  X,
  Scale,
  Gift,
  Edit3,
  Wallet,
  Settings,
  Award,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

const ADMIN_LOGIN_HREF = '/admin/login';

function buildAdminLoginHref(redirectPath?: string | null) {
  if (!redirectPath) {
    return ADMIN_LOGIN_HREF;
  }

  return `${ADMIN_LOGIN_HREF}?redirect=${encodeURIComponent(redirectPath)}`;
}
interface AdminUser {
  id: number;
  username: string;
  nickname: string;
  permissions: string[];
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ReactNode;
  permission?: string;
  badge?: 'pendingLawyerApplications' | 'pendingProfileRevisions' | 'pendingOrders' | 'pendingRefunds' | 'pendingGuardianWithdrawals' | 'pendingCommissions' | 'newUsersToday' | 'onlineLawyers';
}

interface Stats {
  pendingLawyerApplications: number;
  pendingProfileRevisions: number;
  pendingOrders: number;
  pendingRefunds: number;
  pendingGuardianWithdrawals: number;
  pendingCommissions: number;
  newUsersToday: number;
  todayOrders: number;
  todayRevenue: number;
  onlineLawyers: number;
  yesterdayNewUsers: number;
  totalUsers: number;
  totalLawyers: number;
  yesterdayOrders: number;
  yesterdayRevenue: number;
}

const navItems: NavItem[] = [
  {
    name: '工作台',
    href: '/admin/dashboard',
    icon: <LayoutDashboard className="w-5 h-5" />
  },
  {
    name: '律师入驻审核',
    href: '/admin/lawyer',
    icon: <Scale className="w-5 h-5" />,
    permission: 'lawyer_audit',
    badge: 'pendingLawyerApplications'
  },
  {
    name: '律师名单',
    href: '/admin/lawyers',
    icon: <Users className="w-5 h-5" />,
    permission: 'lawyer_audit',
    badge: 'onlineLawyers',
  },
  {
    name: '会员管理',
    href: '/admin/members',
    icon: <Award className="w-5 h-5" />,
    permission: 'lawyer_audit',
  },
  {
    name: '资料修改审核',
    href: '/admin/profile-revisions',
    icon: <Edit3 className="w-5 h-5" />,
    permission: 'lawyer_audit',
    badge: 'pendingProfileRevisions'
  },
  {
    name: '订单管理',
    href: '/admin/orders',
    icon: <ShoppingCart className="w-5 h-5" />,
    permission: 'order_manage',
    badge: 'pendingOrders'
  },
  {
    name: '用户管理',
    href: '/admin/users',
    icon: <Users className="w-5 h-5" />,
    permission: 'user_manage',
    badge: 'newUsersToday'
  },
  {
    name: '退款处理',
    href: '/admin/refunds',
    icon: <FileText className="w-5 h-5" />,
    permission: 'refund_process',
    badge: 'pendingRefunds'
  },
  {
    name: '守护者提现',
    href: '/admin/guardian-withdrawals',
    icon: <Wallet className="w-5 h-5" />,
    permission: 'guardian_manage',
    badge: 'pendingGuardianWithdrawals'
  },
  {
    name: '分成审核',
    href: '/admin/guardian-commissions',
    icon: <Gift className="w-5 h-5" />,
    permission: 'guardian_manage',
    badge: 'pendingCommissions'
  },
  {
    name: '价格配置',
    href: '/admin/price',
    icon: <Settings className="w-5 h-5" />
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const isPublicPath = pathname?.startsWith('/admin/login') ?? false;
  const [hydrated, setHydrated] = useState(false);
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [authResolved, setAuthResolved] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);
  const [stats, setStats] = useState<Stats>({
    pendingLawyerApplications: 0,
    pendingProfileRevisions: 0,
    pendingOrders: 0,
    pendingRefunds: 0,
    pendingGuardianWithdrawals: 0,
    pendingCommissions: 0,
    newUsersToday: 0,
    todayOrders: 0,
    todayRevenue: 0,
    onlineLawyers: 0,
    yesterdayNewUsers: 0,
    totalUsers: 0,
    totalLawyers: 0,
    yesterdayOrders: 0,
    yesterdayRevenue: 0,
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setHydrated(true);

    // 如果是登录页，不需要检查认证，也不要挂载后台壳子
    if (isPublicPath) {
      setAuthResolved(true);
      return;
    }

    const checkAuth = async () => {
      const currentQuery = typeof window !== 'undefined' ? window.location.search.slice(1) : '';
      const currentRedirectPath = currentQuery
        ? `${pathname || '/admin/dashboard'}?${currentQuery}`
        : (pathname || '/admin/dashboard');
      const adminInfo = localStorage.getItem('admin_info');
      const adminToken = localStorage.getItem('admin_token');

      if (!adminInfo || !adminToken) {
        setUnauthorized(true);
        setAuthResolved(true);
        router.replace(buildAdminLoginHref(currentRedirectPath));
        return false;
      }
      try {
        setAdmin(JSON.parse(adminInfo));
      } catch (e) {
        console.error('解析管理员信息失败', e);
        setUnauthorized(true);
        setAuthResolved(true);
        router.replace(buildAdminLoginHref(currentRedirectPath));
        return false;
      }

      // 向 API 验证 token 是否过期
      try {
        const res = await fetch('/api/admin/auth', {
          headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const result = await res.json();
        if (!result.success) {
          // Token 无效或过期，清理并重定向
          localStorage.removeItem('admin_info');
          localStorage.removeItem('admin_token');
          setUnauthorized(true);
          setAuthResolved(true);
          router.replace(buildAdminLoginHref(currentRedirectPath));
          return false;
        }
      } catch (err) {
        console.error('验证 token 失败:', err);
        // 网络错误时不拦截，页面可离线使用
      }

      return true;
    };

    checkAuth().then((valid) => {
      if (!valid) return;
      setAuthResolved(true);
    });

    // 监听登录/登出事件
    const handleLoginChange = () => {
      window.location.reload();
    };
    const handleLogout = () => {
      setUnauthorized(true);
      router.replace(ADMIN_LOGIN_HREF);
    };

    window.addEventListener('admin-logged-in', handleLoginChange);
    window.addEventListener('admin-logged-out', handleLogout);

    return () => {
      window.removeEventListener('admin-logged-in', handleLoginChange);
      window.removeEventListener('admin-logged-out', handleLogout);
    };
  }, [router, pathname, isPublicPath]);

  const fetchStats = useCallback(async () => {
    try {
      const adminToken = localStorage.getItem('admin_token');
      const headers: HeadersInit = {};
      if (adminToken) {
        headers['Authorization'] = `Bearer ${adminToken}`;
      }
      const res = await fetch('/api/admin/stats', { headers });
      const result = await res.json();
      if (result.success) {
        setStats(result.data);
      }
    } catch (err) {
      console.error('获取统计失败:', err);
    }
  }, []);

  // 获取统计数据
  useEffect(() => {
    if (admin) {
      fetchStats();
      // 每30秒刷新一次
      const interval = setInterval(fetchStats, 30000);
      return () => clearInterval(interval);
    }
  }, [admin, fetchStats]);

  const handleLogout = () => {
    localStorage.removeItem('admin_info');
    localStorage.removeItem('admin_token');
    window.dispatchEvent(new Event('admin-logged-out'));
    router.push(ADMIN_LOGIN_HREF);
  };

  // 过滤有权限的菜单项
  const filteredNavItems = navItems.filter(item => {
    if (!item.permission) return true;
    // 超级管理员（permissions包含'all'）拥有所有权限
    if (admin?.permissions?.includes('all')) return true;
    return admin?.permissions?.includes(item.permission);
  });

  if (isPublicPath) {
    return <>{children}</>;
  }

  if (!hydrated || unauthorized || !authResolved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-[0_12px_40px_rgba(15,23,42,0.08)] text-center">
          <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-green-50 flex items-center justify-center">
            <Scale className="w-7 h-7 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">管理员登录</h1>
          <p className="mt-2 text-sm text-slate-500">
            {unauthorized ? '请先登录管理员账号后再访问后台' : '正在校验管理员身份...'}
          </p>
          <div className="mt-6">
            <button
              onClick={() => router.replace(ADMIN_LOGIN_HREF)}
              className="inline-flex items-center justify-center rounded-full bg-green-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-green-700"
            >
              前往登录
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Header */}
      <header className="bg-white shadow-[0_2px_8px_rgba(61,50,45,0.06)] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Title */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                <Scale className="w-5 h-5 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-slate-800">帮帮问法</h1>
                <p className="text-xs text-slate-500">管理后台</p>
              </div>
            </div>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1">
              {filteredNavItems.map((item) => {
                // 在线律师 badge：点击自动跳到筛选在线律师
                const isLawyerBadge = item.badge === 'onlineLawyers';
                const href = isLawyerBadge && stats.onlineLawyers > 0
                  ? `${item.href}?onlineStatus=online`
                  : item.href;
                return (
                <Link
                  key={item.href}
                  href={href}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    pathname === item.href || (isLawyerBadge && pathname.startsWith(item.href))
                      ? 'bg-green-50 text-green-700'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {item.icon}
                    {item.name}
                    {item.badge && stats[item.badge] > 0 && (
                      <span className={`min-w-[20px] h-5 px-1.5 flex items-center justify-center text-white text-xs font-bold rounded-full ${
                        item.badge === 'onlineLawyers' ? 'bg-emerald-500' : 'bg-red-500'
                      }`}>
                        {stats[item.badge] > 99 ? '99+' : stats[item.badge]}
                      </span>
                    )}
                  </span>
                </Link>
                );
              })}
            </nav>

            {/* Right Side */}
            <div className="flex items-center gap-4">
              {/* User Menu */}
              <div className="flex items-center gap-3">
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-medium text-slate-800">{admin?.nickname}</p>
                  <p className="text-xs text-slate-500">@{admin?.username}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                  title="退出登录"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white">
            <nav className="px-4 py-3 space-y-1">
              {filteredNavItems.map((item) => {
                const isLawyerBadge = item.badge === 'onlineLawyers';
                const href = isLawyerBadge && stats.onlineLawyers > 0
                  ? `${item.href}?onlineStatus=online`
                  : item.href;
                return (
                <Link
                  key={item.href}
                  href={href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-4 py-3 rounded-lg text-sm font-medium ${
                    pathname === item.href || (isLawyerBadge && pathname.startsWith(item.href))
                      ? 'bg-green-50 text-green-700'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-3">
                      {item.icon}
                      {item.name}
                    </span>
                    {item.badge && stats[item.badge] > 0 && (
                      <span className={`min-w-[20px] h-5 px-1.5 flex items-center justify-center text-white text-xs font-bold rounded-full ${
                        item.badge === 'onlineLawyers' ? 'bg-emerald-500' : 'bg-red-500'
                      }`}>
                        {stats[item.badge] > 99 ? '99+' : stats[item.badge]}
                      </span>
                    )}
                  </span>
                </Link>
                );
              })}
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-6">
        <Suspense fallback={
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
          </div>
        }>
          {children}
        </Suspense>
      </div>
    </div>
  );
}
