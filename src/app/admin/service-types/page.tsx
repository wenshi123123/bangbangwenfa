'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminApiRequest } from '@/lib/api/request';

interface ServiceType {
  id: number;
  code: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  price_min: number;
  price_max: number;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
  orderCount: number;
}

const categoryLabels: Record<string, string> = {
  consult: '咨询服务',
  delegate: '委托服务',
};

export default function ServiceTypesPage() {
  const [types, setTypes] = useState<ServiceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editType, setEditType] = useState<ServiceType | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    category: 'consult',
    icon: '',
    priceMin: 0,
    priceMax: 0,
    sortOrder: 0,
  });

  const fetchTypes = useCallback(async () => {
    try {
      const response = await adminApiRequest('/api/admin/service-types');
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
    const url = editType ? `/api/admin/service-types/${editType.id}` : '/api/admin/service-types';

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

  const handleEdit = (type: ServiceType) => {
    setEditType(type);
    setFormData({
      code: type.code,
      name: type.name,
      description: type.description || '',
      category: type.category,
      icon: type.icon || '',
      priceMin: type.price_min || 0,
      priceMax: type.price_max || 0,
      sortOrder: type.sort_order || 0,
    });
    setShowModal(true);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-800">服务类型管理</h2>
        <button
          onClick={() => {
            setEditType(null);
            setFormData({ code: '', name: '', description: '', category: 'consult', icon: '', priceMin: 0, priceMax: 0, sortOrder: types.length + 1 });
            setShowModal(true);
          }}
          className="px-4 py-2 rounded-xl bg-[#C47353] text-white font-medium hover:bg-[#A85D40] transition-colors"
        >
          + 添加服务
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-[#C47353] border-t-transparent rounded-full" />
          </div>
        ) : types.length === 0 ? (
          <div className="col-span-full text-center text-gray-400 py-12">暂无服务类型</div>
        ) : (
          types.map((type) => (
            <div key={type.id} className="bg-white rounded-xl p-6 border border-gray-100 shadow-[0_2px_8px_rgba(61,50,45,0.06)]">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{type.icon}</span>
                  <div>
                    <h3 className="font-semibold text-gray-800">{type.name}</h3>
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      type.category === 'consult' ? 'bg-orange-100 text-[#C47353]' : 'bg-green-100 text-green-700'
                    }`}>
                      {categoryLabels[type.category] || type.category}
                    </span>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  type.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {type.is_active ? '启用' : '禁用'}
                </span>
              </div>

              <p className="text-sm text-gray-500 mb-4">{type.description || '-'}</p>

              <div className="flex items-center justify-between text-sm mb-4">
                <span className="text-gray-500">价格</span>
                <span className="font-semibold text-gray-800">
                  {type.price_min === null ? '待评估' : `¥${(type.price_min / 100).toFixed(0)}-${(type.price_max / 100).toFixed(0)}`}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm mb-4">
                <span className="text-gray-500">订单数</span>
                <span className="text-gray-800">{type.orderCount}</span>
              </div>

              <button
                onClick={() => handleEdit(type)}
                className="w-full py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors text-sm"
              >
                编辑
              </button>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              {editType ? '编辑服务类型' : '添加服务类型'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">服务名称 *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-[#C47353] outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">服务代码 *</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-[#C47353] outline-none"
                  required
                  disabled={!!editType}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">分类 *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-[#C47353] outline-none"
                >
                  <option value="consult">咨询服务</option>
                  <option value="delegate">委托服务</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">图标</label>
                <input
                  type="text"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-[#C47353] outline-none"
                  placeholder="emoji图标"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">最低价(元)</label>
                  <input
                    type="number"
                    value={formData.priceMin / 100}
                    onChange={(e) => setFormData({ ...formData, priceMin: parseFloat(e.target.value) * 100 || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-[#C47353] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">最高价(元)</label>
                  <input
                    type="number"
                    value={formData.priceMax / 100}
                    onChange={(e) => setFormData({ ...formData, priceMax: parseFloat(e.target.value) * 100 || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-[#C47353] outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-[#C47353] outline-none h-20 resize-none"
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
                  className="flex-1 py-2 rounded-xl bg-[#C47353] text-white font-medium hover:bg-[#A85D40] transition-colors"
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
