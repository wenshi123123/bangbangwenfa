'use client';

/* Avatar URLs are user-provided and may be remote; use a plain image to preserve the existing storage contract. */
/* eslint-disable @next/next/no-img-element */

import { HeartHandshake, Share2, Users, WalletCards } from 'lucide-react';

export type GuardianHeroData = {
  nickname: string;
  avatarUrl: string | null;
  inviteCode: string;
  totalInvites: number;
  validInvites: number;
  totalCommission: number;
  availableCommission: number;
};

function formatMoney(cents: number) {
  return (cents / 100).toFixed(2);
}

export function GuardianIdentityHero({ guardian, onInvite }: {
  guardian: GuardianHeroData;
  onInvite: () => void;
}) {
  return (
    <section
      data-testid="guardian-identity-hero"
      className="relative overflow-hidden rounded-b-[2rem] bg-[#FAF7F2] px-4 pb-7 pt-5 text-[#3F3028]"
    >
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#F2E2D2]/80" />
      <div className="pointer-events-none absolute -left-20 bottom-0 h-32 w-52 rounded-t-full bg-[#E9CBB5]/35" />

      <div className="relative mx-auto max-w-2xl motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-220">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#E6C9B6] bg-white text-[#C47353] shadow-[0_8px_22px_rgba(102,68,43,0.08)]">
            {guardian.avatarUrl ? <img src={guardian.avatarUrl} alt="" className="h-full w-full object-cover" /> : <HeartHandshake aria-hidden="true" className="h-7 w-7" />}
          </div>
          <div className="min-w-0">
            <p className="text-sm text-[#7A5E4F]">你好，{guardian.nickname}</p>
            <h1 className="mt-0.5 font-serif text-xl font-semibold tracking-wide text-[#3F3028]">守护者中心</h1>
          </div>
        </div>

        <div className="mt-6">
          <p className="max-w-sm font-serif text-2xl font-semibold leading-snug text-[#3F3028]">你已为 {guardian.totalInvites} 位亲友打开法律帮助通道</p>
          <p className="mt-2 text-sm leading-6 text-[#7A5E4F]">把可靠的法律服务分享给真正需要帮助的人。</p>
        </div>

        <button type="button" data-testid="guardian-primary-share" onClick={onInvite} className="mt-6 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#C47353] px-4 py-3.5 text-base font-semibold text-white shadow-[0_10px_20px_rgba(196,115,83,0.22)] transition-[transform,background-color,box-shadow] duration-150 active:scale-[0.98] active:bg-[#A95E42] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3F3028]">
          <Share2 aria-hidden="true" className="h-5 w-5" />
          邀请亲友获得法律帮助
        </button>

        <div className="mt-4 flex items-center justify-between rounded-xl border border-[#E9D2C0] bg-white/80 px-4 py-3">
          <div>
            <p className="text-xs text-[#8C6C59]">守护凭证</p>
            <p className="mt-0.5 font-mono text-lg font-semibold tracking-[0.14em] text-[#3F3028]">{guardian.inviteCode}</p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F2E2D2] text-[#A96820]" aria-hidden="true"><Users className="h-4 w-4" /></div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-white/65 px-2 py-3"><p className="text-lg font-semibold text-[#3F3028]">{guardian.validInvites}</p><p className="mt-0.5 text-xs text-[#8C6C59]">完成服务的亲友</p></div>
          <div className="rounded-xl bg-white/65 px-2 py-3"><p className="text-lg font-semibold text-[#3F6A5A]">¥{formatMoney(guardian.totalCommission)}</p><p className="mt-0.5 text-xs text-[#8C6C59]">累计守护回馈</p></div>
          <div className="rounded-xl bg-white/65 px-2 py-3"><div className="flex justify-center text-[#A96820]" aria-hidden="true"><WalletCards className="h-4 w-4" /></div><p className="mt-0.5 text-lg font-semibold text-[#3F3028]">¥{formatMoney(guardian.availableCommission)}</p><p className="mt-0.5 text-xs text-[#8C6C59]">可提取回馈</p></div>
        </div>
      </div>
    </section>
  );
}
