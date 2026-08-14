import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth/middleware';
import { resolveGuardianId } from '@/lib/auth/guardian-identity';

// GET /api/guardian/payment-qrcode - 按需读取当前守护者收款码
export async function GET(request: NextRequest) {
  try {
    const auth = authenticateRequest(request);
    if (!auth.success) return unauthorizedResponse(auth.error);

    const supabase = getSupabaseAdmin();
    const guardianId = await resolveGuardianId(auth, supabase);
    if (!guardianId) {
      return NextResponse.json({ success: false, error: '非守护者账号' }, { status: 403 });
    }

    const { data: guardian, error } = await supabase
      .from('guardian_users')
      .select('wechat_qrcode,wechat_account,status,ban_reason')
      .eq('id', guardianId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ success: false, error: '守护者资料不存在' }, { status: 404 });
      }
      console.error('查询守护者收款码失败:', error);
      return NextResponse.json({ success: false, error: '查询失败，请稍后重试' }, { status: 500 });
    }

    if (guardian.status === 'banned') {
      return NextResponse.json({ success: false, error: '账号已被封禁', reason: guardian.ban_reason }, { status: 403 });
    }

    const qrcode = guardian.wechat_qrcode || guardian.wechat_account;
    if (!qrcode) {
      return NextResponse.json({ success: false, error: '尚未绑定微信收款码' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: { qrcode } });
  } catch (error) {
    console.error('读取守护者收款码失败:', error);
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}
