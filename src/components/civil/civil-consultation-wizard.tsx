'use client';

import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { CivilCaseTypeStep } from '../consult/civil-case-type-step';
import { CivilDescriptionStep } from '../consult/civil-description-step';
import { CivilServiceStep } from '../consult/civil-service-step';
import { CivilPriceStep } from '../consult/civil-price-step';

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
    id: 'mediate', 
    name: '调解服务', 
    icon: '🤝',
    price: '待评估',
    description: '专业调解员主持调解，协助双方达成和解',
    isConsult: false,
    badge: '可选',
  },
  { 
    id: 'draft', 
    name: '起草文书', 
    icon: '📄',
    price: '待评估',
    description: '律师代为起草合同、协议、诉状等法律文书',
    isConsult: false,
    badge: '可选',
  },
  { 
    id: 'litigate', 
    name: '代理诉讼', 
    icon: '⚖️',
    price: '待评估',
    description: '代理出庭诉讼服务',
    isConsult: false,
    badge: '可选',
  },
];

interface CivilConsultationWizardProps {
  onBack?: () => void;
}

export function CivilConsultationWizard({ onBack }: CivilConsultationWizardProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    caseType: '',
    description: '',
    services: [] as string[],
  });

  const handleBack = () => {
    if (step === 1 && onBack) {
      onBack();
    } else {
      setStep(step - 1);
    }
  };

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
            onChange={(value) => setFormData({ ...formData, description: value })}
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
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 50%, #F8FAFC 100%)' }}>
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-blue-100/50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Back Button */}
            <button
              onClick={handleBack}
              className="flex items-center gap-1.5 sm:gap-2 text-blue-600 hover:text-blue-700 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="text-sm sm:text-base font-medium hidden sm:inline">返回</span>
            </button>
            
            {/* Logo */}
            <div className="flex items-center gap-2">
              <span className="text-sm sm:text-base font-semibold text-blue-600">民事咨询</span>
            </div>
            
            {/* Placeholder */}
            <div className="w-16 sm:w-24" />
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white/50 border-b border-blue-100/50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex-1 flex items-center">
                <div className={`
                  flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-full text-xs sm:text-sm font-medium transition-all duration-300
                  ${step >= s 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-blue-100 text-blue-400'
                  }
                `}>
                  {s}
                </div>
                {s < 4 && (
                  <div className={`
                    flex-1 h-0.5 mx-2 transition-all duration-300
                    ${step > s ? 'bg-blue-500' : 'bg-blue-100'}
                  `} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 sm:py-8 md:py-12">
        <div className="max-w-2xl mx-auto">
          {/* Card Container */}
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl border border-blue-100/50 p-4 sm:p-6 md:p-8">
            {renderStep()}
          </div>
        </div>
      </div>
    </div>
  );
}
