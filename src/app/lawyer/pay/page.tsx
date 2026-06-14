'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, CheckCircle, ArrowLeft, Smartphone, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';

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

interface JsapiPayParams {
  appId: string;
  timeStamp: string;
  nonceStr: string;
  package: string;
  signType: string;
  paySign: string;
}

function LawyerPayContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const applicationId = searchParams.get('applicationId');

  const [orderId, setOrderId] = useState<string | null>(null);
  const [payParams, setPayParams] = useState<JsapiPayParams | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);
  const [isWechat, setIsWechat] = useState(false);

  // 检测微信环境
  useEffect(() => {
    const ua = navigator.userAgent || '';
    setIsWechat(/micromessenger/i.test(ua));
  }, []);

  // 从 URL 参数中获取 openid 并写入 localStorage（小程序 webview 传参场景）
  useEffect(() => {
    const urlOpenid = searchParams.get('openid');
    if (urlOpenid && urlOpenid.length > 10) {
      localStorage.setItem('wx_openid', urlOpenid);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!applicationId) {
      setError('缺少申请ID');
      setLoading(false);
      return;
    }

    // 创建支付订单
    const createPayment = async () => {
      try {
        const response = await fetch('/api/lawyer/pay/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            applicationId,
          }),
        });

        const result = await response.json();

        if (result.success && result.data?.h5_url) {
          setOrderId(result.data.orderId);
          // H5 支付：直接跳转
          window.location.href = result.data.h5_url;
        } else {
          console.error('支付创建失败:', result.error);
          setError(result.error || '支付创建失败，请稍后重试');
        }
      } catch (err) {
        console.error('Create payment error:', err);
        setError('网络错误，请稍后重试');
      } finally {
        setLoading(false);
      }
    };

    createPayment();
  }, [applicationId]);

  // 微信内调起 JSAPI 支付
  const invokeWechatPay = (params: JsapiPayParams) => {
    const doPay = () => {
      if (typeof window.WeixinJSBridge !== 'undefined') {
        window.WeixinJSBridge.invoke('getBrandWCPayRequest', {
          appId: params.appId,
          timeStamp: params.timeStamp,
          nonceStr: params.nonceStr,
          package: params.package,
          signType: params.signType,
          paySign: params.paySign,
        }, (res) => {
          if (res.err_msg === 'get_brand_wcpay_request:ok') {
            // 支付成功
          } else if (res.err_msg === 'get_brand_wcpay_request:cancel') {
            setError('支付已取消');
          } else {
            setError('支付失败，请重试');
          }
        });
      } else if (typeof window.wx !== 'undefined' && window.wx.chooseWXPay) {
        window.wx.chooseWXPay({
          appId: params.appId,
          timestamp: params.timeStamp,
          nonceStr: params.nonceStr,
          package: params.package,
          signType: params.signType,
          paySign: params.paySign,
          success: () => {},
          fail: () => setError('支付失败，请重试'),
          cancel: () => setError('支付已取消'),
        });
      }
    };

    if (typeof window.WeixinJSBridge === 'undefined') {
      document.addEventListener('WeixinJSBridgeReady', doPay, false);
    } else {
      doPay();
    }
  };

  // 轮询检查支付状态
  useEffect(() => {
    if (!orderId) return;

    const checkPaymentStatus = async () => {
      try {
        const response = await fetch(`/api/lawyer/pay/status?orderId=${orderId}`);
        const result = await response.json();

        if (result.success && result.data.status === 'paid') {
          setPaid(true);
          setTimeout(() => {
            router.push('/success?type=lawyer&orderId=' + orderId);
          }, 1500);
        }
      } catch {
        // 静默忽略
      }
    };

    const interval = setInterval(checkPaymentStatus, 3000);
    return () => clearInterval(interval);
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 50%, #F0FDF4 100%)' }}>
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-green-500 animate-spin mx-auto mb-4" />
          <p className="text-lg text-foreground">正在创建支付订单...</p>
        </div>
      </div>
    );
  }

  if (paid) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 50%, #F0FDF4 100%)' }}>
        <div className="max-w-md mx-auto bg-white rounded-xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">支付成功</h2>
          <p className="text-muted-foreground mb-6">您的律师入驻申请已提交成功，我们将在1-2个工作日内审核。</p>
          <Link href="/">
            <button className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-semibold hover:from-green-600 hover:to-emerald-600 transition-all">
              返回首页
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 50%, #F0FDF4 100%)' }}>
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-green-100/50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <button onClick={() => router.back()} className="flex items-center gap-1.5 text-green-600 hover:text-green-700 transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-medium">返回</span>
            </button>
            <span className="text-sm font-semibold text-green-600">律师入驻支付</span>
            <div className="w-16" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-xl shadow-xl p-6 text-center">
            <h2 className="text-xl font-bold text-foreground mb-4">完成支付</h2>

            {/* 微信环境提示 */}
            {isWechat && !error && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl">
                <p className="text-sm text-green-700">
                  {payParams ? '支付窗口已弹出，请在微信内完成支付' : '正在准备支付...'}
                </p>
              </div>
            )}

            {/* 非微信环境：显示二维码 */}
            {!isWechat && !error && (
              <div className="mb-6">
                <p className="text-sm text-muted-foreground mb-4">
                  请使用微信扫描下方二维码，在微信内完成支付
                </p>
                <div className="bg-white p-4 rounded-xl border border-border mx-auto inline-block">
                  <QRCodeSVG
                    value={window.location.href}
                    size={220}
                    level="M"
                    includeMargin={true}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  扫码后在微信内打开此页面自动完成支付
                </p>
              </div>
            )}

            {/* 错误提示 */}
            {error && (
              <div className="mb-6 p-6 bg-gradient-to-b from-red-50 to-white rounded-xl border border-red-200">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">支付创建失败</h3>
                <p className="text-sm text-muted-foreground mb-4">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="w-full py-3 px-6 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-semibold hover:from-green-600 hover:to-emerald-600 transition-all flex items-center justify-center gap-2"
                >
                  重新尝试
                </button>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              支付完成后页面将自动跳转
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 50%, #F0FDF4 100%)' }}>
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-green-500 animate-spin mx-auto mb-4" />
        <p className="text-lg text-foreground">加载中...</p>
      </div>
    </div>
  );
}

export default function LawyerPayPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <LawyerPayContent />
    </Suspense>
  );
}
