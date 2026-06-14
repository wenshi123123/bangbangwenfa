'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, QrCode, ArrowLeft, AlertCircle, Smartphone, ExternalLink } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { QRCodeSVG } from 'qrcode.react';
import { apiRequest } from '@/lib/api/request';

interface OrderData {
  id: number;
  orderNo: string;
  contactName: string;
  contactPhone: string;
  caseTitle: string;
  serviceType: string;
  servicePrice: number;
  paymentStatus: string;
  payTradeNo?: string;
}

const SERVICE_TYPE_MAP: Record<string, string> = {
  full: '全流程服务',
  consult: '咨询服务',
  court: '诉状起草',
  meet: '律师面谈',
  litigate: '诉讼指导',
};

function formatServiceType(serviceType: string): string {
  const types = serviceType.split(',').map(t => SERVICE_TYPE_MAP[t.trim()] || t.trim());
  return types.join(' · ');
}

interface JsapiPayParams {
  appId: string;
  timeStamp: string;
  nonceStr: string;
  package: string;
  signType: string;
  paySign: string;
}

interface PayResult {
  orderId: number;
  payTradeNo: string;
  prepayId: string;
  payParams: JsapiPayParams;
}

declare global {
  interface Window {
    WeixinJSBridge?: {
      invoke: (method: string, params: Record<string, unknown>, callback: (res: { err_msg?: string }) => void) => void;
    };
    wx?: {
      chooseWXPay: (params: {
        appId: string;
        timestamp: string;
        nonceStr: string;
        package: string;
        signType: string;
        paySign: string;
        success: () => void;
        fail: (err: unknown) => void;
        cancel: () => void;
      }) => void;
    };
  }
}

function PayContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get('orderId');
  const isPreview = searchParams.get('preview') === '1';

  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [payLoading, setPayLoading] = useState(false);
  const [payResult, setPayResult] = useState<PayResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isWechat, setIsWechat] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 检测是否在微信内置浏览器中
  useEffect(() => {
    const ua = navigator.userAgent || '';
    const inWechat = /micromessenger/i.test(ua);
    setIsWechat(inWechat);
  }, []);

  // 从 URL 参数中获取 openid 并写入 localStorage（小程序 webview 传参场景）
  useEffect(() => {
    const urlOpenid = searchParams.get('openid');
    if (urlOpenid && urlOpenid.length > 10) {
      localStorage.setItem('wx_openid', urlOpenid);
    }
  }, [searchParams]);

  // 获取订单信息
  const fetchOrder = async () => {
    if (isPreview && !orderId) {
      setLoading(false);
      return;
    }

    try {
      const response = await apiRequest(`/api/consult/order?orderId=${orderId}`);
      const data = await response.json();
      if (data.success) {
        setOrder(data.order);
        if (data.order.paymentStatus === 'paid') {
          router.push(`/success?orderId=${orderId}`);
        }
      }
    } catch (err) {
      console.error('获取订单失败:', err);
      setError('获取订单信息失败');
    } finally {
      setLoading(false);
    }
  };

  // 创建 H5 支付订单
  const createPayOrder = async () => {
    if (!orderId) return;

    setPayLoading(true);
    setError(null);

    try {
      const response = await apiRequest('/api/pay/create', {
        method: 'POST',
        body: JSON.stringify({
          orderId: Number(orderId),
        }),
      });

      const data = await response.json();

      if (data.success && data.data?.h5_url) {
        // H5 支付：直接跳转到微信支付页面
        window.location.href = data.data.h5_url;
      } else {
        setError(data.error || '创建支付订单失败');
      }
    } catch (err) {
      console.error('创建支付订单失败:', err);
      setError('创建支付订单失败，请重试');
    } finally {
      setPayLoading(false);
    }
  };

  useEffect(() => {
    if (orderId) {
      fetchOrder();
    }
  }, [orderId]);

  // 轮询订单状态
  useEffect(() => {
    if (!orderId || !payResult) {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
        setIsPolling(false);
      }
      return;
    }

    setIsPolling(true);
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const response = await apiRequest(`/api/consult/order?orderId=${orderId}`);
        const data = await response.json();
        if (data.success && data.order.paymentStatus === 'paid') {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
          }
          router.push(`/success?orderId=${orderId}`);
        }
      } catch {
        // 静默忽略
      }
    }, 2000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [orderId, payResult, router]);

  const formatPrice = (cents: number) => {
    return (cents / 100).toFixed(2);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#C47353]" />
      </div>
    );
  }

  // 支付结果页面
  if (payResult && !isWechat) {
    return (
      <div className="min-h-screen bg-[#FAF7F2]">
        <header className="bg-[#FAF7F2]/80 backdrop-blur-md border-b border-[rgba(196,115,83,0.15)] sticky top-0 z-10">
          <div className="container mx-auto px-4 py-3 sm:py-4">
            <button
              onClick={() => {
                setPayResult(null);
              }}
              className="flex items-center gap-2 text-sm sm:text-base text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>返回</span>
            </button>
          </div>
        </header>

        <div className="container mx-auto px-4 py-6 sm:py-8 md:py-12">
          <div className="max-w-md mx-auto">
            {/* 非微信环境：显示二维码引导用微信扫码 */}
            <Card className="card-apple mb-4">
              <CardHeader className="pb-3 sm:pb-4 text-center">
                <CardTitle className="flex items-center justify-center gap-2 text-base sm:text-lg">
                  <Smartphone className="h-5 w-5 text-green-500" />
                  请在微信内打开支付
                </CardTitle>
                <CardDescription>
                  请使用微信扫描下方二维码，在微信内完成支付
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 当前页面 URL 的二维码 */}
                <div className="flex justify-center">
                  <div className="bg-white p-4 rounded-xl border-2 border-gray-100">
                    <QRCodeSVG
                      value={window.location.href}
                      size={220}
                      level="M"
                      includeMargin={true}
                    />
                  </div>
                </div>

                <div className="text-center py-4 border-t border-b border-gray-100">
                  <p className="text-sm text-muted-foreground mb-1">应付金额</p>
                  <p className="text-3xl sm:text-4xl font-bold text-gradient">
                    ¥{order ? formatPrice(order.servicePrice) : '0.00'}
                  </p>
                </div>

                <div className="text-center space-y-2">
                  {isPolling && (
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>等待支付...</span>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    扫码后在微信内完成支付，支付成功自动跳转
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* 订单信息 */}
            <Card className="card-apple">
              <CardContent className="p-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">订单号</span>
                    <span className="font-mono">{payResult.payTradeNo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">咨询主题</span>
                    <span className="truncate max-w-[180px]">{order?.caseTitle}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // 默认显示支付方式选择
  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <header className="bg-[#FAF7F2]/80 backdrop-blur-md border-b border-[rgba(196,115,83,0.15)] sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 sm:py-4">
          <button
            onClick={() => setShowConfirmDialog(true)}
            className="flex items-center gap-2 text-sm sm:text-base text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>返回</span>
          </button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 sm:py-8 md:py-12">
        <div className="max-w-md mx-auto">
          {/* 微信环境提示 */}
          {isWechat && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
              <Smartphone className="h-5 w-5 text-green-500 flex-shrink-0" />
              <p className="text-sm text-green-700">已检测到微信环境，可直接支付</p>
            </div>
          )}

          {/* 非微信环境提示 */}
          {!isWechat && (
            <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0" />
              <div className="text-sm text-amber-700">
                <p className="font-medium mb-1">请在微信内打开此页面</p>
                <p>当前浏览器不支持微信支付，请用微信扫描支付页面的二维码</p>
              </div>
            </div>
          )}

          {/* 错误提示 */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* 订单信息卡片 */}
          <Card className="card-apple mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg">订单信息</CardTitle>
              <CardDescription>请确认订单信息并完成支付</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {order ? (
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">手机号码</span>
                      <span>{order.contactPhone}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">咨询主题</span>
                      <span className="truncate max-w-[180px]">{order.caseTitle}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">服务类型</span>
                      <span className="text-right">{formatServiceType(order.serviceType)}</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">应付金额</span>
                      <span className="text-2xl font-bold text-gradient">
                        ¥{formatPrice(order.servicePrice)}
                      </span>
                    </div>
                  </div>
                </>
              ) : loading && !isPreview ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-[#C47353]" />
                </div>
              ) : isPreview ? (
                <div className="text-center py-6">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#FAF7F2] border border-[rgba(196,115,83,0.2)] flex items-center justify-center">
                    <AlertCircle className="h-8 w-8 text-[#C47353]" />
                  </div>
                  <h3 className="text-lg font-serif text-[#3D322D] font-normal mb-2">订单不存在</h3>
                  <p className="text-sm text-[#8C7B6E] mb-4">
                    预览模式已关闭，请重新提交咨询
                  </p>
                  <Button
                    onClick={() => router.push('/')}
                    className="bg-[#C47353] hover:bg-[#A85D40] text-white rounded-full px-6"
                  >
                    重新咨询
                  </Button>
                </div>
              ) : (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-[#C47353]" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* 支付按钮 */}
          <Card className="card-apple mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-green-500" />
                {isWechat ? '微信支付' : '选择支付方式'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                onClick={createPayOrder}
                disabled={payLoading || !order}
                className="w-full h-14 text-base bg-green-500 hover:bg-green-600"
              >
                {payLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    正在创建支付...
                  </>
                ) : (
                  <>
                    <Smartphone className="h-5 w-5 mr-2" />
                    {isWechat ? '微信支付' : '生成支付二维码'}
                  </>
                )}
              </Button>

              {!isWechat && (
                <p className="text-xs text-muted-foreground text-center mt-3">
                  点击后将生成二维码，请用微信扫码打开完成支付
                </p>
              )}
              {isWechat && (
                <p className="text-xs text-muted-foreground text-center mt-3">
                  点击后将直接唤起微信支付
                </p>
              )}
            </CardContent>
          </Card>

          {/* 订单号 */}
          <Card className="card-apple">
            <CardContent className="p-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">订单号</p>
                <p className="font-mono text-sm">{orderId}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 返回确认弹窗 */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确定要取消支付吗？</AlertDialogTitle>
            <AlertDialogDescription>
              订单仍可在订单查询页面继续支付。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>继续支付</AlertDialogCancel>
            <AlertDialogAction onClick={() => router.back()}>
              确定返回
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function PayPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#C47353]" />
      </div>
    }>
      <PayContent />
    </Suspense>
  );
}
