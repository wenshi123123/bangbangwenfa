'use client';

import { useEffect, useState } from 'react';
import { adminApiRequest } from '@/lib/api/request';

interface MembershipRecord {
  id: string;
  lawyer_id: string;
  package_type: string;
  status: string;
  started_at: string;
  expires_at: string;
}

interface MemberLawyer {
  id: number;
  name: string;
  phone: string;
  title: string;
  specialties: string[];
  working_years: number;
  membership_status: string;
  package_type?: string | null;
  member_expires_at: string | null;
  member_starting_at: string | null;
  is_active: boolean;
  orderCount: number;
  records: MembershipRecord[];
}

interface MembershipLog {
  id: number;
  action: string;
  package_type: string | null;
  is_trial: boolean;
  duration_days: number | null;
  old_expires_at: string | null;
  new_expires_at: string | null;
  note: string | null;
  created_at: string;
}

interface ExpiringMember {
  id: string;
  lawyer_id: string;
  name: string;
  package_type: string;
  expires_at: string;
  daysLeft: number;
  is_trial: boolean;
}

interface ActionModal {
  open: boolean;
  lawyer: MemberLawyer | null;
  action: 'activate' | 'renew';
}

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
  criminal: '刑事案件',
  debt: '债务纠纷',
};

const actionLabels: Record<string, string> = {
  activate: '开通会员',
  renew: '续费',
  close: '关闭会员',
  expire: '自动过期',
  pause: '暂停',
  resume: '恢复',
};

const actionColors: Record<string, string> = {
  activate: 'text-green-600 bg-green-50',
  renew: 'text-blue-600 bg-blue-50',
  close: 'text-red-600 bg-red-50',
  expire: 'text-gray-500 bg-gray-50',
  pause: 'text-amber-600 bg-amber-50',
  resume: 'text-green-600 bg-green-50',
};

function getMembershipInfo(status: string, expiresAt: string | null, packageType?: string | null) {
  const packageLabel = packageType === 'criminal' ? '刑事臻选' : '民事臻选';
  if (!expiresAt) return { label: '未开通', color: 'bg-gray-100 text-gray-500', packageLabel };
  if (status === 'trial') {
    const exp = new Date(expiresAt);
    const now = new Date();
    const daysLeft = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 0) return { label: '已过期', color: 'bg-red-100 text-red-700', daysLeft, packageLabel };
    return { label: '体验中', color: 'bg-amber-100 text-amber-700', daysLeft, packageLabel };
  }
  const exp = new Date(expiresAt);
  const now = new Date();
  const daysLeft = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysLeft <= 0) return { label: '已过期', color: 'bg-red-100 text-red-700', daysLeft, packageLabel };
  if (daysLeft <= 30) return { label: '即将到期', color: 'bg-amber-100 text-amber-700', daysLeft, packageLabel };
  return { label: '有效', color: 'bg-green-100 text-green-700', daysLeft, packageLabel };
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDateTime(dateStr: string | null) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return `${formatDate(dateStr)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function calculateMemberExpiry(baseDate: string | null, months: number): string {
  const base = baseDate && new Date(baseDate) > new Date() ? new Date(baseDate) : new Date();
  const result = new Date(base);
  const originalDate = result.getDate();
  result.setMonth(result.getMonth() + months);
  if (result.getDate() !== originalDate) {
    result.setDate(0);
  }
  return result.toISOString();
}

function calculateMemberExpiryByDays(baseDate: string | null, days: number): string {
  const base = baseDate && new Date(baseDate) > new Date() ? new Date(baseDate) : new Date();
  const result = new Date(base);
  result.setDate(result.getDate() + days);
  return result.toISOString();
}

export default function MembersPage() {
  const [members, setMembers] = useState<MemberLawyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // 操作模态框
  const [modal, setModal] = useState<ActionModal>({ open: false, lawyer: null, action: 'activate' });
  const [selectedPackages, setSelectedPackages] = useState<string[]>([]);
  const [durationType, setDurationType] = useState<'months' | 'custom'>('months');
  const [durationValue, setDurationValue] = useState('18');
  const [isTrial, setIsTrial] = useState(false);
  const [trialDays, setTrialDays] = useState('30');
  const [submitting, setSubmitting] = useState(false);

  // 日志模态框
  const [logModal, setLogModal] = useState<{ open: boolean; lawyer: MemberLawyer | null; logs: MembershipLog[] }>({
    open: false, lawyer: null, logs: [],
  });

  // 到期预警
  const [expiringMembers, setExpiringMembers] = useState<ExpiringMember[]>([]);
  const [showExpiring, setShowExpiring] = useState(false);

  const fetchMembers = async () => {
    try {
      const res = await adminApiRequest('/api/admin/lawyers');
      const result = await res.json();
      if (result.success) {
        setMembers(result.data.map((l: Record<string, unknown>) => ({
          id: l.id,
          name: l.name,
          phone: l.phone || '',
          title: l.title || '',
          specialties: l.specialties || [],
          working_years: l.working_years || 0,
          membership_status: l.membership_status || 'normal',
          package_type: l.package_type || null,
          member_expires_at: l.member_expires_at || null,
          member_starting_at: l.member_starting_at || null,
          is_active: l.is_active !== false,
          orderCount: l.orderCount || 0,
          records: l.records || [],
          selected_packages: l.selected_packages,
        })));
      }
    } catch (e) {
      console.error('获取会员列表失败:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  // 获取会员详情
  useEffect(() => {
    if (members.length === 0) return;
    const fetchMemberDetails = async () => {
      try {
        const res = await fetch('/api/admin/members/list', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` },
        });
        const result = await res.json();
        if (result.success) {
          setMembers(prev => prev.map(l => {
            const detail = result.data.find((d: { id: number }) => d.id === l.id);
            if (detail) {
              return {
                ...l,
                membership_status: detail.membership_status || l.membership_status,
                member_expires_at: detail.member_expires_at || l.member_expires_at,
                member_starting_at: detail.member_starting_at || l.member_starting_at,
                package_type: detail.package_type || l.package_type,
                records: detail.records || l.records || [],
              };
            }
            return l;
          }));
        }
      } catch {}
    };
    fetchMemberDetails();
  }, [members.length > 0]);

  // 获取即将到期律师
  useEffect(() => {
    const fetchExpiring = async () => {
      try {
        const res = await adminApiRequest('/api/admin/members/expiring?days=7');
        const result = await res.json();
        if (result.success) {
          setExpiringMembers(result.data || []);
        }
      } catch {}
    };
    fetchExpiring();
  }, []);

  const filtered = members.filter(l => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!l.name.toLowerCase().includes(q) && !(l.phone && l.phone.includes(q))) return false;
    }
    if (filterStatus === 'active') {
      if (!l.member_expires_at || new Date(l.member_expires_at) <= new Date()) return false;
    } else if (filterStatus === 'expired') {
      if (l.member_expires_at && new Date(l.member_expires_at) > new Date()) return false;
    }
    return true;
  });

  const totalActive = members.filter(l => l.member_expires_at && new Date(l.member_expires_at) > new Date()).length;
  const totalExpired = members.filter(l => l.member_expires_at && new Date(l.member_expires_at) <= new Date()).length;
  const totalNoMember = members.filter(l => !l.member_expires_at).length;

  // 打开操作模态框
  const openModal = (lawyer: MemberLawyer, action: 'activate' | 'renew') => {
    setModal({ open: true, lawyer, action });
    // 默认选中律师当前有效套餐
    const activePkgs = (lawyer.records || [])
      .filter(r => r.status === 'active' || r.status === 'trial')
      .map(r => r.package_type);
    setSelectedPackages(activePkgs.length > 0 ? activePkgs : ['civil']);
    setDurationType('months');
    setDurationValue('18');
    setIsTrial(false);
    setTrialDays('30');
  };

  const closeModal = () => {
    setModal({ open: false, lawyer: null, action: 'activate' });
  };

  // 打开日志模态框
  const openLogModal = async (lawyer: MemberLawyer) => {
    try {
      const res = await adminApiRequest(`/api/admin/members/${lawyer.id}/logs`);
      const result = await res.json();
      setLogModal({
        open: true,
        lawyer,
        logs: result.success ? (result.data || []) : [],
      });
    } catch {
      setLogModal({ open: true, lawyer, logs: [] });
    }
  };

  const closeLogModal = () => {
    setLogModal({ open: false, lawyer: null, logs: [] });
  };

  // 关闭会员
  const handleClose = async (lawyer: MemberLawyer) => {
    if (!confirm(`确定关闭 ${lawyer.name} 的会员？关闭后将无法接单。`)) return;
    try {
      const res = await adminApiRequest(`/api/admin/lawyers/${lawyer.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          membership_status: 'expired',
          member_expires_at: new Date().toISOString(),
        }),
      });
      const result = await res.json();
      if (result.success) {
        await fetchMembers();
      } else {
        alert(result.error || '操作失败');
      }
    } catch (e) {
      alert('操作失败');
    }
  };

  // 提交开通/续费
  const handleSubmit = async () => {
    if (!modal.lawyer) return;
    if (selectedPackages.length === 0) {
      alert('请选择至少一个套餐');
      return;
    }

    setSubmitting(true);
    try {
      const activeRecords = modal.lawyer.records || [];
      for (const pkg of selectedPackages) {
        const existing = activeRecords.find(r => r.package_type === pkg && r.status === 'active');
        const baseDate = modal.action === 'renew' && existing ? existing.expires_at : null;

        let newExpiry: string;
        if (isTrial) {
          const days = parseInt(trialDays) || 30;
          newExpiry = calculateMemberExpiryByDays(baseDate, days);
        } else if (durationType === 'months') {
          const months = parseInt(durationValue) || 18;
          newExpiry = calculateMemberExpiry(baseDate, months);
        } else {
          const days = parseInt(durationValue) || 30;
          newExpiry = calculateMemberExpiryByDays(baseDate, days);
        }

        const res = await adminApiRequest('/api/admin/members/records', {
          method: 'POST',
          body: JSON.stringify({
            lawyer_id: modal.lawyer.id,
            package_type: pkg,
            expires_at: newExpiry,
            is_trial: isTrial,
            note: modal.action === 'renew' ? `管理后台续费${pkg === 'civil' ? '民事' : '刑事'}臻选` : undefined,
          }),
        });
        const result = await res.json();
        if (!result.success) {
          alert(`开通 ${pkg} 失败：${result.error}`);
          return;
        }
      }
      closeModal();
      await fetchMembers();
    } catch (e) {
      alert('操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">会员管理</h1>
        <p className="text-gray-500 text-sm mt-1">查看和管理律师会员信息及到期时间</p>
      </div>

      {/* 概览卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-[0_2px_8px_rgba(61,50,45,0.06)]">
          <p className="text-xs text-gray-500 mb-1">总律师</p>
          <p className="text-2xl font-bold text-gray-800">{members.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-[0_2px_8px_rgba(61,50,45,0.06)]">
          <p className="text-xs text-gray-500 mb-1">有效会员</p>
          <p className="text-2xl font-bold text-green-700">{totalActive}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-[0_2px_8px_rgba(61,50,45,0.06)]">
          <p className="text-xs text-gray-500 mb-1">已过期</p>
          <p className="text-2xl font-bold text-red-600">{totalExpired}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-[0_2px_8px_rgba(61,50,45,0.06)]">
          <p className="text-xs text-gray-500 mb-1">未开通</p>
          <p className="text-2xl font-bold text-gray-500">{totalNoMember}</p>
        </div>
        {/* 到期预警卡片 */}
        <button
          onClick={() => setShowExpiring(!showExpiring)}
          className={`bg-white rounded-xl p-4 shadow-[0_2px_8px_rgba(61,50,45,0.06)] text-left transition-colors hover:shadow-[0_2px_12px_rgba(196,115,83,0.12)] ${
            expiringMembers.length > 0 ? 'border border-amber-200' : ''
          }`}
        >
          <p className="text-xs text-gray-500 mb-1">7天内到期</p>
          <p className={`text-2xl font-bold ${expiringMembers.length > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
            {expiringMembers.length}
          </p>
          {expiringMembers.length > 0 && (
            <p className="text-[10px] text-amber-500 mt-0.5">{showExpiring ? '收起' : '点击查看'}</p>
          )}
        </button>
      </div>

      {/* 到期预警列表（展开时显示） */}
      {showExpiring && expiringMembers.length > 0 && (
        <div className="mb-6 bg-white rounded-xl p-4 shadow-[0_2px_8px_rgba(61,50,45,0.06)] border border-amber-100">
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            即将到期律师
            <span className="ml-1.5 text-xs font-normal text-amber-500">（7天内）</span>
          </h3>
          <div className="space-y-2">
            {expiringMembers.map(m => (
              <div key={m.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-amber-50/50">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center text-white text-xs font-medium">
                    {m.name.charAt(0)}
                  </div>
                  <div>
                    <span className="text-sm text-gray-700">{m.name}</span>
                    <span className={`ml-1.5 inline-block px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                      m.package_type === 'criminal' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {m.package_type === 'criminal' ? '刑事臻选' : '民事臻选'}
                    </span>
                    {m.is_trial && (
                      <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-600">体验</span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-xs font-medium ${m.daysLeft <= 3 ? 'text-red-500' : 'text-amber-600'}`}>
                    剩 {m.daysLeft} 天
                  </p>
                  <p className="text-[10px] text-gray-400">{formatDate(m.expires_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 搜索和筛选 */}
      <div className="flex flex-col gap-3 mb-4 md:flex-row md:items-center">
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="搜索姓名、电话..."
          className="px-3 py-2 rounded-xl border border-gray-200 focus:border-[#C47353] outline-none text-sm w-full md:w-56"
        />
        <div className="flex gap-1">
          {['', 'active', 'expired'].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filterStatus === s
                  ? 'bg-[#C47353] text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {s === '' ? '全部' : s === 'active' ? '有效' : '已过期'}
            </button>
          ))}
        </div>
      </div>

      {/* 列表 */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-[#C47353] border-t-transparent rounded-full" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-gray-400 py-12">暂无数据</div>
      ) : (
        <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(61,50,45,0.06)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-gray-100 text-left text-gray-500">
                <th className="px-4 py-3 font-medium">律师</th>
                <th className="px-4 py-3 font-medium">专长</th>
                <th className="px-4 py-3 font-medium">执业年限</th>
                <th className="px-4 py-3 font-medium">开始日期</th>
                <th className="px-4 py-3 font-medium">到期日期</th>
                <th className="px-4 py-3 font-medium">套餐类型</th>
                <th className="px-4 py-3 font-medium">会员状态</th>
                <th className="px-4 py-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(lawyer => {
                const memberInfo = getMembershipInfo(lawyer.membership_status, lawyer.member_expires_at, lawyer.package_type);
                const hasExpiry = lawyer.member_expires_at && new Date(lawyer.member_expires_at) > new Date();
                return (
                  <tr key={lawyer.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {lawyer.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{lawyer.name}</p>
                          <p className="text-xs text-gray-400">{lawyer.phone || '-'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-[160px] truncate">
                      {lawyer.specialties?.map(s => specialtyLabelMap[s] || s).join('、') || '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{lawyer.working_years || 0} 年</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(lawyer.member_starting_at)}</td>
                    <td className="px-4 py-3">
                      <span className="text-gray-600">{formatDate(lawyer.member_expires_at)}</span>
                      {memberInfo.daysLeft !== undefined && memberInfo.daysLeft !== null && (
                        <span className={`ml-1.5 text-xs ${
                          memberInfo.daysLeft <= 30 ? 'text-amber-600' : 'text-gray-400'
                        }`}>
                          {memberInfo.daysLeft > 0 ? `剩${memberInfo.daysLeft}天` : `过期${Math.abs(memberInfo.daysLeft)}天`}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(() => {
                          // 从 records 或旧字段计算显示的套餐标签（按 package_type 去重）
                          let tags: { package_type: string; status: string }[] = [];
                          if (lawyer.records && lawyer.records.length > 0) {
                            const activeRecords = lawyer.records.filter(r => r.status === 'active' || r.status === 'trial');
                            // 按 package_type 去重：优先 active，再 trial
                            const seen = new Map<string, string>();
                            activeRecords.forEach(r => {
                              if (!seen.has(r.package_type)) seen.set(r.package_type, r.status);
                            });
                            tags = Array.from(seen.entries()).map(([package_type, status]) => ({ package_type, status }));
                          } else if (lawyer.membership_status && lawyer.member_expires_at) {
                            tags = [{ package_type: lawyer.package_type || 'civil', status: lawyer.membership_status }];
                          }
                          if (tags.length === 0) {
                            return <span className="text-gray-400 text-xs">-</span>;
                          }
                          return tags.map((r, i) => (
                            <span key={i} className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                              r.package_type === 'criminal' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {r.package_type === 'criminal' ? '刑事臻选' : '民事臻选'}
                              {r.status === 'trial' && <span className="ml-0.5 text-[10px] opacity-60">体</span>}
                            </span>
                          ));
                        })()}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${memberInfo.color}`}>
                        {memberInfo.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {!lawyer.member_expires_at ? (
                          <button
                            onClick={() => openModal(lawyer, 'activate')}
                            className="px-2.5 py-1 text-xs rounded-lg bg-[#C47353] text-white hover:bg-[#b3664a] transition-colors"
                          >
                            开通会员
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => openModal(lawyer, 'renew')}
                              className="px-2.5 py-1 text-xs rounded-lg bg-[#C47353] text-white hover:bg-[#b3664a] transition-colors"
                            >
                              {hasExpiry ? '续费' : '重新开通'}
                            </button>
                            {hasExpiry && (
                              <button
                                onClick={() => handleClose(lawyer)}
                                className="px-2.5 py-1 text-xs rounded-lg border border-gray-200 text-gray-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                              >
                                关闭
                              </button>
                            )}
                          </>
                        )}
                        {/* 日志按钮 */}
                        <button
                          onClick={() => openLogModal(lawyer)}
                          className="px-2 py-1 text-xs rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors"
                          title="操作日志"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="10"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* 操作模态框 */}
      {modal.open && modal.lawyer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={closeModal}>
          <div className="bg-white rounded-xl shadow-lg w-[420px] max-w-[90vw] p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-medium text-gray-800 mb-4">
              {modal.action === 'activate' ? '开通会员' : '续费'} — {modal.lawyer.name}
            </h3>

            {/* 套餐选择（多选） */}
            <div className="mb-4">
              <label className="block text-sm text-gray-600 mb-2">套餐类型（可多选）</label>
              <div className="space-y-2">
                <label
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                    selectedPackages.includes('civil')
                      ? 'border-[#C47353] bg-[#C47353]/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedPackages.includes('civil')}
                    onChange={() => {
                      setSelectedPackages(prev =>
                        prev.includes('civil') ? prev.filter(p => p !== 'civil') : [...prev, 'civil']
                      );
                    }}
                    className="w-4 h-4 accent-[#C47353]"
                  />
                  <div className="flex-1">
                    <span className="font-medium text-sm">民事臻选律师</span>
                    <span className="block text-xs text-gray-400 mt-0.5">
                      {isTrial ? '体验' : '5000元/18月'}
                    </span>
                  </div>
                </label>
                <label
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                    selectedPackages.includes('criminal')
                      ? 'border-[#C47353] bg-[#C47353]/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedPackages.includes('criminal')}
                    onChange={() => {
                      setSelectedPackages(prev =>
                        prev.includes('criminal') ? prev.filter(p => p !== 'criminal') : [...prev, 'criminal']
                      );
                    }}
                    className="w-4 h-4 accent-[#C47353]"
                  />
                  <div className="flex-1">
                    <span className="font-medium text-sm">刑事臻选律师</span>
                    <span className="block text-xs text-gray-400 mt-0.5">
                      {isTrial ? '体验' : '8000元/18月'}
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* 开通方式 */}
            <div className="mb-4">
              <label className="block text-sm text-gray-600 mb-2">开通方式</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsTrial(false)}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm border transition-colors ${
                    !isTrial
                      ? 'border-[#C47353] bg-[#C47353]/5 text-[#C47353]'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  付费开通
                </button>
                <button
                  onClick={() => setIsTrial(true)}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm border transition-colors ${
                    isTrial
                      ? 'border-[#C47353] bg-[#C47353]/5 text-[#C47353]'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  免费体验
                </button>
              </div>
            </div>

            {/* 时长选择 */}
            <div className="mb-4">
              <label className="block text-sm text-gray-600 mb-2">
                {isTrial ? '体验时长' : '开通时长'}
              </label>
              {isTrial ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => setTrialDays('30')}
                    className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                      trialDays === '30'
                        ? 'border-[#C47353] bg-[#C47353]/5 text-[#C47353]'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    30 天
                  </button>
                  <button
                    onClick={() => setTrialDays('60')}
                    className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                      trialDays === '60'
                        ? 'border-[#C47353] bg-[#C47353]/5 text-[#C47353]'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    60 天
                  </button>
                  <input
                    type="number"
                    value={trialDays === '30' || trialDays === '60' ? '' : trialDays}
                    onChange={e => setTrialDays(e.target.value)}
                    placeholder="自定义天数"
                    min="1"
                    max="365"
                    className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#C47353]"
                  />
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => { setDurationType('months'); setDurationValue('6'); }}
                    className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                      durationType === 'months' && durationValue === '6'
                        ? 'border-[#C47353] bg-[#C47353]/5 text-[#C47353]'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    6 个月
                  </button>
                  <button
                    onClick={() => { setDurationType('months'); setDurationValue('18'); }}
                    className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                      durationType === 'months' && durationValue === '18'
                        ? 'border-[#C47353] bg-[#C47353]/5 text-[#C47353]'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    18 个月
                  </button>
                  <button
                    onClick={() => { setDurationType('custom'); setDurationValue(''); }}
                    className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                      durationType === 'custom'
                        ? 'border-[#C47353] bg-[#C47353]/5 text-[#C47353]'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    自定义
                  </button>
                  {durationType === 'custom' && (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={durationValue}
                        onChange={e => setDurationValue(e.target.value)}
                        min="1"
                        className="w-20 px-2 py-1.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#C47353]"
                      />
                      <span className="text-xs text-gray-400">天</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 预计到期日期 */}
            {selectedPackages.length > 0 && selectedPackages.map(pkg => {
              const existing = (modal.lawyer?.records || []).find(r => r.package_type === pkg && r.status === 'active');
              const baseDate = modal.action === 'renew' && existing ? existing.expires_at : null;

              let expDate: string;
              if (isTrial) {
                const days = parseInt(trialDays) || 30;
                expDate = calculateMemberExpiryByDays(baseDate, days);
              } else if (durationType === 'months') {
                const months = parseInt(durationValue) || 18;
                expDate = calculateMemberExpiry(baseDate, months);
              } else {
                const days = parseInt(durationValue) || 30;
                expDate = calculateMemberExpiryByDays(baseDate, days);
              }

              return (
                <div key={pkg} className="px-3 py-1.5 rounded-lg bg-gray-50 text-sm flex items-center justify-between">
                  <span className="text-gray-500">{pkg === 'civil' ? '民事臻选' : '刑事臻选'}</span>
                  <span className="font-medium text-gray-800">
                    {isTrial ? '体验 ' : ''}到期：{formatDate(expDate)}
                  </span>
                </div>
              );
            })}

            {/* 按钮 */}
            <div className="flex justify-end gap-2">
              <button
                onClick={closeModal}
                className="px-4 py-2 rounded-lg text-sm text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || (!isTrial && durationType === 'custom' && (!durationValue || parseInt(durationValue) <= 0))}
                className="px-4 py-2 rounded-lg text-sm text-white bg-[#C47353] hover:bg-[#b3664a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? '处理中...' : '确认'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 操作日志模态框 */}
      {logModal.open && logModal.lawyer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={closeLogModal}>
          <div className="bg-white rounded-xl shadow-lg w-[480px] max-w-[90vw] max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <h3 className="text-base font-medium text-gray-800">
                操作日志 — {logModal.lawyer.name}
              </h3>
              <button onClick={closeLogModal} className="text-gray-400 hover:text-gray-600 text-lg leading-none">&times;</button>
            </div>
            <div className="px-5 py-4 overflow-y-auto flex-1">
              {logModal.logs.length === 0 ? (
                <div className="text-center text-gray-400 py-8 text-sm">暂无操作记录</div>
              ) : (
                <div className="relative pl-6">
                  {/* 时间线 */}
                  <div className="absolute left-[7px] top-2 bottom-2 w-[2px] bg-gray-100" />
                  {logModal.logs.map(log => (
                    <div key={log.id} className="relative pb-5 last:pb-0">
                      {/* 时间线节点 */}
                      <div className="absolute left-[-20px] top-1.5 w-[14px] h-[14px] rounded-full border-2 border-gray-300 bg-white" />
                      {/* 内容 */}
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${actionColors[log.action] || 'text-gray-500 bg-gray-50'}`}>
                            {actionLabels[log.action] || log.action}
                          </span>
                          {log.is_trial && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-50 text-amber-500">体验</span>
                          )}
                          {log.package_type && (
                            <span className="text-[10px] text-gray-400">
                              {log.package_type === 'civil' ? '民事' : '刑事'}臻选
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mb-1">{formatDateTime(log.created_at)}</p>
                        {log.duration_days && (
                          <p className="text-xs text-gray-500">时长：{log.duration_days} 天</p>
                        )}
                        {log.old_expires_at && (
                          <p className="text-xs text-gray-500">
                            到期变更：{formatDate(log.old_expires_at)} → {formatDate(log.new_expires_at)}
                          </p>
                        )}
                        {log.note && (
                          <p className="text-xs text-gray-400 mt-1 italic">{log.note}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
