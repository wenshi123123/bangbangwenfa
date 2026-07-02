'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft,
  Bell,
  Loader2,
  Send,
  Users,
  UserCheck,
  Shield,
  Calendar,
  Activity,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { adminApiRequest } from '@/lib/api/request';

const ADMIN_LOGIN_HREF = '/admin/login';

interface TargetOption {
  value: string;
  label: string;
  description: string;
  icon: any;
}

const targetOptions: TargetOption[] = [
  { value: 'all_users', label: '全部用户', description: '向所有注册用户发送通知', icon: Users },
  { value: 'all_guardians', label: '全部守护者', description: '向所有守护者发送通知', icon: Shield },
  { value: 'all_lawyers', label: '全部律师', description: '向所有认证律师发送通知', icon: UserCheck },
  { value: 'new_users', label: '新用户', description: '最近7天内注册的用户', icon: Calendar },
  { value: 'active_users', label: '活跃用户', description: '有过订单交易的用户', icon: Activity },
];

export default function AdminNotificationsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [adminInfo, setAdminInfo] = useState<any>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [formData, setFormData] = useState({
    target_type: 'all_users',
    title: '',
    content: '',
    days: 7,
  });
  const [result, setResult] = useState<{ success: boolean; message: string; sent_count?: number } | null>(null);

  useEffect(() => {
    const storedAdmin = localStorage.getItem('admin_info');
    if (!storedAdmin) {
      setNeedsLogin(true);
      return;
    }
    try {
      const admin = JSON.parse(storedAdmin);
      setAdminInfo(admin);
    } catch (error) {
      console.error('解析管理员信息失败:', error);
      setNeedsLogin(true);
    }
  }, []);

  const handleSubmit = async () => {
    // 直接从 localStorage 读取，避免异步状态问题
    const storedAdmin = localStorage.getItem('admin_info');
    if (!storedAdmin) {
      router.push(ADMIN_LOGIN_HREF);
      return;
    }
    let adminData: any;
    try {
      adminData = JSON.parse(storedAdmin);
    } catch (error) {
      console.error('解析管理员信息失败:', error);
      router.push(ADMIN_LOGIN_HREF);
      return;
    }
    // 兼容两种存储格式：直接存储admin对象 或 存储包含admin的包装对象
    const admin = adminData.admin || adminData;
    
    if (!admin || !admin.id) {
      router.push(ADMIN_LOGIN_HREF);
      return;
    }

    if (!formData.title.trim()) {
      setResult({ success: false, message: '请输入通知标题' });
      return;
    }
    if (!formData.content.trim()) {
      setResult({ success: false, message: '请输入通知内容' });
      return;
    }

    setSending(true);
    setResult(null);

    try {
      const response = await adminApiRequest('/api/notifications/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      
      if (data.success) {
        const sentCount = data.data?.sent_count ?? 0;
        const totalTargets = data.data?.total_targets ?? 0;
        setResult({
          success: true,
          message: data.data?.message || '通知发送成功',
          sent_count: sentCount,
        });
        if (sentCount > 0) {
          setFormData({ ...formData, title: '', content: '' });
        }
      } else {
        setResult({ success: false, message: data.error || '发送失败' });
      }
    } catch (error) {
      console.error('发送通知失败:', error);
      setResult({ success: false, message: '网络错误，请重试' });
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {needsLogin ? (
        <div className="min-h-[60vh] flex items-center justify-center bg-slate-50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-[0_12px_40px_rgba(15,23,42,0.08)] text-center">
            <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-green-50 flex items-center justify-center">
              <Bell className="w-7 h-7 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">管理员登录</h1>
            <p className="mt-2 text-sm text-slate-500">请先登录管理员账号后再发送系统通知</p>
            <div className="mt-6">
              <Link
                href={ADMIN_LOGIN_HREF}
                className="inline-flex items-center justify-center rounded-full bg-green-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-green-700"
              >
                前往登录
              </Link>
            </div>
          </div>
        </div>
      ) : (
    <div>
      {/* Page Header — 不再 sticky，复用 layout 导航栏 */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <Link 
          href="/admin/dashboard"
          className="self-start p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div className="flex items-center gap-3">
          <Bell className="w-6 h-6 text-slate-600" />
          <div>
            <h1 className="text-xl font-bold text-slate-800">发送系统通知</h1>
            <p className="text-sm text-slate-500">向指定用户群推送消息通知</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl">
        {/* 结果提示 */}
        {result && (
          <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
            result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
            {result.success ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600" />
            )}
            <span className={result.success ? 'text-green-700' : 'text-red-700'}>
              {result.message}
              {result.sent_count !== undefined && `（已发送给 ${result.sent_count} 位用户）`}
            </span>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              通知内容
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 目标选择 */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-3">
                发送对象
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {targetOptions.map(option => {
                  const IconComponent = option.icon;
                  return (
                    <button
                      key={option.value}
                      onClick={() => setFormData({ ...formData, target_type: option.value })}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        formData.target_type === option.value
                          ? 'border-rose-500 bg-rose-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-1">
                        <IconComponent className={`w-5 h-5 ${
                          formData.target_type === option.value ? 'text-rose-500' : 'text-slate-400'
                        }`} />
                        <span className={`font-semibold ${
                          formData.target_type === option.value ? 'text-rose-700' : 'text-foreground'
                        }`}>
                          {option.label}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{option.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 新用户天数选择 */}
            {formData.target_type === 'new_users' && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  注册时间范围
                </label>
                <div className="flex gap-3">
                  {[7, 14, 30].map(days => (
                    <button
                      key={days}
                      onClick={() => setFormData({ ...formData, days })}
                      className={`px-4 py-2 rounded-lg border-2 transition-all ${
                        formData.days === days
                          ? 'border-rose-500 bg-rose-50 text-rose-700'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      最近 {days} 天
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 通知标题 */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                通知标题
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="请输入通知标题"
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-rose-500 transition-colors"
                maxLength={50}
              />
              <p className="text-xs text-muted-foreground mt-1 text-right">
                {formData.title.length}/50
              </p>
            </div>

            {/* 通知内容 */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                通知内容
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="请输入通知内容"
                rows={4}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-rose-500 transition-colors resize-none"
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground mt-1 text-right">
                {formData.content.length}/500
              </p>
            </div>

            {/* 发送按钮 */}
            <Button
              onClick={handleSubmit}
              disabled={sending || !formData.title.trim() || !formData.content.trim()}
              className="w-full bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 py-6 text-lg font-semibold rounded-xl"
            >
              {sending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  发送中...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Send className="w-5 h-5" />
                  确认发送
                </span>
              )}
            </Button>

            {/* 提示 */}
            <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium mb-1">发送提示</p>
                  <ul className="list-disc list-inside space-y-1 text-amber-700">
                    <li>系统通知将直接推送到用户的消息中心</li>
                    <li>请确保通知内容真实有效，避免频繁发送</li>
                    <li>发送后无法撤回，请仔细核对内容</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
      )}
    </>
  );
}
