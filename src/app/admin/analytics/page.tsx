'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft,
  Download,
  FileText,
  Users,
  Receipt,
  TrendingUp,
  Calendar,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { adminApiRequest } from '@/lib/api/request';

const ADMIN_LOGIN_HREF = '/admin/login';

interface ExportType {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  fields: string[];
}

const exportTypes: ExportType[] = [
  {
    id: 'orders',
    label: '订单明细',
    description: '导出所有订单数据，包含订单号、客户信息、服务类型、金额等',
    icon: <Receipt className="w-8 h-8" />,
    fields: ['订单号', '客户姓名', '联系电话', '案件类型', '案件标题', '服务类型', '订单金额', '订单状态', '支付状态', '创建时间']
  },
  {
    id: 'users',
    label: '用户明细',
    description: '导出所有注册用户数据，包含用户ID、昵称、手机号、邀请码等',
    icon: <Users className="w-8 h-8" />,
    fields: ['用户ID', '昵称', '手机号', '邀请码', '创建时间']
  },
  {
    id: 'commissions',
    label: '分成记录',
    description: '导出发放给守护者的分成记录，包含订单、守护者、分成金额、状态等',
    icon: <TrendingUp className="w-8 h-8" />,
    fields: ['订单号', '客户姓名', '守护者', '邀请码', '分成金额', '分成比例', '状态', '创建时间', '处理时间']
  }
];

export default function AdminAnalyticsPage() {
  const [adminInfo, setAdminInfo] = useState<any>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    type: 'orders',
    format: 'json',
    start_date: '',
    end_date: ''
  });

  useEffect(() => {
    const storedAdmin = localStorage.getItem('admin_info');
    if (!storedAdmin) {
      setNeedsLogin(true);
      return;
    }
    try {
      setAdminInfo(JSON.parse(storedAdmin));
    } catch (error) {
      console.error('解析管理员信息失败:', error);
      setNeedsLogin(true);
    }
  }, []);

  const handleExport = async () => {
    if (!adminInfo) return;
    
    setExporting(formData.type);
    
    try {
      const params = new URLSearchParams({
        type: formData.type,
        format: formData.format
      });
      
      if (formData.start_date) params.append('start_date', formData.start_date);
      if (formData.end_date) params.append('end_date', formData.end_date);

      const response = await adminApiRequest(`/api/admin/analytics/export?${params}`);

      if (formData.format === 'csv') {
        // CSV下载
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${formData.type}_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        // JSON预览
        const data = await response.json();
        if (data.success) {
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${formData.type}_${new Date().toISOString().split('T')[0]}.json`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        } else {
          alert(data.error || '导出失败');
        }
      }
    } catch (error) {
      console.error('导出失败:', error);
      alert('导出失败，请重试');
    } finally {
      setExporting(null);
    }
  };

  return (
    <>
      {needsLogin ? (
        <div className="min-h-[60vh] flex items-center justify-center bg-slate-50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-[0_12px_40px_rgba(15,23,42,0.08)] text-center">
            <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-green-50 flex items-center justify-center">
              <FileText className="w-7 h-7 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">管理员登录</h1>
            <p className="mt-2 text-sm text-slate-500">请先登录管理员账号后再访问数据导出中心</p>
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
          <FileText className="w-6 h-6 text-slate-600" />
          <div>
            <h1 className="text-xl font-bold text-slate-800">数据导出中心</h1>
            <p className="text-sm text-slate-500">按类型导出平台数据</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl">
        {/* 导出类型选择 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="w-5 h-5" />
              选择导出类型
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {exportTypes.map(type => (
                <button
                  key={type.id}
                  onClick={() => setFormData({ ...formData, type: type.id })}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    formData.type === type.id
                      ? 'border-rose-500 bg-rose-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className={`mb-3 ${
                    formData.type === type.id ? 'text-rose-500' : 'text-slate-400'
                  }`}>
                    {type.icon}
                  </div>
                  <h3 className={`font-semibold mb-1 ${
                    formData.type === type.id ? 'text-rose-700' : 'text-slate-800'
                  }`}>
                    {type.label}
                  </h3>
                  <p className="text-sm text-slate-500">{type.description}</p>
                </button>
              ))}
            </div>

            {/* 导出字段预览 */}
            <div className="bg-slate-50 rounded-xl p-4 mb-6">
              <p className="text-sm font-medium text-slate-700 mb-2">导出字段：</p>
              <div className="flex flex-wrap gap-2">
                {exportTypes.find(t => t.id === formData.type)?.fields.map((field, idx) => (
                  <span 
                    key={idx}
                    className="px-2 py-1 bg-white rounded-md text-xs text-slate-600 border border-slate-200"
                  >
                    {field}
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 导出设置 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              导出设置
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 日期范围 */}
            <div>
              <label className="block text-sm font-medium text-slate-800 mb-2">
                日期范围（可选）
              </label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
                <div className="flex-1">
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-rose-500 transition-colors"
                  />
                  <p className="text-xs text-slate-400 mt-1">开始日期</p>
                </div>
                <span className="text-slate-400 text-center sm:mt-6">至</span>
                <div className="flex-1">
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-rose-500 transition-colors"
                  />
                  <p className="text-xs text-slate-400 mt-1">结束日期</p>
                </div>
              </div>
            </div>

            {/* 导出格式 */}
            <div>
              <label className="block text-sm font-medium text-slate-800 mb-2">
                导出格式
              </label>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <button
                  onClick={() => setFormData({ ...formData, format: 'json' })}
                  className={`flex-1 p-4 rounded-xl border-2 text-left sm:text-center transition-all ${
                    formData.format === 'json'
                      ? 'border-rose-500 bg-rose-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="font-medium text-slate-800">JSON</div>
                  <p className="text-xs text-slate-500 mt-1">适合程序处理和分析</p>
                </button>
                <button
                  onClick={() => setFormData({ ...formData, format: 'csv' })}
                  className={`flex-1 p-4 rounded-xl border-2 text-left sm:text-center transition-all ${
                    formData.format === 'csv'
                      ? 'border-rose-500 bg-rose-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="font-medium text-slate-800">CSV</div>
                  <p className="text-xs text-slate-500 mt-1">适合 Excel 打开和编辑</p>
                </button>
              </div>
            </div>

            {/* 导出按钮 */}
            <Button
              onClick={handleExport}
              disabled={exporting !== null}
              className="w-full bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 py-6 text-lg font-semibold rounded-xl mt-4"
            >
              {exporting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  导出中...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Download className="w-5 h-5" />
                  确认导出 {exportTypes.find(t => t.id === formData.type)?.label}
                </span>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* 提示信息 */}
        <Card className="bg-slate-50 border-slate-200">
          <CardContent className="p-4">
            <h4 className="font-medium text-slate-700 mb-2">导出说明：</h4>
            <ul className="text-sm text-slate-600 space-y-1">
              <li>• 默认导出全部数据，可选择日期范围筛选</li>
              <li>• JSON 格式适合程序处理和数据备份</li>
              <li>• CSV 格式可用 Excel 直接打开，便于编辑和分析</li>
              <li>• 大数据量导出可能需要等待片刻，请耐心等待</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
      )}
    </>
  );
}
