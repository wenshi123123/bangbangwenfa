'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { services } from './consultation-wizard';
import { caseTypes } from './case-type-step';
import { apiRequest } from '@/lib/api/request';

interface PriceStepProps {
  formData: {
    caseType: string;
    description: string;
    services: string[];
  };
  inviteCode?: string | null;
  onBack: () => void;
}

interface PricePlan {
  id: string;
  name: string;
  price: number;
  features: string[];
}

// 默认价格（API 加载失败时使用）
const defaultPlans: PricePlan[] = [
  { id: 'basic', name: '基础咨询', price: 99, features: ['快速了解案件性质', '法律风险初步判断', '24小时内回复'] },
  { id: 'standard', name: '标准方案', price: 249, features: ['深度案件分析', '个性化应对策略', '12小时优先回复', '可追加提问1次'] },
  { id: 'advanced', name: '深度服务', price: 379, features: ['一对一深度咨询', '完整分析报告', '可执行行动方案', '3次追加提问'] },
];

export function PriceStep({ formData, inviteCode, onBack }: PriceStepProps) {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<string>('standard');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [plans, setPlans] = useState<PricePlan[]>(defaultPlans);
  const [loading, setLoading] = useState(true);

  // 从 API 加载价格配置
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const response = await apiRequest('/api/price', { skipAuth: true });
        const result = await response.json();
        
        if (result.success && result.data) {
          // 转换数据库数据为前端格式
          const category = formData.caseType === 'civil' ? 'civil' : 'criminal';
          const categoryPlans = result.data.filter(
            (p: { category: string; plan_id: string; plan_name: string; price: number }) => 
              p.category === category
          );
          
          if (categoryPlans.length > 0) {
            const mappedPlans: PricePlan[] = categoryPlans.map((p: { plan_id: string; plan_name: string; price: number }) => {
              const defaultPlan = defaultPlans.find(dp => dp.id === p.plan_id);
              return {
                id: p.plan_id,
                name: p.plan_name,
                price: p.price / 100, // 转换分为元
                features: defaultPlan?.features || [],
              };
            });
            setPlans(mappedPlans);
          }
        }
      } catch (error) {
        console.error('Failed to fetch prices:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPrices();
  }, [formData.caseType]);

  const hasConsult = formData.services.includes('consult');
  const hasDelegate = formData.services.some(id => ['meet', 'court', 'full'].includes(id));
  const selectedCaseType = caseTypes.find(t => t.id === formData.caseType);
  const selectedServices = formData.services.map(id => services.find(s => s.id === id)?.name).filter(Boolean);
  const currentPlan = plans.find(p => p.id === selectedPlan);
  
  // 计算价格（分）
  const getPriceInCents = () => {
    if (!currentPlan) return 0;
    return currentPlan.price * 100;
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      // 再次获取最新价格
      let priceInCents = getPriceInCents();
      
      // 如果有咨询服务，使用选择的套餐价格
      if (hasConsult && currentPlan) {
        // 从 API 获取最新价格
        try {
          const response = await apiRequest('/api/price', { skipAuth: true });
          const result = await response.json();
          if (result.success && result.data) {
            const category = formData.caseType === 'civil' ? 'civil' : 'criminal';
            const planData = result.data.find(
              (p: { category: string; plan_id: string }) => 
                p.category === category && p.plan_id === currentPlan.id
            );
            if (planData) {
              priceInCents = planData.price;
            }
          }
        } catch {
          // 使用当前价格
        }
      }
      
      const response = await apiRequest('/api/consult/create', {
        method: 'POST',
        body: JSON.stringify({
          category: formData.caseType === 'civil' ? 'civil' : 'criminal',
          caseType: formData.caseType,
          caseDescription: formData.description,
          serviceType: formData.services,
          servicePrice: priceInCents,
          paymentStatus: 'pending',
          inviteCode: inviteCode || null, // 传递邀请码用于守护者分佣
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        router.push(`/pay?orderId=${result.data.orderId}`);
      } else {
        alert(result.error || '提交失败，请重试');
      }
    } catch (error) {
      console.error('Submit error:', error);
      alert('提交失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="text-center mb-4 sm:mb-6 md:mb-8">
        <div className="inline-flex items-center gap-2 px-2.5 sm:px-3 sm:px-4 py-1 sm:py-1.5 sm:py-2 rounded-full bg-orange-50 border border-orange-100 mb-2 sm:mb-3 md:mb-4">
          <span className="text-[10px] sm:text-xs md:text-sm font-medium text-orange-700">Step 4 / 4</span>
        </div>
        <h2 className="text-lg sm:text-xl md:text-3xl font-bold text-foreground mb-1 sm:mb-2">
          确认并支付
        </h2>
        <p className="text-xs sm:text-sm md:text-base text-muted-foreground px-2">
          选择咨询档位，完成支付
        </p>
      </div>

      {/* Order Summary */}
      <div className="bg-gradient-to-r from-orange-50 to-orange-100/30 rounded-lg sm:rounded-xl md:rounded-2xl p-3 sm:p-4 md:p-5 mb-3 sm:mb-4 md:mb-6 border border-orange-100">
        <h3 className="font-semibold text-foreground mb-2 sm:mb-3 md:mb-4 flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm md:text-base">
          <svg className="w-3.5 h-3.5 sm:w-4 sm:w-5 md:w-5 sm:h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
          <div className="h-px bg-orange-200 my-1 sm:my-1.5 md:my-2" />
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">咨询描述</span>
            <span className="text-foreground text-xs max-w-[40%] sm:max-w-[120px] md:max-w-[200px] text-right line-clamp-1 sm:line-clamp-2">
              {formData.description.slice(0, 20)}...
            </span>
          </div>
        </div>
      </div>

      {/* Delegate Notice */}
      {hasDelegate && (
        <div className="bg-blue-50 rounded-lg sm:rounded-xl md:rounded-2xl p-2.5 sm:p-3 sm:p-4 mb-3 sm:mb-4 md:mb-6 border border-blue-100">
          <div className="flex items-start gap-2 sm:gap-3">
            <div className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 bg-blue-500 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-blue-800 text-xs sm:text-sm md:text-base mb-0.5">委托服务说明</p>
              <p className="text-[10px] sm:text-xs md:text-sm text-blue-700">
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
          {loading ? (
            <div className="space-y-2 sm:space-y-3 mb-3 sm:mb-4 md:mb-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="w-full p-2.5 sm:p-3 md:p-4 rounded-lg sm:rounded-xl md:rounded-2xl border-2 border-border bg-card animate-pulse">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 rounded-full border-2 border-gray-300" />
                      <div>
                        <div className="h-4 w-20 bg-gray-200 rounded" />
                        <div className="h-3 w-32 bg-gray-200 rounded mt-1 hidden md:block" />
                      </div>
                    </div>
                    <div className="h-6 w-16 bg-gray-200 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2 sm:space-y-3 mb-3 sm:mb-4 md:mb-6">
              {plans.map((plan) => {
                const isSelected = selectedPlan === plan.id;
                const isRecommended = plan.id === 'standard';
                
                return (
                  <button
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan.id)}
                    className={`
                      w-full p-2.5 sm:p-3 md:p-4 rounded-lg sm:rounded-xl md:rounded-2xl border-2 transition-all duration-300 text-left relative
                      ${isSelected 
                        ? 'border-orange-400 bg-orange-50 shadow-lg shadow-orange-100' 
                        : 'border-border bg-card hover:border-orange-200'
                      }
                    `}
                  >
                    {isRecommended && (
                      <div className="absolute -top-2 sm:-top-2.5 md:-top-3 left-2 sm:left-3 md:left-4 px-1.5 sm:px-2 md:px-3 py-0.5 sm:py-1 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-[10px] sm:text-xs md:text-sm font-medium rounded-full">
                        推荐
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className={`
                          w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 rounded-full border-2 flex items-center justify-center
                          ${isSelected 
                            ? 'border-orange-500 bg-orange-500' 
                            : 'border-gray-300'
                          }
                        `}>
                          {isSelected && (
                            <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 md:w-2 md:h-2 bg-white rounded-full" />
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground text-xs sm:text-sm md:text-base flex items-center gap-1.5">
                            {plan.name}
                          </div>
                          <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 hidden md:block">
                            {plan.features.slice(0, 2).join(' · ')}
                          </div>
                        </div>
                      </div>
                      <div className="text-orange-600 text-base sm:text-lg md:text-xl font-bold">
                        ¥{plan.price}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Price Total */}
      <div className="bg-card rounded-lg sm:rounded-xl md:rounded-2xl p-3 sm:p-4 md:p-5 mb-3 sm:mb-4 md:mb-6 border border-border">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-xs sm:text-sm md:text-base">应付金额</span>
          <div className="text-right">
            <span className="text-xl sm:text-2xl md:text-3xl font-bold text-gradient">
              ¥{currentPlan?.price || 0}
            </span>
          </div>
        </div>
        {hasDelegate && (
          <p className="text-[10px] sm:text-xs text-blue-600 mt-1 sm:mt-2 flex items-center gap-1">
            <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            含咨询服务费，委托服务费另议
          </p>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex gap-2 sm:gap-3">
        <button
          onClick={onBack}
          disabled={isSubmitting}
          className="flex-1 py-2.5 sm:py-3 md:py-4 rounded-lg sm:rounded-xl md:rounded-2xl font-semibold text-xs sm:text-sm md:text-base border-2 border-border bg-card hover:bg-muted transition-all duration-300 disabled:opacity-50"
        >
          上一步
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className={`
            flex-[2] py-2.5 sm:py-3 md:py-4 rounded-lg sm:rounded-xl md:rounded-2xl font-semibold text-xs sm:text-sm md:text-base transition-all duration-300
            ${isSubmitting 
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
              : 'bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 shadow-lg shadow-orange-200'
            }
          `}
        >
          {isSubmitting ? '提交中...' : '立即支付'}
        </button>
      </div>

      {/* Security Notice */}
      <p className="text-center text-[10px] sm:text-xs md:text-sm text-muted-foreground mt-2 sm:mt-3 md:mt-4 flex items-center justify-center gap-1">
        <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        支付安全 · 隐私保护 · 律师保密义务
      </p>
    </div>
  );
}
