'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Lock, LogIn } from 'lucide-react';
import { CaseTypeStep } from './case-type-step';
import { DescriptionStep } from './description-step';
import { ServiceStep } from './service-step';
import { PriceStep } from './price-step';

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

// 所有服务类型数据
export const services: ServiceType[] = [
  { 
    id: 'consult', 
    name: '咨询服务', 
    icon: '💬',
    price: '必选',
    description: '律师在线解答您的法律问题，含基础/标准/深度三个档位',
    isConsult: true,
    badge: '必选',
  },
  { 
    id: 'meet', 
    name: '律师会见', 
    icon: '🤝',
    price: '待评估',
    description: '联系律师安排会见被羁押人员',
    isConsult: false,
    badge: '可选',
  },
  { 
    id: 'court', 
    name: '出庭辩护', 
    icon: '⚖️',
    price: '待评估',
    description: '代理出庭辩护服务',
    isConsult: false,
    badge: '可选',
  },
  { 
    id: 'full', 
    name: '全程代理', 
    icon: '🛡️',
    price: '待评估',
    description: '案件全程代理服务',
    isConsult: false,
    badge: '可选',
  },
];

interface ConsultationWizardProps {
  onBack?: () => void;
}

export function ConsultationWizard({ onBack }: ConsultationWizardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(1);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    caseType: '',
    description: '',
    services: [] as string[],
    contactPhone: '', // 第二步填写的手机号
  });

  // 检查登录状态和获取邀请码
  useEffect(() => {
    const checkLogin = () => {
      const savedUser = localStorage.getItem('user_info');
      const loggedIn = !!savedUser;
      setIsLoggedIn(loggedIn);
      setIsChecking(false);
    };
    
    // 从 URL 获取邀请码
    const code = searchParams.get('code');
    if (code) {
      setInviteCode(code);
      // 保存到 localStorage 以便后续使用
      localStorage.setItem('invite_code', code);
    } else {
      // 尝试从 localStorage 获取
      const savedCode = localStorage.getItem('invite_code');
      if (savedCode) setInviteCode(savedCode);
    }
    
    checkLogin();
    
    // 监听登录成功事件
    const handleLoginSuccess = () => {
      // 登录成功，重新检查并更新状态
      setTimeout(() => {
        checkLogin();
      }, 100);
    };
    window.addEventListener('user-logged-in', handleLoginSuccess);
    
    return () => {
      window.removeEventListener('user-logged-in', handleLoginSuccess);
    };
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
  if (!isChecking && !isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FAF7F2] to-white">
        <div className="max-w-lg mx-auto px-4 py-16">
          <div className="bg-white rounded-xl shadow-[0_4px_16px_rgba(61,50,45,0.08)] p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[#FAF7F2] flex items-center justify-center">
              <Lock className="w-8 h-8 text-[#C47353]" />
            </div>
            <h2 className="text-xl font-bold mb-3">需要登录</h2>
            <p className="text-muted-foreground mb-6">
              咨询前请先登录，以便律师能够联系到您
            </p>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('open-login-modal'))}
              className="w-full py-3 px-6 bg-gradient-to-r from-[#C47353] to-[#A85D40] text-white font-semibold rounded-xl hover:from-[#A85D40] hover:to-[#8B3E2A] transition-all"
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
  if (isChecking) {
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
          <CaseTypeStep
            selected={formData.caseType}
            onSelect={(id) => setFormData({ ...formData, caseType: id })}
            onNext={() => setStep(2)}
          />
        );
      case 2:
        return (
          <DescriptionStep
            value={formData.description}
            contactPhone={formData.contactPhone}
            onChange={(description) => setFormData({ ...formData, description })}
            onContactPhoneChange={(contactPhone) => setFormData({ ...formData, contactPhone })}
            onNext={() => setStep(3)}
            onBack={handleBack}
          />
        );
      case 3:
        return (
          <ServiceStep
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
          <PriceStep
            formData={formData}
            inviteCode={inviteCode}
            onBack={handleBack}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero py-8 md:py-12">
      <div className="container mx-auto px-4 max-w-2xl">
        {/* Back Button */}
        <button 
          onClick={handleBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8 group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          <span>{step === 1 ? '返回首页' : '上一步'}</span>
        </button>

        {/* Progress Bar */}
        <div className="bg-white/50 border-b border-[rgba(196,115,83,0.2)]/50 -mx-4 sm:mx-0">
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
        <div className="bg-card rounded-xl p-6 md:p-8 shadow-[0_8px_24px_rgba(196,115,83,0.06)] border border-border/50">
          {renderStep()}
        </div>
      </div>
    </div>
  );
}
