'use client';

import { useEffect } from 'react';

export interface ServicePlanDialogPlan {
  id: string;
  name: string;
  price: number;
}

interface ServicePlanDialogProps {
  plan: ServicePlanDialogPlan | null;
  onClose: () => void;
  onConfirm: (planId: string) => void;
}

const PLAN_DETAILS: Record<string, { tagline: string; description: string; features: string[]; boundary: string }> = {
  basic: {
    tagline: '先把问题弄明白',
    description: '有些问题，你只是想先找一个真正懂法律的人问清楚。律师会在12小时内，帮你把事情理一遍，找到问题的关键、可能的风险，以及现在最适合先做什么。',
    features: ['争议焦点梳理', '基本法律分析', '初步风险判断', '简单处理方向说明'],
    boundary: '以基础问题解答和判断为主，不包含复杂案例检索或正式法律文书制作。',
  },
  standard: {
    tagline: '找到依据，明确下一步',
    description: '有些事情，光知道对错还不够，更重要的是知道下一步怎么走。律师会结合公开案例进行检索和对照，帮助你把思路逐步理清。',
    features: ['基础法律分析', '相关公开案例检索', '案例关联性说明', '针对性处理建议', '服务期内多次补充询问'],
    boundary: '案例用于辅助分析和参考，不代表结果保证；不包含正式法律文书代写。',
  },
  advanced: {
    tagline: '72小时持续陪伴处理',
    description: '有些事情，不是一句话就能说清楚，也不是一次咨询就能解决。律师会在72小时内围绕同一事项持续跟进，陪你把每一步想清楚、走稳。',
    features: ['持续了解案件变化', '根据新情况调整分析方向', '证据和沟通重点梳理', '多次解答新问题', '阶段性处理建议和风险提醒'],
    boundary: '深度服务不等同于全天候即时响应，也不包含正式法律文书制作。',
  },
};

export function ServicePlanDialog({ plan, onClose, onConfirm }: ServicePlanDialogProps) {
  useEffect(() => {
    if (!plan) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [plan, onClose]);

  if (!plan) return null;
  const detail = PLAN_DETAILS[plan.id] || PLAN_DETAILS.basic;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-[#3D322D]/35 p-0 sm:items-center sm:p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="service-plan-dialog-title" className="w-full max-h-[88vh] overflow-y-auto rounded-t-[28px] bg-[#FFFCF8] px-5 pb-6 pt-4 shadow-[0_-12px_40px_rgba(61,50,45,0.16)] sm:max-w-lg sm:rounded-[28px] sm:px-7 sm:pt-6">
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-[#E8D8CC] sm:hidden" />
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="mb-1 text-xs font-medium tracking-[0.16em] text-[#C47353]">咨询服务说明</p>
            <h2 id="service-plan-dialog-title" className="text-2xl font-semibold text-[#3D322D]">{plan.name}</h2>
            <p className="mt-1 text-sm font-medium text-[#C47353]">{detail.tagline}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="关闭服务说明" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FAF1EA] text-xl text-[#8C7B6E] hover:bg-[#F3E5DB]">×</button>
        </div>
        <p className="text-[15px] leading-7 text-[#5E514A]">{detail.description}</p>
        <div className="mt-5 rounded-2xl border border-[#EEDDD1] bg-[#FAF3ED] p-4">
          <p className="mb-3 text-sm font-semibold text-[#3D322D]">服务包含</p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {detail.features.map((feature) => <li key={feature} className="flex items-start gap-2 text-sm leading-6 text-[#6F625B]"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C47353]" />{feature}</li>)}
          </ul>
        </div>
        <p className="mt-4 text-xs leading-5 text-[#8C7B6E]">{detail.boundary}</p>
        <div className="mt-6 flex items-center justify-between gap-4 border-t border-[#F0E4DB] pt-5">
          <div><span className="text-xs text-[#8C7B6E]">服务价格</span><div className="text-2xl font-bold text-[#C47353]">¥{plan.price}</div></div>
          <button type="button" onClick={() => onConfirm(plan.id)} className="rounded-full bg-gradient-to-r from-[#C47353] to-[#A85D40] px-5 py-3 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(196,115,83,0.24)] transition hover:from-[#A85D40] hover:to-[#8B3E2A]">我已了解，选择此服务</button>
        </div>
      </section>
    </div>
  );
}
