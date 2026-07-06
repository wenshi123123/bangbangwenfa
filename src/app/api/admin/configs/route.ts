import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';
import { requireAdminAuth, adminUnauthorizedResponse } from '@/lib/auth/admin-middleware';
import {
  buildSystemConfigFallbackRows,
  groupSystemConfigs,
  SYSTEM_CONFIGS_BOOTSTRAP_SQL,
  isMissingSystemConfigsTableError,
} from '@/lib/admin/system-configs';
import {
  buildSystemConfigSaveRows,
  hasSavePayload,
} from '@/lib/admin/system-configs-persistence';

async function tryReloadSchema(supabase: ReturnType<typeof getSupabaseAdmin>) {
  try {
    await supabase.rpc('pg_notify', {
      channel: 'pgrst',
      message: 'reload schema',
    });
  } catch (notifyError) {
    console.warn('[admin/configs] schema reload 通知失败（可忽略）:', notifyError);
  }
}

async function executeBootstrapSql(supabase: ReturnType<typeof getSupabaseAdmin>) {
  const diagnostics: string[] = [];
  try {
    const { error } = await supabase.rpc('exec_sql', {
      query: SYSTEM_CONFIGS_BOOTSTRAP_SQL,
    });
    if (error) {
      diagnostics.push(`[supabase.rpc exec_sql] ${error.message || JSON.stringify(error)}`);
      console.error('[admin/configs] 自动初始化 system_configs 失败:', error);
      const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.COZE_SUPABASE_URL || '';
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.COZE_SUPABASE_SERVICE_ROLE_KEY || '';
      const ref = projectUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || '';

      if (!ref || !serviceKey) {
        diagnostics.push('[bootstrap] 缺少 Supabase 管理 API 凭证');
        console.error('[admin/configs] 缺少 Supabase 管理 API 凭证');
        return { success: false, diagnostics };
      }

      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceKey}`,
      };
      const headersWithApiKey = {
        ...headers,
        apikey: serviceKey,
      };

      const managementEndpoints = [
        `https://api.supabase.com/v1/projects/${ref}/database/query`,
        `https://api.supabase.com/v1/projects/${ref}/sql`,
      ];

      for (const url of managementEndpoints) {
        for (const authHeaders of [headers, headersWithApiKey]) {
          try {
            const response = await fetch(url, {
              method: 'POST',
              headers: authHeaders,
              body: JSON.stringify({ query: SYSTEM_CONFIGS_BOOTSTRAP_SQL }),
            });
            if (response.ok) {
              await tryReloadSchema(supabase);
              diagnostics.push(`[management ${url}] ok`);
              return { success: true, diagnostics };
            }
            const text = await response.text();
            diagnostics.push(`[management ${url}] ${response.status} ${text.slice(0, 500)}`);
            console.warn('[admin/configs] 管理 API 执行失败:', response.status, text.slice(0, 200));
          } catch (apiError) {
            diagnostics.push(`[management ${url}] exception ${apiError instanceof Error ? apiError.message : String(apiError)}`);
            console.warn('[admin/configs] 管理 API 调用异常:', apiError);
          }
        }
      }

      try {
        const rpcResponse = await fetch(`https://${ref}.supabase.co/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({ query: SYSTEM_CONFIGS_BOOTSTRAP_SQL }),
        });
        if (rpcResponse.ok) {
          await tryReloadSchema(supabase);
          diagnostics.push('[rpc exec_sql] ok');
          return { success: true, diagnostics };
        }
        const text = await rpcResponse.text();
        diagnostics.push(`[rpc exec_sql] ${rpcResponse.status} ${text.slice(0, 500)}`);
        console.warn('[admin/configs] RPC exec_sql 执行失败:', rpcResponse.status, text.slice(0, 200));
      } catch (rpcError) {
        diagnostics.push(`[rpc exec_sql] exception ${rpcError instanceof Error ? rpcError.message : String(rpcError)}`);
        console.warn('[admin/configs] RPC exec_sql 调用异常:', rpcError);
      }

      return { success: false, diagnostics };
    }

    await tryReloadSchema(supabase);
    return { success: true, diagnostics: ['[supabase.rpc exec_sql] ok'] };
  } catch (error) {
    diagnostics.push(`[bootstrap exception] ${error instanceof Error ? error.message : String(error)}`);
    console.error('[admin/configs] 自动初始化 system_configs 异常:', error);
    return { success: false, diagnostics };
  }
}

async function waitForSystemConfigsTable(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  attempts = 4,
  delayMs = 750
) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const probe = await supabase
      .from('system_configs')
      .select('id')
      .limit(1);

    if (!probe.error || !isMissingSystemConfigsTableError(probe.error)) {
      return true;
    }

    if (attempt < attempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return false;
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
      const bootstrapped = await executeBootstrapSql(supabase);
      if (bootstrapped && await waitForSystemConfigsTable(supabase)) {
        const retry = await supabase
          .from('system_configs')
          .select('*')
          .order('config_group', { ascending: true })
          .order('config_key', { ascending: true });

        data = retry.data;
        error = retry.error;
      }

      if (error && isMissingSystemConfigsTableError(error)) {
        const fallbackConfigs = buildSystemConfigFallbackRows();
        return NextResponse.json({
          success: true,
          data: {
            configs: fallbackConfigs,
            groupedConfigs: groupSystemConfigs(fallbackConfigs),
            source: 'fallback',
            note: '系统配置表尚未就绪，当前展示默认配置；保存时将继续尝试初始化并落库',
          },
        });
      }
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
    if (!hasSavePayload(body)) {
      return NextResponse.json({ success: false, error: '没有可保存的配置' }, { status: 400 });
    }
    const { configs, key, value } = body;
    
    const supabase = getSupabaseAdmin();
    const tableProbe = await supabase
      .from('system_configs')
      .select('id')
      .limit(1);

    if (tableProbe.error && isMissingSystemConfigsTableError(tableProbe.error)) {
      const bootstrapResult = await executeBootstrapSql(supabase);
      if (!bootstrapResult.success || !(await waitForSystemConfigsTable(supabase))) {
        return NextResponse.json({
          success: false,
          error: '系统配置表未就绪，初始化失败，请先执行数据库迁移',
          debug: bootstrapResult.diagnostics,
        }, { status: 503 });
      }
    }
    
    const rows = buildSystemConfigSaveRows({ configs, key, value });
    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: '没有可保存的配置' }, { status: 400 });
    }

    // 批量保存
    if (Array.isArray(configs)) {
      const results = [];
      const errors = [];
      
      for (const row of rows) {
        const { data, error } = await supabase
          .from('system_configs')
          .upsert(row, { onConflict: 'config_key' })
          .select()
          .single();
        
        if (error) {
          errors.push({ key: row.config_key, error: error.message });
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
      .upsert(rows[0], { onConflict: 'config_key' })
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
