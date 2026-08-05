'use client';

import { useState } from 'react';

type Role = 'user' | 'guardian' | 'lawyer' | 'admin';

const options: Array<{ role: Role; label: string }> = [
  { role: 'user', label: '测试普通用户' },
  { role: 'guardian', label: '测试守护者' },
  { role: 'lawyer', label: '测试律师' },
  { role: 'admin', label: '测试管理员' },
];

export function LocalRoleSwitcher() {
  const [message, setMessage] = useState('');
  const selectRole = async (role: Role) => {
    setMessage('正在切换测试身份…');
    const response = await fetch('/api/local-preview/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'select', role }) });
    const result = await response.json();
    if (!response.ok || !result.success) return setMessage(result.error || '切换失败');
    localStorage.removeItem('token'); localStorage.removeItem('user_info'); localStorage.removeItem('user_id'); localStorage.removeItem('guardian_user'); localStorage.removeItem('admin_token'); localStorage.removeItem('admin_info');
    if (result.token) { localStorage.setItem('token', result.token); localStorage.setItem('user_info', JSON.stringify(result.user)); localStorage.setItem('user_id', String(result.user.id)); }
    if (result.adminToken) { localStorage.setItem('admin_token', result.adminToken); localStorage.setItem('admin_info', JSON.stringify(result.admin)); }
    window.location.assign(result.targetPath);
  };
  const reset = async () => {
    const response = await fetch('/api/local-preview/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'reset' }) });
    setMessage(response.ok ? '测试数据已重置' : '重置失败');
  };
  if (process.env.NODE_ENV === 'production') return null;
  return <aside className="fixed bottom-3 left-3 z-[100] max-w-[calc(100vw-1.5rem)] rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs shadow-lg"><p className="mb-2 font-semibold text-amber-900">本地测试身份</p><p className="mb-2 text-amber-800">仅本机测试，不会影响线上</p><div className="flex flex-wrap gap-1">{options.map(({ role, label }) => <button key={role} type="button" onClick={() => void selectRole(role)} className="rounded bg-amber-700 px-2 py-1 text-white">{label}</button>)}<button type="button" onClick={() => void reset()} className="rounded border border-amber-700 px-2 py-1 text-amber-900">重置测试数据</button></div>{message && <p className="mt-2 text-amber-900">{message}</p>}</aside>;
}
