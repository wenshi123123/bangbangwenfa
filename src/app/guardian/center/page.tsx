'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Copy, Download, Users, Wallet, TrendingUp, Gift, ChevronRight, CheckCircle, X, AlertCircle, RefreshCw, Info, Clock, Banknote, Shield, Upload, Image, Share2, Loader2, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getGuardianUrl } from '@/lib/site';
import { Card, CardContent } from '@/components/ui/card';
import QRCode from 'qrcode';
import { usePosterGenerator } from '@/hooks/use-poster';
import { getGuardianInviteRegistrationPath } from '@/lib/guardian/invite-contract';
import { apiRequest, getToken } from '@/lib/api/request';
import { GuardianLoginForm } from '@/components/guardian/guardian-login-form';

interface WithdrawConfig {
  minAmount: number;      // 最低提现金额（分）
  feeRate: number;        // 手续费率（如 0.006 表示 0.6%）
  processingDays: string; // 处理时间
}

interface GuardianData {
  id: number;
  nickname: string;
  avatar_url: string | null;
  invite_code: string;
  total_invites: number;
  valid_invites: number;
  total_commission: number;
  available_commission: number;
  withdrawn_commission: number;
  wechat_account?: string;
  wechat_qrcode?: string;
  wechat_qrcode_updated_at?: string;
}

interface CommissionRecord {
  id: number;
  order_no: string;
  order_amount: number;
  commission_amount: number;
  status: string;
  created_at: string;
}

interface InviteeRecord {
  id: number;
  nickname: string;
  total_consumption: number;
  is_valid: boolean;
  created_at: string;
}

interface WithdrawalRecord {
  id: number;
  amount: number;
  status: string;
  created_at: string;
  processed_at?: string;
}

export default function GuardianCenterPage() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab');
  const hasToken = typeof window !== 'undefined' ? !!localStorage.getItem('token') : false;
  const [isLoggedIn, setIsLoggedIn] = useState(hasToken);
  const [guardian, setGuardian] = useState<GuardianData | null>(null);
  const [isLoading, setIsLoading] = useState(hasToken); // 合并 loading 和 isChecking
  const [commissions, setCommissions] = useState<CommissionRecord[]>([]);
  const [invitees, setInvitees] = useState<InviteeRecord[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'commissions' | 'invitees' | 'withdrawals'>(
    initialTab === 'commissions' || initialTab === 'invitees' || initialTab === 'withdrawals'
      ? initialTab
      : 'overview'
  );
  const [refreshing, setRefreshing] = useState(false);
  const [showCopied, setShowCopied] = useState(false);
  const [qrcodeUrl, setQrcodeUrl] = useState<string>('');
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string>('');
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);
  const [showBindWechatModal, setShowBindWechatModal] = useState(false);
  const [wechatQrcode, setWechatQrcode] = useState<string>('');
  const [bindLoading, setBindLoading] = useState(false);
  const [bindSuccess, setBindSuccess] = useState(false);
  const [bindError, setBindError] = useState<string>('');
  const [bindCooldown, setBindCooldown] = useState<number>(0); // 剩余冷却秒数
  const [withdrawDisabled, setWithdrawDisabled] = useState(false);
  const [withdrawConfig, setWithdrawConfig] = useState<WithdrawConfig>({
    minAmount: 10000,      // 默认100元
    feeRate: 0.006,        // 默认0.6%
    processingDays: '1-3个工作日',
  });
  const [showPosterModal, setShowPosterModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { posterUrl, generating, generatePoster, downloadPoster } = usePosterGenerator();
  const [hasPendingWithdraw, setHasPendingWithdraw] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 生成邀请二维码
  const generateQRCode = useCallback(async (invite_code: string) => {
    try {
      // 生成本站注册链接
      const inviteUrl = `${window.location.origin}${getGuardianInviteRegistrationPath(invite_code)}`;
      const url = await QRCode.toDataURL(inviteUrl, {
        width: 200,
        margin: 2,
        color: { dark: '#7C3AED', light: '#ffffff' }
      });
      setQrcodeUrl(url);
    } catch (error) {
      console.error('生成二维码失败:', error);
    }
  }, []);

  // 获取守护者数据
  const fetchData = useCallback(async (guardianId: number) => {
    setRefreshing(true);
    try {
      // 先获取最新的守护者资料（包含统计数据）
      const profileRes = await apiRequest(`/api/guardian/profile?guardianId=${guardianId}`);
      const profileData = await profileRes.json();
      if (profileData.success) {
        setGuardian(profileData.data);
        // 同时更新 localStorage 中的数据
        localStorage.setItem('guardian_user', JSON.stringify(profileData.data));
      }

      // 获取分成记录
      const commRes = await apiRequest(`/api/guardian/commissions?guardianId=${guardianId}`);
      const commData = await commRes.json();
      if (commData.success) {
        setCommissions(commData.data);
      }

      // 获取邀请列表
      const inviteRes = await apiRequest(`/api/guardian/invites?guardianId=${guardianId}`);
      const inviteData = await inviteRes.json();
      if (inviteData.success) {
        setInvitees(inviteData.data);
      }

      // 获取提现记录
      const withdrawRes = await apiRequest(`/api/guardian/withdrawals?guardianId=${guardianId}`);
      const withdrawData = await withdrawRes.json();
      if (withdrawData.success) {
        setWithdrawals(withdrawData.data);
        // 检查是否有待处理的提现
        const hasPending = withdrawData.data.some((w: WithdrawalRecord) => w.status === 'pending');
        setHasPendingWithdraw(hasPending);
      }

      // 获取提现配置
      try {
        const configRes = await apiRequest('/api/guardian/withdraw?action=config');
        const configData = await configRes.json();
        if (configData.success) {
          setWithdrawConfig({
            minAmount: configData.data.minAmount || 10000,
            feeRate: configData.data.feeRate || 0.006,
            processingDays: configData.data.processingDays || '1-3个工作日',
          });
        }
      } catch (e) {
        console.error('获取提现配置失败', e);
      }
    } catch (error) {
      console.error('获取数据失败:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  // 检查登录状态并初始化守护者
  useEffect(() => {
    const checkAndInit = async () => {
      if (!hasToken) {
        setIsLoggedIn(false);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      
      // 1. 检查登录状态
      const savedUser = localStorage.getItem('user_info');
      const loggedIn = !!savedUser;
      setIsLoggedIn(loggedIn);
      
      // 如果未登录，不初始化守护者
      if (!loggedIn) {
        setIsLoading(false);
        return;
      }
      
      // 已登录，继续初始化守护者
      // 先检查 localStorage 中是否已有 guardian_user
      const savedGuardian = localStorage.getItem('guardian_user');
      if (savedGuardian) {
        try {
          const guardianData = JSON.parse(savedGuardian);
          setGuardian(guardianData);
          generateQRCode(guardianData.invite_code);
          fetchData(guardianData.id);
          setIsLoading(false);
          return;
        } catch (e) {
          console.error('解析本地守护者数据失败:', e);
          // 继续从 API 获取
        }
      }
      
      // 已登录但 localStorage 中没有 guardian_user → 显示注册界面
      // 不再调用 /api/guardian/profile?userId，因为该 API 要求 userType === 'guardian'
      setIsLoading(false);
    };
    
    checkAndInit();
    
    // 监听登录成功事件
    const handleLoginSuccess = () => {
      checkAndInit();
    };
    window.addEventListener('user-logged-in', handleLoginSuccess);
    
    return () => {
      window.removeEventListener('user-logged-in', handleLoginSuccess);
    };
  }, [fetchData, generateQRCode, hasToken]);

  const copyInviteLink = () => {
    const inviteUrl = `${window.location.origin}${getGuardianInviteRegistrationPath(guardian?.invite_code || '')}`;
    navigator.clipboard.writeText(inviteUrl);
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 2000);
  };

  const downloadQRCode = () => {
    if (qrcodeUrl) {
      const link = document.createElement('a');
      link.download = `守护者邀请码_${guardian?.invite_code}.png`;
      link.href = qrcodeUrl;
      link.click();
    }
  };

  const formatMoney = (cents: number) => (cents / 100).toFixed(2);

  // 计算手续费和实际到账金额
  const calculateWithdraw = (amountYuan: number) => {
    const amountCents = Math.round(amountYuan * 100);
    const fee = Math.round(amountCents * withdrawConfig.feeRate);
    const actualAmount = amountCents - fee;
    return { fee, actualAmount };
  };

  // 获取当前输入金额的手续费和实际到账
  const currentWithdraw = parseFloat(withdrawAmount) ? calculateWithdraw(parseFloat(withdrawAmount)) : { fee: 0, actualAmount: 0 };

  // 格式化日期为 YYYY-MM-DD 格式，避免 hydration 不匹配
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleLogout = () => {
    localStorage.removeItem('user_info');
    localStorage.removeItem('guardian_user');
    window.location.href = getGuardianUrl();
  };

  // 注册成为守护者
  const handleRegisterGuardian = async () => {
    const savedUser = localStorage.getItem('user_info');
    if (!savedUser) {
      alert('请先登录');
      return;
    }

    let user;
    try {
      user = JSON.parse(savedUser);
    } catch (e) {
      console.error('用户信息解析失败:', e);
      alert('用户信息格式错误，请重新登录');
      return;
    }

    if (!user || !user.id) {
      console.error('用户信息缺少id:', user);
      alert('用户信息不完整，请重新登录');
      return;
    }


    try {
      const response = await apiRequest('/api/guardian/register', {
        method: 'POST',
        body: JSON.stringify({
          userId: user.id,
          nickname: user.nickname || user.username || '守护者',
          phone: user.phone,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // 注册成功，保存守护者信息到 localStorage
        localStorage.setItem('guardian_user', JSON.stringify({
          id: result.data.id,
          nickname: user.nickname || user.username || '守护者',
          avatar_url: null,
          invite_code: result.data.invite_code || result.data.inviteCode,
          total_invites: 0,
          valid_invites: 0,
          total_commission: 0,
          available_commission: 0,
          withdrawn_commission: 0,
        }));
        alert('恭喜！您已成功入驻守护者计划');
        window.location.reload();
      } else if (result.message === '已是守护者' || result.error === '已是守护者') {
        // 已经是守护者，保存信息并刷新
        if (result.data) {
          localStorage.setItem('guardian_user', JSON.stringify(result.data));
        } else {
          // API 可能没返回完整 data，构造最小数据
          localStorage.setItem('guardian_user', JSON.stringify({
            id: 0,
            nickname: user.nickname || user.username || '守护者',
            avatar_url: null,
            invite_code: '',
            total_invites: 0,
            valid_invites: 0,
            total_commission: 0,
            available_commission: 0,
            withdrawn_commission: 0,
          }));
        }
        window.location.reload();
      } else {
        alert(result.error || '注册失败，请稍后重试');
      }
    } catch (error) {
      console.error('注册守护者失败:', error);
      alert('网络错误，请稍后重试');
    }
  };

  // 提现功能
  const handleWithdraw = async () => {
    if (!guardian) return;
    
    const amountYuan = parseFloat(withdrawAmount);
    if (isNaN(amountYuan) || amountYuan <= 0) {
      setWithdrawError('请输入有效的提现金额');
      return;
    }
    const amount = Math.round(amountYuan * 100); // 转换为分并四舍五入
    if (amount < withdrawConfig.minAmount) {
      setWithdrawError(`提现金额不能低于${(withdrawConfig.minAmount / 100).toFixed(0)}元`);
      return;
    }
    if (amount > guardian.available_commission) {
      setWithdrawError('提现金额不能超过可提现余额');
      return;
    }

    setWithdrawLoading(true);
    setWithdrawError('');

    try {
      const response = await apiRequest('/api/guardian/withdraw', {
        method: 'POST',
        body: JSON.stringify({
          guardian_id: guardian.id,
          amount,
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setWithdrawSuccess(true);
        // 刷新数据
        fetchData(guardian.id);
        setTimeout(() => {
          setShowWithdrawModal(false);
          setWithdrawSuccess(false);
          setWithdrawAmount('');
        }, 2000);
      } else {
        setWithdrawError(result.error || '提现申请失败');
      }
    } catch (error) {
      console.error('提现失败:', error);
      setWithdrawError('提现申请失败，请稍后重试');
    } finally {
      setWithdrawLoading(false);
    }
  };

  const openWithdrawModal = async () => {
    // 检查是否绑定微信收款码
    if (!guardian?.wechat_account) {
      setShowBindWechatModal(true);
      return;
    }
    
    // 如果金额不足，显示提示
    if ((guardian?.available_commission || 0) < withdrawConfig.minAmount) {
      setWithdrawDisabled(true);
      setWithdrawError(`可提现金额不足，最低需要 ${(withdrawConfig.minAmount / 100).toFixed(0)} 元`);
      setShowWithdrawModal(true);
      return;
    }
    
    // 先检查是否有待处理的提现
    try {
      const res = await apiRequest(`/api/guardian/withdraw?action=check-pending&guardianId=${guardian?.id}`);
      const data = await res.json();
      if (data.hasPending) {
        setHasPendingWithdraw(true);
        setWithdrawError('您有待处理的提现申请，请等待处理完成后再申请');
        return;
      }
    } catch (e) {
      console.error('检查待处理提现失败', e);
    }
    
    // 默认填入全部金额
    const defaultAmount = Math.floor((guardian?.available_commission || 0) / 100);
    setWithdrawAmount(defaultAmount.toString());
    setShowWithdrawModal(true);
    setWithdrawError('');
    setWithdrawSuccess(false);
    setWithdrawDisabled(false);
  };

  // 处理微信收款码上传/更换
  const handleBindWechat = async () => {
    if (!wechatQrcode) {
      setBindError('请先上传收款码图片');
      return;
    }
    
    setBindLoading(true);
    setBindError('');
    setBindCooldown(0);
    try {
      const response = await apiRequest('/api/guardian/bind-wechat', {
        method: 'POST',
        body: JSON.stringify({
          guardian_id: guardian?.id,
          wechat_qrcode: wechatQrcode,
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setBindSuccess(true);
        // 更新本地存储中的守护者信息
        if (guardian) {
          const updatedGuardian = { ...guardian, wechat_account: result.wechat_qrcode || wechatQrcode, wechat_qrcode: result.wechat_qrcode || wechatQrcode };
          setGuardian(updatedGuardian);
          localStorage.setItem('guardian_user', JSON.stringify(updatedGuardian));
        }
      } else if (result.remainingSeconds) {
        // 冷却期处理
        setBindCooldown(result.remainingSeconds);
        setBindError(result.error || `更换收款码需等待冷却期`);
      } else {
        setBindError(result.error || result.hint || '绑定失败，请稍后重试');
      }
    } catch (error) {
      console.error('绑定失败:', error);
      setBindError('网络错误，请稍后重试');
    } finally {
      setBindLoading(false);
    }
  };

  // 处理图片上传
  const handleQrcodeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setWechatQrcode(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  // 加载中状态
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF7F2]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#C47353] border-t-transparent mx-auto"></div>
          <div className="space-y-2">
            <div className="h-3 w-32 bg-[#EBE3D8]/60 rounded-full animate-pulse mx-auto" />
            <div className="h-2 w-24 bg-[#EBE3D8]/40 rounded-full animate-pulse mx-auto" />
          </div>
          <p className="text-sm text-[#8C7B6E] font-sans">加载中…</p>
        </div>
      </div>
    );
  }

  // 未登录提示
  if (!isLoggedIn) {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-b from-rose-50 to-white">
          <div className="container mx-auto px-4 py-8">
            {/* 顶部导航 */}
            <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-rose-100/50 mb-8">
              <div className="flex items-center justify-between py-3">
                <Link href={getGuardianUrl()} className="flex items-center gap-2 text-rose-600 hover:text-rose-700">
                  <ArrowLeft className="w-5 h-5" />
                  <span className="text-sm font-medium">返回</span>
                </Link>
                <h1 className="text-base font-semibold text-foreground">守护者中心</h1>
                <div className="w-16" />
              </div>
            </div>

            {/* 未登录提示卡片 */}
            <div className="max-w-md mx-auto mt-20">
              <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-rose-100 flex items-center justify-center">
                  <Shield className="w-10 h-10 text-rose-600" />
                </div>
                <h2 className="text-xl font-bold mb-3">成为守护者</h2>
                <p className="text-muted-foreground mb-6">
                  登录后自动入驻守护者计划，开始守护你爱的人
                </p>
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="w-full py-3 px-6 bg-gradient-to-r from-rose-500 to-rose-600 text-white font-semibold rounded-xl hover:from-rose-600 hover:to-rose-700 transition-all"
                >
                  <LogIn className="w-4 h-4 inline mr-2" />
                  去登录
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 守护者登录弹窗 */}
        {showLoginModal && (
          <GuardianLoginForm
            onSuccess={() => setShowLoginModal(false)}
            onCancel={() => setShowLoginModal(false)}
          />
        )}
      </>
    );
  }

  // 用户已登录但不是守护者 - 显示注册界面
  if (isLoggedIn && !guardian) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-rose-50 to-white">
        <div className="container mx-auto px-4 py-8">
          {/* 顶部导航 */}
          <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-rose-100/50 mb-8">
            <div className="flex items-center justify-between py-3">
              <Link href={getGuardianUrl()} className="flex items-center gap-2 text-rose-600 hover:text-rose-700">
                <ArrowLeft className="w-5 h-5" />
                <span className="text-sm font-medium">返回</span>
              </Link>
              <h1 className="text-base font-semibold text-foreground">守护者中心</h1>
              <div className="w-16" />
            </div>
          </div>

          {/* 成为守护者卡片 */}
          <div className="max-w-md mx-auto mt-12">
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-rose-100 to-orange-100 flex items-center justify-center">
                <Shield className="w-12 h-12 text-rose-600" />
              </div>
              <h2 className="text-2xl font-bold mb-3">欢迎加入守护者计划</h2>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                成为守护者后，您可以通过邀请好友获得佣金奖励，<br />
                每次被邀请用户消费，您都能获得相应佣金
              </p>
              
              {/* 守护者权益 */}
              <div className="bg-rose-50 rounded-xl p-4 mb-6 text-left">
                <h3 className="font-semibold text-rose-700 mb-3">守护者权益</h3>
                <ul className="space-y-2 text-sm text-rose-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    邀请好友获得佣金奖励
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    佣金实时到账，随时提现
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    专属邀请二维码和链接
                  </li>
                </ul>
              </div>

              <button
                onClick={handleRegisterGuardian}
                className="w-full py-4 px-6 bg-gradient-to-r from-rose-500 to-rose-600 text-white font-semibold rounded-xl hover:from-rose-600 hover:to-rose-700 transition-all shadow-lg shadow-rose-200"
              >
                立即入驻守护者计划
              </button>
              
              <p className="text-xs text-muted-foreground mt-4">
                点击上方按钮，使用当前账号入驻守护者计划
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 to-white">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-rose-100/50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link href={getGuardianUrl()} className="flex items-center gap-2 text-rose-600 hover:text-rose-700">
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-medium">返回</span>
            </Link>
            <h1 className="text-base font-semibold text-foreground">守护者中心</h1>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => guardian && fetchData(guardian.id)} 
                disabled={refreshing}
                className="p-1 hover:bg-rose-100 rounded-full transition-colors disabled:opacity-50"
                title="刷新数据"
              >
                <RefreshCw className={`w-5 h-5 text-rose-600 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              <button onClick={handleLogout} className="text-sm text-rose-600 hover:text-rose-700">
                退出
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 用户信息卡片 */}
      <div className="bg-gradient-to-r from-rose-500 to-rose-600 text-white py-8 px-4">
    <div className="container mx-auto">
      {guardian ? (
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-2xl">
            {guardian.avatar_url ? (
              <img src={guardian.avatar_url} alt="" className="w-full h-full rounded-full" />
            ) : (
              '👤'
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold">{guardian.nickname}</h2>
            <p className="text-rose-100 text-sm">守护者 · {guardian.invite_code}</p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-2xl">
            {'👤'}
          </div>
          <div>
            <h2 className="text-xl font-bold">加载中...</h2>
          </div>
        </div>
      )}
    </div>
      </div>

      {/* 数据统计卡片 */}
      <div className="container mx-auto px-4 -mt-4">
    <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 mx-auto mb-2">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-foreground">{guardian?.total_invites ?? 0}</p>
          <p className="text-xs text-muted-foreground">邀请人数</p>
        </div>
      <div className="text-center">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100 mx-auto mb-2">
          <TrendingUp className="w-5 h-5 text-green-600" />
        </div>
        <p className="text-2xl font-bold text-foreground">{guardian?.valid_invites ?? 0}</p>
        <p className="text-xs text-muted-foreground">有效用户</p>
      </div>
      <div className="text-center">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-100 mx-auto mb-2">
          <Gift className="w-5 h-5 text-orange-600" />
        </div>
        <p className="text-2xl font-bold text-orange-600">¥{formatMoney(guardian?.total_commission ?? 0)}</p>
        <p className="text-xs text-muted-foreground">累计分成</p>
      </div>
      <div className="text-center">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-rose-100 mx-auto mb-2">
          <Wallet className="w-5 h-5 text-rose-600" />
        </div>
        <p className="text-2xl font-bold text-rose-600">¥{formatMoney(guardian?.available_commission ?? 0)}</p>
        <p className="text-xs text-muted-foreground">可提现</p>
      </div>
      </div>

      {/* 提现说明卡片 */}
      <div className="mt-6 bg-gradient-to-r from-rose-50 to-rose-100/50 rounded-xl p-4 border border-rose-200/50">
        <div className="flex items-center gap-2 mb-3">
          <Info className="w-4 h-4 text-rose-600" />
          <span className="text-sm font-semibold text-rose-700">提现说明</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center">
              <Banknote className="w-4 h-4 text-rose-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">最低金额</p>
              <p className="text-sm font-semibold text-foreground">¥{(withdrawConfig.minAmount / 100).toFixed(0)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center">
              <Clock className="w-4 h-4 text-rose-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">到账时间</p>
              <p className="text-sm font-semibold text-foreground">{withdrawConfig.processingDays}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center">
              <Shield className="w-4 h-4 text-rose-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">手续费</p>
              <p className="text-sm font-semibold text-foreground">{(withdrawConfig.feeRate * 100).toFixed(1)}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* 提现入口卡片 */}
      <div className="mt-6">
        {/* 待处理提现提示 */}
        {hasPendingWithdraw ? (
          <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-200">
            <div className="flex items-center gap-2 text-yellow-700">
              <Clock className="w-5 h-5" />
              <p className="text-sm font-medium">您有待处理的提现申请，请等待处理完成后再申请</p>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-rose-500 to-rose-600 rounded-xl p-5 text-white">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <Wallet className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-rose-100 text-sm">可提现金额</p>
                  <p className="text-2xl font-bold">¥{formatMoney(guardian?.available_commission ?? 0)}</p>
                </div>
              </div>
            </div>
            
            {/* 提现进度提示 */}
            {(guardian?.available_commission ?? 0) > 0 && (guardian?.available_commission ?? 0) < withdrawConfig.minAmount ? (
              <div className="bg-white/10 rounded-lg p-3 mb-3">
                <p className="text-sm text-rose-100">
                  再攒 ¥{((withdrawConfig.minAmount - (guardian?.available_commission ?? 0)) / 100).toFixed(2)} 即可提现
                </p>
                <div className="mt-2 h-2 bg-white/20 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-white rounded-full transition-all"
                    style={{ width: `${Math.min(((guardian?.available_commission ?? 0) / withdrawConfig.minAmount) * 100, 100)}%` }}
                  />
                </div>
              </div>
            ) : null}
            
            <Button 
              onClick={openWithdrawModal}
              className="w-full bg-white text-rose-600 hover:bg-rose-50 py-5 text-base font-semibold rounded-xl shadow-lg"
            >
              {(guardian?.available_commission ?? 0) >= withdrawConfig.minAmount ? '立即提现到微信零钱' : '查看提现详情'}
            </Button>
          </div>
        )}
      </div>
      
      {/* 微信收款码绑定入口 */}
      {(!guardian?.wechat_account && !guardian?.wechat_qrcode && !hasPendingWithdraw) && (
        <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-200">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800 mb-1">尚未绑定微信收款方式</p>
              <p className="text-xs text-amber-600 mb-3">首次提现前需要绑定您的微信收款码</p>
              <Button 
                onClick={() => { setShowBindWechatModal(true); setBindError(''); setBindCooldown(0); setBindSuccess(false); }}
                variant="outline"
                className="border-amber-300 text-amber-700 hover:bg-amber-100"
                size="sm"
              >
                立即绑定微信收款码
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 已绑定微信收款方式入口（可更换） */}
      {(guardian?.wechat_account || guardian?.wechat_qrcode) && !hasPendingWithdraw && (
        <div className="mt-4 p-4 bg-green-50 rounded-xl border border-green-200">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-green-800 mb-1">已绑定微信收款方式</p>
              <p className="text-xs text-green-600 mb-3">您可以更换微信收款码（每7天限1次）</p>
              <Button 
                onClick={() => { setShowBindWechatModal(true); setBindError(''); setBindCooldown(0); setBindSuccess(false); }}
                variant="outline"
                className="border-green-300 text-green-700 hover:bg-green-100"
                size="sm"
              >
                查看/更换微信收款码
              </Button>
            </div>
          </div>
        </div>
      )}
      </div>
      </div>

      {/* 邀请推广区 */}
      <div className="container mx-auto px-4 mt-6">
    <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6">
      <h3 className="text-lg font-bold mb-4">专属邀请链接</h3>
      
      {/* 邀请码 */}
      <div className="bg-rose-50 rounded-xl p-4 mb-4">
        <p className="text-sm text-muted-foreground mb-1">邀请码</p>
        <p className="text-2xl font-bold text-rose-600 tracking-wider">{guardian?.invite_code || ''}</p>
      </div>

      {/* 二维码 */}
      <div className="flex flex-col items-center mb-4">
        {qrcodeUrl ? (
          <div className="bg-white p-2 rounded-xl border border-rose-100">
            <img src={qrcodeUrl} alt="邀请二维码" className="w-48 h-48" />
          </div>
        ) : (
          <div className="w-48 h-48 bg-gray-100 rounded-xl flex items-center justify-center">
            <p className="text-sm text-muted-foreground">生成中...</p>
          </div>
        )}
        <p className="text-sm text-muted-foreground mt-2">扫描二维码即可注册</p>
      </div>

      {/* 操作按钮 */}
      <div className="grid grid-cols-3 gap-3">
        <Button variant="outline" onClick={copyInviteLink} className="border-rose-200 text-rose-600">
          {showCopied ? (
            <>
              <CheckCircle className="w-4 h-4 mr-1" />
              已复制
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 mr-1" />
              复制链接
            </>
          )}
        </Button>
        <Button variant="outline" onClick={downloadQRCode} className="border-rose-200 text-rose-600">
          <Download className="w-4 h-4 mr-1" />
          保存二维码
        </Button>
        <Button variant="default" onClick={() => {
          setShowPosterModal(true);
          if (guardian) {
            generatePoster({
              inviteCode: guardian.invite_code,
              nickname: guardian.nickname,
            });
          }
        }} className="bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600">
          <Image className="w-4 h-4 mr-1" />
          生成海报
        </Button>
      </div>

      {/* 分享提示 */}
      <div className="mt-4 p-3 bg-orange-50 rounded-xl">
        <p className="text-sm text-orange-700">
          💡 分享到微信群、朋友圈，好友注册后您即可获得永久分成
        </p>
      </div>
    </div>
      </div>

      {/* Tab切换 */}
      <div className="container mx-auto px-4 mt-6">
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      <div className="flex border-b">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === 'overview' ? 'text-rose-600 border-b-2 border-rose-600' : 'text-muted-foreground'
          }`}
        >
          分成明细
        </button>
        <button
          onClick={() => setActiveTab('invitees')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === 'invitees' ? 'text-rose-600 border-b-2 border-rose-600' : 'text-muted-foreground'
          }`}
        >
          邀请记录
        </button>
        <button
          onClick={() => setActiveTab('withdrawals')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === 'withdrawals' ? 'text-rose-600 border-b-2 border-rose-600' : 'text-muted-foreground'
          }`}
        >
          提现记录
        </button>
      </div>

      <div className="p-4">
        {activeTab === 'overview' && (
          <div className="space-y-3">
            {/* 分成审核流程说明 */}
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-4 border border-orange-100">
              <div className="flex items-center gap-2 mb-3">
                <Info className="w-4 h-4 text-orange-600" />
                <span className="font-medium text-orange-700">分成说明</span>
              </div>
              <div className="space-y-2 text-sm text-orange-800">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-orange-200 text-orange-700 text-xs flex items-center justify-center font-medium">1</span>
                  <span>好友下单支付成功</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-orange-200 text-orange-700 text-xs flex items-center justify-center font-medium">2</span>
                  <span>分成进入审核流程</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-orange-200 text-orange-700 text-xs flex items-center justify-center font-medium">3</span>
                  <span>平台审核通过后自动到账</span>
                </div>
              </div>
            </div>
            
            {commissions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">暂无分成记录</p>
            ) : (
              commissions.map((item) => {
                const statusMap: Record<string, { label: string; color: string }> = {
                  pending: { label: '待审核', color: 'bg-amber-100 text-amber-700' },
                  approved: { label: '已到账', color: 'bg-green-100 text-green-700' },
                  rejected: { label: '已拒绝', color: 'bg-red-100 text-red-700' },
                };
                const status = statusMap[item.status] || { label: '未知', color: 'bg-gray-100 text-gray-700' };
                
                return (
                  <div key={item.id} className="flex items-center justify-between py-3 border-b last:border-0">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">订单 {item.order_no?.slice(-8)}</p>
                        <span className={`inline-flex px-1.5 py-0.5 rounded text-xs ${status.color}`}>
                          {status.label}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(item.created_at)} · 订单 ¥{formatMoney(item.order_amount)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${item.status === 'approved' ? 'text-green-600' : item.status === 'pending' ? 'text-amber-600' : 'text-gray-400'}`}>
                        {item.status === 'approved' ? '+' : item.status === 'pending' ? '待发放' : '-' }¥{formatMoney(item.commission_amount)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === 'invitees' && (
          <div className="space-y-3">
            {invitees.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">暂无邀请记录</p>
            ) : (
              invitees.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-3 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center">
                      👤
                    </div>
                    <div>
                      <p className="text-sm font-medium">{item.nickname || '新用户'}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(item.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${item.is_valid ? 'text-green-600' : 'text-gray-400'}`}>
                      {item.is_valid ? '有效' : '无效'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      消费 ¥{formatMoney(item.total_consumption)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'withdrawals' && (
          <div className="space-y-4">
            {withdrawals.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">暂无提现记录</p>
            ) : (
              withdrawals.map((item) => {
                const statusConfig = {
                  pending: { label: '处理中', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: Clock },
                  completed: { label: '已到账', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle },
                  rejected: { label: '已拒绝', color: 'bg-red-100 text-red-700 border-red-200', icon: X },
                };
                const status = statusConfig[item.status as keyof typeof statusConfig] || statusConfig.pending;
                const StatusIcon = status.icon;
                
                return (
                  <div key={item.id} className={`p-4 rounded-xl border ${item.status === 'pending' ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-gray-100'}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-lg font-bold text-foreground">¥{formatMoney(item.amount)}</p>
                        <p className="text-xs text-muted-foreground">申请时间：{formatDate(item.created_at)}</p>
                      </div>
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${status.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {status.label}
                      </div>
                    </div>
                    {/* 状态时间线 */}
                    <div className="flex items-center gap-2 text-xs">
                      <div className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="w-3 h-3" />
                        <span>申请提交</span>
                      </div>
                      {item.status === 'pending' && (
                        <>
                          <div className="text-gray-300">→</div>
                          <div className="text-yellow-600 animate-pulse">处理中</div>
                          <div className="text-gray-300">→</div>
                          <div className="text-gray-400">到账</div>
                        </>
                      )}
                      {item.status === 'completed' && (
                        <>
                          <div className="text-gray-300">→</div>
                          <div className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="w-3 h-3" />
                            <span>已到账 {item.processed_at ? formatDate(item.processed_at) : ''}</span>
                          </div>
                        </>
                      )}
                      {item.status === 'rejected' && (
                        <>
                          <div className="text-gray-300">→</div>
                          <div className="flex items-center gap-1 text-red-600">
                            <X className="w-3 h-3" />
                            <span>已拒绝</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
      </div>

      {/* 提现弹窗 */}
      {showWithdrawModal && (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold">{withdrawDisabled ? '提现说明' : '提现到微信零钱'}</h3>
            <button
              onClick={() => {
                setShowWithdrawModal(false);
                setWithdrawDisabled(false);
              }}
              className="p-1 hover:bg-gray-100 rounded-full"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {withdrawSuccess ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h4 className="text-lg font-bold text-green-600 mb-2">提现申请成功</h4>
              <p className="text-sm text-muted-foreground">
                预计{withdrawConfig.processingDays}到账，请注意查收
              </p>
            </div>
          ) : withdrawDisabled ? (
            /* 金额不足提示状态 */
            <div className="space-y-5">
              <div className="bg-rose-50 rounded-xl p-4 text-center">
                <p className="text-sm text-muted-foreground mb-2">当前可提现金额</p>
                <p className="text-3xl font-bold text-rose-600">¥{formatMoney(guardian?.available_commission || 0)}</p>
              </div>
              
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800 mb-1">提现条件未满足</p>
                    <p className="text-sm text-amber-600">
                      最低提现金额为 <span className="font-bold">¥{(withdrawConfig.minAmount / 100).toFixed(0)}</span>
                    </p>
                    <p className="text-sm text-amber-600 mt-1">
                      还差 <span className="font-bold text-amber-800">¥{((withdrawConfig.minAmount - (guardian?.available_commission || 0)) / 100).toFixed(2)}</span> 才能提现
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-xl p-4 text-sm text-muted-foreground space-y-2">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-gray-400" />
                  <span className="font-medium text-gray-600">温馨提示</span>
                </div>
                <p>• 每成功邀请1位用户下单，您可获得最高1-30%分成</p>
                <p>• 分成需经平台审核后才会到账（预计1-3个工作日）</p>
                <p>• 提现到账时间：{withdrawConfig.processingDays}</p>
              </div>
              
              <Button
                onClick={() => {
                  setShowWithdrawModal(false);
                  setWithdrawDisabled(false);
                }}
                className="w-full bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 py-5 text-base font-semibold rounded-xl"
              >
                我知道了，继续邀请好友
              </Button>
            </div>
          ) : (
            /* 正常提现表单 */
            <>
              <div className="space-y-5">
                {/* 可提现余额 */}
                <div className="bg-rose-50 rounded-xl p-4">
                  <label className="block text-sm text-muted-foreground mb-1">
                    可提现余额
                  </label>
                  <p className="text-3xl font-bold text-rose-600">
                    ¥{formatMoney(guardian?.available_commission || 0)}
                  </p>
                </div>

                {/* 提现金额输入 */}
                <div>
                  <label className="block text-sm text-muted-foreground mb-2">
                    提现金额（元）
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-gray-400">¥</span>
                    <input
                      type="number"
                      value={withdrawAmount}
                      onChange={(e) => {
                        setWithdrawAmount(e.target.value);
                        setWithdrawError('');
                      }}
                      className="w-full pl-10 pr-4 py-4 border-2 border-gray-200 rounded-xl text-2xl font-bold focus:outline-none focus:border-rose-500 transition-colors"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* 快捷金额按钮 */}
                <div className="flex gap-2">
                  {[100, 0.5, 0.3].map((ratio) => {
                    const label = ratio === 100 ? '¥100' : ratio === 0.5 ? '50%' : '30%';
                    const amount = ratio === 100 
                      ? 100 
                      : Math.floor((guardian?.available_commission || 0) / 100 * ratio);
                    const disabled = amount <= 0 || amount < withdrawConfig.minAmount / 100;
                    
                    return (
                      <button
                        key={ratio}
                        onClick={() => {
                          setWithdrawAmount(amount.toString());
                          setWithdrawError('');
                        }}
                        disabled={disabled}
                        className="flex-1 py-2 px-3 rounded-lg border border-rose-200 text-sm font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        {label}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => {
                      const max = Math.floor((guardian?.available_commission || 0) / 100);
                      setWithdrawAmount(max.toString());
                      setWithdrawError('');
                    }}
                    className="flex-1 py-2 px-3 rounded-lg border border-rose-200 text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    全部
                  </button>
                </div>

                {/* 实际到账预览 */}
                {parseFloat(withdrawAmount) > 0 && (
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-green-700">实际到账金额</span>
                      <span className="text-xl font-bold text-green-600">
                        ¥{(currentWithdraw.actualAmount / 100).toFixed(2)}
                      </span>
                    </div>
                    <div className="text-xs text-green-600/70">
                      手续费 ¥{(currentWithdraw.fee / 100).toFixed(2)} ({(withdrawConfig.feeRate * 100).toFixed(1)}%)
                    </div>
                  </div>
                )}

                {withdrawError && (
                  <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {withdrawError}
                  </div>
                )}

                {/* 提现说明 */}
                <div className="bg-gray-50 rounded-xl p-4 text-sm text-muted-foreground space-y-2">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-gray-400" />
                    <span className="font-medium text-gray-600">提现须知</span>
                  </div>
                  <p>• 最低提现金额：¥{(withdrawConfig.minAmount / 100).toFixed(0)}</p>
                  <p>• 手续费率：{(withdrawConfig.feeRate * 100).toFixed(1)}%</p>
                  <p>• 到账时间：{withdrawConfig.processingDays}</p>
                </div>

                <Button
                  onClick={handleWithdraw}
                  disabled={withdrawLoading || !withdrawAmount || parseFloat(withdrawAmount) < withdrawConfig.minAmount / 100}
                  className="w-full bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 py-6 text-lg font-semibold rounded-xl disabled:opacity-50"
                >
                  {withdrawLoading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      提交中...
                    </span>
                  ) : '确认提现'}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
      )}

      {/* 绑定微信收款码弹窗 */}
      {showBindWechatModal && (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold">绑定微信收款码</h3>
            <button
              onClick={() => {
                setShowBindWechatModal(false);
                setWechatQrcode('');
                setBindSuccess(false);
                setBindError('');
                setBindCooldown(0);
              }}
              className="p-1 hover:bg-gray-100 rounded-full"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {bindSuccess ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h4 className="text-lg font-bold text-green-600 mb-2">
                {guardian?.wechat_account || guardian?.wechat_qrcode ? '收款码更换成功' : '绑定成功'}
              </h4>
              <p className="text-sm text-muted-foreground mb-6">
                现在可以发起提现了
              </p>
              <Button
                onClick={() => {
                  setShowBindWechatModal(false);
                  setBindSuccess(false);
                  setWechatQrcode('');
                  setBindError('');
                  setBindCooldown(0);
                }}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
              >
                完成了
              </Button>
            </div>
          ) : (
            /* 绑定/更换表单 */
            <div className="space-y-5">
              {/* 已绑定的当前收款码展示 */}
              {(guardian?.wechat_qrcode || guardian?.wechat_account) && (
                <div className="bg-green-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-semibold text-green-700">当前收款码</span>
                  </div>
                  <div className="flex justify-center mb-3">
                    <img
                      src={guardian.wechat_qrcode || guardian.wechat_account}
                      alt="当前收款码"
                      className="w-32 h-32 object-contain rounded-lg border-2 border-green-200"
                    />
                  </div>
                  <p className="text-xs text-green-600 text-center">
                    您可以上传新的收款码进行更换（每7天限1次）
                  </p>
                </div>
              )}

              {/* 冷却期提示 */}
              {bindCooldown > 0 && (
                <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-orange-800 mb-1">
                        冷却期内，暂时无法更换收款码
                      </p>
                      <p className="text-sm text-orange-700 font-mono">
                        {Math.floor(bindCooldown / 86400)}天 {Math.floor((bindCooldown % 86400) / 3600)}小时 {Math.floor((bindCooldown % 3600) / 60)}分 后可以更换
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 错误提示 */}
              {bindError && (
                <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{bindError}</p>
                  </div>
                </div>
              )}

              {/* 上传区域（冷却期内隐藏） */}
              {bindCooldown === 0 && (
                <>
                  <div className="bg-blue-50 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-blue-700">
                        <p className="font-medium mb-1">
                          {guardian?.wechat_qrcode || guardian?.wechat_account ? '更换收款码' : '为什么要绑定收款码？'}
                        </p>
                        <p className="text-blue-600/80">
                          {guardian?.wechat_qrcode || guardian?.wechat_account
                            ? '上传新的收款码图片即可更换，更换后7天内不可再次更换'
                            : '提现资金将直接转入您绑定的微信收款码，方便快捷。'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 二维码上传区域 */}
                  <div>
                    <label className="block text-sm text-muted-foreground mb-2">
                      {guardian?.wechat_qrcode || guardian?.wechat_account ? '上传新收款码' : '上传微信收款码'}
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleQrcodeUpload}
                      className="hidden"
                    />
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-rose-300 transition-colors cursor-pointer bg-gray-50/50"
                    >
                      {wechatQrcode ? (
                        <div className="relative">
                          <img src={wechatQrcode} alt="收款码预览" className="w-40 h-40 object-contain mx-auto rounded-lg" />
                          <p className="text-sm text-rose-600 mt-2">点击更换图片</p>
                        </div>
                      ) : (
                        <>
                          <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Upload className="w-8 h-8 text-rose-600" />
                          </div>
                          <p className="text-sm text-gray-600 mb-1">点击上传收款码图片</p>
                          <p className="text-xs text-gray-400">支持 JPG、PNG 格式</p>
                        </>
                      )}
                    </div>
                  </div>

                  <Button
                    onClick={handleBindWechat}
                    disabled={bindLoading || !wechatQrcode}
                    className="w-full bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 py-5 text-base font-semibold rounded-xl disabled:opacity-50"
                  >
                    {bindLoading ? (
                      <span className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        提交中...
                      </span>
                    ) : guardian?.wechat_qrcode || guardian?.wechat_account ? '确认更换' : '确认绑定'}
                  </Button>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
      )}

      {/* 海报弹窗 */}
      {showPosterModal && (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <Card className="w-full max-w-sm">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">分享海报</h3>
            <button
              onClick={() => setShowPosterModal(false)}
              className="p-1 hover:bg-gray-100 rounded-full"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* 海报预览 */}
          <div className="bg-gray-50 rounded-xl p-4 mb-4">
            {generating ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-12 h-12 border-4 border-rose-200 border-t-rose-600 rounded-full animate-spin mb-4" />
                <p className="text-sm text-muted-foreground">正在生成海报...</p>
              </div>
            ) : posterUrl ? (
              <img 
                src={posterUrl} 
                alt="分享海报" 
                className="w-full rounded-lg shadow-lg"
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="w-12 h-12 text-gray-300 mb-4" />
                <p className="text-sm text-muted-foreground">海报生成失败</p>
              </div>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="space-y-3">
            <Button
              onClick={() => {
                downloadPoster();
              }}
              disabled={generating || !posterUrl}
              className="w-full bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 py-5 text-base font-semibold rounded-xl disabled:opacity-50"
            >
              <Download className="w-5 h-5 mr-2" />
              保存海报到相册
            </Button>
            
            <Button
              variant="outline"
              onClick={() => {
                const inviteUrl = window.location.origin + getGuardianInviteRegistrationPath(guardian?.invite_code || '');
                navigator.clipboard.writeText(inviteUrl);
                setShowCopied(true);
                setTimeout(() => setShowCopied(false), 2000);
              }}
              className="w-full border-rose-200 text-rose-600 py-5 text-base font-medium rounded-xl"
            >
              <Share2 className="w-5 h-5 mr-2" />
              复制邀请链接
            </Button>
          </div>

          {/* 提示 */}
          <p className="text-xs text-center text-muted-foreground mt-4">
            海报尺寸：375×600px，适合朋友圈分享
          </p>
        </CardContent>
          </Card>
    </div>
      )}

      {/* 守护者登录弹窗 */}
      {showLoginModal && (
        <GuardianLoginForm
          onSuccess={() => setShowLoginModal(false)}
          onCancel={() => setShowLoginModal(false)}
        />
      )}

      {/* 底部留白 */}
      <div className="h-8" />
    </div>
  );
}
