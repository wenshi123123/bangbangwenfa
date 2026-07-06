'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminApiRequest } from '@/lib/api/request';

interface Config {
  id: number;
  config_key: string;
  config_value: string;
  config_type: string;
  config_group: string;
  description: string;
  is_public: boolean;
}

export default function ConfigsPage() {
  const [configs, setConfigs] = useState<Config[]>([]);
  const [groupedConfigs, setGroupedConfigs] = useState<Record<string, Config[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [source, setSource] = useState<'db' | 'fallback'>('db');
  const [note, setNote] = useState('');

  const fetchConfigs = useCallback(async () => {
    try {
      const response = await adminApiRequest('/api/admin/configs');
      const result = await response.json();
      if (result.success) {
        setConfigs(result.data.configs);
        setGroupedConfigs(result.data.groupedConfigs);
        setSource(result.data.source === 'fallback' ? 'fallback' : 'db');
        setNote(result.data.note || '');
        // 初始化编辑值
        const values: Record<string, string> = {};
        result.data.configs.forEach((c: Config) => {
          try {
            values[c.config_key] = JSON.parse(c.config_value);
          } catch {
            values[c.config_key] = c.config_value;
          }
        });
        setEditValues(values);
      }
    } catch (error) {
      console.error('Fetch configs error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = Object.entries(editValues).map(([key, value]) => ({
        key,
        value: typeof value === 'string' ? value : JSON.stringify(value)
      }));

      const response = await adminApiRequest('/api/admin/configs', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ configs: updates })
      });
      const result = await response.json();
      if (result.success) {
        alert('保存成功');
        fetchConfigs();
      } else {
        alert(result.error || '保存失败');
      }
    } catch {
      alert('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const groupLabels: Record<string, string> = {
    basic: '基本信息',
    contact: '联系方式',
    order: '订单设置',
    payment: '支付设置',
    notification: '通知设置',
    other: '其他设置',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-[#C47353] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-800">系统配置</h2>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 rounded-xl bg-[#C47353] text-white font-medium hover:bg-[#A85D40] disabled:opacity-50 transition-colors"
        >
          {saving ? '保存中...' : source === 'fallback' ? '初始化并保存' : '保存配置'}
        </button>
      </div>

      {source === 'fallback' && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {note || '系统配置表尚未就绪，当前显示默认配置。保存时会先尝试初始化并写入数据库。'}
        </div>
      )}

      {/* Config Groups */}
      {Object.entries(groupedConfigs).map(([group, items]) => (
        <div key={group} className="bg-white rounded-xl p-6 border border-gray-100 shadow-[0_2px_8px_rgba(61,50,45,0.06)]">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            {groupLabels[group] || group}
          </h3>
          <div className="space-y-4">
            {items.map((config) => (
              <div key={config.id}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {config.description || config.config_key}
                  {config.is_public && (
                    <span className="ml-2 px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700">公开</span>
                  )}
                </label>
                {config.config_type === 'boolean' ? (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editValues[config.config_key] === 'true'}
                      onChange={(e) => setEditValues({
                        ...editValues,
                        [config.config_key]: e.target.checked ? 'true' : 'false'
                      })}
                      className="w-5 h-5 rounded border-gray-300 text-orange-500 focus:ring-[#C47353]/20"
                    />
                    <span className="text-sm text-gray-600">
                      {editValues[config.config_key] === 'true' ? '已启用' : '已禁用'}
                    </span>
                  </label>
                ) : config.config_type === 'number' ? (
                  <input
                    type="number"
                    value={editValues[config.config_key] || ''}
                    onChange={(e) => setEditValues({
                      ...editValues,
                      [config.config_key]: e.target.value
                    })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-[#C47353] outline-none"
                  />
                ) : (
                  <input
                    type="text"
                    value={editValues[config.config_key] || ''}
                    onChange={(e) => setEditValues({
                      ...editValues,
                      [config.config_key]: e.target.value
                    })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-[#C47353] outline-none"
                  />
                )}
                <div className="text-xs text-gray-400 mt-1">配置键：{config.config_key}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
