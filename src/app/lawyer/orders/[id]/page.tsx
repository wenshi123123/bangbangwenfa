'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  User,
  Phone,
  FileText,
  Copy,
  Check,
  AlertCircle,
} from 'lucide-react';
import { useLawyerAuth } from '@/hooks/use-lawyer-auth';
import { LawyerBottomNav } from '@/components/lawyer/lawyer-bottom-nav';
import { getLawyerOrderResponseText } from '@/lib/lawyer/order-detail-presenter';

interface Order {
  id: number;
  contact_name: string;
  contact_phone: string;
  case_type: string;
  case_title: string;
  case_description: string;
  service_type: string;
  assigned_at: string;
  category: string;
  created_at: string;
  assignment_status: string;
  payment_status: string;
  confirmed_at: string;
  completed_at: string;
  status: string;
  lawyer_response: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: '待确认', color: '#C8963E', icon: <Clock className="w-4 h-4" /> },
  pending_confirm: { label: '待确认', color: '#C8963E', icon: <Clock className="w-4 h-4" /> },
  assigned: { label: '待确认', color: '#C8963E', icon: <Clock className="w-4 h-4" /> },
  confirmed: { label: '已确认', color: '#5C7A5A', icon: <CheckCircle className="w-4 h-4" /> },
  accepted: { label: '已接单', color: '#5C7A5A', icon: <CheckCircle className="w-4 h-4" /> },
  rejected: { label: '已拒单', color: '#C26565', icon: <XCircle className="w-4 h-4" /> },
  completed: { label: '已完成', color: '#7B4B8B', icon: <CheckCircle className="w-4 h-4" /> },
  default: { label: '处理中', color: '#C47353', icon: <Clock className="w-4 h-4" /> },
};

const serviceTypeMap: Record<string, string> = {
  basic: '基础咨询',
  standard: '标准咨询',
  advanced: '深度咨询',
  consult: '咨询服务',
  lawyer_subscription: '律师订阅',
  default: '咨询服务',
};

const categoryMap: Record<string, string> = {
  criminal: '刑事案件',
  civil: '民事案件',
};

// 案件类型英文 → 中文映射（涵盖刑事 + 民事）
const caseTypeMap: Record<string, string> = {
  // 刑事
  fraud: '诈骗类案件',
  theft: '盗窃类案件',
  assault: '故意伤害案件',
  drugs: '毒品犯罪',
  economy: '经济犯罪',
  traffic: '交通犯罪',
  // 民事
  contract: '合同纠纷',
  property: '财产纠纷',
  marriage: '婚姻家庭',
  inheritance: '继承纠纷',
  loan: '民间借贷',
  labor: '劳动纠纷',
  medical: '医疗纠纷',
  // 通用
  other: '其他',
};

const formatDateTime = (dateStr: string | null) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function LawyerOrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const { isAuthorized, isLoading: authLoading, lawyerId, getAuthHeaders } = useLawyerAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [confirmingAction, setConfirmingAction] = useState<'accept' | 'reject' | null>(null);

  const fetchDetail = useCallback(async () => {
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`/api/lawyer/orders/${id}`, { headers });
      const result = await res.json();
      if (result.success && result.order) {
        // P0-1 前端二次校验：确保订单属于当前律师
        if (lawyerId && String(result.order.assigned_lawyer_id) !== String(lawyerId)) {
          console.warn('[订单权限校验] 订单不属于当前律师', {
            orderLawyerId: result.order.assigned_lawyer_id,
            currentLawyerId: lawyerId,
          });
          setOrder(null);
          return;
        }
        setOrder(result.order);
      } else if (!result.success) {
        console.error('[订单详情] 获取失败', result.error);
        setOrder(null);
      }
    } catch (err) {
      console.error('获取订单详情失败:', err);
    } finally {
      setLoading(false);
    }
  }, [id, getAuthHeaders, lawyerId]);

  useEffect(() => {
    if (!authLoading && isAuthorized) {
      fetchDetail();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [authLoading, isAuthorized, fetchDetail]);

  const copyPhone = () => {
    if (!order?.contact_phone) return;
    navigator.clipboard.writeText(order.contact_phone);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const executeAction = async (action: 'accept' | 'reject') => {
    if (!lawyerId) {
      alert('未获取到律师身份信息，请刷新页面后重试');
      setConfirmingAction(null);
      return;
    }
    setActionLoading(true);
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      };
      const res = await fetch('/api/lawyer/order/confirm', {
        method: 'POST',
        headers,
        body: JSON.stringify({ orderId: Number(id), action, lawyerId }),
      });
      const result = await res.json();
      if (result.success) {
        alert(result.message);
        fetchDetail();
      } else {
        console.error('[接单/拒单] 后端返回失败', result);
        alert(result.error || '操作失败');
      }
    } catch (err) {
      console.error('[接单/拒单] 请求异常', err);
      alert('操作失败，请重试');
    } finally {
      setActionLoading(false);
      setConfirmingAction(null);
    }
  };

  const isPending =
    order?.assignment_status === 'pending' ||
    order?.assignment_status === 'pending_confirm' ||
    order?.assignment_status === 'assigned';

  // --- 加载中 ---
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

  // --- 未登录 ---
  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#FAF7F2]">
        <div className="bg-white rounded-xl p-8 shadow-lg max-w-sm w-full text-center">
          <div className="w-14 h-14 rounded-full bg-[#C47353]/10 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7 text-[#C47353]" />
          </div>
          <h2 className="text-xl font-bold text-[#3D322D] mb-2 font-serif">请先登录</h2>
          <p className="text-[#8C7B6E] mb-6">登录后即可查看订单详情</p>
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

  // --- 订单不存在 ---
  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#FAF7F2]">
        <div className="bg-white rounded-xl p-8 shadow-lg max-w-sm w-full text-center">
          <div className="w-14 h-14 rounded-full bg-[#C26565]/10 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7 text-[#C26565]" />
          </div>
          <h2 className="text-xl font-bold text-[#3D322D] mb-2 font-serif">订单不存在</h2>
          <p className="text-[#8C7B6E] mb-6">该订单可能已被删除或您无权访问</p>
          <Link
            href="/lawyer/orders"
            className="inline-block px-6 py-3 bg-[#C47353] text-white font-medium rounded-xl hover:bg-[#A85D40] transition-colors"
          >
            返回订单列表
          </Link>
        </div>
      </div>
    );
  }

  const status = statusConfig[order.assignment_status] || statusConfig.default;
  const serviceLabel = serviceTypeMap[order.service_type] || serviceTypeMap.default;
  const categoryLabel = categoryMap[order.category] || order.category;
  const lawyerResponseText = getLawyerOrderResponseText(order.lawyer_response);

  return (
    <div className="min-h-screen pb-24 bg-[#FAF7F2]">
      {/* ===== 顶栏 ===== */}
      <div className="sticky top-0 z-40 bg-[#FDF8F0]/95 backdrop-blur-xl border-b border-[#E8D5C0]/50">
        <div className="px-4 py-3 flex items-center justify-between max-w-2xl lg:max-w-3xl mx-auto">
          <Link
            href="/lawyer/orders"
            className="text-sm text-[#8C7B6E] hover:text-[#C47353] transition-colors flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            返回
          </Link>
          <span className="text-[15px] font-semibold text-[#1C1917] font-serif tracking-wide">
            订单 #{order.id}
          </span>
          <div className="w-14" />
        </div>
      </div>

      <div className="max-w-2xl lg:max-w-3xl mx-auto px-4 py-5 space-y-4">
        {/* ===== 状态条 ===== */}
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ backgroundColor: `${status.color}10` }}>
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${status.color}20`, color: status.color }}
          >
            {status.icon}
          </div>
          <div>
            <p className="text-sm font-semibold text-[#1C1917]">{status.label}</p>
          </div>
        </div>

        {/* ===== 客户信息卡片 ===== */}
        <div className="bg-[#FFFBF5] rounded-xl border border-[#E8D5C0] shadow-[0_2px_8px_rgba(61,50,45,0.06)] overflow-hidden">
          <div className="flex items-center gap-2 px-5 pt-5 pb-2">
            <User className="w-5 h-5 text-[#C47353]" />
            <h2 className="text-base font-semibold text-[#1C1917] font-serif">客户信息</h2>
          </div>
          <div className="px-5 pb-5 space-y-3">
            {/* 姓名 */}
            <div className="flex items-center justify-between py-2.5 border-b border-[#F0E8DA] last:border-0">
              <span className="text-sm text-[#8C7B6E]">姓名</span>
              <span className="font-medium text-[#1C1917]">{order.contact_name}</span>
            </div>
            {/* 手机号（可复制） */}
            <div className="flex items-center justify-between py-2.5 border-b border-[#F0E8DA] last:border-0">
              <span className="text-sm text-[#8C7B6E]">电话</span>
              <div className="flex items-center gap-2">
                <span className="font-medium text-[#1C1917]">{order.contact_phone}</span>
                <button
                  onClick={copyPhone}
                  className="p-1.5 rounded-lg hover:bg-[#F0E8DA] transition-colors"
                  title="复制电话号码"
                >
                  {copiedPhone ? (
                    <Check className="w-4 h-4 text-[#5C7A5A]" />
                  ) : (
                    <Copy className="w-4 h-4 text-[#A89B90]" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ===== 案情简介 ===== */}
        <div className="bg-[#FFFBF5] rounded-xl border border-[#E8D5C0] shadow-[0_2px_8px_rgba(61,50,45,0.06)] overflow-hidden">
          <div className="flex items-center gap-2 px-5 pt-5 pb-2">
            <FileText className="w-5 h-5 text-[#C47353]" />
            <h2 className="text-base font-semibold text-[#1C1917] font-serif">案情简介</h2>
          </div>
          <div className="px-5 pb-5">
            {/* 标题 */}
            <h3 className="font-semibold text-[#1C1917] text-sm mb-3">{order.case_title}</h3>
            {/* 完整描述（不截断） */}
            <div className="p-4 bg-[#FAF7F2] rounded-xl border border-[#F0E8DA] max-h-80 overflow-y-auto">
              <p className="text-sm text-[#5C534A] whitespace-pre-wrap leading-relaxed">
                {order.case_description}
              </p>
            </div>
            {lawyerResponseText && (
              <div className="p-4 bg-[#F8FBF7] rounded-xl border border-[#DDE8DB]">
                <h4 className="text-sm font-medium text-[#5C7A5A] mb-2">律师回复</h4>
                <p className="text-sm text-[#4A5A44] whitespace-pre-wrap leading-relaxed">
                  {lawyerResponseText}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ===== 订单信息 ===== */}
        <div className="bg-[#FFFBF5] rounded-xl border border-[#E8D5C0] shadow-[0_2px_8px_rgba(61,50,45,0.06)] overflow-hidden">
          <div className="flex items-center gap-2 px-5 pt-5 pb-2">
            <Clock className="w-5 h-5 text-[#C47353]" />
            <h2 className="text-base font-semibold text-[#1C1917] font-serif">订单信息</h2>
          </div>
          <div className="px-5 pb-5 space-y-3">
            <div className="flex items-center justify-between py-2.5 border-b border-[#F0E8DA] last:border-0">
              <span className="text-sm text-[#8C7B6E]">案件分类</span>
              <span className="font-medium text-[#1C1917]">{categoryLabel}</span>
            </div>
            {order.case_type && (
              <div className="flex items-center justify-between py-2.5 border-b border-[#F0E8DA] last:border-0">
                <span className="text-sm text-[#8C7B6E]">案件类型</span>
                <span className="font-medium text-[#1C1917]">{caseTypeMap[order.case_type] || order.case_type}</span>
              </div>
            )}
            <div className="flex items-center justify-between py-2.5 border-b border-[#F0E8DA] last:border-0">
              <span className="text-sm text-[#8C7B6E]">服务类型</span>
              <span className="font-medium text-[#1C1917]">{serviceLabel}</span>
            </div>
            {order.assigned_at && (
              <div className="flex items-center justify-between py-2.5 border-b border-[#F0E8DA] last:border-0">
                <span className="text-sm text-[#8C7B6E]">派单时间</span>
                <span className="text-sm text-[#1C1917]">{formatDateTime(order.assigned_at)}</span>
              </div>
            )}
            {order.confirmed_at && (
              <div className="flex items-center justify-between py-2.5 border-b border-[#F0E8DA] last:border-0">
                <span className="text-sm text-[#8C7B6E]">确认时间</span>
                <span className="text-sm text-[#1C1917]">{formatDateTime(order.confirmed_at)}</span>
              </div>
            )}
            <div className="flex items-center justify-between py-2.5 last:border-0">
              <span className="text-sm text-[#8C7B6E]">订单状态</span>
              <span
                className="text-sm font-medium px-2.5 py-0.5 rounded-full"
                style={{ backgroundColor: `${status.color}14`, color: status.color }}
              >
                {status.label}
              </span>
            </div>
          </div>
        </div>

        {/* ===== 操作区（仅待确认时显示） ===== */}
        {isPending && (
          <div className="bg-[#FFFBF5] rounded-xl border border-[#C8963E]/20 shadow-[0_2px_8px_rgba(61,50,45,0.06)] overflow-hidden p-5">
            <p className="text-sm text-[#8C7B6E] mb-4 text-center">
              请确认是否接受此订单，接单后将直接服务该客户
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmingAction('reject')}
                disabled={actionLoading}
                className="flex-1 py-3 text-sm font-medium rounded-xl border border-[#C26565]/20 text-[#C26565] hover:bg-[#C26565]/5 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <XCircle className="w-4 h-4" />
                拒单
              </button>
              <button
                onClick={() => setConfirmingAction('accept')}
                disabled={actionLoading}
                className="flex-1 py-3 text-sm font-medium rounded-xl bg-[#5C7A5A] text-white hover:bg-[#4A6648] transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_2px_8px_rgba(61,50,45,0.06)] shadow-[#5C7A5A]/20"
              >
                {actionLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                接单
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ===== 确认弹窗 ===== */}
      {confirmingAction && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setConfirmingAction(null)}
        >
          <div
            className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-[#3D322D] mb-2 font-serif">
              {confirmingAction === 'accept' ? '确认接单' : '确认拒单'}
            </h3>
            <p className="text-sm text-[#8C7B6E] mb-6">
              确定要{confirmingAction === 'accept' ? '接单' : '拒单'}吗？
              {confirmingAction === 'reject' && ' 拒单后将重新进入待派单状态。'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmingAction(null)}
                className="flex-1 py-2.5 text-sm font-medium rounded-xl border border-[#EBE3D8] text-[#8C7B6E] hover:bg-[#F5F2ED] transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => executeAction(confirmingAction)}
                className={`flex-1 py-2.5 text-sm font-medium rounded-xl text-white transition-colors ${
                  confirmingAction === 'accept'
                    ? 'bg-[#5C7A5A] hover:bg-[#4A6648]'
                    : 'bg-[#C26565] hover:bg-[#A85252]'
                }`}
              >
                确认{confirmingAction === 'accept' ? '接单' : '拒单'}
              </button>
            </div>
          </div>
        </div>
      )}

      <LawyerBottomNav />
    </div>
  );
}
