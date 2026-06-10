'use client';

import { useState } from 'react';

interface DescriptionStepProps {
  value: string;
  contactPhone?: string;
  onChange: (value: string) => void;
  onContactPhoneChange?: (value: string) => void;
  onNext: () => void;
  onBack: () => void;
}

const placeholderText = `请详细描述您或家人的情况，例如：

• 案件发生的时间、地点
• 涉及的人员和事情经过
• 目前所处的阶段（刚被传唤/已拘留/已逮捕/已取保候审等）
• 是否已经聘请律师
• 其他您认为重要的信息

温馨提示：描述越详细，律师给出的建议越准确。`;

export function DescriptionStep({ value, contactPhone = '', onChange, onContactPhoneChange, onNext, onBack }: DescriptionStepProps) {
  const [isFocused, setIsFocused] = useState(false);
  const charCount = value.length;
  const minChars = 1;

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 11);
    onContactPhoneChange?.(val);
  };

  const isValidPhone = contactPhone.length === 11;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="text-center mb-6 sm:mb-8">
        <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-[#FAF7F2] border border-[rgba(196,115,83,0.2)] mb-3 sm:mb-4">
          <span className="text-xs sm:text-sm font-medium text-[#C47353]">Step 2 / 4</span>
        </div>
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-2">
          请描述案情
        </h2>
        <p className="text-xs sm:text-sm md:text-base text-muted-foreground px-2">
          详细描述有助于律师更准确地分析案件
        </p>
      </div>

      {/* 手机号输入 */}
      <div className="mb-4 sm:mb-6">
        <label className="block text-sm font-medium text-foreground mb-2">
          手机号码 <span className="text-red-500">*</span>
        </label>
        <div className={`
          relative rounded-xl sm:rounded-xl border-2 transition-all duration-300 overflow-hidden
          ${contactPhone && !isValidPhone ? 'border-red-400' : isFocused ? 'border-[#C47353] shadow-[0_4px_16px_rgba(196,115,83,0.15)]' : 'border-border'}
        `}>
          <input
            type="tel"
            value={contactPhone}
            onChange={handlePhoneChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="请输入您的手机号码"
            className="w-full h-12 sm:h-14 px-4 bg-card focus:outline-none text-foreground placeholder:text-muted-foreground/60 text-sm sm:text-base"
          />
          {contactPhone && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {isValidPhone ? (
                <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <span className="text-xs text-red-500">{contactPhone.length}/11</span>
              )}
            </div>
          )}
        </div>
        {contactPhone && !isValidPhone && (
          <p className="text-xs text-red-500 mt-1">请输入11位手机号码</p>
        )}
      </div>

      {/* Textarea */}
      <div className="mb-4 sm:mb-6">
        <div className={`
          relative rounded-xl sm:rounded-xl border-2 transition-all duration-300 overflow-hidden
          ${isFocused ? 'border-[#C47353] shadow-[0_4px_16px_rgba(196,115,83,0.15)]' : 'border-border'}
        `}>
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholderText}
            className="w-full h-48 sm:h-64 md:h-80 p-3 sm:p-4 md:p-5 bg-card resize-none focus:outline-none text-foreground placeholder:text-muted-foreground/60 leading-relaxed text-sm sm:text-base"
          />
        </div>
        
        {/* Character Count */}
        <div className="flex justify-between items-center mt-2 sm:mt-3 px-1">
          <div className={`
            text-xs sm:text-sm transition-colors
            ${charCount < minChars ? 'text-muted-foreground' : 'text-[#C47353]'}
          `}>
            {charCount < minChars ? (
              <span>请至少填写 {minChars} 字</span>
            ) : (
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                已达到基本描述要求
              </span>
            )}
          </div>
          <div className="text-xs sm:text-sm text-muted-foreground">
            {charCount} 字
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex gap-2 sm:gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-3 sm:py-4 rounded-xl sm:rounded-xl font-semibold text-sm sm:text-base md:text-lg border-2 border-border bg-card hover:bg-muted transition-all duration-300"
        >
          上一步
        </button>
        <button
          onClick={onNext}
          disabled={charCount < minChars || !isValidPhone}
          className={`
            flex-[2] py-3 sm:py-4 rounded-xl sm:rounded-xl font-semibold text-sm sm:text-base md:text-lg transition-all duration-300
            ${charCount >= minChars && isValidPhone
              ? 'bg-gradient-to-r from-[#C47353] to-[#A85D40] text-white hover:from-[#8B3E2A] hover:to-[#6B2E1E] shadow-[0_4px_16px_rgba(196,115,83,0.2)]' 
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }
          `}
        >
          下一步，选择服务
        </button>
      </div>
    </div>
  );
}
