'use client';

import { useState, useCallback, useRef } from 'react';
import { X, Smartphone, Loader2, CheckCircle, AlertCircle, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface GuardianLoginFormProps {
  onSuccess: (data: any) => void;
  onCancel?: () => void;
}

export function GuardianLoginForm({ onSuccess, onCancel }: GuardianLoginFormProps) {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [step, setStep] = useState<'input' | 'verifying' | 'success'>('input');
  const [countdown, setCountdown] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const clearCountdown = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  const handleSendCode = useCallback(async () => {
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      setErrorMsg('请输入正确的手机号');
      return;
    }

    setIsSending(true);
    setErrorMsg('');

    try {
      const response = await fetch('/api/sms/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phone,
          type: 'guardian_login'
        })
      });

      const result = await response.json();

      if (result.success) {
        setCountdown(60);
        countdownRef.current = setInterval(() => {
          setCountdown(prev => {
            if (prev <= 1) {
              clearCountdown();
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        setErrorMsg(result.error || '发送失败，请重试');
      }
    } catch (error) {
      console.error('发送验证码错误:', error);
      setErrorMsg('网络错误，请重试');
    } finally {
      setIsSending(false);
    }
  }, [phone, clearCountdown]);

  const handleLogin = useCallback(async () => {
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      setErrorMsg('请输入正确的手机号');
      return;
    }

    if (!/^\d{6}$/.test(code)) {
      setErrorMsg('请输入6位验证码');
      return;
    }

    setStep('verifying');
    setErrorMsg('');

    try {
      const response = await fetch('/api/guardian/phone-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phone,
          code
        })
      });

      const result = await response.json();

      if (result.success) {
        setStep('success');
        
        // 保存守护者信息
        const guardianData = result.data;
        localStorage.setItem('guardian_user', JSON.stringify(guardianData));
        localStorage.setItem('token', guardianData.token);
        
        // 保存用户信息（兼容主站）
        const userInfo = {
          id: guardianData.id,
          phone: guardianData.phone,
          nickname: guardianData.nickname,
          userType: 'guardian',
          isGuardian: true,
          guardianInfo: {
            id: guardianData.id,
            inviteCode: guardianData.invite_code,
            totalInvites: guardianData.total_invites,
            validInvites: guardianData.valid_invites,
            totalCommission: guardianData.total_commission,
            availableCommission: guardianData.available_commission,
          },
          isLawyer: false,
          lawyerInfo: null,
        };
        localStorage.setItem('user_info', JSON.stringify(userInfo));

        // 触发登录成功事件
        window.dispatchEvent(new CustomEvent('user-logged-in', {
          detail: userInfo
        }));

        setTimeout(() => {
          onSuccess(result.data);
        }, 1000);
      } else {
        setStep('input');
        setErrorMsg(result.error || '登录失败，请重试');
      }
    } catch (error) {
      console.error('登录错误:', error);
      setStep('input');
      setErrorMsg('网络错误，请重试');
    }
  }, [phone, code, onSuccess]);

  // 清理
  const handleClose = () => {
    clearCountdown();
    if (onCancel) {
      onCancel();
    }
  };

  if (step === 'success') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200 p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-green-600 font-medium text-lg mb-2">登录成功</p>
            <p className="text-muted-foreground">正在进入守护者中心...</p>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'verifying') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200 p-8">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-rose-500 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">正在验证...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-rose-500 to-orange-500 px-6 py-6">
          <button
            onClick={handleClose}
            className="absolute right-4 top-4 text-white/80 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">守护者登录</h2>
              <p className="text-white/80 text-xs">登录后即可开通守护者身份</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4">
          {/* 手机号 */}
          <div className="space-y-2">
            <Label htmlFor="guardian-phone">手机号</Label>
            <Input
              id="guardian-phone"
              type="tel"
              placeholder="请输入手机号"
              value={phone}
              onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
              maxLength={11}
              className="h-12" />
          </div>

          {/* 验证码 */}
          <div className="space-y-2">
            <Label htmlFor="guardian-code">验证码</Label>
            <div className="flex gap-2">
              <Input
                id="guardian-code"
                type="text"
                placeholder="请输入验证码"
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                className="h-12 flex-1" />
              <Button
                type="button"
                variant="outline"
                className="h-12 px-4 whitespace-nowrap"
                onClick={handleSendCode}
                disabled={countdown > 0 || isSending || phone.length !== 11}>
                {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : countdown > 0 ? `${countdown}s` : '获取验证码'}
              </Button>
            </div>
          </div>

          {/* 错误提示 */}
          {errorMsg && (
            <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 p-3 rounded-lg">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 登录按钮 */}
          <Button
            className="w-full h-12 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-medium transition-all duration-200"
            onClick={handleLogin}
            disabled={phone.length !== 11 || code.length !== 6}>
            登录 / 成为守护者
          </Button>

          {/* 提示 */}
          <p className="text-xs text-center text-muted-foreground">
            未注册的手机号将自动创建守护者账号
          </p>
        </div>
      </div>
    </div>
  );
}
