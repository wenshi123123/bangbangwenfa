'use client';

import { useState, useEffect, useCallback } from 'react';
import { Save, Loader2, AlertCircle } from 'lucide-react';
import { adminApiRequest } from '@/lib/api/request';

interface PriceConfig {
  id: number | string;
  category: string;
  plan_id: string;
  plan_name: string;
  price: number;
  updated_at: string;
}

const CATEGORY_MAP: Record<string, string> = {
  criminal: '刑事案件',
  civil: '民事案件',
  lawyer: '律师入驻',
};

export default function PriceManagementPage() {
  const [prices, setPrices] = useState<PriceConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editValues, setEditValues] = useState<Record<number | string, string>>({});

  const fetchPrices = useCallback(async () => {
    try {
      const response = await adminApiRequest('/api/admin/price');
      const result = await response.json();
      
      if (result.success) {
        setPrices(result.data);
        // 初始化编辑值
        const initialValues: Record<number, string> = {};
        result.data.forEach((p: PriceConfig) => {
          initialValues[p.id] = (p.price / 100).toString();
        });
        setEditValues(initialValues);
      } else {
        setMessage({ type: 'error', text: result.error || '获取价格配置失败' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: '获取价格配置失败，请刷新页面' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

  const handlePriceChange = (id: number | string, value: string) => {
    setEditValues(prev => ({ ...prev, [id]: value }));
  };

  const handleSave = async (id: number | string) => {
    const newPrice = parseFloat(editValues[id]);
    
    if (isNaN(newPrice) || newPrice < 0) {
      setMessage({ type: 'error', text: '请输入有效的价格' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    setSaving(id);
    setMessage(null);

    try {
      const response = await adminApiRequest('/api/admin/price', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          price: Math.round(newPrice * 100), // 转换为分
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setMessage({ type: 'success', text: '价格更新成功' });
        // 更新本地数据
        setPrices(prev => prev.map(p => 
          p.id === id ? { ...p, price: Math.round(newPrice * 100) } : p
        ));
      } else {
        setMessage({ type: 'error', text: result.error || '更新失败' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: '更新失败，请重试' });
    } finally {
      setSaving(null);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">价格配置</h1>
        <p className="text-sm text-muted-foreground mt-1">管理系统各服务项目的价格设置</p>
      </div>

      {/* Error Message */}
      {message?.type === 'error' && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{message.text}</span>
          <button 
            onClick={() => window.location.href = '/admin/login'}
            className="ml-auto text-sm underline hover:no-underline"
          >
            去登录
          </button>
        </div>
      )}

      {/* Success Message */}
      {message?.type === 'success' && (
        <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-xl text-green-600">
          <span>{message.text}</span>
        </div>
      )}

      {/* Price List */}
      {prices.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
          <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-border">
            <h2 className="font-semibold text-foreground">服务项目价格</h2>
            <p className="text-xs text-muted-foreground mt-1">价格单位：元</p>
          </div>
          
          <div className="divide-y divide-border">
            {prices.map((item) => (
              <div key={item.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">
                      {CATEGORY_MAP[item.category] || item.category}
                    </span>
                    <span className="text-sm font-medium text-foreground truncate">
                      {item.plan_name}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">ID: {item.id}</p>
                </div>

                {/* Input + Save */}
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">¥</span>
                    <input
                      type="number"
                      value={editValues[item.id] || ''}
                      onChange={(e) => handlePriceChange(item.id, e.target.value)}
                      className="w-24 sm:w-28 pl-7 pr-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                    />
                  </div>
                  <span className="text-sm text-muted-foreground hidden sm:inline">元</span>
                  <button
                    onClick={() => handleSave(item.id)}
                    disabled={saving === item.id}
                    className="px-3 sm:px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    {saving === item.id ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        保存中
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        保存
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {prices.length === 0 && !message && (
        <div className="text-center py-12 text-muted-foreground">
          暂无可配置的价格项
        </div>
      )}
    </div>
  );
}
