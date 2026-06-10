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
import { Button } from '@/components/ui/button';
import { useLawyerAuth } from '@/hooks/use-lawyer-auth';
import { LawyerBottomNav } from '@/components/lawyer/lawyer-bottom-nav';
import { cityGroups } from '@/lib/city-data';

interface LawyerProfile {
  id: string;
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
  city: string;
  avatar_url: string;
  status: string;
  gender?: string;
  law_firm?: string;
  education?: string;
  graduated_school?: string;
}

interface PendingRevision {
  id: string;
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
      { key: 'gender', label: '性别', type: 'gender' },
      { key: 'law_firm', label: '所属律所', type: 'text' },
      { key: 'license_no', label: '执业证号', type: 'text' },
      { key: 'education', label: '最高学历', type: 'education' },
      { key: 'graduated_school', label: '毕业院校', type: 'text' },
      { key: 'working_years', label: '从业年限', type: 'number' },
      { key: 'city', label: '所在城市', type: 'city' },
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
    ],
  },
  professional: {
    title: '专业信息',
    icon: Shield,
    color: '#7B4B8B',
    fields: [
      { key: 'title', label: '头衔/职称', type: 'title' },
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
  gender: '性别',
  law_firm: '所属律所',
  license_no: '执业证号',
  education: '最高学历',
  graduated_school: '毕业院校',
  working_years: '从业年限',
  city: '所在城市',
  phone: '手机号',
  email: '邮箱',
  wechat: '微信号',
  title: '头衔/职称',
  specialties: '擅长领域',
  intro: '个人简介',
};

const genderOptions = ['男', '女'];
const titleOptions = ['专职律师', '兼职律师', '普通合伙人', '高级合伙人'];
const educationOptions = ['专科', '本科', '硕士研究生', '博士研究生'];

export default function LawyerProfilePage() {
  const { user, isAuthorized, isLoading: authLoading, lawyerId, getAuthHeaders, accountStatus } =
    useLawyerAuth();
  const [profile, setProfile] = useState<LawyerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [error, setError] = useState('');
  const [pendingRevisions, setPendingRevisions] = useState<PendingRevision[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    gender: '',
    law_firm: '',
    license_no: '',
    education: '',
    graduated_school: '',
    working_years: '',
    city: '',
    phone: '',
    email: '',
    wechat: '',
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
          gender: lawyer.gender || '',
          law_firm: lawyer.law_firm || '',
          license_no: lawyer.license_no || '',
          education: lawyer.education || '',
          graduated_school: lawyer.graduated_school || '',
          working_years: lawyer.working_years?.toString() || '',
          city: lawyer.city || '',
          phone: lawyer.phone || '',
          email: lawyer.email || '',
          wechat: lawyer.wechat || '',
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

    // 🔒 P0-3 方案A：审核中禁止再次提交敏感字段修改
    if (accountStatus === 'pending_review') {
      setError('您有资料修改正在审核中，请等待管理员审核完成后再提交新的修改。');
      return;
    }

    const changedFields: Array<{ field: string; oldValue: string; newValue: string }> = [];
    const checkFields = [
      'name', 'gender', 'law_firm', 'license_no',
      'education', 'graduated_school',
      'working_years', 'city',
      'phone', 'email', 'wechat',
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

    // 🔒 格式校验：手机号必须11位数字，执业证号必须17位数字
    for (const item of changedFields) {
      if (item.field === 'phone' && item.newValue && !/^\d{11}$/.test(item.newValue)) {
        setError('手机号必须为11位数字');
        return;
      }
      if (item.field === 'license_no' && item.newValue && !/^\d{17}$/.test(item.newValue)) {
        setError('执业证号必须为17位数字');
        return;
      }
    }

    setSubmitting(true);
    setError('');

    try {
      const batchId = crypto.randomUUID();
      const reqHeaders: HeadersInit = {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      };
      const response = await fetch('/api/lawyer/profile/submit-review', {
        method: 'POST',
        headers: reqHeaders,
        body: JSON.stringify({
          lawyerId,
          batchId,
          reason: reason.trim(),
          changes: changedFields.map((item) => ({
            field: item.field,
            oldValue: item.oldValue,
            newValue: item.newValue,
          })),
        }),
      });
      const result = await response.json();
      if (!result.success) {
        setError(result.error || '提交失败');
        setSubmitting(false);
        return;
      }
      setSubmitSuccess(true);
      setShowSuccessModal(true);
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
        <div className="bg-[#FFFBF5] rounded-xl p-8 shadow-lg max-w-sm w-full text-center border border-[#E8D5C0]">
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

    // 性别
    if (config.type === 'gender') {
      return (
        <div className="flex gap-3">
          {genderOptions.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, gender: option }))}
              disabled={isPending}
              className={`flex-1 py-2.5 rounded-xl border-2 font-medium text-sm transition-all duration-200 ${
                formData.gender === option
                  ? 'border-[#C47353] bg-[#C47353]/8 text-[#C47353]'
                  : 'border-[#E8D5C0] bg-white text-[#78716C] hover:border-[#C47353]/30'
              } ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {option}
            </button>
          ))}
        </div>
      );
    }

    // 头衔/职称（单选）
    if (config.type === 'title') {
      return (
        <div className="grid grid-cols-2 gap-2">
          {titleOptions.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, title: option }))}
              disabled={isPending}
              className={`py-2.5 rounded-xl border-2 font-medium text-sm transition-all duration-200 ${
                formData.title === option
                  ? 'border-[#C47353] bg-[#C47353]/8 text-[#C47353]'
                  : 'border-[#E8D5C0] bg-white text-[#78716C] hover:border-[#C47353]/30'
              } ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {option}
            </button>
          ))}
        </div>
      );
    }

    // 最高学历
    if (config.type === 'education') {
      return (
        <select
          value={formData.education}
          onChange={(e) => setFormData((prev) => ({ ...prev, education: e.target.value }))}
          disabled={isPending}
          className={`w-full px-4 py-2.5 rounded-xl border-2 bg-white text-sm transition-all duration-200 appearance-none cursor-pointer ${
            isChanged && !isPending
              ? 'border-[#C47353]/40 focus:border-[#C47353]'
              : 'border-[#E8D5C0] focus:border-[#C47353]'
          } ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23A89B90' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 14px center',
            paddingRight: '40px',
          }}
        >
          <option value="">请选择最高学历</option>
          {educationOptions.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      );
    }

    // 所在城市（省级-地级市二级联动）
    if (config.type === 'city') {
      const provinces = cityGroups.map((g) => g.province);
      const currentProvince = cityGroups.find((g) => g.cities.includes(formData.city))?.province;
      const cityList = currentProvince
        ? cityGroups.find((g) => g.province === currentProvince)!.cities
        : [];
      return (
        <div className="space-y-2">
          {/* 省 */}
          <select
            value={currentProvince || ''}
            onChange={(e) => {
              const province = e.target.value;
              if (province) {
                setFormData((prev) => ({
                  ...prev,
                  city: cityGroups.find((g) => g.province === province)!.cities[0],
                }));
              } else {
                setFormData((prev) => ({ ...prev, city: '' }));
              }
            }}
            disabled={isPending}
            className={`w-full px-4 py-2.5 rounded-xl border-2 bg-white text-sm transition-all duration-200 appearance-none cursor-pointer ${
              isChanged && !isPending
                ? 'border-[#C47353]/40 focus:border-[#C47353]'
                : 'border-[#E8D5C0] focus:border-[#C47353]'
            } ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23A89B90' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 14px center',
              paddingRight: '40px',
            }}
          >
            <option value="">请选择省份</option>
            {cityGroups.map((g) => (
              <option key={g.province} value={g.province}>{g.province}</option>
            ))}
          </select>
          {/* 市 */}
          {currentProvince && (
            <select
              value={formData.city}
              onChange={(e) => setFormData((prev) => ({ ...prev, city: e.target.value }))}
              disabled={isPending}
              className={`w-full px-4 py-2.5 rounded-xl border-2 bg-white text-sm transition-all duration-200 appearance-none cursor-pointer ${
                isChanged && !isPending
                  ? 'border-[#C47353]/40 focus:border-[#C47353]'
                  : 'border-[#E8D5C0] focus:border-[#C47353]'
              } ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23A89B90' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 14px center',
                paddingRight: '40px',
              }}
            >
              {cityList.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
              <option value="其他城市">其他城市</option>
            </select>
          )}
        </div>
      );
    }

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
                    ? 'bg-[#C47353] text-white shadow-[0_2px_8px_rgba(61,50,45,0.06)] shadow-[#C47353]/20'
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
        type={config.key === 'phone' || config.key === 'license_no' ? 'text' : config.type}
        inputMode={config.key === 'phone' || config.key === 'license_no' ? 'numeric' : undefined}
        value={formData[config.key as keyof typeof formData] as string}
        onChange={(e) => {
          let value = e.target.value;
          // 手机号只允许数字，最多11位
          if (config.key === 'phone') {
            value = value.replace(/\D/g, '').slice(0, 11);
          }
          // 执业证号只允许数字，最多17位
          if (config.key === 'license_no') {
            value = value.replace(/\D/g, '').slice(0, 17);
          }
          setFormData((prev) => ({ ...prev, [config.key]: value }));
        }}
        placeholder={
          config.key === 'phone' ? '请输入11位手机号' :
          config.key === 'license_no' ? '请输入17位执业证号' :
          `请输入${config.label}`
        }
        maxLength={config.key === 'phone' ? 11 : config.key === 'license_no' ? 17 : undefined}
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
    <div className="min-h-screen pb-24 lg:pb-8 bg-[#FAF7F2]">
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
        <div className="bg-[#FFFBF5] rounded-xl border border-[#E8D5C0] overflow-hidden shadow-[0_2px_8px_rgba(61,50,45,0.06)]">
          <div className="h-[3px] bg-gradient-to-r from-[#C47353] via-[#D4957A] to-[#E8C4A8]" />
          <div className="p-4 flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#D4957A] to-[#C47353] flex items-center justify-center text-white text-xl font-serif flex-shrink-0 shadow-md shadow-[#C47353]/20">
              {profile?.name?.charAt(0) || '律'}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-lg text-[#1C1917] font-serif">{profile?.name || '未填写姓名'}</h2>
              <p className="text-xs text-[#78716C]">{profile?.title || '律师'}</p>
              {(profile?.license_no || profile?.law_firm) && (
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[11px] text-[#A89B90]">
                  {profile?.license_no && <span>执业证号 {profile.license_no}</span>}
                  {profile?.law_firm && <span>｜ {profile.law_firm}</span>}
                </div>
              )}
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
          <div key={section.title} className="bg-[#FFFBF5] rounded-xl border border-[#E8D5C0] overflow-hidden shadow-[0_2px_8px_rgba(61,50,45,0.06)]">
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
            <div className="bg-[#FFFBF5] rounded-xl border border-[#E8D5C0] overflow-hidden shadow-[0_2px_8px_rgba(61,50,45,0.06)]">
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
          <div className="bg-[#FFFBF5] rounded-xl border border-[#E8D5C0] overflow-hidden shadow-[0_2px_8px_rgba(61,50,45,0.06)]">
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

        {/* ===== 提交审核按钮 ===== */}
        <div className="pt-2">
          {/* 🔒 P0-3 方案A：审核中提示 */}
          {accountStatus === 'pending_review' && (
            <div className="mb-3 flex items-start gap-2 p-3 bg-amber-50 border border-amber-200/70 rounded-lg">
              <Clock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                您有资料修改正在审核中，审核完成前无法提交新的修改。
              </p>
            </div>
          )}
          <button
            onClick={handleSubmitReview}
            disabled={submitting || showSuccessModal || pendingRevisions.length > 0 || accountStatus === 'pending_review'}
            className="w-full py-3.5 rounded-xl font-medium text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] bg-[#C47353] text-white hover:bg-[#A85D40] shadow-lg shadow-[#C47353]/25 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                提交中…
              </>
            ) : accountStatus === 'pending_review' ? (
              <>
                <Clock className="w-4 h-4" />
                资料审核中，请等待
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

      {/* ===== 提交成功弹窗 ===== */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl text-center">
            <div className="w-16 h-16 rounded-full bg-[#5C7A5A]/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-9 h-9 text-[#5C7A5A]" />
            </div>
            <h3 className="text-lg font-bold text-[#1C1917] mb-2 font-serif">提交成功</h3>
            <p className="text-sm text-[#78716C] mb-6 leading-relaxed">
              您的资料修改申请已成功提交，平台将在 <span className="font-medium text-[#1C1917]">1-3 个工作日</span> 内完成审核，请耐心等待。
            </p>
            <Button
              onClick={() => {
                setShowSuccessModal(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="w-full bg-[#C47353] hover:bg-[#A85D40] text-white"
            >
              我知道了
            </Button>
          </div>
        </div>
      )}

      <LawyerBottomNav />
    </div>
  );
}
