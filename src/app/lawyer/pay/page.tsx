'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { AlertCircle, ArrowLeft, CheckCircle, Loader2, Smartphone } from 'lucide-react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { getLawyerUrl } from '@/lib/site';

type PaymentContext = {
  status: 'payable' | 'paid' | 'no_payable_application' | 'manual_review_required';
  packageType?: string | null;
  amount?: number;
};

function getPaymentRequestHeaders(): Record<string, string> {
  const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent || '';
  const token = typeof localStorage === 'undefined' ? null : localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'x-client-device': /Android|iPhone|iPad|iPod/i.test(ua) ? 'mobile' : 'web',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function packageLabel(packageType?: string | null) {
  if (['civil', 'civil_premium'].includes(packageType || '')) return '民事律师入驻套餐';
  if (['criminal', 'criminal_premium'].includes(packageType || '')) return '刑事律师入驻套餐';
  return '律师入驻套餐';
}

function money(amount?: number) {
  return typeof amount === 'number' ? `¥${(amount / 100).toFixed(2)}` : '--';
}

export default function LawyerPayPage() {
  const [context, setContext] = useState<PaymentContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);
  const [creatingPayment, setCreatingPayment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);
  const [qrCodeValue, setQrCodeValue] = useState<string | null>(null);
  const [h5Url, setH5Url] = useState<string | null>(null);
  const loginUrl = `/lawyer/login?redirect=${encodeURIComponent('/lawyer/pay')}`;

  useEffect(() => {
    const loadContext = async () => {
      try {
        const response = await fetch('/api/lawyer/payment-context', { headers: getPaymentRequestHeaders() });
        const result = await response.json();
        if (response.status === 401) {
          setAuthRequired(true);
          return;
        }
        if (!result.success) {
          setError(result.error || '加载支付信息失败');
          return;
        }
        setContext(result.data);
        setPaid(result.data?.status === 'paid');
      } catch {
        setError('网络错误，请稍后重试');
      } finally {
        setLoading(false);
      }
    };
    loadContext();
  }, []);

  useEffect(() => {
    if (!orderId || paid) return;
    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/lawyer/pay/status?orderId=${encodeURIComponent(orderId)}`, { headers: getPaymentRequestHeaders() });
        const result = await response.json();
        if (result.success && result.data?.status === 'paid') setPaid(true);
      } catch {
        // 轮询失败不改变当前页面，用户可继续完成支付或稍后重试。
      }
    };
    checkStatus();
    const timer = window.setInterval(checkStatus, 3000);
    return () => window.clearInterval(timer);
  }, [orderId, paid]);

  const createPayment = async () => {
    if (!context || context.status !== 'payable' || creatingPayment) return;
    setCreatingPayment(true);
    setError(null);
    try {
      const response = await fetch('/api/lawyer/pay/create', {
        method: 'POST',
        headers: getPaymentRequestHeaders(),
        body: JSON.stringify({}),
      });
      const result = await response.json();
      if (response.status === 401) {
        setAuthRequired(true);
        return;
      }
      if (!result.success) {
        setError(result.error || '支付创建失败，请稍后重试');
        return;
      }
      const data = result.data || {};
      setOrderId(data.orderId || null);
      if (data.status === 'paid' || data.isPaid) {
        setPaid(true);
      } else if (data.h5Url) {
        setH5Url(data.h5Url);
      } else if (data.codeUrl) {
        setQrCodeValue(data.codeUrl);
      } else if (data.reused) {
        setError('已有一笔待支付订单正在处理中，请在此前打开的支付窗口继续完成，或等待订单超时后重新发起。');
      } else {
        setError('未获取到支付凭据，请稍后重试');
      }
    } catch {
      setError('网络错误，请稍后重试');
    } finally {
      setCreatingPayment(false);
    }
  };

  const shell = (children: ReactNode) => (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
      <header className="border-b border-green-100 bg-white/80 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <button onClick={() => window.history.length > 1 ? window.history.back() : window.location.assign(getLawyerUrl())} className="flex items-center gap-1 text-sm font-medium text-green-700">
            <ArrowLeft className="h-4 w-4" /> 返回
          </button>
          <span className="font-semibold text-green-700">律师入驻支付</span><span className="w-12" />
        </div>
      </header>
      <main className="container mx-auto px-4 py-10"><div className="mx-auto max-w-md rounded-2xl bg-white p-6 text-center shadow-xl">{children}</div></main>
    </div>
  );

  if (loading) return shell(<><Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-green-600" /><p>正在加载支付信息...</p></>);
  if (authRequired) return shell(<><AlertCircle className="mx-auto mb-4 h-10 w-10 text-amber-500" /><h1 className="mb-2 text-xl font-bold">请先登录</h1><p className="mb-6 text-sm text-muted-foreground">登录后将继续验证您本人的入驻支付申请。</p><Link href={loginUrl} className="block rounded-xl bg-[#C47353] px-5 py-3 font-semibold text-white">前往登录</Link></>);
  if (paid) return shell(<><CheckCircle className="mx-auto mb-4 h-12 w-12 text-green-600" /><h1 className="mb-2 text-xl font-bold">支付已完成</h1><p className="text-sm text-muted-foreground">您的入驻申请已支付，等待平台审核。</p></>);
  if (!context || context.status !== 'payable') return shell(<><AlertCircle className="mx-auto mb-4 h-10 w-10 text-slate-500" /><h1 className="mb-2 text-xl font-bold">暂无可支付申请</h1><p className="mb-6 text-sm text-muted-foreground">请先提交入驻申请，或查看当前申请审核状态。</p><div className="flex gap-3"><Link href="/lawyer/join/apply" className="flex-1 rounded-xl bg-[#C47353] px-3 py-3 text-sm font-semibold text-white">申请入驻</Link><Link href="/lawyer/pending" className="flex-1 rounded-xl border px-3 py-3 text-sm font-semibold">查看申请状态</Link></div></>);

  return shell(<>
    <h1 className="mb-2 text-xl font-bold">确认入驻支付</h1>
    <p className="mb-5 text-sm text-muted-foreground">{packageLabel(context.packageType)}</p>
    <p className="mb-6 text-3xl font-bold text-[#C47353]">{money(context.amount)}</p>
    {qrCodeValue && <div className="mb-5 inline-block rounded-xl border p-3"><QRCodeSVG value={qrCodeValue} size={200} includeMargin /></div>}
    {h5Url && <button onClick={() => window.location.assign(h5Url)} className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#C47353] px-5 py-3 font-semibold text-white"><Smartphone className="h-5 w-5" />前往微信支付</button>}
    {!qrCodeValue && !h5Url && <button onClick={createPayment} disabled={creatingPayment} className="w-full rounded-xl bg-[#C47353] px-5 py-3 font-semibold text-white disabled:opacity-60">{creatingPayment ? '正在创建订单...' : '确认并支付'}</button>}
    {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}<button onClick={createPayment} className="ml-2 underline">重新尝试</button></div>}
  </>);
}
