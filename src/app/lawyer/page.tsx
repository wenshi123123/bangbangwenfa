'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  MessageSquare,
  User,
  Shield,
  Clock,
  CheckCircle,
  Loader2,
  Calendar,
  ChevronRight,
} from 'lucide-react';
import { useLawyerAuth } from '@/hooks/use-lawyer-auth';
import { LawyerBottomNav } from '@/components/lawyer/lawyer-bottom-nav';

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
  member_starting_at?: string;
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
  criminal: { label: '刑事案件', color: 'bg-[#C26565]/10 text-[#C26565]' },
  fraud: { label: '诈骗案件', color: 'bg-[#C8963E]/10 text-[#C8963E]' },
  marriage: { label: '婚姻家庭', color: 'bg-[#C47353]/10 text-[#C47353]' },
  property: { label: '房产纠纷', color: 'bg-[#5C7A5A]/10 text-[#5C7A5A]' },
  contract: { label: '合同纠纷', color: 'bg-[#7D6B5D]/10 text-[#7D6B5D]' },
  labor: { label: '劳动纠纷', color: 'bg-[#5C7A5A]/10 text-[#5C7A5A]' },
  traffic: { label: '交通事故', color: 'bg-[#C8963E]/10 text-[#C8963E]' },
  debt: { label: '债务纠纷', color: 'bg-[#8C7B6E]/10 text-[#8C7B6E]' },
};

const serviceTypeMap: Record<string, { label: string; color: string }> = {
  basic: { label: '基础咨询', color: 'bg-[#5C7A5A]/10 text-[#5C7A5A]' },
  standard: { label: '标准咨询', color: 'bg-[#B8860B]/10 text-[#B8860B]' },
  advanced: { label: '深度咨询', color: 'bg-[#7B4B8B]/10 text-[#7B4B8B]' },
  consult: { label: '咨询服务', color: 'bg-[#C47353]/10 text-[#C47353]' },
};

const categoryMap: Record<string, { label: string; color: string; barColor: string }> = {
  criminal: { label: '刑事案件', color: 'text-[#C26565]', barColor: '#C26565' },
  civil: { label: '民事案件', color: 'text-[#5C7A5A]', barColor: '#5C7A5A' },
};

export default function LawyerPage() {
  const { user, isAuthorized, isLoading: authLoading, lawyerId, getAuthHeaders } = useLawyerAuth();
  const [fromLogin, setFromLogin] = useState(false);
  const [profile, setProfile] = useState<LawyerProfile | null>(null);
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, completed: 0 });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [debugRaw, setDebugRaw] = useState<Record<string, unknown> | null>(null);
  const initRef = useRef(false);

  const fetchLawyerData = useCallback(async () => {
    try {
      const headers = getAuthHeaders();
      const [profileRes, ordersRes] = await Promise.all([
        fetch('/api/lawyer/profile', { headers, cache: 'no-store' }),
        fetch('/api/lawyer/order/pending', { headers, cache: 'no-store' }),
      ]);

      const profileData = await profileRes.json();
      const ordersData = await ordersRes.json();

      if (profileData.success && profileData.data) {
        const rawData = profileData.data;
        setDebugRaw(rawData as Record<string, unknown>);
        const normalizedProfile: LawyerProfile = {
          ...rawData,
          name: rawData.name || rawData.real_name || '',
          specialties:
            rawData.specialties ||
            (typeof rawData.specialization === 'string'
              ? JSON.parse(rawData.specialization || '[]')
              : []) ||
            [],
        };
        setProfile(normalizedProfile);
        setStats({
          total: profileData.stats?.total || 0,
          pending: profileData.stats?.pending || 0,
          completed:
            profileData.stats?.completed ||
            (profileData.stats?.total || 0) - (profileData.stats?.pending || 0),
        });
        sessionStorage.setItem('currentLawyerId', profileData.data.id.toString());
      }

      if (ordersData.success) {
        setPendingOrders(ordersData.orders || []);
      }
    } catch {
      // 静默处理
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

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
          alert('您还没有律师入驻资格，即将跳转到入驻申请页面');
          window.location.href = '/lawyer/join';
        }
      } else {
        alert('请先登录后再访问');
        window.location.href = '/lawyer/login';
      }
    } catch {
      alert('加载失败，请刷新页面重试');
      setLoading(false);
    }
  }, [fetchLawyerData]);

  const hasLawyerIdentity = useCallback((): boolean => {
    if (typeof window === 'undefined') return false;
    const savedLawyerId = sessionStorage.getItem('currentLawyerId');
    if (savedLawyerId) return true;
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.userType === 'lawyer' || payload.lawyerId) return true;
      } catch { /* empty */ }
    }
    return false;
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (initRef.current) return;
    initRef.current = true;

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('fromLogin') === 'true') {
        setFromLogin(true);
        loadFromLoginData();
      } else if (isAuthorized || hasLawyerIdentity()) {
        fetchLawyerData();
      } else {
        setLoading(false);
      }
    }
  }, [authLoading, isAuthorized, loadFromLoginData, fetchLawyerData, hasLawyerIdentity]);

  useEffect(() => {
    if (initRef.current && !authLoading && !loading && !profile) {
      if (hasLawyerIdentity() || isAuthorized) {
        fetchLawyerData();
      }
    }
  }, [authLoading, isAuthorized, loading, profile, hasLawyerIdentity, fetchLawyerData]);

  const handleOrderAction = async (orderId: number, action: 'accept' | 'reject') => {
    if (!lawyerId) return;
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
        body: JSON.stringify({ orderId, action, lawyerId }),
      });
      const result = await response.json();
      if (result.success) {
        alert(result.message);
        setPendingOrders(pendingOrders.filter((o) => o.id !== orderId));
        fetchLawyerData();
      } else {
        alert(result.error || '操作失败');
      }
    } catch {
      alert('操作失败，请重试');
    } finally {
      setActionLoading(null);
    }
  };

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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 6) return '夜深了';
    if (hour < 12) return '上午好';
    if (hour < 14) return '中午好';
    if (hour < 18) return '下午好';
    return '晚上好';
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF7F2]">
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-10 h-10 rounded-full border-2 border-[#C47353] border-t-transparent animate-spin"
          />
          <span className="text-sm text-[#8C7B6E]">加载中…</span>
        </div>
      </div>
    );
  }

  const isLawyerAuthenticated = fromLogin || isAuthorized || hasLawyerIdentity();

  if (!isLawyerAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#FAF7F2]">
        <div className="bg-white rounded-2xl p-8 shadow-lg max-w-sm w-full text-center">
          <div className="w-14 h-14 rounded-full bg-[#C47353]/10 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-7 h-7 text-[#C47353]" />
          </div>
          <h2 className="text-xl font-bold text-[#3D322D] mb-2 font-serif">请先登录</h2>
          <p className="text-[#8C7B6E] mb-6">登录后即可使用律师后台</p>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open-login-modal'))}
            className="w-full py-3 bg-[#C47353] text-white font-medium rounded-xl hover:bg-[#A85D40] transition-colors"
          >
            手机号登录
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 bg-[#FAF7F2]">
      {/* ===== 顶栏 ===== */}
      <div className="sticky top-0 z-40 bg-[#FDF8F0]/95 backdrop-blur-xl border-b border-[#E8D5C0]/50">
        <div className="px-4 py-3 flex items-center justify-between max-w-2xl lg:max-w-5xl mx-auto">
          <Link href="/" className="text-sm text-[#8C7B6E] hover:text-[#C47353] transition-colors">
            ← 返回首页
          </Link>
          <span className="text-[15px] font-semibold text-[#1C1917] font-serif tracking-wide">
            律师工作台
          </span>
          <div className="w-14" />
        </div>
      </div>

      <div className="max-w-2xl lg:max-w-5xl mx-auto px-4 py-6 lg:py-8 space-y-6">
        {/* ============================================================ */}
        {/*  HERO ROW — 律师身份大卡 + 右侧指标栏（Bento 非对称网格）      */}
        {/* ============================================================ */}
        <div className="lg:grid lg:grid-cols-7 lg:gap-5 space-y-5 lg:space-y-0">
          
          {/* ─── 左：律师身份 HERO 卡片（占 5/7）─── */}
          <Link href="/lawyer/profile" className="lg:col-span-5 block group animate-slide-up stagger-1">
            <div className="relative bg-gradient-to-br from-[#C47353] via-[#B06545] to-[#8B4513] rounded-2xl p-6 lg:p-7 shadow-lg shadow-[#C47353]/15 overflow-hidden transition-all duration-300 group-hover:shadow-xl group-hover:shadow-[#C47353]/25 group-hover:-translate-y-0.5">
              {/* 装饰圆 */}
              <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/5 rounded-full" />
              <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/5 rounded-full" />

              <div className="relative z-10">
                {/* 顶行：问候语 + 审核徽章 */}
                <div className="flex items-center justify-between mb-5">
                  <p className="text-white/65 text-sm tracking-wide">
                    {getGreeting()}，欢迎回来
                  </p>
                  <span className="inline-flex items-center gap-1.5 text-[11px] bg-white/15 text-white/90 px-3 py-1 rounded-full backdrop-blur-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
                    审核通过
                  </span>
                </div>

                {/* 头像 + 身份 */}
                <div className="flex items-start gap-5 mb-5">
                  <div className="w-20 h-20 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center text-white text-3xl font-serif flex-shrink-0 border border-white/20 shadow-inner">
                    {profile?.name?.charAt(0) || '律'}
                  </div>
                  <div className="flex-1 min-w-0 pt-1">
                    <h2 className="text-2xl lg:text-3xl font-bold text-white font-serif tracking-tight leading-tight">
                      {profile?.name || '未填写姓名'}
                    </h2>
                    {profile?.title && (
                      <p className="text-white/65 text-sm mt-0.5">{profile.title}</p>
                    )}
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {profile?.specialties?.slice(0, 4).map((s: string) => {
                        const info = specialtyMap[s] || { label: s, color: '' };
                        return (
                          <span key={s} className="text-[11px] px-2.5 py-0.5 rounded-full bg-white/15 text-white/85 font-medium backdrop-blur-sm">
                            {info.label}
                          </span>
                        );
                      })}
                      {(profile?.specialties?.length || 0) > 4 && (
                        <span className="text-[11px] text-white/50 px-1">+{profile!.specialties.length - 4}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 底部指标条 */}
                <div className="grid grid-cols-2 gap-2 pt-4 border-t border-white/12">
                  {[
                    { val: stats.completed || 0, label: '已接单', sub: '累计' },
                    { val: profile?.rating != null ? `${profile.rating}%` : '--', label: '好评率', sub: '评价' },
                  ].map((m) => (
                    <div key={m.label} className="text-center">
                      <p className="text-xl lg:text-2xl font-bold text-white font-serif">{m.val}</p>
                      <p className="text-white/75 text-[11px] font-medium mt-0.5">{m.label}</p>
                      <p className="text-white/40 text-[10px]">{m.sub}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Link>

          {/* ─── 右：指标侧栏（占 2/7）─── */}
          <div className="lg:col-span-2 space-y-3 lg:space-y-4 animate-slide-up stagger-2">
            
            {/* 待确认 */}
            <div className="bg-[#FFFBF5] rounded-2xl border border-[#E8D5C0] overflow-hidden shadow-sm">
              <div className="h-[3px] bg-[#C8963E]" />
              <div className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-3.5 h-3.5 text-[#C8963E]" />
                  <span className="text-[11px] text-[#78716C] uppercase tracking-wider font-semibold">待确认</span>
                </div>
                <p className="text-3xl font-bold text-[#1C1917] font-serif">{pendingOrders.length}</p>
                <p className="text-[11px] text-[#A89B90] mt-0.5">个新订单待处理</p>
              </div>
            </div>

            {/* 已完成 */}
            <div className="bg-[#FFFBF5] rounded-2xl border border-[#E8D5C0] overflow-hidden shadow-sm">
              <div className="h-[3px] bg-[#5C7A5A]" />
              <div className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="w-3.5 h-3.5 text-[#5C7A5A]" />
                  <span className="text-[11px] text-[#78716C] uppercase tracking-wider font-semibold">已完成</span>
                </div>
                <p className="text-3xl font-bold text-[#1C1917] font-serif">{stats.completed || 0}</p>
                <p className="text-[11px] text-[#A89B90] mt-0.5">累计接单数</p>
              </div>
            </div>

            {/* 会员 */}
            <div className="bg-[#FFFBF5] rounded-2xl border border-[#E8D5C0] overflow-hidden shadow-sm">
              <div
                className="h-[3px]"
                style={{
                  backgroundColor:
                    remainingDays?.expired ? '#C26565' : remainingDays && remainingDays.days <= 7 ? '#C8963E' : '#5C7A5A',
                }}
              />
              <div className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar
                    className={`w-3.5 h-3.5 ${
                      remainingDays?.expired ? 'text-[#C26565]' : remainingDays && remainingDays.days <= 7 ? 'text-[#C8963E]' : 'text-[#5C7A5A]'
                    }`}
                  />
                  <span className="text-[11px] text-[#78716C] uppercase tracking-wider font-semibold">会员</span>
                </div>
                <p
                  className={`text-lg font-bold font-serif ${
                    remainingDays?.expired ? 'text-[#C26565]' : 'text-[#1C1917]'
                  }`}
                >
                  {remainingDays?.expired
                    ? '已到期'
                    : remainingDays
                      ? `剩余 ${remainingDays.days} 天`
                      : '未激活'}
                </p>
                {profile?.member_starting_at && profile?.member_expires_at ? (
                  <p className="text-[11px] text-[#A89B90] mt-1">
                    {(() => {
                      const fmt = (s: string) => {
                        const d = new Date(s);
                        return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
                      };
                      return `${fmt(profile.member_starting_at!)} → ${fmt(profile.member_expires_at)}`;
                    })()}
                  </p>
                ) : (
                  <p className="text-[9px] text-[#C8963E] mt-1 font-mono break-all">
                    DEBUG: exp={String(debugRaw?.member_expires_at ?? '∅')} start={String(debugRaw?.member_starting_at ?? '∅')}
                  </p>
                )}
                <Link href="/lawyer/renew" className="mt-3 inline-block">
                  <span
                    className={`text-[11px] px-3 py-1.5 rounded-lg font-medium transition-colors ${
                      remainingDays?.expired
                        ? 'bg-[#C26565] text-white hover:bg-[#A85252]'
                        : 'bg-[#F0E6DB] text-[#C47353] hover:bg-[#E8D8C8]'
                    }`}
                  >
                    {remainingDays?.expired ? '立即续费' : '续费会员'}
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/*  待确认订单（多列卡片网格）                                      */}
        {/* ============================================================ */}
        <div className="animate-slide-up stagger-3">
          {/* 两端带装饰线的标题 */}
          <div className="flex items-center gap-4 mb-5">
            <div className="flex-1 h-px bg-[#E8D5C0]" />
            <div className="flex items-center gap-2.5 flex-shrink-0">
              <h3 className="text-sm font-semibold text-[#1C1917] font-serif tracking-wide">待确认订单</h3>
              {pendingOrders.length > 0 && (
                <span className="text-[11px] bg-[#C47353] text-white w-5 h-5 rounded-full flex items-center justify-center font-bold">
                  {pendingOrders.length}
                </span>
              )}
            </div>
            <div className="flex-1 h-px bg-[#E8D5C0]" />
          </div>

          {pendingOrders.length === 0 ? (
            <div className="bg-[#FFFBF5] rounded-2xl py-14 border border-dashed border-[#E8D5C0] text-center">
              <div className="w-16 h-16 rounded-2xl bg-[#F5F0E8] flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-7 h-7 text-[#C8BDB2]" />
              </div>
              <p className="text-[#78716C] text-sm font-medium">暂无待确认订单</p>
              <p className="text-[#A89B90] text-xs mt-1">新订单会在此处显示，保持关注</p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {pendingOrders.map((order) => {
                const serviceInfo = serviceTypeMap[order.service_type] || {
                  label: order.service_type,
                  color: 'bg-[#F5F2ED] text-[#8C7B6E]',
                };
                const catInfo = categoryMap[order.category] || {
                  label: order.category,
                  color: 'text-[#8C7B6E]',
                  barColor: '#8C7B6E',
                };

                return (
                  <div
                    key={order.id}
                    className="bg-[#FFFBF5] rounded-2xl border border-[#E8D5C0] shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow duration-300"
                  >
                    {/* 卡片头部 + 左侧色条 */}
                    <div className="flex">
                      <div className="w-1 flex-shrink-0" style={{ backgroundColor: catInfo.barColor }} />
                      <div className="flex-1 px-4 pt-4 pb-0">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[11px] font-semibold ${catInfo.color}`}>{catInfo.label}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${serviceInfo.color}`}>{serviceInfo.label}</span>
                          </div>
                          <span className="text-lg font-bold text-[#B8860B] font-serif whitespace-nowrap ml-2">
                            ¥{formatPrice(order.service_price)}
                          </span>
                        </div>
                        <h4 className="font-semibold text-[#1C1917] text-sm mb-3 leading-snug">{order.case_title}</h4>
                      </div>
                    </div>

                    {/* 卡片中部 — 客户信息 + 描述 */}
                    <div className="px-4 flex-1">
                      <div className="flex items-center gap-3 mb-3 p-2.5 bg-[#FDF8F0] rounded-xl text-xs">
                        <span className="text-[#78716C] font-medium">{order.contact_name}</span>
                        <span className="w-px h-3 bg-[#E8D5C0]" />
                        <span className="text-[#78716C]">{order.contact_phone}</span>
                        <span className="flex-1" />
                        <span className="text-[#A89B90] text-[11px]">{formatDate(order.assigned_at)}</span>
                      </div>
                      <p className="text-xs text-[#78716C] line-clamp-2 mb-4 leading-relaxed">{order.case_description}</p>
                    </div>

                    {/* 卡片底部 — 操作按钮 */}
                    <div className="px-4 pb-4 flex gap-3 mt-auto">
                      <button
                        className="flex-1 py-2.5 text-xs font-medium rounded-xl border border-[#C26565]/25 text-[#C26565] hover:bg-[#C26565]/5 transition-colors disabled:opacity-50"
                        onClick={() => handleOrderAction(order.id, 'reject')}
                        disabled={actionLoading === order.id}
                      >
                        {actionLoading === order.id ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : '拒单'}
                      </button>
                      <button
                        className="flex-1 py-2.5 text-xs font-medium rounded-xl bg-[#5C7A5A] text-white hover:bg-[#4D6A4B] transition-colors disabled:opacity-50 active:scale-[0.98] shadow-sm shadow-[#5C7A5A]/20"
                        onClick={() => handleOrderAction(order.id, 'accept')}
                        disabled={actionLoading === order.id}
                      >
                        {actionLoading === order.id ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : '接单'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/*  快捷入口 + 联系客服（底部功能区）                                */}
        {/* ============================================================ */}
        <div className="grid grid-cols-2 gap-4 animate-slide-up stagger-4">
          <Link href="/lawyer/orders" className="group">
            <div className="bg-[#FFFBF5] rounded-2xl border border-[#E8D5C0] overflow-hidden hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
              <div className="h-[3px] bg-[#5C7A5A]" />
              <div className="p-5 flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-[#5C7A5A]/10 flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-5 h-5 text-[#5C7A5A]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[#1C1917] text-sm">已接订单</p>
                  <p className="text-xs text-[#A89B90] mt-0.5">查看所有已接咨询</p>
                </div>
                <ChevronRight className="w-4 h-4 text-[#C8BDB2] flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </Link>
          <Link href="/lawyer/profile" className="group">
            <div className="bg-[#FFFBF5] rounded-2xl border border-[#E8D5C0] overflow-hidden hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
              <div className="h-[3px] bg-[#C47353]" />
              <div className="p-5 flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-[#C47353]/10 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-[#C47353]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[#1C1917] text-sm">我的资料</p>
                  <p className="text-xs text-[#A89B90] mt-0.5">编辑个人简介与擅长</p>
                </div>
                <ChevronRight className="w-4 h-4 text-[#C8BDB2] flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </Link>
        </div>

        {/* 联系客服 */}
        <div
          className="bg-[#FFFBF5] rounded-2xl border border-[#E8D5C0] overflow-hidden cursor-pointer hover:shadow-sm transition-all duration-300 animate-slide-up stagger-5"
          onClick={() => {
            // 创建遮罩层覆盖整个页面，flex 居中
            const overlay = document.createElement('div');
            overlay.className = 'fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4';
            overlay.style.backdropFilter = 'blur(2px)';

            const card = document.createElement('div');
            card.className = 'bg-white rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl';
            card.innerHTML = `
              <h3 class="text-lg font-bold text-[#1C1917] mb-2 font-serif">关注公众号联系客服</h3>
              <p class="text-sm text-[#78716C] mb-4">扫码关注「帮帮问法」公众号<br/>在线客服将为您解答问题</p>
              <div class="mx-auto mb-4 flex items-center justify-center">
                <img src="/qrcode_for_gh_3203ee4ded0e_430.jpg"
                     alt="公众号二维码"
                     class="w-48 h-48 rounded-xl border border-[#E8D5C0]"
                     onerror="this.onerror=null;this.src='/wechat-qr.png'" />
              </div>
              <button class="w-full py-2.5 bg-[#F5F0E8] text-[#78716C] rounded-xl hover:bg-[#EBE3D8] text-sm font-medium transition-colors">关闭</button>
            `;

            overlay.appendChild(card);

            // 点击遮罩关闭
            overlay.addEventListener('click', (e) => {
              if (e.target === overlay) overlay.remove();
            });
            // 按钮关闭
            const btn = card.querySelector('button');
            if (btn) {
              btn.addEventListener('click', () => overlay.remove());
            }

            document.body.appendChild(overlay);
          }}
        >
          <div className="h-[3px] bg-[#C47353]" />
          <div className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#C47353]/10 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-[#C47353]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 10.9c1.2 3.2 3.9 5.9 7.1 7.1l1.6-1.6c.2-.2.5-.3.8-.2 1 .3 2 .5 3 .5.4 0 .7.3.7.7v3c0 .4-.3.7-.7.7C11.4 21 3 12.6 3 3.7 3 3.3 3.3 3 3.7 3h3c.4 0 .7.3.7.7 0 1 .2 2 .5 3 .1.3 0 .6-.2.8L8 10.9z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-[#1C1917]">遇到问题？</p>
              <p className="text-xs text-[#A89B90]">关注公众号联系客服帮帮姐</p>
            </div>
            <span className="text-xs text-[#C47353] font-medium">查看客服 →</span>
          </div>
        </div>
      </div>

      <LawyerBottomNav />
    </div>
  );
}
