'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  MessageSquare,
  Phone,
  User
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';

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
  basic: { label: '基础咨询', color: 'bg-blue-100 text-blue-700' },
  standard: { label: '标准咨询', color: 'bg-green-100 text-green-700' },
  advanced: { label: '深度咨询', color: 'bg-purple-100 text-purple-700' },
};

const categoryMap: Record<string, { label: string; color: string }> = {
  criminal: { label: '刑事案件', color: 'text-red-600' },
  civil: { label: '民事案件', color: 'text-blue-600' },
};

export default function LawyerPendingPage() {
  const { user, isLoggedIn, isLoading } = useAuth();
  const [orders, setOrders] = useState<PendingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      window.dispatchEvent(new CustomEvent('open-login-modal'));
    }
  }, [isLoading, isLoggedIn]);

  const fetchPendingOrders = useCallback(async (lawyerId: number) => {
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      
      const response = await fetch('/api/lawyer/order/pending', { headers });
      const result = await response.json();
      
      if (result.success) {
        setOrders(result.orders || result.data || []);
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
      fetchPendingOrders(user.lawyerId);
    } else if (!isLoading) {
      // 没有 lawyerId 或未登录，停止 loading
      setLoading(false);
    }
  }, [isLoading, isLoggedIn, user?.lawyerId, fetchPendingOrders]);

  const handleConfirm = async (orderId: number, action: 'accept' | 'reject') => {
    if (!user?.lawyerId) return;

    const confirmText = action === 'accept' ? '确认接单' : '确认拒单';
    if (!confirm(`确定要${confirmText}吗？`)) return;

    setActionLoading(orderId);
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      
      const response = await fetch('/api/lawyer/order/confirm', {
        method: 'POST',
        headers,
        body: JSON.stringify({ orderId, action, lawyerId: user.lawyerId })
      });

      const result = await response.json();
      
      if (result.success) {
        alert(result.message);
        // 从列表中移除
        setOrders(orders.filter(o => o.id !== orderId));
      } else {
        alert(result.error || '操作失败');
      }
    } catch (error) {
      console.error('操作失败:', error);
      alert('操作失败，请重试');
    } finally {
      setActionLoading(null);
    }
  };

  const formatPrice = (price: number) => {
    return (price / 100).toFixed(2);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
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
            <p className="text-muted-foreground mb-4">登录后即可处理待确认订单</p>
            <Button onClick={() => window.dispatchEvent(new CustomEvent('open-login-modal'))}>
              手机号登录
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
              <Clock className="w-5 h-5 text-orange-600" />
              <span className="text-base font-semibold text-orange-600">待确认订单</span>
            </div>
            <Badge variant="outline" className="bg-orange-100 text-orange-600">
              {orders.length}
            </Badge>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {orders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">暂无待确认订单</h3>
              <p className="text-sm text-muted-foreground">当有新订单分配给您时，会在这里显示</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const serviceInfo = serviceTypeMap[order.service_type] || { label: order.service_type, color: 'bg-gray-100 text-gray-700' };
              const catInfo = categoryMap[order.category] || { label: order.category, color: 'text-gray-600' };

              return (
                <Card key={order.id} className="border-orange-100">
                  <CardContent className="p-4">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-sm font-medium ${catInfo.color}`}>{catInfo.label}</span>
                          <Badge className={serviceInfo.color}>{serviceInfo.label}</Badge>
                        </div>
                        <h3 className="font-semibold text-gray-900">{order.case_title}</h3>
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-lg font-bold text-green-600">¥{formatPrice(order.service_price)}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(order.assigned_at)}</p>
                      </div>
                    </div>

                    {/* Customer Info */}
                    <div className="grid grid-cols-2 gap-2 mb-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">{order.contact_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">{order.contact_phone}</span>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {order.case_description}
                    </p>

                    {/* Actions */}
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                        onClick={() => handleConfirm(order.id, 'reject')}
                        disabled={actionLoading === order.id}
                      >
                        {actionLoading === order.id ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-1" />
                        ) : (
                          <XCircle className="w-4 h-4 mr-1" />
                        )}
                        拒单
                      </Button>
                      <Button
                        className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                        onClick={() => handleConfirm(order.id, 'accept')}
                        disabled={actionLoading === order.id}
                      >
                        {actionLoading === order.id ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-1" />
                        ) : (
                          <CheckCircle className="w-4 h-4 mr-1" />
                        )}
                        接单
                      </Button>
                    </div>
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
