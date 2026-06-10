'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Phone,
  Building2,
  Award,
  GraduationCap,
  Image as ImageIcon,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { adminApiRequest } from '@/lib/api/request';

// 辅助函数：安全解析可能为字符串或数组的JSON字段
function safeParseArray(value: string[] | string | null | undefined): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
}

interface LawyerApplication {
  id: string;
  user_id: string;
  name: string;
  gender: string;
  law_firm: string;
  license_number: string;
  specialties: string[];
  education: string;
  graduated_school: string;
  working_years: number;
  city: string;
  phone: string;
  wechat: string;
  license_images: string[];
  id_card_images: string[];
  education_images: string[];
  package_type: string;
  package_price: number;
  payment_status: string;
  review_status: string;
  review_remark: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

const statusMap = {
  pending: { label: '待审核', color: 'bg-amber-100 text-amber-700', icon: Clock },
  approved: { label: '已通过', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  rejected: { label: '已拒绝', color: 'bg-red-100 text-red-700', icon: XCircle },
  paid: { label: '待支付', color: 'bg-blue-100 text-blue-700', icon: Clock },
};

const packageMap: Record<string, { label: string; price: number }> = {
  civil_premium: { label: '民事律师（臻选）', price: 500000 },
  criminal_premium: { label: '刑事律师（臻选）', price: 800000 },
  civil: { label: '民事律师（臻选）', price: 500000 },
  criminal: { label: '刑事律师（臻选）', price: 800000 },
};

export default function LawyerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  
  const [application, setApplication] = useState<LawyerApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const response = await adminApiRequest(`/api/admin/lawyer/detail/${id}`);
        const result = await response.json();
        if (result.success) {
          setApplication(result.data);
        }
      } catch (error) {
        console.error('获取详情失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [id]);

  const handleReview = async (action: 'approve' | 'reject') => {
    if (action === 'reject' && !rejectReason.trim()) {
      alert('请填写拒绝原因');
      return;
    }

    setActionLoading(true);
    try {
      const response = await adminApiRequest('/api/admin/lawyer/review', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: id,
          action,
          reason: rejectReason,
        })
      });

      const result = await response.json();
      if (result.success) {
        alert(result.message);
        router.push('/admin/lawyer');
      } else {
        alert(result.error || '操作失败');
      }
    } catch (error) {
      console.error('审核操作失败:', error);
      const message = error instanceof Error ? error.message : '操作失败，请重试';
      alert(message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-green-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-500">加载中...</p>
        </div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-slate-600">申请不存在</p>
        <Link href="/admin/lawyer" className="text-green-600 hover:underline mt-4 inline-block">
          返回列表
        </Link>
      </div>
    );
  }

  const status = statusMap[application.review_status as keyof typeof statusMap] || statusMap.pending;
  const StatusIcon = status.icon;
  const pkg = packageMap[application.package_type as keyof typeof packageMap] || { label: application.package_type, price: application.package_price };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <Link 
            href="/admin/lawyer"
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800">申请详情</h1>
            <p className="text-slate-500 mt-1 text-sm">申请编号：#{application.id}</p>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium ${status.color} self-start sm:self-auto`}>
          <StatusIcon className="w-4 h-4" />
          {status.label}
        </span>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Basic Info */}
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-[0_2px_8px_rgba(61,50,45,0.06)]">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">基本信息</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                <span className="text-lg font-bold text-slate-600">{application.name[0]}</span>
              </div>
              <div>
                <p className="font-medium text-slate-800">{application.name}</p>
                <p className="text-sm text-slate-500">{(application.gender === 'male' || application.gender === '男') ? '男' : (application.gender === 'female' || application.gender === '女') ? '女' : (application.gender || '未知')}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-2 text-slate-600">
                <Phone className="w-4 h-4 text-slate-400" />
                <span>{application.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Building2 className="w-4 h-4 text-slate-400" />
                <span>{application.law_firm}</span>
              </div>
              {application.wechat && (
                <div className="flex items-center gap-2 text-slate-600">
                  <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span>微信号：{application.wechat}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Professional Info */}
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-[0_2px_8px_rgba(61,50,45,0.06)]">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">专业信息</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Award className="w-5 h-5 text-slate-400 mt-0.5" />
              <div>
                <p className="text-sm text-slate-500">执业证号</p>
                <p className="font-medium text-slate-800">{application.license_number || '未填写'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <Award className="w-5 h-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-sm text-slate-500">执业年限</p>
                  <p className="font-medium text-slate-800">
                    {application.working_years ? `${application.working_years}年` : '未填写'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Building2 className="w-5 h-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-sm text-slate-500">所在城市</p>
                  <p className="font-medium text-slate-800">{application.city || '未填写'}</p>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <GraduationCap className="w-5 h-5 text-slate-400 mt-0.5" />
              <div>
                <p className="text-sm text-slate-500">学历</p>
                <p className="font-medium text-slate-800">{application.education || '未填写'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <GraduationCap className="w-5 h-5 text-slate-400 mt-0.5" />
              <div>
                <p className="text-sm text-slate-500">毕业院校</p>
                <p className="font-medium text-slate-800">{application.graduated_school || '未填写'}</p>
              </div>
            </div>

            <div>
              <p className="text-sm text-slate-500 mb-2">专业领域</p>
              <div className="flex flex-wrap gap-2">
                {safeParseArray(application.specialties).map((spec: string, index: number) => (
                  <span key={index} className="px-2.5 py-1 bg-green-50 text-green-700 text-sm rounded-full">
                    {spec}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Package Info */}
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-[0_2px_8px_rgba(61,50,45,0.06)]">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">入驻套餐</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-slate-800">{pkg.label}</p>
              <p className="text-sm text-slate-500 mt-1">
                支付状态：{application.payment_status === 'paid' ? '已支付' : '未支付'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-green-600">¥{(pkg.price / 100).toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Review Info */}
        {application.review_status !== 'pending' && (
          <div className="bg-white rounded-xl p-4 sm:p-6 shadow-[0_2px_8px_rgba(61,50,45,0.06)]">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">审核信息</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">审核时间</span>
                <span className="text-slate-800">
                  {application.reviewed_at ? new Date(application.reviewed_at).toLocaleString('zh-CN') : '-'}
                </span>
              </div>
              {application.review_remark && (
                <div className="p-3 bg-red-50 rounded-lg">
                  <p className="text-sm text-red-600">拒绝原因：{application.review_remark}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Documents */}
      <div className="bg-white rounded-xl p-4 sm:p-6 shadow-[0_2px_8px_rgba(61,50,45,0.06)]">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">证件材料</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
          {/* License Images */}
          <div>
            <p className="text-sm text-slate-500 mb-2 flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              律师执业证
            </p>
            <div className="grid grid-cols-2 gap-2">
              {safeParseArray(application.license_images).map((img: string, index: number) => (
                <a key={index} href={img} target="_blank" rel="noopener noreferrer" className="block">
                  <img src={img} alt={`执业证 ${index + 1}`} className="w-full h-32 object-cover rounded-lg border border-slate-200 hover:border-green-400 transition-colors" />
                </a>
              ))}
            </div>
          </div>

          {/* ID Card Images */}
          <div>
            <p className="text-sm text-slate-500 mb-2 flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              身份证
            </p>
            <div className="grid grid-cols-2 gap-2">
              {safeParseArray(application.id_card_images).map((img: string, index: number) => (
                <a key={index} href={img} target="_blank" rel="noopener noreferrer" className="block">
                  <img src={img} alt={`身份证 ${index + 1}`} className="w-full h-32 object-cover rounded-lg border border-slate-200 hover:border-green-400 transition-colors" />
                </a>
              ))}
            </div>
          </div>

          {/* Education Images */}
          <div>
            <p className="text-sm text-slate-500 mb-2 flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              学历证明
            </p>
            <div className="grid grid-cols-2 gap-2">
              {safeParseArray(application.education_images).map((img: string, index: number) => (
                <a key={index} href={img} target="_blank" rel="noopener noreferrer" className="block">
                  <img src={img} alt={`学历证明 ${index + 1}`} className="w-full h-32 object-cover rounded-lg border border-slate-200 hover:border-green-400 transition-colors" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      {application.review_status === 'pending' && (
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-[0_2px_8px_rgba(61,50,45,0.06)]">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">审核操作</h2>
          <div className="flex flex-wrap gap-3 sm:gap-4">
            <button
              onClick={() => handleReview('approve')}
              disabled={actionLoading}
              className="flex items-center gap-2 px-4 sm:px-6 py-3 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-colors disabled:opacity-50 text-sm sm:text-base"
            >
              {actionLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <CheckCircle className="w-5 h-5" />
              )}
              批准入驻
            </button>
            <button
              onClick={() => setShowRejectModal(true)}
              disabled={actionLoading}
              className="flex items-center gap-2 px-4 sm:px-6 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors disabled:opacity-50 text-sm sm:text-base"
            >
              <XCircle className="w-5 h-5" />
              拒绝入驻
            </button>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">拒绝入驻申请</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="请填写拒绝原因..."
              className="w-full h-32 px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowRejectModal(false)}
                className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => handleReview('reject')}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                确认拒绝
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
