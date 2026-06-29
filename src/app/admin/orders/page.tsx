'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Search, 
  Eye,
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Scale
} from 'lucide-react';
import { adminApiRequest } from '@/lib/api/request';

interface TrendData {
  todayOrders: number;
  yesterdayOrders: number;
  todayRevenue: number;
  yesterdayRevenue: number;
  pendingOrders: number;
  pendingPaymentOrders: number;
}

interface Order {
  id: number;
  contact_name: string;
  contact_phone: string;
  case_type: string;
  case_title: string;
  service_type: string;
  service_price: number;
  payment_status: string;
  category: string;
  created_at: string;
}

const paymentStatusMap = {
  pending: { label: '待支付', color: 'bg-amber-100 text-amber-700' },
  paid: { label: '已支付', color: 'bg-green-100 text-green-700' },
  refunded: { label: '已退款', color: 'bg-slate-100 text-slate-700' },
};

const categoryMap = {
  criminal: { label: '刑事案件', color: 'text-red-600' },
  civil: { label: '民事案件', color: 'text-blue-600' },
};

const serviceTypeMap = {
  basic: { label: '基础咨询' },
  standard: { label: '标准咨询' },
  advanced: { label: '深度咨询' },
  consult: { label: '咨询服务' },
  lawyer_subscription: { label: '律师订阅' },
  default: { label: '其他服务' },
};

const ADMIN_LOGIN_HREF = '/admin/login?v=20260629a';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function OrderListPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [needsLogin, setNeedsLogin] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !localStorage.getItem('admin_info');
  });
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [trend, setTrend] = useState<TrendData | null>(null);
  const pageSize = 10;

  useEffect(() => {
    const fetchList = async () => {
      setLoading(true);
      try {
        const adminInfo = localStorage.getItem('admin_info');
        if (!adminInfo) {
          setNeedsLogin(true);
          setLoading(false);
          return;
        }
        const params = new URLSearchParams({ page: page.toString(), pageSize: pageSize.toString() });
        if (statusFilter) params.set('status', statusFilter);
        if (categoryFilter) params.set('category', categoryFilter);

        const response = await adminApiRequest(`/api/admin/order/list?${params}`);
        const result = await response.json();
        if (result.success) {
          let list = result.data.list;
          // 客户端搜索过滤
          if (searchKeyword) {
            const keyword = searchKeyword.toLowerCase();
            list = list.filter((order: Order) => 
              order.contact_name.toLowerCase().includes(keyword) ||
              order.contact_phone.includes(keyword) ||
              order.case_title.toLowerCase().includes(keyword)
            );
          }
          setOrders(list);
          setTotal(result.data.total);
        }
      } catch (error) {
        console.error('获取订单列表失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchList();
  }, [page, statusFilter, categoryFilter, searchKeyword]);

  // 获取趋势数据
  useEffect(() => {
    const fetchTrend = async () => {
      try {
        const res = await adminApiRequest('/api/admin/stats');
        const result = await res.json();
        if (result.success) {
          setTrend({
            todayOrders: result.data.todayOrders || 0,
            yesterdayOrders: result.data.yesterdayOrders || 0,
            todayRevenue: result.data.todayRevenue || 0,
            yesterdayRevenue: result.data.yesterdayRevenue || 0,
            pendingOrders: result.data.pendingOrders || 0,
            pendingPaymentOrders: 0,
          });
        }
      } catch (e) {
        console.error('获取趋势数据失败:', e);
      }
    };
    fetchTrend();
  }, []);

  const totalPages = Math.ceil(total / pageSize);

  if (needsLogin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-[0_12px_40px_rgba(15,23,42,0.08)] text-center">
          <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-green-50 flex items-center justify-center">
            <Scale className="w-7 h-7 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">管理员登录</h1>
          <p className="mt-2 text-sm text-slate-500">请先登录管理员账号后再访问订单管理</p>
          <div className="mt-6">
            <Link
              href={ADMIN_LOGIN_HREF}
              className="inline-flex items-center justify-center rounded-full bg-green-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-green-700"
            >
              前往登录
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">订单管理</h1>
          <p className="text-slate-500 mt-1">管理所有咨询订单，处理退款等操作</p>
        </div>
      </div>

      {/* 趋势卡片 */}
      {trend && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-[0_2px_8px_rgba(61,50,45,0.06)]">
            <p className="text-xs text-slate-500 mb-1">今日订单</p>
            <p className="text-2xl font-bold text-slate-800">{trend.todayOrders}</p>
            {trend.yesterdayOrders > 0 && (
              <p className={`text-xs mt-1 ${trend.todayOrders >= trend.yesterdayOrders ? 'text-green-600' : 'text-red-500'}`}>
                {trend.todayOrders >= trend.yesterdayOrders ? '↑' : '↓'}
                {Math.abs(Math.round((trend.todayOrders - trend.yesterdayOrders) / trend.yesterdayOrders * 100))}%
                较昨日
              </p>
            )}
          </div>
          <div className="bg-white rounded-xl p-4 shadow-[0_2px_8px_rgba(61,50,45,0.06)]">
            <p className="text-xs text-slate-500 mb-1">今日收入</p>
            <p className="text-2xl font-bold text-slate-800">¥{(trend.todayRevenue / 100).toFixed(2)}</p>
            {trend.yesterdayRevenue > 0 && (
              <p className={`text-xs mt-1 ${trend.todayRevenue >= trend.yesterdayRevenue ? 'text-green-600' : 'text-red-500'}`}>
                {trend.todayRevenue >= trend.yesterdayRevenue ? '↑' : '↓'}
                {Math.abs(Math.round((trend.todayRevenue - trend.yesterdayRevenue) / trend.yesterdayRevenue * 100))}%
                较昨日
              </p>
            )}
          </div>
          <div className="bg-white rounded-xl p-4 shadow-[0_2px_8px_rgba(61,50,45,0.06)]">
            <p className="text-xs text-slate-500 mb-1">待派单</p>
            <p className="text-2xl font-bold text-amber-600">{trend.pendingOrders}</p>
            <p className="text-xs text-slate-400 mt-1">需尽快处理</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-[0_2px_8px_rgba(61,50,45,0.06)]">
            <p className="text-xs text-slate-500 mb-1">待支付</p>
            <p className="text-2xl font-bold text-blue-600">
              {orders.filter(o => o.payment_status === 'pending').length}
            </p>
            <p className="text-xs text-slate-400 mt-1">未付款订单</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-[0_2px_8px_rgba(61,50,45,0.06)] space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="搜索订单（姓名/电话/案件标题）..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-600">状态筛选：</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setStatusFilter('')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                !statusFilter 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              全部
            </button>
            {Object.entries(paymentStatusMap).map(([key, value]) => (
              <button
                key={key}
                onClick={() => {
                  setStatusFilter(key);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === key 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {value.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-slate-600">类型：</span>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">全部</option>
              <option value="criminal">刑事案件</option>
              <option value="civil">民事案件</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(61,50,45,0.06)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  订单号
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  客户信息
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  案件类型
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  咨询类型
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  金额
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  创建时间
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center gap-2 text-slate-500">
                      <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                      加载中...
                    </div>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                    暂无订单记录
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const paymentStatus = paymentStatusMap[order.payment_status as keyof typeof paymentStatusMap] || paymentStatusMap.pending;
                  const catInfo = categoryMap[order.category as keyof typeof categoryMap] || { label: order.category };
                  const serviceInfo = serviceTypeMap[order.service_type as keyof typeof serviceTypeMap] || serviceTypeMap.default;

                  return (
                    <tr key={order.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-medium text-slate-800">#{order.id}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-800">{order.contact_name}</div>
                        <div className="text-sm text-slate-500">{order.contact_phone}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm font-medium ${catInfo.color}`}>
                          {catInfo.label}
                        </span>
                        <div className="text-xs text-slate-400 mt-0.5">{order.case_type}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                        {serviceInfo.label}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-medium text-slate-800">
                          ¥{(order.service_price / 100).toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${paymentStatus.color}`}>
                          {paymentStatus.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-500 text-sm">
                        {new Date(order.created_at).toLocaleDateString('zh-CN')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          查看详情
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > pageSize && (
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
            <div className="text-sm text-slate-500">
              共 {total} 条记录，第 {page} / {totalPages} 页
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                上一页
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
