'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { services } from './civil-consultation-wizard';
import { caseTypes } from './civil-case-type-step';
import { apiRequest } from '@/lib/api/request';

interface PriceStepProps {
  formData: {
    caseType: string;
    description: string;
    services: string[];
    contactPhone?: string;
  };
  onBack: () => void;
}

interface PriceConfig {
  plan_id: string;
  plan_name: string;
  price: number;
}

// 只显示这三个咨询套餐
const CONSULT_PLANS = ['basic', 'standard', 'advanced'];

// 默认价格（API 加载失败或返回空数据时使用）
const defaultPlans: PriceConfig[] = [
  { plan_id: 'basic', plan_name: '基础咨询', price: 6900 },
  { plan_id: 'standard', plan_name: '标准方案', price: 19900 },
  { plan_id: 'advanced', plan_name: '深度服务', price: 29900 },
];

export function CivilPriceStep({ formData, onBack }: PriceStepProps) {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<string>('standard');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [prices, setPrices] = useState<PriceConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // 从 API 读取价格配置
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const response = await apiRequest('/api/price?category=civil', { skipAuth: true });
        const result = await response.json();
        if (result.success && result.data && result.data.length > 0) {
          setPrices(result.data);
        } else {
          // API 返回空数据，使用默认价格
          setPrices(defaultPlans);
        }
      } catch (error) {
        console.error('Failed to fetch prices:', error);
        // API 请求失败，使用默认价格
        setPrices(defaultPlans);
      } finally {
        setLoading(false);
      }
    };
    fetchPrices();
  }, []);

  // 根据数据生成套餐列表 - 只显示 basic, standard, advanced
  const consultationPlans = prices
    .filter(p => CONSULT_PLANS.includes(p.plan_id))
    .map(p => ({
      id: p.plan_id,
      name: p.plan_name,
      price: p.price / 100, // 转换分为元
    }));

  const hasConsult = formData.services.includes('consult');
  const hasDelegate = formData.services.some(id => ['mediate', 'draft', 'litigate'].includes(id));
  const selectedCaseType = caseTypes.find(t => t.id === formData.caseType);
  const selectedServices = formData.services.map(id => services.find(s => s.id === id)?.name).filter(Boolean);
  const currentPlan = consultationPlans.find(p => p.id === selectedPlan);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      const response = await apiRequest('/api/consult/create', {
        method: 'POST',
        body: JSON.stringify({
          category: 'civil',
          caseType: formData.caseType,
          caseDescription: formData.description,
          contactPhone: formData.contactPhone || '',
          serviceType: formData.services,
          servicePrice: currentPlan?.price ? currentPlan.price * 100 : 0, // 转换为分
          paymentStatus: 'pending',
          openid: localStorage.getItem('oa_openid') || undefined,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        router.push(`/pay?orderId=${result.data.orderId}`);
      } else {
        setSubmitError(result.error || '提交失败，请重试');
      }
    } catch (error) {
      console.error('Submit error:', error);
      setSubmitError('提交失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 加载中状态
  if (loading) {
    return (
      <div className="animate-fade-in p-4">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-4 border-[#C47353] border-t-transparent rounded-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="text-center mb-4 sm:mb-6 md:mb-8">
        <div className="inline-flex items-center gap-2 px-2.5 sm:px-3 sm:px-4 py-1 sm:py-1.5 sm:py-2 rounded-full bg-[#FAF7F2] border border-[rgba(196,115,83,0.2)] mb-2 sm:mb-3 md:mb-4">
          <span className="text-xs sm:text-sm font-medium text-[#C47353]">Step 4 / 4</span>
        </div>
        <h2 className="text-lg sm:text-xl md:text-3xl font-bold text-foreground mb-1 sm:mb-2">
          确认并支付
        </h2>
        <p className="text-xs sm:text-sm md:text-base text-muted-foreground px-2">
          选择咨询档位，完成支付
        </p>
      </div>

      {/* Order Summary */}
      <div className="bg-gradient-to-r from-[#FAF7F2] to-[rgba(196,115,83,0.06)] rounded-lg sm:rounded-xl md:rounded-xl p-3 sm:p-4 md:p-5 mb-3 sm:mb-4 md:mb-6 border border-[rgba(196,115,83,0.2)]">
        <h3 className="font-semibold text-foreground mb-2 sm:mb-3 md:mb-4 flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm md:text-base">
          <svg className="w-3.5 h-3.5 sm:w-4 sm:w-5 md:w-5 sm:h-5 text-[#C47353]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          订单摘要
        </h3>
        
        <div className="space-y-1.5 sm:space-y-2 md:space-y-3 text-xs sm:text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">案件类型</span>
            <span className="font-medium text-foreground">
              {selectedCaseType?.icon} {selectedCaseType?.name}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">服务类型</span>
            <span className="font-medium text-foreground text-right max-w-[60%] sm:max-w-[180px] truncate">{selectedServices.join(' + ')}</span>
          </div>
          <div className="h-px bg-[#F5EDE5] my-1 sm:my-1.5 md:my-2" />
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">咨询描述</span>
            <span className="text-foreground text-xs max-w-[40%] sm:max-w-[120px] md:max-w-[200px] text-right line-clamp-1 sm:line-clamp-2">
              {formData.description.slice(0, 20)}...
            </span>
          </div>
        </div>
      </div>

      {submitError && (
        <div className="mb-3 sm:mb-4 md:mb-6 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
          {submitError}
        </div>
      )}

      {/* Delegate Notice */}
      {hasDelegate && (
        <div className="bg-[#FAF7F2] rounded-lg sm:rounded-xl md:rounded-xl p-2.5 sm:p-3 sm:p-4 mb-3 sm:mb-4 md:mb-6 border border-[rgba(196,115,83,0.2)]">
          <div className="flex items-start gap-2 sm:gap-3">
            <div className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 bg-[#C47353] rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-[#3D322D] text-xs sm:text-sm md:text-base mb-0.5">委托服务说明</p>
              <p className="text-xs sm:text-sm text-[#C47353]">
                您选择了委托服务，律师将在24小时内联系您确认委托费用。
                委托服务费用由您与律师单独协商。
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Consultation Plans */}
      {hasConsult && (
        <>
          <h3 className="font-semibold text-foreground mb-2 sm:mb-3 md:mb-4 text-xs sm:text-sm md:text-base">选择咨询档位</h3>
          <div className="space-y-2 sm:space-y-3 mb-3 sm:mb-4 md:mb-6">
            {consultationPlans.map((plan) => {
              const isSelected = selectedPlan === plan.id;
              const isRecommended = plan.id === 'standard';
              
              return (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`
                    w-full p-2.5 sm:p-3 md:p-4 rounded-lg sm:rounded-xl md:rounded-xl border-2 transition-all duration-300 text-left relative
                    ${isSelected 
                      ? 'border-[#C47353] bg-[#FAF7F2] shadow-[0_4px_16px_rgba(61,50,45,0.08)]' 
                      : 'border-border bg-card hover:border-[rgba(196,115,83,0.2)]'
                    }
                  `}
                >
                  {isRecommended && (
                    <div className="absolute -top-2 sm:-top-2.5 md:-top-3 left-2 sm:left-3 md:left-4 px-1.5 sm:px-2 md:px-3 py-0.5 sm:py-1 bg-gradient-to-r from-[#C47353] to-[#A85D40] text-white text-xs sm:text-sm font-medium rounded-full">
                      推荐
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className={`
                        w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 rounded-full border-2 flex items-center justify-center
                        ${isSelected 
                          ? 'border-[#C47353] bg-[#C47353]' 
                          : 'border-gray-300'
                        }
                      `}>
                        {isSelected && (
                          <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 md:w-2 md:h-2 bg-white rounded-full" />
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-foreground text-xs sm:text-sm md:text-base">{plan.name}</div>
                      </div>
                    </div>
                    <div className="text-base sm:text-lg md:text-xl font-bold text-[#C47353]">
                      ¥{plan.price}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Total Amount */}
      <div className="bg-[#FAF7F2] rounded-lg sm:rounded-xl md:rounded-xl p-3 sm:p-4 md:p-5 mb-4 sm:mb-6 md:mb-8 border border-[rgba(196,115,83,0.2)]">
        <div className="flex items-center justify-between">
          <span className="text-sm sm:text-base md:text-lg text-muted-foreground">应付金额</span>
          <span className="text-xl sm:text-2xl md:text-3xl font-bold text-[#C47353]">
            ¥{currentPlan?.price || 0}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 sm:gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-2.5 sm:py-3 md:py-4 px-4 sm:px-6 rounded-lg sm:rounded-xl border-2 border-border bg-card text-foreground font-semibold text-xs sm:text-sm md:text-base hover:bg-muted transition-colors"
        >
          返回修改
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="flex-1 py-2.5 sm:py-3 md:py-4 px-4 sm:px-6 rounded-lg sm:rounded-xl bg-gradient-to-r from-[#C47353] to-[#A85D40] text-white font-semibold text-xs sm:text-sm md:text-base hover:from-[#A85D40] hover:to-[#8B3E2A] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_16px_rgba(61,50,45,0.08)]"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              提交中...
            </span>
          ) : '确认并提交'}
        </button>
      </div>
    </div>
  );
}
