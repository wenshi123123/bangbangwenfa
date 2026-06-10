'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft,
  Bell,
  Loader2,
  CheckCircle,
  MessageSquare,
  Clock,
  ChevronRight,
  Mail,
  MailOpen,
  Filter,
  Package,
  UserCheck,
  Wallet,
  Scale,
  Megaphone
} from 'lucide-react';
import { apiRequest } from '@/lib/api/request';

interface Notification {
  id: number;
  user_id: string;
  type: string;
  title: string;
  content: string;
  related_id: number | null;
  is_read: boolean;
  created_at: string;
}

interface Pagination {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

const typeConfig: Record<string, { label: string; color: string; icon: any }> = {
  order_created: { label: '订单创建', color: 'bg-blue-100 text-blue-700', icon: Package },
  order_paid: { label: '订单支付', color: 'bg-blue-100 text-blue-700', icon: Package },
  lawyer_accepted: { label: '律师接单', color: 'bg-green-100 text-green-700', icon: UserCheck },
  lawyer_response: { label: '律师回复', color: 'bg-green-100 text-green-700', icon: MessageSquare },
  order_completed: { label: '订单完成', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  commission_approved: { label: '分成到账', color: 'bg-amber-100 text-amber-700', icon: Wallet },
  commission_rejected: { label: '分成拒绝', color: 'bg-red-100 text-red-700', icon: Scale },
  withdrawal_processing: { label: '提现处理', color: 'bg-orange-100 text-orange-700', icon: Wallet },
  withdrawal_completed: { label: '提现到账', color: 'bg-green-100 text-green-700', icon: Wallet },
  withdrawal_rejected: { label: '提现拒绝', color: 'bg-red-100 text-red-700', icon: Wallet },
  lawyer_review_passed: { label: '入驻通过', color: 'bg-green-100 text-green-700', icon: UserCheck },
  lawyer_review_failed: { label: '入驻拒绝', color: 'bg-red-100 text-red-700', icon: UserCheck },
  system_notice: { label: '系统公告', color: 'bg-slate-100 text-slate-700', icon: Megaphone },
};

const filterOptions = [
  { value: 'all', label: '全部' },
  { value: 'order', label: '订单' },
  { value: 'commission', label: '分成' },
  { value: 'withdrawal', label: '提现' },
  { value: 'lawyer', label: '律师' },
  { value: 'system', label: '系统' },
];

export default function MessagesPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [markingRead, setMarkingRead] = useState<number | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);

  const fetchNotifications = useCallback(async (uid: string, pageNum: number = 1, filterType?: string) => {
    setLoading(pageNum === 1);
    try {
      let url = `/api/notifications/list?page=${pageNum}`;
      if (filterType && filterType !== 'all') {
        url += `&type=${filterType}`;
      }
      const response = await apiRequest(url);
      const result = await response.json();
      
      if (result.success) {
        if (pageNum === 1) {
          setNotifications(result.data || []);
        } else {
          setNotifications(prev => [...prev, ...(result.data || [])]);
        }
        setPagination(result.pagination);
        setUnreadCount(result.unread_count || 0);
      }
    } catch (error) {
      console.error('获取通知失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const userInfo = localStorage.getItem('user_info');
    const guardianUser = localStorage.getItem('guardian_user');
    const user = userInfo ? JSON.parse(userInfo) : (guardianUser ? JSON.parse(guardianUser) : null);
    
    if (!user?.id) {
      router.push('/');
      return;
    }

    setUserId(user.id);
    fetchNotifications(user.id, 1);
  }, [router, fetchNotifications]);

  // 刷新未读数量
  const refreshUnreadCount = async () => {
    if (!userId) return;
    try {
      const response = await apiRequest('/api/notifications/list?page=1');
      const result = await response.json();
      if (result.success) {
        setUnreadCount(result.unread_count || 0);
      }
    } catch (error) {
      console.error('刷新未读数量失败:', error);
    }
  };

  // 筛选变化时重置并重新获取
  const handleFilterChange = (newFilter: string) => {
    setFilter(newFilter);
    setPage(1);
    setNotifications([]);
    if (userId) {
      fetchNotifications(userId, 1, newFilter);
    }
  };

  const loadMore = () => {
    if (pagination && page < pagination.total_pages && !loading) {
      const nextPage = page + 1;
      setPage(nextPage);
      if (userId) {
        fetchNotifications(userId, nextPage, filter);
      }
    }
  };

  const markAsRead = async (notificationId: number) => {
    if (!userId) return;
    
    setMarkingRead(notificationId);
    try {
      const response = await apiRequest('/api/notifications/read', {
        method: 'POST',
        body: JSON.stringify({ notification_id: notificationId })
      });

      const result = await response.json();
      
      if (result.success) {
        // 更新本地状态
        setNotifications(notifications.map(n => 
          n.id === notificationId ? { ...n, is_read: true } : n
        ));
        // 从API重新获取准确的未读数量
        await refreshUnreadCount();
      }
    } catch (error) {
      console.error('标记已读失败:', error);
    } finally {
      setMarkingRead(null);
    }
  };

  const markAllAsRead = async () => {
    if (!userId) return;
    
    try {
      const response = await apiRequest('/api/notifications/read', {
        method: 'POST',
        body: JSON.stringify({ mark_all: true })
      });

      const result = await response.json();
      
      if (result.success) {
        setNotifications(notifications.map(n => ({ ...n, is_read: true })));
        // 从API重新获取准确的未读数量
        await refreshUnreadCount();
      }
    } catch (error) {
      console.error('标记全部已读失败:', error);
    }
  };

  const formatTime = (time: string) => {
    const date = new Date(time);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`;
    
    return date.toLocaleDateString('zh-CN');
  };

  const getFilteredNotifications = () => {
    if (filter === 'all') return notifications;
    
    const filters: Record<string, string[]> = {
      order: ['order_created', 'order_paid', 'lawyer_accepted', 'lawyer_response', 'order_completed'],
      commission: ['commission_approved', 'commission_rejected'],
      withdrawal: ['withdrawal_processing', 'withdrawal_completed', 'withdrawal_rejected'],
      lawyer: ['lawyer_review_passed', 'lawyer_review_failed'],
      system: ['system_notice'],
    };
    
    return notifications.filter(n => filters[filter]?.includes(n.type));
  };

  const filteredNotifications = getFilteredNotifications();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-rose-500 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 to-white">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-rose-100/50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/user"
                className="p-2 hover:bg-rose-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-rose-600" />
              </Link>
              <div className="flex items-center gap-3">
                <Bell className="w-6 h-6 text-rose-600" />
                <h1 className="text-xl font-serif text-[#3D322D] font-normal">消息通知</h1>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                    {unreadCount}
                  </span>
                )}
              </div>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-sm text-rose-600 hover:text-rose-700 font-medium"
              >
                全部已读
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4">
        {/* 筛选标签 */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
          {filterOptions.map(option => (
            <button
              key={option.value}
              onClick={() => setFilter(option.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                filter === option.value
                  ? 'bg-rose-500 text-white'
                  : 'bg-white text-muted-foreground hover:bg-rose-100'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* 通知列表 */}
        {filteredNotifications.length === 0 ? (
          <div className="bg-white rounded-xl p-12 shadow-[0_4px_16px_rgba(61,50,45,0.08)] text-center">
            <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="w-10 h-10 text-rose-400" />
            </div>
            <h2 className="text-xl font-serif text-[#3D322D] font-normal mb-2">暂无通知</h2>
            <p className="text-[#8C7B6E]">当有重要消息时，会在这里显示</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((notification) => {
              const config = typeConfig[notification.type] || typeConfig.system_notice;
              const IconComponent = config.icon;
              
              return (
                <div 
                  key={notification.id}
                  className={`bg-white rounded-xl p-4 shadow-[0_2px_8px_rgba(61,50,45,0.04)] transition-all ${
                    !notification.is_read ? 'border-l-4 border-l-rose-500' : ''
                  }`}
                  onClick={() => !notification.is_read && markAsRead(notification.id)}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl ${notification.is_read ? 'bg-slate-100' : 'bg-rose-100'}`}>
                      {markingRead === notification.id ? (
                        <Loader2 className="w-6 h-6 text-rose-500 animate-spin" />
                      ) : (
                        <IconComponent className={`w-6 h-6 ${notification.is_read ? 'text-slate-400' : 'text-rose-500'}`} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className={`font-semibold ${!notification.is_read ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {notification.title}
                        </h3>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${config.color}`}>
                          {config.label}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                        {notification.content}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
                        <Clock className="w-3 h-3" />
                        {formatTime(notification.created_at)}
                        {!notification.is_read && (
                          <span className="ml-2 px-1.5 py-0.5 bg-rose-500 text-white text-xs rounded">
                            新
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* 加载更多 */}
            {pagination && page < pagination.total_pages && (
              <button
                onClick={loadMore}
                disabled={loading}
                className="w-full py-3 bg-white rounded-xl text-center text-rose-600 font-medium hover:bg-rose-50 transition-colors"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    加载中...
                  </span>
                ) : (
                  '加载更多'
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
