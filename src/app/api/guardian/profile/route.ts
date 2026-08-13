import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth/middleware';

// GET /api/guardian/profile - 获取守护者资料（需要JWT认证）
export async function GET(request: NextRequest) {
  const startedAt = Date.now();
  const deploymentId = request.headers.get('x-bbwv-deployment-id') || 'absent';
  const diagnostic = (stage: string, details: Record<string, unknown> = {}) => {
    console.info('[GUARDIAN_PROFILE_DIAG]', JSON.stringify({
      stage,
      elapsedMs: Date.now() - startedAt,
      deploymentId,
      ...details,
    }));
  };

  diagnostic('request-start');
  try {
    const auth = authenticateRequest(request);
    diagnostic('auth-complete', {
      success: auth.success,
      userType: auth.userType || 'unknown',
      hasUserId: Boolean(auth.userId),
      hasGuardianId: Boolean(auth.guardianId),
    });
    if (!auth.success) {
      return unauthorizedResponse(auth.error);
    }
    
    const supabase = getSupabaseAdmin();
    
    // 守护者查询自己的信息
    if (auth.userType === 'guardian' && auth.guardianId) {
      const { data: guardian, error } = await supabase
        .from('guardian_users')
        .select('*')
        .eq('id', auth.guardianId)
        .single();

      diagnostic('database-complete', {
        lookup: 'guardian-id',
        hasData: Boolean(guardian),
        errorCode: error?.code || null,
        payloadBytes: guardian ? JSON.stringify(guardian).length : 0,
      });
      
      if (error) {
        if (error.code === 'PGRST116') {
          return NextResponse.json({ success: false, error: '用户不存在' }, { status: 404 });
        }
        return NextResponse.json({ success: false, error: '查询失败' }, { status: 500 });
      }
      
      return formatGuardianResponse(guardian);
    }
    
    // 普通用户查询自己是否是守护者
    if (auth.userId) {
      const { data: guardian, error } = await supabase
        .from('guardian_users')
        .select('*')
        .eq('user_id', String(auth.userId))
        .single();

      diagnostic('database-complete', {
        lookup: 'user-id',
        hasData: Boolean(guardian),
        errorCode: error?.code || null,
        payloadBytes: guardian ? JSON.stringify(guardian).length : 0,
      });
      
      if (error) {
        if (error.code === 'PGRST116') {
          return NextResponse.json({ success: false, error: '用户不是守护者' }, { status: 404 });
        }
        return NextResponse.json({ success: false, error: '查询失败' }, { status: 500 });
      }
      
      return formatGuardianResponse(guardian);
    }
    
    return NextResponse.json({ success: false, error: '无法获取用户信息' }, { status: 400 });
    
  } catch (error) {
    diagnostic('request-error', {
      error: error instanceof Error ? error.message : 'unknown-error',
    });
    console.error('获取资料失败:', error);
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}

// 格式化守护者响应
function formatGuardianResponse(guardian: any) {
  // 检查账号状态
  if (guardian.status === 'banned') {
    return NextResponse.json({ 
      success: false, 
      error: '账号已被封禁',
      reason: guardian.ban_reason 
    }, { status: 403 });
  }
  
  return NextResponse.json({
    success: true,
    data: {
      id: guardian.id,
      nickname: guardian.nickname,
      avatar_url: guardian.avatar_url,
      invite_code: guardian.invite_code,
      total_invites: guardian.total_invites,
      valid_invites: guardian.valid_invites,
      total_commission: guardian.total_commission,
      available_commission: guardian.available_commission,
      withdrawn_commission: guardian.withdrawn_commission,
      wechat_account: guardian.wechat_qrcode || guardian.wechat_account,
      wechat_qrcode: guardian.wechat_qrcode,
      status: guardian.status,
      created_at: guardian.created_at
    }
  });
}
