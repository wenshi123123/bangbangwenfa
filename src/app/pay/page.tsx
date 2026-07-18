"use client";

import { Suspense, useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, QrCode, Loader2, AlertCircle, CheckCircle, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { WechatExternalBrowserGuide } from '@/components/payment/wechat-external-browser-guide';

// 支付页面 - 咨询下单后跳转此页面完成支付

interface Order {
  id: number;
  orderNo: string;
  serviceName: string;
  servicePrice: number;
  caseTitle: string;
  contactPhone: string;
  contactName: string;
}

interface PayResult {
  payTradeNo: string;
  codeUrl?: string;
  h5Url?: string;
  prepayId?: string;
  jsapiPayParams?: {
    appId: string;
    timeStamp: string;
    nonceStr: string;
    package: string;
    signType: 'RSA';
    paySign: string;
  };
}

// 通用 API 请求
async function apiRequest(path: string, options?: { method?: string; body?: any; skipAuth?: boolean }) {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-client-device': isMobile ? 'mobile' : 'web',
    'x-user-agent': ua.toLowerCase(),
  };

  // 添加 token
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
  if (token && !options?.skipAuth) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(path, {
    method: options?.method || 'GET',
    headers,
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    const error = new Error(err.error || `请求失败 (${res.status})`) as Error & { code?: string };
    error.code = err.code;
    throw error;
  }

  return res.json();
}

function PayPageInner() {
  const formatPrice = (price: number) => (price / 100).toFixed(2);
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderIdParam = searchParams.get('orderId') || searchParams.get('orderNo');
  const handoffToken = searchParams.get('handoff');
  const { user, isLoggedIn, isLoading } = useAuth();
  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }
    router.push('/me');
  };

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payLoading, setPayLoading] = useState(false);
  const [showQrCode, setShowQrCode] = useState(false);
  const [payResult, setPayResult] = useState<PayResult | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [pollCount, setPollCount] = useState(0);
  const [isPolling, setIsPolling] = useState(false);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isWechat, setIsWechat] = useState(false);
  const [deviceReady, setDeviceReady] = useState(false);
  const [showWechatBrowserGuide, setShowWechatBrowserGuide] = useState(false);

  // 检测设备类型
  useEffect(() => {
    const ua = navigator.userAgent || '';
    setIsMobile(/Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua));
    setIsWechat(/MicroMessenger/i.test(ua));
    setDeviceReady(true);
  }, []);

  // 微信内从历史待支付订单进入时，现场补发外部浏览器专用凭证。
  useEffect(() => {
    if (!deviceReady || !isWechat || !isLoggedIn || !orderIdParam || handoffToken || isLoading) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    fetch('/api/pay/handoff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ orderId: orderIdParam }),
    })
      .then((response) => response.json())
      .then((result) => {
        if (!result.success || !result.data?.handoffToken) return;
        const nextUrl = new URL(window.location.href);
        nextUrl.searchParams.set('handoff', result.data.handoffToken);
        window.location.replace(nextUrl.toString());
      })
      .catch((error) => console.error('创建支付凭证失败:', error));
  }, [deviceReady, isWechat, isLoggedIn, orderIdParam, handoffToken, isLoading]);

  // 加载订单信息
  useEffect(() => {
    if (!deviceReady || isWechat) return;

    if (!orderIdParam) {
      setError('缺少订单号');
      setLoading(false);
      return;
    }

    if (isLoading) {
      return;
    }

    if (!isLoggedIn && !isWechat && !handoffToken) {
      setError('未登录或登录已过期');
      setLoading(false);
      return;
    }

    // 订单号有效后，清掉可能残留的旧错误态，再重新加载订单
    setError(null);
    loadOrder();
  }, [orderIdParam, handoffToken, isLoggedIn, isLoading, isWechat, deviceReady]);

  const loadOrder = async () => {
    try {
      // 修复：API 期望的参数是 orderId（不是 orderNo）
      setError(null);
      const handoffQuery = handoffToken ? `&handoff=${encodeURIComponent(handoffToken)}` : '';
      const data = await apiRequest(`/api/consult/order?orderId=${orderIdParam}${handoffQuery}`);
      if (data.success && data.order) {  // 修复：API 返回的是 data.order（不是 data.data）
        setOrder(data.order);
      } else {
        setError(data.error || '订单不存在');
      }
    } catch (err: any) {
      console.error('加载订单失败:', err);
      setError(err.message || '加载订单失败');
    } finally {
      setLoading(false);
    }
  };

  // 生成二维码（调用后端 API）
  const generateQrCode = async (codeUrl: string) => {
    setQrLoading(true);
    try {
      const response = await apiRequest(`/api/pay/qrcode?codeUrl=${encodeURIComponent(codeUrl)}`, { skipAuth: true });
      if (response.success && response.data?.qrCodeUrl) {
        setQrCodeUrl(response.data.qrCodeUrl);
      } else {
        console.error('生成二维码失败:', response.error);
        setQrCodeUrl(null);
      }
    } catch (err: any) {
      console.error('生成二维码请求失败:', err);
      setQrCodeUrl(null);
    } finally {
      setQrLoading(false);
    }
  };

  // 创建支付
  const handlePay = async () => {
    if (isWechat) return;
    if (!order || payLoading) return;

    setPayLoading(true);
    setError(null);
    setShowWechatBrowserGuide(false);

    try {
      const data = await apiRequest('/api/pay/create', {
        method: 'POST',
        body: {
          orderId: order.id,  // 使用数据库主键作为支付订单ID
          amount: order.servicePrice, // 订单金额已是分，直接传给支付接口
          description: order.caseTitle || order.serviceName || '法律咨询服务',
          handoffToken: handoffToken || undefined,
        },
      });

      if (data.success) {
        const result = data.data;
        setPayResult(result);

        // 手机浏览器：H5 支付跳转
        if (isMobile && result.h5Url) {
          // Android 浏览器常会拦截异步回调中的 App 唤起；展示按钮，让用户点击后跳转。
          setShowQrCode(true);
          return;
        }

        // PC：Native 扫码支付（原有逻辑）
        if (!isMobile && result.codeUrl) {
          try {
            await generateQrCode(result.codeUrl);
          } catch (qrError: any) {
            console.error('生成二维码失败（支付订单已创建）:', qrError);
          }
        }

        // 移动端但无 h5_url（降级）：显示二维码让用户截图扫码
        if (isMobile && !result.h5Url && result.codeUrl) {
          try {
            await generateQrCode(result.codeUrl);
          } catch (qrError: any) {
            console.error('生成二维码失败:', qrError);
          }
        }

        setShowQrCode(true);
      } else {
        setError(data.error || '创建支付失败');
      }
    } catch (err: any) {
      console.error('创建支付失败:', err);
      setError(err.message || '创建支付失败，请稍后重试');
    } finally {
      setPayLoading(false);
    }
  };

  // 轮询支付状态
  useEffect(() => {
    if (isWechat) return;
    if (!showQrCode || !payResult || isMobile) return;

    let cancelled = false;
    const maxPolls = 60; // 最多轮询 60 次（约 5 分钟）

    const poll = async () => {
      if (cancelled || pollCount >= maxPolls) return;

      try {
        setIsPolling(true);
        const data = await apiRequest(`/api/pay/status?payTradeNo=${payResult.payTradeNo}`, { skipAuth: true });

        if (cancelled) return;

        if (data.success && data.data?.tradeState === 'SUCCESS') {
          // 支付成功，跳转成功页
          router.push(`/success?orderId=${order?.id ?? orderIdParam}`);
        } else {
          setPollCount(prev => prev + 1);
        }
      } catch (err) {
        console.error('查询支付状态失败:', err);
      } finally {
        if (!cancelled) setIsPolling(false);
      }
    };

    // 立即查询一次
    poll();
    // 然后每 5 秒查询一次
    pollRef.current = setInterval(poll, 5000);

    return () => {
      cancelled = true;
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [showQrCode, payResult, pollCount, orderIdParam, router, isMobile, isWechat]);

  if (deviceReady && isWechat) {
    return <WechatExternalBrowserGuide />;
  }

  // 加载中
  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-[#C47353]" />
          <p className="text-muted-foreground">加载订单信息...</p>
        </div>
      </div>
    );
  }

  // 错误状态
  if (error && !order) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
          <h2 className="text-xl font-semibold mb-2">加载失败</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => router.push('/me')} className="bg-[#C47353] hover:bg-[#A85D40]">返回我的</Button>
        </div>
      </div>
    );
  }

  if (showQrCode && payResult) {
    return (
      <div className="min-h-screen bg-[#FAF7F2]">
        <header className="bg-[#FAF7F2]/80 backdrop-blur-md border-b border-[rgba(196,115,83,0.15)] sticky top-0 z-10">
          <div className="container mx-auto px-4 py-3 sm:py-4">
            <button onClick={() => { setShowQrCode(false); setPayResult(null); setQrCodeUrl(null); }} className="flex items-center gap-2 text-sm sm:text-base text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" /><span>返回</span>
            </button>
          </div>
        </header>
        <main className="container mx-auto px-4 py-6 sm:py-12 max-w-md">
          <div className="space-y-4 sm:space-y-6">
            <Card className="card-apple">
              <CardHeader className="pb-3 sm:pb-4 text-center">
                <CardTitle className="flex items-center justify-center gap-2 text-base sm:text-lg"><QrCode className="h-5 w-5 text-green-500" />微信支付</CardTitle>
                {payResult?.h5Url ? (
                  <CardDescription>正在跳转至微信支付...</CardDescription>
                ) : (
                  <CardDescription>请使用微信扫一扫</CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {payResult?.h5Url ? (
                  <>
                    <div className="text-center py-4 border-t border-b border-gray-100">
                      <p className="text-sm text-muted-foreground mb-1">应付金额</p>
                      <p className="text-3xl sm:text-4xl font-bold text-gradient">¥{order ? formatPrice(order.servicePrice) : '0.00'}</p>
                    </div>
                    {(() => {
                      const targetOrderId = order?.id ?? orderIdParam ?? '';
                      return (
                    <Button onClick={() => {
                      if (payResult.h5Url) {
                        window.location.href = payResult.h5Url;
                      }
                    }} className="w-full h-14 text-lg font-medium bg-[#07c160] hover:bg-[#06ad56] text-white rounded-xl" disabled={!payResult.h5Url}>
                      <Smartphone className="h-5 w-5 mr-2" />前往微信支付
                    </Button>
                      );
                    })()}
                  </>
                ) : (
                  <div className="flex justify-center">
                    <div className="w-64 h-64 bg-white rounded-xl border-2 border-gray-100 flex items-center justify-center overflow-hidden">
                      {qrLoading ? (<Loader2 className="h-8 w-8 animate-spin text-[#C47353]" />) : qrCodeUrl ? (<img src={qrCodeUrl} alt="微信支付二维码" className="w-full h-full object-contain" />) : (
                        <div className="text-center text-muted-foreground text-sm p-4">
                          <AlertCircle className="h-8 w-8 mx-auto mb-2 text-red-500" />
                          <p>二维码生成失败</p>
                          <Button variant="outline" size="sm" onClick={() => generateQrCode(payResult.codeUrl!)} className="mt-2">重新生成</Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <div className="text-center py-4 border-t border-b border-gray-100">
                  <p className="text-sm text-muted-foreground mb-1">应付金额</p>
                  <p className="text-3xl sm:text-4xl font-bold text-gradient">¥{order ? formatPrice(order.servicePrice) : '0.00'}</p>
                </div>
                <div className="text-center space-y-2">
                  {isPolling && (<div className="flex items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /><span>等待支付...</span></div>)}
                  <p className="text-xs text-muted-foreground">请使用微信扫一扫完成支付</p>
                </div>
              </CardContent>
            </Card>
            <Card className="card-apple">
              <CardContent className="p-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">订单号</span><span className="font-mono">{payResult.payTradeNo}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">手机号码</span><span>{order?.contactPhone}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">咨询主题</span><span className="truncate max-w-[180px]">{order?.caseTitle}</span></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <header className="bg-[#FAF7F2]/80 backdrop-blur-md border-b border-[rgba(196,115,83,0.15)] sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 sm:py-4">
          <button onClick={handleBack} className="flex items-center gap-2 text-sm sm:text-base text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /><span>返回</span>
          </button>
        </div>
      </header>
      <main className="container mx-auto px-4 py-6 sm:py-12 max-w-md">
        <div className="space-y-4 sm:space-y-6">
          <Card className="card-apple">
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="text-base sm:text-lg">确认支付</CardTitle>
              <CardDescription>请确认以下订单信息</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              {showWechatBrowserGuide && <WechatExternalBrowserGuide />}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-muted-foreground">订单编号</span>
                  <span className="font-mono">{order?.id ?? orderIdParam}</span>
                </div>
                {order?.caseTitle && (
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-muted-foreground">咨询主题</span>
                    <span className="text-right max-w-[200px] truncate">{order.caseTitle}</span>
                  </div>
                )}
                {order?.contactPhone && (
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-muted-foreground">联系手机</span>
                    <span>{order.contactPhone}</span>
                  </div>
                )}
                {order?.contactName && (
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-muted-foreground">联系人</span>
                    <span>{order.contactName}</span>
                  </div>
                )}
              </div>
              <div className="text-center py-4 border-t border-b border-gray-100">
                <p className="text-sm text-muted-foreground mb-1">应付金额</p>
                <p className="text-3xl sm:text-4xl font-bold text-gradient">¥{order ? formatPrice(order.servicePrice) : '0.00'}</p>
              </div>
              <Button
                onClick={() => {
                  handlePay();
                }}
                disabled={payLoading}
                className="w-full h-14 text-lg font-medium bg-[#C47353] hover:bg-[#A85D40] text-white rounded-xl"
              >
                {payLoading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                {payLoading ? '正在创建支付...' : isWechat ? '微信支付' : isMobile ? '微信支付' : '确认支付'}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                {isWechat ? '微信内将直接拉起微信支付；如不可用可按提示在浏览器继续支付' : isMobile ? '点击后将跳转到微信完成支付' : '点击后将显示微信支付二维码'}
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

export default function PayPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#C47353]" /></div>}>
      <PayPageInner />
    </Suspense>
  );
}
