'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Lock, LogIn } from 'lucide-react';
import { CaseTypeStep } from './case-type-step';
import { DescriptionStep } from './description-step';
import { ServiceStep } from './service-step';
import { PriceStep } from './price-step';
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

// 所有服务类型数据
export const services: ServiceType[] = [
  { 
    id: 'consult', 
    name: '咨询服务', 
    icon: '💬',
    price: '必选',
    description: '面对刑事风险，律师比ai更能看清前路，含基础/标准/深度三个档位',
    isConsult: true,
    badge: '必选',
  },
  { 
    id: 'meet', 
    name: '律师会见', 
    icon: '🤝',
    price: '待评估',
    description: '隔着高墙，把家人的牵挂与法律帮助带给他',
    isConsult: false,
    badge: '可选',
  },
  { 
    id: 'court', 
    name: '出庭辩护', 
    icon: '⚖️',
    price: '待评估',
    description: '法庭之上，为当事人争取最轻的处理结果',
    isConsult: false,
    badge: '可选',
  },
  { 
    id: 'full', 
    name: '全程代理', 
    icon: '🛡️',
    price: '待评估',
    description: '从侦查到判决，全流程替你扛下刑事案件所有压力',
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
  const { isLoggedIn, isLoading } = useAuth();
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    caseType: '',
    description: '',
    services: [] as string[],
  });
  const [validationErrors, setValidationErrors] = useState({ caseType: false, description: false, services: false });
  const [activeStep, setActiveStep] = useState(1);

  // 获取邀请码
  useEffect(() => {
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
    
  }, [searchParams]);

  const scrollToStep = (stepNumber: number) => {
    document.getElementById(`consult-step-${stepNumber}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveStep(stepNumber);
  };

  const handleBack = () => {
    if (onBack) onBack();
    else router.push('/');
  };

  const validateBeforeSubmit = () => {
    const nextErrors = {
      caseType: !formData.caseType,
      description: !formData.description.trim(),
      services: !formData.services.includes('consult'),
    };
    setValidationErrors(nextErrors);
    const firstInvalidStep = nextErrors.caseType ? 1 : nextErrors.description ? 2 : nextErrors.services ? 3 : null;
    if (firstInvalidStep) {
      window.requestAnimationFrame(() => {
        const summary = document.getElementById('consult-error-summary');
        summary?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        summary?.focus({ preventScroll: true });
      });
      return false;
    }
    return true;
  };

  useEffect(() => {
    const updateActiveStep = () => {
      const sections = [1, 2, 3, 4].map((stepNumber) => ({
        stepNumber,
        top: document.getElementById(`consult-step-${stepNumber}`)?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY,
      }));
      const current = sections.filter((section) => section.top <= 190).at(-1);
      if (current) setActiveStep(current.stepNumber);
    };
    window.addEventListener('scroll', updateActiveStep, { passive: true });
    updateActiveStep();
    return () => window.removeEventListener('scroll', updateActiveStep);
  }, []);

  // 未登录提示
  if (!isLoading && !isLoggedIn) {
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
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FAF7F2] to-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[rgba(196,115,83,0.2)] border-t-[#C47353] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-[rgba(196,115,83,0.15)]">
        <div className="container mx-auto max-w-3xl px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <button onClick={handleBack} className="flex items-center gap-2 text-[#C47353] hover:text-[#A85D40] transition-colors">
              <ArrowLeft className="h-4 w-4" />
              <span className="font-medium">返回</span>
            </button>
            <span className="text-sm font-medium text-[#3D322D]">刑事咨询 · 共 4 项</span>
          </div>
          <nav aria-label="咨询流程步骤" className="grid grid-cols-4 gap-2 mt-3">
            {[
              { id: 1, label: '案件类型', complete: Boolean(formData.caseType) },
              { id: 2, label: '案情描述', complete: Boolean(formData.description.trim()) },
              { id: 3, label: '服务选择', complete: formData.services.includes('consult') },
              { id: 4, label: '确认支付', complete: false },
            ].map((item) => (
              <button key={item.id} type="button" onClick={() => scrollToStep(item.id)} aria-current={activeStep === item.id ? 'step' : undefined}
                className={`min-w-0 text-left text-[10px] sm:text-xs transition-colors ${activeStep === item.id ? 'text-[#A85D40] font-semibold' : item.complete ? 'text-[#6E9A7C]' : 'text-[#8C7B6E]'}`}>
                <span className={`mb-1 block h-1.5 rounded-full ${item.complete ? 'bg-[#6E9A7C]' : activeStep === item.id ? 'bg-[#C47353]' : 'bg-[#F2E8E0]'}`} />
                <span className="block truncate">{item.complete ? '✓ ' : `${item.id}. `}{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      <main className="container mx-auto max-w-3xl px-4 py-5 sm:py-8 pb-12">
        <header className="text-center mb-5 sm:mb-7">
          <p className="text-xs font-semibold tracking-[0.16em] text-[#C47353]">CRIMINAL CONSULTATION</p>
          <h1 className="mt-2 text-2xl sm:text-3xl font-serif text-[#3D322D]">把情况说清楚，下一步更明确</h1>
          <p className="mt-2 text-sm text-[#8C7B6E]">按顺序完成 4 项信息，可随时回到上方修改</p>
        </header>
        {(validationErrors.caseType || validationErrors.description || validationErrors.services) && (
          <section id="consult-error-summary" tabIndex={-1} role="alert" aria-live="assertive" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 focus:outline-none focus:ring-2 focus:ring-red-300">
            <h2 className="font-semibold">请先完成以下必填信息</h2>
            <ul className="mt-1 list-inside list-disc">
              {validationErrors.caseType && <li><button type="button" className="underline underline-offset-2" onClick={() => scrollToStep(1)}>选择案件类型</button></li>}
              {validationErrors.description && <li><button type="button" className="underline underline-offset-2" onClick={() => scrollToStep(2)}>填写案情描述</button></li>}
              {validationErrors.services && <li><button type="button" className="underline underline-offset-2" onClick={() => scrollToStep(3)}>选择必选咨询服务</button></li>}
            </ul>
          </section>
        )}
        <div className="space-y-4 sm:space-y-5">
          <section id="consult-step-1" className="scroll-mt-32 rounded-2xl border border-[rgba(196,115,83,0.15)] bg-white p-4 sm:p-6 md:p-8 shadow-[0_8px_24px_rgba(196,115,83,0.06)]">
            <CaseTypeStep embedded selected={formData.caseType} showError={validationErrors.caseType && !formData.caseType}
              onSelect={(id) => { setFormData({ ...formData, caseType: id }); setValidationErrors({ ...validationErrors, caseType: false }); }} onNext={() => scrollToStep(2)} />
          </section>
          <section id="consult-step-2" className="scroll-mt-32 rounded-2xl border border-[rgba(196,115,83,0.15)] bg-white p-4 sm:p-6 md:p-8 shadow-[0_8px_24px_rgba(196,115,83,0.06)]">
            <DescriptionStep embedded value={formData.description} showError={validationErrors.description && !formData.description.trim()}
              onChange={(description) => { setFormData({ ...formData, description }); if (description.trim()) setValidationErrors({ ...validationErrors, description: false }); }}
              onNext={() => scrollToStep(3)} onBack={() => scrollToStep(1)} />
          </section>
          <section id="consult-step-3" className="scroll-mt-32 rounded-2xl border border-[rgba(196,115,83,0.15)] bg-white p-4 sm:p-6 md:p-8 shadow-[0_8px_24px_rgba(196,115,83,0.06)]">
            <ServiceStep embedded selected={formData.services} showError={validationErrors.services && !formData.services.includes('consult')}
              onToggle={(id) => { const services = formData.services.includes(id) ? formData.services.filter((service) => service !== id) : [...formData.services, id]; setFormData({ ...formData, services }); if (services.includes('consult')) setValidationErrors({ ...validationErrors, services: false }); }}
              onNext={() => scrollToStep(4)} onBack={() => scrollToStep(2)} />
          </section>
          <section id="consult-step-4" className="scroll-mt-32 rounded-2xl border border-[rgba(196,115,83,0.15)] bg-white p-4 sm:p-6 md:p-8 shadow-[0_8px_24px_rgba(196,115,83,0.06)]">
            <PriceStep embedded formData={formData} inviteCode={inviteCode} onBack={() => scrollToStep(3)} canSubmit={validateBeforeSubmit} />
          </section>
        </div>
      </main>
    </div>
  );
}
