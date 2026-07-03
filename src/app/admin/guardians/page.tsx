'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Search, RefreshCw, Eye, Wallet } from 'lucide-react';
import { adminApiRequest } from '@/lib/api/request';
import { getAdminLoginUrl } from '@/lib/site';

interface Guardian {
  id: number;
  openid: string;
  nickname: string;
  avatar_url: string;
  invite_code: string;
  total_invites: number;
  valid_invites: number;
  total_commission: number;
  available_commission: number;
  withdrawn_commission: number;
  status: string;
  created_at: string;
}

interface GuardianStats {
  total: number;
  active: number;
  totalCommission: number;
  availableCommission: number;
}

export default function GuardiansPage() {
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [stats, setStats] = useState<GuardianStats>({ total: 0, active: 0, totalCommission: 0, availableCommission: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [needsLogin, setNeedsLogin] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, statsRes] = await Promise.all([
        adminApiRequest(`/api/admin/guardians?page=${page}&pageSize=10&search=${search}`),
        adminApiRequest('/api/admin/guardian-stats')
      ]);

      const [listData, statsData] = await Promise.all([listRes.json(), statsRes.json()]);

      if (listData.success) {
        setGuardians(listData.data.guardians || []);
        setTotalPages(listData.data.totalPages || 1);
      }

      if (statsData.success) {
        setStats(statsData.data);
      }
    } catch (error) {
      console.error('获取数据失败:', error);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    const adminInfo = localStorage.getItem('admin_info');
    if (!adminInfo) {
      setNeedsLogin(true);
      return;
    }
    fetchData();
  }, [fetchData]);

  const formatMoney = (cents: number) => {
    return (cents / 100).toFixed(2);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('zh-CN');
  };

  const handleSearch = () => {
    setPage(1);
    fetchData();
  };

  return (
    <>
      {needsLogin ? (
        <div className="min-h-[60vh] flex items-center justify-center bg-slate-50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-[0_12px_40px_rgba(15,23,42,0.08)] text-center">
            <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-green-50 flex items-center justify-center">
              <Users className="w-7 h-7 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">管理员登录</h1>
            <p className="mt-2 text-sm text-slate-500">请先登录管理员账号后再访问守护者管理</p>
          <div className="mt-6">
            <Link
              href={getAdminLoginUrl()}
              className="inline-flex items-center justify-center rounded-full bg-green-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-green-700"
            >
                前往登录
              </Link>
            </div>
          </div>
        </div>
      ) : (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">守护者管理</h1>
          <p className="text-slate-500 mt-1">管理平台守护者用户信息</p>
        </div>
        <div className="flex items-center gap-3">
          <Link 
            href="/admin/dashboard" 
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            返回工作台
          </Link>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>
      </div>

      <div>
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                守护者总数
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                活跃守护者
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.active}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                累计分成(元)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">¥{formatMoney(stats.totalCommission)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                待提现(元)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">¥{formatMoney(stats.availableCommission)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="搜索昵称/邀请码..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10"
                />
              </div>
              <Button onClick={handleSearch}>搜索</Button>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>守护者列表</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">加载中...</div>
            ) : guardians.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">暂无数据</div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>用户</TableHead>
                      <TableHead>邀请码</TableHead>
                      <TableHead>邀请人数</TableHead>
                      <TableHead>累计分成</TableHead>
                      <TableHead>可提现</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>注册时间</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {guardians.map((guardian) => (
                      <TableRow key={guardian.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden">
                              {guardian.avatar_url ? (
                                <img src={guardian.avatar_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs">
                                  {guardian.nickname?.[0] || '?'}
                                </div>
                              )}
                            </div>
                            <span>{guardian.nickname || '未设置昵称'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {guardian.invite_code}
                        </TableCell>
                        <TableCell>
                          <span className="text-green-600 font-medium">{guardian.valid_invites}</span>
                          <span className="text-muted-foreground">/{guardian.total_invites}</span>
                        </TableCell>
                        <TableCell className="font-medium">
                          ¥{formatMoney(guardian.total_commission)}
                        </TableCell>
                        <TableCell className="text-orange-600 font-medium">
                          ¥{formatMoney(guardian.available_commission)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={guardian.status === 'active' ? 'default' : 'secondary'}>
                            {guardian.status === 'active' ? '正常' : '禁用'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(guardian.created_at)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Link href={`/admin/guardians/${guardian.id}`}>
                              <Button variant="ghost" size="sm">
                                <Eye className="w-4 h-4" />
                              </Button>
                            </Link>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    第 {page} / {totalPages} 页
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page <= 1}
                    >
                      上一页
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                    >
                      下一页
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
      )}
    </>
  );
}
