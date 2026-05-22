'use client';

import { useEffect, useState, useCallback } from 'react';
import { 
  Search, 
  Eye,
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  AlertCircle,
  Wallet,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Gift,
  User,
  ShoppingCart,
  Percent
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { adminApiRequest } from '@/lib/api/request';

interface Commission {
  id: number;
  guardian_id: number;
  order_id: number;
  commission_amount: number;
  commission_rate: number;
  status: 'pending' | 'approved' | 'rejected';
  admin_note: string | null;
  created_at: string;
  processed_at: string | null;
  guardian: {
    id: number;
    nickname: string;
    invite_code: string;
  };
  order: {
    id: number;
    contact_name: string;
    case_title: string;
    service_price: number;
  } | null;
}

const statusMap = {
  pending: { label: '待审核', color: 'bg-amber-100 text-amber-700', icon: Clock },
  approved: { label: '已通过', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  rejected: { label: '已拒绝', color: 'bg-red-100 text-red-700', icon: XCircle },
  default: { label: '未知', color: 'bg-gray-100 text-gray-700', icon: Clock },
};

export default function GuardianCommissionsPage() {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedCommission, setSelectedCommission] = useState<Commission | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const pageSize = 10;

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: pageSize.toString() });
      if (statusFilter) params.set('status', statusFilter);

      const response = await adminApiRequest(`/api/admin/guardian-commissions?${params}`);
      const result = await response.json();
      
      if (result.success) {
        let list = result.data;
        // 客户端搜索过滤
        if (searchKeyword) {
          const keyword = searchKeyword.toLowerCase();
          list = list.filter((c: Commission) => 
            c.guardian?.nickname?.toLowerCase().includes(keyword) ||
            c.order_id?.toString().includes(keyword) ||
            c.id?.toString().includes(keyword)
          );
        }
        setCommissions(list);
        setTotal(result.total);
      }
    } catch (error) {
      console.error('获取分成列表失败:', error);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, searchKeyword]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    if (searchKeyword) {
      // 防抖搜索
      const timer = setTimeout(() => {
        setPage(1);
        fetchList();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [searchKeyword, fetchList]);

  const handleViewDetail = (commission: Commission) => {
    setSelectedCommission(commission);
    setShowDetailModal(true);
    setActionType(null);
    setAdminNote('');
  };

  const handleAction = async (action: 'approve' | 'reject') => {
    if (!selectedCommission) return;
    
    setActionLoading(true);
    setActionType(action);
    
    try {
      const newStatus = action === 'approve' ? 'approved' : 'rejected';
      const response = await fetch('/api/admin/guardian-commissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedCommission.id,
          status: newStatus,
          admin_note: adminNote || null
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        // 更新列表
        setCommissions(commissions.map(c => 
          c.id === selectedCommission.id 
            ? { ...c, status: newStatus as Commission['status'], admin_note: adminNote || null }
            : c
        ));
        setShowDetailModal(false);
      } else {
        alert(result.error || '操作失败');
      }
    } catch (error) {
      console.error('操作失败:', error);
      alert('操作失败，请重试');
    } finally {
      setActionLoading(false);
      setActionType(null);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  const formatMoney = (cents: number) => (cents / 100).toFixed(2);
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  // 统计
  const pendingCount = commissions.filter(c => c.status === 'pending').length;
  const approvedCount = commissions.filter(c => c.status === 'approved').length;
  const rejectedCount = commissions.filter(c => c.status === 'rejected').length;
  const pendingAmount = commissions.filter(c => c.status === 'pending').reduce((sum, c) => sum + c.commission_amount, 0);
  const approvedAmount = commissions.filter(c => c.status === 'approved').reduce((sum, c) => sum + c.commission_amount, 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">分成审核</h1>
          <p className="text-slate-500 mt-1">管理守护者订单分成，审核通过后自动发放到余额</p>
        </div>
        <Button 
          onClick={fetchList}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div 
          onClick={() => { setStatusFilter(''); setPage(1); }}
          className={`bg-slate-50 rounded-xl p-4 cursor-pointer hover:opacity-80 transition-opacity ${statusFilter === '' ? 'ring-2 ring-purple-400' : ''}`}
        >
          <p className="text-sm text-slate-500">全部</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{total}</p>
        </div>
        <div 
          onClick={() => { setStatusFilter('pending'); setPage(1); }}
          className={`bg-amber-50 rounded-xl p-4 cursor-pointer hover:opacity-80 transition-opacity ${statusFilter === 'pending' ? 'ring-2 ring-amber-400' : ''}`}
        >
          <p className="text-sm text-amber-600">待审核</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{pendingCount}</p>
        </div>
        <div 
          onClick={() => { setStatusFilter('approved'); setPage(1); }}
          className={`bg-green-50 rounded-xl p-4 cursor-pointer hover:opacity-80 transition-opacity ${statusFilter === 'approved' ? 'ring-2 ring-green-400' : ''}`}
        >
          <p className="text-sm text-green-600">已通过</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{approvedCount}</p>
        </div>
        <div 
          onClick={() => { setStatusFilter('rejected'); setPage(1); }}
          className={`bg-red-50 rounded-xl p-4 cursor-pointer hover:opacity-80 transition-opacity ${statusFilter === 'rejected' ? 'ring-2 ring-red-400' : ''}`}
        >
          <p className="text-sm text-red-600">已拒绝</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{rejectedCount}</p>
        </div>
        <div className="bg-purple-50 rounded-xl p-4">
          <p className="text-sm text-purple-600">待发放金额</p>
          <p className="text-2xl font-bold text-purple-600 mt-1">¥{formatMoney(pendingAmount)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="搜索（守护者昵称/订单ID/分成ID）..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  分成ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  守护者
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  关联订单
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  分成金额
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  分成比例
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  生成时间
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : commissions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                    暂无数据
                  </td>
                </tr>
              ) : (
                commissions.map((commission) => {
                  const status = statusMap[commission.status] || statusMap.default;
                  const StatusIcon = status.icon;
                  
                  return (
                    <tr key={commission.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-slate-700">#{commission.id}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-purple-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-700">
                              {commission.guardian?.nickname || '未知'}
                            </p>
                            <p className="text-xs text-slate-400">
                              邀请码: {commission.guardian?.invite_code}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {commission.order ? (
                          <div>
                            <p className="text-sm font-medium text-slate-700">
                              订单 #{commission.order_id}
                            </p>
                            <p className="text-xs text-slate-400">
                              ¥{formatMoney(commission.order.service_price)} - {commission.order.case_title || '未命名案件'}
                            </p>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">订单已删除</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-lg font-bold text-green-600">
                          ¥{formatMoney(commission.commission_amount)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                          <Percent className="w-3 h-3" />
                          {(commission.commission_rate * 100).toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {formatDate(commission.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleViewDetail(commission)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          详情
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 flex items-center justify-between border-t border-slate-100">
            <p className="text-sm text-slate-500">
              共 {total} 条，第 {page}/{totalPages} 页
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="px-3 py-1 text-sm">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedCommission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold">分成详情</h3>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-1 hover:bg-slate-100 rounded-full"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Amount */}
              <div className="text-center py-4 bg-green-50 rounded-xl">
                <p className="text-sm text-green-600 mb-1">分成金额</p>
                <p className="text-3xl font-bold text-green-600">¥{formatMoney(selectedCommission.commission_amount)}</p>
                <p className="text-sm text-green-600 mt-1">
                  订单金额 ¥{formatMoney(selectedCommission.order?.service_price || 0)} × {(selectedCommission.commission_rate * 100).toFixed(1)}%
                </p>
              </div>

              {/* Info */}
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">分成ID</span>
                  <span className="font-medium">#{selectedCommission.id}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">守护者</span>
                  <span className="font-medium">{selectedCommission.guardian?.nickname || '未知'}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">邀请码</span>
                  <span className="font-mono text-sm">{selectedCommission.guardian?.invite_code}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">关联订单</span>
                  <span className="font-medium">#{selectedCommission.order_id}</span>
                </div>
                {selectedCommission.order && (
                  <>
                    <div className="flex items-center justify-between py-2 border-b border-slate-100">
                      <span className="text-slate-500">订单客户</span>
                      <span>{selectedCommission.order.contact_name}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-slate-100">
                      <span className="text-slate-500">案件名称</span>
                      <span className="text-right max-w-[200px] truncate">{selectedCommission.order.case_title || '未命名'}</span>
                    </div>
                  </>
                )}
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">状态</span>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${(statusMap[selectedCommission.status] || statusMap.default).color}`}>
                    {(statusMap[selectedCommission.status] || statusMap.default).label}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">生成时间</span>
                  <span>{formatDate(selectedCommission.created_at)}</span>
                </div>
                {selectedCommission.processed_at && (
                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">处理时间</span>
                    <span>{formatDate(selectedCommission.processed_at)}</span>
                  </div>
                )}
              </div>

              {/* Admin Note */}
              {selectedCommission.admin_note && (
                <div className="bg-amber-50 rounded-xl p-4">
                  <p className="text-sm text-amber-700 mb-1">管理员备注</p>
                  <p className="text-sm text-amber-800">{selectedCommission.admin_note}</p>
                </div>
              )}

              {/* Actions - Only for pending status */}
              {selectedCommission.status === 'pending' && (
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div>
                    <label className="block text-sm text-slate-500 mb-2">管理员备注（可选）</label>
                    <textarea
                      value={adminNote}
                      onChange={(e) => setAdminNote(e.target.value)}
                      placeholder="输入处理备注..."
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                      rows={2}
                    />
                  </div>
                  
                  <div className="flex gap-3">
                    <Button
                      onClick={() => handleAction('reject')}
                      disabled={actionLoading}
                      className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                    >
                      {actionLoading && actionType === 'reject' ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <XCircle className="w-4 h-4" />
                          拒绝
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => handleAction('approve')}
                      disabled={actionLoading}
                      className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                    >
                      {actionLoading && actionType === 'approve' ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          通过并发放
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-slate-400 text-center">
                    点击&ldquo;通过并发放&rdquo;将自动把分成金额添加到守护者可提现余额
                  </p>
                </div>
              )}

              {/* Already processed */}
              {selectedCommission.status !== 'pending' && (
                <div className="pt-4 border-t border-slate-100">
                  <p className="text-sm text-slate-500 text-center">
                    此分成记录已{(statusMap[selectedCommission.status] || statusMap.default).label}，无需再次操作
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
