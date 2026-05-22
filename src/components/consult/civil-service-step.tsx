'use client';

// ============================================
// 预览模式开关 - 正常流程需要设为 false
// ============================================
const PREVIEW_MODE = false;

import { ServiceType } from './civil-consultation-wizard';

interface ServiceStepProps {
  selected: string[];
  onToggle: (id: string) => void;
  onNext: () => void;
  onBack: () => void;
}

const consultServices: ServiceType[] = [
  { 
    id: 'consult', 
    name: '咨询服务', 
    icon: '💬',
    price: '必选',
    description: '律师在线解答您的法律问题，含基础/标准/深度三个档位',
    isConsult: true,
    badge: '必选',
  },
];

const delegateServices: ServiceType[] = [
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

export function CivilServiceStep({ selected, onToggle, onNext, onBack }: ServiceStepProps) {
  const hasConsult = selected.includes('consult');
  const hasDelegate = selected.some(id => ['mediate', 'draft', 'litigate'].includes(id));

  const renderServiceCard = (service: ServiceType) => {
    const isSelected = selected.includes(service.id);
    const isRequired = service.isConsult;
    
    return (
      <button
        key={service.id}
        onClick={() => {
          if (isRequired && isSelected) return;
          onToggle(service.id);
        }}
        className={`
          w-full p-2.5 sm:p-3 md:p-4 rounded-lg sm:rounded-xl md:rounded-2xl border-2 transition-all duration-300 text-left
          ${isSelected 
            ? 'border-blue-400 bg-blue-50 shadow-lg shadow-blue-100' 
            : 'border-border bg-card hover:border-blue-200 hover:bg-blue-50/30'
          }
          ${isRequired ? 'cursor-default' : ''}
        `}
      >
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Checkbox */}
          <div className={`
            w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 rounded-lg sm:rounded-xl border-2 flex items-center justify-center transition-all duration-300 flex-shrink-0
            ${isSelected 
              ? 'bg-blue-500 border-blue-500' 
              : isRequired
                ? 'bg-blue-100 border-blue-300'
                : 'border-gray-300 bg-white'
            }
          `}>
            {isSelected && (
              <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {isRequired && !isSelected && (
              <span className="text-blue-500 text-[10px] sm:text-xs md:text-sm font-bold">必</span>
            )}
          </div>

          {/* Icon */}
          <div className={`
            w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-lg sm:rounded-xl md:rounded-2xl flex items-center justify-center text-lg sm:text-xl md:text-2xl flex-shrink-0
            ${isSelected 
              ? 'bg-gradient-to-br from-blue-400 to-blue-500' 
              : 'bg-gray-100'
            }
          `}>
            {service.icon}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1 flex-wrap">
              <span className="font-semibold text-foreground text-xs sm:text-sm md:text-base">{service.name}</span>
              <span className={`
                px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded-full text-[10px] sm:text-xs font-medium
                ${service.isConsult 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'bg-green-100 text-green-700'
                }
              `}>
                {service.price}
              </span>
            </div>
            <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground line-clamp-1 sm:line-clamp-2">{service.description}</p>
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="text-center mb-4 sm:mb-6 md:mb-8">
        <div className="inline-flex items-center gap-2 px-2.5 sm:px-3 sm:px-4 py-1 sm:py-1.5 sm:py-2 rounded-full bg-blue-50 border border-blue-100 mb-2 sm:mb-3 md:mb-4">
          <span className="text-[10px] sm:text-xs md:text-sm font-medium text-blue-700">Step 3 / 4</span>
        </div>
        <h2 className="text-lg sm:text-xl md:text-3xl font-bold text-foreground mb-1 sm:mb-2">
          选择服务类型
        </h2>
      </div>

      {/* 委托服务（可选，可多选） */}
      <div className="mb-3 sm:mb-4">
        <div className="flex items-center gap-2 mb-2 sm:mb-3">
          <span className="text-xs sm:text-sm md:text-base font-semibold text-green-700">委托服务（可选）</span>
          <span className="text-[10px] sm:text-xs text-muted-foreground">可多选</span>
        </div>
        <div className="space-y-2 sm:space-y-3">
          {delegateServices.map((service) => renderServiceCard(service))}
        </div>
      </div>

      {/* 分隔线 */}
      <div className="relative my-4 sm:my-6 md:my-8">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-dashed border-border"></div>
        </div>
        <div className="relative flex justify-center">
          <span className="px-3 sm:px-4 bg-background text-[10px] sm:text-xs md:text-sm text-muted-foreground">以下为基础服务</span>
        </div>
      </div>

      {/* 咨询服务（必选） */}
      <div className="mb-3 sm:mb-4 md:mb-6">
        <div className="flex items-center gap-2 mb-2 sm:mb-3">
          <span className="text-xs sm:text-sm md:text-base font-semibold text-blue-700">咨询服务（必选）</span>
          <span className="text-[10px] sm:text-xs text-muted-foreground">请选择一项</span>
        </div>
        <div className="space-y-2 sm:space-y-3">
          {consultServices.map((service) => renderServiceCard(service))}
        </div>
      </div>

      {/* Notice */}
      {hasDelegate && (
        <div className="bg-blue-50 rounded-lg sm:rounded-xl md:rounded-2xl p-2.5 sm:p-3 sm:p-4 mb-3 sm:mb-4 md:mb-6 border border-blue-100">
          <div className="flex items-start gap-2 sm:gap-3">
            <div className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 bg-blue-500 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-blue-800 text-xs sm:text-sm md:text-base mb-0.5">委托服务说明</p>
              <p className="text-[10px] sm:text-xs md:text-sm text-blue-700">
                选择委托服务后，律师将在24小时内联系您确认具体费用。
                委托服务费用由您与律师单独协商。
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Selected Summary */}
      {selected.length > 0 && (
        <div className="bg-blue-50 rounded-lg sm:rounded-xl md:rounded-2xl p-2.5 sm:p-3 sm:p-4 mb-3 sm:mb-4 md:mb-6 border border-blue-100">
          <p className="text-xs sm:text-sm md:text-base text-blue-800">
            <span className="font-semibold">已选择：</span>
            {[...consultServices, ...delegateServices]
              .filter(s => selected.includes(s.id))
              .map(s => s.name)
              .join(' + ')}
          </p>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex gap-2 sm:gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-semibold text-sm sm:text-base md:text-lg border-2 border-border bg-card hover:bg-muted transition-all duration-300"
        >
          上一步
        </button>
        <button
          onClick={onNext}
          disabled={PREVIEW_MODE ? false : !hasConsult}
          className={`
            flex-[2] py-3 sm:py-4 rounded-xl sm:rounded-2xl font-semibold text-sm sm:text-base md:text-lg transition-all duration-300
            ${(hasConsult || PREVIEW_MODE) 
              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 shadow-lg shadow-blue-200' 
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }
          `}
        >
          下一步，确认支付
        </button>
      </div>
    </div>
  );
}
