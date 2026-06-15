'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, QrCode, ArrowLeft, AlertCircle, Smartphone } from 'lucide-react';
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

// 服务类型映射
const SERVICE_TYPE_MAP: Record<string, string> = {
  full: '全流程服务',
  consult: '咨询服务',
  court: '诉状起草',
  meet: '律师面谈',
  litigate: '诉讼指导',
};

// 格式化服务类型（支持多选）
function formatServiceType(serviceType: string): string {
  const types = serviceType.split(',').map(t => SERVICE_TYPE_MAP[t.trim()] || t.trim());
  return types.join(' · ');
}

interface PayResult {
  payTradeNo: string;
  codeUrl?: string;
  h5Url?: string;
  prepayId: string;
}

interface QrCodeResponse {
  success: boolean;
  data?: {
    qrCodeUrl: string;
  };
  error?: string;
}

function PayContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get('orderId');
  const isPreview = searchParams.get('preview') === '1';
  
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [payLoading, setPayLoading] = useState(false);
  const [showQrCode, setShowQrCode] = useState(false);
  const [payResult, setPayResult] = useState<PayResult | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isWechat, setIsWechat] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 检测是否为移动端设备 + 微信环境
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || '';
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      setIsMobile(isMobileDevice || (isTouchDevice && window.innerWidth < 768));
      setIsWechat(/micromessenger/i.test(userAgent));
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
    } catch (error) {
      console.error('获取订单失败:', error);
      setError('获取订单信息失败');
    } finally {
      setLoading(false);
    }
  };

  // 生成二维码（调用后端 API）
  const generateQrCode = async (codeUrl: string) => {
    setQrLoading(true);
    try {
      const response = await apiRequest(`/api/pay/qrcode?codeUrl=${encodeURIComponent(codeUrl)}`, { skipAuth: true });
      const data: QrCodeResponse = await response.json();
      if (data.success && data.data?.qrCodeUrl) {
        setQrCodeUrl(data.data.qrCodeUrl);
      } else {
        console.error('生成二维码失败:', data.error);
        setError('生成二维码失败，请刷新重试');
      }
    } catch (error) {
      console.error('生成二维码失败:', error);
      setError('生成二维码失败，请刷新重试');
    } finally {
      setQrLoading(false);
    }
  };

  // 创建微信支付订单
  const createPayOrder = async () => {
    if (!orderId) return;
    setPayLoading(true);
    if (!isMobile) setQrLoading(true);
    setError(null);
    try {
      const response = await apiRequest('/api/pay/create', {
        method: 'POST',
        body: JSON.stringify({ orderId: Number(orderId) }),
        headers: {
          'x-client-device': isMobile ? 'mobile' : 'pc',
          'x-user-agent': navigator.userAgent || '',
        },
      });
      const data = await response.json();
      if (data.success) {
        const result = data.data;
        setPayResult(result);

        // 手机浏览器：H5 支付跳转
        if (isMobile && result.h5Url) {
          console.log('[Pay] H5支付跳转:', result.h5Url.substring(0, 60) + '...');
          window.location.href = result.h5Url;
          return; // 跳转后不再执行后续逻辑
        }

        setShowQrCode(true);
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
      } else {
        const errMsg = data.error || data.debug || '创建支付订单失败';
        setError(errMsg);
      }
    } catch (error: any) {
      console.error('创建支付订单失败:', error);
      let errMsg = '创建支付订单失败，请重试';
      if (error?.message) {
        errMsg = error.message;
      } else if (typeof error === 'string') {
        errMsg = error;
      }
      setError(errMsg);
    } finally {
      setPayLoading(false);
      setQrLoading(false);
    }
  };

  useEffect(() => {
    if (orderId) {
      fetchOrder();
    }
  }, [orderId]);

  // 轮询订单状态
  useEffect(() => {
    if (!orderId || !showQrCode) {
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
      } catch (error: any) {
        console.warn('轮询订单状态失败:', error?.message || error);
      }
    }, 2000);
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [orderId, showQrCode, router]);

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
        <div className="container mx-auto px-4 py-6 sm:py-8 md:py-12">
          <div className="max-w-md mx-auto">
            {isMobile ? (
              <>
                <Card className="card-apple mb-4">
                  <CardHeader className="pb-3 sm:pb-4 text-center">
                    <CardTitle className="flex items-center justify-center gap-2 text-base sm:text-lg"><QrCode className="h-5 w-5 text-green-500" />微信支付</CardTitle>
                    {payResult?.h5Url ? (
                      <CardDescription>正在跳转至微信支付...</CardDescription>
                    ) : (
                      <CardDescription>请使用微信扫描下方二维码完成支付</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {payResult?.h5Url ? (
                      <>
                        <div className="text-center py-4 border-t border-b border-gray-100">
                          <p className="text-sm text-muted-foreground mb-1">应付金额</p>
                          <p className="text-3xl sm:text-4xl font-bold text-gradient">¥{order ? formatPrice(order.servicePrice) : '0.00'}</p>
                        </div>
                        <Button onClick={() => { if (payResult.h5Url) window.location.href = payResult.h5Url; }} className="w-full h-14 text-lg font-medium bg-[#07c160] hover:bg-[#06ad56] text-white rounded-xl" disabled={!payResult.h5Url}>
                          <Smartphone className="h-5 w-5 mr-2" />确认支付
                        </Button>
                        <div className="text-center space-y-2">
                          {isPolling && (<div className="flex items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /><span>等待支付...</span></div>)}
                          <p className="text-xs text-muted-foreground">点击按钮后将跳转至微信支付页面</p>
                        </div>
                      </>
                    ) : (
                      // 降级：无 h5_url 时展示二维码让用户截图扫码
                      <div className="space-y-4">
                        <div className="flex justify-center">
                          <div className="w-56 h-56 bg-white rounded-xl border-2 border-gray-100 flex items-center justify-center overflow-hidden">
                            {qrLoading ? (<Loader2 className="h-8 w-8 animate-spin text-[#C47353]" />) : qrCodeUrl ? (<img src={qrCodeUrl} alt="微信支付二维码" className="w-full h-full object-contain" />) : (
                              <div className="text-center text-muted-foreground text-sm p-4">
                                <AlertCircle className="h-8 w-8 mx-auto mb-2 text-red-500" />
                                <p>二维码生成失败</p>
                                <Button variant="outline" size="sm" onClick={() => generateQrCode(payResult!.codeUrl!)} className="mt-2">重新生成</Button>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-center py-4 border-t border-b border-gray-100">
                          <p className="text-sm text-muted-foreground mb-1">应付金额</p>
                          <p className="text-3xl sm:text-4xl font-bold text-gradient">¥{order ? formatPrice(order.servicePrice) : '0.00'}</p>
                        </div>
                        <div className="text-center space-y-2">
                          {isPolling && (<div className="flex items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /><span>等待支付...</span></div>)}
                          <p className="text-xs text-muted-foreground">请截图后在微信中扫一扫完成支付</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
                <Card className="card-apple">
                  <CardContent className="p-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-muted-foreground">订单号</span><span className="font-mono">{payResult.payTradeNo}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">手机号码</span><span>{order?.contactPhone}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">咨询主题</span><span className="truncate max-w-[180px]">{order?.caseTitle}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">服务类型</span><span className="text-right">{formatServiceType(order?.serviceType || '')}</span></div>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <>
                <Card className="card-apple mb-4">
                  <CardHeader className="pb-3 sm:pb-4 text-center">
                    <CardTitle className="flex items-center justify-center gap-2 text-base sm:text-lg"><QrCode className="h-5 w-5 text-green-500" />微信支付</CardTitle>
                    <CardDescription>请使用微信扫一扫</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
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
                      <div className="flex justify-between"><span className="text-muted-foreground">咨询主题</span><span className="truncate max-w-[180px]">{order?.caseTitle}</span></div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <header className="bg-[#FAF7F2]/80 backdrop-blur-md border-b border-[rgba(196,115,83,0.15)] sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 sm:py-4">
          <button onClick={() => setShowConfirmDialog(true)} className="flex items-center gap-2 text-sm sm:text-base text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /><span>返回</span>
          </button>
        </div>
      </header>
      <div className="container mx-auto px-4 py-6 sm:py-8 md:py-12">
        <div className="max-w-md mx-auto">
          {error && (<div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3"><AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" /><p className="text-sm text-red-600">{error}</p></div>)}
          <Card className="card-apple mb-4">
            <CardHeader className="pb-3"><CardTitle className="text-base sm:text-lg">订单信息</CardTitle><CardDescription>请确认订单信息并完成支付</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              {order ? (<>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">手机号码</span><span>{order.contactPhone}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">咨询主题</span><span className="truncate max-w-[180px]">{order.caseTitle}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">服务类型</span><span className="text-right">{formatServiceType(order.serviceType)}</span></div>
                </div>
                <div className="pt-4 border-t"><div className="flex justify-between items-center"><span className="font-medium">应付金额</span><span className="text-2xl font-bold text-gradient">¥{formatPrice(order.servicePrice)}</span></div></div>
              </>) : loading && !isPreview ? (<div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-[#C47353]" /></div>) : isPreview ? (
                <div className="text-center py-6">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#FAF7F2] border border-[rgba(196,115,83,0.2)] flex items-center justify-center"><AlertCircle className="h-8 w-8 text-[#C47353]" /></div>
                  <h3 className="text-lg font-serif text-[#3D322D] font-normal mb-2">订单不存在</h3>
                  <p className="text-sm text-[#8C7B6E] mb-4">预览模式已关闭，请重新提交咨询</p>
                  <Button onClick={() => router.push('/')} className="bg-[#C47353] hover:bg-[#A85D40] text-white rounded-full px-6">重新咨询</Button>
                </div>
              ) : (<div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-[#C47353]" /></div>)}
            </CardContent>
          </Card>
          <Card className="card-apple mb-4">
            <CardHeader className="pb-3"><CardTitle className="text-base sm:text-lg flex items-center gap-2"><QrCode className="h-5 w-5 text-green-500" />选择支付方式</CardTitle></CardHeader>
            <CardContent>
              <Button onClick={createPayOrder} disabled={payLoading || !order} className="w-full h-14 text-base bg-green-500 hover:bg-green-600">
                {payLoading ? (<><Loader2 className="h-5 w-5 animate-spin mr-2" />正在创建支付...</>) : (<><QrCode className="h-5 w-5 mr-2" />微信支付</>)}
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-3">点击上方按钮将生成微信支付二维码</p>
            </CardContent>
          </Card>
          <Card className="card-apple">
            <CardContent className="p-4"><div><p className="text-xs text-muted-foreground mb-1">订单号</p><p className="font-mono text-sm">{orderId}</p></div></CardContent>
          </Card>
        </div>
      </div>
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>确定要取消支付吗？</AlertDialogTitle><AlertDialogDescription>订单仍可在订单查询页面继续支付。</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>继续支付</AlertDialogCancel><AlertDialogAction onClick={() => router.back()}>确定返回</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function PayPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#C47353]" /></div>}>
      <PayContent />
    </Suspense>
  );
}
