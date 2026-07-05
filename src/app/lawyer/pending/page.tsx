'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { getVersionedPath } from '@/lib/site';
import {
  ArrowLeft,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  MessageSquare,
  Phone,
  User,
  Bell,
} from 'lucide-react';
import { useLawyerAuth } from '@/hooks/use-lawyer-auth';
import { LawyerBottomNav } from '@/components/lawyer/lawyer-bottom-nav';

interface PendingOrder {
  id: number;
  contact_name: string;
  contact_phone: string;
  contact_wechat: string;
  case_type: string;
  case_title: string;
  case_description: string;
  service_type: string;
  service_price: number;
  assigned_at: string;
  category: string;
  created_at: string;
}

const serviceTypeMap: Record<string, { label: string; color: string }> = {
  basic: { label: '基础咨询', color: 'bg-[#7B9B6E]/10 text-[#7B9B6E]' },
  standard: { label: '标准咨询', color: 'bg-[#6E9B7B]/10 text-[#6E9B7B]' },
  advanced: { label: '深度咨询', color: 'bg-[#7B7B9B]/10 text-[#7B7B9B]' },
  consult: { label: '咨询服务', color: 'bg-[#C47353]/10 text-[#C47353]' },
  lawyer_subscription: { label: '律师订阅', color: 'bg-[#8C7B6E]/10 text-[#8C7B6E]' },
};

const categoryMap: Record<string, { label: string; color: string }> = {
  criminal: { label: '刑事案件', color: 'text-[#C26565]' },
  civil: { label: '民事案件', color: 'text-[#7B9B6E]' },
};

export default function LawyerPendingPage() {
  const { isAuthorized, isLoading: authLoading, lawyerId, getAuthHeaders } =
    useLawyerAuth();
  const [orders, setOrders] = useState<PendingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [confirmingOrder, setConfirmingOrder] = useState<{ orderId: number; action: 'accept' | 'reject' } | null>(null);

  // 🔔 轮询相关状态
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const prevOrderIdsRef = useRef<Set<number>>(new Set());
  const isFirstLoadRef = useRef(true);

  const fetchPendingOrders = useCallback(async () => {
    try {
      const headers = getAuthHeaders();
      const response = await fetch('/api/lawyer/order/pending', { headers });
      const result = await response.json();
      if (result.success) {
        setOrders(result.orders || result.data || []);
      }
    } catch {
      // 静默处理
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  // 🔔 轮询：每30秒刷新待处理订单，检测新订单弹出 Toast
  useEffect(() => {
    if (!isAuthorized || authLoading) return;

    const poll = async () => {
      try {
        const headers = getAuthHeaders();
        const response = await fetch('/api/lawyer/order/pending', { headers });
        const result = await response.json();
        if (!result.success) return;

        const newOrders: PendingOrder[] = result.orders || result.data || [];
        const newOrderIds = new Set(newOrders.map((o: PendingOrder) => o.id));

        // 首次加载不弹 Toast
        if (!isFirstLoadRef.current) {
          const prevIds = prevOrderIdsRef.current;
          const newlyAdded = newOrders.filter((o: PendingOrder) => !prevIds.has(o.id));
          if (newlyAdded.length > 0) {
            setToastMessage(`有 ${newlyAdded.length} 个新订单已分配给你`);
            setToastVisible(true);
          }
        }

        isFirstLoadRef.current = false;
        prevOrderIdsRef.current = newOrderIds;
        setOrders(newOrders);

        // 更新标签页标题
        const count = newOrders.length;
        document.title = count > 0 ? `(${count}) 帮帮问法 - 律师后台` : '帮帮问法 - 律师后台';
      } catch {
        // 静默忽略轮询错误
      }
    };

    poll(); // 立即执行一次
    const interval = setInterval(poll, 30000);
    return () => clearInterval(interval);
  }, [isAuthorized, authLoading, getAuthHeaders]);

  // 🔔 Toast 自动消失（5秒）
  useEffect(() => {
    if (!toastVisible) return;
    const timer = setTimeout(() => setToastVisible(false), 5000);
    return () => clearTimeout(timer);
  }, [toastVisible]);

  const executeOrderAction = async (orderId: number, action: 'accept' | 'reject') => {
    if (!lawyerId) {
      alert('未获取到律师身份信息，请刷新页面后重试');
      console.error('[接单/拒单] lawyerId 为空，无法操作订单', { orderId, action });
      setConfirmingOrder(null);
      return;
    }
    setActionLoading(orderId);
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      };
      const response = await fetch('/api/lawyer/order/confirm', {
        method: 'POST',
        headers,
        body: JSON.stringify({ orderId, action, lawyerId }),
      });
      const result = await response.json();
      if (result.success) {
        alert(result.message);
        setOrders((prev) => prev.filter((o) => o.id !== orderId));
      } else {
        console.error('[接单/拒单] 后端返回失败', { orderId, action, lawyerId, status: response.status, result });
        alert(result.error || '操作失败');
      }
    } catch (err) {
      console.error('[接单/拒单] 请求异常', { orderId, action, lawyerId, err });
      alert('操作失败，请重试');
    } finally {
      setActionLoading(null);
      setConfirmingOrder(null);
    }
  };



  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

  // 计算时间紧急程度
  const getTimeUrgency = (dateStr: string) => {
    const assigned = new Date(dateStr).getTime();
    const now = Date.now();
    const hoursDiff = (now - assigned) / (1000 * 60 * 60);
    if (hoursDiff < 2) return { level: 'new', color: '#C47353', label: '刚刚' };
    if (hoursDiff < 12) return { level: 'recent', color: '#C8963E', label: '今日' };
    return { level: 'old', color: '#EBE3D8', label: '稍早' };
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF7F2]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-[#C47353] border-t-transparent animate-spin" />
          <span className="text-sm text-[#8C7B6E]">加载中…</span>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#FAF7F2]">
        <div className="bg-white rounded-xl p-8 shadow-lg max-w-sm w-full text-center">
          <div className="w-14 h-14 rounded-full bg-[#C47353]/10 flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-7 h-7 text-[#C47353]" />
          </div>
          <h2 className="text-xl font-bold text-[#3D322D] mb-2 font-serif">请先登录</h2>
          <p className="text-[#8C7B6E] mb-6">登录后即可处理待确认订单</p>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open-login-modal'))}
            className="w-full py-3 bg-[#C47353] text-white font-medium rounded-xl hover:bg-[#A85D40] transition-colors"
          >
            手机号登录
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 bg-[#FAF7F2]">

      {/* 🔔 新订单 Toast 通知 */}
      {toastVisible && toastMessage && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-slide-down"
          onClick={() => { setToastVisible(false); setTimeout(() => setToastMessage(null), 300); }}
        >
          <div className="flex items-center gap-3 px-5 py-3 bg-[#C47353] text-white rounded-xl shadow-lg cursor-pointer hover:bg-[#A85D40] transition-colors">
            <Bell className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">{toastMessage}</span>
            <span className="text-xs opacity-70 ml-2">点击关闭</span>
          </div>
        </div>
      )}

      {/* 顶部导航栏 */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-[#EBE3D8]/60">
        <div className="px-4 py-3 flex items-center justify-between max-w-2xl mx-auto">
          <Link
            href={getVersionedPath('/lawyer')}
            className="text-sm text-[#8C7B6E] hover:text-[#C47353] transition-colors"
          >
            ← 返回
          </Link>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#C47353]" />
            <span className="text-[15px] font-semibold text-[#3D322D] font-serif">
              待确认订单
            </span>
          </div>
          <span className="text-xs bg-[#C47353]/10 text-[#C47353] px-2.5 py-1 rounded-full font-medium">
            {orders.length}
          </span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5">
        {orders.length === 0 ? (
          <div className="bg-white rounded-xl py-12 border border-[#EBE3D8]/60 text-center">
            <div className="w-16 h-16 rounded-full bg-[#F5F2ED] flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-[#A89B90]" />
            </div>
            <h3 className="text-[#8C7B6E] font-medium mb-1">暂无待确认订单</h3>
            <p className="text-xs text-[#A89B90]">
              当有新订单分配给您时，会在这里显示
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => {
              const serviceInfo = serviceTypeMap[order.service_type] || {
                label: order.service_type,
                color: 'bg-[#F5F2ED] text-[#8C7B6E]',
              };
              const catInfo = categoryMap[order.category] || {
                label: order.category,
                color: 'text-[#8C7B6E]',
              };
              const urgency = getTimeUrgency(order.assigned_at);

              return (
                <Link
                  href={`/lawyer/orders/${order.id}`}
                  key={order.id}
                  className="bg-white rounded-xl overflow-hidden border border-[#EBE3D8]/60 shadow-[0_2px_8px_rgba(61,50,45,0.06)] block hover:shadow-md hover:border-[#C47353]/20 transition-all duration-300 cursor-pointer"
                >
                  {/* 左侧时间条 */}
                  <div className="flex">
                    <div
                      className="w-1 flex-shrink-0 transition-colors duration-500"
                      style={{ backgroundColor: urgency.color }}
                    />
                    <div className="flex-1 p-4">
                      {/* 标题 + 价格 */}
                      <div className="flex items-start justify-between mb-2.5">
                        <div className="flex-1 min-w-0 mr-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={`text-xs font-medium ${catInfo.color}`}
                            >
                              {catInfo.label}
                            </span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${serviceInfo.color}`}
                            >
                              {serviceInfo.label}
                            </span>
                          </div>
                          <h3 className="font-semibold text-[#3D322D] text-sm truncate">
                            {order.case_title}
                          </h3>
                        </div>

                      </div>

                      {/* 客户信息 */}
                      <div className="flex items-center gap-3 mb-3 p-2.5 bg-[#FAF7F2] rounded-xl">
                        <span className="flex items-center gap-1 text-xs text-[#8C7B6E]">
                          <User className="w-3.5 h-3.5" />
                          {order.contact_name}
                        </span>
                        <span className="w-px h-3 bg-[#EBE3D8]" />
                        <span className="flex items-center gap-1 text-xs text-[#8C7B6E]">
                          <Phone className="w-3.5 h-3.5" />
                          {order.contact_phone}
                        </span>
                      </div>

                      {/* 描述 */}
                      <p className="text-xs text-[#8C7B6E] mb-4 line-clamp-2 leading-relaxed">
                        {order.case_description}
                      </p>

                      {/* 操作按钮 — 防御性检查 lawyerId */}
                      {!lawyerId ? (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-center">
                          <p className="text-xs text-amber-700 mb-2">律师身份信息加载中，请刷新页面</p>
                          <button
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.location.reload(); }}
                            className="text-xs px-4 py-1.5 bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200 transition-colors"
                          >
                            刷新页面
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-3">
                          <button
                            className="flex-1 py-2.5 text-sm font-medium rounded-xl border border-[#C26565]/20 text-[#C26565] hover:bg-[#C26565]/5 transition-colors disabled:opacity-50 active:scale-[0.98]"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirmingOrder({ orderId: order.id, action: 'reject' }); }}
                            disabled={actionLoading === order.id}
                          >
                            {actionLoading === order.id ? (
                              <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                            ) : (
                              <span className="flex items-center justify-center gap-1.5">
                                <XCircle className="w-4 h-4" /> 拒单
                              </span>
                            )}
                          </button>
                          <button
                            className="flex-1 py-2.5 text-sm font-medium rounded-xl bg-[#7B9B6E] text-white hover:bg-[#6A8B5E] transition-colors disabled:opacity-50 active:scale-[0.98]"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirmingOrder({ orderId: order.id, action: 'accept' }); }}
                            disabled={actionLoading === order.id}
                          >
                            {actionLoading === order.id ? (
                              <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                            ) : (
                              <span className="flex items-center justify-center gap-1.5">
                                <CheckCircle className="w-4 h-4" /> 接单
                              </span>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* 确认弹窗 — 替代原生 confirm()，兼容 IDE 内置浏览器 */}
      {confirmingOrder && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setConfirmingOrder(null)}>
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-[#3D322D] mb-2 font-serif">
              {confirmingOrder.action === 'accept' ? '确认接单' : '确认拒单'}
            </h3>
            <p className="text-sm text-[#8C7B6E] mb-6">
              确定要{confirmingOrder.action === 'accept' ? '接单' : '拒单'}吗？
              {confirmingOrder.action === 'reject' && ' 拒单后将重新进入待派单状态。'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmingOrder(null)}
                className="flex-1 py-2.5 text-sm font-medium rounded-xl border border-[#EBE3D8] text-[#8C7B6E] hover:bg-[#F5F2ED] transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => executeOrderAction(confirmingOrder.orderId, confirmingOrder.action)}
                className={`flex-1 py-2.5 text-sm font-medium rounded-xl text-white transition-colors ${
                  confirmingOrder.action === 'accept'
                    ? 'bg-[#7B9B6E] hover:bg-[#6A8B5E]'
                    : 'bg-[#C26565] hover:bg-[#A85252]'
                }`}
              >
                确认{confirmingOrder.action === 'accept' ? '接单' : '拒单'}
              </button>
            </div>
          </div>
        </div>
      )}

      <LawyerBottomNav />
    </div>
  );
}
