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
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { adminApiRequest } from '@/lib/api/request';

interface Withdrawal {
  id: number;
  guardian_id: number;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  wechat_qrcode: string;
  admin_note: string | null;
  created_at: string;
  processed_at: string | null;
  guardian: {
    id: number;
    nickname: string;
    wechat_account: string;
  };
}

const statusMap = {
  pending: { label: '待处理', color: 'bg-amber-100 text-amber-700', icon: Clock },
  processing: { label: '处理中', color: 'bg-blue-100 text-blue-700', icon: RefreshCw },
  completed: { label: '已完成', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  rejected: { label: '已拒绝', color: 'bg-red-100 text-red-700', icon: XCircle },
  default: { label: '未知', color: 'bg-gray-100 text-gray-700', icon: Clock },
};

export default function GuardianWithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null);
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

      const response = await adminApiRequest(`/api/admin/guardian-withdrawals?${params}`);
      const result = await response.json();
      
      if (result.success) {
        let list = result.data;
        // 客户端搜索过滤
        if (searchKeyword) {
          const keyword = searchKeyword.toLowerCase();
          list = list.filter((w: Withdrawal) => 
            w.guardian?.nickname?.toLowerCase().includes(keyword) ||
            w.id.toString().includes(keyword)
          );
        }
        setWithdrawals(list);
        setTotal(result.total);
      }
    } catch (error) {
      console.error('获取提现列表失败:', error);
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

  const handleViewDetail = (withdrawal: Withdrawal) => {
    setSelectedWithdrawal(withdrawal);
    setShowDetailModal(true);
    setActionType(null);
    setAdminNote('');
  };

  const handleAction = async (action: 'approve' | 'reject') => {
    if (!selectedWithdrawal) return;
    
    setActionLoading(true);
    setActionType(action);
    
    try {
      const newStatus = action === 'approve' ? 'completed' : 'rejected';
      const response = await adminApiRequest('/api/admin/guardian-withdrawals', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: selectedWithdrawal.id,
          status: newStatus,
          adminNote: adminNote || null
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        // 更新列表
        setWithdrawals(withdrawals.map(w => 
          w.id === selectedWithdrawal.id 
            ? { ...w, status: newStatus as Withdrawal['status'], admin_note: adminNote || null }
            : w
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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">守护者提现</h1>
          <p className="text-slate-500 mt-1">管理守护者的提现申请，确认转账完成</p>
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { key: '', label: '全部', count: total, color: 'bg-slate-50' },
          { key: 'pending', label: '待处理', count: withdrawals.filter(w => w.status === 'pending').length, color: 'bg-amber-50' },
          { key: 'completed', label: '已完成', count: withdrawals.filter(w => w.status === 'completed').length, color: 'bg-green-50' },
          { key: 'rejected', label: '已拒绝', count: withdrawals.filter(w => w.status === 'rejected').length, color: 'bg-red-50' },
        ].map(stat => (
          <div 
            key={stat.key}
            onClick={() => { setStatusFilter(stat.key); setPage(1); }}
            className={`${stat.color} rounded-xl p-4 cursor-pointer hover:opacity-80 transition-opacity ${statusFilter === stat.key ? 'ring-2 ring-purple-400' : ''}`}
          >
            <p className="text-sm text-slate-500">{stat.label}</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{stat.count}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="搜索（守护者昵称/提现ID）..."
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
                  提现ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  守护者
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  提现金额
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  申请时间
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : withdrawals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    暂无数据
                  </td>
                </tr>
              ) : (
                withdrawals.map((withdrawal) => {
                  const status = statusMap[withdrawal.status] || statusMap.default;
                  const StatusIcon = status.icon;
                  
                  return (
                    <tr key={withdrawal.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-slate-700">#{withdrawal.id}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                            <Wallet className="w-4 h-4 text-purple-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-700">
                              {withdrawal.guardian?.nickname || '未知'}
                            </p>
                            <p className="text-xs text-slate-400">
                              ID: {withdrawal.guardian_id}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-lg font-bold text-green-600">
                          ¥{formatMoney(withdrawal.amount)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {formatDate(withdrawal.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleViewDetail(withdrawal)}
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
      {showDetailModal && selectedWithdrawal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold">提现详情</h3>
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
                <p className="text-sm text-green-600 mb-1">提现金额</p>
                <p className="text-3xl font-bold text-green-600">¥{formatMoney(selectedWithdrawal.amount)}</p>
              </div>

              {/* Info */}
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">提现ID</span>
                  <span className="font-medium">#{selectedWithdrawal.id}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">守护者</span>
                  <span className="font-medium">{selectedWithdrawal.guardian?.nickname || '未知'}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">状态</span>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${(statusMap[selectedWithdrawal.status] || statusMap.default).color}`}>
                    {(statusMap[selectedWithdrawal.status] || statusMap.default).label}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">申请时间</span>
                  <span>{formatDate(selectedWithdrawal.created_at)}</span>
                </div>
                {selectedWithdrawal.processed_at && (
                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">处理时间</span>
                    <span>{formatDate(selectedWithdrawal.processed_at)}</span>
                  </div>
                )}
              </div>

              {/* QR Code */}
              <div>
                <p className="text-sm text-slate-500 mb-2">收款码</p>
                {selectedWithdrawal.wechat_qrcode ? (
                  <div className="bg-slate-50 rounded-xl p-4 text-center">
                    <img 
                      src={selectedWithdrawal.wechat_qrcode} 
                      alt="收款码" 
                      className="w-48 h-48 mx-auto rounded-lg object-contain"
                    />
                    <p className="text-xs text-slate-400 mt-2">长按保存或截图给财务转账</p>
                  </div>
                ) : (
                  <div className="bg-slate-50 rounded-xl p-4 text-center text-slate-400">
                    无收款码
                  </div>
                )}
              </div>

              {/* Admin Note */}
              {selectedWithdrawal.admin_note && (
                <div className="bg-amber-50 rounded-xl p-4">
                  <p className="text-sm text-amber-700 mb-1">管理员备注</p>
                  <p className="text-sm text-amber-800">{selectedWithdrawal.admin_note}</p>
                </div>
              )}

              {/* Actions - Only for pending status */}
              {selectedWithdrawal.status === 'pending' && (
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
                          确认已转账
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Already processed */}
              {selectedWithdrawal.status !== 'pending' && (
                <div className={`rounded-xl p-4 text-center ${
                  selectedWithdrawal.status === 'completed' ? 'bg-green-50' : 'bg-red-50'
                }`}>
                  <p className={`font-medium ${
                    selectedWithdrawal.status === 'completed' ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {selectedWithdrawal.status === 'completed' ? '✓ 已完成转账' : '✗ 已拒绝'}
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
