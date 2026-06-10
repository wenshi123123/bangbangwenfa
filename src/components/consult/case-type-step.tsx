'use client';

import { CaseType } from './consultation-wizard';

interface CaseTypeStepProps {
  selected: string;
  onSelect: (id: string) => void;
  onNext: () => void;
}

const caseTypes: CaseType[] = [
  { id: 'fraud', name: '诈骗类', icon: '💳', description: '电信诈骗、网络诈骗、金融诈骗等' },
  { id: 'theft', name: '盗窃类', icon: '🎒', description: '盗窃财物、入室盗窃、扒窃等' },
  { id: 'assault', name: '故意伤害', icon: '👊', description: '故意伤害他人身体等' },
  { id: 'drugs', name: '毒品犯罪', icon: '💊', description: '涉毒类违法犯罪' },
  { id: 'economy', name: '经济犯罪', icon: '💰', description: '职务侵占、非法经营、虚开发票等' },
  { id: 'traffic', name: '交通犯罪', icon: '🚗', description: '醉驾、危险驾驶、交通肇事等' },
  { id: 'other', name: '其他', icon: '📋', description: '其他刑事案件类型' },
];

export function CaseTypeStep({ selected, onSelect, onNext }: CaseTypeStepProps) {
  const selectedType = caseTypes.find(t => t.id === selected);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="text-center mb-6 sm:mb-8">
        <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-[#FAF7F2] border border-[rgba(196,115,83,0.2)] mb-3 sm:mb-4">
          <span className="text-xs sm:text-sm font-medium text-[#C47353]">Step 1 / 4</span>
        </div>
        <h2 className="text-xl sm:text-2xl md:text-3xl font-serif text-[#3D322D] font-normal mb-2">
          请选择案件类型
        </h2>
        <p className="text-xs sm:text-sm md:text-base text-[#8C7B6E] px-2">
          选择您或家人涉嫌的刑事案件类型
        </p>
      </div>

      {/* Case Type Grid */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-4 sm:mb-6 md:mb-8">
        {caseTypes.map((type) => (
          <button
            key={type.id}
            onClick={() => onSelect(type.id)}
            className={`
              relative p-3 sm:p-4 md:p-5 rounded-xl border transition-all duration-250 text-left
              ${selected === type.id 
                ? 'border-[#C47353] bg-[#FAF7F2] shadow-[0_4px_16px_rgba(61,50,45,0.08)]' 
                : 'border-[rgba(196,115,83,0.2)] bg-white hover:border-[#C47353] hover:bg-[#FAF7F2]'
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
            <div className="font-medium text-[#3D322D] text-xs sm:text-sm mb-0.5 sm:mb-1">{type.name}</div>
            <div className="text-xs text-[#8C7B6E] leading-tight line-clamp-2">{type.description}</div>
          </button>
        ))}
      </div>

      {/* Next Button */}
      <button
        onClick={onNext}
        disabled={!selected}
        className={`
          w-full py-3 sm:py-4 rounded-full font-medium text-sm sm:text-base md:text-lg transition-all duration-250
          ${selected 
            ? 'bg-[#C47353] hover:bg-[#A85D40] text-white shadow-[0_2px_8px_rgba(196,115,83,0.3)] hover:-translate-y-[1px] active:scale-[0.98]' 
            : 'bg-[#C47353]/40 text-white/70 cursor-not-allowed'
          }
        `}
      >
        {selected ? '下一步，描述案情' : '请先选择案件类型'}
      </button>
    </div>
  );
}

export { caseTypes };
