'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, Shield, Briefcase, Settings, ChevronRight, LogOut, QrCode, X, ShoppingCart, Clock, CheckCircle, AlertCircle, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/use-auth';
import { apiRequest } from '@/lib/api/request';

interface Order {
  id: number;
  orderNo: string;
  type: 'consult' | 'lawyer';  // 订单类型：咨询订单 或 律师入驻订单
  caseTitle: string;
  caseType: string;
  serviceType: string;
  servicePrice: number;
  paymentStatus: string;
  reviewStatus?: string;  // 仅律师入驻订单有
  createdAt: string;
  paidAt: string | null;
}

export default function UserCenterPage() {
  const { user, isLoggedIn, isLoading, logout, updateUser } = useAuth();
  const router = useRouter();
  const [fallbackUser] = useState<any>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const userInfo = localStorage.getItem('user_info');
      const guardianUser = localStorage.getItem('guardian_user');
      return userInfo ? JSON.parse(userInfo) : guardianUser ? JSON.parse(guardianUser) : null;
    } catch {
      return null;
    }
  });
  const [showSettings, setShowSettings] = useState(false);
  const [editNickname, setEditNickname] = useState('');
  const [saving, setSaving] = useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  // 订单相关状态
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [showOrderDetail, setShowOrderDetail] = useState<Order | null>(null);

  const effectiveUser = user || fallbackUser;
  const effectiveLoggedIn = isLoggedIn || !!fallbackUser;

  // 加载用户订单（apiRequest 自动携带 Authorization token 进行鉴权）
  const loadOrders = useCallback(async () => {
    if (!effectiveUser?.id) return;
    
    setOrdersLoading(true);
    try {
      // 🔧 userId 由服务端从 token 提取，无需传参；传 userId 已被服务端忽略仅作记录
      const response = await apiRequest(`/api/user/orders?userId=${effectiveUser.id}`);
      const result = await response.json();
      if (result.success) {
        setOrders(result.data || []);
      } else {
        setOrders([]);
      }
    } catch (error) {
      console.error('加载订单失败:', error);
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  }, [effectiveUser?.id]);

  // 加载未读通知数
  const loadUnreadCount = useCallback(async () => {
    try {
      const res = await apiRequest('/api/user/notifications?unreadOnly=true&limit=1');
      const result = await res.json();
      if (result.success) {
        setUnreadNotificationCount(result.unreadCount || 0);
      }
    } catch (err) {
      // 忽略错误，通知入口仍可点击
    }
  }, []);

  useEffect(() => {
    if (effectiveUser?.id && effectiveLoggedIn) {
      loadOrders();
      loadUnreadCount();
    }
  }, [effectiveUser?.id, effectiveLoggedIn, loadOrders, loadUnreadCount]);

  useEffect(() => {
    if (!effectiveLoggedIn) {
      window.dispatchEvent(new CustomEvent('open-login-modal'));
    }
  }, [effectiveLoggedIn]);

  if (!effectiveLoggedIn) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center p-4">
        <Card className="max-w-sm shadow-[0_4px_16px_rgba(61,50,45,0.08)] rounded-xl">
          <CardContent className="pt-6 text-center">
            <h2 className="text-xl font-serif text-[#3D322D] font-normal mb-4">请先登录</h2>
            <p className="text-[#8C7B6E] mb-4">登录后可查看您的个人中心</p>
            <Button onClick={() => window.dispatchEvent(new CustomEvent('open-login-modal'))} className="bg-[#C47353] hover:bg-[#A85D40] text-white rounded-full">
              手机号登录
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      {/* 用户信息卡片 */}
      <div className="bg-[#C47353] text-white py-8 px-4">
        <div className="container mx-auto">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-2xl">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="w-full h-full rounded-full" />
              ) : (
                <User className="w-8 h-8 text-white" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold">{effectiveUser?.nickname || '用户'}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                {effectiveUser?.isLawyer ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#C47353]/20 text-white/80 rounded text-xs">
                    认证律师
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/20 text-white/80 rounded text-xs">
                    注册用户
                  </span>
                )}
                {effectiveUser?.isGuardian && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-500/20 text-purple-200 rounded text-xs">
                    守护者
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 功能菜单 */}
      <div className="container mx-auto px-4 py-6">
        {/* 身份入口 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6">
          {/* 守护者入口 */}
          <Link href="/guardian/center">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-purple-100">
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                    <Shield className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">守护者中心</p>
                    <p className="text-xs text-gray-500">推广赚分成</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* 律师后台入口 - 仅律师可见 */}
          {effectiveUser?.isLawyer && (
            <Link href="/lawyer/dashboard">
              <Card className="hover:shadow-[0_8px_24px_rgba(61,50,45,0.06)] transition-shadow cursor-pointer border border-[rgba(196,115,83,0.2)]">
                <CardContent className="py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-[#FAF7F2] flex items-center justify-center border border-[rgba(196,115,83,0.2)]">
                      <Briefcase className="w-6 h-6 text-[#C47353]" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">律师后台</p>
                      <p className="text-xs text-gray-500">管理订单</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )}
        </div>

        {/* 消息通知入口 */}
        <div className="bg-white rounded-xl shadow-[0_4px_16px_rgba(61,50,45,0.08)] overflow-hidden mb-4">
          <Link href="/user/notifications" className="w-full flex items-center justify-between px-4 py-4 hover:bg-gray-50 transition-colors text-left">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Bell className="w-5 h-5 text-[#C47353]" />
                {unreadNotificationCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                    {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                  </span>
                )}
              </div>
              <span className="text-gray-700">消息通知</span>
            </div>
            <div className="flex items-center gap-2">
              {unreadNotificationCount > 0 && (
                <span className="text-xs text-[#C47353] bg-[#C47353]/10 px-2 py-0.5 rounded-full">
                  {unreadNotificationCount} 条未读
                </span>
              )}
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          </Link>
        </div>

        {/* 我的订单 */}
        <div className="bg-white rounded-xl shadow-[0_4px_16px_rgba(61,50,45,0.08)] overflow-hidden">
          <div className="px-4 py-3 border-b border-[rgba(196,115,83,0.15)] flex items-center justify-between">
            <h3 className="font-serif text-[#3D322D] font-normal">我的订单</h3>
            <span className="text-sm text-[#8C7B6E]">{orders.length} 笔</span>
          </div>
          
          {ordersLoading ? (
            <div className="p-8 text-center text-[#8C7B6E]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C47353] mx-auto mb-2"></div>
              <p className="text-sm">加载中...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="p-8 text-center">
              <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 mb-3">暂无订单</p>
              <Link href="/">
                <Button variant="outline" size="sm">立即咨询</Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y max-h-96 overflow-y-auto">
              {orders.map((order) => {
                // 咨询订单状态
                const consultStatusMap: Record<string, { label: string; color: string; icon: any }> = {
                  pending: { label: '待支付', color: 'bg-amber-100 text-amber-700', icon: Clock },
                  paid: { label: '已支付', color: 'bg-green-100 text-green-700', icon: CheckCircle },
                  refunded: { label: '已退款', color: 'bg-gray-100 text-gray-700', icon: AlertCircle },
                };
                // 律师入驻订单状态
                const lawyerStatusMap: Record<string, { label: string; color: string; icon: any }> = {
                  pending: { label: '待支付', color: 'bg-amber-100 text-amber-700', icon: Clock },
                  paid: { label: '已支付', color: 'bg-green-100 text-green-700', icon: CheckCircle },
                  approved: { label: '已通过', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
                  rejected: { label: '已拒绝', color: 'bg-red-100 text-red-700', icon: AlertCircle },
                  refunded: { label: '已退款', color: 'bg-gray-100 text-gray-700', icon: AlertCircle },
                };
                
                const statusMap = order.type === 'lawyer' ? lawyerStatusMap : consultStatusMap;
                const statusKey = order.type === 'lawyer' && order.reviewStatus ? order.reviewStatus : order.paymentStatus;
                const status = statusMap[statusKey] || statusMap.pending;
                const StatusIcon = status.icon;
                
                return (
                  <button
                    key={`${order.type}-${order.id}`}
                    onClick={() => setShowOrderDetail(order)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900 truncate">{order.caseTitle || '未命名咨询'}</p>
                        {order.type === 'lawyer' && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-[#FAF7F2] text-[#C47353]">
                            律师入驻
                          </span>
                        )}
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs ${status.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {status.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {order.orderNo?.slice(-8)} · {new Date(order.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="font-semibold text-gray-900">¥{(order.servicePrice / 100).toFixed(2)}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 设置 */}
        <div className="bg-white rounded-xl shadow-[0_4px_16px_rgba(61,50,45,0.08)] overflow-hidden mt-4">
          <div className="px-4 py-3 border-b border-[rgba(196,115,83,0.15)]">
            <h3 className="font-serif text-[#3D322D] font-normal">设置</h3>
          </div>
          <div className="divide-y">
            <button 
              onClick={() => {
                setEditNickname(user?.nickname || '');
                setShowSettings(true);
              }}
              className="w-full flex items-center justify-between px-4 py-4 hover:bg-gray-50 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5 text-gray-400" />
                <span className="text-gray-700">账号设置</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
            <button 
              onClick={logout}
              className="w-full flex items-center justify-between px-4 py-4 hover:bg-gray-50 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <LogOut className="w-5 h-5 text-red-500" />
                <span className="text-red-500">退出登录</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* 版权信息 */}
        <div className="text-center mt-6">
          <p className="text-xs text-gray-400">帮帮问法 v1.0.0</p>
        </div>
      </div>

      {/* 账号设置弹窗 */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              账号设置
            </DialogTitle>
            <button 
              onClick={() => setShowSettings(false)}
              className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100"
            >
              <X className="w-4 h-4" />
            </button>
          </DialogHeader>
          <DialogDescription asChild>
            <div className="space-y-4 pt-2">
              {/* 用户ID */}
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">用户ID</p>
                <p className="text-sm font-mono text-gray-700">#{user?.id}</p>
              </div>
              
              {/* 昵称编辑 */}
              <div>
                <label className="text-sm text-gray-600 mb-2 block">昵称</label>
                <input
                  type="text"
                  value={editNickname}
                  onChange={(e) => setEditNickname(e.target.value)}
                  placeholder="请输入昵称"
                  className="w-full px-4 py-3 border border-[#E5DDD5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C47353]/20 focus:border-[#C47353]"
                  maxLength={20}
                />
                <p className="text-xs text-[#8C7B6E] mt-1">{editNickname.length}/20</p>
              </div>

              {/* 邀请码 */}
              {user?.inviteCode && (
                <div className="bg-purple-50 rounded-lg p-3">
                  <p className="text-xs text-purple-600 mb-1">我的邀请码</p>
                  <p className="text-sm font-mono font-bold text-purple-700">{user.inviteCode}</p>
                  <p className="text-xs text-purple-500 mt-1">好友下单可获得分成奖励</p>
                </div>
              )}

              {/* 保存按钮 */}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowSettings(false)}
                >
                  取消
                </Button>
                <Button
                  className="flex-1 bg-[#C47353] hover:bg-[#A85D40] text-white rounded-full"
                  disabled={saving || editNickname === user?.nickname}
                  onClick={async () => {
                    if (!editNickname.trim()) return;
                    setSaving(true);
                    try {
                      await updateUser({ nickname: editNickname.trim() });
                      setShowSettings(false);
                    } catch (error) {
                      console.error('更新失败:', error);
                    } finally {
                      setSaving(false);
                    }
                  }}
                >
                  {saving ? '保存中...' : '保存'}
                </Button>
              </div>
            </div>
          </DialogDescription>
        </DialogContent>
      </Dialog>

      {/* 订单详情弹窗 */}
      <Dialog open={!!showOrderDetail} onOpenChange={() => setShowOrderDetail(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              订单详情
            </DialogTitle>
            <button 
              onClick={() => setShowOrderDetail(null)}
              className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100"
            >
              <X className="w-4 h-4" />
            </button>
          </DialogHeader>
          {showOrderDetail && (
            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-500">订单号</span>
                <span className="font-mono text-sm">{showOrderDetail.orderNo?.slice(-12)}</span>
              </div>
              {/* 律师入驻订单显示审核状态 */}
              {showOrderDetail.type === 'lawyer' && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">入驻状态</span>
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    showOrderDetail.reviewStatus === 'approved' ? 'bg-blue-100 text-blue-700' :
                    showOrderDetail.reviewStatus === 'rejected' ? 'bg-red-100 text-red-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {showOrderDetail.reviewStatus === 'approved' ? '已通过' :
                     showOrderDetail.reviewStatus === 'rejected' ? '已拒绝' : '审核中'}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-gray-500">订单类型</span>
                <span>
                  {showOrderDetail.type === 'lawyer' ? '律师入驻' : '法律咨询'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">{showOrderDetail.type === 'lawyer' ? '入驻套餐' : '服务类型'}</span>
                <span className="capitalize">
                  {showOrderDetail.type === 'lawyer' 
                    ? (showOrderDetail.serviceType === 'basic' ? '基础版' : 
                       showOrderDetail.serviceType === 'standard' ? '标准版' : '高级版')
                    : showOrderDetail.serviceType}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">订单金额</span>
                <span className="font-bold text-lg">¥{(showOrderDetail.servicePrice / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">支付状态</span>
                <span className={`px-2 py-0.5 rounded text-xs ${
                  showOrderDetail.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' :
                  showOrderDetail.paymentStatus === 'refunded' ? 'bg-gray-100 text-gray-700' :
                  'bg-amber-100 text-amber-700'
                }`}>
                  {showOrderDetail.paymentStatus === 'paid' ? '已支付' :
                   showOrderDetail.paymentStatus === 'refunded' ? '已退款' : '待支付'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">下单时间</span>
                <span className="text-sm">{new Date(showOrderDetail.createdAt).toLocaleString()}</span>
              </div>
              {showOrderDetail.paidAt && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">支付时间</span>
                  <span className="text-sm">{new Date(showOrderDetail.paidAt).toLocaleString()}</span>
                </div>
              )}
              {/* 律师入驻订单审核通过后显示入口 */}
              {showOrderDetail.type === 'lawyer' && showOrderDetail.reviewStatus === 'approved' && (
                <div className="pt-2">
                  <Link href="/lawyer" onClick={() => setShowOrderDetail(null)}>
                    <Button className="w-full bg-green-600 hover:bg-green-700">
                      进入律师工作台
                    </Button>
                  </Link>
                </div>
              )}

              {/* 待支付订单 - 继续支付按钮 */}
              {showOrderDetail.paymentStatus === 'pending' && (
                <div className="pt-2">
                  <Button
                    onClick={() => {
                      setShowOrderDetail(null);
                      router.push(`/pay?orderId=${showOrderDetail.id}`);
                    }}
                    className="w-full bg-[#C47353] hover:bg-[#A85D40] text-white rounded-full"
                  >
                    继续支付 ¥{(showOrderDetail.servicePrice / 100).toFixed(2)}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
