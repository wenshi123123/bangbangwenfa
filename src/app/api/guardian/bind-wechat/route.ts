import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/storage/database/supabase-client';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth/middleware';

const COOLDOWN_DAYS = 7;

// POST /api/guardian/bind-wechat - 绑定/更换微信收款码（支持7天冷却）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { wechat_qrcode, guardian_id } = body;

    if (!wechat_qrcode) {
      return NextResponse.json({ success: false, error: '请上传收款码' }, { status: 400 });
    }

    // 验证JWT
    const auth = authenticateRequest(request);
    if (!auth.success) {
      return unauthorizedResponse(auth.error);
    }

    // 确定守护者ID：优先使用 body 传入的，其次使用 JWT 中的
    const guardianId = guardian_id || auth.guardianId;
    if (!guardianId) {
      return NextResponse.json({ success: false, error: '无法确定守护者身份' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // 查询当前守护者记录（获取上次更新时间）
    const { data: current, error: fetchError } = await supabase
      .from('guardian_users')
      .select('wechat_qrcode, wechat_qrcode_updated_at')
      .eq('id', guardianId)
      .single();

    if (fetchError) {
      console.error('查询守护者信息失败:', fetchError);
      return NextResponse.json({ success: false, error: '查询失败，请重试' }, { status: 500 });
    }

    // 7天冷却检查（仅当已绑定过收款码时）
    if (current?.wechat_qrcode && current?.wechat_qrcode_updated_at) {
      const lastUpdate = new Date(current.wechat_qrcode_updated_at);
      const now = new Date();
      const daysSince = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);

      if (daysSince < COOLDOWN_DAYS) {
        const remainingSeconds = Math.ceil((COOLDOWN_DAYS - daysSince) * 24 * 60 * 60);
        return NextResponse.json({
          success: false,
          error: `更换收款码需等待 ${COOLDOWN_DAYS} 天冷却期`,
          remainingSeconds,
          lastUpdated: current.wechat_qrcode_updated_at,
        }, { status: 429 });
      }
    }

    // 更新收款码和更新时间
    const { error: updateError } = await supabase
      .from('guardian_users')
      .update({
        wechat_qrcode,
        wechat_qrcode_updated_at: new Date().toISOString(),
      })
      .eq('id', guardianId);

    if (updateError) {
      console.error('更新收款码失败:', updateError);
      // 如果是因为 wechat_qrcode 列不存在，提供明确提示
      if (updateError.message?.includes('wechat_qrcode')) {
        return NextResponse.json({
          success: false,
          error: '数据库缺少字段，请联系管理员执行迁移SQL',
          hint: 'ALTER TABLE guardian_users ADD COLUMN IF NOT EXISTS wechat_qrcode TEXT; ALTER TABLE guardian_users ADD COLUMN IF NOT EXISTS wechat_qrcode_updated_at TIMESTAMP WITH TIME ZONE;',
        }, { status: 500 });
      }
      return NextResponse.json({ success: false, error: '绑定失败，请重试' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: current?.wechat_qrcode ? '收款码更换成功' : '收款码绑定成功',
      wechat_qrcode,
    });
  } catch (error) {
    console.error('绑定微信收款码失败:', error);
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}
