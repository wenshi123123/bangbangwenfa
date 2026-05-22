'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminApiRequest } from '@/lib/api/request';

interface ActionLog {
  id: number;
  admin_id: number;
  admin_username: string;
  action_type: string;
  target_table: string;
  target_id: number;
  action_detail: Record<string, unknown>;
  ip_address: string;
  created_at: string;
}

const actionLabels: Record<string, string> = {
  login: '登录',
  logout: '退出',
  query: '查询',
  create: '创建',
  update: '更新',
  delete: '删除',
  export: '导出',
  update_status: '状态变更',
};

export default function LogsPage() {
  const [logs, setLogs] = useState<ActionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 50, total: 0 });
  const [filters, setFilters] = useState({ actionType: 'all', keyword: '' });

  const fetchLogs = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString(),
      });
      if (filters.actionType !== 'all') params.append('actionType', filters.actionType);
      if (filters.keyword) params.append('keyword', filters.keyword);

      const response = await adminApiRequest(`/api/admin/logs?${params}`);
      const result = await response.json();
      if (result.success) {
        setLogs(result.data.list);
        setPagination(prev => ({ ...prev, total: result.data.total }));
      }
    } catch (error) {
      console.error('Fetch logs error:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.pageSize, filters.actionType, filters.keyword]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleString('zh-CN');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-800">操作日志</h2>
        <div className="flex gap-3">
          <select
            value={filters.actionType}
            onChange={(e) => setFilters({ ...filters, actionType: e.target.value })}
            className="px-3 py-2 rounded-xl border border-gray-200 focus:border-orange-500 outline-none text-sm"
          >
            <option value="all">全部操作</option>
            {Object.entries(actionLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="搜索操作人..."
            value={filters.keyword}
            onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
            className="px-3 py-2 rounded-xl border border-gray-200 focus:border-orange-500 outline-none text-sm"
          />
          <button
            onClick={() => setPagination({ ...pagination, page: 1 })}
            className="px-4 py-2 rounded-xl bg-orange-500 text-white font-medium hover:bg-orange-600 transition-colors text-sm"
          >
            搜索
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr className="text-left text-sm text-gray-500">
                <th className="px-6 py-4 font-medium">时间</th>
                <th className="px-6 py-4 font-medium">操作人</th>
                <th className="px-6 py-4 font-medium">操作类型</th>
                <th className="px-6 py-4 font-medium">目标</th>
                <th className="px-6 py-4 font-medium">详情</th>
                <th className="px-6 py-4 font-medium">IP</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full mx-auto" />
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">暂无日志</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-500">{formatDate(log.created_at)}</td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-800">{log.admin_username}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        log.action_type === 'delete' ? 'bg-red-100 text-red-700' :
                        log.action_type === 'create' ? 'bg-green-100 text-green-700' :
                        log.action_type === 'login' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {actionLabels[log.action_type] || log.action_type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-600">
                        {log.target_table && (
                          <code className="text-xs bg-gray-100 px-1 rounded">{log.target_table}</code>
                        )}
                        {log.target_id && (
                          <span className="ml-1 text-xs"># {log.target_id}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-gray-500 max-w-xs truncate">
                        {log.action_detail ? JSON.stringify(log.action_detail) : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-400">{log.ip_address}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && logs.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <div className="text-sm text-gray-500">共 {pagination.total} 条记录</div>
            <div className="flex gap-2">
              <button
                onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                disabled={pagination.page <= 1}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
              >
                上一页
              </button>
              <span className="px-3 py-1.5 text-sm text-gray-600">
                第 {pagination.page} 页
              </span>
              <button
                onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                disabled={logs.length < pagination.pageSize}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
