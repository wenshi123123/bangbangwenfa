'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Eye,
  Filter,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { adminApiRequest } from '@/lib/api/request';

interface LawyerApplication {
  id: number;
  name: string;
  phone: string;
  law_firm: string;
  specialties: string[];
  package_type: string;
  package_price: number;
  review_status: string;
  payment_status: string;
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

export default function LawyerListPage() {
  const searchParams = useSearchParams();
  const [applications, setApplications] = useState<LawyerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [showRejectModal, setShowRejectModal] = useState<{ show: boolean; id: number | null }>({ show: false, id: null });
  const [rejectReason, setRejectReason] = useState('');
  const pageSize = 10;

  // 从 URL 同步状态
  useEffect(() => {
    const rawStatus = searchParams.get('status') || '';
    const status = rawStatus === 'pending_review' ? 'pending' : rawStatus;
    if (status !== statusFilter) {
      setStatusFilter(status);
      setPage(1); // 切换状态时重置页码
    }
  }, [searchParams, statusFilter]);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), pageSize: pageSize.toString() });
      if (statusFilter) params.set('status', statusFilter);

      const response = await adminApiRequest(`/api/admin/lawyer/list?${params}`);
      const result = await response.json();
      if (result.success) {
        setApplications(result.data.list || result.data || []);
        setTotal(result.data.total || 0);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('获取申请列表失败:', error);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  // 审核通过
  const handleApprove = async (id: number) => {
    setActionLoading(id);
    try {
      const response = await adminApiRequest('/api/admin/lawyer/review', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, action: 'approve' })
      });
      const result = await response.json();
      if (result.success) {
        alert('审核通过成功！');
        localStorage.setItem('lawyer_status_refresh', String(new Date().getTime()));
        window.dispatchEvent(new CustomEvent('lawyer-status-updated'));
        fetchList();
      } else {
        alert('操作失败: ' + result.error);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '操作失败，请重试';
      alert(message);
    } finally {
      setActionLoading(null);
    }
  };

  // 拒绝申请
  const handleReject = async () => {
    if (!showRejectModal.id) return;
    setActionLoading(showRejectModal.id);
    try {
      const response = await adminApiRequest('/api/admin/lawyer/review', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: showRejectModal.id, action: 'reject', reason: rejectReason })
      });
      const result = await response.json();
      if (result.success) {
        alert('已拒绝该申请');
        setShowRejectModal({ show: false, id: null });
        setRejectReason('');
        fetchList();
      } else {
        alert('操作失败: ' + result.error);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '操作失败，请重试';
      alert(message);
    } finally {
      setActionLoading(null);
    }
  };

  const totalPages = Math.ceil(total / pageSize);
  const pendingCount = applications.filter(app => app.review_status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">律师入驻审核</h1>
          <p className="text-slate-500 mt-1 text-sm">管理律师入驻申请，进行审核操作</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs sm:text-sm text-slate-400">
            最后更新: {lastUpdate ? lastUpdate.toLocaleTimeString('zh-CN') : '--:--:--'}
          </span>
          <button
            onClick={fetchList}
            className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            刷新列表
          </button>
        </div>
      </div>

      {/* 提示：有待审核申请时显示 */}
      {pendingCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500" />
          <span className="text-amber-700">
            当前有 <strong>{pendingCount}</strong> 条待审核的律师入驻申请
          </span>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-[0_2px_8px_rgba(61,50,45,0.06)]">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-600">状态筛选：</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setStatusFilter('')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                !statusFilter 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              全部
            </button>
            {Object.entries(statusMap).map(([key, value]) => (
              <button
                key={key}
                onClick={() => {
                  setStatusFilter(key);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === key 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {value.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(61,50,45,0.06)] overflow-hidden">
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <table className="w-full min-w-[700px]">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  申请人
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  联系方式
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider hidden sm:table-cell">
                  律所
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  套餐
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider hidden md:table-cell">
                  申请时间
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center gap-2 text-slate-500">
                      <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                      加载中...
                    </div>
                  </td>
                </tr>
              ) : applications.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    暂无申请记录
                  </td>
                </tr>
              ) : (
                applications.map((app) => {
                  const status = statusMap[app.review_status as keyof typeof statusMap] || statusMap.pending;
                  const StatusIcon = status.icon;
                  const pkg = packageMap[app.package_type as keyof typeof packageMap] || { label: app.package_type, price: app.package_price };

                  return (
                    <tr key={app.id} className="hover:bg-slate-50">
                      <td className="px-3 sm:px-6 py-4">
                        <div className="font-medium text-slate-800 text-sm sm:text-base">{app.name}</div>
                        <div className="text-xs text-slate-400 sm:hidden">{app.law_firm}</div>
                      </td>
                      <td className="px-3 sm:px-6 py-4">
                        <div className="text-slate-600 text-sm">{app.phone}</div>
                      </td>
                      <td className="px-3 sm:px-6 py-4 hidden sm:table-cell">
                        <div className="text-slate-600 text-sm">{app.law_firm}</div>
                      </td>
                      <td className="px-3 sm:px-6 py-4">
                        <div className="text-slate-600 text-sm">{pkg.label}</div>
                        <div className="text-xs text-slate-400">¥{(pkg.price / 100).toFixed(2)}</div>
                      </td>
                      <td className="px-3 sm:px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-xs font-medium ${status.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {status.label}
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-4 hidden md:table-cell text-slate-500 text-sm">
                        {new Date(app.created_at).toLocaleDateString('zh-CN')}
                      </td>
                      <td className="px-3 sm:px-6 py-4">
                        <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                          <Link
                            href={`/admin/lawyer/${app.id}`}
                            className="inline-flex items-center gap-1 px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            详情
                          </Link>
                          {app.review_status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApprove(app.id)}
                                disabled={actionLoading === app.id}
                                className="inline-flex items-center gap-1 px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-green-300 rounded-lg transition-colors"
                              >
                                <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                {actionLoading === app.id ? '处理中' : '通过'}
                              </button>
                              <button
                                onClick={() => setShowRejectModal({ show: true, id: app.id })}
                                disabled={actionLoading === app.id}
                                className="inline-flex items-center gap-1 px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-red-300 rounded-lg transition-colors"
                              >
                                <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                拒绝
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > pageSize && (
          <div className="px-3 sm:px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-sm text-slate-500">
              共 {total} 条记录，第 {page} / {totalPages} 页
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                上一页
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 拒绝弹窗 */}
      {showRejectModal.show && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">拒绝入驻申请</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-600 mb-2">
                拒绝原因（选填）
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="请输入拒绝原因..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                rows={3}
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setShowRejectModal({ show: false, id: null }); setRejectReason(''); }}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleReject}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
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
