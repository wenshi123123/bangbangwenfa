'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, Loader2, Lock, Eye, EyeOff, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

export default function ResetPasswordPage() {
  const router = useRouter();
  
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [countdown, setCountdown] = useState(0);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [error, setError] = useState('');
  
  // 发送验证码
  const sendCode = useCallback(async () => {
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      setError('请输入正确的手机号');
      return;
    }
    
    setSending(true);
    setError('');
    
    try {
      const res = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });
      
      const data = await res.json();
      
      if (data.success) {
        setCountdown(60);
      } else {
        setError(data.error || '发送失败');
      }
    } catch (err) {
      setError('发送失败，请稍后重试');
    } finally {
      setSending(false);
    }
  }, [phone]);
  
  // 倒计时
  useEffect(() => {
    if (countdown <= 0) return;
    
    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [countdown]);
  
  // 提交重置
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 验证
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      setError('请输入正确的手机号');
      return;
    }
    
    if (!/^\d{6}$/.test(code)) {
      setError('请输入6位验证码');
      return;
    }
    
    if (newPassword.length < 6) {
      setError('密码至少需要6位');
      return;
    }
    
    if (!/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setError('密码需要包含字母和数字');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code, newPassword })
      });
      
      const data = await res.json();
      
      if (data.success) {
        setStep('success');
      } else {
        setError(data.error || '重置失败');
      }
    } catch (err) {
      setError('重置失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };
  
  // 成功页面
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-orange-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">密码重置成功</h2>
            <p className="text-muted-foreground mb-6">
              请使用新密码登录
            </p>
            
            <Button
              className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
              onClick={() => {
                window.dispatchEvent(new CustomEvent('open-login-modal'));
                router.push('/');
              }}
            >
              立即登录
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // 表单页面
  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white">
      {/* 顶部导航 */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-orange-100/50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 text-orange-600 hover:text-orange-700">
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-medium">返回</span>
            </Link>
            <h1 className="text-base font-semibold text-foreground">重置密码</h1>
            <div className="w-12" />
          </div>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-6 max-w-md">
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <Lock className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold">设置新密码</h2>
                <p className="text-sm text-muted-foreground">通过手机验证码重置密码</p>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 手机号 */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  <Smartphone className="w-4 h-4 inline-block mr-1" />
                  手机号
                </label>
                <Input
                  type="tel"
                  placeholder="请输入手机号"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                  maxLength={11}
                  className="h-12"
                />
              </div>
              
              {/* 验证码 */}
              <div>
                <label className="block text-sm font-medium mb-2">验证码</label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="请输入验证码"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6}
                    className="h-12 flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 px-4 border-orange-200 text-orange-600 hover:bg-orange-50 whitespace-nowrap"
                    onClick={sendCode}
                    disabled={countdown > 0 || sending || phone.length !== 11}
                  >
                    {sending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : countdown > 0 ? (
                      `${countdown}s`
                    ) : (
                      '获取验证码'
                    )}
                  </Button>
                </div>
              </div>
              
              {/* 新密码 */}
              <div>
                <label className="block text-sm font-medium mb-2">新密码</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="至少6位，包含字母和数字"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="h-12 pl-10 pr-10"
                    maxLength={20}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              {/* 确认密码 */}
              <div>
                <label className="block text-sm font-medium mb-2">确认密码</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="请再次输入新密码"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-12 pl-10 pr-10"
                    maxLength={20}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              {/* 错误提示 */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}
              
              {/* 提交按钮 */}
              <Button
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                disabled={loading || phone.length !== 11 || code.length !== 6 || !newPassword || !confirmPassword}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    重置中...
                  </>
                ) : (
                  '确认重置'
                )}
              </Button>
            </form>
            
            <div className="mt-4 text-center">
              <span className="text-muted-foreground text-sm">想起密码了？</span>
              <Link href="/" className="text-orange-600 hover:underline text-sm ml-1">返回登录</Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
