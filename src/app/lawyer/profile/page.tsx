'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  User,
  Shield,
  Award,
  Clock,
  CheckCircle,
  Loader2,
  Save,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useLawyerAuth } from '@/hooks/use-lawyer-auth';
import { LawyerBottomNav } from '@/components/lawyer/lawyer-bottom-nav';

interface LawyerProfile {
  id: number;
  name: string;
  phone: string;
  email: string;
  wechat: string;
  wechat_id: string;
  title: string;
  intro: string;
  specialties: string[];
  license_no: string;
  working_years: number;
  avatar_url: string;
  status: string;
}

interface PendingRevision {
  id: number;
  revision_type: string;
  old_value: string;
  new_value: string;
  status: string;
  submitted_at: string;
}

const fieldConfig = {
  basic: {
    title: '基本信息',
    icon: Award,
    color: '#C47353',
    fields: [
      { key: 'name', label: '姓名', type: 'text' },
      { key: 'working_years', label: '从业年限', type: 'number' },
      { key: 'license_no', label: '执业证号', type: 'text' },
    ],
  },
  contact: {
    title: '联系方式',
    icon: User,
    color: '#5C7A5A',
    fields: [
      { key: 'phone', label: '手机号', type: 'text' },
      { key: 'email', label: '邮箱', type: 'email' },
      { key: 'wechat', label: '微信号', type: 'text' },
      { key: 'wechat_id', label: '微信ID', type: 'text' },
    ],
  },
  professional: {
    title: '专业信息',
    icon: Shield,
    color: '#7B4B8B',
    fields: [
      { key: 'title', label: '头衔/职位', type: 'text' },
      { key: 'specialties', label: '擅长领域', type: 'specialties' },
      { key: 'intro', label: '个人简介', type: 'textarea' },
    ],
  },
};

const specialtyOptions = [
  { value: 'criminal', label: '刑事案件' },
  { value: 'fraud', label: '诈骗案件' },
  { value: 'marriage', label: '婚姻家庭' },
  { value: 'property', label: '房产纠纷' },
  { value: 'contract', label: '合同纠纷' },
  { value: 'labor', label: '劳动纠纷' },
  { value: 'traffic', label: '交通事故' },
  { value: 'debt', label: '债务纠纷' },
];

const fieldLabels: Record<string, string> = {
  name: '姓名',
  working_years: '从业年限',
  license_no: '执业证号',
  phone: '手机号',
  email: '邮箱',
  wechat: '微信号',
  wechat_id: '微信ID',
  title: '头衔/职位',
  specialties: '擅长领域',
  intro: '个人简介',
};

export default function LawyerProfilePage() {
  const { user, isAuthorized, isLoading: authLoading, lawyerId, getAuthHeaders } =
    useLawyerAuth();
  const [profile, setProfile] = useState<LawyerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [error, setError] = useState('');
  const [pendingRevisions, setPendingRevisions] = useState<PendingRevision[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    working_years: '',
    license_no: '',
    phone: '',
    email: '',
    wechat: '',
    wechat_id: '',
    title: '',
    intro: '',
    specialties: [] as string[],
  });

  const [reason, setReason] = useState('');

  const fetchProfile = useCallback(async () => {
    try {
      const headers = getAuthHeaders();
      const response = await fetch('/api/lawyer/profile', { headers });
      const result = await response.json();
      if (result.success && result.data) {
        const lawyer = result.data;
        setProfile(lawyer);
        const specialtiesData =
          lawyer.specialties ||
          (typeof lawyer.specialization === 'string'
            ? JSON.parse(lawyer.specialization || '[]')
            : []) ||
          [];
        setFormData({
          name: lawyer.name || lawyer.real_name || '',
          working_years: lawyer.working_years?.toString() || '',
          license_no: lawyer.license_no || '',
          phone: lawyer.phone || '',
          email: lawyer.email || '',
          wechat: lawyer.wechat || '',
          wechat_id: lawyer.wechat_id || '',
          title: lawyer.title || '',
          intro: lawyer.intro || lawyer.bio || '',
          specialties: Array.isArray(specialtiesData) ? specialtiesData : [],
        });
      }
    } catch {
      // 静默处理
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  const fetchPendingRevisions = useCallback(async () => {
    if (!lawyerId) return;
    try {
      const headers = getAuthHeaders();
      const response = await fetch(
        `/api/lawyer/profile/submit-review?lawyerId=${lawyerId}`,
        { headers }
      );
      if (!response.ok) {
        setPendingRevisions([]);
        return;
      }
      const text = await response.text();
      if (!text) {
        setPendingRevisions([]);
        return;
      }
      const result = JSON.parse(text);
      if (result.success) {
        setPendingRevisions(
          result.data.filter((r: PendingRevision) => r.status === 'pending')
        );
      }
    } catch {
      setPendingRevisions([]);
    }
  }, [lawyerId, getAuthHeaders]);

  useEffect(() => {
    if (!authLoading && isAuthorized) {
      fetchProfile();
      fetchPendingRevisions();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [authLoading, isAuthorized, fetchProfile, fetchPendingRevisions]);

  const hasPendingRevision = (key: string): boolean =>
    pendingRevisions.some((r) => r.revision_type === key);

  const hasFieldChange = (key: string): boolean => {
    if (!profile) return false;
    const oldValue = profile[key as keyof LawyerProfile];
    const newValue = formData[key as keyof typeof formData];
    if (Array.isArray(oldValue) && Array.isArray(newValue)) {
      return JSON.stringify(oldValue) !== JSON.stringify(newValue);
    }
    return String(oldValue || '') !== String(newValue || '');
  };

  const handleSubmitReview = async () => {
    if (!lawyerId) return;

    const changedFields: Array<{ field: string; oldValue: string; newValue: string }> = [];
    const checkFields = [
      'name', 'working_years', 'license_no',
      'phone', 'email', 'wechat', 'wechat_id',
      'title', 'specialties', 'intro',
    ] as const;

    for (const field of checkFields) {
      if (hasFieldChange(field)) {
        changedFields.push({
          field,
          oldValue:
            field === 'specialties'
              ? JSON.stringify(profile?.specialties || [])
              : (profile?.[field as keyof LawyerProfile] as string) || '',
          newValue:
            field === 'specialties'
              ? JSON.stringify(formData.specialties)
              : (formData[field as keyof typeof formData] as string),
        });
      }
    }

    if (changedFields.length === 0) {
      setError('请先修改内容后再提交');
      return;
    }
    if (!reason.trim()) {
      setError('请填写修改原因');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      for (const item of changedFields) {
        if (hasPendingRevision(item.field)) continue;
        const reqHeaders: HeadersInit = {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        };
        const response = await fetch('/api/lawyer/profile/submit-review', {
          method: 'POST',
          headers: reqHeaders,
          body: JSON.stringify({
            lawyerId,
            lawyerUserId: user?.id,
            lawyerName: profile?.name,
            revisionType: item.field,
            oldValue: item.oldValue,
            newValue: item.newValue,
            reason: reason.trim(),
          }),
        });
        const result = await response.json();
        if (!result.success) {
          setError(`${fieldLabels[item.field] || item.field}: ${result.error}`);
          setSubmitting(false);
          return;
        }
      }
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 5000);
      fetchPendingRevisions();
    } catch {
      setError('提交失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleSpecialty = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      specialties: prev.specialties.includes(value)
        ? prev.specialties.filter((s) => s !== value)
        : [...prev.specialties, value],
    }));
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF7F2]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-[#C47353] border-t-transparent animate-spin" />
          <span className="text-sm text-[#8C7B6E]">加载中…</span>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#FAF7F2]">
        <div className="bg-[#FFFBF5] rounded-2xl p-8 shadow-lg max-w-sm w-full text-center border border-[#E8D5C0]">
          <div className="w-14 h-14 rounded-full bg-[#C47353]/10 flex items-center justify-center mx-auto mb-4">
            <User className="w-7 h-7 text-[#C47353]" />
          </div>
          <h2 className="text-xl font-bold text-[#1C1917] mb-2 font-serif">请先登录</h2>
          <p className="text-[#78716C] mb-6">登录后即可编辑您的资料</p>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open-login-modal'))}
            className="w-full py-3 bg-[#C47353] text-white font-medium rounded-xl hover:bg-[#A85D40] transition-colors"
          >
            手机号登录
          </button>
        </div>
      </div>
    );
  }

  const renderFieldInput = (config: { key: string; label: string; type: string }) => {
    const isPending = hasPendingRevision(config.key);
    const isChanged = hasFieldChange(config.key);

    if (config.type === 'specialties') {
      return (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {specialtyOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => toggleSpecialty(option.value)}
                disabled={isPending}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                  formData.specialties.includes(option.value)
                    ? 'bg-[#C47353] text-white shadow-sm shadow-[#C47353]/20'
                    : 'bg-[#F5F0E8] text-[#78716C] hover:bg-[#EDE5DA]'
                } ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="text-[11px] text-[#A89B90]">
            已选 {formData.specialties.length} 个领域
          </div>
        </div>
      );
    }

    if (config.type === 'textarea') {
      return (
        <Textarea
          value={formData[config.key as keyof typeof formData] as string}
          onChange={(e) => setFormData((prev) => ({ ...prev, [config.key]: e.target.value }))}
          placeholder={`请输入${config.label}`}
          rows={4}
          disabled={isPending}
          className={
            isChanged && !isPending
              ? 'border-[#C47353]/40 focus:border-[#C47353]'
              : 'border-[#E8D5C0] focus:border-[#C47353]'
          }
        />
      );
    }

    if (config.type === 'number') {
      return (
        <Input
          type="number"
          value={formData[config.key as keyof typeof formData] as string}
          onChange={(e) => setFormData((prev) => ({ ...prev, [config.key]: e.target.value }))}
          placeholder={`请输入${config.label}`}
          disabled={isPending}
          className={
            isChanged && !isPending
              ? 'border-[#C47353]/40 focus:border-[#C47353]'
              : 'border-[#E8D5C0] focus:border-[#C47353]'
          }
        />
      );
    }

    return (
      <Input
        type={config.type}
        value={formData[config.key as keyof typeof formData] as string}
        onChange={(e) => setFormData((prev) => ({ ...prev, [config.key]: e.target.value }))}
        placeholder={`请输入${config.label}`}
        disabled={isPending}
        className={
          isChanged && !isPending
            ? 'border-[#C47353]/40 focus:border-[#C47353]'
            : 'border-[#E8D5C0] focus:border-[#C47353]'
        }
      />
    );
  };

  return (
    <div className="min-h-screen pb-32 bg-[#FAF7F2]">
      {/* ===== 顶栏 ===== */}
      <div className="sticky top-0 z-40 bg-[#FDF8F0]/95 backdrop-blur-xl border-b border-[#E8D5C0]/50">
        <div className="px-4 py-3 flex items-center justify-between max-w-2xl lg:max-w-4xl mx-auto">
          <Link href="/lawyer" className="text-sm text-[#8C7B6E] hover:text-[#C47353] transition-colors">
            ← 返回工作台
          </Link>
          <span className="text-[15px] font-semibold text-[#1C1917] font-serif tracking-wide">我的资料</span>
          <div className="w-14" />
        </div>
      </div>

      <div className="max-w-2xl lg:max-w-4xl mx-auto px-4 py-5 space-y-5">
        {/* ===== 律师身份摘要卡 ===== */}
        <div className="bg-[#FFFBF5] rounded-2xl border border-[#E8D5C0] overflow-hidden shadow-sm">
          <div className="h-[3px] bg-gradient-to-r from-[#C47353] via-[#D4957A] to-[#E8C4A8]" />
          <div className="p-4 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#D4957A] to-[#C47353] flex items-center justify-center text-white text-xl font-serif flex-shrink-0 shadow-md shadow-[#C47353]/20">
              {profile?.name?.charAt(0) || '律'}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-lg text-[#1C1917] font-serif">{profile?.name || '未填写姓名'}</h2>
              <p className="text-xs text-[#78716C]">{profile?.title || '律师'}</p>
            </div>
            <span className="text-[11px] bg-[#5C7A5A]/10 text-[#5C7A5A] px-3 py-1 rounded-full font-medium flex-shrink-0">
              已认证
            </span>
          </div>
        </div>

        {/* ===== 错误提示 ===== */}
        {error && (
          <div className="bg-[#C26565]/8 border border-[#C26565]/20 rounded-xl p-3 flex items-center gap-2 text-[#C26565] text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ===== 成功提示 ===== */}
        {submitSuccess && (
          <div className="bg-[#5C7A5A]/8 border border-[#5C7A5A]/20 rounded-xl p-3 flex items-center gap-2 text-[#5C7A5A] text-sm">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>修改申请已提交，等待平台审核（预计1-3个工作日）</span>
          </div>
        )}

        {/* ===== 审核说明 ===== */}
        <div className="bg-[#C47353]/5 border border-[#C47353]/12 rounded-xl p-3.5 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-[#C47353] flex-shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed">
            <p className="font-medium text-[#1C1917] mb-0.5">所有资料修改均需平台审核</p>
            <p className="text-[#78716C]">修改内容后点击「提交审核」，通过后生效。预计审核 1-3 个工作日。</p>
          </div>
        </div>

        {/* ===== 三组表单 ===== */}
        {[fieldConfig.basic, fieldConfig.contact, fieldConfig.professional].map((section) => (
          <div key={section.title} className="bg-[#FFFBF5] rounded-2xl border border-[#E8D5C0] overflow-hidden shadow-sm">
            <div className="h-[3px]" style={{ backgroundColor: section.color }} />
            <div className="p-4 lg:p-5">
              <div className="flex items-center gap-2.5 mb-4">
                <section.icon className="w-4 h-4" style={{ color: section.color }} />
                <h3 className="font-semibold text-sm text-[#1C1917]">{section.title}</h3>
                <span className="text-[10px] bg-[#C8963E]/10 text-[#C8963E] px-2 py-0.5 rounded-full font-medium ml-auto">
                  需审核
                </span>
              </div>
              <div className="space-y-4">
                {section.fields.map((field) => (
                  <div key={field.key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={field.key} className="text-xs font-medium text-[#78716C]">
                        {field.label}
                      </Label>
                      {hasPendingRevision(field.key) && (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-[#C8963E]/10 text-[#C8963E] px-2 py-0.5 rounded-full">
                          <Clock className="w-3 h-3" />
                          待审核
                        </span>
                      )}
                    </div>
                    {renderFieldInput(field)}
                    {hasFieldChange(field.key) && !hasPendingRevision(field.key) && (
                      <p className="text-[11px] text-[#C47353] font-medium">✓ 已修改，等待提交</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}

        {/* ===== 待审核记录 + 修改原因（桌面端并排） ===== */}
        <div className="lg:grid lg:grid-cols-2 lg:gap-4 space-y-5 lg:space-y-0">
          {/* 待审核记录 */}
          {pendingRevisions.length > 0 && (
            <div className="bg-[#FFFBF5] rounded-2xl border border-[#E8D5C0] overflow-hidden shadow-sm">
              <div className="h-[3px] bg-[#C8963E]" />
              <div className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4 text-[#C8963E]" />
                  <h3 className="font-semibold text-sm text-[#1C1917]">待审核记录</h3>
                  <span className="text-[10px] bg-[#C8963E]/15 text-[#C8963E] px-2 py-0.5 rounded-full font-medium">
                    {pendingRevisions.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {pendingRevisions.map((rev) => (
                    <div key={rev.id} className="flex items-center justify-between py-1.5 px-2 bg-[#FDF8F0] rounded-lg">
                      <span className="text-sm font-medium text-[#1C1917]">
                        {fieldLabels[rev.revision_type] || rev.revision_type}
                      </span>
                      <span className="text-[11px] text-[#A89B90]">{formatDate(rev.submitted_at)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 修改原因 */}
          <div className="bg-[#FFFBF5] rounded-2xl border border-[#E8D5C0] overflow-hidden shadow-sm">
            <div className="h-[3px] bg-[#7B4B8B]" />
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-[#7B4B8B]" />
                <h3 className="font-semibold text-sm text-[#1C1917]">修改原因</h3>
                <span className="text-[10px] bg-[#C26565]/10 text-[#C26565] px-2 py-0.5 rounded-full font-medium ml-auto">
                  必填
                </span>
              </div>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="请简要说明本次修改的原因（如：身份证更换、业务调整等）"
                rows={3}
                disabled={pendingRevisions.length > 0}
                className={
                  reason.trim()
                    ? 'border-[#7B4B8B]/40 focus:border-[#7B4B8B]'
                    : 'border-[#E8D5C0] focus:border-[#C47353]'
                }
              />
            </div>
          </div>
        </div>
      </div>

      {/* ===== 底部固定提交按钮 ===== */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 p-4"
        style={{
          background: 'rgba(250,247,242,0.88)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderTop: '1px solid rgba(200,180,160,0.25)',
          paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <div className="max-w-2xl lg:max-w-4xl mx-auto">
          <button
            onClick={handleSubmitReview}
            disabled={submitting || pendingRevisions.length > 0}
            className="w-full py-3.5 rounded-2xl font-medium text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] bg-[#C47353] text-white hover:bg-[#A85D40] shadow-lg shadow-[#C47353]/25 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                提交中…
              </>
            ) : pendingRevisions.length > 0 ? (
              <>
                <Clock className="w-4 h-4" />
                有待审核内容，请等待
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                提交审核
              </>
            )}
          </button>
        </div>
      </div>

      <LawyerBottomNav />
    </div>
  );
}
