'use client';

// ============================================
// 预览模式开关 - 正常流程需要设为 false
// ============================================
const PREVIEW_MODE = false;

import { useState } from 'react';

interface DescriptionStepProps {
  value: string;
  contactPhone?: string;
  onChange: (value: string) => void;
  onContactPhoneChange?: (value: string) => void;
  onNext: () => void;
  onBack: () => void;
}

const placeholderText = `请详细描述您的纠纷情况，例如：

• 纠纷发生的时间、地点
• 涉及的人员和事情经过
• 目前的处理阶段（协商中/已起诉/已判决等）
• 相关的证据材料（合同、聊天记录等）
• 其他您认为重要的信息

温馨提示：描述越详细，律师给出的建议越准确。`;

export function CivilDescriptionStep({ value, contactPhone = '', onChange, onContactPhoneChange, onNext, onBack }: DescriptionStepProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [phoneFocused, setPhoneFocused] = useState(false);
  const charCount = value.length;
  const minChars = 1; // 取消最低字数限制

  // 验证手机号格式（11位数字）
  const isValidPhone = !contactPhone || /^\d{11}$/.test(contactPhone);
  const canProceed = charCount >= minChars && (!contactPhone || isValidPhone);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="text-center mb-6 sm:mb-8">
        <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-[#FAF7F2] border border-[rgba(196,115,83,0.2)] mb-3 sm:mb-4">
          <span className="text-xs sm:text-sm font-medium text-[#C47353]">Step 2 / 4</span>
        </div>
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-2">
          请描述纠纷情况
        </h2>
        <p className="text-xs sm:text-sm md:text-base text-muted-foreground px-2">
          详细描述有助于律师更准确地分析案件
        </p>
      </div>

      {/* Phone Input - 移到案情描述上方 */}
      {onContactPhoneChange && (
        <div className="mb-4 sm:mb-6">
          <label className="block text-sm font-medium text-foreground mb-2">
            手机号码（选填）
          </label>
          <div className={`
            relative rounded-xl sm:rounded-xl border-2 transition-all duration-300 overflow-hidden
            ${phoneFocused ? 'border-[#C47353] shadow-[0_4px_16px_rgba(61,50,45,0.08)]' : 'border-border'}
            ${contactPhone && !isValidPhone ? 'border-red-400' : ''}
          `}>
            <input
              type="tel"
              value={contactPhone}
              onChange={(e) => onContactPhoneChange(e.target.value)}
              onFocus={() => setPhoneFocused(true)}
              onBlur={() => setPhoneFocused(false)}
              placeholder="律师可通过此号码联系您"
              className="w-full p-3 sm:p-4 bg-card focus:outline-none text-foreground placeholder:text-muted-foreground/60 text-sm sm:text-base"
              maxLength={11}
            />
          </div>
          {contactPhone && !isValidPhone && (
            <p className="text-xs text-red-500 mt-1">请输入11位手机号码</p>
          )}
        </div>
      )}

      {/* Textarea */}
      <div className="mb-4 sm:mb-6">
        <div className={`
          relative rounded-xl sm:rounded-xl border-2 transition-all duration-300 overflow-hidden
          ${isFocused ? 'border-[#C47353] shadow-[0_4px_16px_rgba(61,50,45,0.08)]' : 'border-border'}
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
              <span>请填写案情描述</span>
            ) : (
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                描述已填写
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
          disabled={PREVIEW_MODE ? false : !canProceed}
          className={`
            flex-[2] py-3 sm:py-4 rounded-xl sm:rounded-xl font-semibold text-sm sm:text-base md:text-lg transition-all duration-300
            ${(canProceed || PREVIEW_MODE) 
              ? 'bg-gradient-to-r from-[#C47353] to-[#A85D40] text-white hover:from-[#A85D40] hover:to-[#8B3E2A] shadow-[0_4px_16px_rgba(61,50,45,0.08)]' 
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
