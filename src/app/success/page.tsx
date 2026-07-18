'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2, Search, ArrowRight, Home, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { apiRequest } from '@/lib/api/request';
import { getLawyerUrl, getVersionedPath } from '@/lib/site';

const USER_CENTER_HREF = '/me';

interface OrderData {
  id: number;
  orderNo: string;
  caseTitle: string;
  serviceType: string | string[];
  servicePrice: number;
  paymentStatus: string;
}

const serviceTypeLabels: Record<string, string> = {
  basic: '基础咨询',
  standard: '标准方案',
  advanced: '深度服务',
  'consult,full': '咨询+全套服务',
  test: '测试支付'
};

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId') || searchParams.get('orderNo');
  const payTradeNo = searchParams.get('payTradeNo');
  const applicationId = searchParams.get('applicationId');
  const orderType = searchParams.get('type'); // 'lawyer' 或其他
  const isLawyerOrder = orderType === 'lawyer';
  const centerHref = isLawyerOrder ? getLawyerUrl() : getVersionedPath(USER_CENTER_HREF);
  const centerLabel = isLawyerOrder ? '前往律师中心' : '查看我的订单';
  
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [paymentCheckError, setPaymentCheckError] = useState<string | null>(null);

  const fetchOrder = useCallback(async () => {
    if (!orderId) {
      setLoading(false);
      return;
    }

    if (orderType === 'lawyer') {
      try {
        const response = await apiRequest(`/api/lawyer/pay/status?orderId=${encodeURIComponent(orderId)}`);
        const data = await response.json();
        setPaymentConfirmed(data.success && data.data?.isPaid === true);
      } catch (error) {
        console.error('确认律师支付状态失败:', error);
        setPaymentCheckError('暂时无法确认支付状态，请稍后重试。');
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      const statusUrl = payTradeNo
        ? `/api/pay/status?payTradeNo=${encodeURIComponent(payTradeNo)}`
        : `/api/pay/status?orderId=${encodeURIComponent(orderId)}`;
      const response = await apiRequest(statusUrl);
      const data = await response.json();
      setPaymentConfirmed(data.success && data.data?.tradeState === 'SUCCESS');
    } catch (error) {
      console.error('确认咨询支付状态失败:', error);
      setPaymentCheckError('暂时无法确认支付状态，请稍后重试。');
    }

    try {
      const response = await apiRequest(`/api/consult/order?orderId=${orderId}`);
      const data = await response.json();
      if (data.success && data.order) setOrder(data.order);
    } catch (error) {
      console.error('获取咨询订单失败:', error);
    } finally {
      setLoading(false);
    }
  }, [orderId, orderType, payTradeNo]);

  useEffect(() => {
    fetchOrder();
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
              <span className="font-medium text-sm sm:text-base">
                {paymentConfirmed ? '支付成功' : paymentCheckError ? '支付状态待确认' : '尚未完成支付'}
              </span>
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
          {!isLawyerOrder && order && paymentConfirmed && (
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
          {isLawyerOrder && paymentConfirmed && (
            <Card className="card-apple bg-[#F5EDE5] border-[rgba(196,115,83,0.25)]">
              <CardContent className="pt-6 pb-6 flex flex-col items-center">
                <div className="w-12 h-12 bg-[#C47353] rounded-full flex items-center justify-center mb-3">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-medium text-[#3D322D] mb-2">入驻支付成功</h3>
                <p className="text-sm text-[#8C7B6E] text-center">
                  您的入驻申请已提交，请等待管理员审核。<br/>
                  审核通过后，将自动跳转到律师工作台。
                </p>
              </CardContent>
            </Card>
          )}

          {!paymentConfirmed && (
            <Card className="card-apple bg-[#F5EDE5] border-[rgba(196,115,83,0.2)]">
              <CardContent className="pt-6 pb-6 flex flex-col items-center">
                <AlertCircle className="h-7 w-7 text-[#C47353] mb-3" />
                <h3 className="text-lg font-medium text-[#3D322D] mb-2">
                  {paymentCheckError ? '支付状态暂时无法确认' : '尚未完成支付'}
                </h3>
                <p className="text-sm text-[#8C7B6E] text-center">
                  {paymentCheckError || '本次订单尚未收到微信支付成功确认。取消支付或直接返回不会视为支付成功。'}
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
                    <p className="font-medium text-sm sm:text-base truncate">{order.caseTitle}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground block">服务类型</span>
                    <p className="font-medium text-sm sm:text-base">
                      {Array.isArray(order.serviceType)
                        ? order.serviceType.map((type) => serviceTypeLabels[type] || type).join(' + ')
                        : (serviceTypeLabels[order.serviceType] || order.serviceType)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 操作按钮 */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            {paymentConfirmed && (
            <Link href={centerHref} className="flex-1">
              <Button variant="outline" className="w-full rounded-xl py-3 sm:py-6 text-sm sm:text-base">
                {centerLabel}
              </Button>
            </Link>
            )}
            {!paymentConfirmed && (
              <Link
                href={isLawyerOrder && applicationId ? `/lawyer/pay?applicationId=${encodeURIComponent(applicationId)}` : `/pay?orderId=${encodeURIComponent(orderId || '')}`}
                className="flex-1"
              >
                <Button className="btn-apple text-white w-full rounded-xl py-3 sm:py-6 text-sm sm:text-base">
                  继续支付
                  <ArrowRight className="ml-1 sm:ml-2 h-4 w-4" />
                </Button>
              </Link>
            )}
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
