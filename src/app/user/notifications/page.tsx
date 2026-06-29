'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Bell,
  Loader2,
  CheckCircle2,
  MessageSquareText,
  UserCheck,
  AlertCircle,
  Clock,
  ChevronRight,
  MailOpen,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api/request';

interface Notification {
  id: number;
  user_id: string;
  type: string;
  title: string;
  content: string;
  data: any;
  is_read: boolean;
  created_at: string;
}

const typeConfig: Record<string, { label: string; color: string; icon: any }> = {
  order_assigned: { label: '律师接单', color: 'bg-amber-100 text-amber-700', icon: UserCheck },
  lawyer_confirmed: { label: '律师确认', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  lawyer_rejected: { label: '律师拒单', color: 'bg-red-100 text-red-700', icon: AlertCircle },
  lawyer_replied: { label: '律师回复', color: 'bg-blue-100 text-blue-700', icon: MessageSquareText },
  system_notice: { label: '系统通知', color: 'bg-slate-100 text-slate-700', icon: Bell },
};

const USER_CENTER_HREF = '/user?v=20260629a';

export default function UserNotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [markingAll, setMarkingAll] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  // 🔧 必须在组件顶部声明所有 hooks，禁止放在条件 return 之后
  const [isClient, setIsClient] = useState(false);
  const [notLoggedIn, setNotLoggedIn] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // 客户端检测登录状态
    if (typeof window !== 'undefined' && !localStorage.getItem('token')) {
      setNotLoggedIn(true);
    }
  }, []);

  const loadNotifications = useCallback(async (pageNum: number, append: boolean = false) => {
    if (pageNum === 1) setLoading(true);
    try {
      const res = await apiRequest(`/api/user/notifications?limit=20&offset=${(pageNum - 1) * 20}`);
      const result = await res.json();
      if (result.success) {
        const list: Notification[] = result.notifications || [];
        setNotifications(prev => append ? [...prev, ...list] : list);
        setUnreadCount(result.unreadCount || 0);
        setHasMore(list.length >= 20);
      }
    } catch (err) {
      console.error('加载通知失败:', err);
    } finally {
      if (pageNum === 1) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications(1, false);
  }, [loadNotifications]);

  const markAsRead = async (id: number) => {
    try {
      await apiRequest('/api/user/notifications', {
        method: 'PATCH',
        body: JSON.stringify({ ids: [id] }),
      });
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('标记已读失败:', err);
    }
  };

  const markAllAsRead = async () => {
    setMarkingAll(true);
    try {
      await apiRequest('/api/user/notifications', {
        method: 'PATCH',
        body: JSON.stringify({ markAll: true }),
      });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('全部已读失败:', err);
    } finally {
      setMarkingAll(false);
    }
  };

  const formatTime = (time: string) => {
    const d = new Date(time);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const handleNotificationClick = (n: Notification) => {
    // 标记为已读
    if (!n.is_read) markAsRead(n.id);

    const { type, data } = n;

    // 派单/确认/回复类通知 → 跳转律师名片页
    if (
      ['order_assigned', 'lawyer_confirmed', 'lawyer_replied'].includes(type) &&
      data?.lawyerId
    ) {
      router.push(`/lawyer/${data.lawyerId}/profile`);
      return;
    }

    // 律师拒单 / 系统通知等 → 仅标记已读，不跳转
    // 用户如需查看订单详情，可前往「我的订单」
    return;
  };

  // Loading 状态
  if (loading && !notLoggedIn) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#C47353] animate-spin" />
      </div>
    );
  }

  // 未登录引导
  if (isClient && notLoggedIn) {
    return (
      <div className="min-h-screen bg-[#FAF7F2]">
        <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-[rgba(196,115,83,0.15)]">
          <div className="container mx-auto px-4 py-3 flex items-center gap-3">
            <Link href={USER_CENTER_HREF} className="p-2 -ml-2 rounded-full hover:bg-[#FAF7F2] transition-colors">
              <ArrowLeft className="w-5 h-5 text-[#3D322D]" />
            </Link>
            <h1 className="font-serif text-[#3D322D] font-normal text-lg">通知中心</h1>
          </div>
        </div>
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="w-20 h-20 bg-[#FAF7F2] rounded-full flex items-center justify-center mx-auto mb-4 border border-[rgba(196,115,83,0.2)]">
            <Bell className="w-10 h-10 text-[#C47353]/40" />
          </div>
          <h2 className="font-serif text-[#3D322D] font-normal mb-2">请先登录</h2>
          <p className="text-[#8C7B6E] text-sm mb-6">登录后即可查看您的通知</p>
          <Link href="/login-modal">
            <Button className="bg-[#C47353] hover:bg-[#A85D40] text-white rounded-full px-8">
              去登录
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-[rgba(196,115,83,0.15)]">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={USER_CENTER_HREF} className="p-2 -ml-2 rounded-full hover:bg-[#FAF7F2] transition-colors">
              <ArrowLeft className="w-5 h-5 text-[#3D322D]" />
            </Link>
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-[#C47353]" />
              <h1 className="font-serif text-[#3D322D] font-normal text-lg">通知中心</h1>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              disabled={markingAll}
              className="text-sm text-[#C47353] hover:text-[#A85D40] font-medium disabled:opacity-50"
            >
              {markingAll ? '处理中...' : '全部已读'}
            </button>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 py-4">
        {notifications.length === 0 ? (
          <div className="bg-white rounded-xl shadow-[0_4px_16px_rgba(61,50,45,0.08)] p-12 text-center">
            <div className="w-20 h-20 bg-[#FAF7F2] rounded-full flex items-center justify-center mx-auto mb-4 border border-[rgba(196,115,83,0.2)]">
              <Bell className="w-10 h-10 text-[#C47353]/40" />
            </div>
            <h2 className="font-serif text-[#3D322D] font-normal mb-2">暂无通知</h2>
            <p className="text-[#8C7B6E] text-sm">当律师接单或回复时，通知将出现在这里</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map(n => {
              const config = typeConfig[n.type] || typeConfig.system_notice;
              const Icon = config.icon;
              return (
                <button
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`w-full text-left bg-white rounded-xl shadow-[0_2px_8px_rgba(61,50,45,0.04)] p-4 transition-all hover:shadow-[0_4px_16px_rgba(61,50,45,0.08)] ${
                    !n.is_read ? 'border-l-[3px] border-l-[#C47353] bg-[#FAF7F2]/50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* 图标 */}
                    <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
                      !n.is_read ? 'bg-[#C47353]/10 text-[#C47353]' : 'bg-[#FAF7F2] text-[#8C7B6E]'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>

                    {/* 内容 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className={`text-sm font-medium ${!n.is_read ? 'text-[#3D322D]' : 'text-[#8C7B6E]'}`}>
                          {n.title}
                        </h3>
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${config.color}`}>
                          {config.label}
                        </span>
                        {!n.is_read && (
                          <span className="px-1.5 py-0.5 bg-[#C47353] text-white text-xs rounded-full">
                            新
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-[#8C7B6E] line-clamp-2 mb-1.5">
                        {n.content}
                      </p>
                      <div className="flex items-center gap-1.5 text-xs text-[#8C7B6E]/60">
                        <Clock className="w-3 h-3" />
                        {formatTime(n.created_at)}
                        {n.data?.orderNo && (
                          <>
                            <span className="mx-1">·</span>
                            <span className="font-mono">#{n.data.orderNo.slice(-8)}</span>
                          </>
                        )}
                        <ChevronRight className="w-3 h-3 ml-auto" />
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}

            {/* 加载更多 */}
            {hasMore && (
              <button
                onClick={() => {
                  const next = page + 1;
                  setPage(next);
                  loadNotifications(next, true);
                }}
                className="w-full py-3 bg-white rounded-xl text-[#C47353] font-medium hover:bg-[#FAF7F2] transition-colors text-sm"
              >
                加载更多
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
