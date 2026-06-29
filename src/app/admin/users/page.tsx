'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Users,
  Search,
  Eye,
  Shield,
  Scale
} from 'lucide-react';
import { adminApiRequest } from '@/lib/api/request';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface TrendData {
  newUsersToday: number;
  yesterdayNewUsers: number;
  totalUsers: number;
  totalLawyers: number;
}

interface User {
  id: number;
  openid: string | null;
  nickname: string | null;
  phone: string | null;
  avatar_url: string | null;
  status: string;
  is_lawyer: boolean;
  is_guardian: boolean;
  roles: string[];
  created_at: string;
  updated_at: string;
}

const ADMIN_LOGIN_HREF = '/admin-login';

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [needsLogin, setNeedsLogin] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !localStorage.getItem('admin_info');
  });
  const [searchKeyword, setSearchKeyword] = useState('');
  const [trend, setTrend] = useState<TrendData | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const adminInfo = localStorage.getItem('admin_info');
        if (!adminInfo) {
          setNeedsLogin(true);
          setLoading(false);
          return;
        }
        const response = await adminApiRequest('/api/admin/user/list');
        const result = await response.json();
        if (result.success) {
          setUsers(result.data || []);
        }
      } catch (error) {
        console.error('获取用户列表失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // 获取趋势数据
  useEffect(() => {
    const fetchTrend = async () => {
      try {
        const res = await adminApiRequest('/api/admin/stats');
        const result = await res.json();
        if (result.success) {
          setTrend({
            newUsersToday: result.data.newUsersToday || 0,
            yesterdayNewUsers: result.data.yesterdayNewUsers || 0,
            totalUsers: result.data.totalUsers || 0,
            totalLawyers: result.data.totalLawyers || 0,
          });
        }
      } catch (e) {
        console.error('获取趋势数据失败:', e);
      }
    };
    fetchTrend();
  }, []);

  const filteredUsers = users.filter(user => 
    (user.nickname?.toLowerCase() || '').includes(searchKeyword.toLowerCase()) ||
    (user.phone || '').includes(searchKeyword)
  );

  if (needsLogin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-[0_12px_40px_rgba(15,23,42,0.08)] text-center">
          <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-green-50 flex items-center justify-center">
            <Scale className="w-7 h-7 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">管理员登录</h1>
          <p className="mt-2 text-sm text-slate-500">请先登录管理员账号后再访问用户管理</p>
          <div className="mt-6">
            <Link
              href={ADMIN_LOGIN_HREF}
              className="inline-flex items-center justify-center rounded-full bg-green-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-green-700"
            >
              前往登录
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">用户管理</h1>
          <p className="text-slate-500 mt-1">查看平台注册用户信息</p>
        </div>
      </div>

      {/* 趋势卡片 */}
      {trend && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-[0_2px_8px_rgba(61,50,45,0.06)]">
            <p className="text-xs text-slate-500 mb-1">今日新增</p>
            <p className="text-2xl font-bold text-slate-800">{trend.newUsersToday}</p>
            {trend.yesterdayNewUsers > 0 && (
              <p className={`text-xs mt-1 ${trend.newUsersToday >= trend.yesterdayNewUsers ? 'text-green-600' : 'text-red-500'}`}>
                {trend.newUsersToday >= trend.yesterdayNewUsers ? '↑' : '↓'}
                {Math.abs(Math.round((trend.newUsersToday - trend.yesterdayNewUsers) / trend.yesterdayNewUsers * 100))}%
                较昨日
              </p>
            )}
          </div>
          <div className="bg-white rounded-xl p-4 shadow-[0_2px_8px_rgba(61,50,45,0.06)]">
            <p className="text-xs text-slate-500 mb-1">昨日新增</p>
            <p className="text-2xl font-bold text-slate-800">{trend.yesterdayNewUsers}</p>
            <p className="text-xs text-slate-400 mt-1">新注册用户</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-[0_2px_8px_rgba(61,50,45,0.06)]">
            <p className="text-xs text-slate-500 mb-1">总用户</p>
            <p className="text-2xl font-bold text-slate-800">{trend.totalUsers}</p>
            <p className="text-xs text-slate-400 mt-1">累计注册</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-[0_2px_8px_rgba(61,50,45,0.06)]">
            <p className="text-xs text-slate-500 mb-1">律师数</p>
            <p className="text-2xl font-bold text-green-700">{trend.totalLawyers}</p>
            <p className="text-xs text-slate-400 mt-1">已入驻</p>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="bg-white rounded-xl p-4 shadow-[0_2px_8px_rgba(61,50,45,0.06)]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="搜索用户（姓名/电话）..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(61,50,45,0.06)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  用户
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  电话
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  角色
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  注册时间
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center gap-2 text-slate-500">
                      <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                      加载中...
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    暂无用户记录
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                          <span className="text-lg font-bold text-slate-600">{user.nickname?.[0] || 'U'}</span>
                        </div>
                        <span className="font-medium text-slate-800">{user.nickname || '未知用户'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                      {user.phone}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {(user.roles || []).map((role) => (
                          <span
                            key={role}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                              role === 'admin' ? 'bg-purple-100 text-purple-700' :
                              role === 'lawyer' ? 'bg-green-100 text-green-700' :
                              role === 'guardian' ? 'bg-blue-100 text-blue-700' :
                              'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {role === 'admin' && <Shield className="w-3 h-3" />}
                            {role === 'lawyer' && <Scale className="w-3 h-3" />}
                            {role === 'guardian' && <Users className="w-3 h-3" />}
                            {role === 'user' ? '普通用户' :
                             role === 'admin' ? '管理员' :
                             role === 'lawyer' ? '律师' :
                             role === 'guardian' ? '守护者' : role}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-500 text-sm">
                      {new Date(user.created_at).toLocaleDateString('zh-CN')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
