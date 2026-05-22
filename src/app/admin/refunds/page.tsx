'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { 
  RefreshCw,
  Search,
  Eye,
  Clock,
  CheckCircle
} from 'lucide-react';
import { adminApiRequest } from '@/lib/api/request';

interface RefundOrder {
  id: number;
  contact_name: string;
  contact_phone: string;
  case_title: string;
  service_price: number;
  payment_time: string;
  created_at: string;
}

export default function RefundListPage() {
  const [orders, setOrders] = useState<RefundOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRefundedOrders = async () => {
      try {
        const response = await adminApiRequest('/api/admin/order/list?status=refunded');
        const result = await response.json();
        if (result.success) {
          setOrders(result.data.list || []);
        }
      } catch (error) {
        console.error('获取退款订单失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRefundedOrders();
  }, []);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">退款处理</h1>
          <p className="text-slate-500 mt-1">查看已退款订单记录</p>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Clock className="w-5 h-5 text-amber-600 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">退款说明</p>
            <p className="text-sm text-amber-700 mt-1">
              当用户在微信与律师发生争执时，管理员可在订单详情页进行退款处理。
              退款金额将原路返回用户支付账户。
            </p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
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
                  案件标题
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  退款金额
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  退款时间
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center gap-2 text-slate-500">
                      <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                      加载中...
                    </div>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                    <p className="text-slate-600">暂无退款记录</p>
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium text-slate-800">#{order.id}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-800">{order.contact_name}</div>
                      <div className="text-sm text-slate-500">{order.contact_phone}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-slate-600 line-clamp-1">{order.case_title}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium text-red-600">
                        -¥{(order.service_price / 100).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-500 text-sm">
                      {new Date(order.payment_time || order.created_at).toLocaleDateString('zh-CN')}
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
