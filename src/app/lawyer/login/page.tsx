'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Loader2,
  Shield,
  AlertCircle,
  CheckCircle,
  User,
  Briefcase,
  Clock,
  CreditCard,
  Wrench,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

export const dynamic = 'force-dynamic';

export default function LawyerLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoggedIn, isLoading } = useAuth();
  const [authFallbackChecked, setAuthFallbackChecked] = useState(false);
  const [fallbackUser, setFallbackUser] = useState<any>(null);
  const [status, setStatus] = useState<
    | 'checking'
    | 'not_logged_in'
    | 'no_application'
    | 'pending'
    | 'paid_not_reviewed'
    | 'approved'
    | 'rejected'
  >('not_logged_in');
  const [applicationData, setApplicationData] = useState<any>(null);
  const [error, setError] = useState('');
  const mountedRef = useRef(true);
  const timeoutRef = useRef<NodeJS.Timeout>(undefined!);
  const effectiveUser = user || fallbackUser;
  const effectiveLoggedIn = isLoggedIn || !!fallbackUser;
  const redirectTarget = searchParams.get('redirect');
  const safeRedirectTarget =
    redirectTarget && redirectTarget.startsWith('/lawyer') && redirectTarget !== '/lawyer/login'
      ? redirectTarget
      : '/lawyer?fromLogin=true';

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  useEffect(() => {
    mountedRef.current = true;
    timeoutRef.current = setTimeout(() => {
      if (mountedRef.current && status === 'checking') {
        setStatus('not_logged_in');
        setError('检查超时，请刷新页面重试');
      }
    }, 10000);

    const fallbackTimer = setTimeout(() => {
      if (authFallbackChecked) return;
      try {
        const userInfo = localStorage.getItem('user_info');
        const guardianUser = localStorage.getItem('guardian_user');
        const parsed = userInfo
          ? JSON.parse(userInfo)
          : guardianUser
            ? JSON.parse(guardianUser)
            : null;
        setFallbackUser(parsed);
      } catch {
        setFallbackUser(null);
      } finally {
        setAuthFallbackChecked(true);
      }
    }, 1200);

    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      clearTimeout(fallbackTimer);
    };
  }, [status, authFallbackChecked]);

  const checkLawyerStatus = useCallback(async () => {
    if (!effectiveUser?.id) return;
    setStatus('checking');
    setError('');

    try {
      const [lawyerRes, appRes] = await Promise.all([
        fetch(`/api/lawyer/check?userId=${effectiveUser.id}`),
        fetch(`/api/lawyer/application?userId=${effectiveUser.id}`),
      ]);

      const lawyerData = await lawyerRes.json();
      const appData = await appRes.json();

      if (!mountedRef.current) return;

      if (lawyerData.success && lawyerData.data) {
        setStatus('approved');
        sessionStorage.setItem('currentLawyerId', lawyerData.data.id.toString());
        try {
          const oldToken = localStorage.getItem('token');
          if (oldToken) {
            const issueRes = await fetch('/api/lawyer/issue-token', {
              method: 'POST',
              headers: { Authorization: `Bearer ${oldToken}` },
            });
            const issueData = await issueRes.json();
            if (issueData.success && issueData.token) {
              localStorage.setItem('token', issueData.token);
              const userInfo = JSON.parse(localStorage.getItem('user_info') || '{}');
              userInfo.isLawyer = true;
              userInfo.userType = 'lawyer';
              userInfo.lawyerInfo = userInfo.lawyerInfo || {};
              userInfo.lawyerInfo.id = issueData.lawyerId || lawyerData.data.id;
              localStorage.setItem('user_info', JSON.stringify(userInfo));
              window.dispatchEvent(new CustomEvent('lawyer-status-updated'));
            }
          }
        } catch {
          // 签发token失败不影响主流程
        }
        setTimeout(() => {
          if (mountedRef.current) router.push(safeRedirectTarget);
        }, 1200);
        return;
      }

      const application = appData.application || (appData.hasApplication ? {
        id: appData.applicationId || appData.id,
        name: appData.name || effectiveUser?.nickname || '律师申请',
        review_status: appData.applicationStatus,
        payment_status: appData.paymentStatus,
        created_at: appData.created_at || appData.createdAt || new Date().toISOString(),
      } : null);

      if (appData.hasApplication && application) {
        setApplicationData(application);
        if (application.review_status === 'approved') {
          setStatus('approved');
          try {
            const oldToken = localStorage.getItem('token');
            if (oldToken) {
              const issueRes = await fetch('/api/lawyer/issue-token', {
                method: 'POST',
                headers: { Authorization: `Bearer ${oldToken}` },
              });
              const issueData = await issueRes.json();
              if (issueData.success && issueData.token) {
                localStorage.setItem('token', issueData.token);
                const userInfo = JSON.parse(localStorage.getItem('user_info') || '{}');
                userInfo.isLawyer = true;
                userInfo.userType = 'lawyer';
                userInfo.lawyerInfo = userInfo.lawyerInfo || {};
                userInfo.lawyerInfo.id = issueData.lawyerId || appData.application.id;
                localStorage.setItem('user_info', JSON.stringify(userInfo));
                window.dispatchEvent(new CustomEvent('lawyer-status-updated'));
              }
            }
          } catch {
            // 签发token失败不影响主流程
          }
          setTimeout(() => {
            if (mountedRef.current) router.push(safeRedirectTarget);
          }, 1200);
        } else if (application.review_status === 'rejected') {
          setStatus('rejected');
        } else if (application.payment_status === 'paid') {
          setStatus('paid_not_reviewed');
        } else {
          setStatus('pending');
        }
      } else {
        setStatus('no_application');
      }
    } catch {
      if (mountedRef.current) {
        setError('检查失败，请刷新页面重试');
        setStatus('not_logged_in');
      }
    }
  }, [effectiveUser?.id, router]);

  useEffect(() => {
    if (!effectiveLoggedIn || !effectiveUser?.id) {
      setStatus('not_logged_in');
      return;
    }
    checkLawyerStatus();
  }, [effectiveLoggedIn, isLoading, effectiveUser?.id, checkLawyerStatus, authFallbackChecked]);

  const handleRefresh = () => {
    setStatus('checking');
    setTimeout(() => checkLawyerStatus(), 100);
  };

  const handleLogin = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('login_redirect', '/lawyer/login');
      window.dispatchEvent(new CustomEvent('open-login-modal'));
    }
  };

  // ====== 通用布局：居中卡片 ======
  const CardLayout = ({
    icon: Icon,
    iconBg,
    iconColor,
    title,
    subtitle,
    children,
    bgColor = 'bg-[#FAF7F2]',
  }: {
    icon: React.ComponentType<{ className?: string }>;
    iconBg: string;
    iconColor: string;
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    bgColor?: string;
  }) => (
    <div className={`min-h-screen ${bgColor} flex flex-col`}>
      <div className="p-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-[#8C7B6E] hover:text-[#C47353] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回首页
        </Link>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div
              className={`w-18 h-18 rounded-xl ${iconBg} flex items-center justify-center mx-auto mb-4 shadow-lg`}
            >
              <Icon className={`w-9 h-9 ${iconColor}`} />
            </div>
            <h1 className="text-2xl font-bold text-[#3D322D] font-serif">{title}</h1>
            {subtitle && <p className="text-[#8C7B6E] mt-2 text-sm">{subtitle}</p>}
          </div>
          <div className="bg-white rounded-xl p-6 shadow-[0_2px_8px_rgba(61,50,45,0.06)] border border-[#EBE3D8]/60">
            {children}
          </div>
        </div>
      </div>
    </div>
  );

  // ====== 已审核通过 ======
  if (status === 'approved') {
    return (
      <CardLayout
        icon={CheckCircle}
        iconBg="bg-[#7B9B6E]/15"
        iconColor="text-[#7B9B6E]"
        title="身份验证通过"
        subtitle="即将进入律师后台…"
      >
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-[#7B9B6E]/10 flex items-center justify-center">
            <CheckCircle className="w-7 h-7 text-[#7B9B6E]" />
          </div>
          <p className="text-sm text-[#8C7B6E]">验证成功，正在跳转</p>
          <div className="w-6 h-6 rounded-full border-2 border-[#7B9B6E]/30 border-t-[#7B9B6E] animate-spin" />
        </div>
      </CardLayout>
    );
  }

  // ====== 检查中 ======
  if (status === 'checking') {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex flex-col">
        <div className="p-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-[#8C7B6E]"
          >
            <ArrowLeft className="w-4 h-4" />
            返回首页
          </Link>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-2 border-[#C47353]/20" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#C47353] animate-spin" />
          </div>
          <p className="text-sm text-[#8C7B6E]">正在检查状态…</p>
        </div>
      </div>
    );
  }

  // ====== 未登录 ======
  if (status === 'not_logged_in') {
    return (
      <CardLayout
        icon={Shield}
        iconBg="bg-[#C47353]"
        iconColor="text-white"
        title="律师登录"
        subtitle="验证您的臻选律师身份"
      >
        <div className="text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-[#F5F2ED] flex items-center justify-center mx-auto">
            <User className="w-7 h-7 text-[#A89B90]" />
          </div>
          <div>
            <p className="text-[#3D322D] font-medium text-sm">请先登录您的账号</p>
            <p className="text-xs text-[#A89B90] mt-1">
              臻选律师需使用手机号验证身份
            </p>
          </div>
          <button
            onClick={handleLogin}
            className="w-full py-3.5 bg-[#C47353] text-white font-medium rounded-xl hover:bg-[#A85D40] transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
            手机号登录
          </button>
        </div>
      </CardLayout>
    );
  }

  // ====== 从未申请 ======
  if (status === 'no_application') {
    return (
      <CardLayout
        icon={Briefcase}
        iconBg="bg-[#C47353]"
        iconColor="text-white"
        title="入驻臻选律师"
        subtitle="开启您的专业法律服务之旅"
      >
        <div className="text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-[#C47353]/10 flex items-center justify-center mx-auto">
            <Shield className="w-7 h-7 text-[#C47353]" />
          </div>
          <div>
            <p className="text-[#3D322D] font-medium text-sm">您还没有提交入驻申请</p>
            <p className="text-xs text-[#A89B90] mt-1">点击下方按钮开始申请流程</p>
          </div>
          <Link href="/lawyer/join">
            <button className="w-full py-3.5 bg-[#C47353] text-white font-medium rounded-xl hover:bg-[#A85D40] transition-colors text-sm">
              申请成为臻选律师
            </button>
          </Link>
          <button
            onClick={handleRefresh}
            className="w-full py-3 bg-[#F5F2ED] text-[#8C7B6E] font-medium rounded-xl hover:bg-[#EBE3D8] transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <Wrench className="w-4 h-4" />
            刷新状态
          </button>
        </div>
      </CardLayout>
    );
  }

  // ====== 待支付 ======
  if (status === 'pending') {
    return (
      <CardLayout
        icon={CreditCard}
        iconBg="bg-[#C8963E]"
        iconColor="text-white"
        title="待支付入驻费用"
        subtitle="请完成支付以继续审核流程"
        bgColor="bg-[#FCF8F0]"
      >
        <div className="text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-[#C8963E]/10 flex items-center justify-center mx-auto">
            <Clock className="w-7 h-7 text-[#C8963E]" />
          </div>
          <div>
            <p className="text-[#3D322D] font-medium text-sm mb-1">您的入驻申请已提交</p>
            <p className="text-xs text-[#A89B90]">
              请完成入驻费用支付，支付完成后将进入审核阶段。
            </p>
          </div>
          {applicationData && (
            <div className="bg-[#FAF7F2] rounded-xl p-3 text-left text-xs">
              <p className="text-[#8C7B6E]">
                <strong className="text-[#3D322D]">申请人：</strong>
                {applicationData.name}
              </p>
              <p className="text-[#8C7B6E]">
                <strong className="text-[#3D322D]">提交时间：</strong>
                {formatDate(applicationData.created_at)}
              </p>
            </div>
          )}
          <Link href={`/lawyer/pay?applicationId=${applicationData?.id}`}>
            <button className="w-full py-3.5 bg-[#C8963E] text-white font-medium rounded-xl hover:bg-[#B08635] transition-colors text-sm">
              去支付
            </button>
          </Link>
        </div>
      </CardLayout>
    );
  }

  // ====== 已支付，审核中 ======
  if (status === 'paid_not_reviewed') {
    return (
      <CardLayout
        icon={Clock}
        iconBg="bg-[#C8963E]"
        iconColor="text-white"
        title="入驻申请审核中"
        subtitle="请耐心等待审核结果"
        bgColor="bg-[#FCF8F0]"
      >
        <div className="text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-[#C8963E]/10 flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7 text-[#C8963E]" />
          </div>
          <div>
            <p className="text-[#3D322D] font-medium text-sm mb-1">支付已完成</p>
            <div className="text-xs text-[#8C7B6E] space-y-0.5">
              <p>入驻费用已支付</p>
              <p>资料审核中（1-2个工作日）</p>
              <p>审核通过后即可登录</p>
            </div>
          </div>
          {applicationData && (
            <div className="bg-[#FAF7F2] rounded-xl p-3 text-left text-xs">
              <p className="text-[#8C7B6E]">
                <strong className="text-[#3D322D]">申请人：</strong>
                {applicationData.name}
              </p>
              <p className="text-[#8C7B6E]">
                <strong className="text-[#3D322D]">提交时间：</strong>
                {formatDate(applicationData.created_at)}
              </p>
            </div>
          )}
          <button
            onClick={handleRefresh}
            className="w-full py-3 bg-[#7B9B6E]/10 text-[#7B9B6E] font-medium rounded-xl hover:bg-[#7B9B6E]/20 transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <Wrench className="w-4 h-4" />
            刷新状态
          </button>
        </div>
      </CardLayout>
    );
  }

  // ====== 被拒绝 ======
  if (status === 'rejected') {
    return (
      <CardLayout
        icon={AlertCircle}
        iconBg="bg-[#C26565]"
        iconColor="text-white"
        title="入驻申请被拒绝"
        subtitle="您的申请未通过审核"
        bgColor="bg-[#FCF5F5]"
      >
        <div className="text-center space-y-4">
          <div>
            <p className="text-[#3D322D] font-medium text-sm mb-1">申请未通过审核</p>
            <p className="text-xs text-[#A89B90]">已支付的费用将在 3-5 个工作日内原路退回。</p>
            <p className="text-xs text-[#A89B90] mt-1">如有疑问，请联系客服。</p>
          </div>
          <button
            onClick={handleRefresh}
            className="w-full py-3 bg-[#F5F2ED] text-[#8C7B6E] font-medium rounded-xl hover:bg-[#EBE3D8] transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <Wrench className="w-4 h-4" />
            刷新状态
          </button>
        </div>
      </CardLayout>
    );
  }

  // ====== 默认 ======
  return (
    <div className="min-h-screen bg-[#FAF7F2] flex flex-col">
      <div className="p-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-[#8C7B6E]"
        >
          <ArrowLeft className="w-4 h-4" />
          返回首页
        </Link>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center">
        <button
          onClick={handleRefresh}
          className="px-6 py-3 bg-[#C47353] text-white rounded-xl text-sm"
        >
          刷新页面
        </button>
      </div>
    </div>
  );
}
