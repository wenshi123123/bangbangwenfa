'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, FileText, Clock, CheckCircle, XCircle, Loader2, Filter } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';
import { adminApiRequest } from '@/lib/api/request';

interface Revision {
  id: number;
  lawyer_id: number;
  lawyer_name: string;
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

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  pending: { label: '待审核', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  approved: { label: '已通过', color: 'text-green-600', bgColor: 'bg-green-100' },
  rejected: { label: '已驳回', color: 'text-red-600', bgColor: 'bg-red-100' },
};

export default function ProfileRevisionsPage() {
  const { user, isLoading } = useAuth();
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [pendingCount, setPendingCount] = useState(0);

  const fetchRevisions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }
      const response = await adminApiRequest(`/api/admin/lawyer-profile-revisions?${params}`);
      const result = await response.json();
      if (result.success) {
        setRevisions(result.revisions || []);
        setPendingCount(result.revisions ? result.revisions.filter((r: Revision) => r.status === 'pending').length : 0);
      }
    } catch (error) {
      console.error('获取审核列表失败:', error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchRevisions();
  }, [fetchRevisions]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const parseValue = (value: string, type: string) => {
    if (!value) return '空';
    if (type === 'specialties') {
      try {
        const arr = JSON.parse(value);
        return arr.length > 0 ? arr.join('、') : '空';
      } catch {
        return value;
      }
    }
    return value.length > 20 ? value.substring(0, 20) + '...' : value;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 — 不再 sticky，复用 layout 导航栏 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">律师资料修改审核</h1>
          <p className="text-slate-500 mt-1 text-sm">审核律师提交的资料修改申请</p>
        </div>
        <Link 
          href="/admin/dashboard"
          className="self-start inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="w-4 h-4" />
          返回工作台
        </Link>
      </div>

      <div>
        {/* 统计卡片 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
          <Card className="border-gray-200">
            <CardContent className="pt-4 pb-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Clock className="w-5 h-5 text-yellow-500" />
                <span className="text-2xl font-bold">{pendingCount}</span>
              </div>
              <p className="text-sm text-muted-foreground">待审核</p>
            </CardContent>
          </Card>
          <Card className="border-gray-200">
            <CardContent className="pt-4 pb-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-2xl font-bold">
                  {revisions.filter(r => r.status === 'approved').length}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">已通过</p>
            </CardContent>
          </Card>
          <Card className="border-gray-200">
            <CardContent className="pt-4 pb-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <XCircle className="w-5 h-5 text-red-500" />
                <span className="text-2xl font-bold">
                  {revisions.filter(r => r.status === 'rejected').length}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">已驳回</p>
            </CardContent>
          </Card>
        </div>

        {/* 状态筛选 */}
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-600">状态筛选：</span>
          {['all', 'pending', 'approved', 'rejected'].map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(status)}
              className={statusFilter === status ? 'bg-blue-600' : ''}
            >
              {status === 'all' ? '全部' : statusConfig[status].label}
            </Button>
          ))}
        </div>

        {/* 列表 */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : revisions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">暂无审核记录</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {revisions.map((revision) => {
              const statusInfo = statusConfig[revision.status] || statusConfig.pending;
              return (
                <Card key={revision.id} className="border-gray-200 hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium">{revision.lawyer_name || '未知律师'}</span>
                          <Badge className={statusInfo.bgColor + ' ' + statusInfo.color}>
                            {revision.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                            {statusInfo.label}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">修改字段：</span>
                            <span className="font-medium">{fieldLabels[revision.revision_type] || revision.revision_type}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">原值：</span>
                            <span className="text-gray-600">{parseValue(revision.old_value, revision.revision_type)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">新值：</span>
                            <span className="text-blue-600">{parseValue(revision.new_value, revision.revision_type)}</span>
                          </div>
                        </div>
                        {revision.reason && (
                          <div className="mt-2 p-2 bg-purple-50 rounded text-sm">
                            <span className="text-purple-600 font-medium">修改原因：</span>
                            <span className="text-gray-700">{revision.reason}</span>
                          </div>
                        )}
                        <div className="mt-2 text-xs text-muted-foreground">
                          提交时间：{formatDate(revision.submitted_at)}
                          {revision.reviewed_at && (
                            <> | 审核时间：{formatDate(revision.reviewed_at)}</>
                          )}
                        </div>
                        {revision.review_comment && (
                          <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-600">
                            审核备注：{revision.review_comment}
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        {revision.status === 'pending' ? (
                          <Link href={`/admin/profile-revisions/${revision.id}`}>
                            <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                              审核
                            </Button>
                          </Link>
                        ) : (
                          <Link href={`/admin/profile-revisions/${revision.id}`}>
                            <Button size="sm" variant="outline">
                              查看
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
