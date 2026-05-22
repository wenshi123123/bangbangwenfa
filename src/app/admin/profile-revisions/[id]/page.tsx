'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, User, Clock, CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/use-auth';
import { adminApiRequest } from '@/lib/api/request';

interface Revision {
  id: number;
  lawyer_id: number;
  lawyer_name: string;
  lawyer_user_id: string;
  revision_type: string;
  old_value: string;
  new_value: string;
  reason: string;
  status: string;
  submitted_at: string;
  reviewed_at: string;
  review_comment: string;
}

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

export default function ProfileRevisionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [revision, setRevision] = useState<Revision | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');

  const fetchRevision = useCallback(async () => {
    try {
      const response = await adminApiRequest(`/api/admin/lawyer-profile-revisions/${params.id}`);
      const result = await response.json();
      if (result.success) {
        setRevision(result.data);
      } else {
        setError(result.error || '获取详情失败');
      }
    } catch (error) {
      console.error('获取详情失败:', error);
      setError('获取详情失败');
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    if (params.id) {
      fetchRevision();
    }
  }, [params.id, fetchRevision]);

  const handleReview = async (action: 'approve' | 'reject') => {
    if (action === 'reject' && !comment.trim()) {
      setError('请填写驳回原因');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const response = await adminApiRequest(`/api/admin/lawyer-profile-revisions/${params.id}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          comment: comment.trim(),
          adminId: user?.id || 'admin',
        }),
      });

      const result = await response.json();
      if (result.success) {
        router.push('/admin/profile-revisions');
      } else {
        setError(result.error || '操作失败');
      }
    } catch (error) {
      console.error('审核操作失败:', error);
      setError('操作失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const parseSpecialties = (value: string) => {
    if (!value) return [];
    try {
      return JSON.parse(value);
    } catch {
      return [];
    }
  };

  const getSpecialtyLabel = (value: string) => {
    const opt = specialtyOptions.find(o => o.value === value);
    return opt ? opt.label : value;
  };

  const renderValue = (type: string, value: string, isOld: boolean) => {
    if (!value) {
      return <span className="text-gray-400 italic">未填写</span>;
    }

    if (type === 'specialties') {
      const items = parseSpecialties(value);
      return (
        <div className="flex flex-wrap gap-1">
          {items.length > 0 ? (
            items.map((s: string) => (
              <Badge key={s} className={isOld ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-700'}>
                {getSpecialtyLabel(s)}
              </Badge>
            ))
          ) : (
            <span className="text-gray-400 italic">未填写</span>
          )}
        </div>
      );
    }

    return (
      <div className="whitespace-pre-wrap text-sm">{value}</div>
    );
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)' }}>
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!revision) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)' }}>
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">获取详情失败</h2>
            <p className="text-muted-foreground mb-4">{error || '记录不存在'}</p>
            <Link href="/admin/profile-revisions">
              <Button>返回列表</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isPending = revision.status === 'pending';

  return (
    <div className="min-h-screen pb-20" style={{ background: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)' }}>
      {/* 顶部导航栏 */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-200">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link href="/admin/profile-revisions" className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900">
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-medium">返回列表</span>
            </Link>
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              <span className="text-base font-semibold text-gray-900">审核详情</span>
            </div>
            <div className="w-28" />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-3xl space-y-6">
        {/* 错误提示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* 基本信息 */}
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="text-base">申请信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">律师姓名：</span>
                <span className="font-medium">{revision.lawyer_name || '未知'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">律师ID：</span>
                <span className="font-medium">{revision.lawyer_id}</span>
              </div>
              <div>
                <span className="text-muted-foreground">修改字段：</span>
                <span className="font-medium text-blue-600">
                  {fieldLabels[revision.revision_type] || revision.revision_type}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">提交时间：</span>
                <span>{formatDate(revision.submitted_at)}</span>
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">当前状态：</span>
              <Badge className={
                revision.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                revision.status === 'approved' ? 'bg-green-100 text-green-700' :
                'bg-red-100 text-red-700'
              }>
                {revision.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                {revision.status === 'approved' && <CheckCircle className="w-3 h-3 mr-1" />}
                {revision.status === 'rejected' && <XCircle className="w-3 h-3 mr-1" />}
                {revision.status === 'pending' ? '待审核' : revision.status === 'approved' ? '已通过' : '已驳回'}
              </Badge>
            </div>
            {revision.reason && (
              <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-purple-600 font-medium">修改原因</span>
                </div>
                <p className="text-gray-700 whitespace-pre-wrap">{revision.reason}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 修改对比 */}
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="text-base">修改内容对比</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <XCircle className="w-4 h-4 text-gray-500" />
                  <span className="font-medium text-gray-600">原值</span>
                </div>
                <div className="min-h-[60px]">
                  {renderValue(revision.revision_type, revision.old_value, true)}
                </div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="font-medium text-green-600">新值</span>
                </div>
                <div className="min-h-[60px]">
                  {renderValue(revision.revision_type, revision.new_value, false)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 审核操作 */}
        {isPending ? (
          <Card className="border-blue-200">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-blue-600" />
                审核操作
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="comment">审核备注（驳回时必填）</Label>
                <Textarea
                  id="comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="请输入审核备注，通过时可留空，驳回时请说明原因"
                  rows={3}
                />
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                  onClick={() => handleReview('reject')}
                  disabled={submitting}
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <XCircle className="w-4 h-4 mr-2" />
                  )}
                  驳回
                </Button>
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={() => handleReview('approve')}
                  disabled={submitting}
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  )}
                  通过
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle className="text-base">审核结果</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm">
                <span className="text-muted-foreground">审核时间：</span>
                <span>{revision.reviewed_at ? formatDate(revision.reviewed_at) : '-'}</span>
              </div>
              {revision.review_comment && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <span className="text-muted-foreground text-sm">审核备注：</span>
                  <p className="mt-1 text-sm">{revision.review_comment}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
