'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { adminApiRequest } from '@/lib/api/request';

// 专长中英文映射
const specialtyLabelMap: Record<string, string> = {
  marriage: '婚姻继承',
  contract: '合同债务',
  property: '房产纠纷',
  labor: '劳动纠纷',
  traffic_civil: '交通事故',
  medical: '医疗纠纷',
  fraud: '诈骗类',
  theft: '盗窃类',
  assault: '故意伤害',
  drugs: '毒品犯罪',
  economy: '经济犯罪',
  traffic_crime: '交通犯罪',
  criminal: '刑事案件',
  traffic: '交通事故',
  debt: '债务纠纷',
};

interface Lawyer {
  id: number;
  name: string;
  wechat_id: string;
  phone: string;
  title: string;
  specialties: string[];
  working_years: number;
  intro: string;
  license_no?: string;
  member_expires_at?: string;
  membership_status?: string;
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
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editLawyer, setEditLawyer] = useState<Lawyer | null>(null);
  const [previewLawyer, setPreviewLawyer] = useState<Lawyer | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    wechatId: '',
    phone: '',
    title: '',
    specialties: '',
    workingYears: 0,
    intro: '',
    licenseNo: '',
  });

  const pageSize = 12;

  // 客户端搜索过滤
  const filteredLawyers = lawyers.filter(l => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      l.name.toLowerCase().includes(q) ||
      (l.phone && l.phone.includes(q)) ||
      (l.wechat_id && l.wechat_id.toLowerCase().includes(q))
    );
  });

  // 分页
  const totalPages = Math.ceil(filteredLawyers.length / pageSize);
  const pagedLawyers = filteredLawyers.slice((page - 1) * pageSize, page * pageSize);

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

  const handleEdit = async (lawyer: Lawyer) => {
    setEditLawyer(lawyer);
    // 获取完整信息（含解密后的执业证号）
    let licenseNo = '';
    try {
      const res = await adminApiRequest(`/api/admin/lawyers/${lawyer.id}`);
      const result = await res.json();
      if (result.success && result.data.license_no) {
        licenseNo = result.data.license_no;
      }
    } catch {}
    setFormData({
      name: lawyer.name,
      wechatId: lawyer.wechat_id || '',
      phone: lawyer.phone || '',
      title: lawyer.title || '',
      specialties: lawyer.specialties?.join(', ') || '',
      workingYears: lawyer.working_years || 0,
      intro: lawyer.intro || '',
      licenseNo,
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
              onClick={() => { setStatusFilter(''); setPage(1); }}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === ''
                  ? 'bg-[#C47353] text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              全部
            </button>
            <button
              onClick={() => { setStatusFilter('online'); setPage(1); }}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === 'online'
                  ? 'bg-emerald-500 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              🟢 在线
            </button>
            <button
              onClick={() => { setStatusFilter('away'); setPage(1); }}
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
        {/* 搜索 */}
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
            placeholder="搜索姓名、电话、微信..."
            className="px-3 py-2 rounded-xl border border-gray-200 focus:border-[#C47353] outline-none text-sm w-56"
          />
          <button
          onClick={() => {
            setEditLawyer(null);
            setFormData({ name: '', wechatId: '', phone: '', title: '', specialties: '', workingYears: 0, intro: '', licenseNo: '' });
            setShowModal(true);
          }}
          className="px-4 py-2 rounded-xl bg-[#C47353] text-white font-medium hover:bg-[#A85D40] transition-colors"
        >
          + 添加律师
        </button>
      </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-[#C47353] border-t-transparent rounded-full" />
          </div>
        ) : filteredLawyers.length === 0 ? (
          <div className="col-span-full text-center text-gray-400 py-12">暂无匹配的律师</div>
        ) : (
          pagedLawyers.map((lawyer) => (
            <div key={lawyer.id} className="bg-white rounded-xl p-6 border border-gray-100 shadow-[0_2px_8px_rgba(61,50,45,0.06)]">
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
                  <span>{lawyer.specialties?.map(s => specialtyLabelMap[s] || s).join('、') || '-'}</span>
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
                  onClick={() => setPreviewLawyer(lawyer)}
                  className="flex-1 py-2 rounded-xl bg-[#FAF7F2] text-[#C47353] hover:bg-[#F0E8DD] transition-colors text-sm font-medium"
                >
                  名片预览
                </button>
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

      {/* Pagination */}
      {!loading && filteredLawyers.length > pageSize && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            上一页
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                p === page
                  ? 'bg-[#C47353] text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            下一页
          </button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
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
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-[#C47353] outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">微信号</label>
                <input
                  type="text"
                  value={formData.wechatId}
                  onChange={(e) => setFormData({ ...formData, wechatId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-[#C47353] outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">电话</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-[#C47353] outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">职称</label>
                <select
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-[#C47353] outline-none bg-white"
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
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-[#C47353] outline-none"
                  placeholder="用逗号分隔，如：婚姻继承,合同债务"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">执业证号</label>
                <input
                  type="text"
                  value={formData.licenseNo}
                  onChange={(e) => setFormData({ ...formData, licenseNo: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-[#C47353] outline-none"
                  placeholder="执业证号（仅编辑时可见）"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">执业年限</label>
                <input
                  type="number"
                  value={formData.workingYears}
                  onChange={(e) => setFormData({ ...formData, workingYears: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-[#C47353] outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">简介</label>
                <textarea
                  value={formData.intro}
                  onChange={(e) => setFormData({ ...formData, intro: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-[#C47353] outline-none h-24 resize-none"
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

      {/* 名片预览模态框 */}
      {previewLawyer && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setPreviewLawyer(null)}>
          <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-3 border-b border-gray-100 flex items-center justify-between">
              <span className="font-semibold text-gray-800">用户端名片预览</span>
              <button onClick={() => setPreviewLawyer(null)} className="p-1 text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="bg-[#FAF7F2] p-6">
              {/* 名片卡片 — 复用用户端样式 */}
              <div className="relative bg-gradient-to-br from-[#C47353] via-[#B06545] to-[#8B4513] rounded-xl p-6 shadow-lg overflow-hidden">
                <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/5 rounded-full" />
                <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/5 rounded-full" />
                <div className="relative z-10">
                  <div className="flex items-start gap-5 mb-5">
                    <div className="w-20 h-20 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center text-white text-3xl font-serif flex-shrink-0 border border-white/20">
                      {previewLawyer.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0 pt-1">
                      <h2 className="text-2xl font-bold text-white font-serif tracking-tight">{previewLawyer.name}</h2>
                      <p className="text-white/65 text-sm mt-1">{previewLawyer.title || '专职律师'}</p>
                      <div className="flex flex-wrap gap-1.5 mt-2.5">
                        {previewLawyer.specialties?.slice(0, 4).map((s: string) => (
                          <span key={s} className="text-[11px] px-2.5 py-0.5 rounded-full bg-white/15 text-white/85 font-medium backdrop-blur-sm">
                            {specialtyLabelMap[s] || s}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-4 border-t border-white/12">
                    <div className="text-center">
                      <p className="text-xl font-bold text-white font-serif">{previewLawyer.stats?.total || 0}</p>
                      <p className="text-white/75 text-[11px]">已接单</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-bold text-white font-serif">{previewLawyer.working_years || 0}年</p>
                      <p className="text-white/75 text-[11px]">执业年限</p>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-center text-xs text-gray-400 mt-4">此为用户端名片展示效果的简化预览</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
