'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2, Search, ArrowRight, Home } from 'lucide-react';
import Link from 'next/link';
import { apiRequest } from '@/lib/api/request';

const USER_CENTER_HREF = '/user?v=20260629a';

interface OrderData {
  id: number;
  contact_name: string;
  case_title: string;
  service_type: string;
  servicePrice: number;
  payment_status: string;
}

const serviceTypeLabels: Record<string, string> = {
  basic: '基础咨询',
  standard: '标准方案',
  advanced: '深度服务',
  test: '测试支付'
};

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get('orderId') || searchParams.get('orderNo');
  const orderType = searchParams.get('type'); // 'lawyer' 或其他
  
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrder = useCallback(async () => {
    try {
      // 🔧 使用 apiRequest 代替 fetch，自动携带 Authorization token
      const response = await apiRequest(`/api/consult/order?orderId=${orderId}`);
      const data = await response.json();
      if (data.success) {
        setOrder(data.order);
      }
    } catch (error) {
      console.error('获取订单失败:', error);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (orderId) {
      fetchOrder();
    }
  }, [orderId, fetchOrder]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#C47353]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      {/* Header */}
      <header className="bg-[#FAF7F2]/80 backdrop-blur-md border-b border-[rgba(196,115,83,0.15)] sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-green-400 to-green-500 flex items-center justify-center">
                <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
              </div>
              <span className="font-medium text-sm sm:text-base">支付成功</span>
            </div>
            <Link href="/">
              <Button variant="ghost" size="sm" className="rounded-xl text-xs sm:text-sm">
                <Home className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                <span className="hidden sm:inline">首页</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 sm:py-8 md:py-12">
        <div className="max-w-md mx-auto space-y-4 sm:space-y-6">
          
          {/* 添加客服微信提示 */}
          {orderType !== 'lawyer' && order && (
            <Card className="card-apple bg-gradient-to-br from-green-50 to-emerald-100/50 border-green-200">
              <CardContent className="pt-6 pb-6 flex flex-col items-center">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mb-3">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-green-800 mb-2">支付成功</h3>
                <p className="text-sm text-green-700 text-center mb-4">
                  请添加客服微信，发送订单号获取咨询服务
                </p>
                {/* 客服微信二维码 */}
                <div className="bg-white p-2 rounded-xl shadow-[0_4px_16px_rgba(61,50,45,0.08)] mb-4">
                  <img 
                    src="/customer-service-qr.jpg"
                    alt="客服微信二维码"
                    className="w-48 h-48 object-contain"
                  />
                </div>
                <p className="text-xs text-green-600 text-center">
                  长按识别二维码添加客服
                </p>
              </CardContent>
            </Card>
          )}

          {/* 律师入驻提示 */}
          {orderType === 'lawyer' && (
            <Card className="card-apple bg-gradient-to-br from-green-50 to-green-100/50 border-green-200">
              <CardContent className="pt-6 pb-6 flex flex-col items-center">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mb-3">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-green-800 mb-2">入驻支付成功</h3>
                <p className="text-sm text-green-700 text-center">
                  您的入驻申请已提交，请等待管理员审核。<br/>
                  审核通过后，将自动跳转到律师工作台。
                </p>
              </CardContent>
            </Card>
          )}

          {/* 订单信息 */}
          {order && (
            <Card className="card-apple">
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Search className="h-4 w-4 sm:h-5 sm:w-5 text-[#C47353]" />
                  订单信息
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                  <div>
                    <span className="text-muted-foreground block">订单号</span>
                    <p className="font-mono font-medium text-sm sm:text-base">{order.id}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">支付金额</span>
                    <p className="font-serif text-[#C47353] text-base sm:text-lg font-normal">¥{((order.servicePrice || 0) / 100).toFixed(2)}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground block">咨询主题</span>
                    <p className="font-medium text-sm sm:text-base truncate">{order.case_title}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground block">服务类型</span>
                    <p className="font-medium text-sm sm:text-base">{serviceTypeLabels[order.service_type] || order.service_type}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 操作按钮 */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <Link href={USER_CENTER_HREF} className="flex-1">
              <Button variant="outline" className="w-full rounded-xl py-3 sm:py-6 text-sm sm:text-base">
                查看我的订单
              </Button>
            </Link>
            <Link href="/" className="flex-1">
              <Button className="btn-apple text-white w-full rounded-xl py-3 sm:py-6 text-sm sm:text-base">
                返回首页
                <ArrowRight className="ml-1 sm:ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#C47353]" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
