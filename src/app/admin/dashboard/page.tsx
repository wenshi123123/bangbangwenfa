'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Users, 
  Scale, 
  ShoppingCart, 
  TrendingUp, 
  Wallet,
  Clock,
  CheckCircle,
  ArrowRight,
  Bell,
  Download,
  BarChart3,
  PieChart,
  TrendingDown,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { adminApiRequest } from '@/lib/api/request';
import { getAdminLoginUrl } from '@/lib/site';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart as RechartsPie,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

export const dynamic = 'force-dynamic';

interface DashboardStats {
  totalLawyers: number;
  pendingLawyers: number;
  totalOrders: number;
  pendingOrders: number;
  todayOrders: number;
  todayRevenue: number;
  totalRevenue: number;
  pendingGuardianWithdrawals: number;
  totalUsers: number;
  totalGuardians: number;
  totalCommission: number;
  availableCommission: number;
}

interface AnalyticsData {
  overview: {
    totalOrders: number;
    pendingOrders: number;
    completedOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
  };
  users: {
    total: number;
    newInPeriod: number;
  };
  lawyers: {
    total: number;
    pendingApplications: number;
  };
  guardians: {
    total: number;
    totalCommission: number;
    totalWithdrawn: number;
    availableCommission: number;
  };
  serviceTypes: Array<{
    type: string;
    count: number;
    revenue: number;
  }>;
  trend: Array<{
    date: string;
    orders: number;
    revenue: number;
    users: number;
  }>;
  period: number;
}

const COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalLawyers: 0,
    pendingLawyers: 0,
    totalOrders: 0,
    pendingOrders: 0,
    todayOrders: 0,
    todayRevenue: 0,
    totalRevenue: 0,
    pendingGuardianWithdrawals: 0,
    totalUsers: 0,
    totalGuardians: 0,
    totalCommission: 0,
    availableCommission: 0
  });
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('admin_info') && !!localStorage.getItem('admin_token');
  });
  const [needsLogin, setNeedsLogin] = useState(() => {
    if (typeof window === 'undefined') return true;
    return !localStorage.getItem('admin_info') || !localStorage.getItem('admin_token');
  });
  const [period, setPeriod] = useState(30);
  const pathname = usePathname();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const adminInfo = localStorage.getItem('admin_info');
      if (!adminInfo) {
        setNeedsLogin(true);
        setLoading(false);
        return;
      }

      // 并行获取所有数据
      const [lawyerRes, orderRes, withdrawRes, analyticsRes] = await Promise.all([
        adminApiRequest('/api/admin/lawyer/stats'),
        adminApiRequest('/api/admin/order/stats'),
        adminApiRequest('/api/admin/guardian-withdrawals?status=pending'),
        adminApiRequest(`/api/admin/analytics/overview?days=${period}`)
      ]);

      const [lawyerData, orderData, withdrawData, analyticsData] = await Promise.all([
        lawyerRes.json(),
        orderRes.json(),
        withdrawRes.json(),
        analyticsRes.json()
      ]);

      // 更新统计数据
      if (lawyerData.success) {
        setStats(prev => ({
          ...prev,
          totalLawyers: lawyerData.data.total || 0,
          pendingLawyers: lawyerData.data.pending || 0
        }));
      }

      if (orderData.success) {
        setStats(prev => ({
          ...prev,
          totalOrders: orderData.data.total || 0,
          pendingOrders: orderData.data.pending || 0,
          todayOrders: orderData.data.today || 0,
          todayRevenue: orderData.data.todayRevenue || 0,
          totalRevenue: orderData.data.totalRevenue || 0
        }));
      }

      if (withdrawData.success) {
        setStats(prev => ({
          ...prev,
          pendingGuardianWithdrawals: withdrawData.data?.length || 0
        }));
      }

      if (analyticsData.success) {
        setAnalytics(analyticsData.data);
        setStats(prev => ({
          ...prev,
          totalUsers: analyticsData.data.users.total || 0,
          totalGuardians: analyticsData.data.guardians.total || 0,
          totalCommission: analyticsData.data.guardians.totalCommission || 0,
          availableCommission: analyticsData.data.guardians.availableCommission || 0
        }));
      }
    } catch (error) {
      console.error('获取统计数据失败:', error);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 手动刷新
  const handleRefresh = () => {
    fetchData();
  };

  // 格式化金额
  const formatMoney = (cents: number) => {
    const yuan = cents / 100;
    return yuan.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // 趋势图数据
  const trendData = analytics?.trend?.slice(-14) || [];

  // 服务类型饼图数据
  // 服务类型中文映射
  const SERVICE_TYPE_MAP: Record<string, string> = {
    'consult': '咨询',
    'litigate': '诉讼',
    'basic': '基础咨询',
    'standard': '标准服务',
    'advanced': '高级服务',
    'lawyer_subscription': '律师订阅',
    'consult,litigate': '咨询+诉讼',
    'litigate,consult': '诉讼+咨询',
    'consult,full': '咨询+全套服务',
  };

  const pieData = analytics?.serviceTypes?.slice(0, 5).map((item, index) => ({
    name: SERVICE_TYPE_MAP[item.type] || item.type,
    value: item.revenue / 100,
    color: COLORS[index % COLORS.length]
  })) || [];

  if (needsLogin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-[0_12px_40px_rgba(15,23,42,0.08)] text-center">
          <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-green-50 flex items-center justify-center">
            <Scale className="w-7 h-7 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">管理员登录</h1>
          <p className="mt-2 text-sm text-slate-500">请先登录管理员账号后再访问后台</p>
          <div className="mt-6">
            <Link
              href={getAdminLoginUrl()}
              className="inline-flex items-center justify-center rounded-full bg-green-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-green-700"
            >
              前往登录
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const statCards: Array<{
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ReactNode;
    href: string;
    color: string;
    bgColor: string;
    badge?: number;
    urgent?: boolean;
    trend?: { value: number; positive: boolean };
  }> = [
    {
      title: '咨询订单总数',
      value: stats.totalOrders,
      subtitle: `待处理: ${stats.pendingOrders}`,
      icon: <ShoppingCart className="w-6 h-6" />,
      href: '/admin/orders',
      color: 'from-blue-500 to-indigo-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: '总营收 (元)',
      value: formatMoney(stats.totalRevenue),
      icon: <TrendingUp className="w-6 h-6" />,
      href: '/admin/orders',
      color: 'from-green-500 to-emerald-600',
      bgColor: 'bg-green-50',
      trend: { value: 12.5, positive: true }
    },
    {
      title: '注册用户',
      value: stats.totalUsers,
      subtitle: analytics ? `新增: +${analytics.users.newInPeriod}` : undefined,
      icon: <Users className="w-6 h-6" />,
      href: '/admin/users',
      color: 'from-purple-500 to-pink-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: '入驻律师',
      value: stats.totalLawyers,
      subtitle: `待审核: ${stats.pendingLawyers}`,
      icon: <Scale className="w-6 h-6" />,
      href: '/admin/lawyer',
      color: 'from-amber-500 to-orange-600',
      bgColor: 'bg-amber-50',
      badge: stats.pendingLawyers > 0 ? stats.pendingLawyers : undefined
    },
    {
      title: '守护者总数',
      value: stats.totalGuardians,
      icon: <Users className="w-6 h-6" />,
      href: '/admin/guardians',
      color: 'from-teal-500 to-cyan-600',
      bgColor: 'bg-teal-50'
    },
    {
      title: '待处理提现',
      value: stats.pendingGuardianWithdrawals,
      icon: <Wallet className="w-6 h-6" />,
      href: '/admin/guardian-withdrawals?status=pending',
      color: 'from-rose-500 to-red-600',
      bgColor: 'bg-rose-50',
      badge: stats.pendingGuardianWithdrawals > 0 ? stats.pendingGuardianWithdrawals : undefined,
      urgent: stats.pendingGuardianWithdrawals > 0
    }
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">运营数据看板</h1>
          <p className="text-slate-500 mt-1">实时监控业务数据，掌握运营状况</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* 时间筛选 */}
          <div className="flex bg-slate-100 rounded-lg p-1">
            {[7, 30, 90].map(days => (
              <button
                key={days}
                onClick={() => setPeriod(days)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                  period === days
                    ? 'bg-white text-slate-800 shadow-[0_2px_8px_rgba(61,50,45,0.06)]'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {days}天
              </button>
            ))}
          </div>
          {/* 手动刷新 */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? '刷新中...' : '刷新'}
          </Button>
          {/* 发送通知 */}
          <Link href="/admin/notifications">
            <Button variant="outline" size="sm" className="gap-2">
              <Bell className="w-4 h-4" />
              发送通知
            </Button>
          </Link>
          {/* 数据导出 */}
          <Link href="/admin/analytics">
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="w-4 h-4" />
              数据导出
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid - 2行3列布局 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((card, index) => (
          <Link
            key={index}
            href={card.href}
            className={`bg-white rounded-xl p-5 shadow-[0_2px_8px_rgba(61,50,45,0.06)] hover:shadow-md transition-all flex items-center gap-4 ${
              card.urgent ? 'ring-2 ring-red-300' : ''
            }`}
          >
            {/* 图标 */}
            <div className={`${card.bgColor} p-3 rounded-xl flex-shrink-0`}>
              <div className={`bg-gradient-to-br ${card.color} p-2.5 rounded-lg text-white`}>
                {card.icon}
              </div>
            </div>
            {/* 内容 */}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-500">{card.title}</p>
              <p className="text-xl font-bold text-slate-800 mt-1">
                {loading ? '-' : card.value}
              </p>
              {card.subtitle && (
                <p className="text-xs text-slate-400 mt-0.5">{card.subtitle}</p>
              )}
            </div>
            {/* Badge */}
            {card.badge && (
              <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full flex-shrink-0 ${
                card.urgent 
                  ? 'bg-red-100 text-red-700 animate-pulse' 
                  : 'bg-amber-100 text-amber-700'
              }`}>
                {card.urgent ? '紧急' : '待处理'}
              </span>
            )}
          </Link>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 营收趋势图 */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-slate-500" />
              订单与营收趋势
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-64 flex items-center justify-center">
                <p className="text-slate-400">加载中...</p>
              </div>
            ) : trendData.length === 0 ? (
              <div className="h-64 flex items-center justify-center">
                <p className="text-slate-400">暂无数据</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(val) => val.slice(5)}
                  />
                  <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} tickFormatter={(val) => `¥${(val/100).toLocaleString()}`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none' }}
                    formatter={(value: number, name: string) => [
                      name === 'revenue' ? `¥${(value / 100).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}` : value,
                      name === 'revenue' ? '营收' : '订单'
                    ]}
                  />
                  <Legend />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="orders" 
                    stroke="#6366f1" 
                    strokeWidth={2}
                    dot={false}
                    name="订单数"
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    dot={false}
                    name="营收"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* 服务类型分布 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <PieChart className="w-5 h-5 text-slate-500" />
              服务类型占比
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-48 flex items-center justify-center">
                <p className="text-slate-400">加载中...</p>
              </div>
            ) : pieData.length === 0 ? (
              <div className="h-48 flex items-center justify-center">
                <p className="text-slate-400">暂无数据</p>
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <RechartsPie>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => `¥${value.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`}
                      contentStyle={{ borderRadius: '8px', border: 'none' }}
                    />
                  </RechartsPie>
                </ResponsiveContainer>
                <div className="space-y-2 mt-2">
                  {pieData.map((item, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-slate-600">{item.name}</span>
                      </div>
                      <span className="font-medium text-slate-800">¥{item.value.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 待审核事项 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold">待审核事项</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 律师入驻审核 */}
            <Link href="/admin/lawyer?status=pending">
              <div className={`flex items-center justify-between p-4 rounded-xl transition-all ${
                stats.pendingLawyers > 0 
                  ? 'bg-amber-50 hover:bg-amber-100' 
                  : 'bg-slate-50 hover:bg-slate-100'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    stats.pendingLawyers > 0 ? 'bg-amber-100' : 'bg-slate-200'
                  }`}>
                    <Scale className={`w-5 h-5 ${stats.pendingLawyers > 0 ? 'text-amber-600' : 'text-slate-500'}`} />
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">律师入驻申请</p>
                    <p className="text-sm text-slate-500">
                      {stats.pendingLawyers > 0 ? `有 ${stats.pendingLawyers} 条待审核` : '暂无待审核'}
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-400" />
              </div>
            </Link>

            {/* 守护者提现 */}
            <Link href="/admin/guardian-withdrawals?status=pending">
              <div className={`flex items-center justify-between p-4 rounded-xl transition-all ${
                stats.pendingGuardianWithdrawals > 0 
                  ? 'bg-rose-50 hover:bg-rose-100' 
                  : 'bg-slate-50 hover:bg-slate-100'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    stats.pendingGuardianWithdrawals > 0 ? 'bg-rose-100' : 'bg-slate-200'
                  }`}>
                    <Wallet className={`w-5 h-5 ${stats.pendingGuardianWithdrawals > 0 ? 'text-rose-600' : 'text-slate-500'}`} />
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">守护者提现申请</p>
                    <p className="text-sm text-slate-500">
                      {stats.pendingGuardianWithdrawals > 0 
                        ? `有 ${stats.pendingGuardianWithdrawals} 条待处理` 
                        : '暂无待处理'}
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-400" />
              </div>
            </Link>

            {/* 发送系统通知 */}
            <Link href="/admin/notifications">
              <div className="flex items-center justify-between p-4 rounded-xl bg-blue-50 hover:bg-blue-100 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Bell className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">发送系统通知</p>
                    <p className="text-sm text-slate-500">向用户推送消息通知</p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-400" />
              </div>
            </Link>
          </CardContent>
        </Card>

        {/* 关键指标 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold">关键指标</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div>
                  <p className="text-sm text-slate-500">平均客单价</p>
                  <p className="text-xl font-bold text-slate-800">
                    {analytics?.overview.averageOrderValue 
                      ? `¥${(analytics.overview.averageOrderValue / 100).toFixed(2)}`
                      : '-'}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div>
                  <p className="text-sm text-slate-500">守护者累计分成</p>
                  <p className="text-xl font-bold text-green-600">
                    ¥{(stats.totalCommission / 100).toFixed(2)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div>
                  <p className="text-sm text-slate-500">可发放分成</p>
                  <p className="text-xl font-bold text-amber-600">
                    ¥{(stats.availableCommission / 100).toFixed(2)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-amber-600" />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div>
                  <p className="text-sm text-slate-500">订单完成率</p>
                  <p className="text-xl font-bold text-slate-800">
                    {stats.totalOrders > 0 
                      ? `${((analytics?.overview.completedOrders || 0) / stats.totalOrders * 100).toFixed(1)}%`
                      : '-'}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
