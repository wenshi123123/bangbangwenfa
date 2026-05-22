'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { 
  Briefcase,
  MessageSquare,
  User,
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  Calendar,
  Phone,
  ChevronRight,
  Star
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';

interface LawyerProfile {
  id: number;
  name: string;
  phone: string;
  wechat: string;
  title: string;
  specialties: string[];
  status: string;
  is_available: boolean;
  max_orders: number;
  current_orders: number;
  rating: number;
  response_rate: number;
  member_expires_at: string;
}

interface PendingOrder {
  id: number;
  contact_name: string;
  contact_phone: string;
  case_title: string;
  case_description: string;
  service_type: string;
  service_price: number;
  assigned_at: string;
  category: string;
  created_at: string;
}

interface Stats {
  total: number;
  pending: number;
  completed: number;
}

const specialtyMap: Record<string, { label: string; color: string }> = {
  criminal: { label: '刑事案件', color: 'bg-red-100 text-red-700' },
  fraud: { label: '诈骗案件', color: 'bg-orange-100 text-orange-700' },
  marriage: { label: '婚姻家庭', color: 'bg-pink-100 text-pink-700' },
  property: { label: '房产纠纷', color: 'bg-blue-100 text-blue-700' },
  contract: { label: '合同纠纷', color: 'bg-purple-100 text-purple-700' },
  labor: { label: '劳动纠纷', color: 'bg-green-100 text-green-700' },
  traffic: { label: '交通事故', color: 'bg-yellow-100 text-yellow-700' },
  debt: { label: '债务纠纷', color: 'bg-gray-100 text-gray-700' },
};

const serviceTypeMap: Record<string, { label: string; color: string }> = {
  basic: { label: '基础咨询', color: 'bg-blue-100 text-blue-700' },
  standard: { label: '标准咨询', color: 'bg-green-100 text-green-700' },
  advanced: { label: '深度咨询', color: 'bg-purple-100 text-purple-700' },
  consult: { label: '咨询服务', color: 'bg-teal-100 text-teal-700' },
};

const categoryMap: Record<string, { label: string; color: string }> = {
  criminal: { label: '刑事案件', color: 'text-red-600' },
  civil: { label: '民事案件', color: 'text-blue-600' },
};

export default function LawyerPage() {
  const { user, isLoggedIn, isLoading } = useAuth();
  const [fromLogin, setFromLogin] = useState(false);
  const [profile, setProfile] = useState<LawyerProfile | null>(null);
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, completed: 0 });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const initRef = useRef(false);

  // 获取带认证的请求头
  const getAuthHeaders = useCallback((): HeadersInit => {
    const token = localStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }, []);

  // 获取律师数据（合并后的统一函数）
  const fetchLawyerData = useCallback(async () => {
    try {
      const headers = getAuthHeaders();
      const [profileRes, ordersRes] = await Promise.all([
        fetch('/api/lawyer/profile', { headers }),
        fetch('/api/lawyer/order/pending', { headers })
      ]);

      const profileData = await profileRes.json();
      const ordersData = await ordersRes.json();

      if (profileData.success && profileData.data) {
        setProfile(profileData.data);
        setStats({
          total: profileData.stats?.total || 0,
          pending: profileData.stats?.pending || 0,
          completed: profileData.stats?.completed || (profileData.stats?.total || 0) - (profileData.stats?.pending || 0),
        });
        sessionStorage.setItem('currentLawyerId', profileData.data.id.toString());
      }

      if (ordersData.success) {
        setPendingOrders(ordersData.orders || []);
      }
    } catch (error) {
      // 静默处理，用户可刷新页面重试
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  // fromLogin 模式：直接获取律师数据
  const loadFromLoginData = useCallback(async () => {
    try {
      const savedLawyerId = sessionStorage.getItem('currentLawyerId');
      if (savedLawyerId) {
        await fetchLawyerData();
        return;
      }

      const userInfo = sessionStorage.getItem('user_info');
      if (userInfo) {
        const userData = JSON.parse(userInfo);
        
        const res = await fetch(`/api/lawyer/check?userId=${userData.id}`);
        const data = await res.json();
        
        if (data.success && data.data && data.data.id) {
          const lawyerId = data.data.id;
          sessionStorage.setItem('currentLawyerId', lawyerId.toString());
          await fetchLawyerData();
        } else {
          // 无律师资格，跳转到入驻页面
          alert('您还没有律师入驻资格，即将跳转到入驻申请页面');
          window.location.href = '/lawyer/join';
        }
      } else {
        // 无登录信息，提示登录
        alert('请先登录后再访问');
        window.location.href = '/lawyer/login';
      }
    } catch (error) {
      console.error('加载律师数据失败:', error);
      alert('加载失败，请刷新页面重试');
      setLoading(false);
    }
  }, [fetchLawyerData]);

  // 检查 fromLogin 参数并加载数据（合并为一个 effect 避免 hydration 问题）
  useEffect(() => {
    // 防止重复执行
    if (initRef.current) return;
    initRef.current = true;

    // 检查 fromLogin 参数
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('fromLogin') === 'true') {
        setFromLogin(true);
        loadFromLoginData();
      } else if (!isLoading && !isLoggedIn) {
        window.dispatchEvent(new CustomEvent('open-login-modal'));
        setLoading(false);
      } else if (!isLoading && isLoggedIn && user?.lawyerId) {
        fetchLawyerData();
      } else {
        setLoading(false);
      }
    }
  }, [isLoading, isLoggedIn, user?.lawyerId, loadFromLoginData, fetchLawyerData]);

  const handleOrderAction = async (orderId: number, action: 'accept' | 'reject') => {
    if (!user?.lawyerId) return;

    const confirmText = action === 'accept' ? '确认接单' : '确认拒单';
    if (!confirm(`确定要${confirmText}吗？`)) return;

    setActionLoading(orderId);
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      };
      const response = await fetch('/api/lawyer/order/confirm', {
        method: 'POST',
        headers,
        body: JSON.stringify({ orderId, action, lawyerId: user.lawyerId })
      });

      const result = await response.json();
      
      if (result.success) {
        alert(result.message);
        // 从列表中移除
        setPendingOrders(pendingOrders.filter(o => o.id !== orderId));
        // 刷新统计数据
        fetchLawyerData();
      } else {
        alert(result.error || '操作失败');
      }
    } catch (error) {
      console.error('操作失败:', error);
      alert('操作失败，请重试');
    } finally {
      setActionLoading(null);
    }
  };

  // 计算会员剩余天数
  const getRemainingDays = () => {
    if (!profile?.member_expires_at) return null;
    const expiresAt = new Date(profile.member_expires_at);
    const now = new Date();
    const diff = expiresAt.getTime() - now.getTime();
    if (diff <= 0) return { days: 0, expired: true };
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    return { days, expired: false };
  };

  const remainingDays = getRemainingDays();

  const formatPrice = (price: number) => (price / 100).toFixed(2);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FEF3E2 0%, #FFF7ED 50%, #FEF3E2 100%)' }}>
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  // fromLogin 模式：直接显示工作台（不需要登录）
  // 正常模式：需要登录
  if (!fromLogin && (!isLoggedIn || !user?.isLawyer)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #FEF3E2 0%, #FFF7ED 50%, #FEF3E2 100%)' }}>
        <Card className="max-w-sm">
          <CardContent className="pt-6 text-center">
            <Shield className="w-12 h-12 text-orange-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">请先登录</h2>
            <p className="text-muted-foreground mb-4">登录后即可使用律师后台</p>
            <Button onClick={() => window.dispatchEvent(new CustomEvent('open-login-modal'))}>
              手机号登录
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-8" style={{ background: 'linear-gradient(135deg, #FEF3E2 0%, #FFF7ED 50%, #FEF3E2 100%)' }}>
      {/* 顶部导航栏 */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-orange-100/50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-1.5 text-orange-600">
              <RefreshCw className="w-5 h-5" />
              <span className="text-sm font-medium">首页</span>
            </Link>
            <div className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-orange-600" />
              <span className="text-base font-semibold text-orange-600">律师后台</span>
            </div>
            <div className="w-16" />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* 审核状态 */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-green-800">审核已通过</h3>
              <p className="text-sm text-green-700 mt-1">
                恭喜您成为帮帮问法认证律师，开始接收客户咨询吧
              </p>
            </div>
          </div>
        </div>

        {/* 律师信息卡片 */}
        <Link href="/lawyer/profile">
          <Card className="border-orange-200 hover:shadow-lg transition-shadow">
            <CardContent className="pt-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center text-white text-xl font-bold">
                  {profile?.name?.charAt(0) || '律'}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg">{profile?.name || '未填写姓名'}</h3>
                    {profile?.title && (
                      <Badge variant="outline" className="text-xs">{profile.title}</Badge>
                    )}
                  </div>
                  <div className="space-y-1.5 mt-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 w-12">手机</span>
                      <span className="text-sm text-gray-600">{profile?.phone || '未填写'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 w-12">微信</span>
                      <span className="text-sm text-gray-600">{profile?.wechat || '未填写'}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {profile?.specialties?.slice(0, 3).map((s: string) => {
                      const info = specialtyMap[s] || { label: s, color: 'bg-gray-100 text-gray-700' };
                      return <Badge key={s} className={`${info.color} text-xs`}>{info.label}</Badge>;
                    })}
                    {(profile?.specialties?.length || 0) > 3 && (
                      <Badge variant="outline" className="text-xs">+{profile!.specialties.length - 3}</Badge>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* 统计卡片 */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-orange-100">
            <CardContent className="pt-3 pb-3 text-center">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-1">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              <p className="text-xl font-bold">{pendingOrders.length}</p>
              <p className="text-xs text-muted-foreground">待确认</p>
            </CardContent>
          </Card>
          <Card className="border-green-100">
            <CardContent className="pt-3 pb-3 text-center">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-1">
                <MessageSquare className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-xl font-bold">{stats.completed || 0}</p>
              <p className="text-xs text-muted-foreground">已接单</p>
            </CardContent>
          </Card>
          <Card className="border-yellow-100">
            <CardContent className="pt-3 pb-3 text-center">
              <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-1">
                <Star className="w-5 h-5 text-yellow-600" />
              </div>
              <p className="text-xl font-bold">{profile?.rating || 5.0}</p>
              <p className="text-xs text-muted-foreground">好评率</p>
            </CardContent>
          </Card>
        </div>

        {/* 会员信息 */}
        <Card className="border-orange-200">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  remainingDays?.expired 
                    ? 'bg-red-100' 
                    : remainingDays && remainingDays.days <= 7
                      ? 'bg-yellow-100'
                      : 'bg-gradient-to-br from-orange-100 to-orange-200'
                }`}>
                  <Calendar className={`w-6 h-6 ${
                    remainingDays?.expired ? 'text-red-600' : 'text-orange-600'
                  }`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">会员有效期</p>
                  <p className={`font-bold ${remainingDays?.expired ? 'text-red-600' : 'text-gray-900'}`}>
                    {remainingDays?.expired 
                      ? '已到期' 
                      : remainingDays 
                        ? `剩余 ${remainingDays.days} 天`
                        : '未激活'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    可接单数：{profile?.current_orders || 0} / {profile?.max_orders || 50}
                  </p>
                </div>
              </div>
              {!remainingDays?.expired ? (
                <Link href="/lawyer/renew">
                  <Button size="sm" className="bg-gradient-to-r from-orange-500 to-orange-600">
                    续费
                  </Button>
                </Link>
              ) : (
                <Link href="/lawyer/renew">
                  <Button size="sm" variant="destructive">立即续费</Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 待确认订单列表 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-lg">待确认订单</h3>
            {pendingOrders.length > 0 && (
              <Badge variant="outline" className="bg-orange-100">{pendingOrders.length} 单</Badge>
            )}
          </div>

          {pendingOrders.length === 0 ? (
            <Card className="border-gray-200">
              <CardContent className="py-8 text-center">
                <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-2" />
                <p className="text-muted-foreground">暂无待确认订单</p>
                <p className="text-xs text-muted-foreground mt-1">有新订单会在这里显示</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {pendingOrders.map((order) => {
                const serviceInfo = serviceTypeMap[order.service_type] || { label: order.service_type, color: 'bg-gray-100 text-gray-700' };
                const catInfo = categoryMap[order.category] || { label: order.category, color: 'text-gray-600' };

                return (
                  <Card key={order.id} className="border-orange-100">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-sm font-medium ${catInfo.color}`}>{catInfo.label}</span>
                            <Badge className={serviceInfo.color}>{serviceInfo.label}</Badge>
                          </div>
                          <h4 className="font-semibold">{order.case_title}</h4>
                        </div>
                        <div className="text-right ml-4">
                          <p className="text-lg font-bold text-green-600">¥{formatPrice(order.service_price)}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(order.assigned_at)}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 p-2 bg-gray-50 rounded-lg mb-3">
                        <span className="text-xs text-muted-foreground">
                          客户：{order.contact_name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          手机：{order.contact_phone}
                        </span>
                      </div>

                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {order.case_description}
                      </p>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                          onClick={() => handleOrderAction(order.id, 'reject')}
                          disabled={actionLoading === order.id}
                        >
                          {actionLoading === order.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <XCircle className="w-4 h-4 mr-1" />
                              拒单
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                          onClick={() => handleOrderAction(order.id, 'accept')}
                          disabled={actionLoading === order.id}
                        >
                          {actionLoading === order.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4 mr-1" />
                              接单
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* 功能菜单 */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/lawyer/orders">
            <Card className="hover:shadow-lg transition-shadow border-orange-100">
              <CardContent className="py-4 text-center">
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center mx-auto mb-2">
                  <MessageSquare className="w-6 h-6 text-blue-600" />
                </div>
                <p className="font-semibold">已接订单</p>
                <p className="text-xs text-muted-foreground mt-1">查看所有已接咨询</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/lawyer/profile">
            <Card className="hover:shadow-lg transition-shadow border-orange-100">
              <CardContent className="py-4 text-center">
                <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center mx-auto mb-2">
                  <User className="w-6 h-6 text-purple-600" />
                </div>
                <p className="font-semibold">我的资料</p>
                <p className="text-xs text-muted-foreground mt-1">编辑个人简介</p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* 联系客服 */}
        <Card className="border-gray-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                <Phone className="w-5 h-5 text-orange-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">遇到问题？</p>
                <p className="text-xs text-muted-foreground">联系客服帮帮姐获得帮助</p>
              </div>
              <Button variant="outline" size="sm">联系客服</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
