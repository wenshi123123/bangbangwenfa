'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, Shield, Gift, Loader2, Users, Eye, EyeOff, User, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';

function RegisterForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { refreshAuth } = useAuth();
  const inviteCode = searchParams.get('code') || '';
  
  const [formData, setFormData] = useState({
    phone: '',
    code: '',
    username: '',
    password: '',
    confirmPassword: '',
    nickname: '',
    inviteCode: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameMessage, setUsernameMessage] = useState('');
  
  const [guardianInfo, setGuardianInfo] = useState<{ nickname: string } | null>(null);
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [sending, setSending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [verifyingInvite, setVerifyingInvite] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // 验证守护者邀请码
  const verifyInviteCode = useCallback(async (code: string) => {
    setVerifyingInvite(true);
    setInviteError(null);
    try {
      const res = await fetch(`/api/guardian/verify-code?code=${code}`);
      const data = await res.json();
      if (data.success) {
        setGuardianInfo(data.data);
      } else {
        setInviteError(data.error || '邀请码无效');
      }
    } catch (error) {
      console.error('验证邀请码失败:', error);
      setInviteError('邀请码验证失败，请稍后重试');
    } finally {
      setVerifyingInvite(false);
    }
  }, []);

  useEffect(() => {
    if (inviteCode) {
      verifyInviteCode(inviteCode);
    }
  }, [inviteCode, verifyInviteCode]);

  // 检查用户名
  const checkUsername = useCallback(async (username: string) => {
    if (!username || username.length < 2) {
      setUsernameAvailable(null);
      setUsernameMessage('');
      return;
    }

    setUsernameChecking(true);
    try {
      const res = await fetch(`/api/auth/check-username?username=${encodeURIComponent(username)}`);
      const data = await res.json();
      if (data.success) {
        setUsernameAvailable(data.data.available);
        setUsernameMessage(data.data.reason || (data.data.available ? '用户名可用' : ''));
      }
    } catch (error) {
      console.error('检查用户名失败:', error);
    } finally {
      setUsernameChecking(false);
    }
  }, []);

  // 用户名输入变化时检查
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.username && /^[\u4e00-\u9fa5a-zA-Z0-9_]+$/.test(formData.username)) {
        checkUsername(formData.username);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [formData.username, checkUsername]);

  const sendCode = async () => {
    if (!formData.phone || !/^1[3-9]\d{9}$/.test(formData.phone)) {
      setErrors({ ...errors, phone: '请输入正确的手机号' });
      return;
    }
    
    setSending(true);
    try {
      const res = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formData.phone, type: 'register' })
      });
      const data = await res.json();
      if (data.success) {
        setCountdown(60);
        const timer = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              setSending(false);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        setErrors({ ...errors, phone: data.error || '发送失败' });
        setSending(false);
      }
    } catch (error) {
      setErrors({ ...errors, phone: '发送失败，请稍后重试' });
      setSending(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.phone || !/^1[3-9]\d{9}$/.test(formData.phone)) {
      newErrors.phone = '请输入正确的手机号';
    }
    
    if (!formData.code || !/^\d{4,6}$/.test(formData.code)) {
      newErrors.code = '请输入验证码';
    }
    
    if (!formData.username) {
      newErrors.username = '请输入用户名';
    } else if (!/^[\u4e00-\u9fa5a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username = '用户名只能包含中文、字母、数字和下划线';
    } else if (formData.username.length < 2 || formData.username.length > 20) {
      newErrors.username = '用户名需要2-20个字符';
    } else if (usernameAvailable === false) {
      newErrors.username = '该用户名已被使用';
    }
    
    if (!formData.password) {
      newErrors.password = '请输入密码';
    } else if (formData.password.length < 6) {
      newErrors.password = '密码至少需要6位';
    } else if (!/[a-zA-Z]/.test(formData.password) || !/[0-9]/.test(formData.password)) {
      newErrors.password = '密码需要包含字母和数字';
    }
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = '两次输入的密码不一致';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: formData.phone,
          code: formData.code,
          username: formData.username,
          password: formData.password,
          inviteCode: inviteCode || formData.inviteCode || undefined
        })
      });
      
      const data = await res.json();
      
      if (data.success) {
        const userData = data.data.user;
        const token = data.data.token;
        
        const fullUserInfo = {
          ...userData,
          userType: 'user',
          isGuardian: false,
          guardianInfo: null,
          isLawyer: false,
          lawyerInfo: null
        };
        
        localStorage.setItem('user_info', JSON.stringify(fullUserInfo));
        if (token) {
          localStorage.setItem('token', token);
        }
        
        window.dispatchEvent(new CustomEvent('user-logged-in', { 
          detail: fullUserInfo 
        }));
        
        setStep('success');
        setTimeout(() => {
          router.push('/');
        }, 2000);
      } else {
        setErrors({ submit: data.error || '注册失败' });
      }
    } catch (error) {
      setErrors({ submit: '注册失败，请稍后重试' });
    } finally {
      setLoading(false);
    }
  };

  // 显示验证加载状态
  if (inviteCode && verifyingInvite) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#C47353] mx-auto mb-4" />
          <p className="text-[#8C7B6E]">正在验证邀请码...</p>
        </div>
      </div>
    );
  }

  // 显示验证错误
  if (inviteCode && inviteError) {
    return (
      <div className="min-h-screen bg-[#FAF7F2]">
        <div className="sticky top-0 z-40 bg-[#FAF7F2]/80 backdrop-blur-md border-b border-[rgba(196,115,83,0.15)]">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2 text-[#C47353] hover:text-[#A85D40]">
                <ArrowLeft className="w-5 h-5" />
                <span className="text-sm font-medium">返回</span>
              </Link>
              <h1 className="text-base font-serif text-[#3D322D] font-normal">注册</h1>
              <div className="w-12" />
            </div>
          </div>
        </div>
        <div className="container mx-auto px-4 py-6">
          <Card className="border-red-200 bg-red-50 shadow-none rounded-xl">
            <CardContent className="pt-6 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl text-red-600">!</span>
              </div>
              <h2 className="text-xl font-serif text-[#3D322D] font-normal mb-2">邀请码无效</h2>
              <p className="text-[#8C7B6E] mb-6">{inviteError}</p>
              <Link href="/">
                <Button variant="outline" className="border-[#C47353] text-[#C47353] hover:bg-[#C47353] hover:text-white rounded-full">
                  返回首页
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // 注册成功页面
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-[0_4px_16px_rgba(61,50,45,0.08)] rounded-xl">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="w-20 h-20 bg-[#FAF7F2] rounded-full border border-[rgba(196,115,83,0.2)] flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-[#C47353]" />
            </div>
            <h2 className="text-2xl font-serif text-[#3D322D] font-normal mb-2">注册成功!</h2>
            <p className="text-[#8C7B6E] mb-6">
              欢迎加入「帮帮问法」
            </p>
            
            {guardianInfo && (
              <div className="bg-[#FAF7F2] border border-[rgba(196,115,83,0.2)] rounded-xl p-4 mb-6">
                <p className="text-sm text-[#8C7B6E] mb-1">您的守护者</p>
                <p className="text-lg font-serif text-[#C47353] font-normal">{guardianInfo.nickname}</p>
              </div>
            )}
            
            <div className="space-y-3 text-left">
              <div className="flex items-start gap-3 p-3 bg-[#FAF7F2] rounded-xl border border-[rgba(196,115,83,0.2)]">
                <Shield className="w-5 h-5 text-[#C47353] mt-0.5" />
                <div>
                  <p className="font-medium text-sm text-[#3D322D]">您的信息已加密保护</p>
                  <p className="text-xs text-[#8C7B6E]">我们不会向第三方泄露</p>
                </div>
              </div>
              {guardianInfo && (
                <div className="flex items-start gap-3 p-3 bg-[#FAF7F2] rounded-xl border border-[rgba(196,115,83,0.2)]">
                  <Gift className="w-5 h-5 text-[#C47353] mt-0.5" />
                  <div>
                    <p className="font-medium text-sm text-[#3D322D]">守护者将获得服务分成</p>
                    <p className="text-xs text-[#8C7B6E]">感谢您支持守护者计划</p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="mt-6">
              <Link href="/" className="block">
                <Button className="w-full bg-[#C47353] hover:bg-[#A85D40] text-white rounded-full py-6 text-lg font-medium h-auto transition-all duration-250 shadow-[0_2px_8px_rgba(196,115,83,0.3)] hover:-translate-y-[1px]">
                  开始使用
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 注册表单
  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-40 bg-[#FAF7F2]/80 backdrop-blur-md border-b border-[rgba(196,115,83,0.15)]">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 text-[#C47353] hover:text-[#A85D40]">
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-medium">返回</span>
            </Link>
            <h1 className="text-base font-serif text-[#3D322D] font-normal">用户注册</h1>
            <div className="w-12" />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-md">
        {/* 邀请信息 */}
        {inviteCode && guardianInfo && (
          <Card className="mb-6 border-[rgba(196,115,83,0.2)] bg-[#FAF7F2] shadow-none rounded-xl">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#FAF7F2] border border-[rgba(196,115,83,0.2)] flex items-center justify-center">
                  <Users className="w-6 h-6 text-[#C47353]" />
                </div>
                <div>
                  <p className="text-sm text-[#8C7B6E]">您正在加入守护者</p>
                  <p className="font-serif text-[#C47353] font-normal">{guardianInfo.nickname}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 注册表单 */}
        <Card className="mb-6 shadow-[0_4px_16px_rgba(61,50,45,0.08)] rounded-xl">
          <CardContent className="pt-6">
            <h2 className="text-xl font-serif text-[#3D322D] font-normal mb-6">创建您的账号</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 手机号 */}
              <div>
                <label className="block text-sm font-medium text-[#3D322D] mb-2">手机号 <span className="text-red-500">*</span></label>
                <div className="flex gap-2">
                  <Input
                    type="tel"
                    placeholder="请输入手机号"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 11) })}
                    className={`rounded-lg border-[#E5DDD5] focus:border-[#C47353] focus:ring-2 focus:ring-[#C47353]/20 ${errors.phone ? 'border-red-500' : ''}`}
                    maxLength={11}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={sendCode}
                    disabled={countdown > 0 || sending || formData.phone.length !== 11}
                    className="border-[#C47353] text-[#C47353] hover:bg-[#C47353] hover:text-white whitespace-nowrap rounded-full"
                  >
                    {countdown > 0 ? `${countdown}s` : '获取验证码'}
                  </Button>
                </div>
                {errors.phone && (
                  <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
                )}
              </div>

              {/* 验证码 */}
              <div>
                <label className="block text-sm font-medium text-[#3D322D] mb-2">验证码 <span className="text-red-500">*</span></label>
                <Input
                  type="text"
                  placeholder="请输入验证码"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                  className={`rounded-lg border-[#E5DDD5] focus:border-[#C47353] focus:ring-2 focus:ring-[#C47353]/20 ${errors.code ? 'border-red-500' : ''}`}
                  maxLength={6}
                />
                {errors.code && (
                  <p className="text-red-500 text-sm mt-1">{errors.code}</p>
                )}
              </div>

              {/* 用户名 */}
              <div>
                <label className="block text-sm font-medium text-[#3D322D] mb-2">用户名 <span className="text-red-500">*</span></label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C7B6E]" />
                  <Input
                    type="text"
                    placeholder="支持中英文，2-20个字符"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className={`pl-10 rounded-lg border-[#E5DDD5] focus:border-[#C47353] focus:ring-2 focus:ring-[#C47353]/20 ${errors.username ? 'border-red-500' : usernameAvailable === true ? 'border-green-500' : usernameAvailable === false ? 'border-red-500' : ''}`}
                    maxLength={20}
                  />
                  {usernameChecking && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-[#8C7B6E]" />
                  )}
                </div>
                {errors.username && (
                  <p className="text-red-500 text-sm mt-1">{errors.username}</p>
                )}
                {usernameMessage && !errors.username && (
                  <p className={`text-sm mt-1 ${usernameAvailable ? 'text-green-600' : 'text-red-500'}`}>
                    {usernameMessage}
                  </p>
                )}
              </div>

              {/* 密码 */}
              <div>
                <label className="block text-sm font-medium text-[#3D322D] mb-2">密码 <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C7B6E]" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="至少6位，包含字母和数字"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className={`pl-10 pr-10 rounded-lg border-[#E5DDD5] focus:border-[#C47353] focus:ring-2 focus:ring-[#C47353]/20 ${errors.password ? 'border-red-500' : ''}`}
                    maxLength={20}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C7B6E] hover:text-[#3D322D]"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-red-500 text-sm mt-1">{errors.password}</p>
                )}
              </div>

              {/* 确认密码 */}
              <div>
                <label className="block text-sm font-medium text-[#3D322D] mb-2">确认密码 <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C7B6E]" />
                  <Input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="请再次输入密码"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className={`pl-10 pr-10 rounded-lg border-[#E5DDD5] focus:border-[#C47353] focus:ring-2 focus:ring-[#C47353]/20 ${errors.confirmPassword ? 'border-red-500' : ''}`}
                    maxLength={20}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C7B6E] hover:text-[#3D322D]"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>
                )}
              </div>

              {/* 邀请码（如果没有从URL获取） */}
              {!inviteCode && (
                <div>
                  <label className="block text-sm font-medium text-[#3D322D] mb-2">邀请码（选填）</label>
                  <Input
                    placeholder="守护者邀请码"
                    value={formData.inviteCode}
                    onChange={(e) => setFormData({ ...formData, inviteCode: e.target.value })}
                    className="rounded-lg border-[#E5DDD5] focus:border-[#C47353] focus:ring-2 focus:ring-[#C47353]/20"
                    maxLength={20}
                  />
                </div>
              )}

              {/* 提交错误 */}
              {errors.submit && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-red-600 text-sm">{errors.submit}</p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-[#C47353] hover:bg-[#A85D40] text-white rounded-full py-6 text-lg font-medium h-auto transition-all duration-250 shadow-[0_2px_8px_rgba(196,115,83,0.3)] hover:-translate-y-[1px] active:scale-[0.98]"
                disabled={loading || usernameChecking || usernameAvailable === false}
              >
                {loading ? '注册中...' : '立即注册'}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <span className="text-[#8C7B6E] text-sm">已有账号？</span>
              <Link href="/" className="text-[#C47353] hover:underline text-sm ml-1">立即登录</Link>
            </div>

            <p className="text-xs text-[#8C7B6E] text-center mt-4">
              注册即表示同意 <span className="text-[#C47353]">《用户协议》</span> 和 <span className="text-[#C47353]">《隐私政策》</span>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C47353] mx-auto mb-4"></div>
          <p className="text-[#8C7B6E]">加载中...</p>
        </div>
      </div>
    }>
      <RegisterForm />
    </Suspense>
  );
}
