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
  Bell,
  ChevronDown,
  Edit3,
  Wallet,
  Settings
} from 'lucide-react';

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
  badge?: 'pendingLawyerApplications' | 'pendingProfileRevisions' | 'pendingOrders' | 'pendingRefunds' | 'pendingGuardianWithdrawals' | 'pendingCommissions' | 'newUsersToday';
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
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
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
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    // 如果是登录页，不需要检查认证
    if (pathname === '/admin/login') {
      setLoading(false);
      return;
    }

    // 检查登录状态
    const checkAuth = () => {
      const adminInfo = localStorage.getItem('admin_info');
      if (!adminInfo) {
        router.push('/admin/login');
        return false;
      }
      try {
        setAdmin(JSON.parse(adminInfo));
      } catch (e) {
        console.error('解析管理员信息失败', e);
        router.push('/admin/login');
        return false;
      }
      return true;
    };

    if (!checkAuth()) return;

    // 监听登录状态变化
    const handleLoginChange = () => {
      if (!checkAuth()) {
        router.push('/admin/login');
      }
    };

    window.addEventListener('admin-logged-in', handleLoginChange);
    setLoading(false);

    return () => {
      window.removeEventListener('admin-logged-in', handleLoginChange);
    };
  }, [router, pathname]);

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
    router.push('/admin/login');
  };

  // 过滤有权限的菜单项
  const filteredNavItems = navItems.filter(item => {
    if (!item.permission) return true;
    return admin?.permissions?.includes(item.permission);
  });

  if (loading) {
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
    <div className="min-h-screen bg-slate-50">
      {/* Top Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
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
              {filteredNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    pathname === item.href
                      ? 'bg-green-50 text-green-700'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {item.icon}
                    {item.name}
                    {item.badge && stats[item.badge] > 0 && (
                      <span className="min-w-[20px] h-5 px-1.5 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full">
                        {stats[item.badge] > 99 ? '99+' : stats[item.badge]}
                      </span>
                    )}
                  </span>
                </Link>
              ))}
            </nav>

            {/* Right Side */}
            <div className="flex items-center gap-4">
              {/* Notifications */}
              <button className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              </button>

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
              {filteredNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-4 py-3 rounded-lg text-sm font-medium ${
                    pathname === item.href
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
                      <span className="min-w-[20px] h-5 px-1.5 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full">
                        {stats[item.badge] > 99 ? '99+' : stats[item.badge]}
                      </span>
                    )}
                  </span>
                </Link>
              ))}
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
