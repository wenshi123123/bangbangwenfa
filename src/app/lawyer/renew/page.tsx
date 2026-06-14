'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, CheckCircle, Clock, CreditCard, Loader2, AlertCircle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LawyerBottomNav } from '@/components/lawyer/lawyer-bottom-nav';

// 套餐配置
const renewalPackages = [
  { id: 'civil_renew_6', name: '民事律师续费（6个月）', price: 200000, priceDisplay: '2000', duration: '6个月', type: 'civil' as const, features: ['继续接收民事类客户', '平台流量扶持', '专属认证标识'], description: '适合短期试用或刚入驻平台，快速体验接单流程。' },
  { id: 'civil_renew_18', name: '民事律师续费（18个月）', price: 500000, priceDisplay: '5000', duration: '18个月', type: 'civil' as const, features: ['继续接收民事类客户', '平台流量扶持', '专属认证标识', '额外赠送1个月'], description: '性价比之选，平均每月仅 ¥277，比6个月套餐便宜约44%，适合长期执业。', recommended: true },
  { id: 'criminal_renew_6', name: '刑事律师续费（6个月）', price: 320000, priceDisplay: '3200', duration: '6个月', type: 'criminal' as const, features: ['继续接收刑事类客户', '平台流量扶持', '专属认证标识'], description: '适合短期试用或刚入驻平台，快速体验接单流程。' },
  { id: 'criminal_renew_18', name: '刑事律师续费（18个月）', price: 800000, priceDisplay: '8000', duration: '18个月', type: 'criminal' as const, features: ['继续接收刑事类客户', '平台流量扶持', '专属认证标识', '额外赠送1个月'], description: '性价比之选，平均每月仅 ¥444，比6个月套餐便宜约44%，适合长期执业。', recommended: true },
];

function RenewContent() {
  const router = useRouter();
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [qrcodeUrl, setQrcodeUrl] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    const checkStatus = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers: HeadersInit = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch(`/api/lawyer/pay/status?orderId=${orderId}`, { headers });
        const result = await res.json();
        if (result.success && result.data?.status === 'paid') {
          setPaid(true);
          setTimeout(() => { router.push('/lawyer'); }, 2000);
        }
      } catch (err: any) {
        console.warn('轮询支付状态失败:', err?.message || err);
      }
    };
    const interval = setInterval(checkStatus, 3000);
    return () => clearInterval(interval);
  }, [orderId, router]);

  const handleSelectPackage = (pkgId: string) => { setSelectedPackage(pkgId); setError(null); };

  const handlePay = useCallback(async () => {
    if (!selectedPackage || loading) return;
    setLoading(true); setError(null);
    const pkg = renewalPackages.find(p => p.id === selectedPackage);
    if (!pkg) { setError('套餐信息异常'); setLoading(false); return; }
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const response = await fetch('/api/lawyer/renew', { method: 'POST', headers, body: JSON.stringify({ package_id: pkg.id }) });
      const result = await response.json();
      if (result.success && result.data?.code_url) {
        setOrderId(result.data.order_id);
        setQrcodeUrl(result.data.code_url);
      } else {
        setError(result.error || '创建支付订单失败，请稍后重试');
      }
    } catch (err: any) {
      console.error('创建支付订单失败:', err);
      let errMsg = '网络错误，请检查连接后重试';
      if (err?.message) { errMsg = err.message; } else if (typeof err === 'string') { errMsg = err; }
      setError(errMsg);
    } finally { setLoading(false); }
  }, [selectedPackage, loading]);

  if (paid) {
    return (<div className="min-h-screen flex items-center justify-center p-4 bg-[#FAF7F2]"><div className="bg-white rounded-xl p-8 max-w-sm w-full text-center"><div className="w-16 h-16 bg-[#C47353]/10 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle className="w-8 h-8 text-[#C47353]" /></div><h2 className="text-xl font-serif text-[#3D322D] mb-2">续费成功</h2><p className="text-sm text-[#8C7B6E] mb-6">您的会员已成功续期，页面即将跳转...</p><Link href="/lawyer"><Button className="w-full py-3 bg-[#C47353] hover:bg-[#A85D40] text-white rounded-full font-serif tracking-wide shadow-[0_2px_12px_rgba(196,115,83,0.3)]">返回律师后台</Button></Link></div></div>);
  }

  if (qrcodeUrl) {
    return (<div className="min-h-screen flex items-center justify-center p-4 bg-[#FAF7F2]"><div className="bg-white rounded-xl p-8 max-w-sm w-full text-center"><h2 className="text-xl font-serif text-[#3D322D] mb-2">微信扫码支付</h2><p className="text-sm text-[#8C7B6E] mb-6">请使用微信扫描下方二维码完成支付</p><div className="mb-6"><div className="inline-block p-4 bg-white rounded-xl border border-[rgba(196,115,83,0.2)]"><QRCodeSVG value={qrcodeUrl} size={220} level="M" includeMargin={true} /></div><p className="text-xs text-[#8C7B6E] mt-3">{selectedPackage ? `¥${renewalPackages.find(p => p.id === selectedPackage)?.priceDisplay}` : ''}</p></div><p className="text-xs text-[#8C7B6E] mb-4">支付完成后页面将自动跳转</p><div className="flex gap-3"><Button variant="outline" onClick={() => { setQrcodeUrl(null); setOrderId(null); }} className="flex-1 py-3 border-[rgba(196,115,83,0.3)] text-[#8C7B6E] hover:bg-[#FAF7F2] rounded-full font-serif">返回选择</Button><Button onClick={() => window.location.reload()} variant="outline" className="flex-1 py-3 border-[rgba(196,115,83,0.3)] text-[#8C7B6E] hover:bg-[#FAF7F2] rounded-full font-serif">刷新二维码</Button></div></div></div>);
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <div className="sticky top-0 z-40 bg-[#FAF7F2]/80 backdrop-blur-md border-b border-[rgba(196,115,83,0.15)]">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link href="/lawyer" className="flex items-center gap-1.5 text-[#C47353] hover:text-[#A85D40] transition-colors duration-150"><ArrowLeft className="w-5 h-5" /><span className="text-sm font-medium font-serif">返回</span></Link>
            <div className="flex items-center gap-2"><span className="text-base font-serif font-normal text-[#C47353]">续费会员</span></div>
            <div className="w-16" />
          </div>
        </div>
      </div>
      <div className="container mx-auto px-4 py-6">
        <Card className="mb-6 border-[rgba(196,115,83,0.2)] bg-[#FAF7F2] shadow-none rounded-xl">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-[#C47353] flex-shrink-0 mt-0.5" />
              <div><p className="font-serif font-normal text-[#3D322D]">续费说明</p><ul className="text-sm text-[#8C7B6E] mt-2 space-y-1"><li>• 续费后会员有效期将在当前到期日基础上顺延</li><li>• 续费金额按所选套餐时长计算</li><li>• 18个月套餐平均每月费用更低，比6个月套餐便宜约44%</li><li>• 会员到期后未续费将自动降级，但仍可查看历史数据</li><li>• 如有问题请联系客服</li></ul></div>
            </div>
          </CardContent>
        </Card>
        <h3 className="text-xl font-serif text-[#3D322D] font-normal mb-6">选择续费套餐</h3>
        {error && (<div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2"><AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" /><p className="text-sm text-red-600">{error}</p></div>)}
        <div className="grid gap-4">
          {renewalPackages.map((pkg) => (
            <Card key={pkg.id} className={`cursor-pointer transition-all duration-250 shadow-none rounded-xl hover:-translate-y-[2px] ${selectedPackage === pkg.id ? 'border-[#C47353] ring-2 ring-[#C47353]/20' : 'border-[rgba(196,115,83,0.2)] hover:shadow-[0_4px_16px_rgba(61,50,45,0.08)]'}`} onClick={() => handleSelectPackage(pkg.id)}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 flex-shrink-0 ${selectedPackage === pkg.id ? 'border-[#C47353] bg-[#C47353]' : 'border-[#E5DDD5]'}`}>{selectedPackage === pkg.id && (<CheckCircle className="w-3 h-3 text-white" />)}</div>
                    <div>
                      <div className="flex items-center gap-2"><h4 className="font-serif font-normal text-[#3D322D]">{pkg.name}</h4>{pkg.recommended && (<span className="px-2.5 py-0.5 bg-[#FAF7F2] text-[#C47353] text-xs font-serif rounded-full">推荐</span>)}</div>
                      <p className="text-sm text-[#8C7B6E] mt-1">{pkg.duration}</p>
                      <div className="flex flex-wrap gap-1.5 mt-3">{pkg.features.map((feature, index) => (<span key={index} className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#FAF7F2] text-[#8C7B6E] text-xs font-serif rounded-full"><CheckCircle className="w-3 h-3 text-[#C47353]" />{feature}</span>))}</div>
                      {pkg.description && (<p className="text-xs text-[#8C7B6E] mt-3 leading-relaxed">{pkg.description}</p>)}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4"><p className="text-2xl font-serif text-[#C47353] font-normal">¥{pkg.priceDisplay}</p><p className="text-xs text-[#8C7B6E]">元</p></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="mt-6">
          <Button onClick={handlePay} disabled={!selectedPackage || loading} className={`w-full py-6 text-lg font-serif rounded-full h-auto transition-all duration-250 ${selectedPackage && !loading ? 'bg-[#C47353] hover:bg-[#A85D40] text-white shadow-[0_4px_16px_rgba(196,115,83,0.3)] hover:-translate-y-[1px] active:scale-[0.98]' : 'bg-[#C47353]/40 text-white/70 cursor-not-allowed'}`}>
            {loading ? (<><Loader2 className="w-5 h-5 mr-2 animate-spin" />正在创建支付订单...</>) : (<><CreditCard className="w-5 h-5 mr-2" />{selectedPackage ? `立即支付 ¥${renewalPackages.find(p => p.id === selectedPackage)?.priceDisplay}` : '请选择续费套餐'}</>)}
          </Button>
        </div>
        <p className="text-center text-sm text-[#8C7B6E] mt-4 font-serif">点击支付后将生成微信支付二维码，请使用微信扫码支付</p>
      </div>
      <LawyerBottomNav />
    </div>
  );
}

function LoadingFallback() {
  return (<div className="min-h-screen flex items-center justify-center bg-[#FAF7F2]"><div className="text-center"><Loader2 className="w-12 h-12 text-[#C47353] animate-spin mx-auto mb-4" /><p className="text-lg font-serif text-[#3D322D]">加载中...</p></div></div>);
}

export default function LawyerRenewPage() {
  return (<Suspense fallback={<LoadingFallback />}><RenewContent /></Suspense>);
}
