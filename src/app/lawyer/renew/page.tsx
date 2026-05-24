'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Calendar, CheckCircle, Clock, CreditCard } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LawyerBottomNav } from '@/components/lawyer/lawyer-bottom-nav';

const renewalPackages = [
  {
    id: 'civil_renew_6',
    name: '民事律师续费（6个月）',
    price: 200000, // 2000元
    priceDisplay: '2000',
    duration: '6个月',
    features: [
      '继续接收民事类客户',
      '平台流量扶持',
      '专属认证标识',
    ],
    color: 'blue',
  },
  {
    id: 'civil_renew_18',
    name: '民事律师续费（18个月）',
    price: 500000, // 5000元
    priceDisplay: '5000',
    duration: '18个月',
    features: [
      '继续接收民事类客户',
      '平台流量扶持',
      '专属认证标识',
      '额外赠送1个月',
    ],
    color: 'blue',
    recommended: true,
  },
  {
    id: 'criminal_renew_6',
    name: '刑事律师续费（6个月）',
    price: 320000, // 3200元
    priceDisplay: '3200',
    duration: '6个月',
    features: [
      '继续接收刑事类客户',
      '平台流量扶持',
      '专属认证标识',
    ],
    color: 'orange',
  },
  {
    id: 'criminal_renew_18',
    name: '刑事律师续费（18个月）',
    price: 800000, // 8000元
    priceDisplay: '8000',
    duration: '18个月',
    features: [
      '继续接收刑事类客户',
      '平台流量扶持',
      '专属认证标识',
      '额外赠送1个月',
    ],
    color: 'orange',
    recommended: true,
  },
];

export default function LawyerRenewPage() {
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);

  // 检查登录
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userInfo = localStorage.getItem('user_info');
    if (!token && !userInfo) {
      window.dispatchEvent(new CustomEvent('open-login-modal'));
    }
  }, []);

  const handleRenew = async () => {
    if (!selectedPackage) return;

    const pkg = renewalPackages.find(p => p.id === selectedPackage);
    if (!pkg) return;

    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      
      const response = await fetch('/api/lawyer/renew', {
        method: 'POST',
        headers,
        body: JSON.stringify({ package_id: pkg.id }),
      });
      
      const result = await response.json();
      
      if (result.success && result.data?.code_url) {
        // 打开支付二维码
        window.open(result.data.code_url, '_blank');
      } else {
        alert(result.error || '续费失败，请稍后重试');
      }
    } catch (error) {
      console.error('续费失败:', error);
      alert('续费失败，请稍后重试');
    }
  };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #FEF3E2 0%, #FFF7ED 50%, #FEF3E2 100%)' }}>
      {/* 顶部导航栏 */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-orange-100/50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link 
              href="/lawyer"
              className="flex items-center gap-1.5 text-orange-600 hover:text-orange-700 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-medium">返回</span>
            </Link>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-orange-600" />
              <span className="text-base font-semibold text-orange-600">续费会员</span>
            </div>
            <div className="w-16" />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* 说明 */}
        <Card className="mb-6 border-orange-200 bg-orange-50/50">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-orange-800">续费说明</p>
                <ul className="text-sm text-orange-700 mt-2 space-y-1">
                  <li>• 续费后会员有效期将在当前到期日基础上顺延</li>
                  <li>• 续费金额按所选套餐时长计算</li>
                  <li>• 会员到期后未续费将自动降级，但仍可查看历史数据</li>
                  <li>• 如有问题请联系客服</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 套餐选择 */}
        <h3 className="text-lg font-bold text-gray-900 mb-4">选择续费套餐</h3>
        
        <div className="grid gap-4">
          {renewalPackages.map((pkg) => (
            <Card 
              key={pkg.id}
              className={`cursor-pointer transition-all ${
                selectedPackage === pkg.id 
                  ? 'border-orange-500 ring-2 ring-orange-200' 
                  : 'hover:border-orange-200'
              }`}
              onClick={() => setSelectedPackage(pkg.id)}
            >
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                      selectedPackage === pkg.id 
                        ? 'border-orange-500 bg-orange-500' 
                        : 'border-gray-300'
                    }`}>
                      {selectedPackage === pkg.id && (
                        <CheckCircle className="w-3 h-3 text-white" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-gray-900">{pkg.name}</h4>
                        {pkg.recommended && (
                          <span className="px-2 py-0.5 bg-orange-100 text-orange-600 text-xs rounded-full">
                            推荐
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {pkg.duration}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {pkg.features.map((feature, index) => (
                          <span 
                            key={index}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-50 text-gray-600 text-xs rounded"
                          >
                            <CheckCircle className="w-3 h-3 text-green-500" />
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-orange-600">¥{pkg.priceDisplay}</p>
                    <p className="text-xs text-muted-foreground">元</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 支付按钮 */}
        <div className="mt-6">
          <Button
            onClick={handleRenew}
            disabled={!selectedPackage}
            className={`w-full py-6 text-lg font-bold ${
              selectedPackage
                ? 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700'
                : 'bg-gray-300 cursor-not-allowed'
            }`}
          >
            <CreditCard className="w-5 h-5 mr-2" />
            {selectedPackage 
              ? `立即支付 ¥${renewalPackages.find(p => p.id === selectedPackage)?.priceDisplay}` 
              : '请选择续费套餐'
            }
          </Button>
        </div>

        {/* 支付方式说明 */}
        <p className="text-center text-sm text-muted-foreground mt-4">
          点击支付后将打开微信支付二维码，请使用微信扫码支付
        </p>
      </div>
      <LawyerBottomNav />
    </div>
  );
}
