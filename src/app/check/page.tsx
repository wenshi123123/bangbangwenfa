'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Search, Copy, Check, AlertCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { apiRequest } from '@/lib/api/request';

interface OrderData {
  id: number;
  contact_name: string;
  contact_phone: string;
  contact_wechat: string;
  case_type: string;
  case_title: string;
  case_description: string;
  service_type: string;
  service_price: number;
  payment_status: string;
  lawyer_response?: string;
  lawyer_wechat?: string;
  lawyer_name?: string;
  responded_at?: string;
  created_at: string;
  paid_at?: string;
}

const caseTypeLabels: Record<string, string> = {
  theft: '盗窃罪',
  fraud: '诈骗罪',
  assault: '故意伤害罪',
  drug: '毒品类犯罪',
  economic: '经济犯罪',
  traffic: '交通肇事',
  domestic: '家庭暴力/虐待',
  other: '其他'
};

const serviceTypeLabels: Record<string, string> = {
  basic: '基础咨询',
  standard: '标准方案',
  advanced: '深度服务'
};

function CheckContent() {
  const searchParams = useSearchParams();
  const initialOrderId = searchParams.get('orderId');
  
  const [orderId, setOrderId] = useState(initialOrderId || '');
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!orderId.trim()) {
      setError('请输入订单号');
      return;
    }
    
    setLoading(true);
    setError('');
    setOrder(null);
    
    try {
      const response = await apiRequest(`/api/consult/order?orderId=${orderId}`);
      const data = await response.json();
      
      if (data.success) {
        setOrder(data.order);
      } else {
        setError(data.error || '订单不存在');
      }
    } catch (err) {
      setError('查询失败，请重试');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (initialOrderId) {
      handleSearch();
    }
  }, [initialOrderId, handleSearch]);

  const copyWechat = () => {
    if (order?.lawyer_wechat) {
      navigator.clipboard.writeText(order.lawyer_wechat);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-warm">
      {/* Header */}
      <header className="bg-white/50 backdrop-blur-xl border-b border-black/5 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-lg sm:text-xl font-bold text-foreground">查询咨询订单</h1>
            <Link href="/">
              <Button variant="ghost" size="sm" className="rounded-xl">
                <span className="hidden sm:inline">返回首页</span>
                <span className="sm:hidden text-xs">首页</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 sm:py-8 md:py-12">
        <div className="max-w-2xl mx-auto">
          {/* 搜索框 */}
          <Card className="mb-6">
            <CardContent className="pt-4 sm:pt-6">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="orderId" className="text-sm sm:text-base">订单号</Label>
                  <Input 
                    id="orderId"
                    placeholder="请输入订单号"
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="h-11 sm:h-10 text-base"
                  />
                </div>
                <div className="flex items-end">
                  <Button 
                    onClick={handleSearch} 
                    disabled={loading}
                    className="w-full sm:w-auto h-11 sm:h-10 px-6"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Search className="h-4 w-4 sm:mr-1" />
                        <span className="sm:hidden">查询订单</span>
                        <span className="hidden sm:inline">查询</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 错误提示 */}
          {error && (
            <Card className="mb-6 border-red-200 bg-red-50/50">
              <CardContent className="pt-4 sm:pt-6">
                <div className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                  <span className="text-sm sm:text-base">{error}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 订单详情 */}
          {order && (
            <div className="space-y-4 sm:space-y-6">
              {/* 基本信息 */}
              <Card>
                <CardHeader className="pb-3 sm:pb-4">
                  <CardTitle className="text-base sm:text-lg">订单信息</CardTitle>
                  <CardDescription className="text-xs sm:text-sm break-all">订单号：{order.id}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                    <div className="col-span-2 sm:col-span-1">
                      <span className="text-muted-foreground block">咨询人</span>
                      <p className="font-medium text-sm sm:text-base">{order.contact_name}</p>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <span className="text-muted-foreground block">联系电话</span>
                      <p className="font-medium text-sm sm:text-base">{order.contact_phone || '-'}</p>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <span className="text-muted-foreground block">案件类型</span>
                      <p className="font-medium text-sm sm:text-base">{caseTypeLabels[order.case_type] || order.case_type || '-'}</p>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <span className="text-muted-foreground block">服务类型</span>
                      <p className="font-medium text-sm sm:text-base">{serviceTypeLabels[order.service_type]}</p>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <span className="text-muted-foreground block">订单状态</span>
                      <p className={`font-medium text-sm sm:text-base ${
                        order.payment_status === 'paid' ? 'text-green-600' : 
                        order.payment_status === 'pending' ? 'text-yellow-600' : 'text-gray-600'
                      }`}>
                        {order.payment_status === 'paid' ? '已支付' : 
                         order.payment_status === 'pending' ? '待支付' : order.payment_status}
                      </p>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <span className="text-muted-foreground block">支付金额</span>
                      <p className="font-medium text-primary text-base sm:text-lg">¥{((order.service_price || 0) / 100).toFixed(2)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 咨询内容 */}
              <Card>
                <CardHeader className="pb-3 sm:pb-4">
                  <CardTitle className="text-base sm:text-lg">咨询内容</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4">
                  <div>
                    <span className="text-muted-foreground text-xs sm:text-sm block mb-1">咨询主题</span>
                    <p className="font-medium text-sm sm:text-base">{order.case_title}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs sm:text-sm block mb-1">详细描述</span>
                    <p className="whitespace-pre-wrap text-xs sm:text-sm text-muted-foreground leading-relaxed">{order.case_description}</p>
                  </div>
                </CardContent>
              </Card>

              {/* 律师回复 */}
              {order.lawyer_response && (
                <Card className="border-green-200 bg-green-50/30">
                  <CardHeader className="pb-3 sm:pb-4">
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500"></span>
                      律师回复
                    </CardTitle>
                    {order.responded_at && (
                      <CardDescription className="text-xs">
                        回复时间：{new Date(order.responded_at).toLocaleString('zh-CN')}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap text-sm sm:text-base leading-relaxed">{order.lawyer_response}</p>
                  </CardContent>
                </Card>
              )}

              {/* 律师微信 */}
              {order.lawyer_wechat && (
                <Card className="border-orange-200 bg-orange-50/30">
                  <CardHeader className="pb-3 sm:pb-4">
                    <CardTitle className="text-base sm:text-lg">律师联系方式</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 sm:space-y-4">
                    {order.lawyer_name && (
                      <div>
                        <span className="text-muted-foreground text-xs sm:text-sm block mb-1">律师姓名</span>
                        <p className="font-medium text-sm sm:text-base">{order.lawyer_name}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-muted-foreground text-xs sm:text-sm block mb-1">微信号</span>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm sm:text-base font-mono">{order.lawyer_wechat}</p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={copyWechat}
                          className="h-8 px-2 sm:px-3 rounded-lg"
                        >
                          {copied ? (
                            <Check className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
                          ) : (
                            <Copy className="h-3 w-3 sm:h-4 sm:w-4" />
                          )}
                          <span className="ml-1 hidden sm:inline">{copied ? '已复制' : '复制'}</span>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 操作按钮 */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Link href="/" className="flex-1">
                  <Button variant="outline" className="w-full h-11 sm:h-12 rounded-xl text-sm sm:text-base">
                    返回首页
                  </Button>
                </Link>
                {order.payment_status === 'pending' && (
                  <Link href={`/pay?orderId=${order.id}`} className="flex-1">
                    <Button className="w-full h-11 sm:h-12 rounded-xl text-sm sm:text-base">
                      立即支付
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CheckPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-warm flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    }>
      <CheckContent />
    </Suspense>
  );
}
