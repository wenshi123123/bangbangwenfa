'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  MapPin,
  GraduationCap,
  Calendar,
  CheckCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// 与律师后台 LawyerProfile 对齐的类型（仅公开字段）
interface PublicLawyerProfile {
  id: number;
  name: string;
  real_name: string;
  gender: string;
  title: string;
  intro: string;
  specialties: string[];
  education: string;
  graduated_school: string;
  working_years: number;
  law_firm: string;
  license_no: string;
  wechat: string;
  province: string;
  city: string;
  package_type: string;
  selected_packages: string[];
  status: string;
  is_available: boolean;
  orderCount: number;
  created_at: string;
}

const USER_CENTER_HREF = '/me';

const specialtyMap: Record<string, { label: string; color: string }> = {
  criminal: { label: '刑事案件', color: 'bg-[#C26565]/10 text-[#C26565]' },
  fraud: { label: '诈骗案件', color: 'bg-[#C8963E]/10 text-[#C8963E]' },
  marriage: { label: '婚姻家庭', color: 'bg-[#C47353]/10 text-[#C47353]' },
  property: { label: '房产纠纷', color: 'bg-[#5C7A5A]/10 text-[#5C7A5A]' },
  contract: { label: '合同纠纷', color: 'bg-[#7D6B5D]/10 text-[#7D6B5D]' },
  labor: { label: '劳动纠纷', color: 'bg-[#5C7A5A]/10 text-[#5C7A5A]' },
  traffic: { label: '交通事故', color: 'bg-[#C8963E]/10 text-[#C8963E]' },
  debt: { label: '债务纠纷', color: 'bg-[#8C7B6E]/10 text-[#8C7B6E]' },
};

const packageNameMap: Record<string, string> = {
  civil_premium: '民事律师（臻选）',
  criminal_premium: '刑事律师（臻选）',
  civil: '民事律师（臻选）',
  criminal: '刑事律师（臻选）',
};

export default function LawyerPublicProfilePage() {
  const params = useParams();
  const router = useRouter();
  const [profile, setProfile] = useState<PublicLawyerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(USER_CENTER_HREF);
  };

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/lawyer/${params.id}/public-profile`);
        const result = await res.json();
        if (!result.success) {
          setError(result.error || '加载失败');
          return;
        }
        setProfile(result.data);
      } catch {
        setError('网络错误，请稍后重试');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-[#C47353] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-[#8C7B6E]">加载中…</span>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center p-4">
        <div className="bg-white rounded-xl p-8 shadow-lg max-w-sm w-full text-center">
          <div className="w-14 h-14 rounded-full bg-[#C26565]/10 flex items-center justify-center mx-auto mb-4">
            <ArrowLeft className="w-7 h-7 text-[#C26565]" />
          </div>
          <h2 className="text-xl font-bold text-[#3D322D] mb-2 font-serif">
            {error || '律师不存在'}
          </h2>
          <Button
            onClick={handleBack}
            className="mt-4 bg-[#C47353] hover:bg-[#A85D40] text-white rounded-full"
          >
            返回
          </Button>
        </div>
      </div>
    );
  }

  const displayName = profile.name || profile.real_name || '律师';

  return (
    <div className="min-h-screen bg-[#FAF7F2] pb-16">
      {/* 顶栏 */}
      <div className="sticky top-0 z-40 bg-[#FDF8F0]/95 backdrop-blur-xl border-b border-[#E8D5C0]/50">
        <div className="px-4 py-3 flex items-center max-w-2xl lg:max-w-5xl mx-auto">
          <button
            onClick={handleBack}
            className="p-2 -ml-2 rounded-full hover:bg-[#FAF7F2] transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-[#3D322D]" />
          </button>
          <span className="flex-1 text-center text-[15px] font-semibold text-[#1C1917] font-serif tracking-wide">
            律师名片
          </span>
          <div className="w-[64px]" />
        </div>
      </div>

      <div className="max-w-2xl lg:max-w-5xl mx-auto px-4 py-6 lg:py-8 space-y-6">
        {/* ===== 律师身份 HERO 卡片（复用律师后台样式） ===== */}
        <div className="relative bg-gradient-to-br from-[#C47353] via-[#B06545] to-[#8B4513] rounded-xl p-6 lg:p-7 shadow-lg shadow-[#C47353]/15 overflow-hidden">
          {/* 装饰圆 */}
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/5 rounded-full" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/5 rounded-full" />

          <div className="relative z-10">
            {/* 顶行：姓名 + 认证徽章 */}
            <div className="flex items-center justify-between mb-5">
              <p className="text-white/65 text-sm tracking-wide">
                {profile.title || '专职律师'} · {profile.city || '未设置'}
              </p>
              <span className="inline-flex items-center gap-1.5 text-[11px] bg-white/15 text-white/90 px-3 py-1 rounded-full backdrop-blur-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
                认证通过
              </span>
            </div>

            {/* 头像 + 身份信息 */}
            <div className="flex items-start gap-5 mb-5">
              <div className="w-20 h-20 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center text-white text-3xl font-serif flex-shrink-0 border border-white/20 shadow-inner">
                {displayName.charAt(0)}
              </div>
              <div className="flex-1 min-w-0 pt-1">
                <h2 className="text-2xl lg:text-3xl font-bold text-white font-serif tracking-tight leading-tight">
                  {displayName}
                </h2>
                {/* 执业证号 + 所属律所 */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 mt-2 text-white/50 text-xs">
                  {profile.license_no && profile.license_no.length <= 25 && (
                    <span>执业证号 {profile.license_no}</span>
                  )}
                  {profile.law_firm && <span>｜ {profile.law_firm}</span>}
                </div>
                {/* 套餐标签 */}
                {Array.isArray(profile.selected_packages) && profile.selected_packages.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {profile.selected_packages.map((pkg: string) => {
                      const pkgLabel = packageNameMap[pkg] || pkg;
                      return (
                        <span key={pkg} className="text-[11px] px-2.5 py-0.5 rounded-full bg-white/20 text-white/90 font-medium backdrop-blur-sm border border-white/15">
                          🌟 {pkgLabel}
                        </span>
                      );
                    })}
                  </div>
                )}
                {/* 擅长标签 */}
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {Array.isArray(profile.specialties) && profile.specialties.slice(0, 4).map((s: string) => {
                    const info = specialtyMap[s] || { label: s, color: '' };
                    return (
                      <span key={s} className="text-[11px] px-2.5 py-0.5 rounded-full bg-white/15 text-white/85 font-medium backdrop-blur-sm">
                        {info.label}
                      </span>
                    );
                  })}
                  {Array.isArray(profile.specialties) && profile.specialties.length > 4 && (
                    <span className="text-[11px] text-white/50 px-1">+{profile.specialties.length - 4}</span>
                  )}
                </div>
              </div>
            </div>

            {/* 底部指标条 */}
            <div className="grid grid-cols-2 gap-2 pt-4 border-t border-white/12">
              {[
                { val: profile.orderCount || 0, label: '已接单', sub: '累计' },
                { val: (profile.working_years && profile.working_years > 0) ? `${profile.working_years}年` : '待完善', label: '执业年限', sub: '从业经验' },
              ].map((m) => (
                <div key={m.label} className="text-center">
                  <p className="text-xl lg:text-2xl font-bold text-white font-serif">{m.val}</p>
                  <p className="text-white/75 text-[11px] font-medium mt-0.5">{m.label}</p>
                  <p className="text-white/40 text-[10px]">{m.sub}</p>
                </div>
              ))}
            </div>

            {/* 毕业院校 */}
            {(profile.graduated_school || profile.education) ? (
              <>
                <div className="mt-3 pt-3 border-t border-dashed border-white/10" />
                <div className="mt-2.5 flex items-center gap-2">
                  <span className="text-white/45 text-[10px] tracking-widest uppercase font-medium">
                    🎓 毕业院校
                  </span>
                  <span className="flex-1 h-px bg-gradient-to-r from-white/8 to-transparent" />
                </div>
                <div className="mt-2 bg-white/6 backdrop-blur-sm rounded-xl px-3.5 py-3 flex items-center gap-3 border border-white/8">
                  <div className="w-1 h-9 rounded-full bg-gradient-to-b from-[#C8963E]/80 to-[#C47353]/40 flex-shrink-0" />
                  <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                    {profile.graduated_school ? (
                      <p className="text-white text-sm font-medium leading-tight truncate">
                        {profile.graduated_school}
                      </p>
                    ) : (
                      <p className="text-white/35 text-sm italic">未填写院校</p>
                    )}
                    {profile.education && (
                      <span className="text-[11px] px-2.5 py-1 rounded-full bg-white/15 text-white/80 font-medium backdrop-blur-sm border border-white/10 flex-shrink-0">
                        {profile.education}
                      </span>
                    )}
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>

        {/* ===== 律师简介 ===== */}
        {profile.intro && (
          <div className="bg-[#FFFBF5] rounded-xl border border-[#E8D5C0] overflow-hidden shadow-[0_2px_8px_rgba(61,50,45,0.06)]">
            <div className="h-[3px] bg-[#C47353]" />
            <div className="p-4 lg:p-5">
              <h3 className="text-sm font-semibold text-[#1C1917] font-serif mb-3">律师简介</h3>
              <p className="text-sm text-[#3D322D] leading-relaxed whitespace-pre-wrap">{profile.intro}</p>
            </div>
          </div>
        )}

        {/* ===== 联系方式 ===== */}
        {profile.wechat && (
          <div className="bg-[#FFFBF5] rounded-xl border border-[#E8D5C0] overflow-hidden shadow-[0_2px_8px_rgba(61,50,45,0.06)]">
            <div className="h-[3px] bg-[#5C7A5A]" />
            <div className="p-4 lg:p-5">
              <h3 className="text-sm font-semibold text-[#1C1917] font-serif mb-3">联系方式</h3>
              <div className="flex items-center gap-3 p-3 bg-[#FAF7F2] rounded-xl">
                <span className="text-[#8C7B6E] text-sm">微信号</span>
                <span className="flex-1 h-px bg-[#E8D5C0]" />
                <span className="text-[#3D322D] font-medium text-sm">{profile.wechat}</span>
                <button
                  onClick={() => { navigator.clipboard.writeText(profile.wechat); }}
                  className="text-[#C47353] text-xs hover:underline"
                >
                  复制
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===== 操作按钮 ===== */}
        <div className="pt-2">
          <Button
            onClick={() => router.push(USER_CENTER_HREF)}
            variant="outline"
            className="w-full border-[#C47353] text-[#C47353] hover:bg-[#FAF7F2] rounded-full"
          >
            返回个人中心
          </Button>
        </div>
      </div>
    </div>
  );
}
