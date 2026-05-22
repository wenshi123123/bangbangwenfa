'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, User, Shield, Award, Clock, CheckCircle, Loader2, Save, AlertCircle, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';

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

// 字段配置
const fieldConfig = {
  // 基本信息 - 需要审核
  basic: {
    title: '基本信息',
    icon: Award,
    color: 'border-gray-200',
    fields: [
      { key: 'name', label: '姓名', type: 'text' },
      { key: 'working_years', label: '从业年限', type: 'number' },
      { key: 'license_no', label: '执业证号', type: 'text' },
    ],
  },
  // 联系方式 - 需要审核
  contact: {
    title: '联系方式',
    icon: User,
    color: 'border-blue-200',
    fields: [
      { key: 'phone', label: '手机号', type: 'text' },
      { key: 'email', label: '邮箱', type: 'email' },
      { key: 'wechat', label: '微信号', type: 'text' },
      { key: 'wechat_id', label: '微信ID', type: 'text' },
    ],
  },
  // 专业信息 - 需要审核
  professional: {
    title: '专业信息',
    icon: Shield,
    color: 'border-orange-200',
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

const fieldTypeMap: Record<string, string> = {
  name: 'basic',
  working_years: 'basic',
  license_no: 'basic',
  phone: 'contact',
  email: 'contact',
  wechat: 'contact',
  wechat_id: 'contact',
  title: 'professional',
  specialties: 'professional',
  intro: 'professional',
};

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
  const { user, isLoggedIn, isLoading } = useAuth();
  const [profile, setProfile] = useState<LawyerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [error, setError] = useState('');
  const [pendingRevisions, setPendingRevisions] = useState<PendingRevision[]>([]);

  // 表单状态
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

  // 修改原因
  const [reason, setReason] = useState('');

  // 获取律师资料
  const fetchProfile = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      
      const response = await fetch('/api/lawyer/profile', { headers });
      const result = await response.json();
      if (result.success && result.data) {
        const lawyer = result.data;
        setProfile(lawyer);
        setFormData({
          name: lawyer.name || '',
          working_years: lawyer.working_years?.toString() || '',
          license_no: lawyer.license_no || '',
          phone: lawyer.phone || '',
          email: lawyer.email || '',
          wechat: lawyer.wechat || '',
          wechat_id: lawyer.wechat_id || '',
          title: lawyer.title || '',
          intro: lawyer.intro || '',
          specialties: lawyer.specialties || [],
        });
      }
    } catch (error) {
      console.error('获取律师资料失败:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // 获取待审核记录
  const fetchPendingRevisions = useCallback(async () => {
    if (!user?.lawyerId) return;
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      
      const response = await fetch(`/api/lawyer/profile/submit-review?lawyerId=${user.lawyerId}`, { headers });
      if (!response.ok) {
        console.warn('获取待审核记录失败: HTTP', response.status);
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
        setPendingRevisions(result.data.filter((r: PendingRevision) => r.status === 'pending'));
      }
    } catch (error) {
      console.error('获取待审核记录失败:', error);
      setPendingRevisions([]);
    }
  }, [user?.lawyerId]);

  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      window.dispatchEvent(new CustomEvent('open-login-modal'));
      return;
    }
  }, [isLoading, isLoggedIn]);

  useEffect(() => {
    if (!isLoading && isLoggedIn && user?.lawyerId) {
      fetchProfile();
      fetchPendingRevisions();
    } else if (!isLoading) {
      setLoading(false);
    }
  }, [isLoading, isLoggedIn, user?.lawyerId, fetchProfile, fetchPendingRevisions]);

  // 检查某个字段是否有待审核
  const hasPendingRevision = (key: string): boolean => {
    return pendingRevisions.some(r => r.revision_type === key);
  };

  // 检查某个字段是否有修改
  const hasFieldChange = (key: string): boolean => {
    if (!profile) return false;
    const oldValue = profile[key as keyof LawyerProfile];
    const newValue = formData[key as keyof typeof formData];
    if (Array.isArray(oldValue) && Array.isArray(newValue)) {
      return JSON.stringify(oldValue) !== JSON.stringify(newValue);
    }
    return String(oldValue || '') !== String(newValue || '');
  };

  // 提交审核
  const handleSubmitReview = async () => {
    if (!user?.lawyerId) return;

    // 收集所有修改的字段
    const changedFields: Array<{ field: string; oldValue: string; newValue: string }> = [];

    // 基本信息
    if (hasFieldChange('name')) {
      changedFields.push({
        field: 'name',
        oldValue: profile?.name || '',
        newValue: formData.name,
      });
    }
    if (hasFieldChange('working_years')) {
      changedFields.push({
        field: 'working_years',
        oldValue: profile?.working_years?.toString() || '',
        newValue: formData.working_years,
      });
    }
    if (hasFieldChange('license_no')) {
      changedFields.push({
        field: 'license_no',
        oldValue: profile?.license_no || '',
        newValue: formData.license_no,
      });
    }

    // 联系方式
    if (hasFieldChange('phone')) {
      changedFields.push({
        field: 'phone',
        oldValue: profile?.phone || '',
        newValue: formData.phone,
      });
    }
    if (hasFieldChange('email')) {
      changedFields.push({
        field: 'email',
        oldValue: profile?.email || '',
        newValue: formData.email,
      });
    }
    if (hasFieldChange('wechat')) {
      changedFields.push({
        field: 'wechat',
        oldValue: profile?.wechat || '',
        newValue: formData.wechat,
      });
    }
    if (hasFieldChange('wechat_id')) {
      changedFields.push({
        field: 'wechat_id',
        oldValue: profile?.wechat_id || '',
        newValue: formData.wechat_id,
      });
    }

    // 专业信息
    if (hasFieldChange('title')) {
      changedFields.push({
        field: 'title',
        oldValue: profile?.title || '',
        newValue: formData.title,
      });
    }
    if (hasFieldChange('specialties')) {
      changedFields.push({
        field: 'specialties',
        oldValue: JSON.stringify(profile?.specialties || []),
        newValue: JSON.stringify(formData.specialties),
      });
    }
    if (hasFieldChange('intro')) {
      changedFields.push({
        field: 'intro',
        oldValue: profile?.intro || '',
        newValue: formData.intro,
      });
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
      // 逐一提交每个字段的修改
      for (const item of changedFields) {
        // 跳过已有待审核的字段
        if (hasPendingRevision(item.field)) continue;

        const token = localStorage.getItem('token');
        const reqHeaders: HeadersInit = { 'Content-Type': 'application/json' };
        if (token) reqHeaders['Authorization'] = `Bearer ${token}`;
        
        const response = await fetch('/api/lawyer/profile/submit-review', {
          method: 'POST',
          headers: reqHeaders,
          body: JSON.stringify({
            lawyerId: user.lawyerId,
            lawyerUserId: user.id,
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
    } catch (error) {
      console.error('提交失败:', error);
      setError('提交失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  // 擅长领域切换
  const toggleSpecialty = (value: string) => {
    setFormData(prev => ({
      ...prev,
      specialties: prev.specialties.includes(value)
        ? prev.specialties.filter(s => s !== value)
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

  // 统计待审核字段
  const pendingFields = pendingRevisions.map(r => r.revision_type);

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FEF3E2 0%, #FFF7ED 50%, #FEF3E2 100%)' }}>
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!isLoggedIn || !user?.isLawyer) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #FEF3E2 0%, #FFF7ED 50%, #FEF3E2 100%)' }}>
        <Card className="max-w-sm">
          <CardContent className="pt-6 text-center">
            <User className="w-12 h-12 text-orange-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">请先登录</h2>
            <p className="text-muted-foreground mb-4">登录后即可编辑您的资料</p>
            <Button onClick={() => window.dispatchEvent(new CustomEvent('open-login-modal'))}>
              手机号登录
            </Button>
          </CardContent>
        </Card>
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
                className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                  formData.specialties.includes(option.value)
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                } ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="text-xs text-muted-foreground">
            已选：{formData.specialties.length} 个领域
          </div>
        </div>
      );
    }

    if (config.type === 'textarea') {
      return (
        <Textarea
          value={formData[config.key as keyof typeof formData] as string}
          onChange={(e) => setFormData(prev => ({ ...prev, [config.key]: e.target.value }))}
          placeholder={`请输入${config.label}`}
          rows={4}
          disabled={isPending}
          className={isChanged && !isPending ? 'border-orange-300' : ''}
        />
      );
    }

    if (config.type === 'number') {
      return (
        <Input
          type="number"
          value={formData[config.key as keyof typeof formData] as string}
          onChange={(e) => setFormData(prev => ({ ...prev, [config.key]: e.target.value }))}
          placeholder={`请输入${config.label}`}
          disabled={isPending}
          className={isChanged && !isPending ? 'border-orange-300' : ''}
        />
      );
    }

    return (
      <Input
        type={config.type}
        value={formData[config.key as keyof typeof formData] as string}
        onChange={(e) => setFormData(prev => ({ ...prev, [config.key]: e.target.value }))}
        placeholder={`请输入${config.label}`}
        disabled={isPending}
        className={isChanged && !isPending ? 'border-orange-300' : ''}
      />
    );
  };

  return (
    <div className="min-h-screen pb-32" style={{ background: 'linear-gradient(135deg, #FEF3E2 0%, #FFF7ED 50%, #FEF3E2 100%)' }}>
      {/* 顶部导航栏 */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-orange-100/50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link href="/lawyer" className="flex items-center gap-1.5 text-orange-600">
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-medium">返回</span>
            </Link>
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-orange-600" />
              <span className="text-base font-semibold text-orange-600">我的资料</span>
            </div>
            <div className="w-16" />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* 错误提示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* 提交成功提示 */}
        {submitSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2 text-green-700">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">修改申请已提交，等待平台审核（预计1-3个工作日）</span>
          </div>
        )}

        {/* 提示信息 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-start gap-2 text-blue-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium mb-1">所有资料修改均需平台审核</p>
              <p className="text-blue-600">修改内容后点击&ldquo;提交审核&rdquo;，审核通过后生效。预计审核时间1-3个工作日。</p>
            </div>
          </div>
        </div>

        {/* 卡片1：基本信息 */}
        <Card className={fieldConfig.basic.color}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <fieldConfig.basic.icon className="w-5 h-5 text-gray-600" />
              {fieldConfig.basic.title}
              <Badge variant="outline" className="ml-2 text-xs bg-amber-50">需审核</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {fieldConfig.basic.fields.map((field) => (
              <div key={field.key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor={field.key}>{field.label}</Label>
                  {hasPendingRevision(field.key) && (
                    <Badge className="bg-yellow-100 text-yellow-700">
                      <Clock className="w-3 h-3 mr-1" />
                      待审核
                    </Badge>
                  )}
                </div>
                {renderFieldInput(field)}
                {hasFieldChange(field.key) && !hasPendingRevision(field.key) && (
                  <p className="text-xs text-orange-600">已修改，等待提交</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* 卡片2：联系方式 */}
        <Card className={fieldConfig.contact.color}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <fieldConfig.contact.icon className="w-5 h-5 text-blue-600" />
              {fieldConfig.contact.title}
              <Badge variant="outline" className="ml-2 text-xs bg-amber-50">需审核</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {fieldConfig.contact.fields.slice(0, 2).map((field) => (
                <div key={field.key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={field.key}>{field.label}</Label>
                    {hasPendingRevision(field.key) && (
                      <Badge className="bg-yellow-100 text-yellow-700 text-xs">
                        <Clock className="w-3 h-3 mr-1" />
                        待审核
                      </Badge>
                    )}
                  </div>
                  {renderFieldInput(field)}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4">
              {fieldConfig.contact.fields.slice(2).map((field) => (
                <div key={field.key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={field.key}>{field.label}</Label>
                    {hasPendingRevision(field.key) && (
                      <Badge className="bg-yellow-100 text-yellow-700 text-xs">
                        <Clock className="w-3 h-3 mr-1" />
                        待审核
                      </Badge>
                    )}
                  </div>
                  {renderFieldInput(field)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 卡片3：专业信息 */}
        <Card className={fieldConfig.professional.color}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <fieldConfig.professional.icon className="w-5 h-5 text-orange-600" />
              {fieldConfig.professional.title}
              <Badge variant="outline" className="ml-2 text-xs bg-amber-50">需审核</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {fieldConfig.professional.fields.map((field) => (
              <div key={field.key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor={field.key}>{field.label}</Label>
                  {hasPendingRevision(field.key) && (
                    <Badge className="bg-yellow-100 text-yellow-700">
                      <Clock className="w-3 h-3 mr-1" />
                      待审核
                    </Badge>
                  )}
                </div>
                {renderFieldInput(field)}
                {hasFieldChange(field.key) && !hasPendingRevision(field.key) && (
                  <p className="text-xs text-orange-600">已修改，等待提交</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* 待审核记录 */}
        {pendingRevisions.length > 0 && (
          <Card className="border-yellow-200">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-5 h-5 text-yellow-600" />
                待审核记录
                <Badge className="ml-2 bg-yellow-100 text-yellow-700">{pendingRevisions.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {pendingRevisions.map((rev) => (
                  <div key={rev.id} className="flex items-center justify-between p-2 bg-yellow-50 rounded-lg">
                    <span className="font-medium text-yellow-800">
                      {fieldLabels[rev.revision_type] || rev.revision_type}
                    </span>
                    <Badge className="bg-yellow-100 text-yellow-700">
                      <Clock className="w-3 h-3 mr-1" />
                      {formatDate(rev.submitted_at)}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 修改原因 */}
        <Card className="border-purple-200">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-600" />
              修改原因
              <Badge variant="outline" className="ml-2 text-xs bg-red-50 text-red-600">必填</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="请简要说明本次修改的原因（如：身份证更换、业务调整等）"
              rows={3}
              disabled={pendingRevisions.length > 0}
              className={reason.trim() ? 'border-purple-300' : ''}
            />
          </CardContent>
        </Card>
      </div>

      {/* 底部固定按钮 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-50">
        <div className="container mx-auto max-w-2xl">
          <Button
            onClick={handleSubmitReview}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
            disabled={submitting || pendingRevisions.length > 0}
            size="lg"
          >
            {submitting ? (
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
            ) : (
              <Shield className="w-5 h-5 mr-2" />
            )}
            {submitting ? '提交中...' : pendingRevisions.length > 0 ? '有待审核内容，请等待' : '提交审核'}
          </Button>
        </div>
      </div>
    </div>
  );
}
