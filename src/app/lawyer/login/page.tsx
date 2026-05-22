'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
  Wrench
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

export default function LawyerLoginPage() {
  const router = useRouter();
  const { user, isLoggedIn, isLoading } = useAuth();
  const [status, setStatus] = useState<'loading' | 'checking' | 'not_logged_in' | 'no_application' | 'pending' | 'paid_not_reviewed' | 'approved' | 'rejected'>('loading');
  const [applicationData, setApplicationData] = useState<any>(null);
  const [error, setError] = useState('');
  const mountedRef = useRef(true);
  const timeoutRef = useRef<NodeJS.Timeout>(undefined!);

  // 格式化日期
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 检查用户状态
  useEffect(() => {
    mountedRef.current = true;
    
    // 设置超时，防止一直加载
    timeoutRef.current = setTimeout(() => {
      if (mountedRef.current && status === 'checking') {
        setStatus('loading');
        setError('检查超时，请刷新页面重试');
      }
    }, 10000); // 10秒超时

    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [status]);

  // 检查律师状态
  const checkLawyerStatus = useCallback(async () => {
    if (!user?.id) return;
    
    setStatus('checking');
    setError('');

    try {
      // 同时查询律师状态和申请状态
      const [lawyerRes, appRes] = await Promise.all([
        fetch(`/api/lawyer/check?userId=${user.id}`),
        fetch(`/api/lawyer/application?userId=${user.id}`)
      ]);

      const lawyerData = await lawyerRes.json();
      const appData = await appRes.json();

      if (!mountedRef.current) return;

      // 如果是正式律师
      if (lawyerData.success && lawyerData.data) {
        setStatus('approved');
        // 保存律师ID到sessionStorage
        sessionStorage.setItem('currentLawyerId', lawyerData.data.id.toString());
        // 延迟跳转，带上 fromLogin 参数跳过再次登录检查
        setTimeout(() => {
          if (mountedRef.current) {
            router.push('/lawyer?fromLogin=true');
          }
        }, 1500);
        return;
      }

      // 如果有申请记录
      if (appData.success && appData.application) {
        setApplicationData(appData.application);
        
        if (appData.application.review_status === 'approved') {
          // 已审核通过
          setStatus('approved');
          setTimeout(() => {
            if (mountedRef.current) {
              router.push('/lawyer?fromLogin=true');
            }
          }, 1500);
        } else if (appData.application.review_status === 'rejected') {
          setStatus('rejected');
        } else if (appData.application.payment_status === 'paid') {
          setStatus('paid_not_reviewed');
        } else {
          setStatus('pending');
        }
      } else {
        // 从未申请
        setStatus('no_application');
      }
    } catch (err) {
      console.error('检查状态失败:', err);
      if (mountedRef.current) {
        setError('检查失败，请刷新页面重试');
        setStatus('not_logged_in');
      }
    }
  }, [user?.id, router]);

  // 监听用户状态变化
  useEffect(() => {
    if (isLoading) {
      setStatus('loading');
      return;
    }

    if (!isLoggedIn || !user?.id) {
      setStatus('not_logged_in');
      return;
    }

    // 用户已登录，检查律师状态
    checkLawyerStatus();
  }, [isLoggedIn, isLoading, user?.id, checkLawyerStatus]);

  // 手动刷新
  const handleRefresh = () => {
    setStatus('loading');
    setTimeout(() => checkLawyerStatus(), 100);
  };

  // 打开登录
  const handleLogin = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('login_redirect', '/lawyer/login');
      window.dispatchEvent(new CustomEvent('open-login-modal'));
    }
  };

  // 加载中
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex flex-col">
        <div className="p-4">
          <Link href="/" className="inline-flex items-center gap-2 text-slate-600 hover:text-green-600">
            <ArrowLeft className="w-5 h-5" />
            返回首页
          </Link>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center">
          <Loader2 className="w-10 h-10 text-green-500 animate-spin mb-4" />
          <p className="text-slate-600">正在验证身份...</p>
          {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
        </div>
      </div>
    );
  }

  // 已审核通过
  if (status === 'approved') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex flex-col">
        <div className="p-4">
          <Link href="/" className="inline-flex items-center gap-2 text-slate-600 hover:text-green-600">
            <ArrowLeft className="w-5 h-5" />
            返回首页
          </Link>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="bg-white rounded-2xl p-8 shadow-lg text-center max-w-md w-full">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">身份验证通过</h2>
            <p className="text-slate-600 mb-4">即将进入律师后台...</p>
            <Loader2 className="w-6 h-6 text-green-500 animate-spin mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  // 未登录
  if (status === 'not_logged_in') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex flex-col">
        <div className="p-4">
          <Link href="/" className="inline-flex items-center gap-2 text-slate-600 hover:text-green-600">
            <ArrowLeft className="w-5 h-5" />
            返回首页
          </Link>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-green-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-500/30">
                <Shield className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-slate-800">律师登录</h1>
              <p className="text-slate-500 mt-2">验证您的臻选律师身份</p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                  <User className="w-8 h-8 text-slate-400" />
                </div>
                <div>
                  <p className="text-slate-700 font-medium">请先登录您的账号</p>
                  <p className="text-sm text-slate-500 mt-1">臻选律师需使用手机号验证身份</p>
                </div>

                <button
                  onClick={handleLogin}
                  className="w-full py-3.5 bg-green-500 text-white font-medium rounded-xl hover:bg-green-600 flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                  </svg>
                  手机号登录
                </button>


              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 从未申请
  if (status === 'no_application') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex flex-col">
        <div className="p-4">
          <Link href="/" className="inline-flex items-center gap-2 text-slate-600 hover:text-green-600">
            <ArrowLeft className="w-5 h-5" />
            返回首页
          </Link>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-green-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-500/30">
                <Briefcase className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-slate-800">入驻臻选律师</h1>
              <p className="text-slate-500 mt-2">开启您的专业法律服务之旅</p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <Shield className="w-8 h-8 text-green-600" />
                </div>
                <div>
                  <p className="text-slate-700 font-medium">您还没有提交入驻申请</p>
                  <p className="text-sm text-slate-500 mt-1">点击下方按钮开始申请流程</p>
                </div>

                <Link href="/lawyer/join">
                  <button className="w-full py-3.5 bg-green-500 text-white font-medium rounded-xl hover:bg-green-600">
                    申请成为臻选律师
                  </button>
                </Link>

                <button
                  onClick={handleRefresh}
                  className="w-full py-3 bg-slate-100 text-slate-600 font-medium rounded-xl hover:bg-slate-200 flex items-center justify-center gap-2"
                >
                  <Wrench className="w-4 h-4" />
                  刷新状态
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 待支付
  if (status === 'pending') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white flex flex-col">
        <div className="p-4">
          <Link href="/" className="inline-flex items-center gap-2 text-slate-600 hover:text-orange-600">
            <ArrowLeft className="w-5 h-5" />
            返回首页
          </Link>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-500/30">
                <CreditCard className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-slate-800">待支付入驻费用</h1>
              <p className="text-slate-500 mt-2">请完成支付以继续审核流程</p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
                  <Clock className="w-8 h-8 text-orange-600" />
                </div>
                <div>
                  <p className="text-slate-700 font-medium mb-2">您的入驻申请已提交</p>
                  <p className="text-sm text-slate-500">请完成入驻费用支付，支付完成后将进入审核阶段。</p>
                </div>

                {applicationData && (
                  <div className="bg-slate-50 rounded-xl p-4 text-left text-sm">
                    <p className="text-slate-600"><strong>申请人：</strong>{applicationData.name}</p>
                    <p className="text-slate-600"><strong>提交时间：</strong>{formatDate(applicationData.created_at)}</p>
                  </div>
                )}

                <Link href={`/lawyer/pay?applicationId=${applicationData?.id}`}>
                  <button className="w-full py-3.5 bg-orange-500 text-white font-medium rounded-xl hover:bg-orange-600">
                    去支付
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 已支付，审核中
  if (status === 'paid_not_reviewed') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex flex-col">
        <div className="p-4">
          <Link href="/" className="inline-flex items-center gap-2 text-slate-600 hover:text-amber-600">
            <ArrowLeft className="w-5 h-5" />
            返回首页
          </Link>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/30">
                <Clock className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-slate-800">入驻申请审核中</h1>
              <p className="text-slate-500 mt-2">请耐心等待审核结果</p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
                  <AlertCircle className="w-8 h-8 text-amber-600" />
                </div>
                <div>
                  <p className="text-slate-700 font-medium mb-2">支付已完成</p>
                  <div className="text-sm text-slate-500 space-y-1 mt-3">
                    <p>入驻费用已支付</p>
                    <p>资料审核中（1-2个工作日）</p>
                    <p>审核通过后即可登录</p>
                  </div>
                </div>

                {applicationData && (
                  <div className="bg-slate-50 rounded-xl p-4 text-left text-sm">
                    <p className="text-slate-600"><strong>申请人：</strong>{applicationData.name}</p>
                    <p className="text-slate-600"><strong>提交时间：</strong>{formatDate(applicationData.created_at)}</p>
                  </div>
                )}

                <button
                  onClick={handleRefresh}
                  className="w-full py-3 bg-green-50 text-green-600 font-medium rounded-xl hover:bg-green-100 flex items-center justify-center gap-2"
                >
                  <Wrench className="w-4 h-4" />
                  刷新状态
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 被拒绝
  if (status === 'rejected') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-50 to-white flex flex-col">
        <div className="p-4">
          <Link href="/" className="inline-flex items-center gap-2 text-slate-600 hover:text-red-600">
            <ArrowLeft className="w-5 h-5" />
            返回首页
          </Link>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-red-500/30">
                <AlertCircle className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-slate-800">入驻申请被拒绝</h1>
              <p className="text-slate-500 mt-2">您的申请未通过审核</p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <div className="text-center space-y-4">
                <div>
                  <p className="text-slate-700 font-medium mb-2">申请未通过审核</p>
                  <p className="text-sm text-slate-500">如有疑问，请联系客服。</p>
                </div>

                <button
                  onClick={handleRefresh}
                  className="w-full py-3 bg-slate-100 text-slate-600 font-medium rounded-xl hover:bg-slate-200 flex items-center justify-center gap-2"
                >
                  <Wrench className="w-4 h-4" />
                  刷新状态
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 检查中
  if (status === 'checking') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex flex-col">
        <div className="p-4">
          <Link href="/" className="inline-flex items-center gap-2 text-slate-600 hover:text-green-600">
            <ArrowLeft className="w-5 h-5" />
            返回首页
          </Link>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center">
          <Loader2 className="w-10 h-10 text-green-500 animate-spin mb-4" />
          <p className="text-slate-600">正在检查状态...</p>
        </div>
      </div>
    );
  }

  // 默认
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex flex-col">
      <div className="p-4">
        <Link href="/" className="inline-flex items-center gap-2 text-slate-600 hover:text-green-600">
          <ArrowLeft className="w-5 h-5" />
          返回首页
        </Link>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center">
        <button onClick={handleRefresh} className="px-6 py-3 bg-green-500 text-white rounded-xl">
          刷新页面
        </button>
      </div>
    </div>
  );
}
