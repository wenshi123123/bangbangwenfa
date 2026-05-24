'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  User,
  Phone,
  Loader2,
} from 'lucide-react';
import { useLawyerAuth } from '@/hooks/use-lawyer-auth';
import { LawyerBottomNav } from '@/components/lawyer/lawyer-bottom-nav';

interface Order {
  id: number;
  contact_name: string;
  contact_phone: string;
  contact_wechat: string;
  case_type: string;
  case_title: string;
  case_description: string;
  service_type: string;
  service_price: number;
  payment_status: string;
  assignment_status: string;
  created_at: string;
  assigned_at: string;
  confirmed_at: string;
  lawyer_response: string;
}

const statusConfig: Record<string, { label: string; color: string; barColor: string; icon: React.ReactNode }> = {
  pending: { label: '待确认', color: '#C8963E', barColor: '#C8963E', icon: <Clock className="w-3 h-3" /> },
  pending_confirm: { label: '待确认', color: '#C8963E', barColor: '#C8963E', icon: <Clock className="w-3 h-3" /> },
  assigned: { label: '待确认', color: '#C8963E', barColor: '#C8963E', icon: <Clock className="w-3 h-3" /> },
  confirmed: { label: '已确认', color: '#5C7A5A', barColor: '#5C7A5A', icon: <CheckCircle className="w-3 h-3" /> },
  accepted: { label: '已接单', color: '#5C7A5A', barColor: '#5C7A5A', icon: <CheckCircle className="w-3 h-3" /> },
  rejected: { label: '已拒单', color: '#C26565', barColor: '#C26565', icon: <XCircle className="w-3 h-3" /> },
  completed: { label: '已完成', color: '#7B4B8B', barColor: '#7B4B8B', icon: <CheckCircle className="w-3 h-3" /> },
  unassigned: { label: '待分配', color: '#8C7B6E', barColor: '#8C7B6E', icon: <Clock className="w-3 h-3" /> },
  default: { label: '处理中', color: '#C47353', barColor: '#C47353', icon: <Clock className="w-3 h-3" /> },
};

const serviceTypeMap: Record<string, { label: string; color: string }> = {
  basic: { label: '基础咨询', color: 'bg-[#5C7A5A]/10 text-[#5C7A5A]' },
  standard: { label: '标准咨询', color: 'bg-[#B8860B]/10 text-[#B8860B]' },
  advanced: { label: '深度咨询', color: 'bg-[#7B4B8B]/10 text-[#7B4B8B]' },
  consult: { label: '咨询服务', color: 'bg-[#C47353]/10 text-[#C47353]' },
  default: { label: '咨询服务', color: 'bg-[#F5F0E8] text-[#8C7B6E]' },
};

type TabType = 'all' | 'pending' | 'accepted';

export default function LawyerOrdersPage() {
  const { isAuthorized, isLoading: authLoading, getAuthHeaders } = useLawyerAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('all');

  const fetchOrders = useCallback(async () => {
    try {
      const headers = getAuthHeaders();
      const response = await fetch('/api/lawyer/orders', { headers });
      const result = await response.json();
      if (result.success) {
        setOrders(result.orders || []);
      }
    } catch {
      // 静默处理
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    if (!authLoading && isAuthorized) {
      fetchOrders();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [authLoading, isAuthorized, fetchOrders]);

  const filteredOrders = orders.filter((order) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'pending')
      return (
        order.assignment_status === 'pending' ||
        order.assignment_status === 'pending_confirm'
      );
    if (activeTab === 'accepted')
      return (
        order.assignment_status === 'accepted' ||
        order.assignment_status === 'confirmed'
      );
    return true;
  });

  const tabCounts = {
    all: orders.length,
    pending: orders.filter(
      (o) => o.assignment_status === 'pending' || o.assignment_status === 'pending_confirm'
    ).length,
    accepted: orders.filter(
      (o) => o.assignment_status === 'accepted' || o.assignment_status === 'confirmed'
    ).length,
  };



  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
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
        <div className="bg-white rounded-2xl p-8 shadow-lg max-w-sm w-full text-center">
          <div className="w-14 h-14 rounded-full bg-[#C47353]/10 flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-7 h-7 text-[#C47353]" />
          </div>
          <h2 className="text-xl font-bold text-[#3D322D] mb-2 font-serif">请先登录</h2>
          <p className="text-[#8C7B6E] mb-6">登录后即可查看您的订单</p>
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

  const tabs: { key: TabType; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'pending', label: '待确认' },
    { key: 'accepted', label: '已接单' },
  ];

  return (
    <div className="min-h-screen pb-24 bg-[#FAF7F2]">
      {/* ===== 顶栏 ===== */}
      <div className="sticky top-0 z-40 bg-[#FDF8F0]/95 backdrop-blur-xl border-b border-[#E8D5C0]/50">
        <div className="px-4 py-3 flex items-center justify-between max-w-2xl lg:max-w-5xl mx-auto">
          <Link href="/lawyer" className="text-sm text-[#8C7B6E] hover:text-[#C47353] transition-colors">
            ← 返回工作台
          </Link>
          <span className="text-[15px] font-semibold text-[#1C1917] font-serif tracking-wide">我的订单</span>
          <div className="w-14" />
        </div>
      </div>

      {/* ===== 筛选 Tab + 概览 ===== */}
      <div className="sticky top-[52px] z-30 bg-[#FAF7F2]/95 backdrop-blur-sm border-b border-[#E8D5C0]/30">
        <div className="max-w-2xl lg:max-w-5xl mx-auto px-4 py-3">
          {/* 摘要条 */}
          <div className="flex items-center gap-4 mb-3 text-xs">
            <span className="text-[#78716C]">
              共 <span className="font-semibold text-[#1C1917]">{orders.length}</span> 单
            </span>
            {tabCounts.pending > 0 && (
              <span className="flex items-center gap-1 text-[#C8963E]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C8963E]" />
                {tabCounts.pending} 单待确认
              </span>
            )}
            {tabCounts.accepted > 0 && (
              <span className="flex items-center gap-1 text-[#5C7A5A]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#5C7A5A]" />
                {tabCounts.accepted} 单进行中
              </span>
            )}
          </div>

          {/* 胶囊 Tab */}
          <div className="flex gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 text-sm font-medium rounded-xl transition-all duration-300 flex items-center gap-1.5 ${
                  activeTab === tab.key
                    ? 'bg-[#C47353] text-white shadow-sm shadow-[#C47353]/20'
                    : 'bg-[#F5F0E8] text-[#78716C] hover:bg-[#EDE5DA] hover:text-[#5C534A]'
                }`}
              >
                {tab.label}
                {tabCounts[tab.key] > 0 && (
                  <span
                    className={`text-[10px] min-w-[18px] h-[18px] rounded-full flex items-center justify-center font-semibold ${
                      activeTab === tab.key
                        ? 'bg-white/20 text-white'
                        : 'bg-[#E8D5C0]/50 text-[#8C7B6E]'
                    }`}
                  >
                    {tabCounts[tab.key]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ===== 订单列表 ===== */}
      <div className="max-w-2xl lg:max-w-5xl mx-auto px-4 py-5">
        {filteredOrders.length === 0 ? (
          <div className="bg-[#FFFBF5] rounded-2xl py-16 border border-dashed border-[#E8D5C0] text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#F5F0E8] flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-7 h-7 text-[#C8BDB2]" />
            </div>
            <h3 className="text-[#78716C] font-medium mb-1">
              {activeTab === 'all' ? '暂无订单' : `暂无${tabs.find((t) => t.key === activeTab)?.label}订单`}
            </h3>
            <p className="text-xs text-[#A89B90]">
              {activeTab === 'all' ? '您还没有收到任何客户咨询' : '当前状态下没有订单'}
            </p>
          </div>
        ) : (
          <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
            {filteredOrders.map((order) => {
              const status = statusConfig[order.assignment_status] || statusConfig.default;
              const serviceType = serviceTypeMap[order.service_type] || serviceTypeMap.default;

              return (
                <Link
                  href={`/lawyer/orders/${order.id}`}
                  key={order.id}
                  className="bg-[#FFFBF5] rounded-2xl border border-[#E8D5C0] shadow-sm overflow-hidden flex flex-col hover:shadow-md hover:border-[#C47353]/30 transition-all duration-300 block cursor-pointer"
                >
                  {/* 卡片头部：左侧色条 + 标题 + 状态 */}
                  <div className="flex">
                    <div className="w-1 flex-shrink-0" style={{ backgroundColor: status.barColor }} />
                    <div className="flex-1 px-4 pt-4 pb-0 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-1.5">
                        <h3 className="font-semibold text-[#1C1917] text-sm leading-snug line-clamp-2">
                          {order.case_title}
                        </h3>
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0"
                          style={{ backgroundColor: `${status.color}14`, color: status.color }}
                        >
                          {status.icon}
                          {status.label}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#A89B90] mb-3">
                        #{order.id}
                      </p>
                    </div>
                  </div>

                  {/* 卡片中部：标签 + 描述 */}
                  <div className="px-4 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 mb-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${serviceType.color}`}>
                        {serviceType.label}
                      </span>

                    </div>

                    <p className="text-xs text-[#78716C] line-clamp-2 mb-3 leading-relaxed">
                      {order.case_description}
                    </p>

                    {/* 客户信息 */}
                    <div className="flex items-center gap-3 text-[11px] text-[#78716C] mb-3 p-2 bg-[#FDF8F0] rounded-lg">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 text-[#A89B90]" />
                        {order.contact_name}
                      </span>
                      <span className="w-px h-3 bg-[#E8D5C0]" />
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-[#A89B90]" />
                        {order.contact_phone}
                      </span>
                    </div>

                    {/* 律师回复（如有） */}
                    {(order.assignment_status === 'accepted' || order.assignment_status === 'confirmed' || order.assignment_status === 'completed') && order.lawyer_response && (
                      <div className="p-3 bg-[#5C7A5A]/5 rounded-xl border border-[#5C7A5A]/10 mb-3">
                        <p className="text-[11px] font-semibold text-[#5C7A5A] mb-1">💬 我的回复</p>
                        <p className="text-xs text-[#4A5A44] leading-relaxed">{order.lawyer_response}</p>
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <LawyerBottomNav />
    </div>
  );
}
