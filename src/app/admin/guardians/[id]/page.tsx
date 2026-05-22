'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, User, Wallet, Users, Gift, Clock, CheckCircle, XCircle } from 'lucide-react';
import { adminApiRequest } from '@/lib/api/request';

interface Guardian {
  id: number;
  openid: string | null;
  nickname: string | null;
  avatar_url: string | null;
  invite_code: string;
  total_invites: number;
  valid_invites: number;
  total_commission: number;
  available_commission: number;
  withdrawn_commission: number;
  status: string;
  wechat_account: string | null;
  created_at: string;
}

interface Commission {
  id: number;
  order_id: number;
  commission_amount: number;
  commission_rate: number;
  status: string;
  created_at: string;
}

interface Withdrawal {
  id: number;
  amount: number;
  status: string;
  created_at: string;
  processed_at: string | null;
}

interface Invitee {
  id: number;
  user_id: number;
  nickname: string | null;
  is_valid: boolean;
  created_at: string;
}

export default function GuardianDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [guardian, setGuardian] = useState<Guardian | null>(null);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [invitees, setInvitees] = useState<Invitee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'commissions' | 'withdrawals' | 'invitees'>('commissions');

  useEffect(() => {
    const fetchGuardian = async () => {
      if (!params.id) return;
      
      setLoading(true);
      try {
        const response = await adminApiRequest(`/api/admin/guardian/${params.id}`);
        const result = await response.json();
        
        if (result.success) {
          setGuardian(result.data.guardian);
          setCommissions(result.data.commissions);
          setWithdrawals(result.data.withdrawals);
          setInvitees(result.data.invitees);
        } else {
          setError(result.error || '获取守护者信息失败');
        }
      } catch (err) {
        setError('加载失败，请重试');
      } finally {
        setLoading(false);
      }
    };

    fetchGuardian();
  }, [params.id]);

  const formatMoney = (cents: number) => {
    return (cents / 100).toFixed(2);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
      case 'completed':
      case 'active':
        return <Badge className="bg-green-500">已通过</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500">待处理</Badge>;
      case 'rejected':
      case 'banned':
        return <Badge className="bg-red-500">已拒绝</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  if (error || !guardian) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Link href="/admin/guardians">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回列表
            </Button>
          </Link>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">{error || '守护者不存在'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex items-center gap-4">
        <Link href="/admin/guardians">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回列表
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">守护者详情</h1>
      </div>

      {/* 基本信息 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            基本信息
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <div className="text-sm text-muted-foreground">昵称</div>
              <div className="text-lg font-medium">{guardian.nickname || '未设置'}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">邀请码</div>
              <div className="text-lg font-mono">{guardian.invite_code}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">状态</div>
              <div className="mt-1">{getStatusBadge(guardian.status)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">注册时间</div>
              <div className="text-sm">{formatDate(guardian.created_at)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 统计数据 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-full">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{guardian.total_invites}</div>
                <div className="text-sm text-muted-foreground">累计邀请</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{guardian.valid_invites}</div>
                <div className="text-sm text-muted-foreground">有效邀请</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-full">
                <Gift className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">¥{formatMoney(guardian.total_commission)}</div>
                <div className="text-sm text-muted-foreground">累计分成</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-100 rounded-full">
                <Wallet className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">¥{formatMoney(guardian.withdrawn_commission)}</div>
                <div className="text-sm text-muted-foreground">已提现</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tab切换 */}
      <div className="flex gap-4 border-b">
        <button
          className={`pb-2 px-4 font-medium ${activeTab === 'commissions' ? 'border-b-2 border-primary' : 'text-muted-foreground'}`}
          onClick={() => setActiveTab('commissions')}
        >
          分成记录 ({commissions.length})
        </button>
        <button
          className={`pb-2 px-4 font-medium ${activeTab === 'withdrawals' ? 'border-b-2 border-primary' : 'text-muted-foreground'}`}
          onClick={() => setActiveTab('withdrawals')}
        >
          提现记录 ({withdrawals.length})
        </button>
        <button
          className={`pb-2 px-4 font-medium ${activeTab === 'invitees' ? 'border-b-2 border-primary' : 'text-muted-foreground'}`}
          onClick={() => setActiveTab('invitees')}
        >
          邀请用户 ({invitees.length})
        </button>
      </div>

      {/* 分成记录 */}
      {activeTab === 'commissions' && (
        <Card>
          <CardContent className="p-0">
            {commissions.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">暂无分成记录</div>
            ) : (
              <div className="divide-y">
                {commissions.map((item) => (
                  <div key={item.id} className="p-4 flex items-center justify-between">
                    <div>
                      <div className="font-medium">订单 #{item.order_id}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatDate(item.created_at)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-600">
                        +¥{formatMoney(item.commission_amount)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        比例 {(item.commission_rate * 100).toFixed(0)}%
                      </div>
                    </div>
                    <div className="ml-4">{getStatusBadge(item.status)}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 提现记录 */}
      {activeTab === 'withdrawals' && (
        <Card>
          <CardContent className="p-0">
            {withdrawals.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">暂无提现记录</div>
            ) : (
              <div className="divide-y">
                {withdrawals.map((item) => (
                  <div key={item.id} className="p-4 flex items-center justify-between">
                    <div>
                      <div className="font-medium">提现申请</div>
                      <div className="text-sm text-muted-foreground">
                        {formatDate(item.created_at)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-orange-600">
                        -¥{formatMoney(item.amount)}
                      </div>
                    </div>
                    <div className="ml-4">{getStatusBadge(item.status)}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 邀请用户 */}
      {activeTab === 'invitees' && (
        <Card>
          <CardContent className="p-0">
            {invitees.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">暂无邀请用户</div>
            ) : (
              <div className="divide-y">
                {invitees.map((item) => (
                  <div key={item.id} className="p-4 flex items-center justify-between">
                    <div>
                      <div className="font-medium">用户 #{item.user_id}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatDate(item.created_at)}
                      </div>
                    </div>
                    <div className="ml-4">
                      {item.is_valid ? (
                        <Badge className="bg-green-500">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          有效
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <XCircle className="w-3 h-3 mr-1" />
                          无效
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
