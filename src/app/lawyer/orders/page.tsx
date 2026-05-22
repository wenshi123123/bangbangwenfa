'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, MessageSquare, Clock, CheckCircle, XCircle, User, Phone, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';

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

const statusMap: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: '待确认', color: 'bg-yellow-100 text-yellow-700', icon: <Clock className="w-4 h-4" /> },
  pending_confirm: { label: '待确认', color: 'bg-yellow-100 text-yellow-700', icon: <Clock className="w-4 h-4" /> },
  assigned: { label: '待确认', color: 'bg-yellow-100 text-yellow-700', icon: <Clock className="w-4 h-4" /> },
  confirmed: { label: '已确认', color: 'bg-blue-100 text-blue-700', icon: <CheckCircle className="w-4 h-4" /> },
  accepted: { label: '已接单', color: 'bg-green-100 text-green-700', icon: <CheckCircle className="w-4 h-4" /> },
  rejected: { label: '已拒单', color: 'bg-red-100 text-red-700', icon: <XCircle className="w-4 h-4" /> },
  completed: { label: '已完成', color: 'bg-purple-100 text-purple-700', icon: <CheckCircle className="w-4 h-4" /> },
  unassigned: { label: '待分配', color: 'bg-gray-100 text-gray-700', icon: <Clock className="w-4 h-4" /> },
  // 默认值兜底
  default: { label: '处理中', color: 'bg-orange-100 text-orange-700', icon: <Clock className="w-4 h-4" /> },
};

const serviceTypeMap: Record<string, { label: string; color: string }> = {
  basic: { label: '基础咨询', color: 'bg-blue-100 text-blue-700' },
  standard: { label: '标准咨询', color: 'bg-green-100 text-green-700' },
  advanced: { label: '深度咨询', color: 'bg-purple-100 text-purple-700' },
  consult: { label: '咨询服务', color: 'bg-teal-100 text-teal-700' },
  // 默认值
  default: { label: '咨询服务', color: 'bg-gray-100 text-gray-700' },
};

type TabType = 'all' | 'pending' | 'accepted' | 'completed';

export default function LawyerOrdersPage() {
  const { user, isLoggedIn, isLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('all');

  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      window.dispatchEvent(new CustomEvent('open-login-modal'));
      return;
    }
  }, [isLoading, isLoggedIn]);

  const fetchOrders = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      
      const response = await fetch('/api/lawyer/orders', { headers });
      const result = await response.json();
      if (result.success) {
        setOrders(result.orders || []);
      }
    } catch (error) {
      console.error('获取订单失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // 当登录状态确定且有 lawyerId 时才获取订单
    if (!isLoading && isLoggedIn && user?.lawyerId) {
      fetchOrders();
    } else if (!isLoading) {
      // 没有 lawyerId 或未登录，停止 loading
      setLoading(false);
    }
  }, [isLoading, isLoggedIn, user?.lawyerId, fetchOrders]);

  // 根据 Tab 过滤订单
  const filteredOrders = orders.filter(order => {
    if (activeTab === 'all') return true;
    if (activeTab === 'pending') return order.assignment_status === 'pending' || order.assignment_status === 'pending_confirm';
    if (activeTab === 'accepted') return order.assignment_status === 'accepted' || order.assignment_status === 'confirmed';
    if (activeTab === 'completed') return order.assignment_status === 'completed';
    return true;
  });

  // 各状态数量统计
  const tabCounts = {
    all: orders.length,
    pending: orders.filter(o => o.assignment_status === 'pending' || o.assignment_status === 'pending_confirm').length,
    accepted: orders.filter(o => o.assignment_status === 'accepted' || o.assignment_status === 'confirmed').length,
    completed: orders.filter(o => o.assignment_status === 'completed').length,
  };

  const formatPrice = (price: number) => {
    return (price / 100).toFixed(2);
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

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FEF3E2 0%, #FFF7ED 50%, #FEF3E2 100%)' }}>
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!isLoggedIn || !user?.isLawyer) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #FEF3E2 0%, #FFF7ED 50%, #FEF3E2 100%)' }}>
        <Card className="max-w-sm">
          <CardContent className="pt-6 text-center">
            <MessageSquare className="w-12 h-12 text-orange-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">请先登录</h2>
            <p className="text-muted-foreground mb-4">登录后即可查看您的订单</p>
            <Button onClick={() => window.dispatchEvent(new CustomEvent('open-login-modal'))}>
              手机号登录
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tabs: { key: TabType; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'pending', label: '待确认' },
    { key: 'accepted', label: '已接单' },
    { key: 'completed', label: '已完成' },
  ];

  return (
    <div className="min-h-screen pb-20" style={{ background: 'linear-gradient(135deg, #FEF3E2 0%, #FFF7ED 50%, #FEF3E2 100%)' }}>
      {/* 顶部导航栏 */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-orange-100/50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link href="/lawyer" className="flex items-center gap-1.5 text-orange-600">
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-medium">返回</span>
            </Link>
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-orange-600" />
              <span className="text-base font-semibold text-orange-600">我的订单</span>
            </div>
            <div className="w-16" />
          </div>
        </div>
      </div>

      {/* Tab 切换 */}
      <div className="bg-white border-b border-gray-200 sticky top-[52px] z-30">
        <div className="container mx-auto px-4">
          <div className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
                {tabCounts[tab.key] > 0 && (
                  <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${
                    activeTab === tab.key ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {tabCounts[tab.key]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">
                {activeTab === 'all' ? '暂无订单' : `暂无${tabs.find(t => t.key === activeTab)?.label}订单`}
              </h3>
              <p className="text-sm text-muted-foreground">
                {activeTab === 'all' ? '您还没有收到任何客户咨询' : '当前状态下没有订单'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const status = statusMap[order.assignment_status] || statusMap.default;
              const serviceType = serviceTypeMap[order.service_type] || serviceTypeMap.default;

              return (
                <Card key={order.id} className="border-orange-100">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{order.case_title}</CardTitle>
                        <p className="text-xs text-muted-foreground mt-1">
                          订单号：{order.id} · {formatDate(order.created_at)}
                        </p>
                      </div>
                      <Badge className={status.color}>
                        {status.icon}
                        <span className="ml-1">{status.label}</span>
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <Badge variant="outline" className={serviceType.color}>
                        {serviceType.label}
                      </Badge>
                      <Badge variant="outline">¥{formatPrice(order.service_price)}</Badge>
                    </div>

                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                      {order.case_description}
                    </p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          {order.contact_name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Phone className="w-4 h-4" />
                          {order.contact_phone}
                        </span>
                      </div>
                    </div>

                    {order.assignment_status === 'accepted' && order.lawyer_response && (
                      <div className="mt-4 p-3 bg-green-50 rounded-lg">
                        <p className="text-sm text-green-800 font-medium">我的回复</p>
                        <p className="text-sm text-green-700 mt-1">{order.lawyer_response}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
