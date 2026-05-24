'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { adminApiRequest } from '@/lib/api/request';

interface Lawyer {
  id: number;
  name: string;
  wechat_id: string;
  phone: string;
  title: string;
  specialties: string[];
  working_years: number;
  intro: string;
  is_active: boolean;
  is_available: boolean;
  online_status: string;
  stats: { total: number; pending: number; completed: number };
}

export default function LawyersPage() {
  const searchParams = useSearchParams();
  const [lawyers, setLawyers] = useState<Lawyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>(
    () => searchParams.get('onlineStatus') || ''
  );
  const [showModal, setShowModal] = useState(false);
  const [editLawyer, setEditLawyer] = useState<Lawyer | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    wechatId: '',
    phone: '',
    title: '',
    specialties: '',
    workingYears: 0,
    intro: '',
  });

  const fetchLawyers = useCallback(async () => {
    try {
      const url = statusFilter
        ? `/api/admin/lawyers?onlineStatus=${statusFilter}`
        : '/api/admin/lawyers';
      const response = await adminApiRequest(url);
      const result = await response.json();
      if (result.success) {
        setLawyers(result.data);
      }
    } catch (error) {
      console.error('Fetch lawyers error:', error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchLawyers();
    // 每30秒自动刷新律师列表
    const interval = setInterval(fetchLawyers, 30000);
    return () => clearInterval(interval);
  }, [fetchLawyers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editLawyer ? 'PUT' : 'POST';
    const url = editLawyer ? `/api/admin/lawyers/${editLawyer.id}` : '/api/admin/lawyers';

    try {
      const response = await adminApiRequest(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          specialties: formData.specialties.split(',').map(s => s.trim()).filter(Boolean)
        })
      });
      const result = await response.json();
      if (result.success) {
        setShowModal(false);
        setEditLawyer(null);
        fetchLawyers();
      } else {
        alert(result.error || '操作失败');
      }
    } catch {
      alert('操作失败');
    }
  };

  const handleEdit = (lawyer: Lawyer) => {
    setEditLawyer(lawyer);
    setFormData({
      name: lawyer.name,
      wechatId: lawyer.wechat_id || '',
      phone: lawyer.phone || '',
      title: lawyer.title || '',
      specialties: lawyer.specialties?.join(', ') || '',
      workingYears: lawyer.working_years || 0,
      intro: lawyer.intro || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (lawyer: Lawyer) => {
    if (!confirm(`确定删除律师 "${lawyer.name}" 吗？`)) return;
    try {
      const response = await adminApiRequest(`/api/admin/lawyers/${lawyer.id}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (result.success) {
        fetchLawyers();
      } else {
        alert(result.error || '删除失败');
      }
    } catch {
      alert('删除失败');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-800">律师列表</h2>
          {/* 在线状态筛选 */}
          <div className="flex items-center bg-white rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => setStatusFilter('')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === ''
                  ? 'bg-orange-500 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              全部
            </button>
            <button
              onClick={() => setStatusFilter('online')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === 'online'
                  ? 'bg-emerald-500 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              🟢 在线
            </button>
            <button
              onClick={() => setStatusFilter('away')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === 'away'
                  ? 'bg-red-500 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              🔴 离开
            </button>
          </div>
        </div>
        <button
          onClick={() => {
            setEditLawyer(null);
            setFormData({ name: '', wechatId: '', phone: '', title: '', specialties: '', workingYears: 0, intro: '' });
            setShowModal(true);
          }}
          className="px-4 py-2 rounded-xl bg-orange-500 text-white font-medium hover:bg-orange-600 transition-colors"
        >
          + 添加律师
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
          </div>
        ) : lawyers.length === 0 ? (
          <div className="col-span-full text-center text-gray-400 py-12">暂无律师</div>
        ) : (
          lawyers.map((lawyer) => (
            <div key={lawyer.id} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center text-white font-bold text-lg">
                    {lawyer.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">{lawyer.name}</h3>
                    <p className="text-sm text-gray-500">{lawyer.title || '律师'}</p>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 items-end">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    lawyer.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {lawyer.is_active ? '在职' : '离职'}
                  </span>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                    lawyer.online_status === 'online'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      lawyer.online_status === 'online' ? 'bg-emerald-500' : 'bg-red-500'
                    }`} />
                    {lawyer.online_status === 'online' ? '在线' : '离开'}
                  </span>
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <span>微信：</span>
                  <span>{lawyer.wechat_id || '-'}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <span>电话：</span>
                  <span>{lawyer.phone || '-'}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <span>执业：</span>
                  <span>{lawyer.working_years || 0} 年</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <span>专长：</span>
                  <span>{lawyer.specialties?.join(', ') || '-'}</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between text-sm">
                <div className="text-gray-500">
                  累计 <span className="font-semibold text-gray-800">{lawyer.stats?.total || 0}</span> 单
                </div>
                <div className="flex gap-2">
                  <span className="text-yellow-600">{lawyer.stats?.pending || 0} 待处理</span>
                  <span className="text-green-600">{lawyer.stats?.completed || 0} 已完成</span>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => handleEdit(lawyer)}
                  className="flex-1 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors text-sm"
                >
                  编辑
                </button>
                <button
                  onClick={() => handleDelete(lawyer)}
                  className="flex-1 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-colors text-sm"
                >
                  删除
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              {editLawyer ? '编辑律师' : '添加律师'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">姓名 *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-orange-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">微信号</label>
                <input
                  type="text"
                  value={formData.wechatId}
                  onChange={(e) => setFormData({ ...formData, wechatId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-orange-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">电话</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-orange-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">职称</label>
                <select
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-orange-500 outline-none bg-white"
                >
                  <option value="">请选择职称</option>
                  <option value="专职律师">专职律师</option>
                  <option value="兼职律师">兼职律师</option>
                  <option value="普通合伙人">普通合伙人</option>
                  <option value="高级合伙人">高级合伙人</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">擅长领域</label>
                <input
                  type="text"
                  value={formData.specialties}
                  onChange={(e) => setFormData({ ...formData, specialties: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-orange-500 outline-none"
                  placeholder="用逗号分隔，如：fraud,theft"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">执业年限</label>
                <input
                  type="number"
                  value={formData.workingYears}
                  onChange={(e) => setFormData({ ...formData, workingYears: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-orange-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">简介</label>
                <textarea
                  value={formData.intro}
                  onChange={(e) => setFormData({ ...formData, intro: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-orange-500 outline-none h-24 resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-orange-500 text-white font-medium hover:bg-orange-600 transition-colors"
                >
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
