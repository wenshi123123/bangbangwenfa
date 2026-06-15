import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { X, Eye, EyeOff, Smartphone, Key, Loader2, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { useAuth } from '@/lib/auth/use-auth'
import { validateUsername, validatePassword, validatePhone, validateSmsCode, ValidationError } from '@/lib/auth/validators'
import { isMockAuthEnabled } from '@/lib/auth/mock-auth'
import Link from 'next/link'

interface LoginModalProps {
  open: boolean
  onClose: () => void
  onSwitchToRegister: () => void
}

interface LoginFormData {
  phone: string
  password: string
}

interface SmsLoginFormData {
  phone: string
  code: string
}

interface SmsState {
  sending: boolean
  countdown: number
  sent: boolean
  error: string | null
}

type LoginMode = 'password' | 'sms'

export function LoginModal({ open, onClose, onSwitchToRegister }: LoginModalProps) {
  const { login, loginWithPhone } = useAuth()
  const router = useRouter()
  const [mode, setMode] = useState<LoginMode>('password')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [agreed, setAgreed] = useState(false)
  
  const [formData, setFormData] = useState<LoginFormData>({
    phone: '',
    password: ''
  })
  
  const [smsFormData, setSmsFormData] = useState<SmsLoginFormData>({
    phone: '',
    code: ''
  })
  
  const [smsState, setSmsState] = useState<SmsState>({
    sending: false,
    countdown: 0,
    sent: false,
    error: null
  })
  
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [showPassword, setShowPassword] = useState(false)

  // 重置状态
  useEffect(() => {
    if (open) {
      setError(null)
      setFieldErrors({})
      setFormData({ phone: '', password: '' })
      setSmsFormData({ phone: '', code: '' })
      setSmsState({ sending: false, countdown: 0, sent: false, error: null })
      setAgreed(false)
      setMode('password')
    }
  }, [open])

  // 倒计时
  useEffect(() => {
    if (smsState.countdown > 0) {
      const timer = setTimeout(() => {
        setSmsState(prev => ({ ...prev, countdown: prev.countdown - 1 }))
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [smsState.countdown])

  // 切换模式
  const handleModeSwitch = useCallback((newMode: LoginMode) => {
    setMode(newMode)
    setError(null)
    setFieldErrors({})
    setSmsState({ sending: false, countdown: 0, sent: false, error: null })
  }, [])

  // 密码登录表单更新
  const handleFormChange = useCallback((field: keyof LoginFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setFieldErrors(prev => {
      const next = { ...prev }
      delete next[field]
      return next
    })
    setError(null)
  }, [])

  // 短信登录表单更新
  const handleSmsFormChange = useCallback((field: keyof SmsLoginFormData, value: string) => {
    setSmsFormData(prev => ({ ...prev, [field]: value }))
    setFieldErrors(prev => {
      const next = { ...prev }
      delete next[field]
      return next
    })
    setError(null)
  }, [])

  // 发送验证码
  const handleSendCode = useCallback(async () => {
    try {
      validatePhone(smsFormData.phone)
    } catch (err) {
      if (err instanceof ValidationError) {
        setFieldErrors(prev => ({ ...prev, phone: err.message }))
      }
      return
    }
    
    setSmsState(prev => ({ ...prev, sending: true, error: null }))
    try {
      const response = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: smsFormData.phone, type: 'login' })
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || '发送验证码失败')
      }
      setSmsState(prev => ({ ...prev, sending: false, countdown: 60, sent: true, error: null }))
    } catch (err: any) {
      setSmsState(prev => ({ ...prev, sending: false, error: err.message || '发送验证码失败' }))
    }
  }, [smsFormData.phone])

  // 密码登录
  const handlePasswordLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    const errors: Record<string, string> = {}
    
    // 验证用户名
    try {
      validateUsername(formData.phone)
    } catch (err) {
      if (err instanceof ValidationError) {
        errors.phone = err.message
      }
    }
    
    // 验证密码
    try {
      validatePassword(formData.password)
    } catch (err) {
      if (err instanceof ValidationError) {
        errors.password = err.message
      }
    }
    
    // 检查协议
    if (!agreed) {
      errors.agreement = '请先阅读并同意用户协议和隐私政策'
    }
    
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }
    
    setLoading(true)
    setError(null)
    
    try {
      const result = await login({ username: formData.phone, password: formData.password })
      if (result.success) {
        onClose()
        // 根据用户角色跳转
        if (result.role === 'lawyer') {
          router.push('/lawyer/dashboard')
        } else if (result.role === 'admin') {
          router.push('/admin/dashboard')
        } else {
          router.push('/lawyer')
        }
      } else {
        setError(result.error || '登录失败，请检查账号密码')
      }
    } catch (err: any) {
      setError(err.message || '登录失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }, [formData, agreed, login, onClose, router])

  // 短信登录
  const handleSmsLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    const errors: Record<string, string> = {}
    
    // 验证手机号
    try {
      validatePhone(smsFormData.phone)
    } catch (err) {
      if (err instanceof ValidationError) {
        errors.phone = err.message
      }
    }
    
    // 验证验证码
    try {
      validateSmsCode(smsFormData.code)
    } catch (err) {
      if (err instanceof ValidationError) {
        errors.code = err.message
      }
    }
    
    // 检查协议
    if (!agreed) {
      errors.agreement = '请先阅读并同意用户协议和隐私政策'
    }
    
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }
    
    setLoading(true)
    setError(null)
    
    try {
      const result = await loginWithPhone({ phone: smsFormData.phone, code: smsFormData.code })
      if (result.success) {
        onClose()
        if (result.role === 'lawyer') {
          router.push('/lawyer/dashboard')
        } else if (result.role === 'admin') {
          router.push('/admin/dashboard')
        } else {
          router.push('/lawyer')
        }
      } else {
        setError(result.error || '登录失败')
      }
    } catch (err: any) {
      setError(err.message || '登录失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }, [smsFormData, agreed, loginWithPhone, onClose, router])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 遮罩 */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* 弹窗 */}
      <div className="relative w-full max-w-md mx-4 animate-in fade-in zoom-in-95 duration-200">
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* 内容 */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#C47353] via-[#B5654A] to-[#8B5E3C] shadow-2xl">
          {/* 顶部装饰 */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-full" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-tr-full" />
          
          <div className="relative px-6 pt-6 pb-8">
            {/* Logo + 标题 */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden bg-white/20">
                            <img 
                                src="/logo.png" 
                                alt="帮帮问法" 
                                className="w-10 h-10 object-contain"
                            />
                        </div>
                        <div>
                            <h2 className="text-xl font-serif text-white font-normal">帮帮问法</h2>
                            <p className="text-white/80 text-xs">专业法律服务，守护您的权益</p>
                        </div>
                    </div>
                {/* 切换按钮 */}
                <div className="flex gap-0 bg-white/10 rounded-lg p-0.5">
                    <button
                        type="button"
                        onClick={() => handleModeSwitch('sms')}
                        className={`flex-1 py-1.5 px-3 text-xs font-medium rounded-md transition-all ${
                            mode === 'sms' 
                            ? 'bg-white/90 text-[#C47353] shadow-sm' 
                            : 'text-white/70 hover:text-white'
                        }`}
                    >
                        验证码登录
                    </button>
                    <button
                        type="button"
                        onClick={() => handleModeSwitch('password')}
                        className={`flex-1 py-1.5 px-3 text-xs font-medium rounded-md transition-all ${
                            mode === 'password' 
                            ? 'bg-white/90 text-[#C47353] shadow-sm' 
                            : 'text-white/70 hover:text-white'
                        }`}
                    >
                        密码登录
                    </button>
                </div>
              </div>
            </div>

            {/* 表单 */}
            {mode === 'password' ? (
              <form onSubmit={handlePasswordLogin} className="space-y-4">
                {/* 用户名 */}
                <div>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <Input
                      type="text"
                      placeholder="请输入用户名或手机号"
                      value={formData.phone}
                      onChange={(e) => handleFormChange('phone', e.target.value)}
                      className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-white/40 focus:ring-white/20 h-11"
                    />
                  </div>
                  {fieldErrors.phone && (
                    <p className="text-red-300 text-xs mt-1 ml-1">{fieldErrors.phone}</p>
                  )}
                </div>

                {/* 密码 */}
                <div>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50">
                      <Key className="w-4 h-4" />
                    </div>
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="请输入密码"
                      value={formData.password}
                      onChange={(e) => handleFormChange('password', e.target.value)}
                      className="pl-10 pr-10 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-white/40 focus:ring-white/20 h-11"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/80 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <p className="text-red-300 text-xs mt-1 ml-1">{fieldErrors.password}</p>
                  )}
                </div>

                {/* 忘记密码 */}
                <div className="text-right">
                  <Link
                    href="/forgot-password"
                    className="text-xs text-white/60 hover:text-white/90 transition-colors"
                    onClick={onClose}
                  >
                    忘记密码？
                  </Link>
                </div>

                {/* 协议 */}
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="login-agreement-password"
                    checked={agreed}
                    onCheckedChange={(checked) => setAgreed(checked === true)}
                    className="mt-0.5 border-white/30 data-[state=checked]:bg-white data-[state=checked]:text-[#C47353]"
                  />
                  <label htmlFor="login-agreement-password" className="text-white/70 text-xs leading-relaxed cursor-pointer">
                    我已阅读并同意
                    <Link href="/user-agreement" className="text-white underline underline-offset-2 mx-0.5" onClick={onClose}>《用户协议》</Link>
                    和
                    <Link href="/privacy-policy" className="text-white underline underline-offset-2 mx-0.5" onClick={onClose}>《隐私政策》</Link>
                    等协议内容
                  </label>
                </div>
                {fieldErrors.agreement && (
                  <p className="text-red-300 text-xs ml-1">{fieldErrors.agreement}</p>
                )}

                {/* 登录按钮 */}
                <Button
                  type="submit"
                  disabled={loading || !agreed}
                  className="w-full h-11 bg-white text-[#C47353] hover:bg-white/90 font-medium disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      登录中...
                    </>
                  ) : (
                    '登录'
                  )}
                </Button>

                {/* 全局错误 */}
                {error && (
                  <div className="bg-red-500/20 border border-red-400/30 rounded-lg p-3">
                    <p className="text-red-200 text-xs text-center">{error}</p>
                  </div>
                )}

                {/* 底部链接 */}
                <p className="text-center text-white/60 text-xs">
                  还没有账号？{' '}
                  <button
                    type="button"
                    onClick={onSwitchToRegister}
                    className="text-white hover:underline font-medium"
                  >
                    立即注册
                  </button>
                </p>
              </form>
            ) : (
              <form onSubmit={handleSmsLogin} className="space-y-4">
                {/* 手机号 */}
                <div>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <Input
                      type="tel"
                      placeholder="请输入手机号"
                      value={smsFormData.phone}
                      onChange={(e) => handleSmsFormChange('phone', e.target.value)}
                      className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-white/40 focus:ring-white/20 h-11"
                    />
                  </div>
                  {fieldErrors.phone && (
                    <p className="text-red-300 text-xs mt-1 ml-1">{fieldErrors.phone}</p>
                  )}
                  {smsState.error && (
                    <p className="text-red-300 text-xs mt-1 ml-1">{smsState.error}</p>
                  )}
                </div>

                {/* 验证码 */}
                <div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <Input
                        type="text"
                        placeholder="请输入验证码"
                        value={smsFormData.code}
                        onChange={(e) => handleSmsFormChange('code', e.target.value)}
                        className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-white/40 focus:ring-white/20 h-11"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSendCode}
                      disabled={smsState.sending || smsState.countdown > 0}
                      className="h-11 px-4 border-white/30 text-white hover:bg-white/10 whitespace-nowrap text-xs"
                    >
                      {smsState.sending ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          发送中
                        </>
                      ) : smsState.countdown > 0 ? (
                        `${smsState.countdown}秒后重试`
                      ) : (
                        '获取验证码'
                      )}
                    </Button>
                  </div>
                  {fieldErrors.code && (
                    <p className="text-red-300 text-xs mt-1 ml-1">{fieldErrors.code}</p>
                  )}
                </div>

                {/* 协议 */}
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="login-agreement-sms"
                    checked={agreed}
                    onCheckedChange={(checked) => setAgreed(checked === true)}
                    className="mt-0.5 border-white/30 data-[state=checked]:bg-white data-[state=checked]:text-[#C47353]"
                  />
                  <label htmlFor="login-agreement-sms" className="text-white/70 text-xs leading-relaxed cursor-pointer">
                    我已阅读并同意
                    <Link href="/user-agreement" className="text-white underline underline-offset-2 mx-0.5" onClick={onClose}>《用户协议》</Link>
                    和
                    <Link href="/privacy-policy" className="text-white underline underline-offset-2 mx-0.5" onClick={onClose}>《隐私政策》</Link>
                    等协议内容
                  </label>
                </div>
                {fieldErrors.agreement && (
                  <p className="text-red-300 text-xs ml-1">{fieldErrors.agreement}</p>
                )}

                {/* 登录按钮 */}
                <Button
                  type="submit"
                  disabled={loading || !agreed}
                  className="w-full h-11 bg-white text-[#C47353] hover:bg-white/90 font-medium disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      登录中...
                    </>
                  ) : (
                    '登录 / 注册'
                  )}
                </Button>

                {/* 全局错误 */}
                {error && (
                  <div className="bg-red-500/20 border border-red-400/30 rounded-lg p-3">
                    <p className="text-red-200 text-xs text-center">{error}</p>
                  </div>
                )}

                {/* 底部链接 */}
                <p className="text-center text-white/60 text-xs">
                  还没有账号？{' '}
                  <button
                    type="button"
                    onClick={onSwitchToRegister}
                    className="text-white hover:underline font-medium"
                  >
                    立即注册
                  </button>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}