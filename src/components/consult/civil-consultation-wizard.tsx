'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Lock, LogIn } from 'lucide-react';
import { CivilCaseTypeStep } from './civil-case-type-step';
import { CivilDescriptionStep } from './civil-description-step';
import { CivilServiceStep } from './civil-service-step';
import { CivilPriceStep } from './civil-price-step';
import { apiRequest } from '@/lib/api/request';
import { useAuth } from '@/hooks/use-auth';

export interface CaseType {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export interface ServiceType {
  id: string;
  name: string;
  icon: string;
  price: string;
  description: string;
  isConsult: boolean;
  badge?: string;
}

// 价格配置接口
interface PriceConfig {
  plan_id: string;
  plan_name: string;
  price: number;
}

// 导出 services 数据供其他组件使用
export const services: ServiceType[] = [
  { id: 'consult', name: '咨询类', icon: '💬', price: '待评估', description: '在线咨询解答', isConsult: true },
  { id: 'mediate', name: '委托调解', icon: '🤝', price: '待评估', description: '律师代理调解', isConsult: false },
  { id: 'draft', name: '诉状起草', icon: '📝', price: '待评估', description: '法律文书撰写', isConsult: false },
  { id: 'litigate', name: '诉讼代理', icon: '⚖️', price: '待评估', description: '全程诉讼指导', isConsult: false },
];

interface CivilConsultationWizardProps {
  onBack?: () => void;
}

export function CivilConsultationWizard({ onBack }: CivilConsultationWizardProps) {
  const router = useRouter();
  const { isLoggedIn, isLoading } = useAuth();
  const [authLoadTimedOut, setAuthLoadTimedOut] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    caseType: '',
    description: '',
    services: [] as string[],
    contactPhone: '',
  });
  const [priceConfigs, setPriceConfigs] = useState<PriceConfig[]>([]);
  const [pricesLoading, setPricesLoading] = useState(true);

  useEffect(() => {
    if (!isLoading) {
      setAuthLoadTimedOut(false);
      return;
    }
    const timer = window.setTimeout(() => setAuthLoadTimedOut(true), 8000);
    return () => window.clearTimeout(timer);
  }, [isLoading]);

  // 获取价格配置
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const response = await apiRequest('/api/price?category=civil', { skipAuth: true });
        const result = await response.json();
        if (result.success) {
          setPriceConfigs(result.data);
        }
      } catch (error) {
        console.error('Failed to fetch price configs:', error);
      } finally {
        setPricesLoading(false);
      }
    };
    fetchPrices();
  }, []);

  const handleBack = () => {
    if (step === 1) {
      if (onBack) {
        onBack();
      } else {
        router.push('/');
      }
    } else {
      setStep(step - 1);
    }
  };

  // 未登录提示
  if ((!isLoading || authLoadTimedOut) && !isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FAF7F2] to-white">
        <div className="max-w-lg mx-auto px-4 py-16">
          <div className="bg-white rounded-xl shadow-[0_4px_16px_rgba(61,50,45,0.08)] p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[#FAF7F2] flex items-center justify-center">
              <Lock className="w-8 h-8 text-[#C47353]" />
            </div>
            <h2 className="text-xl font-bold mb-3">{authLoadTimedOut ? '登录状态加载超时' : '需要登录'}</h2>
            <p className="text-muted-foreground mb-6">
              咨询前请先登录，以便律师能够联系到您
            </p>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('open-login-modal'))}
              className="w-full py-3 px-6 bg-gradient-to-r from-[#C47353] to-pink-500 text-white font-semibold rounded-xl hover:from-[#A85D40] hover:to-pink-600 transition-all"
            >
              <LogIn className="w-4 h-4 inline mr-2" />
              手机号登录
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 加载中
  if (isLoading && !authLoadTimedOut) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FAF7F2] to-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[rgba(196,115,83,0.2)] border-t-[#C47353] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <CivilCaseTypeStep
            selected={formData.caseType}
            onSelect={(id) => setFormData({ ...formData, caseType: id })}
            onNext={() => setStep(2)}
          />
        );
      case 2:
        return (
          <CivilDescriptionStep
            value={formData.description}
            contactPhone={formData.contactPhone}
            onChange={(value) => setFormData({ ...formData, description: value })}
            onContactPhoneChange={(contactPhone) => setFormData({ ...formData, contactPhone })}
            onNext={() => setStep(3)}
            onBack={handleBack}
          />
        );
      case 3:
        return (
          <CivilServiceStep
            selected={formData.services}
            onToggle={(id) => {
              const newServices = formData.services.includes(id)
                ? formData.services.filter(s => s !== id)
                : [...formData.services, id];
              setFormData({ ...formData, services: newServices });
            }}
            onNext={() => setStep(4)}
            onBack={handleBack}
          />
        );
      case 4:
        return (
          <CivilPriceStep
            formData={formData}
            onBack={handleBack}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-[rgba(196,115,83,0.15)]">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-[#C47353] hover:text-[#A85D40] transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">返回</span>
            </button>
            <div className="text-sm text-muted-foreground">
              民事案件咨询 · 第 {step} 步 / 共 4 步
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white/50 border-b border-[rgba(196,115,83,0.15)]">
        <div className="container mx-auto px-4 py-3">
          <div className="flex gap-1">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  s <= step ? 'bg-[#C47353]' : 'bg-[#FAF7F2]'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="container mx-auto px-4 py-8">
        {renderStep()}
      </div>
    </div>
  );
}
