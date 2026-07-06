import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';
import { requireAdminAuth, adminUnauthorizedResponse } from '@/lib/auth/admin-middleware';
import {
  buildSystemConfigFallbackRows,
  groupSystemConfigs,
  SYSTEM_CONFIGS_BOOTSTRAP_SQL,
  isMissingSystemConfigsTableError,
} from '@/lib/admin/system-configs';

async function ensureSystemConfigsTable(supabase: ReturnType<typeof getSupabaseAdmin>) {
  try {
    const { error } = await supabase.rpc('exec_sql', {
      query: SYSTEM_CONFIGS_BOOTSTRAP_SQL,
    });
    if (error) {
      console.error('[admin/configs] 自动初始化 system_configs 失败:', error);
      return false;
    }

    try {
      await supabase.rpc('pg_notify', {
        channel: 'pgrst',
        message: 'reload schema',
      });
    } catch (notifyError) {
      console.warn('[admin/configs] schema reload 通知失败（可忽略）:', notifyError);
    }

    return true;
  } catch (error) {
    console.error('[admin/configs] 自动初始化 system_configs 异常:', error);
    return false;
  }
}

// GET - 获取所有配置
export async function GET(request: NextRequest) {
  const authResult = await requireAdminAuth(request);
  if (!authResult.success) {
    return adminUnauthorizedResponse(authResult.error);
  }
  try {
    const supabase = getSupabaseAdmin();
    let { data, error } = await supabase
      .from('system_configs')
      .select('*')
      .order('config_group', { ascending: true })
      .order('config_key', { ascending: true });

    if (error && isMissingSystemConfigsTableError(error)) {
      const fallbackConfigs = buildSystemConfigFallbackRows();
      return NextResponse.json({
        success: true,
        data: {
          configs: fallbackConfigs,
          groupedConfigs: groupSystemConfigs(fallbackConfigs),
          source: 'fallback',
          note: '系统配置表尚未就绪，当前展示默认配置；保存时仍需先完成数据库迁移',
        },
      });
    }
    
    if (error) {
      const status = isMissingSystemConfigsTableError(error) ? 503 : 500;
      return NextResponse.json({ success: false, error: error.message }, { status });
    }
    
    // 按分类分组
    const configs = data || [];
    const groupedConfigs: Record<string, typeof configs> = {};
    configs.forEach((config: { config_group: string; [key: string]: unknown }) => {
      if (!groupedConfigs[config.config_group]) {
        groupedConfigs[config.config_group] = [];
      }
      groupedConfigs[config.config_group].push(config);
    });
    
    return NextResponse.json({ success: true, data: { configs, groupedConfigs } });
  } catch (error) {
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}

// PUT - 更新配置（支持批量）
export async function PUT(request: NextRequest) {
  const authResult = await requireAdminAuth(request);
  if (!authResult.success) {
    return adminUnauthorizedResponse(authResult.error);
  }
  
  try {
    const body = await request.json();
    const { configs, key, value } = body;
    
    const supabase = getSupabaseAdmin();
    const tableProbe = await supabase
      .from('system_configs')
      .select('id')
      .limit(1);

    if (tableProbe.error && isMissingSystemConfigsTableError(tableProbe.error)) {
      const maybeInitialized = await ensureSystemConfigsTable(supabase);
      if (!maybeInitialized) {
        return NextResponse.json({
          success: false,
          error: '系统配置表未就绪，请先执行数据库迁移',
        }, { status: 503 });
      }
    }
    
    // 批量更新
    if (configs && Array.isArray(configs)) {
      const now = new Date().toISOString();
      const results = [];
      const errors = [];
      
      for (const cfg of configs) {
        if (!cfg.key) continue;
        const { data, error } = await supabase
          .from('system_configs')
          .update({ config_value: cfg.value, updated_at: now })
          .eq('config_key', cfg.key)
          .select()
          .single();
        
        if (error) {
          errors.push({ key: cfg.key, error: error.message });
        } else {
          results.push(data);
        }
      }
      
      if (errors.length > 0) {
        return NextResponse.json({ 
          success: false, 
          error: '部分配置保存失败', 
          details: errors 
        }, { status: 500 });
      }
      
      return NextResponse.json({ success: true, data: results });
    }
    
    // 单条更新（向后兼容）
    if (!key) {
      return NextResponse.json({ success: false, error: '配置键不能为空' }, { status: 400 });
    }
    
    const { data, error } = await supabase
      .from('system_configs')
      .update({ config_value: value, updated_at: new Date().toISOString() })
      .eq('config_key', key)
      .select()
      .single();
    
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}
