'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  Loader2,
  User,
  Phone,
  FileText,
  MessageSquare,
  RefreshCw,
  Copy,
  Check,
  Send,
  UserPlus
} from 'lucide-react';
import { adminApiRequest } from '@/lib/api/request';

interface Order {
  id: string;
  user_id: string;
  contact_name: string;
  contact_phone: string;
  contact_wechat: string;
  case_type: string;
  case_title: string;
  case_description: string;
  service_type: string;
  service_price: number;
  payment_status: string;
  paid_at: string;
  lawyer_response: string;
  lawyer_wechat: string;
  lawyer_name: string;
  assigned_lawyer_id: number | null;
  assignment_status: string;
  assigned_at: string;
  confirmed_at: string;
  category: string;
  created_at: string;
}

interface Lawyer {
  id: string;
  name: string;
  phone: string;
  specialties: string[];
  current_orders: number;
  max_orders: number;
}

const paymentStatusMap = {
  pending: { label: '待支付', color: 'bg-amber-100 text-amber-700', icon: Clock },
  paid: { label: '已支付', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  refunded: { label: '已退款', color: 'bg-slate-100 text-slate-700', icon: RefreshCw },
  refunding: { label: '退款中', color: 'bg-orange-100 text-orange-700', icon: RefreshCw },
  default: { label: '未知', color: 'bg-gray-100 text-gray-700', icon: Clock },
};

const assignmentStatusMap = {
  unassigned: { label: '待派单', color: 'bg-gray-100 text-gray-700', icon: Clock },
  pending: { label: '待确认', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  pending_confirm: { label: '等待确认', color: 'bg-amber-100 text-amber-700', icon: Clock },
  confirmed: { label: '已确认', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
  accepted: { label: '已接单', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  rejected: { label: '已拒单', color: 'bg-red-100 text-red-700', icon: XCircle },
  completed: { label: '已完成', color: 'bg-purple-100 text-purple-700', icon: CheckCircle },
  default: { label: '未知', color: 'bg-gray-100 text-gray-700', icon: Clock },
};

const categoryMap = {
  criminal: { label: '刑事案件', color: 'text-red-600' },
  civil: { label: '民事案件', color: 'text-blue-600' },
};

const serviceTypeMap = {
  basic: { label: '基础咨询' },
  standard: { label: '标准咨询' },
  advanced: { label: '深度咨询' },
  consult: { label: '咨询服务' },
  lawyer_subscription: { label: '律师订阅' },
  default: { label: '其他服务' },
};

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  
  const [order, setOrder] = useState<Order | null>(null);
  const [lawyers, setLawyers] = useState<Lawyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedLawyer, setSelectedLawyer] = useState<Lawyer | null>(null);

  const fetchDetail = async () => {
    try {
      const response = await adminApiRequest(`/api/admin/order/detail/${id}`);
      const result = await response.json();
      if (result.success) {
        setOrder(result.order);
      }
    } catch (error) {
      console.error('获取详情失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const fetchLawyers = async () => {
    try {
      const response = await adminApiRequest('/api/admin/lawyers');
      const result = await response.json();
      if (result.success) {
        setLawyers(result.data || []);
      }
    } catch (error) {
      console.error('获取律师列表失败:', error);
    }
  };

  const handleRefund = async () => {
    if (!confirm('确定要退款该订单吗？退款后将无法恢复。')) {
      return;
    }

    setActionLoading(true);
    try {
      const response = await adminApiRequest('/api/admin/order/refund', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId: id })
      });

      const result = await response.json();
      if (result.success) {
        alert('退款成功');
        fetchDetail();
      } else {
        alert(result.error || '退款失败');
      }
    } catch (error) {
      console.error('退款失败:', error);
      alert('退款失败，请重试');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedLawyer || !order) return;

    setActionLoading(true);
    try {
      const response = await adminApiRequest('/api/admin/order/assign', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          orderId: order.id,
          lawyerId: selectedLawyer.id,
        })
      });

      const result = await response.json();
      if (result.success) {
        alert('派单成功！已通知用户等待律师确认。');
        setShowAssignModal(false);
        fetchDetail();
      } else {
        alert(result.error || '派单失败');
      }
    } catch (error) {
      console.error('派单失败:', error);
      alert('派单失败，请重试');
    } finally {
      setActionLoading(false);
    }
  };

  const openAssignModal = () => {
    fetchLawyers();
    setShowAssignModal(true);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

  if (!order) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-slate-600">订单不存在</p>
        <Link href="/admin/orders" className="text-green-600 hover:underline mt-4 inline-block">
          返回列表
        </Link>
      </div>
    );
  }

  const paymentStatus = paymentStatusMap[order.payment_status as keyof typeof paymentStatusMap] || paymentStatusMap.default;
  const PayStatusIcon = paymentStatus.icon;
  const catInfo = categoryMap[order.category as keyof typeof categoryMap] || { label: order.category };
  const serviceInfo = serviceTypeMap[order.service_type as keyof typeof serviceTypeMap] || serviceTypeMap.default;
  
  const assignmentStatus = assignmentStatusMap[order.assignment_status as keyof typeof assignmentStatusMap] || assignmentStatusMap.default;
  const AssignStatusIcon = assignmentStatus.icon;

  const canAssign = !order.assignment_status || 
                    order.assignment_status === 'unassigned' || 
                    order.assignment_status === 'rejected';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link 
            href="/admin/orders"
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">订单详情</h1>
            <p className="text-slate-500 mt-1">订单编号：#{order.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium ${paymentStatus.color}`}>
            <PayStatusIcon className="w-4 h-4" />
            {paymentStatus.label}
          </span>
          {order.payment_status === 'paid' && (
            <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium ${assignmentStatus.color}`}>
              <AssignStatusIcon className="w-4 h-4" />
              {assignmentStatus.label}
            </span>
          )}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Info */}
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-[0_2px_8px_rgba(61,50,45,0.06)]">
          <h2 className="text-base sm:text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-slate-400" />
            客户信息
          </h2>
          <div className="space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 py-2 border-b border-gray-50 last:border-0">
              <span className="text-slate-500 text-sm">姓名</span>
              <span className="font-medium text-slate-800">{order.contact_name}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 py-2 border-b border-gray-50 last:border-0">
              <span className="text-slate-500 text-sm">电话</span>
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-800">{order.contact_phone}</span>
                <button
                  onClick={() => copyToClipboard(order.contact_phone)}
                  className="p-1 hover:bg-slate-100 rounded transition-colors"
                >
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-slate-400" />}
                </button>
              </div>
            </div>
            {order.contact_wechat && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 py-2 border-b border-gray-50 last:border-0">
                <span className="text-slate-500 text-sm">微信</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-800">{order.contact_wechat}</span>
                  <button
                    onClick={() => copyToClipboard(order.contact_wechat)}
                    className="p-1 hover:bg-slate-100 rounded transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-slate-400" />}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Order Info */}
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-[0_2px_8px_rgba(61,50,45,0.06)]">
          <h2 className="text-base sm:text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-slate-400" />
            订单信息
          </h2>
          <div className="space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 py-2 border-b border-gray-50 last:border-0">
              <span className="text-slate-500 text-sm">案件类型</span>
              <div className="flex items-center gap-2">
                <span className={`font-medium ${catInfo.color}`}>{catInfo.label}</span>
                <span className="text-slate-400 text-xs sm:text-sm">{order.case_type}</span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 py-2 border-b border-gray-50 last:border-0">
              <span className="text-slate-500 text-sm">咨询类型</span>
              <span className="font-medium text-slate-800">{serviceInfo.label}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 py-2 border-b border-gray-50 last:border-0">
              <span className="text-slate-500 text-sm">订单金额</span>
              <span className="text-lg sm:text-xl font-bold text-green-600">¥{(order.service_price / 100).toFixed(2)}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 py-2 border-b border-gray-50 last:border-0">
              <span className="text-slate-500 text-sm">下单时间</span>
              <span className="text-slate-800 text-xs sm:text-sm">{new Date(order.created_at).toLocaleString('zh-CN')}</span>
            </div>
            {order.paid_at && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 py-2 border-b border-gray-50 last:border-0">
                <span className="text-slate-500 text-sm">支付时间</span>
                <span className="text-slate-800 text-xs sm:text-sm">{new Date(order.paid_at).toLocaleString('zh-CN')}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Case Details */}
      <div className="bg-white rounded-xl p-6 shadow-[0_2px_8px_rgba(61,50,45,0.06)]">
        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-slate-400" />
          案件详情
        </h2>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-slate-500 mb-1">咨询标题</p>
            <p className="font-medium text-slate-800">{order.case_title}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500 mb-1">详细描述</p>
            <p className="text-slate-700 whitespace-pre-wrap">{order.case_description}</p>
          </div>
        </div>
      </div>

      {/* Lawyer Info */}
      {order.assigned_lawyer_id && (
        <div className="bg-white rounded-xl p-6 shadow-[0_2px_8px_rgba(61,50,45,0.06)]">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-slate-400" />
            服务律师
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-slate-500">律师姓名</p>
              <p className="font-medium text-slate-800 mt-1">{order.lawyer_name}</p>
            </div>
            {order.lawyer_wechat && (
              <div>
                <p className="text-sm text-slate-500">律师微信</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-medium text-slate-800">{order.lawyer_wechat}</span>
                  <button
                    onClick={() => copyToClipboard(order.lawyer_wechat)}
                    className="p-1 hover:bg-slate-100 rounded transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-slate-400" />}
                  </button>
                </div>
              </div>
            )}
            <div>
              <p className="text-sm text-slate-500">派单时间</p>
              <p className="font-medium text-slate-800 mt-1">
                {order.assigned_at ? new Date(order.assigned_at).toLocaleString('zh-CN') : '-'}
              </p>
            </div>
          </div>
          {order.confirmed_at && (
            <div className="mt-4 p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-green-700">
                律师已确认接单时间：{new Date(order.confirmed_at).toLocaleString('zh-CN')}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Actions — 始终显示管理操作区 */}
      <div className="bg-white rounded-xl p-4 sm:p-6 shadow-[0_2px_8px_rgba(61,50,45,0.06)]">
        <h2 className="text-base sm:text-lg font-semibold text-slate-800 mb-4">管理操作</h2>

        {/* 未支付订单提示 */}
        {order.payment_status !== 'paid' && canAssign && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <span className="text-sm text-amber-700">该订单尚未支付，派单后律师将直接处理</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          {canAssign && (
            <button
              onClick={openAssignModal}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-colors"
            >
              <Send className="w-5 h-5" />
              派单给律师
            </button>
          )}
          {order.payment_status === 'paid' && (
            <button
              onClick={handleRefund}
              disabled={actionLoading}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
            >
              {actionLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <RefreshCw className="w-5 h-5" />
              )}
              退款处理
            </button>
          )}
        </div>
        <p className="text-xs sm:text-sm text-slate-500 mt-3">
          说明：派单后律师需确认接单，用户将收到站内信通知
        </p>
      </div>

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-green-500" />
              选择律师进行派单
            </h3>
            
            {lawyers.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-500 mb-2">暂无可用律师</p>
                <p className="text-sm text-slate-400">请先在「律师入驻审核」中通过律师申请</p>
              </div>
            ) : (
              <div className="space-y-3 overflow-y-auto flex-1">
                {lawyers.map((lawyer) => (
                  <div
                    key={lawyer.id}
                    onClick={() => setSelectedLawyer(lawyer)}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedLawyer?.id === lawyer.id
                        ? 'border-green-500 bg-green-50'
                        : 'border-slate-200 hover:border-green-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-800">{lawyer.name}</p>
                        <p className="text-sm text-slate-500 mt-1">{lawyer.phone}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-500">
                          当前订单：{lawyer.current_orders}/{lawyer.max_orders}
                        </p>
                        {lawyer.specialties && lawyer.specialties.length > 0 && (
                          <p className="text-xs text-slate-400 mt-1">
                            {lawyer.specialties.slice(0, 2).join('、')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAssignModal(false)}
                className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleAssign}
                disabled={!selectedLawyer || actionLoading}
                className="flex-1 px-4 py-2.5 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {actionLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
                确认派单
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
