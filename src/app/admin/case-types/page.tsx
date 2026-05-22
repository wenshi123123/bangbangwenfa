'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminApiRequest } from '@/lib/api/request';

interface CaseType {
  id: number;
  code: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  sort_order: number;
  is_active: boolean;
  orderCount: number;
}

export default function CaseTypesPage() {
  const [types, setTypes] = useState<CaseType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editType, setEditType] = useState<CaseType | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    icon: '',
    color: '#FF6B35',
    sortOrder: 0,
  });

  const fetchTypes = useCallback(async () => {
    try {
      const response = await adminApiRequest('/api/admin/case-types');
      const result = await response.json();
      if (result.success) {
        setTypes(result.data);
      }
    } catch (error) {
      console.error('Fetch types error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTypes();
  }, [fetchTypes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editType ? 'PUT' : 'POST';
    const url = editType ? `/api/admin/case-types/${editType.id}` : '/api/admin/case-types';

    try {
      const response = await adminApiRequest(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      const result = await response.json();
      if (result.success) {
        setShowModal(false);
        setEditType(null);
        fetchTypes();
      } else {
        alert(result.error || '操作失败');
      }
    } catch {
      alert('操作失败');
    }
  };

  const handleEdit = (type: CaseType) => {
    setEditType(type);
    setFormData({
      code: type.code,
      name: type.name,
      description: type.description || '',
      icon: type.icon || '',
      color: type.color || '#FF6B35',
      sortOrder: type.sort_order || 0,
    });
    setShowModal(true);
  };

  const handleToggle = async (type: CaseType) => {
    try {
      const response = await adminApiRequest(`/api/admin/case-types/${type.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isActive: !type.is_active })
      });
      const result = await response.json();
      if (result.success) {
        fetchTypes();
      }
    } catch {
      alert('操作失败');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-800">案件类型管理</h2>
        <button
          onClick={() => {
            setEditType(null);
            setFormData({ code: '', name: '', description: '', icon: '', color: '#FF6B35', sortOrder: types.length + 1 });
            setShowModal(true);
          }}
          className="px-4 py-2 rounded-xl bg-orange-500 text-white font-medium hover:bg-orange-600 transition-colors"
        >
          + 添加类型
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr className="text-left text-sm text-gray-500">
                <th className="px-6 py-4 font-medium">排序</th>
                <th className="px-6 py-4 font-medium">类型</th>
                <th className="px-6 py-4 font-medium">代码</th>
                <th className="px-6 py-4 font-medium">订单数</th>
                <th className="px-6 py-4 font-medium">状态</th>
                <th className="px-6 py-4 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {types.map((type) => (
                <tr key={type.id} className="border-t border-gray-50 hover:bg-gray-50">
                  <td className="px-6 py-4 text-gray-600">{type.sort_order}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{type.icon}</span>
                      <div>
                        <div className="font-medium text-gray-800">{type.name}</div>
                        {type.description && (
                          <div className="text-sm text-gray-400">{type.description}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <code className="px-2 py-1 bg-gray-100 rounded text-sm text-gray-600">{type.code}</code>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{type.orderCount}</td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleToggle(type)}
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        type.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {type.is_active ? '启用' : '禁用'}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleEdit(type)}
                      className="text-orange-600 hover:text-orange-700 font-medium text-sm"
                    >
                      编辑
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              {editType ? '编辑案件类型' : '添加案件类型'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">类型名称 *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-orange-500 outline-none"
                  placeholder="如：诈骗类案件"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">类型代码 *</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-orange-500 outline-none"
                  placeholder="如：fraud"
                  required
                  disabled={!!editType}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">图标</label>
                <input
                  type="text"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-orange-500 outline-none"
                  placeholder="emoji图标"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">颜色</label>
                <div className="flex gap-3">
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-12 h-10 rounded border border-gray-200 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="flex-1 px-3 py-2 rounded-xl border border-gray-200 focus:border-orange-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-orange-500 outline-none h-20 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">排序</label>
                <input
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-orange-500 outline-none"
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
