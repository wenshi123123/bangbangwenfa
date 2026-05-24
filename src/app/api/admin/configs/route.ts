import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';
import { requireAdminAuth, adminUnauthorizedResponse } from '@/lib/auth/admin-middleware';

// GET - 获取所有配置
export async function GET(request: NextRequest) {
  const authResult = await requireAdminAuth(request);
  if (!authResult.success) {
    return adminUnauthorizedResponse(authResult.error);
  }
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('system_configs')
      .select('*')
      .order('config_group', { ascending: true })
      .order('config_key', { ascending: true });
    
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
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
