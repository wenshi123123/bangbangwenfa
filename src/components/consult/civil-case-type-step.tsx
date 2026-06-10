'use client';

// ============================================
// 预览模式开关 - 正常流程需要设为 false
// ============================================
const PREVIEW_MODE = false;

import { CaseType } from './civil-consultation-wizard';

interface CaseTypeStepProps {
  selected: string;
  onSelect: (id: string) => void;
  onNext: () => void;
}

const caseTypes: CaseType[] = [
  { id: 'marriage', name: '婚姻继承', icon: '💔', description: '离婚纠纷、子女抚养、财产分割、遗产继承等' },
  { id: 'contract', name: '合同债务', icon: '📝', description: '借款纠纷、买卖合同、租赁合同、违约责任等' },
  { id: 'property', name: '房产纠纷', icon: '🏠', description: '房屋买卖、拆迁补偿、物业纠纷、采光权等' },
  { id: 'labor', name: '劳动纠纷', icon: '💼', description: '工伤赔偿、劳动仲裁、工资拖欠、解除合同等' },
  { id: 'traffic', name: '交通事故', icon: '🚗', description: '交通事故责任、人身损害赔偿、保险理赔等' },
  { id: 'medical', name: '医疗纠纷', icon: '🏥', description: '医疗事故、手术纠纷、药品问题、过度医疗等' },
  { id: 'other', name: '其他', icon: '📋', description: '其他民事纠纷类型' },
];

export function CivilCaseTypeStep({ selected, onSelect, onNext }: CaseTypeStepProps) {
  const selectedType = caseTypes.find(t => t.id === selected);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="text-center mb-6 sm:mb-8">
        <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-[#FAF7F2] border border-[rgba(196,115,83,0.2)] mb-3 sm:mb-4">
          <span className="text-xs sm:text-sm font-medium text-[#C47353]">Step 1 / 4</span>
        </div>
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-2">
          请选择案件类型
        </h2>
        <p className="text-xs sm:text-sm md:text-base text-muted-foreground px-2">
          选择您所涉及的民事纠纷类型
        </p>
      </div>

      {/* Case Type Grid */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-4 sm:mb-6 md:mb-8">
        {caseTypes.map((type) => (
          <button
            key={type.id}
            onClick={() => onSelect(type.id)}
            className={`
              relative p-3 sm:p-4 md:p-5 rounded-xl sm:rounded-xl border-2 transition-all duration-300 text-left
              ${selected === type.id 
                ? 'border-[#C47353] bg-[#FAF7F2] shadow-[0_4px_16px_rgba(61,50,45,0.08)]' 
                : 'border-border bg-card hover:border-[rgba(196,115,83,0.2)] hover:bg-[#FAF7F2]/50'
              }
            `}
          >
            {selected === type.id && (
              <div className="absolute -top-1.5 -right-1.5 w-5 h-5 sm:w-6 sm:h-6 bg-[#C47353] rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
            <div className="text-2xl sm:text-3xl mb-1 sm:mb-2">{type.icon}</div>
            <div className="font-semibold text-foreground text-xs sm:text-sm mb-0.5 sm:mb-1">{type.name}</div>
            <div className="text-xs text-muted-foreground leading-tight line-clamp-2">{type.description}</div>
          </button>
        ))}
      </div>

      {/* Next Button */}
      <button
        onClick={onNext}
        disabled={PREVIEW_MODE ? false : !selected}
        className={`
          w-full py-3 sm:py-4 rounded-xl sm:rounded-xl font-semibold text-sm sm:text-base md:text-lg transition-all duration-300
          ${(selected || PREVIEW_MODE) 
            ? 'bg-gradient-to-r from-[#C47353] to-[#A85D40] text-white hover:from-[#A85D40] hover:to-[#8B3E2A] shadow-[0_4px_16px_rgba(61,50,45,0.08)] hover:shadow-xl hover:shadow-[0_8px_24px_rgba(196,115,83,0.15)]' 
            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }
        `}
      >
        {selected ? '下一步，描述案情' : '请先选择案件类型'}
      </button>
    </div>
  );
}

export { caseTypes };
