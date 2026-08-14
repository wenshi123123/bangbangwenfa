import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth/middleware';
import { normalizeGuardianNumber } from '@/lib/guardian/format';

const GUARDIAN_PROFILE_FIELDS = 'id,nickname,avatar_url,invite_code,total_invites,valid_invites,total_commission,available_commission,withdrawn_commission,wechat_account,status,ban_reason,created_at';

// GET /api/guardian/profile - 获取守护者资料（需要JWT认证）
export async function GET(request: NextRequest) {
  try {
    const auth = authenticateRequest(request);
    if (!auth.success) {
      return unauthorizedResponse(auth.error);
    }
    
    const supabase = getSupabaseAdmin();
    
    // 守护者查询自己的信息
    if (auth.userType === 'guardian' && auth.guardianId) {
      const { data: guardian, error } = await supabase
        .from('guardian_users')
        .select(GUARDIAN_PROFILE_FIELDS)
        .eq('id', auth.guardianId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          return NextResponse.json({ success: false, error: '用户不存在' }, { status: 404 });
        }
        return NextResponse.json({ success: false, error: '查询失败' }, { status: 500 });
      }
      
      return formatGuardianResponse(supabase, guardian);
    }
    
    // 普通用户查询自己是否是守护者
    if (auth.userId) {
      const { data: guardian, error } = await supabase
        .from('guardian_users')
        .select(GUARDIAN_PROFILE_FIELDS)
        .eq('user_id', String(auth.userId))
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          return NextResponse.json({ success: false, error: '用户不是守护者' }, { status: 404 });
        }
        return NextResponse.json({ success: false, error: '查询失败' }, { status: 500 });
      }
      
      return formatGuardianResponse(supabase, guardian);
    }
    
    return NextResponse.json({ success: false, error: '无法获取用户信息' }, { status: 400 });
    
  } catch (error) {
    console.error('获取资料失败:', error);
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}

// 格式化守护者响应
async function formatGuardianResponse(supabase: ReturnType<typeof getSupabaseAdmin>, guardian: any) {
  // 检查账号状态
  if (guardian.status === 'banned') {
    return NextResponse.json({ 
      success: false, 
      error: '账号已被封禁',
      reason: guardian.ban_reason 
    }, { status: 403 });
  }
  
  // Only fetch the row identity to determine whether a QR code exists. This
  // avoids loading a potentially multi-megabyte base64 value into the profile
  // response; the actual QR code is fetched by the authorized lazy endpoint.
  const { data: qrcodeMarker, error: qrcodeMarkerError } = await supabase
    .from('guardian_users')
    .select('id')
    .eq('id', guardian.id)
    .not('wechat_qrcode', 'is', null)
    .maybeSingle();

  if (qrcodeMarkerError) {
    console.warn('检查守护者收款码状态失败:', qrcodeMarkerError.message);
  }

  return NextResponse.json({
    success: true,
    data: {
      id: guardian.id,
      nickname: guardian.nickname,
      avatar_url: guardian.avatar_url,
      invite_code: guardian.invite_code,
      total_invites: normalizeGuardianNumber(guardian.total_invites),
      valid_invites: normalizeGuardianNumber(guardian.valid_invites),
      total_commission: normalizeGuardianNumber(guardian.total_commission),
      available_commission: normalizeGuardianNumber(guardian.available_commission),
      withdrawn_commission: normalizeGuardianNumber(guardian.withdrawn_commission),
      wechat_account: guardian.wechat_account || null,
      has_wechat_payment_method: Boolean(guardian.wechat_account || qrcodeMarker),
      status: guardian.status,
      created_at: guardian.created_at
    }
  });
}
